import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceImpact, SERVICES, PROPOSED_TOTAL, fmtM, fmtUSD } from '../src/budget.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} is not ${expected}`);

test('the baseline is the sum of every department in whole cents', () => {
  assert.ok(SERVICES.length > 0);
  assert.equal(new Set(SERVICES.map(service => service.id)).size, SERVICES.length);
  let totalCents = 0;
  for (const service of SERVICES) {
    assert.ok(Number.isFinite(service.proposed) && service.proposed > 0, `${service.id} needs a positive net cost`);
    const serviceCents = Math.round(service.proposed * 1e8);
    near(serviceCents, service.proposed * 1e8);
    totalCents += serviceCents;
  }
  assert.equal(Math.round(PROPOSED_TOTAL * 1e8), totalCents);
  assert.equal(PROPOSED_TOTAL, totalCents / 1e8);
});

test('service effects escalate at exact cut boundaries for every department', () => {
  for (const service of SERVICES) {
    assert.equal(service.cutExamples.length, 4, `${service.id} needs four cutExamples`);
    assert.ok(service.cutExamples.every(text => typeof text === 'string' && text.trim()));
    for (const [percent, level] of [[10, 0], [17, 0], [17.01, 1], [33.5, 1], [33.51, 2], [50, 2], [50.01, 3], [85, 3]]) {
      const funding = service.proposed * (1 - percent / 100);
      const effect = serviceImpact(service, funding);
      // Reductions under $50,000 are treated as no change.
      if (service.proposed - funding < 0.05) {
        assert.equal(effect, null, `${service.id} at ${percent}%`);
        continue;
      }
      assert.equal(effect.level, level, `${service.id} at ${percent}%`);
      assert.equal(effect.text, service.cutExamples[level]);
      near(effect.cutPercent, percent);
    }
    assert.match(serviceImpact(service, 0).text, /No funding remains/);
    assert.equal(serviceImpact(service, 0).cutPercent, 100);
    assert.equal(serviceImpact(service, -1).cutPercent, 100);
    assert.equal(serviceImpact(service, service.proposed), null);
    assert.equal(serviceImpact(service, service.proposed + 1), null);
    assert.equal(serviceImpact(service, NaN), null);
  }
});

test('money formatting keeps small gaps visible and rounds whole dollars', () => {
  assert.equal(fmtM(1.234), '$1.23M');
  assert.equal(fmtM(2), '$2.0M');
  assert.equal(fmtM(-2.5), '-$2.5M');
  assert.equal(fmtM(0), '$0.0M');
  assert.equal(fmtM(0.004), '$4,000.00');
  assert.equal(fmtM(0.00000049), '$0.49');
  assert.equal(fmtM(1e-9), '$0.0M');
  assert.equal(fmtUSD(1234567.5), '$1,234,568');
  assert.equal(fmtUSD(-517755.17), '-$517,755');
});
