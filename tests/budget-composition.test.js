import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetComposition, SERVICE_COLORS } from '../src/budget-composition.js';
import { SERVICES, PROPOSED_TOTAL, fmtM } from '../src/budget.js';

const proposed = SERVICES.map(service => service.proposed);
const totalPercent = result => result.percentages.reduce((sum, percentage) => sum + percentage, 0);

test('budget visualization preserves reductions as empty space instead of reallocating them', () => {
  const unchanged = budgetComposition(proposed);
  assert.ok(Math.abs(totalPercent(unchanged) - 100) < 1e-9);
  unchanged.percentages.forEach((percentage, i) => assert.ok(Math.abs(percentage - proposed[i] / PROPOSED_TOTAL * 100) < 1e-9));
  const halved = proposed.map(value => value / 2);
  const reduced = budgetComposition(halved);
  assert.ok(Math.abs(totalPercent(reduced) - 50) < 1e-9);
  assert.ok(Math.abs(reduced.total - PROPOSED_TOTAL / 2) < 1e-9);
  SERVICES.forEach((service, i) => assert.ok(reduced.description.includes(`${service.name}: ${fmtM(halved[i])}`), service.name));
  assert.ok(reduced.description.includes(`${fmtM(PROPOSED_TOTAL - reduced.total)} reduced`));
});

test('budget visualization fits added spending and handles a completely unfunded plan', () => {
  const expanded = budgetComposition(proposed.map(value => value * 1.5));
  assert.ok(Math.abs(totalPercent(expanded) - 100) < 1e-9);
  assert.ok(expanded.total > PROPOSED_TOTAL);
  const empty = budgetComposition(SERVICES.map(() => 0));
  assert.equal(empty.total, 0);
  assert.equal(totalPercent(empty), 0);
  assert.ok(empty.description.includes(`${fmtM(PROPOSED_TOTAL)} reduced`));
});

test('every department has its own chart color', () => {
  assert.ok(SERVICE_COLORS.length >= SERVICES.length, `add colors to SERVICE_COLORS for ${SERVICES.length} departments`);
  assert.equal(new Set(SERVICE_COLORS.slice(0, SERVICES.length)).size, SERVICES.length);
});
