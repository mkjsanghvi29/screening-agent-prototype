// ===== Core: helpers, icons, router, overview =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "class") e.className = v; else if (k.startsWith("on")) e[k] = v; else e.setAttribute(k, v); } if (html) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = (x, d = 0) => (x * 100).toFixed(d) + "%";
function toast(html, ms = 4200) { const t = $("#toast"); t.innerHTML = html; t.style.display = "block"; clearTimeout(t._t); t._t = setTimeout(() => t.style.display = "none", ms); }
const bandPill = b => `<span class="pill ${b === "Advance" ? "p-ok" : b === "Review" ? "p-warn" : b === "Not matched" ? "p-bad" : ""}">${b}</span>`;
const evPill = v => `<span class="pill ${v === "met" ? "p-ok" : v === "unmet" ? "p-bad" : "p-warn"}">${v}</span>`;
const av = (name) => `<span class="avatar">${initials(name)}</span>`;

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 12h6M9 16h4"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  gauge: '<path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24">${ICONS[n]}</svg>`;

const VIEWS = {};
const NAV = [
  { grp: "Start" }, { id: "overview", icon: "home", label: "Overview", sub: "Flow, actors, 5-min tour" },
  { grp: "Hiring flow" },
  { id: "candidate", icon: "phone", label: "Candidate", sub: "WhatsApp · CV or questions" },
  { id: "recruiter", icon: "inbox", label: "Recruiter", sub: "Review queue" },
  { id: "interviewer", icon: "clip", label: "Interviewer", sub: "Slots · scorecards · HM review" },
  { grp: "Control & assurance" },
  { id: "admin", icon: "sliders", label: "TA admin", sub: "Criteria · tuning · policy" },
  { id: "governance", icon: "shield", label: "Governance", sub: "Who signs each gate" },
  { id: "quality", icon: "gauge", label: "Agent quality", sub: "Eval layers · release gate" },
  { id: "auditor", icon: "search", label: "Auditor", sub: "Receipts · validation" },
];

const App = {
  cur: null,
  go(id) { location.hash = id; },
  route() {
    const id = (location.hash || "#overview").slice(1).split("?")[0];
    const v = VIEWS[id] ? id : "overview";
    $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
    $$("section.view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
    const V = VIEWS[v];
    $("#t-title").textContent = V.title; $("#t-sub").textContent = V.sub;
    $("#t-persona").innerHTML = Array.isArray(V.persona) ? `<span>Acting as</span>${av(V.persona[0])}<span><b style="color:var(--cp-text)">${V.persona[0]}</b><br>${V.persona[1]}</span>` : "";
    App.cur = v; if (V.show) V.show($("#v-" + v)); window.scrollTo(0, 0);
  },
  badge(id, n) { const b = $(`#nav a[data-v=${id}] .badge`); if (b) { b.textContent = n; b.style.display = n ? "" : "none"; } },
  start() {
    const nav = $("#nav");
    NAV.forEach(n => {
      if (n.grp) return nav.appendChild(h("div", { class: "navgrp" }, n.grp));
      nav.appendChild(h("a", { href: "#" + n.id, "data-v": n.id }, `${icon(n.icon)}<span>${n.label}<small>${n.sub}</small></span><span class="pill p-acc badge" style="display:none"></span>`));
    });
    const main = $("#main");
    Object.entries(VIEWS).forEach(([id, V]) => { const s = h("section", { class: "view", id: "v-" + id }); main.appendChild(s); V.init(s); });
    window.addEventListener("hashchange", App.route);
    $("#themeToggle").onclick = () => { const d = document.documentElement; d.setAttribute("data-theme", d.getAttribute("data-theme") === "dark" ? "light" : "dark"); };
    App.route(); App.refreshBadges();
  },
  refreshBadges() {
    App.badge("recruiter", QUEUE.filter(q => !q.done && (q.band === "Review" || q.deConfirm)).length);
    App.badge("interviewer", INTERVIEWS.filter(i => i.c === "IN" && !i.done && i.status !== "Cancelled").length);
    App.badge("governance", Object.keys(UNLOCK_REQ).filter(c => POLICY[c].rank === "locked").length);
  },
};

// ---------------- Overview ----------------
VIEWS.overview = {
  title: "Overview", sub: "An AI screening agent that says “yes” in minutes and never says “no” on its own judgement",
  init(el) {
    el.innerHTML = `
    <div class="hero">
      <div class="card">
        <h2 style="font-size:22px">Fast yes, <span style="color:var(--cp-accent)">accountable no</span></h2>
        <p class="muted" style="margin-top:0">${TENANT} receives 400k frontline applications a year. Today the median applicant waits 9 days, and the best take a competitor’s offer within 48 hours.
        This agent answers every applicant in minutes, books strong candidates straight into interviews, and routes every adverse decision to a <b>published rule</b> or a <b>named human</b>. Every step writes a <b>decision receipt</b>.</p>
        <div class="flow">
          <div><em>1</em><b>Apply</b>Job board, QR poster or WhatsApp link</div>
          <div><em>2</em><b>Consent</b>Language, AI-use notice, opt-in</div>
          <div><em>3</em><b>Screen</b>Share a CV <i>or</i> answer 7 questions</div>
          <div><em>4</em><b>Evidence</b>LLM extracts facts with quotes; candidate confirms</div>
          <div><em>5</em><b>Band</b>Deterministic score + country policy</div>
          <div><em>6</em><b>Act</b>Advance → book · Review → recruiter · Knockout → rule</div>
          <div><em>7</em><b>Learn</b>Scorecards and outcomes tune weights (with approval)</div>
        </div>
      </div>
      <div class="card">
        <h2>Suggested 5-minute tour</h2>
        <ol class="tour">
          <li><a href="#candidate">Candidate</a>: choose <b>Share my CV</b>, book a slot, then fast-forward through reminder → interview day.</li>
          <li><a href="#interviewer">Interviewer</a>: score that candidate on the structured scorecard, then return to the candidate for the offer.</li>
          <li><a href="#recruiter">Recruiter</a>: decide a Review card. Note the reason code and the rubber-stamp check.</li>
          <li><a href="#admin">TA admin → Tuning</a>: click <b>Suggest weights from outcomes</b> and watch the fairness guardrail.</li>
          <li><a href="#governance">Governance</a>: sign each gate as its owner to unlock auto-reject for India. Then see it in the candidate flow.</li>
          <li><a href="#quality">Agent quality</a> and <a href="#auditor">Auditor</a>: how we prove all of this works.</li>
        </ol>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h2>Who is involved <span class="sub">Each actor has a view. Click to open.</span></h2>
      <div class="actors" style="margin-top:10px">
        ${[["candidate", "Candidate", "Frontline applicant on a phone. No login. Applies, books, reschedules and asks “why” on WhatsApp or SMS."],
           ["candidate", "Screening agent", "Reads the CV or the answers, extracts evidence, books interviews and answers questions grounded in the requisition. It never rejects on a score."],
           ["recruiter", "Recruiter", "Owns the Review band and the DE knockout confirmations. Works from evidence cards (~40s each), and every decision needs a reason code."],
           ["interviewer", "Interviewer (shift lead)", "Publishes interview availability, which drives capacity. Runs a structured scorecard that feeds weight tuning."],
           ["interviewer", "Hiring manager (pilot)", "Reviews a weekly sample of candidates the agent did not fast-track: the false-negative check."],
           ["admin", "Head of TA", "Owns the criteria, weights and threshold, approves changes and requests autonomy unlocks."],
           ["governance", "DPO · counsel · works council", "Sign the legal gates per country. No signature, no automated rejection."],
           ["governance", "Darwinbox Responsible AI", "Provider-side review of the model card, evals and red-team results before any unlock."],
           ["auditor", "Auditor / regulator", "Reads the receipts, the fairness reports and the validation pack, and can export everything."]]
          .map(([v, t, d]) => `<div class="actor" onclick="App.go('${v}')"><div class="row">${av(t)}<b>${t}</b></div><p>${d}</p></div>`).join("")}
      </div>
    </div>`;
  },
};
