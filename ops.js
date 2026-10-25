// ===== Recruiter + Interviewer =====
const REASONS_NO = ["Commute too long; declined relocation", "Cannot work the required shift pattern", "Start date too late for this requisition", "Knockout confirmed as stated by candidate"];
const REASONS_YES = ["Relevant experience the score under-weights", "Unclear item clarified by phone: met", "Strong match on review"];

VIEWS.recruiter = {
  title: "Recruiter: review queue", sub: "Only the Review band and the German knockout confirmations come here. Each card shows evidence, never a bare score.",
  persona: ["Ananya Mehta", "Recruiter · West India cluster"],
  sel: null, openedAt: 0, fast: 0, decided: 0,
  init(el) { this.el = el; },
  show() { const d = QUEUE.find(q => q.demo && !q.done); if (d) this.sel = d.id; this.render(); },
  render() {
    const el = this.el, open = QUEUE.filter(q => !q.done), done = QUEUE.filter(q => q.done);
    if (!this.sel || !open.find(q => q.id === this.sel)) this.sel = open[0] && open[0].id;
    const rev = open.filter(q => !q.deConfirm), de = open.filter(q => q.deConfirm);
    const row = q => `<tr class="click ${q.id === this.sel ? "sel" : ""}" data-id="${q.id}"><td><b>${esc(q.name)}</b><br><span class="soft mono">${q.id}</span></td><td>${q.c}</td><td>${bandPill(q.band)}</td><td>${q.deConfirm ? "—" : q.score}</td><td class="soft">${esc(q.src)}</td></tr>`;
    el.innerHTML = `<div class="kpis">
      <div class="kpi"><b>${open.length}</b><span>open cards (SLA 3 working days)</span></div>
      <div class="kpi"><b>~40 s</b><span>median handling per card (vs 3 min reading a CV)</span></div>
      <div class="kpi"><b>23%</b><span>override rate this week (healthy band: 10–40%)</span></div>
      <div class="kpi"><b>${this.fast}/${this.decided}</b><span>decisions under 8 s (rubber-stamp check)</span></div></div>
    <div class="grid g-side">
      <div class="card"><h2>Queue <span class="sub">sorted likely-yes first</span></h2>
        <table><tr><th>Candidate</th><th>Ctry</th><th>Band</th><th>Score</th><th>Input</th></tr>
        <tr class="grp"><td colspan="5">Review band (${rev.length})</td></tr>${rev.map(row).join("") || `<tr><td colspan="5" class="soft">Empty 🎉</td></tr>`}
        <tr class="grp"><td colspan="5">DE knockout confirmations (${de.length}) · no solely automated “no” in Germany</td></tr>${de.map(row).join("") || `<tr><td colspan="5" class="soft">Empty</td></tr>`}
        </table>
        ${done.length ? `<h3 style="margin-top:14px">Decided this session</h3><table>${done.map(q => `<tr><td>${esc(q.name)}</td><td>${q.c}</td><td class="soft">${esc(q.done)}</td></tr>`).join("")}</table>` : ""}
      </div>
      <div class="card" id="rcard"></div></div>`;
    $$("tr.click", el).forEach(tr => tr.onclick = () => { this.sel = tr.dataset.id; this.render(); });
    this.card();
  },
  card() {
    const box = $("#rcard", this.el), q = QUEUE.find(x => x.id === this.sel);
    if (!q) { box.innerHTML = `<h2>Nothing to review</h2><p class="muted">Try the candidate flow: answer “Not sure” to lifting to create a Review card.</p>`; return; }
    this.openedAt = Date.now();
    const yes = q.deConfirm ? ["Overturn: candidate's answer was a mistake (confirmed by phone)"] : REASONS_YES, no = q.deConfirm ? ["Knockout confirmed as stated by candidate"] : REASONS_NO;
    box.innerHTML = `<h2>${av(q.name)} ${esc(q.name)} ${q.demo ? `<span class="pill p-acc">your demo candidate</span>` : ""} <span class="sub mono">${q.id} · ${q.c}</span></h2>
      <div class="callout"><b>Why it is here.</b> ${esc(q.reason)}</div>
      ${q.note ? `<div class="note">${esc(q.note)}</div>` : ""}
      <table style="margin-top:10px"><tr><th>Criterion</th><th>Evidence</th><th>Source</th></tr>
      ${CRITERIA.map(c => q.ev[c.id] ? `<tr><td><b>${c.id}</b> <span class="soft">${esc(c.text)}</span></td><td>${evPill(q.ev[c.id][0])}</td><td class="soft">${esc(q.ev[c.id][1])}</td></tr>` : "").join("")}</table>
      <div class="note">Demographics are hidden. Name and photo are blurred until a decision is made.</div>
      <h3>Decision <span class="soft" style="font-weight:400">· a reason code is required, and it becomes the candidate's explanation</span></h3>
      <div class="row" style="gap:8px;align-items:flex-start;flex-wrap:wrap">
        <div class="stack" style="flex:1;min-width:220px"><select id="ryes">${yes.map(r => `<option>${r}</option>`).join("")}</select><button class="btn pri" id="badv">${q.deConfirm ? "Overturn → advance" : "Advance → agent books interview"}</button></div>
        <div class="stack" style="flex:1;min-width:220px"><select id="rno">${no.map(r => `<option>${r}</option>`).join("")}</select><button class="btn" id="bno">${q.deConfirm ? "Confirm knockout" : "Do not progress"}</button></div>
      </div>
      <div class="soft" style="margin-top:8px">Either way the candidate hears back on WhatsApp within minutes, and a receipt is written with your name on it.</div>`;
    $("#badv", box).onclick = () => this.decide(q, "advance", $("#ryes", box).value);
    $("#bno", box).onclick = () => this.decide(q, q.deConfirm ? "confirm" : "reject", $("#rno", box).value);
  },
  decide(q, d, reason) {
    const secs = (Date.now() - this.openedAt) / 1000; this.decided++;
    const fast = secs < 8; if (fast) this.fast++;
    q.done = (d === "advance" ? "advanced: " : d === "confirm" ? "knockout confirmed: " : "not progressed: ") + reason;
    receipt({ candidate: q.id, country: q.c, actor: "recruiter:a.mehta", action: q.done, band: q.band, review_seconds: +secs.toFixed(1), rubber_stamp_flag: fast });
    if (d === "advance" && !q.demo) INTERVIEWS.push({ id: q.id, name: q.name, c: q.c, slot: (freeSlots(q.c, 1)[0] || [""])[0], status: "Booked", ev: Object.fromEntries(Object.entries(q.ev).filter(([k]) => k[0] === "P").map(([k, v]) => [k, v[1]])) });
    if (q.demo) Cand.onRecruiter(q.id, d === "advance" ? "advance" : "reject", reason);
    App.refreshBadges();
    toast(`${fast ? `⚠️ Decided in ${secs.toFixed(1)} s. This counts toward the <b>rubber-stamp</b> rate, which is reviewed weekly (meaningful human review).<br>` : ""}✓ Receipt written. ${q.demo ? "<a href='#candidate'>See the candidate's chat →</a>" : "The candidate is notified on WhatsApp."}`);
    this.render();
  },
};

// ---------------- Interviewer ----------------
VIEWS.interviewer = {
  title: "Interviewer & hiring manager", sub: "Shift leads publish interview availability (which drives capacity), interview from an evidence brief, and score on a structured scorecard that feeds tuning.",
  persona: ["Priya Nair", "Shift Lead · Bhiwandi DC"],
  tab: "avail", sel: null, c: "IN",
  init(el) { this.el = el; },
  show() { this.render(); },
  render() {
    const el = this.el, T = [["avail", "My availability"], ["today", "Interviews & scorecards"], ["hm", "Hiring-manager weekly sample"]];
    el.innerHTML = `<div class="tabs">${T.map(([k, l]) => `<button data-t="${k}" class="${this.tab === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="itab"></div>`;
    $$(".tabs button", el).forEach(b => b.onclick = () => { this.tab = b.dataset.t; this.render(); });
    this[this.tab]($("#itab", el));
  },
  avail(box) {
    const c = this.c, cap = siteCapacity(c), need = Math.round(WEEKLY_HIRES * INTERVIEWS_PER_HIRE * (c === "IN" ? 1 : c === "US" ? .5 : .17) * (c === "IN" ? 1 : 1));
    const sim = simulate(CRITERIA.filter(x => x.type === "Preferred").map(x => x.w), THRESHOLD);
    const mine = Object.values(SLOTS[c]).filter(s => s.open).length * SLOTCAP;
    box.innerHTML = `<div class="grid g-side"><div class="card">
      <h2>Interview blocks for next week <span class="sub">click to open or close a block · 3 × 20-min interviews per block</span></h2>
      <div class="row" style="margin:6px 0 12px;gap:6px"><span class="pill p-ok">open</span><span class="pill p-acc">booked</span><span class="pill">closed</span><span class="pill" style="text-decoration:line-through">rostered on floor (from shift roster, cannot open)</span></div>
      <div class="avail"><div></div>${DAYS.map(d => `<div class="h">${d.replace(/ \w+$/, "")}</div>`).join("")}
      ${TIMES.map(t => `<div class="t">${t}</div>` + DAYS.map(d => { const k = d + " " + t, s = SLOTS[c][k]; return `<div class="slot ${s.roster ? "roster" : s.open ? (s.booked >= SLOTCAP ? "open full" : "open") : ""}" data-k="${k}">${s.roster ? "on floor" : s.open ? `<b>${s.booked}/${SLOTCAP}</b>booked` : "closed"}</div>`; }).join("")).join("")}</div>
      <div class="note">In production the open blocks come from <b>calendar sync</b> (Outlook/Google) with the <b>shift roster</b> as a hard constraint. Interviewers only adjust exceptions. Closing a block with bookings in it makes the agent rebook those candidates automatically.</div>
    </div>
    <div class="card"><h2>Site capacity vs. demand <span class="sub">${SITES[c].site}, next week</span></h2>
      <div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><b>${mine}</b><span>your interview slots</span></div><div class="kpi"><b>${cap}</b><span>site capacity (all interviewers)</span></div>
      <div class="kpi"><b>${sim.advWeek}</b><span>Advance candidates / week at current weights</span></div><div class="kpi"><b>${need}</b><span>interviews needed (${WEEKLY_HIRES} hires × ${INTERVIEWS_PER_HIRE})</span></div></div>
      <div class="callout"><b>${sim.advWeek > cap ? "Over capacity." : sim.advWeek < need ? "Under demand." : "Balanced."}</b> ${sim.advWeek > cap ? "The agent would book more interviews than the site can run. The TA admin gets an alert to raise the threshold or add interviewers." : sim.advWeek < need ? "Not enough Advance candidates. The TA admin gets an alert to lower the threshold or pull from Review." : "Advance volume sits between demand and capacity, so no action is needed."} <a href="#admin">Open tuning →</a></div>
      <p class="soft" style="margin-top:10px">Capacity = open blocks × 3 across all interviewers at the site. Overbooking ×1.1 covers the predicted 13% no-show rate. Reminders and confirm-attendance messages keep it there.</p></div></div>`;
    $$(".slot", box).forEach(s => s.onclick = () => {
      const x = SLOTS[c][s.dataset.k]; if (x.roster) return toast("You're rostered on the warehouse floor in this block (from the shift roster). Ask your manager to change the roster first.");
      if (x.open && x.booked) { toast(`Closed. The agent is rebooking ${x.booked} candidate(s) into other slots and messaging them on WhatsApp.`); x.booked = 0; }
      x.open = !x.open; this.render();
    });
  },
  today(box) {
    const list = INTERVIEWS.filter(i => i.c === "IN" || i.demo);
    if (!this.sel || !list.find(i => i.id === this.sel)) this.sel = (list.find(i => i.demo && !i.done) || list.find(i => !i.done) || list[0] || {}).id;
    const i = list.find(x => x.id === this.sel);
    box.innerHTML = `<div class="grid g-side"><div class="card"><h2>My interviews <span class="sub">${SCORECARDS.length} scorecards submitted this session</span></h2>
      <table><tr><th>Slot</th><th>Candidate</th><th>Status</th></tr>${list.map(x => `<tr class="click ${x.id === this.sel ? "sel" : ""}" data-id="${x.id}"><td>${esc(x.slot || "to be booked")}</td><td><b>${esc(x.name)}</b>${x.demo ? ` <span class="pill p-acc">demo</span>` : ""}</td><td>${x.done ? `<span class="pill ${x.done === "Select" ? "p-ok" : ""}">${x.done}</span>` : `<span class="pill ${x.status === "Checked in" ? "p-warn" : ""}">${x.status}</span>`}</td></tr>`).join("")}</table>
      <div class="note">Book a candidate in the <a href="#candidate">Candidate view</a> and they appear here. Gate check-in updates the status.</div></div>
      <div class="card" id="sc"></div></div>`;
    $$("tr.click", box).forEach(tr => tr.onclick = () => { this.sel = tr.dataset.id; this.render(); });
    const sc = $("#sc", box);
    if (!i) { sc.innerHTML = "<h2>No interviews</h2>"; return; }
    const COMP = [["safety", "Safety awareness", "Walk me through what you do if a pallet looks unstable."], ["rel", "Reliability", "Tell me about a time you had to be on time for a night/early shift."], ["phys", "Physical readiness", "Practical: team-lift demo with a 15 kg tote."], ["team", "Teamwork", "How do you handle a co-worker who isn't following the safety rules?"]];
    sc.innerHTML = `<h2>${av(i.name)} ${esc(i.name)} <span class="sub">${esc(i.slot || "")}</span></h2>
      <h3>Interview brief</h3><table>${Object.entries(i.ev).map(([k, v]) => `<tr><td><b>${k}</b> <span class="soft">${esc(crit(k).text)}</span></td><td class="soft">${esc(v)}</td></tr>`).join("")}</table>
      <div class="note">The brief shows evidence only, <b>with no score or band</b>, so the interviewer is not anchored by the agent. That keeps scorecards an independent signal for tuning.</div>
      ${i.done ? `<div class="callout"><b>Submitted.</b> Decision: ${i.done}. ${i.demo ? "<a href='#candidate'>See the candidate's chat →</a>" : ""}</div>` : `
      <h3>Structured scorecard <span class="soft" style="font-weight:400">· same 4 competencies and anchors for every candidate</span></h3>
      ${COMP.map(([k, l, q]) => `<div class="comp"><div class="q"><b>${l}</b> <span class="soft">· ${q}</span></div><div class="score4">${["1 Concern", "2 Below", "3 Meets", "4 Strong"].map((o, n) => `<label><input type="radio" name="${k}" value="${n + 1}" ${n === 2 ? "checked" : ""}>${o}</label>`).join("")}</div></div>`).join("")}
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><select id="sdec"><option>Select</option><option>Not selected</option><option>Hold for another site</option></select>
      <input type="text" id="sreason" placeholder="Reason (required if not selected)" style="flex:1;min-width:180px"></div>
      <label class="soft" style="display:block;margin-top:8px"><input type="checkbox" id="sflag"> This candidate should <b>not</b> have been fast-tracked (feeds the false-positive review)</label>
      <button class="btn pri" id="ssub" style="margin-top:10px">Submit scorecard</button>`}`;
    const b = $("#ssub", sc); if (!b) return;
    b.onclick = () => {
      const dec = $("#sdec", sc).value, reason = $("#sreason", sc).value.trim();
      if (dec !== "Select" && !reason) return toast("A reason is required. It becomes the candidate's feedback.");
      const scores = Object.fromEntries(COMP.map(([k]) => [k, +$(`input[name=${k}]:checked`, sc).value]));
      SCORECARDS.push({ id: i.id, dec, scores, flag: $("#sflag", sc).checked });
      i.done = dec; i.status = "Interviewed";
      receipt({ candidate: i.id, country: i.c, actor: "interviewer:priya.nair", action: `scorecard submitted · ${dec}${reason ? " · " + reason : ""}`, scores, fast_track_flag: $("#sflag", sc).checked });
      if (i.demo) Cand.onInterview(i.id, dec === "Select" ? "Select" : "Not selected", reason);
      App.refreshBadges();
      toast(`✓ Scorecard saved. It is the ${BASE_SCORECARDS + SCORECARDS.length}th outcome label available to <a href="#admin">weight tuning</a>.`);
      this.render();
    };
  },
  hm(box) {
    const n = Object.keys(HM_VERDICTS).length, missed = Object.values(HM_VERDICTS).filter(v => v === "would hire").length;
    box.innerHTML = `<div class="card"><h2>${av("Vikram S.")} Weekly sample: candidates the agent did <u>not</u> fast-track <span class="sub">Vikram S., Hiring Manager, Bhiwandi (the pilot's sceptic)</span></h2>
      <p class="muted">Each week, 5 random candidates from Review or Not matched are shown to a hiring manager <b>blind to the agent's band</b>. “Would hire” on a knockout case is a <b>false “no”</b>, the metric that decides whether auto-reject can ever be unlocked. Here the band is shown after you vote.</p>
      <table><tr><th>Candidate</th><th>Evidence</th><th>Your verdict</th><th>Agent band</th></tr>
      ${HM_SAMPLE.map(x => `<tr><td><b>${esc(x.name)}</b><br><span class="soft mono">${x.id}</span></td><td class="soft">${esc(x.ev)}</td>
        <td>${HM_VERDICTS[x.id] ? `<span class="pill ${HM_VERDICTS[x.id] === "would hire" ? "p-ok" : ""}">${HM_VERDICTS[x.id]}</span>` : `<div class="row" style="gap:4px"><button class="btn sm" data-v="would hire" data-id="${x.id}">Would hire</button><button class="btn sm" data-v="would not" data-id="${x.id}">Would not</button></div>`}</td>
        <td>${HM_VERDICTS[x.id] ? bandPill(x.band) + `<br><span class="soft">${esc(x.why)}</span>` : `<span class="soft">hidden until you vote</span>`}</td></tr>`).join("")}</table>
      ${n ? `<div class="callout"><b>This week: ${missed}/${n} “would hire”.</b> Would-hire on <b>Review</b> cases is expected; that is why Review exists. Would-hire on a <b>Not matched</b> case is a false “no” and goes to the criteria owner. Today's rate is 1.1% against a ≤2% target, measured on a 2% blind audit across all sites.</div>` : ""}</div>`;
    $$("button[data-v]", box).forEach(b => b.onclick = () => { HM_VERDICTS[b.dataset.id] = b.dataset.v; receipt({ candidate: b.dataset.id, country: "IN", actor: "hm:vikram.s", action: "blind sample verdict: " + b.dataset.v }); this.render(); });
  },
};
