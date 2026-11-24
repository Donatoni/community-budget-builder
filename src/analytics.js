// Budget challenge funnel events for Google Analytics. Each step is sent at
// most once per page load, and each later step also sends any earlier step
// that was skipped (for example, submitting a shared plan without changes),
// so started >= target met >= submitted and the difference is abandonment.
const STEPS = ["challenge_start", "challenge_target_met", "challenge_submit"];

export function createChallengeTracker(send = (...args) => globalThis.gtag?.(...args)) {
  const sent = new Set();
  function reach(step) {
    for (const name of STEPS.slice(0, STEPS.indexOf(step) + 1)) {
      if (sent.has(name)) continue;
      sent.add(name);
      try { send("event", name); } catch { /* Analytics must never break the challenge. */ }
    }
  }
  return {
    started: () => reach("challenge_start"),
    // Only counts once the resident has started, so loading a shared plan that
    // already meets the target is not reported as progress.
    targetMet: () => { if (sent.has("challenge_start")) reach("challenge_target_met"); },
    submitted: () => reach("challenge_submit"),
  };
}
