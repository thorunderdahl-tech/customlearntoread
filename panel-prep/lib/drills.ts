// Reps-to-criterion drill items: the spine content that must come out
// automatically under stress. A rep is "clean" only if it covers every
// required beat accurately and fits the time limit; three clean reps
// retires an item for the day.

export type DrillItem = {
  id: string;
  title: string;
  prompt: string;
  limitSec: number;
  /** Required beats the rep must cover — judged by the AI coach, or shown
      for self-grading when no API key is configured. */
  target: string;
};

export const DRILL_ITEMS: DrillItem[] = [
  {
    id: "narrative",
    title: "The 60-second narrative",
    prompt: "Your opener: who you are and why WSP. Deliver it cold.",
    limitSec: 75,
    target:
      "Required beats: 12 years of multistate government affairs from the owner's side — a utility (ALLETE), then the largest data center builder in the country (Meta). Knows how governors' offices, PUCs, DOTs, and economic development agencies make decisions because the job was being in the room — across the exact 13 states this region covers. WSP just made a $3.3B bet that the energy and infrastructure build-out is the growth story of the decade; the candidate has been living inside that build-out and wants to convert client-side relationship capital and policy fluency into WSP's teams winning that work.",
  },
  {
    id: "three-messages",
    title: "The three messages",
    prompt: "All three must-land messages, from memory, in order.",
    limitSec: 45,
    target:
      "Required beats — all three messages: (1) career spent as the client these regions serve — knows what wins their trust; (2) network already covers the 13 states this role serves; (3) power & energy — WSP's biggest growth bet — is the field known better than any GA candidate they will meet.",
  },
  {
    id: "story-revenue",
    title: "Door-opening story · Trotta lens",
    prompt: "Headline → one proof point → quantified result. Your strongest relationship-to-revenue story.",
    limitSec: 120,
    target:
      "Required beats: a specific relationship converted into a concrete commercial outcome (siting terms secured, incentive package protected, or similar); quantification (dollar value at stake, states covered, or timeline compressed); a close that frames it as the WSP job — relationship capital converted into client wins, across thirty clients instead of one.",
  },
  {
    id: "story-federal",
    title: "Federal-state seam · Neely lens",
    prompt: "The HTEC/HVDC story — told with exact accuracy discipline.",
    limitSec: 120,
    target:
      "Required beats: built the state-level advocacy architecture and coalition groundwork for HTEC/HVDC; the DOE GRIP grant, state funding, and MPUC approval materialized AFTER the move to Meta — stated plainly, because the accuracy discipline is itself the selling point; managed D.C. contract lobbyists alongside Midwest state portfolios at ALLETE (the federal-state seam).",
  },
  {
    id: "story-political",
    title: "Political sensitivity · Khan lens",
    prompt: "Company's interest vs. an official's interest — and nobody burned.",
    limitSec: 120,
    target:
      "Required beats: a situation where the company's interest and an official's political needs genuinely diverged; the choice to give legislators defensible facts (farmland acreage modeling, water-use numbers) rather than spin; the outcome — both sides kept their credibility and no official was ever embarrassed by something the candidate handed them.",
  },
  {
    id: "story-aec",
    title: "Outcomes through others · Sanchez lens",
    prompt: "The closest analog to running GA inside a consultancy.",
    limitSec: 120,
    target:
      "Required beats: managed contract lobbyists across multiple states at ALLETE — goal-setting, performance management, budget oversight; accountable for outcomes delivered through other people; framed as the closest analog to orchestrating GA inside a consultancy.",
  },
  {
    id: "story-technical",
    title: "Technical translation · Doherty lens",
    prompt: "Deep technical content, legislators' language, nothing wrong.",
    limitSec: 120,
    target:
      "Required beats: the cooling chemistry plain-language Q&A (propylene glycol, PFAS) built for legislative testimony; engineers' facts kept exact while only the language changed — every number sourced, engineers signed off; the test: technical staff say it's right AND the legislator says it's clear.",
  },
  {
    id: "story-energy",
    title: "Energy market insight · Fitzpatrick lens",
    prompt: "The policy risk that decides whether infrastructure gets built.",
    limitSec: 120,
    target:
      "Required beats: large-load tariff design work (AEP at PUCO); cost-allocation fights — who bears the cost risk — determine whether energy infrastructure gets built; this is the policy risk her clients care most about, and the candidate has been inside it.",
  },
];

export function getDrill(id: string): DrillItem | undefined {
  return DRILL_ITEMS.find((d) => d.id === id);
}
