import source from './cost-center-source.js';

// Main!B18:AM18 (Cost Center - Everything). Round each source cost to cents once.
// Source values and cell references remain alongside the editable copy.
// Trailer Park is excluded from this exercise, including its net revenue.
const supplied = {
  // Service descriptions supplied by each department, September 30, 2026.
  "Field Ops": "Field Operations funds the personnel, equipment, training, K-9 services, firearms, ammunition, protective gear, and operational supplies that keep officers on patrol and responding to calls. It also includes community engagement programs that build relationships and trust between officers and the community.",
  "Records": "Records funds the staff who review, enter, approve, and classify police reports so they are available to investigators and other authorized users, and who fulfill public requests for police reports and other records.",
  "Crim. Invest": "Criminal Investigations funds the detectives who conduct interviews, follow-ups, surveillance, evidence review, and records requests, and who work with prosecutors to build cases.",
  "Evidence": "Evidence Management funds the staff and supplies used to process, store, and track evidence, supporting forensic examination and the timely delivery of cases to the State Attorney's Office.",
  "Person. Selec.": "Personnel Recruitment and Selection funds police academy scholarships as well as the fees and costs of processing and hiring new officers.",
  "Training": "Training funds ongoing instruction for officers on use of force, de-escalation, firearms, emergency driving, legal updates, crisis response, and changes in law and department policy.",
  "Com Engage.": "Community Engagement funds programs with schools, young people, neighborhood organizations, and senior citizens that build familiarity, relationships, and trust between officers and the community.",
  "Animal Svs": "Animal Services funds the Spay and Neuter Reimbursement program for cats and the transport of stray animals to local shelters, which help control the stray animal population in the community.",
  "Parking Enforcement": "Parking Enforcement funds the monitoring of downtown time limits and restricted spaces.",
  "Fire Suppression": "Fire Suppression funds the firefighters and fire apparatus available to respond to structure fires, vehicle accidents, and specialized rescue emergencies.",
  "EMS": "EMS funds paramedic-level emergency medical care, training for new personnel, and the medical equipment and supplies needed to respond to emergency calls.",
  "Special Ops": "Special Operations funds the specialized equipment, technical training, and personnel needed for hazardous materials incidents, vehicle or machinery entrapment, and other complex rescues.",
  "Fire Prevention": "Fire Prevention funds fire inspections, plan review, code compliance, public education, school outreach, and fall-prevention programs for older residents.",
  "Street Lights": "Street Lights funds maintenance, repairs, and replacement of city street lighting to keep roads and sidewalks visible and safe at night.",
  "Street Maint": "Street Maintenance funds roadway repairs and preventive maintenance that keep pavement in good condition and help avoid costlier repairs later.",
  "Signs": "Signs funds the installation, repair, and replacement of regulatory, warning, and informational signs that support traffic safety.",
  "Sidewalks": "Sidewalks funds sidewalk repairs, replacement, and ADA accessibility improvements for pedestrians.",
  // Split the document's combined tree-service paragraph across the existing choices.
  'Tree Trimming': 'Tree Trimming funds routine trimming to keep roadways, sidewalks, utility lines, and sight lines clear.',
  'Tree Removal': 'Tree Removal funds the removal of hazardous, dead, or diseased trees before they cause damage or block roads.',
  "Urban Downtown": "Urban Downtown funds upkeep of downtown public spaces, streetscapes, landscaping, amenities, and event setup.",
  "Urban Mowing": "Urban Mowing funds mowing and landscape maintenance on city-maintained property to keep areas neat, safe, and accessible.",
  "Urban Irrigation": "Urban Irrigation funds the operation, repair, and maintenance of irrigation systems for city-maintained landscaping.",
  "Vehicle Repair": "Vehicle Repair funds maintenance and repairs for the city fleet, keeping vehicles used for essential services and emergency response on the road.",
  "Recreation": "Recreation funds youth and adult programs, classes, sports leagues, camps, and after-school activities.",
  "Parks": "Parks funds mowing, trash pickup, and restroom cleaning at city parks, along with repairs to playgrounds, pavilions, trails, and lighting.",
  "Intermodal Trans.": "Intermodal Transportation funds maintain and support for the city's intermodal transportation facilities.",
  "DeLand House": "DeLand House funds tours, exhibits, and educational programs at the historic home of the city's founder, along with upkeep of the building.",
  "Activity Center": "Recreation Center funds operating hours and daily activities at the Sanborn Center, including open play for pickleball, shuffleboard, and tennis.",
  "Sports Facilities": "Sports Facilities funds maintenance and event support at Melching Field, Spec Martin Stadium, and the Sperling Sports Complex, including mowing, lining, and repairing fields used by youth, collegiate, and adult leagues.",
  "Special Events": "Special Events funds city-sponsored community events such as holiday celebrations, festivals, and concerts.",
  "Chisholm Center": "Chisholm Center funds operating hours, programs, and repairs at the Chisholm Community Center, a neighborhood gathering place offering activities for kids, families, and seniors.",
  "Concessions": "Concessions funds the concession stands at games, tournaments, and events, which also generate revenue for the city.",
  "Economic Development": "Economic Development funds support for small businesses looking to open or grow in DeLand, which includes efforts to attract new employers and high-value jobs to the city.",
  "Planning": "Planning funds the review of applications from residents and businesses who want to build or renovate. It also funds the long-range planning for how DeLand grows, including where new housing, shopping, and roads are built and how neighborhoods are protected.",
  "Code Enforcement": "Code Enforcement funds the response to resident reports of issues like overgrown lots, abandoned vehicles, junk piles, and rundown properties, along with follow-up on property maintenance violations.",
};
const drafts = {};
const names = {
  'Special Ops': 'Special Operations', 'Street Maint': 'Street Maintenance',
  'Field Ops': 'Field Operations', 'Crim. Invest': 'Criminal Investigations',
  'Person. Selec.': 'Personnel Selection', 'Com Engage.': 'Community Engagement',
  'Animal Svs': 'Animal Services', 'Intermodal Trans.': 'Intermodal Transportation',
  'Activity Center': 'Recreation Center',
  'Sports Facilities': 'Sports Facilities (Melching Field, Spec Martin Stadium, and the Sperling Sports Complex)',
};
const ids = { 'Activity Center': 'parks-activity-center', 'Sports Facilities': 'parks-sports-facilities' };
// Preserve the three workbook records while presenting one selectable sports choice.
const sportsNames = ['Stadium', 'Sperling', 'Conrad/ Melching'];
const sportsRows = source.costCenters.filter(row => sportsNames.includes(row.name));
// Combine Community Engagement with Field Operations, retaining both source records.
const fieldOperationsRows = source.costCenters.filter(row => ['Field Ops', 'Com Engage.'].includes(row.name));
const catalogRows = source.costCenters.flatMap(row => {
  if (row.name === 'Trailer Park') return [];
  if (row.name === 'Com Engage.') return [];
  if (row.name === 'Field Ops') return [{
    ...row,
    sourceCell: fieldOperationsRows.map(item => item.sourceCell).join(', '),
    totalCostCenter: fieldOperationsRows.reduce((sum, item) => sum + Math.round(item.totalCostCenter * 100), 0) / 100,
  }];
  if (!sportsNames.includes(row.name)) return [row];
  if (row.name !== 'Stadium') return [];
  return [{
    name: 'Sports Facilities',
    division: sportsRows.map(item => item.division).join(', '),
    sourceCell: sportsRows.map(item => item.sourceCell).join(', '),
    totalCostCenter: sportsRows.reduce((sum, item) => sum + Math.round(item.totalCostCenter * 100), 0) / 100,
  }];
});
const serviceFor = division => division.startsWith('11') ? 'planning'
  : ['1222', '1223'].includes(division) ? 'fire'
  : division.startsWith('12') ? 'police' : division.startsWith('13') ? 'streets' : 'parks';
export const COST_CENTERS = Object.groupBy(catalogRows.map(row => {
  const serviceId = serviceFor(row.division);
  const name = names[row.name] || row.name;
  return {
    id: ids[row.name] || `${serviceId}-${name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`,
    name, serviceId, division: row.division, sourceCell: row.sourceCell,
    savings: Math.round(row.totalCostCenter * 100) / 100,
    impact: supplied[row.name] || drafts[row.name],
    descriptionStatus: supplied[row.name] ? 'supplied' : 'draft',
  };
}), item => item.serviceId);

const revenueIds = ['fire-fee', 'millage-rate', 'recreation-fees', 'facility-rentals', 'parking-tickets', 'planning-fees'];
const revenueNames = ['Establish Fire Fee', 'Increase Millage Rate', 'Increase Recreation Fees', 'Increase Facility Rentals', 'Increase Parking Tickets', 'Increase Planning Fees'];
export const POTENTIAL_REVENUES = source.revenues.map((row, i) => ({
  ...row, id: revenueIds[i], name: revenueNames[i],
  // User-supplied revision supersedes the workbook's $275,000 per 0.1 mill estimate.
  amount: i === 1 ? 2900000 : row.amount,
  assumption: i === 1 ? 'Assumes $290,000 per 0.1 mill, up to a 1 mill increase.'
    : i === 5 ? 'Assumes a 100% increase in planning fees.' : row.assumption,
}));

export const costCenterTotal = serviceId => COST_CENTERS[serviceId]
  .reduce((sum, item) => sum + Math.round(item.savings * 100), 0) / 100;
