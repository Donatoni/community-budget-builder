import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import source from '../src/cost-center-source.js';
import { SERVICE_VIDEOS } from '../src/service-videos-data.js';
import { SERVICES, PROPOSED_TOTAL, fmtM } from '../src/budget.js';
import { ALL_COST_CENTERS, COST_CENTERS, COST_CENTER_VERSION, POTENTIAL_REVENUES, costCenterPlan } from '../src/cost-centers.js';
import { initCostCenterBuilder, initRevenueBuilder } from '../src/cost-center-builder.js';
import { readSharedPlan, resultURL } from '../src/share-plan.js';
import { HEADLINES, THEMES } from '../src/postcard.js';
import { onRequest as homepage } from '../functions/index.js';
import { resultImageSVG } from '../server/result-image.js';
import {
  cents, sumCents, TARGET_CENTS, MILLAGE, CHECKBOX_REVENUES, noMillage, noRevenues,
  revenueCents, cutsReaching, LARGEST_FIRST, usd, escapeXML, seededRandom,
} from './support/catalog.js';

const origin = 'https://budget.example.gov';
const allIds = ALL_COST_CENTERS.map(item => item.id);
const serviceCents = SERVICES.map(service => Math.round(service.proposed * 1e8));
const serviceIndex = id => SERVICES.findIndex(service => service.id === id);
// A department with at least two choices, for tests that combine cuts.
const pairService = SERVICES.find(service => COST_CENTERS[service.id].length >= 2) ?? SERVICES[0];
const [first, second = first] = COST_CENTERS[pairService.id];

function withDocument(html, run) {
  const { document, window } = parseHTML(html);
  const previous = globalThis.document;
  globalThis.document = document;
  try { return run(document, window); }
  finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
}
const toggle = (window, input, checked) => {
  input.checked = checked;
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
};

// Source rows are traced to choices by sourceCell, which merges join with ", ".
const rowsByCell = new Map(source.costCenters.map(row => [row.sourceCell, row]));
const traceable = rowsByCell.size === source.costCenters.length
  && source.costCenters.every(row => typeof row.sourceCell === 'string' && row.sourceCell.trim());

test('every source row is counted in at most one choice, and merged choices add their parts in cents', { skip: traceable ? false : 'source rows need unique sourceCell values to trace choices to them' }, () => {
  const used = new Set();
  for (const item of ALL_COST_CENTERS) {
    const cells = item.sourceCell.split(', ');
    for (const cell of cells) {
      assert.ok(rowsByCell.has(cell), `${item.id} cites unknown source ${cell}`);
      assert.ok(!used.has(cell), `${cell} is counted in more than one choice`);
      used.add(cell);
    }
    assert.equal(cents(item.savings), sumCents(cells.map(cell => rowsByCell.get(cell).totalCostCenter)), `${item.id} must equal its source rows`);
  }
  // Rows not cited by any choice are the exercise's exclusions; the baseline leaves them out.
  const included = source.costCenters.filter(row => used.has(row.sourceCell));
  assert.ok(included.length > 0);
  assert.equal(Math.round(PROPOSED_TOTAL * 1e8), sumCents(included.map(row => row.totalCostCenter)));
});

test('choices have unique URL-safe ids, descriptions, and department totals that reconcile in cents', () => {
  assert.equal(new Set(allIds).size, allIds.length);
  // Every grouped choice belongs to a listed department, so none silently disappear.
  assert.deepEqual(Object.keys(COST_CENTERS).sort(), SERVICES.map(service => service.id).sort());
  let totalCents = 0;
  for (const [i, service] of SERVICES.entries()) {
    const items = COST_CENTERS[service.id];
    assert.ok(items.length > 0, `${service.id} needs at least one choice`);
    for (const item of items) {
      assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${item.id} must be safe in links and HTML ids`);
      assert.equal(item.serviceId, service.id);
      assert.ok(Number.isFinite(item.savings), item.id);
      assert.ok(Math.abs(item.savings * 100 - cents(item.savings)) < 1e-6, `${item.id} is rounded to cents`);
      assert.ok(typeof item.name === 'string' && item.name.trim(), `${item.id} needs a name`);
      assert.ok(typeof item.impact === 'string' && item.impact.trim(), `${item.id} needs a supplied or draft description`);
      assert.ok(['supplied', 'draft'].includes(item.descriptionStatus));
    }
    assert.equal(serviceCents[i], sumCents(items.map(item => item.savings)), service.id);
    totalCents += serviceCents[i];
  }
  assert.equal(Math.round(PROPOSED_TOTAL * 1e8), totalCents);
  assert.equal(ALL_COST_CENTERS.length, SERVICES.reduce((count, service) => count + COST_CENTERS[service.id].length, 0));
});

test('cuts subtract only the chosen costs, deduplicate, ignore unknown ids, and restore to the baseline', () => {
  const baseline = costCenterPlan([]);
  assert.deepEqual(baseline.values, SERVICES.map(service => service.proposed));
  assert.equal(baseline.reduction, 0);
  assert.equal(baseline.items.length, 0);
  const chosen = [...new Set([first, second])];
  const plan = costCenterPlan([first.id, second.id, second.id, 'not-a-choice']);
  const removed = sumCents(chosen.map(item => item.savings));
  assert.deepEqual(plan.items.map(item => item.id), chosen.map(item => item.id));
  assert.equal(plan.reduction, removed / 100);
  const index = serviceIndex(pairService.id);
  plan.values.forEach((value, i) => assert.equal(value, (serviceCents[i] - (i === index ? removed : 0)) / 1e8, SERVICES[i].id));
  assert.equal(costCenterPlan([first.id]).values[index], (serviceCents[index] - cents(first.savings)) / 1e8);
});

test('cutting every choice empties every department and reconciles with the baseline', () => {
  const all = costCenterPlan(allIds);
  assert.ok(all.values.every(value => value === 0));
  assert.equal(all.reduction, sumCents(ALL_COST_CENTERS.map(item => item.savings)) / 100);
  assert.equal(all.reduction, Math.round(PROPOSED_TOTAL * 1e8) / 100);
  assert.ok(all.targetMet, 'cutting every choice must close the gap');
  const random = seededRandom(7);
  for (let round = 0; round < 300; round++) {
    const ids = allIds.filter(() => random() < 0.3);
    const plan = costCenterPlan(ids);
    const chosen = ALL_COST_CENTERS.filter(item => ids.includes(item.id));
    const removed = sumCents(chosen.map(item => item.savings));
    assert.equal(plan.reduction, removed / 100);
    SERVICES.forEach((service, i) => assert.equal(plan.values[i], (serviceCents[i] - sumCents(chosen.filter(item => item.serviceId === service.id).map(item => item.savings))) / 1e8, `${service.id} after ${ids.join(',')}`));
    assert.equal(Math.round(plan.values.reduce((sum, value) => sum + value, 0) * 1e8), Math.round(PROPOSED_TOTAL * 1e8) - removed);
  }
});

test('the gap target compares exact cents of cuts plus revenue, below and above the line', () => {
  const ids = cutsReaching();
  const enough = costCenterPlan(ids);
  assert.ok(enough.targetMet);
  assert.ok(cents(enough.gapClosed) >= TARGET_CENTS);
  const short = costCenterPlan(ids.slice(0, -1));
  assert.equal(short.targetMet, false);
  assert.ok(cents(short.gapClosed) < TARGET_CENTS);
  // Plans one choice away from the line, on either side.
  for (const item of ALL_COST_CENTERS.filter(candidate => !ids.slice(0, -1).includes(candidate.id))) {
    const near = [...ids.slice(0, -1), item.id];
    assert.equal(costCenterPlan(near).targetMet, cents(short.gapClosed) + cents(item.savings) >= TARGET_CENTS, near.join(','));
  }
  const random = seededRandom(11);
  const revenueIds = CHECKBOX_REVENUES.map(item => item.id);
  for (let round = 0; round < 200; round++) {
    const cuts = LARGEST_FIRST.filter(() => random() < 0.25).map(item => item.id);
    const revenues = revenueIds.filter(() => random() < 0.5);
    const tenths = MILLAGE ? Math.floor(random() * 11) : 0;
    if (tenths) revenues.push(MILLAGE.id);
    const plan = costCenterPlan(cuts, revenues, MILLAGE ? tenths / 10 : undefined);
    const reduction = sumCents(ALL_COST_CENTERS.filter(item => cuts.includes(item.id)).map(item => item.savings));
    const revenue = revenueCents(revenues, tenths);
    assert.equal(plan.reduction, reduction / 100);
    assert.equal(plan.revenue, revenue / 100);
    assert.equal(plan.gapClosed, (reduction + revenue) / 100);
    assert.equal(plan.targetMet, reduction + revenue >= TARGET_CENTS, `${cuts.join(',')} + ${revenues.join(',')}`);
  }
});

test('potential revenues close the gap without cutting department funding', { skip: noRevenues }, () => {
  const ids = POTENTIAL_REVENUES.map(item => item.id);
  const expected = revenueCents(ids);
  const plan = costCenterPlan([], [...ids, ids[0]]);
  assert.equal(plan.revenue, expected / 100);
  assert.equal(plan.reduction, 0);
  assert.equal(plan.gapClosed, expected / 100);
  assert.equal(plan.targetMet, expected >= TARGET_CENTS);
  assert.deepEqual(plan.values, SERVICES.map(service => service.proposed));
  assert.deepEqual(plan.revenues.map(item => item.id), ids);
  for (const item of POTENTIAL_REVENUES) {
    const single = costCenterPlan([], [item.id]);
    assert.equal(single.revenue, revenueCents([item.id]) / 100, item.id);
    assert.equal(single.targetMet, revenueCents([item.id]) >= TARGET_CENTS, item.id);
  }
  const url = new URL(resultURL(origin, plan.values, { cuts: [], revenues: ids }));
  assert.deepEqual(readSharedPlan(url).revenues, ids);
  assert.ok(resultImageSVG({ ...readSharedPlan(url), side: 'back' }, {}).includes(`Potential revenue: ${escapeXML(fmtM(expected / 1e8))}`));
  for (const invalid of ['unknown', `${ids[0]},${ids[0]}`, `${ids[0]},`]) {
    url.searchParams.set('revenues', invalid);
    assert.equal(readSharedPlan(url), null, invalid);
  }
  assert.throws(() => resultURL(origin, plan.values, { cuts: [], revenues: ['unknown'] }));
});

test('share links require the current catalog and preserve exact choices, including different cuts with equal costs', () => {
  const theme = Object.keys(THEMES).at(-1);
  const headline = HEADLINES.length - 1;
  for (const cuts of [[], cutsReaching(), [...allIds].reverse()]) {
    const plan = costCenterPlan(cuts);
    for (const image of [false, true]) {
      const url = resultURL(origin, plan.values, { cuts, theme, headline, side: 'back' }, image);
      assert.equal(new URL(url).searchParams.get('catalog'), COST_CENTER_VERSION);
      const parsed = readSharedPlan(url);
      assert.deepEqual(parsed.cuts, plan.items.map(item => item.id));
      assert.deepEqual(parsed.values, plan.values);
      assert.equal(parsed.theme, theme);
      assert.equal(parsed.headline, headline);
      assert.equal(parsed.side, 'back');
    }
  }
  const index = serviceIndex(first.serviceId);
  const values = costCenterPlan([first.id]).values;
  const url = new URL(resultURL(origin, values, { cuts: [first.id] }));
  // The catalog, not a budget in the link, defines a cost-center plan.
  url.searchParams.set('b', SERVICES.map(() => '0').join('_'));
  assert.equal(readSharedPlan(url).values[index], (serviceCents[index] - cents(first.savings)) / 1e8);
  for (const cuts of ['unknown', `${first.id},${first.id}`, `${first.id},`]) {
    url.searchParams.set('cuts', cuts);
    assert.equal(readSharedPlan(url), null, cuts);
  }
  url.searchParams.set('cuts', first.id);
  for (const catalog of [`${COST_CENTER_VERSION}-old`, 'obsolete', '']) {
    url.searchParams.set('catalog', catalog);
    assert.equal(readSharedPlan(url), null, catalog);
  }
  url.searchParams.delete('catalog');
  assert.equal(readSharedPlan(url), null);
  assert.throws(() => resultURL(origin, values, { cuts: ['not-a-choice'] }));
});

test('homepage redirects and server previews preserve the cost-center plan and precise savings', async () => {
  const item = LARGEST_FIRST[0];
  const index = serviceIndex(item.serviceId);
  const plan = costCenterPlan([item.id]);
  const url = new URL(resultURL(origin, plan.values, { cuts: [item.id], side: 'back' }));
  url.pathname = '/';
  const response = await homepage({ request: new Request(url) });
  assert.equal(response.status, 302);
  assert.deepEqual(readSharedPlan(response.headers.get('Location')).cuts, [item.id]);
  const svg = resultImageSVG(readSharedPlan(url), {});
  assert.ok(svg.includes(`${escapeXML(fmtM(item.savings / 1e6))} deducted`));
  assert.ok(svg.includes(escapeXML(fmtM((serviceCents[index] - cents(item.savings)) / 1e8))));
});

test('checkbox interactions and restore keep rendered totals and service choices in sync', () => {
  withDocument('<div id="centers"></div>', (document, window) => {
    const container = document.querySelector('#centers');
    const selected = new Set([first.id]);
    const render = initCostCenterBuilder(container, selected, () => render());
    render();
    const amount = id => container.querySelector(`#amt-${id}`).textContent;
    const delta = id => container.querySelector(`#delta-${id}`).textContent;
    assert.equal(container.querySelectorAll('input[type="range"]').length, 0);
    assert.equal(container.querySelectorAll('input[type="checkbox"]').length, ALL_COST_CENTERS.length);
    assert.equal(container.querySelectorAll('.description-draft').length, ALL_COST_CENTERS.filter(item => item.descriptionStatus === 'draft').length);
    for (const [i, service] of SERVICES.entries()) {
      assert.equal(container.querySelectorAll(`.svc-${service.id} input`).length, COST_CENTERS[service.id].length);
      const preselected = service.id === first.serviceId ? cents(first.savings) : 0;
      const item = COST_CENTERS[service.id].find(candidate => candidate.id !== first.id);
      if (!item) continue;
      assert.equal(container.querySelector(`#price-${item.id} strong`).textContent, usd(item.savings));
      assert.ok(container.querySelector(`#effect-${item.id}`).textContent.startsWith(item.impact.trim().slice(0, 40)));
      const input = container.querySelector(`#cut-${item.id}`);
      toggle(window, input, true);
      assert.equal(amount(service.id), usd((serviceCents[i] - preselected - cents(item.savings)) / 100));
      assert.equal(delta(service.id), usd((preselected + cents(item.savings)) / 100));
      assert.equal(input.closest('label').querySelector('.cost-choice-state').textContent, 'Cut selected');
      toggle(window, input, false);
      assert.equal(amount(service.id), usd((serviceCents[i] - preselected) / 100));
      assert.equal(input.closest('label').querySelector('.cost-choice-state').textContent, 'Select to cut');
    }
    selected.clear();
    render();
    SERVICES.forEach((service, i) => assert.equal(amount(service.id), usd(serviceCents[i] / 100)));
    assert.ok([...container.querySelectorAll('input')].every(input => !input.checked));
  });
});

test('revenue checkboxes add, remove, and reset choices', { skip: CHECKBOX_REVENUES.length ? false : 'this catalog has no checkbox revenue options' }, () => {
  withDocument('<div id="revenues"></div>', (document, window) => {
    const container = document.querySelector('#revenues');
    const selected = new Set();
    const render = initRevenueBuilder(container, selected, () => render());
    render();
    assert.equal(container.querySelectorAll('input[type="checkbox"]').length, CHECKBOX_REVENUES.length);
    assert.equal(container.querySelectorAll('input[type="range"]').length, MILLAGE ? 1 : 0);
    for (const option of CHECKBOX_REVENUES) {
      assert.equal(container.querySelector(`#revenue-price-${option.id} strong`).textContent, `+${usd(option.amount)}`);
      const input = container.querySelector(`#revenue-${option.id}`);
      toggle(window, input, true);
      assert.equal(costCenterPlan([], selected).revenue, cents(option.amount) / 100);
      assert.equal(input.closest('label').querySelector('.cost-choice-state').textContent, 'Revenue added');
      toggle(window, input, false);
      assert.equal(costCenterPlan([], selected).revenue, 0);
    }
    for (const option of CHECKBOX_REVENUES) selected.add(option.id);
    if (MILLAGE) selected.add(MILLAGE.id);
    render();
    assert.ok([...container.querySelectorAll('input[type="checkbox"]')].every(input => input.checked));
    selected.clear();
    render();
    assert.ok([...container.querySelectorAll('input[type="checkbox"]')].every(input => !input.checked));
  });
});

test('millage slider updates precise revenue, restores shared rates, and resets to zero', { skip: noMillage }, () => {
  withDocument('<div id="revenues"></div>', (document, window) => {
    const container = document.querySelector('#revenues');
    const selected = new Set([MILLAGE.id]);
    const adjustment = { millageRate: 0.4 };
    const render = initRevenueBuilder(container, selected, () => render(), adjustment);
    render();
    const slider = container.querySelector('#revenue-millage-rate');
    const shown = tenths => `+${usd(Math.round(cents(MILLAGE.amount) * tenths / 10) / 100)}`;
    const slide = value => { slider.value = value; slider.dispatchEvent(new window.Event('input', { bubbles: true })); };
    assert.equal(slider.type, 'range');
    assert.equal(slider.value, '0.4');
    assert.equal(container.querySelectorAll('input[type="checkbox"]').length, CHECKBOX_REVENUES.length);
    assert.ok(container.querySelector('#revenue-effect-millage-rate').textContent.includes(`Each 0.1 mill adds an estimated ${usd(MILLAGE.amount / 10)} annually`));
    assert.equal(container.querySelector('#millage-revenue-amount').textContent, shown(4));
    for (const tenths of [5, 1, 10]) {
      slide(String(tenths / 10));
      assert.equal(costCenterPlan([], selected, adjustment.millageRate).revenue, revenueCents([MILLAGE.id], tenths) / 100);
      assert.equal(container.querySelector('#millage-revenue-amount').textContent, shown(tenths));
      assert.ok(slider.getAttribute('aria-valuetext').startsWith(`${(tenths / 10).toFixed(1)} ${tenths === 10 ? 'mill' : 'mills'} increase, ${usd(revenueCents([MILLAGE.id], tenths) / 100)}`));
    }
    slide('0');
    assert.equal(selected.has(MILLAGE.id), false);
    assert.equal(costCenterPlan([], selected, adjustment.millageRate).revenue, 0);
    selected.clear(); adjustment.millageRate = 0; render();
    assert.equal(slider.value, '0');
  });
});

test('partial millage survives shared links and social images with validated bounds', { skip: noMillage }, () => {
  const options = { cuts: [], revenues: [MILLAGE.id], millageRate: 0.5, side: 'back' };
  const plan = costCenterPlan([], options.revenues, options.millageRate);
  const url = new URL(resultURL(origin, plan.values, options));
  const parsed = readSharedPlan(url);
  assert.equal(parsed.millageRate, 0.5);
  assert.ok(resultImageSVG(parsed, {}).includes(`Potential revenue: ${escapeXML(fmtM(revenueCents([MILLAGE.id], 5) / 1e8))}`));
  assert.notEqual(resultURL(origin, plan.values, options, true), resultURL(origin, plan.values, { ...options, millageRate: 1 }, true));
  // Only canonical tenths are accepted, so each plan has one link and one cached image.
  for (const invalid of ['-0.1', '1.1', '2', '0.15', 'NaN', '', '0', '01', '1.0.0', '0.50', ' 0.5', '5e-1', '.5', '+0.5', '0x1']) {
    url.searchParams.set('millage', invalid);
    assert.equal(readSharedPlan(url), null, invalid);
  }
  url.searchParams.set('millage', '0.5');
  url.searchParams.set('revenues', '');
  assert.equal(readSharedPlan(url), null);
  for (const millageRate of [0.15, -0.1, 1.1, 0]) assert.throws(() => resultURL(origin, plan.values, { ...options, millageRate }), String(millageRate));
});

test('department videos only initialize for departments present in the page', () => {
  const { document } = parseHTML(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
  for (const id of Object.keys(SERVICE_VIDEOS)) assert.ok(document.querySelector(`#tour-${id}`), `index.html needs #tour-${id}`);
});
