import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MEETING_PORTAL, meetingsQuery, matchMeeting, meetingLinks, meetingStates } from '../src/budget-meetings.js';

const event = (id, startDateTime, extra = {}) => ({
  id, startDateTime, categoryName: 'City Commission', eventName: 'City Commission Special Meeting',
  hasMedia: false, publishedFiles: [], ...extra,
});

test('portal query asks only for City Commission events on the scheduled dates', () => {
  const filter = new URL(meetingsQuery(['2027-01-11', '2027-05-24'])).searchParams.get('$filter');
  assert.equal(filter, "categoryName eq 'City Commission' and ((startDateTime ge 2027-01-11T00:00:00Z and startDateTime lt 2027-01-12T00:00:00Z) or (startDateTime ge 2027-05-24T00:00:00Z and startDateTime lt 2027-05-25T00:00:00Z))");
});

test('a scheduled date matches one City Commission meeting and never a test event or another board', () => {
  const budget = event(1001, '2027-01-11T18:00:00Z');
  const events = [
    event(1002, '2027-01-11T16:30:00Z', { eventName: 'City Commission Meeting TEST' }),
    event(1003, '2027-01-11T18:00:00Z', { categoryName: 'Planning Board' }),
    event(1004, '2027-01-12T18:00:00Z'),
    budget,
  ];
  assert.equal(matchMeeting(events, '2027-01-11'), budget);
  assert.equal(matchMeeting(events, '2027-02-08'), null);
  assert.equal(matchMeeting(undefined, '2027-01-11'), null);
});

test('the 6 p.m. meeting wins on a shared day, and an unclear day links nothing', () => {
  const six = event(1, '2027-03-22T18:00:00Z');
  const seven = event(2, '2027-03-22T19:00:00Z', { eventName: 'City Commission Regular Meeting' });
  assert.equal(matchMeeting([seven, six], '2027-03-22'), six);
  assert.equal(matchMeeting([seven, event(3, '2027-03-22T17:00:00Z')], '2027-03-22'), null);
  assert.equal(matchMeeting([seven], '2027-03-22'), seven);
});

test('links follow what the Clerk has posted', () => {
  const base = `${MEETING_PORTAL}/event/909`;
  assert.deepEqual(meetingLinks(null), []);
  assert.deepEqual(meetingLinks(event('909; drop', '2026-11-09T18:00:00Z')), []);
  assert.deepEqual(meetingLinks(event(909, '2026-11-09T18:00:00Z')), [{ label: 'Meeting details', href: `${base}/overview` }]);
  assert.deepEqual(meetingLinks(event(909, '2026-11-09T18:00:00Z', { publishedFiles: [{ type: 'Agenda' }] })), [{ label: 'Agenda', href: `${base}/files` }]);
  assert.deepEqual(meetingLinks(event(909, '2026-11-09T18:00:00Z', { publishedFiles: [{ type: 'Agenda' }], hasMedia: true })), [
    { label: 'Agenda', href: `${base}/files` },
    { label: 'Watch recording', href: `${base}/media` },
  ]);
});

test('the page schedule lists six Monday meetings in order, each ready for portal links', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dates = [...html.matchAll(/data-meeting-date="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(dates, ['2027-01-11', '2027-02-08', '2027-03-22', '2027-04-12', '2027-04-26', '2027-05-24']);
  for (const date of dates) {
    assert.equal(new Date(`${date}T12:00:00Z`).getUTCDay(), 1, `${date} should be a Monday`);
    assert.ok(html.includes(`datetime="${date}"`));
  }
});

test('only the first meeting on or after today is marked next', () => {
  const dates = ['2027-01-11', '2027-02-08', '2027-03-22'];
  assert.deepEqual(meetingStates(dates, '2026-11-24'), ['next', 'upcoming', 'upcoming']);
  assert.deepEqual(meetingStates(dates, '2027-02-08'), ['past', 'next', 'upcoming']);
  assert.deepEqual(meetingStates(dates, '2027-06-01'), ['past', 'past', 'past']);
});
