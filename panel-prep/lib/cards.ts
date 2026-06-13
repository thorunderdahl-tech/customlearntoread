// "Know These Cold" flashcard deck + a lightweight spaced-repetition
// scheduler. Card states live in localStorage on the client.

export type Card = {
  id: string;
  cat: "WSP facts" | "Policy" | "Panelists" | "Your spine";
  front: string;
  back: string;
};

export const CARDS: Card[] = [
  // ── WSP facts ────────────────────────────────────────────────────────
  { id: "trc-close", cat: "WSP facts", front: "TRC acquisition — when did it close, and for how much?", back: "Feb 24, 2026 · US$3.3B cash · ~8,000 employees · Windsor, CT power/energy/utility consultancy (ex-Warburg Pincus)." },
  { id: "trc-meaning", cat: "WSP facts", front: "What did the TRC close make WSP?", back: "The #1 Power & Energy platform in the U.S. and the largest U.S. engineering & design firm by revenue (~27,000 U.S. employees)." },
  { id: "pe-share", cat: "WSP facts", front: "Power & Energy is what share of WSP's U.S. net revenue?", back: "~34% — and integration of TRC is THE internal story of 2026. It's why this role exists now." },
  { id: "power-kw", cat: "WSP facts", front: "POWER Engineers + kW Mission Critical give WSP what?", back: "The data center practice: generation, grid interconnection, and mission-critical facility design under one roof (POWER acquired 2024)." },
  { id: "ricardo", cat: "WSP facts", front: "Ricardo plc — when, and why does it matter?", back: "Closed Oct 2025. Strategy/advisory consultancy in transport, energy, environment — WSP sells policy insight, not just engineering hours." },
  { id: "q1-2026", cat: "WSP facts", front: "WSP Q1 2026 numbers?", back: "Net revenue ~$3.7B (+11% YoY) · backlog ~CAD $20B (+18% YoY) · EPS beat. 2025–27 plan targets 19–20% adjusted EBITDA by 2027; talent capacity is the stated growth constraint." },
  { id: "ga-team", cat: "WSP facts", front: "Sketch the GA team structure (post-March 2026).", back: "Stuart Sunshine (SVP National Director, SF) → Donna Estacio (Managing Director, LA, promoted Mar 2026). Federal: Neely + Cameron O'Brien (D.C.). State & Local national: Khan + John Fisher. West: Sanchez. You = the Midwest/Central build-out." },
  // ── Policy ───────────────────────────────────────────────────────────
  { id: "iija-cliff", cat: "Policy", front: "When do IIJA surface transportation programs expire?", back: "September 30, 2026 — the same month NITA stands up in Illinois." },
  { id: "hr8870", cat: "Policy", front: "The reauthorization bill — number, size, status?", back: "BUILD America 250 Act, H.R. 8870 · $580B, five-year · marked up by House T&I on May 21, 2026. Adds EV/PHEV fees, keeps most IIJA competitive grants, new bridge formula program." },
  { id: "htf-math", cat: "Policy", front: "The Highway Trust Fund math (your reality-check line)?", back: "~$44B/yr from a 1993-era gas tax vs $102B+/yr of IIJA-level spend — and every surface bill since 1991 has needed extensions. Plan for extensions; triage clients' projects: obligated / awarded-not-obligated / pipeline." },
  { id: "nita", cat: "Policy", front: "Illinois NITA Act — bill, signing, what happens?", back: "SB 2111, signed Dec 16, 2025. Northern Illinois Transit Authority replaces the RTA in Sept 2026 — new powers over fares, service coordination, long-term capital planning." },
  { id: "nita-money", cat: "Policy", front: "NITA funding package?", back: "~$1.5B total: ~$1.2B new annual operating + ~$180M capital. Sources: ~$860M motor-fuel sales tax redirection, possible 0.25% RTA-region sales tax (~$478M), Road Fund interest." },
  { id: "ohio-ammo", cat: "Policy", front: "Your Ohio ammunition — three items?", back: "HB 706 · the Joint Select Committee on Data Centers · AEP large-load tariff design at PUCO. You've been at every table; the Midwest's biggest economic development story is the data center + grid build-out." },
  { id: "va-sb30", cat: "Policy", front: "Virginia SB 30?", back: "Repeals the data center sales & use tax exemption effective Jan 1, 2027 — your go-to example of incentive instability; every state legislature watched." },
  { id: "ok-sb259", cat: "Policy", front: "Oklahoma SB 259?", back: "Cooling-water regulation — your work there + cooling chemistry fluency proves you understand the regulatory substrate of energy-intensive development." },
  // ── Panelists ────────────────────────────────────────────────────────
  { id: "p-trotta", cat: "Panelists", front: "John Trotta — who is he and what does he weigh most?", back: "Midwest Region Executive (SVP), your primary internal client. 22 years at Chicago Transit Authority, WSP since 2006, still National Director of Client Services on the GA team (GA-literate — sees through fluff). Weighs: 'would our clients trust this person.'" },
  { id: "p-13states", cat: "Panelists", front: "Name Trotta's 13 states.", back: "IL, IN, IA, KS, KY, MN, MI, MO, NE, ND, OH, SD, WI — almost exactly your Meta footprint." },
  { id: "p-neely", cat: "Panelists", front: "Andrew Neely — background and the issue of his year?", back: "Senior Director, Federal GA. Ex-Senate Commerce deputy policy director — lead drafter of IIJA multimodal/rail/safety titles; earlier EPW staff, FAST Act 2015. His year: the Sept 30 IIJA cliff and H.R. 8870. Precision matters — never overstate." },
  { id: "p-khan", cat: "Panelists", front: "Omar Khan — background and what he's testing?", back: "National Senior Managing Director, State & Local GA (with John Fisher, since 2021). Former senior advisor to NYC Mayor de Blasio. Testing: political judgment and discretion — never embarrass a client agency — and team fit." },
  { id: "p-sanchez", cat: "Panelists", front: "Avygail Sanchez — career and what she's testing?", back: "West lead, ~3 months in (announced Mar 2026). 20+ years inside AEC: HNTB, Parsons, Vanir, HDR, Mott MacDonald; founded TQM Partners; ex-LA City Council. Testing: will you carry your region like she carries hers + do you get QBS, shortlists, protests, DBE goals. She respects curiosity over bluffing." },
  { id: "p-doherty", cat: "Panelists", front: "Karen Doherty — background and what she cares about?", back: "Mountain Pacific Region Executive (SVP), PE — 30+ years PNW consulting engineering, ex-HDR, ran her own firm a decade. ACEC Washington chair 2019–20; Sound Transit 3 campaign steering committee. Cares: practical, pursuit-connected GA + technical credibility." },
  { id: "p-fitz", cat: "Panelists", front: "Paula Fitzpatrick — background and style?", back: "Texas & Louisiana Region Executive (SVP), joined Mar 2025. 25+ years energy/engineering/commissioning, Texas A&M–Galveston, Houston. Recent win: DART Silver Line. Style: direct, probing follow-ups — 'asks tough questions, gets to the heart.' Most energy-native RE on the panel." },
  // ── Your spine ───────────────────────────────────────────────────────
  { id: "s-three", cat: "Your spine", front: "The three messages to land no matter what?", back: "1) I've spent my career as the client these regions serve — I know what wins their trust. 2) My network already covers the 13 states this role serves. 3) WSP's biggest growth bet — power & energy — is the field I know better than any GA candidate they'll meet." },
  { id: "s-rule", cat: "Your spine", front: "The panel-dynamics rule for a six-on-one?", back: "Lead with the headline, give ONE proof point, stop — under 2 minutes. Answer to the asker, land the close to the room. Frame in client wins and market position, not bills passed." },
  { id: "s-whyleave", cat: "Your spine", front: "'Why leave Meta?' — the frame, and the three things never to say?", back: "Run toward, not away: from advocating one company's projects to building the public infrastructure ecosystem itself, at the largest U.S. firm doing it. NEVER: data-center fatigue, Meta politics, burnout — they count hyperscalers as clients." },
  { id: "s-gap", cat: "Your spine", front: "The consultancy-gap flip?", back: "Concede cleanly, then: every AEC firm has GA people who know consulting; almost none have GA people who've sat in the owner's seat for the two biggest client categories of the decade. Then show homework: QBS, shortlists, the GA-to-pursuit flywheel." },
  { id: "s-htec", cat: "Your spine", front: "The HTEC/HVDC accuracy discipline — tell it exactly how?", back: "You built the state-level advocacy architecture and coalition groundwork; the DOE GRIP grant, state funding, and MPUC approval materialized AFTER your move to Meta. Telling it that precisely is itself the selling point with Neely." },
  { id: "s-90days", cat: "Your spine", front: "First 90 days — the three phases?", back: "1–30: listening tour (business line leaders, top 10 account managers, national GA team). 31–60: tier the 13 states; Midwest GA plan with 3 measurable priorities synced to the IIJA calendar. 61–90: first wins — NITA positioning, capitol-visit program, one pursuit visibly sharpened." },
];

// ── Scheduler: a deliberately simple SM-2-style ladder ─────────────────
// Miss → back to step 0, due again today. Hit → climb a step, due after
// the matching interval. Steps map to days: 1, 2, 4, 7, 14.

export const INTERVALS = [1, 2, 4, 7, 14];

export type CardState = { step: number; due: string }; // due = YYYY-MM-DD

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function gradeCard(s: CardState | undefined, got: boolean): CardState {
  if (!got) return { step: 0, due: todayStr() };
  const step = Math.min((s?.step ?? 0) + 1, INTERVALS.length);
  const d = new Date();
  d.setDate(d.getDate() + INTERVALS[step - 1]);
  return { step, due: d.toISOString().slice(0, 10) };
}

export function isDue(s: CardState | undefined): boolean {
  return !s || s.due <= todayStr();
}
