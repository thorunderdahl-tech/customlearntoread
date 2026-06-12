// WSP panel interview simulator — dossier data shared by the UI and the
// /api/interview coaching route. Sourced from the June 2026 panel prep
// dossier (Senior Director, Government Relations — Midwest).

export type InterviewQuestion = {
  id: string;
  text: string;
  /** What this panelist is listening for — shown as a hint and used as the
      no-API fallback coaching. */
  hint: string;
  /** A strong model answer (headline-first, under ~2 minutes spoken).
      Bracketed [slots] mark places to substitute your own specifics. */
  modelAnswer: string;
  toughSpot?: boolean;
};

export type Panelist = {
  id: string;
  name: string;
  title: string;
  /** One-line role-in-the-room framing. */
  role: string;
  initials: string;
  color: string;
  /** Questioning style, shown in the UI and fed to the coach model. */
  style: string;
  /** Condensed dossier: background + what they care about (LLM context). */
  brief: string;
  /** The candidate's ammunition against this panelist's lens. */
  connections: string[];
  questions: InterviewQuestion[];
};

export const PANELISTS: Panelist[] = [
  {
    id: "trotta",
    name: "John Trotta",
    title: "Midwest Region Executive (SVP)",
    role: "Your primary internal client — owns P&L for all 13 Midwest states",
    initials: "JT",
    color: "#2a7f78",
    style: "Relationship-driven, GA-literate, sees through fluff",
    brief:
      "Runs all WSP business lines across 13 Midwest states (IL, IN, IA, KS, KY, MN, MI, MO, NE, ND, OH, SD, WI). 22 years at Chicago Transit Authority before WSP (2006); still formally on the government affairs team as National Director of Client Services, so he is GA-literate. Chicago civic fixture, known for infectious energy. Cares about: revenue growth and client wins, cross-selling the expanded platform (TRC, POWER Engineers) into DOTs, utilities, transit, municipalities; the Illinois NITA Act (SB 2111, signed Dec 2025) standing up the Northern Illinois Transit Authority in Sept 2026 with ~$1.2B new annual operating funding; recruiting and team culture. Weighs 'would our clients trust this person' heavily.",
    connections: [
      "Your 13-state Meta portfolio maps almost exactly onto his district (OH, MN, IA, NE…)",
      "Minnesota: MN Government Relations Council board seat + ALLETE years = Twin Cities/Duluth network his MN business line lacks",
      "Data center demand is the biggest new load driver for his utility clients — you sat on the customer side of that table",
    ],
    questions: [
      {
        id: "trotta-ga-plan",
        text: "Walk me through how you'd build a government affairs plan for a state where WSP wants to grow — pick one of my thirteen.",
        hint: "Have Ohio and Minnesota ready (90-second sketch each). Frame everything in client wins and market position, not bills passed. Ohio: HB 706, the data center joint select committee, AEP tariff design at PUCO — you've been at every table. Minnesota: home turf — MN GRC board, ALLETE network, MPUC familiarity.",
        modelAnswer:
          "I'll take Ohio, because it's the biggest growth story in your district. The headline: Ohio's data center and grid build-out is the state's biggest economic development story, and I've been inside every major negotiation table for it — HB 706, the Joint Select Committee on Data Centers, and AEP's large-load tariff design at PUCO. The plan has three moves. First, map WSP's expanded power platform — TRC, POWER Engineers — against where the decisions actually get made: PUCO, the governor's office, JobsOhio, and the legislature's data center committee. Second, put WSP in front of the agencies and utilities as the firm that understands both sides of the interconnection table, using relationships I already hold. Third, pick three measurable priorities tied to live pursuits — tariff proceedings where utility clients need support, siting and water issues where municipalities need an owner's engineer, and the committee process itself, which will write the rules for the next decade of load growth. Every one of those ends in a pursuit, not a position paper.",
      },
      {
        id: "trotta-measure",
        text: "How do you measure whether government affairs is actually contributing to wins?",
        hint: "He's formally on the GA team — he will see through fluff. Talk pursuit-connected metrics: doors opened that became shortlists, intelligence that sharpened bids, incumbencies protected, pipeline contribution. Concrete and countable beats abstract influence.",
        modelAnswer:
          "Three numbers, in order of how much I trust them. First, pursuit contribution: shortlists and wins where GA intelligence demonstrably changed the bid — confirmed by the pursuit lead, not self-reported. Second, doors opened: qualified first meetings between WSP leaders and decision-makers we didn't have before, because that's the leading indicator of the first number. Third, incumbencies protected: contracts renewed or scopes expanded where we headed off a political problem early. What I don't count is bills tracked or receptions attended — that's activity, not contribution. I run my portfolio at Meta the same way: the test of my year isn't what passed, it's whether projects sited, energized, and stayed welcome in their communities.",
      },
      {
        id: "trotta-door",
        text: "Tell me about a time you opened a door that turned into business value.",
        hint: "Story bank: your strongest relationship-to-revenue story — siting terms secured, incentive package protected. Quantify: states covered, dollar value at stake, timeline compressed. Headline → one proof point → stop.",
        modelAnswer:
          "Structure to follow with your own strongest story: Headline first — 'I turned [relationship] into [$X of protected value / a signed agreement] in [N months].' Then the single proof point: the economic development negotiation where relationships you'd built with [the governor's office / the utility / county leadership] secured siting terms or protected an incentive package — name the dollar value at stake and the timeline you compressed. Close to the room, not just to John: 'That's the job as I understand it here — relationship capital converted into commercial outcomes. The difference is that at WSP I'd be doing it across thirty clients instead of one.'",
      },
      {
        id: "trotta-travel",
        text: "Thirteen states is a lot of ground. How are you thinking about presence and travel across the region?",
        toughSpot: true,
        hint: "Answer with a plan, not a feeling: tier the states (IL/OH/MN as tier-1 presence states), a legislative-session-driven travel calendar, piggyback client pursuits onto capitol trips. Realistic: 35–50% in year one while building relationships, settling lower once networks are established.",
        modelAnswer:
          "I've thought about this concretely, because thirteen states is a presence problem before it's a policy problem. Year one is the investment year — realistically thirty-five to fifty percent travel while I build the relationship map. But it's structured, not reactive: Illinois, Ohio, and Minnesota are tier-one presence states — that's where WSP's revenue, the NITA stand-up, and my deepest networks already are. The travel calendar follows legislative sessions, and I piggyback client pursuits onto every capitol trip so each itinerary serves at least two purposes. By year two, with the listening tour converted into standing relationships, it settles meaningfully lower. I've run a thirteen-state portfolio from a home base before — the discipline is making every trip do double duty.",
      },
      {
        id: "trotta-90days",
        text: "What would your first 90 days look like?",
        toughSpot: true,
        hint: "Days 1–30: listening tour — every Midwest business line leader, top 10 client account managers, the national GA team. Days 31–60: tier the 13 states by revenue, pipeline, policy volatility; draft the Midwest GA plan with 3 measurable priorities synced to the IIJA cliff (Sept 30). Days 61–90: first wins — NITA stand-up positioning in Illinois, a capitol-visit program, one pursuit visibly sharpened by GA intelligence.",
        modelAnswer:
          "Three phases. Days one to thirty: a listening tour — every Midwest business line leader, the top ten client account managers, the national GA team, and your district leadership. I want the inventory of relationships, memberships, and political commitments we already hold before I add anything. Days thirty-one to sixty: tier the thirteen states by WSP revenue, pipeline, and policy volatility, and draft the Midwest GA plan with three measurable priorities — synced to Andrew's reauthorization calendar, because the IIJA cliff lands September 30, right inside this window. Days sixty-one to ninety: first visible wins. Position WSP for the NITA stand-up in Illinois — a brand-new mega-client born in our backyard that same month — launch a capitol-visit program for region leadership, and put GA intelligence visibly into one live pursuit. Ninety days in, you should be able to point at three concrete things that didn't exist before I started.",
      },
    ],
  },
  {
    id: "neely",
    name: "Andrew Neely",
    title: "Senior Director, Federal Government Affairs",
    role: "Future national-team peer — owns the federal seam",
    initials: "AN",
    color: "#33518e",
    style: "Ex-Senate drafter — precision and accuracy discipline matter",
    brief:
      "Joined WSP 2022 from Senate Commerce Committee, where as deputy policy director he was lead drafter/negotiator of IIJA multimodal, rail, safety, research titles; earlier Senate EPW staff, FAST Act (2015). Owns bipartisan federal relations. THE issue of his year: IIJA surface transportation programs expire Sept 30, 2026. House T&I marked up the BUILD America 250 Act (H.R. 8870, $580B five-year reauthorization) May 21, 2026. Highway Trust Fund math is broken (gas tax ~$44B/yr vs $102B+ needed) so extensions are likely. Cares whether state/local hires can translate federal developments for clients without overstating certainty.",
    connections: [
      "ALLETE dual federal+state portfolio — managed D.C. contract lobbyists alongside Midwest states",
      "DOE GRIP grant groundwork on HTEC/HVDC — be precise that outcomes landed after your departure; the advocacy architecture was yours",
      "You know how IIJA-era discretionary grants changed state infrastructure politics from the applicant side",
    ],
    questions: [
      {
        id: "neely-reauth",
        text: "How would you keep Midwest clients positioned during a reauthorization fight that may end in short-term extensions?",
        hint: "Deploy the reality check: every surface bill since 1991 has needed extensions; HTF revenue can't support IIJA-level spend. Smart take: help clients triage projects into obligated / awarded-not-obligated / pipeline, and keep state DOT clients positioned for whichever scenario lands.",
        modelAnswer:
          "Start from the math, because it tells you the scenario: the trust fund raises about forty-four billion a year against a hundred-plus of spend, and every surface bill since 1991 has needed extensions — so I'd plan for extensions and treat a clean five-year bill as upside. The client work is triage: help each DOT and transit client sort their program into three buckets — obligated, awarded-but-not-obligated, and pipeline. Obligated money is safe. Awarded-not-obligated is where we earn our keep, pushing agencies to obligate before the cliff. Pipeline projects need a dual-track strategy against both the BUILD America 250 framework and an extension world. Regional GA's job is keeping that picture current state by state and feeding what DOTs are actually doing back to your team — so WSP speaks with one voice and clients hear one consistent story regardless of which scenario lands.",
      },
      {
        id: "neely-coordination",
        text: "How do you coordinate with a federal team so we don't send mixed signals to a member's office?",
        hint: "Your ALLETE federal-state seam experience is the proof point. One voice per office, clear lanes, shared intelligence cadence. Your accuracy discipline (telling the HTEC/HVDC story exactly — outcomes landed after you left) is itself a selling point with a former Senate staffer.",
        modelAnswer:
          "One office, one voice, one owner. At ALLETE I ran exactly this seam — a federal portfolio with D.C. contract lobbyists alongside Midwest state portfolios — and the rule was simple: every congressional office had a named owner, and nobody else touched it without coordination. Practically, with your team it looks like three things. A shared engagement log, so we always know who said what to whom. A standing cadence where regional GA feeds state intelligence up — what DOTs are actually signaling about the cliff — and federal strategy comes down. And discipline about lanes: when a member's office asks me a federal question, the answer is 'let me connect you with Andrew's team,' not improvisation. The cost of a mixed signal to a member's office is far higher than the cost of a slower answer.",
      },
    ],
  },
  {
    id: "khan",
    name: "Omar Khan",
    title: "National Senior Managing Director, State & Local Government Affairs",
    role: "Co-owns the national playbook you'd execute regionally",
    initials: "OK",
    color: "#6b4fa1",
    style: "Tests political judgment, discretion, and team fit",
    brief:
      "Named to lead state & local GA (with John Fisher) in 2021; former senior advisor to NYC Mayor Bill de Blasio; deep political-operative background. Co-owns the national playbook: engaging elected/appointed officials, shaping policy that hits WSP's core services, advising leadership on leveraging civic relationships for priority pursuits. Cares about: political judgment and discretion — a consultancy's GA function lives or dies on never embarrassing a client agency; building civic capital in under-indexed markets and converting relationships into pursuit intelligence; fit across a small national GA bench.",
    connections: [
      "Coalition-building record across utilities, governors' offices, regulators, community leaders — hostile and friendly environments alike",
      "You've managed the corporate-reputation tightrope at Meta — a brand as politically charged as any consultancy client",
    ],
    questions: [
      {
        id: "khan-sensitive",
        text: "Tell me about a time you had to manage a politically sensitive situation where the company's interest and an official's interest diverged.",
        hint: "The Meta story: hearing/testimony prep where you gave legislators defensible facts (farmland acreage modeling, water-use numbers) rather than spin — protecting both the company and the official. Discretion is the trait being tested; show you never burned either side.",
        modelAnswer:
          "Hearing prep at Meta in [state]: a data center bill where our interest and the committee chair's politics genuinely diverged — we needed the incentive framework intact; the chair needed to show constituents he was tough on us. I made one decision early: give the legislature defensible facts instead of spin — actual farmland acreage modeling, actual water-use numbers, sourced and checkable. That gave the chair something he could say publicly that was both true and tough-sounding, and it gave us a record nobody could impeach later. The framework came out workable, the relationship survived, and — the part I care most about — no official was ever embarrassed by something we handed them. That's the standard I'd hold at WSP, where the client is often the agency itself: both sides keep their credibility, especially theirs.",
      },
      {
        id: "khan-capital",
        text: "How do you decide where to spend civic and political capital across thirteen states?",
        hint: "Tier by WSP revenue, pipeline, and policy volatility. Name the real tension — invest ahead of revenue vs. follow it — and have a view. Bonus: this mirrors the question you planned to ask him; showing you've thought about it lands twice.",
        modelAnswer:
          "Tier and commit. Map the thirteen states on three axes — current WSP revenue, pursuit pipeline, and policy volatility — and you get three tiers: states where we defend, states where we build, and states where we watch. The honest tension inside your question is invest-ahead versus follow-revenue, and my view is: civic capital has a long lead time, so you invest ahead precisely where the pipeline says revenue is coming — Illinois with NITA standing up, Ohio with the data center build-out — and you follow revenue everywhere else. What you don't do is spread relationship-building evenly across thirteen states; that buys you shallow everywhere. I'd rather be indispensable in five states than merely visible in thirteen — and I'd want to pressure-test my tiering against how your national bench sees it.",
      },
    ],
  },
  {
    id: "sanchez",
    name: "Avygail Sanchez",
    title: "State & Local Government Affairs Lead, West",
    role: "Your direct peer — the template for this role, 3 months in",
    initials: "AS",
    color: "#c2563a",
    style: "AEC insider — tests procurement fluency; respects curiosity over bluffing",
    brief:
      "Announced March 2026 alongside Cameron O'Brien (Federal) and Donna Estacio's promotion to Managing Director — the team build-out the candidate would complete. 20+ years inside the AEC industry: HNTB, Parsons, Vanir, HDR, Mott MacDonald; founded TQM Partners; ex-LA City Council staff; based in LA. Career built on the GA-to-pursuits flywheel: government relations fused with business development, bid strategy, P3 delivery. She is testing: will this person carry their region the way I carry mine, and do they understand AEC procurement dynamics (QBS, shortlists, protests, DBE goals)?",
    connections: [
      "Be candid you come from the client/owner side — then show homework on how consultants win work",
      "Shared ground: managing contract lobbyists, multistate program design, translating technical complexity for electeds",
      "Ask her questions — she just made the same transition into WSP and respects curiosity over bluffing",
    ],
    questions: [
      {
        id: "sanchez-aec-gap",
        text: "You've never worked inside an engineering firm. How will you learn the procurement side fast?",
        toughSpot: true,
        hint: "Concede the gap cleanly, then flip it: every AEC firm has GA people who know consulting; almost none have GA people who've sat in the owner's seat for the two biggest client categories of the decade (utilities, hyperscale data centers). You've hired, managed, and evaluated consultants. Then show homework: QBS/Brooks Act, shortlist dynamics, protests, DBE goals — and ask about her own three-month-old transition.",
        modelAnswer:
          "Straight answer: you're right, I haven't — and the procurement side isn't something I'd try to bluff. Here's what I bring instead: twelve years in the owner's seat for the two biggest infrastructure client categories of this decade — a utility and a hyperscaler — hiring, managing, and scoring consultants. I know what makes a client trust a firm because I've been the client deciding. On the homework: I understand QBS and Brooks Act selection, how shortlists and protests actually work, and why DBE goals shape teaming — and my first ninety days include sitting with pursuit teams through live procurements so the mechanics become muscle memory, not theory. And honestly, I'd want to borrow your map: you made this exact transition into WSP three months ago — what would you tell me to learn first?",
      },
      {
        id: "sanchez-no-relationships",
        text: "How would you support a pursuit team in a state where you have no existing relationships?",
        hint: "The GA-to-pursuit flywheel she's run her whole career. Your analog: managing contract lobbyists across multiple states at ALLETE — goal-setting, performance management, accountability for outcomes through others. Coalition-building from a standing start is your documented strength.",
        modelAnswer:
          "The same way I've stood up every new state in my Meta portfolio — you don't start with the capitol, you start with the pursuit. Step one: have the pursuit team brief me on the decision-makers, the procurement calendar, and the political sensitivities around the client agency. Step two: build the influence map — which members, local officials, and associations actually move this agency — and find the two or three legitimate connectors, often through coalitions or national groups where I already have standing. Step three: show up early and usefully, before we need anything. And where speed matters more than my own network, I know how to work through others: at ALLETE I managed contract lobbyists in states where I had no personal relationships — set goals, managed performance, stayed accountable for outcomes I delivered through other people. The flywheel you've run your whole career — relationships feeding shortlists — is the playbook; I've been running it from the client's side of the table.",
      },
    ],
  },
  {
    id: "doherty",
    name: "Karen Doherty",
    title: "Mountain Pacific Region Executive (SVP), PE",
    role: "Internal client — licensed engineer; tests technical credibility",
    initials: "KD",
    color: "#3d7a46",
    style: "Practical and pursuit-connected; has seen good and useless GA",
    brief:
      "30+ years consulting engineering in the Pacific Northwest; licensed civil engineer (Gonzaga); ex-HDR area manager; ran her own firm a decade. 2019–20 Chair of ACEC Washington; steering committee for the Sound Transit 3 funding package campaign — she has personally done ballot-measure infrastructure advocacy. Her team presents on 'Energy Superabundance in the West' at the Western Governors' Association — power demand is reshaping her region. Cares about: GA support that is practical and pursuit-connected, not abstract policy commentary; power & energy growth post-TRC (transmission, data center load); whether you can earn the trust of technical staff.",
    connections: [
      "Cooling chemistry, water, tariff-design, grid-interconnection fluency — you can talk to engineers in their own units",
      "ST3: you can ask informed questions about ballot-level infrastructure advocacy",
    ],
    questions: [
      {
        id: "doherty-translate",
        text: "Give me an example of translating a deeply technical issue for a legislator without dumbing it down or getting it wrong.",
        hint: "The cooling chemistry plain-language Q&A (propylene glycol, PFAS) built for legislative testimony — engineers' facts in legislators' language. Exactly the translation function a region executive wants from GA. Keep the units right; she's a PE.",
        modelAnswer:
          "Cooling chemistry, for legislative testimony. Lawmakers were being told data centers pump 'chemicals' into local water, and the company answer couldn't be 'trust us.' I built a plain-language Q&A with our engineers: what propylene glycol actually is, what PFAS is and is not present in our systems, what the discharge permits actually measure. The discipline was keeping the engineers' facts exact while changing only the language — no analogy that wasn't technically defensible, every number sourced so a hostile staffer couldn't break it. Legislators used it on the record, and the engineers had signed off on every word. That's the test I hold myself to: the technical staff would say it's right, and the legislator would say it's clear — never one without the other. That's also how GA earns the trust of your engineers instead of just borrowing their slides.",
      },
      {
        id: "doherty-6months",
        text: "What would the regions actually feel in the first six months if we hired you?",
        hint: "Practical and pursuit-connected, not policy commentary. Concrete deliverables from your 90-day plan: a tiered 13-state map, a Midwest GA plan with 3 measurable priorities, NITA positioning, a capitol-visit program, one pursuit visibly sharpened. Things an operator can see and use.",
        modelAnswer:
          "Things you can see and use, not commentary. By month six the Midwest region would have: a tiered map of all thirteen states — where we defend, build, or watch — that business line leaders actually reference; a GA plan with three measurable priorities you can hold me to; WSP positioned with the new Northern Illinois Transit Authority as it stands up in September; a capitol-visit program that's put region leadership in front of decision-makers; and at least one live pursuit where the team will tell you GA intelligence sharpened the bid. And one quieter thing: your technical staff will have learned I can talk to them in their own units — tariffs, interconnection queues, cooling water — so GA stops being the people who ask for slides and becomes the people who bring intelligence.",
      },
    ],
  },
  {
    id: "fitzpatrick",
    name: "Paula Fitzpatrick",
    title: "Texas & Louisiana Region Executive (SVP)",
    role: "Internal client — the most energy-native of the three REs",
    initials: "PF",
    color: "#a8642a",
    style: "Direct, probing follow-ups — 'asks tough questions, gets to the heart'",
    brief:
      "Joined WSP March 2025; 25+ years in energy, engineering, commissioning; Texas A&M–Galveston maritime systems engineering; based in Houston. Recruited by U.S. Region President Joseph Sczurko, who praised her for asking tough questions and getting to the heart of client needs. Recent regional win: DART Silver Line opening (WSP as program management oversight consultant). Cares about: energy sector growth; whether you understand the commercial mechanics — program management, owner's-engineer roles, commissioning — how WSP actually makes money in energy.",
    connections: [
      "Texas: you know ERCOT-adjacent large-load policy debates from the hyperscaler side; she lives where that fight is loudest",
      "Oklahoma SB 259 cooling-water work and multistate SUT exemption mastery — the regulatory substrate of energy-intensive development",
    ],
    questions: [
      {
        id: "fitz-policy-risk",
        text: "Where do you see the biggest policy risk to the energy infrastructure build-out over the next three years?",
        hint: "Your home field: large-load tariff design and cost-allocation fights (AEP/PUCO) determine whether infrastructure gets built; interconnection queues; water/cooling regulation (OK SB 259); incentive instability (VA SB 30 repeal effective Jan 1, 2027); the community backlash pattern — the railroad/Owens Valley/powerline-wars framing is a memorable panel moment.",
        modelAnswer:
          "Cost allocation. The fights over who pays for large-load interconnection — tariff-design battles like the one I've been in at PUCO with AEP — decide whether energy infrastructure gets built faster than any siting or permitting issue, because they determine whether new load is an asset or a threat to every other ratepayer. Get the tariff wrong and capital goes to a different state; get it right and the build-out funds the grid for everyone. Behind that, two compounding risks: incentive instability — Virginia just repealed its exemption effective January 2027, and every state legislature watched — and the community backlash cycle on water and land, which is an old American pattern; we ran it before with the railroads and the powerline wars. The firms that win the next three years are the ones that help clients navigate cost allocation and community consent at the same time — and that's the seat I've been sitting in.",
      },
      {
        id: "fitz-why-leave",
        text: "You're leaving the most resourced policy shop in the world. Why a consultancy?",
        toughSpot: true,
        hint: "Run toward, not away: at Meta you advocate for one company's projects; at WSP you'd help build the public infrastructure ecosystem itself, across every client and sector, at the firm that just became the largest in the country at doing it. The skills compound; the canvas gets bigger. NEVER mention data-center fatigue, Meta politics, or burnout — these panelists count hyperscalers as current or hoped-for clients.",
        modelAnswer:
          "I'm running toward something, not away from anything. At Meta I advocate for one company's projects — and it's been a privilege to do that at the center of the build-out. But what I've actually fallen for is the build-out itself: a once-in-a-generation re-industrialization of American infrastructure. WSP just made a three-point-three-billion-dollar bet that this is the growth story of the decade, and became the largest firm in the country at delivering it. At WSP I'd help build that ecosystem across every client and sector — DOTs, utilities, transit agencies, and the data center owners I understand from the inside. The skills compound; the canvas gets bigger. And candidly: twelve years as the client means I know exactly what makes an owner trust a consultancy. I want to be on the side that earns that trust at scale.",
      },
    ],
  },
];

/** Pseudo-panelist for the closing "questions for us" moment. */
export const THE_ROOM: Panelist = {
  id: "room",
  name: "The Panel",
  title: "All six panelists",
  role: "The closer — the room turns it over to you",
  initials: "★",
  color: "#5a5346",
  style: "Your questions are also being evaluated",
  brief:
    "The closing moment of a six-on-one panel. The candidate's prepared, panelist-matched questions: Trotta — 'With NITA standing up in September and the IIJA cliff the same month, what's the biggest near-term opportunity in the Midwest where GA could move the needle?' Neely — 'If reauthorization slides into extensions, how do you want regional GA feeding state DOT intelligence back to the federal team?' Sanchez — 'Three months into building the West playbook, what's surprised you most about how GA lands inside WSP?' Doherty/Fitzpatrick — 'From the region executive's chair, what separates GA support that helps you win from GA that's just noise?' Khan — 'How does the team think about building civic capital where WSP lacks density — invest ahead of revenue, or follow it?' Closer to the room — 'The TRC close makes WSP the largest U.S. firm in exactly the sectors where policy risk is highest. How is the GA function expected to scale with that?'",
  connections: [],
  questions: [
    {
      id: "room-closer",
      text: "That's everything from our side. What questions do you have for us?",
      hint: "Match questions to panelists: Trotta (NITA + IIJA cliff opportunity), Neely (state DOT intelligence flow under extensions), Sanchez (what surprised her about GA inside WSP), Doherty/Fitzpatrick (what separates GA that helps you win from noise), Khan (invest civic capital ahead of revenue or follow it). Strong closer to the room: 'TRC makes WSP the largest U.S. firm in exactly the sectors where policy risk is highest — how is GA expected to scale with that?'",
      modelAnswer:
        "Pick two or three, matched to the asker, and end with the room-wide closer. To John: 'With NITA standing up in September and the IIJA cliff the same month, what's the biggest near-term opportunity in the Midwest where GA could move the needle for your teams?' To Andrew: 'If reauthorization slides into extensions, how do you want regional GA feeding state DOT intelligence back to the federal team?' To Avygail: 'Three months into building the West playbook — what's surprised you most about how GA lands inside WSP?' To Karen or Paula: 'From the region executive's chair, what separates GA support that actually helps you win from GA that's just noise?' To Omar: 'How does the team think about building civic capital where WSP doesn't yet have density — invest ahead of revenue, or follow it?' Then the closer to the whole room: 'The TRC close makes WSP the largest U.S. firm in exactly the sectors where policy risk is highest — how is the GA function expected to scale with that?'",
    },
  ],
};

export const THREE_MESSAGES = [
  "I have spent my career as the client these regions serve — I know what wins their trust.",
  "My network already covers the 13 states this role serves.",
  "WSP's biggest growth bet — power and energy — is the field I know better than any GA candidate they will meet.",
];

export const STATE_OF_PLAY = `WSP state of play, June 2026:
- TRC acquisition closed Feb 24, 2026 (US$3.3B cash, ~8,000 employees): creates the #1 U.S. Power & Energy platform and makes WSP the largest U.S. engineering/design firm by revenue (~27,000 U.S. employees). Power & Energy now ~34% of U.S. net revenue. Integration is THE internal story of 2026 — and the reason this role exists: a bigger energy platform needs GA coverage where the load growth is.
- POWER Engineers (2024) + kW Mission Critical: data center practice — generation, grid interconnection, mission-critical design under one roof. The firm's fastest-growing client segment is the candidate's current employer's industry.
- Ricardo plc closed Oct 2025: deepens advisory/policy-strategy bench.
- Q1 2026: net revenue ~$3.7B (+11% YoY), backlog ~CAD $20B (+18%), EPS beat. 2025–27 plan targets 19–20% adjusted EBITDA margin; talent capacity is a stated growth constraint.
- GA team: Stuart Sunshine (SVP National Director) over Donna Estacio (Managing Director, promoted March 2026), Neely + Cameron O'Brien (Federal), Khan + John Fisher (State & Local national), Sanchez (West). The candidate would be the Midwest/Central build-out.
Policy landscape:
- Federal: IIJA expires Sept 30, 2026; BUILD America 250 Act (H.R. 8870, $580B, 5-year) marked up by House T&I May 21, 2026; HTF math broken (~$44B/yr gas tax vs ~$102B/yr need) so extensions likely.
- Illinois: NITA Act (SB 2111, signed Dec 16, 2025) — Northern Illinois Transit Authority replaces the RTA Sept 2026; ~$1.5B package; a brand-new mega-client being born in WSP's backyard.
- Ohio: HB 706, Joint Select Committee on Data Centers, AEP tariff design at PUCO — candidate is an active participant.
- Minnesota: candidate's home turf — MN GRC board, ALLETE/Minnesota Power network, MPUC familiarity, HVDC/grid advocacy history.`;

export const CANDIDATE_PROFILE = `The candidate: Thor Underdahl, interviewing for Senior Director, Government Relations (Midwest) at WSP USA. 12 years of multistate government affairs from the owner's side: first at ALLETE/Minnesota Power (utility — dual federal/state portfolio, managed D.C. contract lobbyists, HTEC/HVDC advocacy architecture, MPUC), now at Meta (largest data center builder in the country — 13-state portfolio overlapping the Midwest region, OH HB 706/PUCO tariff negotiations, OK SB 259 cooling-water work, multistate sales & use tax exemption strategy, farmland/water-use testimony prep). MN Government Relations Council board member. Strengths: data-forward style, coalition building, technical translation (cooling chemistry, tariffs, interconnection). Gap to manage: never worked inside a consultancy/AEC firm — counter is owner's-seat credibility plus demonstrated homework on QBS procurement, shortlists, and the GA-to-pursuit flywheel.
60-second narrative spine: "12 years doing multistate GA from the owner's side — utility then the largest data center builder in the country. I know how governors' offices, PUCs, DOTs, and economic development agencies make decisions because my job was to be in the room, across the exact 13 states this region covers. WSP just made a $3.3B bet that the energy and infrastructure build-out is the growth story of the decade — I've been living inside that build-out, and I want to use the relationship capital and policy fluency I built as the client to help WSP's teams win that work."`;

export const COACHING_RUBRIC = `Panel dynamics rubric (six-on-one, each panelist gets 2–3 questions):
1. Crisp structure: lead with the headline, give ONE proof point, stop. Spoken length target under 2 minutes.
2. Frame answers in client wins and market position, not bills passed — this is a sales-enablement role, three regional P&L owners are in the room.
3. Land the three messages whenever an opening appears: (a) career spent as the client these regions serve; (b) network already covers the 13 states; (c) power & energy — WSP's biggest bet — is the field known best.
4. Accuracy discipline: never overstate (e.g., HTEC/HVDC outcomes landed after departure). Concede gaps cleanly, then flip to strength.
5. Never say anything negative about Meta, data-center-sector fatigue, or burnout — panelists count hyperscalers as clients.
6. Answer to the asker, land the close to the room.`;

export function getPanelist(id: string): Panelist | undefined {
  if (id === THE_ROOM.id) return THE_ROOM;
  return PANELISTS.find((p) => p.id === id);
}
