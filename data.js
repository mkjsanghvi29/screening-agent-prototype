// ===== Shared state for all views. All data is synthetic. =====
const TENANT = "Northstar Retail & Logistics";
const SITES = {
  IN: { country: "India", site: "Bhiwandi DC", role: "Warehouse Associate · Night shift", req: "REQ-WH-221", langs: ["English", "हिंदी", "मराठी"],
        offer: "₹19,500/month + ₹2,000 night allowance", start: "Mon 3 Nov", addr: "Gate 2, Bhiwandi DC, Mumbai–Nashik Highway",
        transport: "Yes, a company bus runs from Bhiwandi bus depot at 21:15 (source: requisition REQ-WH-221 · benefits).",
        interviewer: "Priya Nair", interviewerTitle: "Shift Lead · Bhiwandi DC",
        cv: { name: "Ravi Kumar", file: "Ravi_Kumar_CV.pdf", meta: "1 page · PDF · 84 KB",
              exp: "Delivery partner, Swiggy · Mar 2022 – Jul 2025 · night slots", area: "Bhiwandi (≈3 km from site)", langs: "Hindi, Marathi, basic English" } },
  US: { country: "the United States", site: "Dallas Fulfilment Center", role: "Warehouse Associate · Night shift", req: "REQ-WH-318", langs: ["English", "Español"],
        offer: "$19.50/hour + $1.50 night differential", start: "Mon 3 Nov", addr: "Door 4, 1200 Logistics Pkwy, Dallas TX",
        transport: "The site has free staff parking; there is no shuttle (source: requisition REQ-WH-318 · benefits).",
        interviewer: "Carlos Diaz", interviewerTitle: "Shift Supervisor · Dallas FC",
        cv: { name: "Jordan Taylor", file: "Jordan_Taylor_Resume.pdf", meta: "1 page · PDF · 61 KB",
              exp: "Stocker, Walmart Supercenter · 2023 – 2025", area: "Dallas (≈6 mi from site)", langs: "English" } },
  DE: { country: "Germany", site: "Logistikzentrum Leipzig", role: "Lagermitarbeiter:in · Nachtschicht", req: "REQ-WH-407", langs: ["Deutsch", "English"],
        offer: "€15.80/hour + 25% night premium", start: "Mo 3 Nov", addr: "Tor 3, Logistikzentrum Leipzig",
        transport: "The night bus N5 stops at the gate (source: requisition REQ-WH-407 · benefits).",
        interviewer: "Katrin Vogel", interviewerTitle: "Schichtleiterin · Leipzig",
        cv: { name: "Lukas Weber", file: "Lebenslauf_Lukas_Weber.pdf", meta: "2 pages · PDF · 112 KB",
              exp: "Kommissionierer, DHL Hub Leipzig · 2024 – 2025", area: "Leipzig-Nord (≈4 km)", langs: "Deutsch, English" } },
};

let CRITERIA = [
  { id: "K1", text: "Right to work in the country", type: "Knockout", w: 0, why: "Legal requirement", by: "Rohan Iyer (Head of TA)", q: c => `Are you legally allowed to work in ${SITES[c].country}?`, opts: [["Yes", "met"], ["No", "unmet"]] },
  { id: "K2", text: "Available for night shifts (22:00–06:00)", type: "Knockout", w: 0, why: "Role is night-only", by: "Ops head", q: () => "This role is night shifts only (22:00–06:00). Can you work nights?", opts: [["Yes, nights are fine", "met"], ["No", "unmet"]] },
  { id: "K3", text: "Can lift 20 kg repeatedly (team-lift & adjustments available)", type: "Knockout", w: 0, why: "Core task; adjustments considered", by: "H&S lead", q: () => "The job involves lifting boxes up to 20 kg, often with a team-lift. We can discuss adjustments. Is that OK?", opts: [["Yes", "met"], ["Not sure", "unclear"], ["No", "unmet"]] },
  { id: "P1", text: "Commute ≤ 15 km", type: "Preferred", w: 25, why: "Night-shift attendance", by: "Ops head", q: () => "Roughly how far do you live from the site?", opts: [["Under 5 km", "met"], ["5–15 km", "met"], ["15–30 km", "partial"], ["30+ km", "unmet"]] },
  { id: "P2", text: "Any physical work (warehouse, delivery, retail stock…)", type: "Preferred", w: 30, why: "Ramp-up time", by: "Ops head", q: () => "Have you done any physical work before, e.g. warehouse, delivery, construction or retail stock?", opts: [["Yes, 1+ year", "met"], ["A little", "partial"], ["Not yet", "unmet"]] },
  { id: "P3", text: "Can start within 2 weeks", type: "Preferred", w: 20, why: "Peak timing", by: "Rohan Iyer (Head of TA)", q: () => "When could you start?", opts: [["Immediately", "met"], ["Within 2 weeks", "met"], ["In a month or more", "unmet"]] },
  { id: "P4", text: "Understands the safety-briefing language", type: "Preferred", w: 25, why: "Safety", by: "H&S lead", q: c => `Safety briefings are in ${SITES[c].langs.slice(0, 2).join(" / ")}. Can you follow them?`, opts: [["Yes", "met"], ["Partly", "partial"], ["No", "unmet"]] },
];
const crit = id => CRITERIA.find(c => c.id === id);
let THRESHOLD = 70;
const CRIT_VERSIONS = [
  { v: "v1", at: "02 Oct", by: "Rohan Iyer", note: "Initial criteria from the workshop with Ops and H&S" },
  { v: "v2", at: "09 Oct", by: "Rohan Iyer + Ops head", note: "K3 reworded to mention team-lift: the employee panel showed 4% of good performers answered “No” to the old wording" },
  { v: "v3", at: "16 Oct", by: "Rohan Iyer + Ops head", note: "Advance threshold 75 → 70: Advance volume was under interview capacity for 2 weeks" },
];

const POLICY = {
  IN: { knock: "auto", rank: "locked" },
  US: { knock: "auto", rank: "locked" },
  DE: { knock: "human", rank: "locked" },
};

// ---- governance actors & gates ----
const ROLES = {
  ta:        { name: "Rohan Iyer",          title: "Customer · Head of Talent Acquisition", org: "Customer" },
  dpo:       { name: "Anita Rao",           title: "Customer · Data Protection Officer", org: "Customer" },
  uscounsel: { name: "Mark Ellis",          title: "Customer · US employment counsel", org: "Customer" },
  wc:        { name: "Jens Krüger",         title: "Works-council chair · Leipzig site", org: "Employee body" },
  rai:       { name: "Dr. S. Menon",        title: "Darwinbox · Responsible AI review board", org: "Darwinbox" },
  auditor:   { name: "Fairlane Audit LLP",  title: "Independent bias auditor (NYC LL 144)", org: "External" },
  system:    { name: "Evaluation pipeline", title: "Computed automatically from data", org: "System" },
};
const initials = n => n.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]).slice(0, 2).join("").toUpperCase();
function gatesFor(c) {
  const g = [
    { id: "bt", name: "Historical backtest: hire recall ≥95% (top-rated ≥98%)", owner: "system", ev: "BT-07 · 96.9% / 98.6%" },
    { id: "panel", name: "Employee panel: ≥98% of top performers pass knockouts", owner: "system", ev: "EP-02 · 600 associates · 98.6%" },
    { id: "fair", name: "Adverse-impact ratio ≥0.80 at every stage for 8 weeks", owner: "system", ev: "Fairness job · min 0.86" },
    { id: "shadow", name: "One full peak of shadow decisions (agent vs recruiter)", owner: "system", ev: "Available after peak · est. Feb 2027", sim: true },
    { id: "rai", name: "Darwinbox Responsible AI review", owner: "rai", ev: "Model card, eval pack, red-team report" },
    { id: "legal", name: "Customer legal sign-off for this country", owner: c === "US" ? "uscounsel" : "dpo", ev: c === "DE" ? "DPIA + GDPR Art. 22 assessment" : c === "US" ? "State/city AI-in-hiring duties memo" : "DPDP notice & rights assessment" },
  ];
  if (c === "US") g.push({ id: "audit", name: "Independent bias audit published (NYC roles)", owner: "auditor", ev: "Audit summary + 10-business-day notice" });
  if (c === "DE") g.push({ id: "wc", name: "Works-council agreement (BetrVG §87 / §95)", owner: "wc", ev: "Betriebsvereinbarung draft v2" });
  g.push({ id: "notice", name: "Candidate notice updated to disclose automated rejection", owner: "ta", ev: "Notice v3 + careers-site copy" });
  return g;
}
const GATESTATE = { IN: {}, US: {}, DE: {} };
Object.keys(GATESTATE).forEach(c => ["bt", "panel", "fair"].forEach(id => GATESTATE[c][id] = { by: "system", at: "auto" }));
const UNLOCK_REQ = {}; // country -> {at, by}

// ---- interview slots (interviewer availability) ----
const DAYS = ["Mon 27 Oct", "Tue 28 Oct", "Wed 29 Oct", "Thu 30 Oct", "Fri 31 Oct", "Sat 1 Nov"];
const TIMES = ["10:00", "11:00", "15:00", "16:00"];
const SLOTCAP = 3; // 20-min interviews per hour block
const SLOTS = {};
["IN", "US", "DE"].forEach(c => {
  SLOTS[c] = {};
  DAYS.forEach((d, di) => TIMES.forEach((t, ti) => {
    const roster = (c === "IN" && di === 3 && ti >= 2); // rostered on the floor
    const open = !roster && !(ti === 3 && di % 2 === 1) && !(di === 5 && ti >= 2);
    const booked = open ? [2, 1, 3, 0, 2, 1][(di + ti) % 6] : 0;
    SLOTS[c][d + " " + t] = { day: d, time: t, open, roster, booked: Math.min(booked, SLOTCAP) };
  }));
});
const OTHER_INTERVIEWER_CAP = { IN: 270, US: 210, DE: 70 };
function siteCapacity(c = "IN") { return OTHER_INTERVIEWER_CAP[c] + Object.values(SLOTS[c]).filter(s => s.open).length * SLOTCAP; }
function freeSlots(c, n = 3, after = null) {
  const list = Object.entries(SLOTS[c]).filter(([k, s]) => s.open && s.booked < SLOTCAP);
  const start = after ? list.findIndex(([k]) => k === after) + 1 : 0;
  return list.slice(Math.max(start, 0), Math.max(start, 0) + n);
}

// ---- interviews & scorecards ----
const INTERVIEWS = [
  { id: "C-5530", name: "Amit S.", c: "IN", slot: "Tue 28 Oct 10:00", status: "Checked in", ev: { P1: "3 km", P2: "“Flipkart picker 2 yrs”", P3: "Immediately", P4: "Hindi" } },
  { id: "C-5534", name: "Neha P.", c: "IN", slot: "Tue 28 Oct 10:00", status: "Booked", ev: { P1: "6 km", P2: "“Big Bazaar stock room, 1 yr”", P3: "Within 2 weeks", P4: "Hindi, English" } },
  { id: "C-5537", name: "Sameer K.", c: "IN", slot: "Tue 28 Oct 11:00", status: "Booked", ev: { P1: "2 km", P2: "“Construction helper”", P3: "Immediately", P4: "Marathi, Hindi" } },
  { id: "C-5528", name: "Dana R.", c: "US", slot: "Tue 28 Oct 10:00", status: "Booked", ev: { P1: "4 mi", P2: "“Amazon seasonal 2025”", P3: "1 month", P4: "English" } },
];
const SCORECARDS = [];
const BASE_SCORECARDS = 1241, BASE_RETENTION = 412;

// ---- review queue ----
const QUEUE = [
  { id: "C-5521", name: "Ravi K.", c: "IN", band: "Review", score: 65, src: "CV + 3 questions", reason: "Score 65, below Advance (70). Experience inferred from CV free text.", ev: { K1: ["met", "Answered: Yes"], K2: ["met", "Answered: Yes"], K3: ["met", "Answered: Yes"], P1: ["met", "2 km (computed)"], P2: ["met", "CV: “3 years food delivery, night slots”"], P3: ["partial", "“after Diwali”"], P4: ["unclear", "Answered in Marathi; language not stated"] }, note: "This is the backtest twin of the objecting hiring manager’s best 2025 hire. A CV-to-JD ranker put him in the bottom 30%. Here he lands in Review, not Not matched." },
  { id: "C-5519", name: "Sneha P.", c: "IN", band: "Review", score: 55, src: "Questions", reason: "Score 55, below Advance (70).", ev: { K1: ["met", "Yes"], K2: ["met", "Yes"], K3: ["met", "Yes"], P1: ["partial", "18 km (computed)"], P2: ["unmet", "Retail cashier; no physical work stated"], P3: ["met", "Immediately"], P4: ["met", "Hindi, English"] } },
  { id: "C-5502", name: "Jordan T.", c: "US", band: "Review", score: 62, src: "Questions", reason: "Knockout K3 unclear (“Not sure about lifting”). The agent may not decide.", ev: { K1: ["met", "Yes"], K2: ["met", "Yes"], K3: ["unclear", "“Not sure”"], P1: ["met", "6 mi"], P2: ["met", "“2 yrs Walmart stocking”"], P3: ["met", "Immediately"], P4: ["met", "English"] } },
  { id: "C-5498", name: "Maria G.", c: "US", band: "Review", score: 45, src: "CV", reason: "Score 45, below Advance (70).", ev: { K1: ["met", "Yes"], K2: ["met", "Yes"], K3: ["met", "Yes"], P1: ["unmet", "24 mi"], P2: ["partial", "CV: “Home care aide”"], P3: ["unmet", "1 month+"], P4: ["met", "Spanish, English"] } },
  { id: "C-5490", name: "Lukas W.", c: "DE", band: "Not matched", deConfirm: true, score: 0, src: "Questions", reason: "Knockout K2 (“no night shifts”). Awaiting human confirmation (DE policy).", ev: { K1: ["met", "Ja"], K2: ["unmet", "“Nein”"], K3: ["met", "Ja"], P1: ["met", "4 km"], P2: ["met", "“Kommissionierer, 1 Jahr”"], P3: ["met", "Sofort"], P4: ["met", "Deutsch"] } },
  { id: "C-5487", name: "Aylin D.", c: "DE", band: "Not matched", deConfirm: true, score: 0, src: "CV + questions", reason: "Knockout K1: no right to work stated. Awaiting human confirmation (DE policy).", ev: { K1: ["unmet", "“Nein”"], K2: ["met", "Ja"], K3: ["met", "Ja"], P1: ["met", "9 km"], P2: ["unmet", "—"], P3: ["met", "2 Wochen"], P4: ["met", "Deutsch, Türkisch"] } },
];
const HM_SAMPLE = [
  { id: "C-5521", name: "Ravi K.", band: "Review", why: "Score 65; P3 partial, P4 unclear", ev: "CV: 3 yrs food delivery, night slots · 2 km · start “after Diwali”" },
  { id: "C-5419", name: "Pooja M.", band: "Not matched", why: "Knockout K2: answered “No” to nights", ev: "Answered: “No, I can only do day shift”" },
  { id: "C-5502", name: "Jordan T.", band: "Review", why: "K3 unclear", ev: "“Not sure about lifting” · 2 yrs Walmart stocking" },
  { id: "C-5455", name: "Imran A.", band: "Review", why: "Score 50; P1 partial, P2 partial", ev: "22 km · “helped at uncle’s shop godown”" },
  { id: "C-5441", name: "Kavya R.", band: "Not matched", why: "Knockout K1: no right to work", ev: "Answered “No” · then requested review → corrected (typo)" },
];
const HM_VERDICTS = {};

// ---- receipts ----
const RECEIPTS = [];
let SEQ = 4180;
const tsz = (d = new Date()) => d.toISOString().replace("T", " ").slice(0, 19) + "Z";
function receipt(o) {
  const r = Object.assign({ receipt_id: "DR-2026-" + (++SEQ), at: tsz(), tenant: "northstar-01", criteria_version: "wh-assoc-" + (typeof CRIT_VERSIONS !== "undefined" ? CRIT_VERSIONS[CRIT_VERSIONS.length - 1].v : "v3"), threshold: THRESHOLD,
    model: "evidence-extractor 2026-10 · prompt p-17", scorer: "det-scorer 1.4" }, o);
  RECEIPTS.unshift(r); if (window.onReceipt) window.onReceipt(r); return r;
}
QUEUE.forEach((q, i) => receipt({ at: tsz(new Date(Date.now() - (i + 2) * 3.6e6)), candidate: q.id, country: q.c, actor: "agent",
  action: q.deConfirm ? "knockout → pending human confirmation" : "route → review", band: q.band, score: q.score, input: q.src,
  evidence: Object.fromEntries(Object.entries(q.ev).map(([k, v]) => [k, { value: v[0], source: v[1] }])), policy: `${q.c}.knockout=${POLICY[q.c].knock}; rank_reject=locked` }));
[["C-5411", "IN", "agent", "knockout → auto-close (K2) with reason + review link", "Not matched"],
 ["C-5405", "IN", "recruiter:a.mehta", "not progressed · reason: commute 40 km, declined relocation", "Review"],
 ["C-5399", "US", "recruiter:j.ortiz", "advanced after review (override of agent band)", "Review"],
 ["C-5390", "IN", "recruiter:a.mehta", "candidate review request → re-opened → advanced", "Not matched"],
 ["—", "IN", "approver:rohan.iyer", "criteria v3 approved (threshold 75 → 70)", "—"]]
  .forEach(([c, co, a, act, b], i) => receipt({ at: tsz(new Date(Date.now() - 864e5 * (i + 1))), candidate: c, country: co, actor: a, action: act, band: b }));

// ---- synthetic population for the tuning simulator (seeded, deterministic) ----
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const POP = (() => {
  const r = rng(42), gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const pick = p => { const x = r(); return x < p[0] ? 1 : x < p[0] + p[1] ? 0.5 : 0; };
  const a = [];
  for (let i = 0; i < 6000; i++) {
    const f = r() < 0.35, o = r() < 0.25;
    const P1 = pick([.42, .3]), P2 = pick(o ? [.36, .3] : f ? [.2, .32] : [.36, .3]), P3 = r() < .6 ? 1 : 0, P4 = pick([.62, .25]);
    const perf = 0.30 * P1 + 0.30 * P2 + 0.15 * P4 + 0.08 * P3 + 0.22 * gauss();
    a.push({ f, o, v: [P1, P2, P3, P4], perf, pass: perf + 0.15 * gauss() });
  }
  const cut = [...a].sort((x, y) => y.perf - x.perf)[1200].perf, pc = [...a].sort((x, y) => y.pass - x.pass)[3000].pass;
  a.forEach(x => { x.top = x.perf >= cut; x.ok = x.pass >= pc; });
  return a;
})();
const WEEKLY_SCORED = 900, WEEKLY_HIRES = 70, INTERVIEWS_PER_HIRE = 3.5;
function simulate(w, T) {
  let adv = 0, top = 0, topA = 0, okA = 0, fA = 0, fN = 0, mA = 0, mN = 0, oA = 0, oN = 0, yA = 0, yN = 0;
  const ws = w.reduce((a, b) => a + b, 0) || 1;
  POP.forEach(x => {
    const s = x.v.reduce((a, v, i) => a + v * w[i], 0) * 100 / ws, A = s >= T;
    adv += A; if (x.top) { top++; topA += A; } if (A && x.ok) okA++;
    if (x.f) { fN++; fA += A; } else { mN++; mA += A; } if (x.o) { oN++; oA += A; } else { yN++; yA += A; }
  });
  const rf = fA / fN, rm = mA / mN, ro = oA / oN, ry = yA / yN;
  return { advShare: adv / POP.length, advWeek: Math.round(WEEKLY_SCORED * adv / POP.length), topRecall: topA / top, precision: adv ? okA / adv : 0,
    airF: Math.min(rf, rm) / Math.max(rf, rm || 1), airAge: Math.min(ro, ry) / Math.max(ro, ry || 1),
    reviewHrs: Math.round((WEEKLY_SCORED - WEEKLY_SCORED * adv / POP.length) * 40 / 3600) };
}
function fitWeights() { // logistic regression: interview pass ~ criteria evidence
  let b = [0, 0, 0, 0, 0];
  for (let it = 0; it < 400; it++) {
    const g = [0, 0, 0, 0, 0];
    POP.forEach(x => { const z = b[0] + x.v.reduce((a, v, i) => a + v * b[i + 1], 0), p = 1 / (1 + Math.exp(-z)), e = (x.ok ? 1 : 0) - p; g[0] += e; x.v.forEach((v, i) => g[i + 1] += e * v); });
    b = b.map((c, i) => c + g[i] / POP.length);
  }
  const pos = b.slice(1).map(c => Math.max(c, 0)), s = pos.reduce((a, c) => a + c, 0);
  return { coef: b.slice(1), w: pos.map(c => Math.round(c * 100 / s)) };
}
