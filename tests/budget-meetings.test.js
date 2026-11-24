import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MEETING_PORTAL, BUDGET_MEETING_START, meetingsQuery, matchMeeting, meetingLinks, meetingStates } from '../src/budget-meetings.js';

const filterOf = dates => new URL(meetingsQuery(dates)).searchParams.get('$filter');
// The category the portal is asked for; the matcher must accept the same one.
const CATEGORY = /^categoryName eq '([^']+)' and /.exec(filterOf(['2027-01-11']))?.[1];
const START_HOUR = Number(/^T(\d{2})/.exec(BUDGET_MEETING_START)?.[1]);
const at = (date, hour, minute = 0) => `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
const atStart = date => `${date}${BUDGET_MEETING_START}${BUDGET_MEETING_START.length === 6 ? ':00Z' : 'Z'}`;
const event = (id, startDateTime, extra = {}) => ({
  id, startDateTime, categoryName: CATEGORY, eventName: `${CATEGORY} Special Meeting`,
  hasMedia: false, publishedFiles: [], ...extra,
});

test('the portal query asks for one meeting category on exactly the scheduled local dates', () => {
  assert.ok(CATEGORY && CATEGORY.trim(), 'meetingsQuery must filter on a category');
  const url = new URL(meetingsQuery(['2027-01-31', '2027-12-31']));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.searchParams.get('$orderby'), 'startDateTime asc');
  assert.equal(url.searchParams.get('$filter'), `categoryName eq '${CATEGORY}' and ((startDateTime ge 2027-01-31T00:00:00Z and startDateTime lt 2027-02-01T00:00:00Z) or (startDateTime ge 2027-12-31T00:00:00Z and startDateTime lt 2028-01-01T00:00:00Z))`);
  assert.equal(filterOf(['2028-02-28']), `categoryName eq '${CATEGORY}' and ((startDateTime ge 2028-02-28T00:00:00Z and startDateTime lt 2028-02-29T00:00:00Z))`);
});

test('a scheduled date matches one meeting of that category and never a test event or another board', () => {
  assert.ok(BUDGET_MEETING_START.startsWith('T') && Number.isInteger(START_HOUR), 'BUDGET_MEETING_START looks like T18:00');
  const budget = event(1001, atStart('2027-01-11'));
  const events = [
    event(1002, at('2027-01-11', (START_HOUR + 23) % 24, 30), { eventName: `${CATEGORY} Meeting TEST` }),
    event(1003, atStart('2027-01-11'), { categoryName: `Not ${CATEGORY}` }),
    event(1004, atStart('2027-01-12')),
    event('1005', atStart('2027-01-11')),
    budget,
  ];
  assert.equal(matchMeeting(events, '2027-01-11'), budget);
  assert.equal(matchMeeting([{ ...budget, categoryName: ` ${CATEGORY} ` }], '2027-01-11').id, budget.id);
  assert.equal(matchMeeting(events, '2027-02-08'), null);
  assert.equal(matchMeeting(undefined, '2027-01-11'), null);
});

test('the meeting at the usual start time wins on a shared day, and an unclear day links nothing', () => {
  const usual = event(1, atStart('2027-03-22'));
  const later = event(2, at('2027-03-22', (START_HOUR + 1) % 24), { eventName: `${CATEGORY} Regular Meeting` });
  const earlier = event(3, at('2027-03-22', (START_HOUR + 23) % 24));
  assert.equal(matchMeeting([later, usual], '2027-03-22'), usual);
  assert.equal(matchMeeting([later, earlier], '2027-03-22'), null);
  assert.equal(matchMeeting([later, usual, event(4, atStart('2027-03-22'))], '2027-03-22'), null);
  assert.equal(matchMeeting([later], '2027-03-22'), later);
});

test('links follow what the Clerk has posted', () => {
  const base = `${MEETING_PORTAL}/event/909`;
  assert.ok(new URL(MEETING_PORTAL).protocol === 'https:' && !MEETING_PORTAL.endsWith('/'));
  assert.deepEqual(meetingLinks(null), []);
  assert.deepEqual(meetingLinks(event('909; drop', atStart('2026-11-09'))), []);
  assert.deepEqual(meetingLinks(event(909, atStart('2026-11-09'))), [{ label: 'Meeting details', href: `${base}/overview` }]);
  assert.deepEqual(meetingLinks(event(909, atStart('2026-11-09'), { publishedFiles: [{ type: 'Agenda' }] })), [{ label: 'Agenda', href: `${base}/files` }]);
  assert.deepEqual(meetingLinks(event(909, atStart('2026-11-09'), { publishedFiles: [{ type: 'Agenda' }], hasMedia: true })), [
    { label: 'Agenda', href: `${base}/files` },
    { label: 'Watch recording', href: `${base}/media` },
  ]);
});

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scheduled = [...html.matchAll(/data-meeting-date="([^"]+)"/g)].map(match => match[1]);

test('the page schedule lists real dates in order, each with a matching time element', { skip: scheduled.length ? false : 'the page has no meeting schedule' }, () => {
  assert.deepEqual([...scheduled].sort(), scheduled, 'meetings must be listed in date order');
  assert.equal(new Set(scheduled).size, scheduled.length);
  for (const date of scheduled) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10), date, `${date} is not a calendar date`);
    assert.ok(html.includes(`datetime="${date}"`), `${date} needs a <time datetime>`);
  }
});

test('only the first meeting on or after today is marked next', () => {
  const dates = ['2027-01-11', '2027-02-08', '2027-03-22'];
  assert.deepEqual(meetingStates(dates, '2026-11-24'), ['next', 'upcoming', 'upcoming']);
  assert.deepEqual(meetingStates(dates, '2027-02-08'), ['past', 'next', 'upcoming']);
  assert.deepEqual(meetingStates(dates, '2027-06-01'), ['past', 'past', 'past']);
});
