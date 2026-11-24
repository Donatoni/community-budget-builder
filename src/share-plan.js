import { SERVICES, PROPOSED_TOTAL, fmtM } from './budget.js';
import { ALL_COST_CENTERS, POTENTIAL_REVENUES, COST_CENTER_VERSION, costCenterPlan } from './cost-centers.js';
import { HEADLINES, THEMES } from './postcard.js';

export function readSharedPlan(input) {
  const url = input instanceof URL ? input : new URL(input);
  let values;
  let cuts;
  let revenues;
  let millageRate;
  if (url.searchParams.has('cuts')) {
    if (url.searchParams.get('catalog') !== COST_CENTER_VERSION) return null;
    const rawCuts = url.searchParams.get('cuts');
    if (rawCuts.length > 3000) return null;
    cuts = rawCuts ? rawCuts.split(',') : [];
    const known = new Set(ALL_COST_CENTERS.map(item => item.id));
    if (new Set(cuts).size !== cuts.length || cuts.some(id => !known.has(id))) return null;
    // The item catalog, not a caller-provided budget total, defines the plan.
    const rawRevenue = url.searchParams.get('revenues') || '';
    if (rawRevenue.length > 1000) return null;
    revenues = rawRevenue ? rawRevenue.split(',') : [];
    if (new Set(revenues).size !== revenues.length || revenues.some(id => !POTENTIAL_REVENUES.some(item => item.id === id))) return null;
    const rawMillage = url.searchParams.get('millage');
    if (rawMillage !== null && !/^(?:0(?:\.[0-9])?|1(?:\.0)?)$/.test(rawMillage)) return null;
    let plan;
    try { plan = costCenterPlan(cuts, revenues, rawMillage === null ? undefined : Number(rawMillage)); }
    catch { return null; }
    millageRate = plan.millageRate;
    revenues = plan.revenues.map(item => item.id);
    values = plan.values;
    cuts = plan.items.map(item => item.id);
  } else {
    if (url.searchParams.has('revenues') || url.searchParams.has('millage')) return null;
    const raw = url.searchParams.get('b');
    if (!raw || raw.length > 60) return null;
    const parts = raw.split('_');
    if (parts.length !== SERVICES.length || parts.some(p => !/^\d{1,2}(?:\.\d)?$/.test(p))) return null;
    values = parts.map(Number);
    if (values.some((v, i) => v > SERVICES[i].max)) return null;
  }
  const theme = url.searchParams.get('theme') || 'daylight';
  const headline = url.searchParams.get('h') || '0';
  const side = url.searchParams.get('side') || 'front';
  if (!Object.hasOwn(THEMES, theme) || !/^[0-2]$/.test(headline) || !['front', 'back'].includes(side)) return null;
  return { values, theme, headline: Number(headline), side, ...(cuts ? { cuts, revenues, millageRate } : {}) };
}

export function resultURL(origin, values, options = {}, image = false) {
  const url = new URL(image ? '/share/image.png' : '/share/', origin);
  url.searchParams.set('v', '8');
  if (options.cuts) {
    const known = new Set(ALL_COST_CENTERS.map(item => item.id));
    if (options.cuts.some(id => !known.has(id))) throw new Error('Unknown service cut');
    const revenues = options.revenues || [];
    if (revenues.some(id => !POTENTIAL_REVENUES.some(item => item.id === id))) throw new Error('Unknown potential revenue');
    const plan = costCenterPlan(options.cuts, revenues, options.millageRate);
    url.searchParams.set('millage', String(plan.millageRate));
    url.searchParams.set('revenues', plan.revenues.map(item => item.id).join(','));
    url.searchParams.set('catalog', COST_CENTER_VERSION);
    url.searchParams.set('cuts', plan.items.map(item => item.id).join(','));
  } else {
    url.searchParams.set('b', values.map(value => value.toFixed(1)).join('_'));
  }
  url.searchParams.set('theme', options.theme || 'daylight');
  url.searchParams.set('h', String(options.headline || 0));
  url.searchParams.set('side', options.side || 'front');
  if (!image) url.hash = 'builder';
  return url.toString();
}

export function resultDescription(plan) {
  const total = plan.values.reduce((sum, value) => sum + value, 0);
  const revenue = costCenterPlan([], plan.revenues || [], plan.millageRate).revenue / 1e6;
  const delta = PROPOSED_TOTAL - total + revenue;
  return {
    title: `${HEADLINES[plan.headline].join(' ')} My ${fmtM(total)} DeLand budget`,
    description: `${fmtM(total)} across five departments · ${fmtM(revenue)} potential revenue · ${fmtM(Math.abs(delta))} ${delta >= 0 ? 'gap closed' : 'gap increase'}. Explore my choices and build your own DeLand budget.`,
    total, delta, revenue,
  };
}
