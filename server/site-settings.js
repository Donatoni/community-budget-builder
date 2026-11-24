import { dashboardStore } from './dashboard-store.js';

// Fail closed if the binding or migration is unavailable. Never cache a launch
// setting across requests: changes must take effect for anonymous visitors.
export async function comingSoonEnabled(env) {
  try { return (await dashboardStore(env).setting('coming_soon'))?.value !== 'false'; }
  catch { return true; }
}
