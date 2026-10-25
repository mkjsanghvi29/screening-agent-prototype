// ===== TA admin (criteria · tuning · policy) + Governance =====
const PK = ["P1", "P2", "P3", "P4"];
const TUNE = { w: PK.map(k => crit(k).w), T: THRESHOLD, note: "" };

VIEWS.admin = {
  title: "TA admin", sub: "The customer owns the criteria, the weights and the threshold. The agent suggests changes, and a human approves and versions them.",
  persona: ["Rohan Iyer", "Head of Talent Acquisition · customer"],
  tab: "tune",
  init(el) { this.el = el; },
  show() { this.render(); },
  render() {
    const T = [["crit", "Criteria & versions"], ["tune", "Weights & threshold tuning"], ["policy", "Country policy & autonomy"]];
    this.el.innerHTML = `<div class="tabs">${T.map(([k, l]) => `<button data-t="${k}" class="${this.tab === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="atab"></div>`;
    $$(".tabs button", this.el).forEach(b => b.onclick = () => { this.tab = b.dataset.t; this.render(); });
    this[this.tab]($("#atab", this.el));
  },
  crit(box) {
    box.innerHTML = `<div class="grid g-side"><div class="card"><h2>Screening criteria: Warehouse Associate (night) <span class="sub">live version ${CRIT_VERSIONS[CRIT_VERSIONS.length - 1].v}</span></h2>
      <table><tr><th>ID</th><th>Criterion</th><th>Type</th><th>Weight</th><th>Business reason</th><th>Owner</th></tr>
      ${CRITERIA.map(c => `<tr><td><b>${c.id}</b></td><td>${esc(c.text)}</td><td>${c.type === "Knockout" ? `<span class="pill p-warn">Knockout</span>` : "Preferred"}</td><td>${c.w || "—"}</td><td class="soft">${esc(c.why)}</td><td class="soft">${esc(c.by)}</td></tr>`).join("")}</table>
      <p class="soft">Advance threshold: <b>${THRESHOLD}</b>/100. Knockouts are yes/no rules shown to candidates <i>before</i> they apply. A failed knockout is the only automated “no”, and only where country policy allows it.</p></div>
      <div class="stack"><div class="card"><h2>Criteria lint <span class="sub">runs on every change</span></h2>
        <div class="qm"><span>No protected or proxy attributes (age, gender, photo, marital status, caste, religion)</span><b class="ok">✓</b></div>
        <div class="qm"><span>Every criterion has a business reason and an owner</span><b class="ok">✓</b></div>
        <div class="qm"><span>Physical knockouts mention adjustments (disability)</span><b class="ok">✓ K3 since v2</b></div>
        <div class="qm"><span>P1 commute can proxy for neighbourhood → watched by the AIR monitor</span><b style="color:var(--cp-warning)">watch</b></div>
        <div class="qm"><span>P2 “physical work”: lower base rate for women in the pilot data → AIR-tested on every weight change</span><b style="color:var(--cp-warning)">watch</b></div></div>
      <div class="card"><h2>Version history</h2>${CRIT_VERSIONS.slice().reverse().map(v => `<div class="qm"><span><b>${v.v}</b> · ${esc(v.note)}<small>${v.at} · ${esc(v.by)}</small></span><span></span><span class="pill ${v.pending ? "p-warn" : "p-ok"}">${v.pending ? "draft" : "approved"}</span></div>`).join("")}</div></div></div>`;
  },
  tune(box) {
    const r = simulate(TUNE.w, TUNE.T), need = Math.round(WEEKLY_HIRES * INTERVIEWS_PER_HIRE), cap = siteCapacity("IN"), live = simulate(PK.map(k => crit(k).w), THRESHOLD);
    const mx = Math.max(cap, r.advWeek, need) * 1.15, P = x => Math.min(100, x / mx * 100);
    const air = Math.min(r.airF, r.airAge), state = r.advWeek > cap ? "over" : r.advWeek < need ? "under" : "ok";
    const meter = (label, v, fmt, target, good, marks = "") => `<div class="mrow"><span>${label}</span><div class="meter"><i class="${good ? "ok" : "bad"}" style="width:${Math.min(100, v * 100)}%"></i>${marks}</div><b>${fmt}</b></div>`;
    box.innerHTML = `<div class="grid g-side"><div class="card">
      <h2>Advance weights &amp; threshold <span class="sub">Bhiwandi DC · simulated on 6,000 past applicants with known outcomes</span></h2>
      ${PK.map((k, i) => `<div class="wrow"><span><b style="text-align:left">${k}</b> ${esc(crit(k).text)}</span><input type="range" min="0" max="50" value="${TUNE.w[i]}" data-i="${i}"><b>${TUNE.w[i]}</b></div>`).join("")}
      <div class="wrow"><span><b>Advance threshold</b> (score out of 100)</span><input type="range" min="50" max="90" step="1" value="${TUNE.T}" id="thr"><b>${TUNE.T}</b></div>
      <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn" id="bsug">✨ Suggest weights from outcomes</button><button class="btn" id="bcap">🎯 Fit threshold to capacity</button><button class="btn ghost" id="brst">Reset to live</button></div>
      ${TUNE.note ? `<div class="callout">${TUNE.note}</div>` : ""}
      <div class="note"><b>Guardrail:</b> weights only move people between <b>Advance</b> and <b>Review</b>. They never reject anyone, so a bad weight costs recruiter time, not a candidate's chance.</div>
      <div class="row" style="gap:8px;margin-top:10px"><input type="text" id="vnote" placeholder="Change note (required)" style="flex:1"><button class="btn pri" id="bsave">Publish as v${CRIT_VERSIONS.length + 1}</button></div>
    </div>
    <div class="card"><h2>Effect of this setting <span class="sub">vs. live in brackets</span></h2>
      <h3>Volume vs. interview capacity (per week)</h3>
      <div class="mrow"><span>Advance / week</span><div class="meter"><i class="${state === "ok" ? "ok" : "bad"}" style="width:${P(r.advWeek)}%"></i><span class="mark" style="left:${P(need)}%"><span>need ${need}</span></span><span class="mark" style="left:${P(cap)}%"><span>capacity ${cap}</span></span></div><b>${r.advWeek}</b></div>
      <div class="callout" style="margin-top:14px"><b>${state === "over" ? "Too many interviews." : state === "under" ? "Too few interviews." : "Within the band."}</b> ${state === "over" ? `${r.advWeek - cap} more Advance candidates per week than the interviewers can see. Raise the threshold, or ask site leads to open blocks (<a href="#interviewer">Interviewer → availability</a>).` : state === "under" ? `${need - r.advWeek} fewer than needed for ${WEEKLY_HIRES} hires per week. Lower the threshold; the extra candidates come from the top of Review.` : `Enough interviews for ${WEEKLY_HIRES} hires per week without overloading the interviewers.`}</div>
      <h3>Quality</h3>
      ${meter("Top performers fast-tracked", r.topRecall, pct(r.topRecall) + ` <span class="soft">(${pct(live.topRecall)})</span>`, .7, r.topRecall >= .65)}
      ${meter("Interview pass rate of Advance", r.precision, pct(r.precision) + ` <span class="soft">(${pct(live.precision)})</span>`, .7, r.precision >= .7)}
      <div class="mrow"><span>Review workload</span><div></div><b>${r.reviewHrs} h/wk <span class="soft">(${live.reviewHrs})</span></b></div>
      <h3>Fairness (adverse-impact ratio of Advance)</h3>
      ${["Women vs men|airF", "Age 45+ vs under 45|airAge"].map(s => { const [l, k] = s.split("|"); return `<div class="mrow"><span>${l}</span><div class="meter"><i class="${r[k] >= .8 ? "ok" : "bad"}" style="width:${r[k] * 100}%"></i><span class="mark" style="left:80%"><span>0.80</span></span></div><b>${r[k].toFixed(2)}</b></div>`; }).join("")}
      ${air < .8 ? `<div class="callout"><b>Blocked:</b> AIR ${air.toFixed(2)} &lt; 0.80. This setting cannot be published. P2 “physical work” is less common among women applicants in this data, so weighting it heavily cuts their fast-track rate even though it predicts interview pass.</div>` : ""}
      <p class="soft" style="margin-top:12px">Outcome labels: ${BASE_SCORECARDS + SCORECARDS.length} interview scorecards + ${BASE_RETENTION} 90-day retention outcomes. Suggestions need ≥300 labels per role family.</p></div></div>
    <div class="card" style="margin-top:16px"><h2>How the weights are set and kept honest</h2>
      <div class="flow" style="grid-template-columns:repeat(5,1fr)">
        <div><em>1</em><b>Start: TA-assigned</b>Workshop with Ops and H&amp;S. Points reflect what the business says matters.</div>
        <div><em>2</em><b>Learn from outcomes</b>Weekly: logistic regression of interview pass and 90-day retention on the criteria evidence (scorecards from the Interviewer view).</div>
        <div><em>3</em><b>Constrain</b>A suggestion must keep AIR ≥0.80 for every group and top-performer recall within 5 pts. If not, the agent offers the best fair alternative.</div>
        <div><em>4</em><b>Capacity loop</b>If Advance/week sits outside [need, capacity] for 2 weeks, TA is alerted with a suggested threshold. The alert never moves the threshold automatically.</div>
        <div><em>5</em><b>Approve &amp; version</b>Human publishes with a note. A receipt is written, the change is re-scored in shadow for 1 week, and it can be rolled back.</div></div></div>`;
    $$("input[data-i]", box).forEach(s => s.oninput = () => { TUNE.w[+s.dataset.i] = +s.value; TUNE.note = ""; this.render(); });
    $("#thr", box).oninput = e => { TUNE.T = +e.target.value; TUNE.note = ""; this.render(); };
    $("#brst", box).onclick = () => { TUNE.w = PK.map(k => crit(k).w); TUNE.T = THRESHOLD; TUNE.note = ""; this.render(); };
    $("#bsug", box).onclick = () => {
      const f = fitWeights(), cur = TUNE.w.slice(), rf = simulate(f.w, TUNE.T);
      let best = null;
      for (let a = 0; a <= 1.0001; a += 0.1) { const w = cur.map((c, i) => Math.round(c + (f.w[i] - c) * a)), s = simulate(w, TUNE.T); if (Math.min(s.airF, s.airAge) >= .8 && (!best || s.precision > best.s.precision)) best = { w, s, a }; }
      TUNE.w = f.w;
      TUNE.note = `<b>Suggested from ${BASE_SCORECARDS + SCORECARDS.length} outcomes:</b> P1 ${f.w[0]} · P2 ${f.w[1]} · P3 ${f.w[2]} · P4 ${f.w[3]}. Pass rate ${pct(rf.precision)}, but AIR (women) is <b>${rf.airF.toFixed(2)}</b>. ${best ? `<br><b>Fair alternative:</b> P1 ${best.w[0]} · P2 ${best.w[1]} · P3 ${best.w[2]} · P4 ${best.w[3]} (pass ${pct(best.s.precision)}, AIR ${Math.min(best.s.airF, best.s.airAge).toFixed(2)}). <button class="btn sm" id="bfair">Use fair alternative</button>` : ""}`;
      this._fair = best && best.w; this.render();
      const bf = $("#bfair", this.el); if (bf) bf.onclick = () => { TUNE.w = this._fair.slice(); TUNE.note = "<b>Fair alternative applied.</b> It improves the pass rate while keeping AIR ≥ 0.80. Now fit the threshold to capacity."; this.render(); };
    };
    $("#bcap", box).onclick = () => {
      let best = null;
      for (let T = 50; T <= 90; T++) { const s = simulate(TUNE.w, T); if (s.advWeek >= need && s.advWeek <= cap && Math.min(s.airF, s.airAge) >= .8 && (!best || s.precision > best.s.precision)) best = { T, s }; }
      if (!best) { TUNE.note = "<b>No threshold fits.</b> Nothing lands between need and capacity while AIR stays ≥0.80. Open more interview blocks or revisit the weights."; return this.render(); }
      TUNE.T = best.T; TUNE.note = `<b>Threshold ${best.T}</b>: highest pass rate (${pct(best.s.precision)}) that books between ${need} and ${cap} interviews per week, with AIR ≥0.80.`; this.render();
    };
    $("#bsave", box).onclick = () => {
      const s = simulate(TUNE.w, TUNE.T), note = $("#vnote", box).value.trim();
      if (Math.min(s.airF, s.airAge) < .8) return toast("🚫 Blocked by the fairness guardrail: AIR &lt; 0.80. Use the fair alternative.");
      if (!note) return toast("Add a change note. It goes on the receipt and in the version history.");
      PK.forEach((k, i) => crit(k).w = TUNE.w[i]); THRESHOLD = TUNE.T;
      const v = "v" + (CRIT_VERSIONS.length + 1);
      CRIT_VERSIONS.push({ v, at: "today", by: "Rohan Iyer", note: `${note} (weights ${TUNE.w.join("/")}, threshold ${TUNE.T})` });
      receipt({ candidate: "—", country: "IN", actor: "approver:rohan.iyer", action: `criteria ${v} published: weights ${TUNE.w.join("/")}, threshold ${TUNE.T}`, air_min: +Math.min(s.airF, s.airAge).toFixed(2), note });
      TUNE.note = `<b>${v} is live.</b> New candidates are scored with it, and it is re-checked in shadow for 1 week. Try it in the <a href="#candidate">Candidate view</a>.`; this.render();
    };
  },
  policy(box) {
    box.innerHTML = `<div class="card"><h2>What the agent may decide on its own, per country</h2>
      <table><tr><th>Country</th><th>Advance + book</th><th>Knockout “no”</th><th>Rank-based auto-reject</th><th></th></tr>
      ${["IN", "US", "DE"].map(c => { const p = POLICY[c], req = UNLOCK_REQ[c]; return `<tr><td><b>${SITES[c].country.replace("the ", "")}</b></td><td><span class="pill p-ok">automatic</span></td>
        <td>${p.knock === "auto" ? `<span class="pill p-ok">automatic, with reason + review link</span>` : `<span class="pill p-warn">recruiter confirms</span><br><span class="soft">GDPR Art. 22 working assumption</span>`}</td>
        <td>${p.rank === "locked" ? `<span class="pill">🔒 locked</span>` : `<span class="pill p-bad">unlocked: score &lt; 35</span>`}</td>
        <td>${p.rank !== "locked" ? `<a href="#governance">see conditions</a>` : req ? `<span class="pill p-warn">requested ${req.at}</span> <a href="#governance">track gates →</a>` : `<button class="btn sm" data-c="${c}">Request unlock</button>`}</td></tr>`; }).join("")}</table>
      <div class="note">Why rank-based reject starts locked: a score that is good at picking the top is not proven to be safe at rejecting the bottom. The bottom is where proxies, CV formatting and language bias concentrate. Unlocking needs evidence <b>and</b> named sign-offs per country (<a href="#governance">Governance</a>). TA can request it but cannot grant it.</div></div>`;
    $$("button[data-c]", box).forEach(b => b.onclick = () => { const c = b.dataset.c; UNLOCK_REQ[c] = { at: "today", by: "Rohan Iyer" }; receipt({ candidate: "—", country: c, actor: "ta:rohan.iyer", action: "requested unlock of rank-based auto-reject" }); App.refreshBadges(); toast(`Request sent. It needs ${gatesFor(c).length} gates signed by their owners. <a href="#governance">Open Governance →</a>`); this.render(); });
  },
};

// ---------------- Governance ----------------
VIEWS.governance = {
  title: "Governance: who unlocks automated rejection", sub: "Evidence gates are computed by the system. Sign-off gates need a named owner. Nobody, including Darwinbox and the Head of TA, can sign another owner's gate.",
  c: "IN", as: "ta",
  init(el) { this.el = el; },
  show() { this.render(); },
  persona() { const r = ROLES[this.as]; $("#t-persona").innerHTML = `<span>Acting as</span>${av(r.name)}<span><b style="color:var(--cp-text)">${r.name}</b><br>${r.title}</span>`; },
  render() {
    const c = this.c, g = gatesFor(c), st = GATESTATE[c], req = UNLOCK_REQ[c], all = g.every(x => st[x.id]), unlocked = POLICY[c].rank !== "locked";
    this.persona();
    this.el.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px">
      <div class="tabs" style="margin:0;border:0">${["IN", "US", "DE"].map(k => `<button data-c="${k}" class="${k === c ? "on" : ""}">${SITES[k].country.replace("the ", "")}${UNLOCK_REQ[k] && POLICY[k].rank === "locked" ? " •" : ""}</button>`).join("")}</div>
      <div class="row" style="gap:6px"><span class="soft">Acting as (demo switch)</span><select id="as">${Object.entries(ROLES).filter(([k]) => k !== "system").map(([k, r]) => `<option value="${k}" ${k === this.as ? "selected" : ""}>${r.name} · ${r.title}</option>`).join("")}</select></div></div>
    <div class="card"><h2>Unlock rank-based auto-reject: ${SITES[c].country.replace("the ", "")} <span class="sub">${unlocked ? "UNLOCKED" : req ? `requested by ${req.by}, ${req.at}` : "not requested yet; TA requests it in TA admin → Country policy"}</span></h2>
      <div class="gate hdr"><span></span><span>Gate</span><span>Owner</span><span>Evidence</span><span>Status</span></div>
      ${g.map(x => { const s = st[x.id], o = ROLES[x.owner]; return `<div class="gate"><span class="st ${s ? "done" : ""}">${s ? "✓" : ""}</span><span>${esc(x.name)}</span>
        <span class="who">${av(o.name)}<span><b>${esc(o.name)}</b><br><span class="soft">${esc(o.org)}</span></span></span><span class="soft">${esc(x.ev)}</span>
        <span>${s ? `<span class="soft">signed${s.at === "auto" ? " (computed)" : " " + s.at}</span>` : x.sim ? `<button class="btn sm" data-sim="${x.id}">⏩ Simulate peak completed</button>` : x.owner === this.as ? `<button class="btn sm pri" data-sign="${x.id}" ${req ? "" : "disabled"}>Sign as ${esc(o.name.split(" ")[0])}</button>` : `<span class="soft">waiting for ${esc(o.name.split(" ").slice(-1)[0])}</span>`}</span></div>`; }).join("")}
      <div class="row" style="gap:10px;margin-top:14px;flex-wrap:wrap">
        ${unlocked ? `<button class="btn" id="relock">🛑 Kill switch: re-lock now</button><button class="btn ghost" id="airdrop">Simulate AIR falling to 0.76</button>` : `<button class="btn pri" id="act" ${all && req ? "" : "disabled"}>Activate unlock</button><span class="soft">${!req ? "Needs a request from TA first." : all ? "All gates signed." : `${g.filter(x => !st[x.id]).length} gate(s) still open.`}</span>`}</div>
      <div class="callout"><b>When unlocked, the conditions are fixed:</b> only scores &lt;35 with <i>no</i> unclear evidence; a 5% blind human audit of auto-closures; an automatic re-lock if AIR &lt;0.80 or the false-“no” rate &gt;2%; the unlock expires after 6 months and must be re-signed; and the candidate notice must disclose it.</div></div>
    <div class="card" style="margin-top:16px"><h2>Who does what</h2><table><tr><th>Actor</th><th>Organisation</th><th>Signs</th><th>Can also</th></tr>
      <tr><td><span class="who" style="display:flex;gap:6px;align-items:center">${av("Rohan Iyer")} Head of TA</span></td><td>Customer</td><td>Candidate notice</td><td>Request an unlock · re-lock · own the criteria and weights</td></tr>
      <tr><td><span class="who" style="display:flex;gap:6px;align-items:center">${av("Anita Rao")} DPO</span></td><td>Customer</td><td>Legal (IN, DE): DPIA, Art. 22, DPDP</td><td>Re-lock · handle data-subject requests</td></tr>
      <tr><td><span class="who" style="display:flex;gap:6px;align-items:center">${av("Mark Ellis")} US counsel</span></td><td>Customer</td><td>Legal (US): state/city duties</td><td>Re-lock</td></tr>
      <tr><td><span class="who" style="display:flex;gap:6px;align-items:center">${av("Jens Krüger")} Works council</span></td><td>Employee body (DE)</td><td>Co-determination agreement</td><td>Veto any DE change to the screening system</td></tr>
      <tr><td><span class="who" style="display:flex;gap:6px;align-items:center">${av("Dr. S. Menon")} Responsible AI</span></td><td>Darwinbox</td><td>Model card, evals, red team</td><td>Re-lock on any tenant · block a release (see <a href="#quality">Agent quality</a>)</td></tr>
      <tr><td><span class="who" style="display:flex;gap:6px;align-items:center">${av("Fairlane Audit LLP")} Bias auditor</span></td><td>Independent</td><td>Annual audit (NYC roles)</td><td>Read-only access to <a href="#auditor">receipts</a></td></tr>
      <tr><td><span class="who" style="display:flex;gap:6px;align-items:center">${av("Evaluation pipeline")} System</span></td><td>Darwinbox</td><td>Backtest, panel, fairness, shadow</td><td>Auto re-lock on a threshold breach</td></tr></table></div>`;
    $$(".tabs button", this.el).forEach(b => b.onclick = () => { this.c = b.dataset.c; this.render(); });
    $("#as", this.el).onchange = e => { this.as = e.target.value; this.render(); };
    $$("button[data-sign]", this.el).forEach(b => b.onclick = () => { const id = b.dataset.sign, r = ROLES[this.as]; GATESTATE[c][id] = { by: this.as, at: "today" }; receipt({ candidate: "—", country: c, actor: "governance:" + r.name, action: `signed gate “${g.find(x => x.id === id).name}”` }); toast(`✓ Signed by ${r.name}. Receipt written.`); this.render(); });
    $$("button[data-sim]", this.el).forEach(b => b.onclick = () => { GATESTATE[c][b.dataset.sim] = { by: "system", at: "auto" }; receipt({ candidate: "—", country: c, actor: "system", action: "shadow-mode gate met: agent–recruiter agreement 88%, false-no 1.1% over one peak" }); this.render(); });
    const act = $("#act", this.el); if (act) act.onclick = () => { POLICY[c].rank = "unlocked"; receipt({ candidate: "—", country: c, actor: "governance:" + ROLES[this.as].name, action: "rank-based auto-reject UNLOCKED (score < 35, no unclear evidence, 5% blind audit, auto re-lock)" }); App.refreshBadges(); toast(`🔓 Unlocked for ${SITES[c].country}. Try a weak profile in the <a href="#candidate">Candidate view</a>: the notice now discloses it, and low scores auto-close with a reason.`, 7000); this.render(); };
    const rl = $("#relock", this.el); if (rl) rl.onclick = () => this.relock(c, "manual kill switch by " + ROLES[this.as].name);
    const ad = $("#airdrop", this.el); if (ad) ad.onclick = () => this.relock(c, "AUTO: weekly AIR 0.76 < 0.80");
  },
  relock(c, why) { POLICY[c].rank = "locked"; delete UNLOCK_REQ[c]; ["shadow", "rai", "legal", "audit", "wc", "notice"].forEach(k => delete GATESTATE[c][k]); receipt({ candidate: "—", country: c, actor: why.startsWith("AUTO") ? "system" : "governance:" + ROLES[this.as].name, action: "rank-based auto-reject RE-LOCKED: " + why }); App.refreshBadges(); toast(`🔒 Re-locked (${why}). Sign-offs are reset, and a fresh request plus fresh evidence are needed.`); this.render(); },
};
