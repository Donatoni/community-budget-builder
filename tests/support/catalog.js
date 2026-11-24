// Shared helpers that read the configured catalog, so tests follow whatever
// data a city loads instead of the worked example's figures. Arithmetic is done in
// whole cents, independently of the plan code under test.
import { REDUCTION_TARGET_M } from '../../src/budget.js';
import { ALL_COST_CENTERS, POTENTIAL_REVENUES } from '../../src/cost-centers.js';

export const cents = dollars => Math.round(dollars * 100);
export const sumCents = amounts => amounts.reduce((sum, amount) => sum + cents(amount), 0);

// REDUCTION_TARGET_M is in millions of dollars.
export const TARGET_CENTS = Math.round(REDUCTION_TARGET_M * 1e6 * 100);

export const MILLAGE = POTENTIAL_REVENUES.find(item => item.id === 'millage-rate');
export const CHECKBOX_REVENUES = POTENTIAL_REVENUES.filter(item => item.id !== 'millage-rate');
export const noMillage = MILLAGE ? false : 'this catalog has no millage-rate option';
export const noRevenues = POTENTIAL_REVENUES.length ? false : 'this catalog has no potential revenue options';

// Revenue in cents for the chosen ids; the millage option scales by tenths of a mill.
export function revenueCents(ids, millageTenths = 10) {
  const chosen = new Set(ids);
  return POTENTIAL_REVENUES.filter(item => chosen.has(item.id)).reduce((sum, item) => sum + (item.id === 'millage-rate'
    ? Math.round(cents(item.amount) * millageTenths / 10)
    : cents(item.amount)), 0);
}

// Choices with a positive net cost, largest first.
export const LARGEST_FIRST = ALL_COST_CENTERS.filter(item => item.savings > 0)
  .sort((a, b) => b.savings - a.savings || a.id.localeCompare(b.id));

// The fewest largest cuts that, with `alreadyCents` of revenue, reach the target.
// Dropping the last id returned always falls short.
export function cutsReaching(alreadyCents = 0) {
  const ids = [];
  let total = alreadyCents;
  for (const item of LARGEST_FIRST) {
    if (total >= TARGET_CENTS) break;
    ids.push(item.id);
    total += cents(item.savings);
  }
  if (total < TARGET_CENTS) throw new Error('Cutting every choice does not reach REDUCTION_TARGET_M.');
  return ids;
}

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const usd = amount => dollars.format(amount);

export const escapeXML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

// Small deterministic generator, so randomized checks are repeatable.
export function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
