// Independent time-zone reference for the configured DASHBOARD_TIME_ZONE.
// It uses Intl offset names and a minute-by-minute scan rather than the
// wall-clock correction used in src/dashboard-time.js.
import { DASHBOARD_TIME_ZONE } from '../../src/dashboard-time.js';

const HOUR = 3600000;
const dayParts = new Intl.DateTimeFormat('en-CA', { timeZone: DASHBOARD_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const offsetName = new Intl.DateTimeFormat('en-US', { timeZone: DASHBOARD_TIME_ZONE, timeZoneName: 'longOffset' });
const shortName = new Intl.DateTimeFormat('en-US', { timeZone: DASHBOARD_TIME_ZONE, timeZoneName: 'short' });

// Local calendar date (YYYY-MM-DD) of an instant.
export function localDay(instant) {
  const parts = Object.fromEntries(dayParts.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Minutes east of UTC at an instant, read from the "GMT-05:00" style name.
export function offsetMinutes(instant) {
  const name = offsetName.formatToParts(new Date(instant)).find(part => part.type === 'timeZoneName').value;
  const match = /^GMT(?:([+-])(\d{1,2}):?(\d{2})?)?$/.exec(name);
  if (!match) throw new Error(`Unexpected offset name ${name}`);
  return match[1] ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] || 0)) : 0;
}

export const zoneName = instant => shortName.formatToParts(new Date(instant)).find(part => part.type === 'timeZoneName').value;

export const nextDay = day => new Date(Date.parse(`${day}T00:00:00Z`) + 24 * HOUR).toISOString().slice(0, 10);
export const previousDay = day => new Date(Date.parse(`${day}T00:00:00Z`) - 24 * HOUR).toISOString().slice(0, 10);

// The first minute whose local date is `day`: the local start of that day.
export function localMidnight(day) {
  const utc = Date.parse(`${day}T00:00:00Z`);
  for (let instant = utc - 15 * HOUR; instant <= utc + 15 * HOUR; instant += 60000) {
    if (localDay(instant) === day) return instant;
  }
  throw new Error(`No local start found for ${day}`);
}

// Days in `year` whose UTC offset at local noon differs from the day before.
export function offsetChangeDays(year) {
  const days = [];
  let previous = offsetMinutes(Date.UTC(year - 1, 11, 31, 12));
  for (let instant = Date.UTC(year, 0, 1, 12); new Date(instant).getUTCFullYear() === year; instant += 24 * HOUR) {
    const offset = offsetMinutes(instant - offsetMinutes(instant) * 60000);
    if (offset !== previous) days.push(new Date(instant).toISOString().slice(0, 10));
    previous = offset;
  }
  return days;
}

export const observesDST = offsetMinutes(Date.UTC(2026, 0, 15, 12)) !== offsetMinutes(Date.UTC(2026, 6, 15, 12));
export { DASHBOARD_TIME_ZONE };
