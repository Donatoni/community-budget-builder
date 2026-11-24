import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardDate, dashboardDay, dashboardTimestamp, shiftDay } from '../src/dashboard-time.js';
import { dateRange } from '../server/dashboard-api.js';
import { DASHBOARD_TIME_ZONE, localDay, localMidnight, nextDay, previousDay, offsetMinutes, offsetChangeDays, observesDST, zoneName } from './support/time-zone.js';

const HOUR = 3600000;
const range = day => dateRange(new URLSearchParams({ from: day, to: day }));

test(`reporting days follow ${DASHBOARD_TIME_ZONE} through a whole year`, () => {
  for (let instant = Date.UTC(2026, 0, 1); instant < Date.UTC(2027, 0, 1); instant += 5 * HOUR + 17 * 60000) {
    assert.equal(dashboardDay(new Date(instant).toISOString()), localDay(instant), new Date(instant).toISOString());
  }
});

test('a reporting day starts at local midnight and runs exactly until the next one', () => {
  // Includes the usual North American and European transition Sundays.
  for (const day of ['2026-01-15', '2026-02-28', '2026-03-08', '2026-03-29', '2026-04-30', '2026-07-15', '2026-09-01', '2026-10-25', '2026-11-01', '2026-12-31']) {
    const start = localMidnight(day);
    const end = localMidnight(nextDay(day));
    assert.equal(dashboardDay(new Date(start).toISOString()), day);
    assert.equal(dashboardDay(new Date(start - 1).toISOString()), previousDay(day));
    assert.equal(dashboardDay(new Date(end - 1).toISOString()), day);
    const { start: from, end: to } = range(day);
    assert.equal(Date.parse(from), start, `${day} start`);
    assert.equal(Date.parse(to), end, `${day} end`);
    // A day is 24 hours plus any change in the UTC offset across it.
    assert.equal(end - start, 24 * HOUR + (offsetMinutes(start) - offsetMinutes(end)) * 60000);
  }
});

test('admin timestamps show the local date, local clock time and the zone name', () => {
  for (const iso of ['2026-01-15T02:30:00Z', '2026-07-15T02:30:00Z', '2026-09-21T15:45:10Z']) {
    const instant = Date.parse(iso);
    const local = new Date(instant + offsetMinutes(instant) * 60000);
    const hour = local.getUTCHours() % 12 || 12;
    const clock = `${String(hour).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}:${String(local.getUTCSeconds()).padStart(2, '0')} ${local.getUTCHours() < 12 ? 'AM' : 'PM'}`;
    const text = dashboardTimestamp(iso);
    assert.ok(text.startsWith(`${dashboardDate(localDay(instant), { year: 'numeric' })}, `), text);
    assert.ok(text.includes(clock), `${text} should show ${clock}`);
    assert.ok(text.endsWith(zoneName(instant)), text);
  }
});

test('calendar labels and preset arithmetic do not shift to the previous date', () => {
  assert.equal(dashboardDate('2026-09-01', { year: 'numeric' }), 'Sep 1, 2026');
  assert.equal(dashboardDate('2026-01-01', { year: 'numeric' }), 'Jan 1, 2026');
  assert.equal(shiftDay('2026-03-09', -1), '2026-03-08');
  assert.equal(shiftDay('2026-11-02', -1), '2026-11-01');
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDay('2028-03-01', -1), '2028-02-29');
});

test('daylight saving transition days are one short and one long day, each fully covered', { skip: observesDST ? false : `${DASHBOARD_TIME_ZONE} does not observe daylight saving time` }, () => {
  const days = offsetChangeDays(2026);
  assert.equal(days.length, 2, `expected two offset changes in 2026, found ${days.join(', ')}`);
  const lengths = days.map(day => {
    const { start, end } = range(day);
    assert.equal(Date.parse(start), localMidnight(day), `${day} start`);
    assert.equal(Date.parse(end), localMidnight(nextDay(day)), `${day} end`);
    assert.equal(dashboardDay(new Date(Date.parse(end) - 1).toISOString()), day);
    assert.equal(dashboardDay(end), nextDay(day));
    assert.equal(shiftDay(nextDay(day), -1), day);
    return Date.parse(end) - Date.parse(start);
  });
  assert.ok(lengths.every(length => length !== 24 * HOUR), lengths.join(', '));
  assert.equal(lengths[0] + lengths[1], 48 * HOUR);
  assert.notEqual(zoneName(Date.UTC(2026, 0, 15, 12)), zoneName(Date.UTC(2026, 6, 15, 12)));
  assert.notEqual(dashboardTimestamp('2026-01-15T12:00:00Z').split(' ').at(-1), dashboardTimestamp('2026-07-15T12:00:00Z').split(' ').at(-1));
});
