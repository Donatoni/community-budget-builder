import { costCenterTotal } from './cost-center-data.js';
// ============ Budget data ============
// Figures from the City of DeLand PIO — FY 26/27 budget.

// --- CONFIG: adjust these if Finance provides updated numbers ---
export const REDUCTION_TARGET_M = 5.2; // millions that must be cut before submitting
// Shared submission storage, served by Vite locally and Pages Functions in production.
export const SUBMIT_ENDPOINT = "/api/submissions";
export const FEEDBACK_ENDPOINT = "/api/feedback";

export const SERVICES = [
  {
    id: "fire",
    icon: "flame",
    tone: "coral",
    name: "Fire Department",
    desc: "Fire prevention, emergency response, emergency management, firefighters, paramedics, and other personnel",
    cutExamples: [
      "Equipment replacement and some fire-prevention outreach may be delayed.",
      "Training and prevention programs could be reduced, with fewer staff hours available for coverage.",
      "Reduced staffing and equipment availability could limit the crews available for emergencies.",
      "Major reductions could require changes to station coverage and leave fewer crews available for emergency response.",
    ],
    max: 15,
    proposed: Math.round(costCenterTotal("fire") * 100) / 1e8,
  },
  {
    id: "police",
    icon: "shield",
    tone: "blue",
    name: "Police Department",
    desc: "Crime reduction, community engagement, emergency response, officers, detectives, and other personnel",
    cutExamples: [
      "Equipment replacement and some community outreach may be delayed.",
      "Proactive patrols and crime-prevention programs could be reduced as vacancies go unfilled.",
      "Fewer officers and investigators could mean less patrol coverage and longer waits for non-emergency follow-up.",
      "Major staffing reductions could limit patrol coverage, investigations, and the capacity to respond to calls.",
    ],
    max: 20,
    proposed: Math.round(costCenterTotal("police") * 100) / 1e8,
  },
  {
    id: "streets",
    icon: "road",
    tone: "orange",
    name: "Public Works",
    desc: "Street and sidewalk maintenance, ADA features, tree protection and management, community space beautification, fleet and facility maintenance",
    cutExamples: [
      "Routine street repairs, tree care, and landscaping may take longer.",
      "Street resurfacing and sidewalk projects could be postponed as maintenance backlogs grow.",
      "Major repairs and vehicle replacement could be deferred, leaving fewer crews and equipment available.",
      "Routine upkeep could be sharply curtailed, with work focused on urgent repairs while streets and sidewalks deteriorate.",
    ],
    max: 10,
    proposed: Math.round(costCenterTotal("streets") * 100) / 1e8,
  },
  {
    id: "parks",
    icon: "tree",
    tone: "green",
    name: "Parks and Recreation",
    desc: "Community events, parks and green space management, event spaces upkeep, little league and other sports funding, DeLand House Museum support",
    cutExamples: [
      "Park and playing-field maintenance may become less frequent.",
      "Facility hours, community events, and support for youth sports could be reduced.",
      "Repairs could be deferred, and some park facilities or programs may need to close or be suspended.",
      "Multiple facilities could close, with major reductions to park upkeep, community events, and youth sports support.",
    ],
    max: 10,
    proposed: Math.round(costCenterTotal("parks") * 100) / 1e8,
  },
  {
    id: "planning",
    icon: "chart",
    tone: "purple",
    name: "Community Development",
    desc: "Community development regulations, future land-use planning, economic development and business support, planning project consultation",
    cutExamples: [
      "Planning consultations and local business assistance may take longer.",
      "Development reviews could slow, with fewer staff available for business support and long-range planning.",
      "Planning projects and economic-development initiatives could be put on hold as review backlogs grow.",
      "Major staffing reductions could severely limit development reviews and suspend much of the City's planning and business-support work.",
    ],
    max: 5,
    proposed: Math.round(costCenterTotal("planning") * 100) / 1e8,
  },

];

export const PROPOSED_TOTAL = SERVICES.reduce((s, x) => s + Math.round(x.proposed * 1e8), 0) / 1e8; // Sum of the workbook’s net Cost Center - Everything amounts.

// Illustrative scenario bands, not validated service-level or staffing forecasts.
// Compare unrounded percentages; the displayed percentage is rounded separately.
export function serviceImpact(service, funding) {
  if (!Number.isFinite(funding) || service.proposed - funding < 0.05) return null;
  const cutPercent = Math.min(100, (service.proposed - Math.max(0, funding)) / service.proposed * 100);
  const level = cutPercent <= 17 + 1e-9 ? 0
    : cutPercent <= 33.5 + 1e-9 ? 1
    : cutPercent <= 50 + 1e-9 ? 2 : 3;
  return {
    cutPercent,
    level,
    text: funding <= 0
      ? "No funding remains for this service group in your plan. Its services would need another funding source to continue."
      : service.cutExamples[level],
  };
}

export const fmtUSD = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Small nonzero gaps must never look like zero before the target is met.
export const fmtM = (value) => {
  const n = Math.round(value * 1e8) / 1e8 || 0;
  return n !== 0 && Math.abs(n) < 0.01
    ? (n * 1e6).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}M`;
};
