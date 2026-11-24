import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceImpact, SERVICES, PROPOSED_TOTAL } from '../src/budget.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} ≠ ${expected}`);

test('the baseline is the sum of every department', () => {
  near(PROPOSED_TOTAL, 41.98788216);
  near(SERVICES.reduce((sum, service) => sum + service.proposed, 0), PROPOSED_TOTAL);
});

test('service effects escalate at exact cut boundaries for every department', () => {
  for (const service of SERVICES) {
    for (const [percent, level] of [[10, 0], [17, 0], [17.01, 1], [33.5, 1], [33.51, 2], [50, 2], [50.01, 3], [85, 3]]) {
      const effect = serviceImpact(service, service.proposed * (1 - percent / 100));
      assert.equal(effect.level, level, `${service.id} at ${percent}%`);
      assert.equal(effect.text, service.cutExamples[level]);
      near(effect.cutPercent, percent);
    }
    assert.equal(new Set(service.cutExamples).size, 4);
    assert.match(serviceImpact(service, 0).text, /No funding remains/);
    assert.equal(serviceImpact(service, 0).cutPercent, 100);
    assert.equal(serviceImpact(service, service.proposed), null);
    assert.equal(serviceImpact(service, service.max), null);
    assert.equal(serviceImpact(service, NaN), null);
  }
});
