// Connects the budget meeting schedule to the City's public meeting portal
// (CivicClerk). The schedule itself is plain HTML; this only adds links once
// the City Clerk posts a meeting, its agenda, or its recording.
export const MEETING_PORTAL = 'https://delandfl.portal.civicclerk.com';
const EVENTS_API = 'https://delandfl.api.civicclerk.com/v1/Events';
export const BUDGET_MEETING_START = 'T18:00';

const nextDay = date => new Date(Date.parse(`${date}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);

export function meetingsQuery(dates) {
  const days = dates.map(date => `(startDateTime ge ${date}T00:00:00Z and startDateTime lt ${nextDay(date)}T00:00:00Z)`);
  const filter = `categoryName eq 'City Commission' and (${days.join(' or ')})`;
  return `${EVENTS_API}?$filter=${encodeURIComponent(filter)}&$orderby=${encodeURIComponent('startDateTime asc')}`;
}

// The portal reports local wall-clock times with a Z suffix, so compare the
// text of the date instead of converting time zones.
export function matchMeeting(events, date) {
  const sameDay = (events || []).filter(event => Number.isInteger(event?.id)
    && typeof event.startDateTime === 'string' && event.startDateTime.startsWith(date)
    && (event.categoryName || '').trim() === 'City Commission'
    && !/\btest\b/i.test(event.eventName || ''));
  const atSix = sameDay.filter(event => event.startDateTime.slice(10).startsWith(BUDGET_MEETING_START));
  if (atSix.length === 1) return atSix[0];
  // Never guess between several meetings on the same day.
  return sameDay.length === 1 ? sameDay[0] : null;
}

export function meetingLinks(event) {
  if (!event || !Number.isInteger(event.id)) return [];
  const base = `${MEETING_PORTAL}/event/${event.id}`;
  const links = [];
  if (event.publishedFiles?.length) links.push({ label: 'Agenda', href: `${base}/files` });
  if (event.hasMedia) links.push({ label: 'Watch recording', href: `${base}/media` });
  if (!links.length) links.push({ label: 'Meeting details', href: `${base}/overview` });
  return links;
}

function renderLinks(item, links) {
  item.querySelector('.meeting-links')?.remove();
  if (!links.length) return;
  const when = item.dataset.meetingLabel || item.querySelector('time')?.textContent || 'this';
  const row = document.createElement('p');
  row.className = 'meeting-links';
  for (const link of links) {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = `${link.label} ↗`;
    anchor.setAttribute('aria-label', `${link.label} for the ${when} meeting (opens in a new tab)`);
    row.append(anchor);
  }
  (item.querySelector('div') || item).append(row);
}

// The first meeting on or after today is "next"; earlier ones are "past".
export function meetingStates(dates, today) {
  const next = dates.find(date => date >= today);
  return dates.map(date => date < today ? 'past' : date === next ? 'next' : 'upcoming');
}

const localDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

function markStates(items) {
  const states = meetingStates(items.map(item => item.dataset.meetingDate), localDate());
  items.forEach((item, index) => {
    item.dataset.meetingState = states[index];
    item.querySelector('.meeting-tag')?.remove();
    if (states[index] !== 'next') return;
    const tag = document.createElement('span');
    tag.className = 'meeting-tag';
    tag.textContent = 'Next meeting';
    (item.querySelector('.meeting-text') || item).prepend(tag);
  });
}

export async function initBudgetMeetings(root = document) {
  const items = [...root.querySelectorAll('[data-meeting-date]')];
  if (!items.length) return;
  markStates(items);
  try {
    const response = await fetch(meetingsQuery(items.map(item => item.dataset.meetingDate)), { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const events = (await response.json()).value;
    for (const item of items) renderLinks(item, meetingLinks(matchMeeting(events, item.dataset.meetingDate)));
  } catch {
    // The schedule stays readable without the portal.
  }
}

// The recording loads only when someone chooses to watch it.
export function initMeetingRecording(root = document) {
  for (const button of root.querySelectorAll('[data-meeting-video]')) {
    button.addEventListener('click', () => {
      const video = document.createElement('video');
      video.className = 'meeting-video';
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'metadata';
      if (button.dataset.meetingPoster) video.poster = button.dataset.meetingPoster;
      video.src = button.dataset.meetingVideo;
      video.setAttribute('aria-label', button.dataset.meetingVideoLabel || 'Meeting recording');
      button.replaceWith(video);
      video.focus();
    }, { once: true });
  }
}
