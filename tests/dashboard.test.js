import test from 'node:test';
import assert from 'node:assert/strict';
import { localDatabase } from '../server/dashboard-local.js';
import { handleDashboardRequest, validateSubmission, dateRange } from '../server/dashboard-api.js';
import { dashboardStore } from '../server/dashboard-store.js';
import { authenticateStaff, staffCookie, clearStaffCookie, staffSession, hashPassword } from '../server/staff-auth.js';
import { reviewerGate } from '../server/reviewer-access.js';
import { ALL_COST_CENTERS, COST_CENTER_VERSION, POTENTIAL_REVENUES } from '../src/cost-centers.js';
import { SERVICES } from '../src/budget.js';
import { summarizeSubmissions, submissionsCSV, csvCell } from '../src/dashboard-data.js';
import { dashboardDate } from '../src/dashboard-time.js';
import { cents, sumCents, TARGET_CENTS, MILLAGE, CHECKBOX_REVENUES, noMillage, noRevenues, revenueCents, cutsReaching, LARGEST_FIRST } from './support/catalog.js';
import { localDay, localMidnight } from './support/time-zone.js';

const origin = 'https://budget.example.gov';
const request = (path, method = 'GET', body, cookie, extra = {}) => new Request(origin + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
function environment(t) {
  const env = { DASHBOARD_DB: localDatabase(':memory:'), ADMIN_EMAIL: 'admin@example.gov', ADMIN_PASSWORD: 'test-administrator-password', REVIEWER_SESSION_SECRET: 'test-dashboard-signing-secret-at-least-32', REVIEWER_PASSWORD: 'reviewer-password' };
  t.after(() => env.DASHBOARD_DB.close());
  return env;
}
async function cookieFor(env, email = env.ADMIN_EMAIL, password = env.ADMIN_PASSWORD) {
  const user = await authenticateStaff(email, password, env);
  assert.ok(user);
  return (await staffCookie(request('/'), user, env)).split(';')[0];
}
const plan = () => ({ id: crypto.randomUUID(), costCenterVersion: COST_CENTER_VERSION, cuts: ALL_COST_CENTERS.map(cut => cut.id) });
const cutCents = ids => sumCents(ALL_COST_CENTERS.filter(cut => ids.includes(cut.id)).map(cut => cut.savings));
// The cookie name is whatever server/staff-auth.js sets.
const STAFF_COOKIE = clearStaffCookie(new Request(origin)).split('=')[0];
const call = (env, cookie, path, method, body) => handleDashboardRequest(request(path, method, body, cookie), env);
async function addUser(env, cookie, role = 'viewer', email = 'staff@example.gov') {
  const response = await call(env, cookie, '/api/admin/users', 'POST', { name: 'City colleague', email, role, password: 'test-colleague-password' });
  assert.equal(response.status, 201);
  return (await response.json()).user;
}

test('submissions recompute snapshots, validate catalogs and targets, and deduplicate retries', async t => {
  const env = environment(t);
  const payload = { ...plan(), submittedAt: '1999-01-01', reduction: -1, revenue: 99999999, gapClosed: 99999999, budget: Object.fromEntries(SERVICES.map(service => [service.id, -10])), illustrative: true };
  const first = await call(env, null, '/api/submissions', 'POST', payload);
  assert.equal(first.status, 201);
  assert.equal((await call(env, null, '/api/submissions', 'POST', payload)).status, 201);
  const cookie = await cookieFor(env);
  const response = await call(env, cookie, '/api/admin/submissions');
  const { submissions, summary } = await response.json();
  assert.equal(summary.count, 1);
  const row = submissions[0];
  assert.equal(row.illustrative, false);
  assert.equal(row.revenue, 0);
  assert.equal(row.gapClosed, row.reduction);
  assert.equal(row.reduction, cutCents(payload.cuts) / 100);
  assert.ok(row.submittedAt.startsWith(new Date().toISOString().slice(0, 10)));
  assert.deepEqual(row.budget, Object.fromEntries(SERVICES.map(service => [service.id, 0])));
  assert.deepEqual(row.cuts.map(cut => [cut.id, cut.savings, cut.impact]), ALL_COST_CENTERS.map(cut => [cut.id, cut.savings, cut.impact]));
  // A different plan that also meets the target cannot reuse the identifier.
  const other = cutsReaching();
  assert.equal((await call(env, null, '/api/submissions', 'POST', { ...payload, cuts: other })).status, 409);
  for (const changed of [{ id: 'invalid' }, { cuts: ['unknown'] }, { cuts: [] }, { cuts: other.slice(0, -1) }, { cuts: [...payload.cuts, payload.cuts[0]] }, { cuts: 'all' }]) assert.throws(() => validateSubmission({ ...payload, ...changed }));
  assert.throws(() => validateSubmission({ ...payload, costCenterVersion: 'old' }), /catalog has changed/);
});

test('revenue submissions are recomputed, saved, reported and exported', { skip: noRevenues }, async t => {
  const env = environment(t);
  const revenues = POTENTIAL_REVENUES.map(item => item.id);
  const revenue = revenueCents(revenues);
  // Revenue alone when it closes the gap, otherwise the fewest large cuts that finish the job.
  const cuts = revenue >= TARGET_CENTS ? [] : cutsReaching(revenue);
  const payload = { ...plan(), cuts, revenues, revenue: 1, gapClosed: 1 };
  assert.equal((await call(env, null, '/api/submissions', 'POST', payload)).status, 201);
  assert.equal((await call(env, null, '/api/submissions', 'POST', payload)).status, 201);
  const response = await call(env, await cookieFor(env), '/api/admin/submissions');
  const { submissions: [row], summary } = await response.json();
  assert.equal(row.reduction, cutCents(cuts) / 100);
  assert.equal(row.revenue, revenue / 100);
  assert.equal(row.gapClosed, (cutCents(cuts) + revenue) / 100);
  assert.deepEqual(row.revenues.map(item => item.id), revenues);
  assert.equal(summary.averageRevenue, revenue / 100);
  assert.equal(summary.averageGapClosed, row.gapClosed);
  assert.equal(summary.revenues.length, revenues.length);
  assert.ok(summary.revenues.every(item => item.count === 1));
  const csv = submissionsCSV([row]);
  for (const item of row.revenues) assert.ok(csv.includes(item.name.replaceAll('"', '""')), item.name);
  assert.ok(csv.includes(`"${revenue / 100}"`));
  for (const invalid of [['unknown'], [revenues[0], revenues[0]], revenues[0], [...revenues, 'unknown']]) {
    assert.throws(() => validateSubmission({ ...payload, revenues: invalid }), JSON.stringify(invalid));
  }
  if (revenue < TARGET_CENTS) assert.throws(() => validateSubmission({ ...payload, cuts: [] }));
  const extra = LARGEST_FIRST.find(cut => !cuts.includes(cut.id));
  if (extra) assert.equal((await call(env, null, '/api/submissions', 'POST', { ...payload, cuts: [...cuts, extra.id] })).status, 409);
});

test('partial millage is recomputed, stored, and reported at its selected rate', { skip: noMillage }, async t => {
  const env = environment(t);
  const revenues = [CHECKBOX_REVENUES[0]?.id, MILLAGE.id].filter(Boolean);
  const at = tenths => revenueCents(revenues, tenths);
  const cuts = at(8) >= TARGET_CENTS ? [] : cutsReaching(at(8));
  const payload = { ...plan(), cuts, revenues, millageRate: 0.8, revenue: 99999999 };
  assert.equal((await call(env, null, '/api/submissions', 'POST', payload)).status, 201);
  assert.equal((await call(env, null, '/api/submissions', 'POST', { ...payload, millageRate: 0.9 })).status, 409);
  assert.equal((await call(env, null, '/api/submissions', 'POST', { ...payload, id: crypto.randomUUID(), millageRate: 0.9 })).status, 201);
  const data = await (await call(env, await cookieFor(env), '/api/admin/submissions')).json();
  const saved = data.submissions.find(row => row.id === payload.id);
  assert.equal(saved.revenue, at(8) / 100);
  assert.equal(saved.millageRate, 0.8);
  assert.equal(saved.revenues.find(item => item.id === MILLAGE.id).amount, revenueCents([MILLAGE.id], 8) / 100);
  assert.deepEqual(data.summary.revenues.filter(item => item.id === MILLAGE.id).map(item => item.amount).sort((a, b) => a - b), [8, 9].map(tenths => revenueCents([MILLAGE.id], tenths) / 100));
  assert.match(submissionsCSV([saved]), /0\.8 mills/);
  for (const millageRate of [-0.1, 1.1, 0.15, '0.8', null, 0]) {
    assert.equal((await call(env, null, '/api/submissions', 'POST', { ...payload, id: crypto.randomUUID(), millageRate })).status, 400, String(millageRate));
  }
  // A rate that leaves the plan short of the target is refused.
  const shortRate = [0, 1, 2, 3, 4, 5, 6, 7].reverse().find(tenths => tenths && cutCents(cuts) + at(tenths) < TARGET_CENTS);
  if (shortRate) assert.equal((await call(env, null, '/api/submissions', 'POST', { ...payload, id: crypto.randomUUID(), millageRate: shortRate / 10 })).status, 400);
  assert.equal((await call(env, null, '/api/submissions', 'POST', { ...plan(), cuts: ['not-a-choice'] })).status, 400);
});

test('staff login integrates with gate without granting reviewer access to staff data', async t => {
  const env = environment(t);
  const loadPage = async name => new Response(name);
  const signIn = username => reviewerGate(new Request(origin + '/auth/login', { method: 'POST', headers: { Origin: origin, Accept: 'application/json', 'CF-Connecting-IP': username }, body: new URLSearchParams({ username, password: username === env.ADMIN_EMAIL ? env.ADMIN_PASSWORD : env.REVIEWER_PASSWORD, next: '/admin/' }) }), env, loadPage);
  const loggedIn = await signIn(env.ADMIN_EMAIL);
  assert.equal(loggedIn.status, 200);
  assert.ok(STAFF_COOKIE, 'the staff cookie has a name');
  assert.ok(loggedIn.headers.get('Set-Cookie').startsWith(`${STAFF_COOKIE}=`));
  assert.match(loggedIn.headers.get('Set-Cookie'), /HttpOnly.*Secure/);
  const adminCookie = loggedIn.headers.get('Set-Cookie').split(';')[0];
  assert.equal(await reviewerGate(request('/admin/', 'GET', undefined, adminCookie), env, loadPage), null);
  const reviewer = await signIn('reviewer');
  const reviewerCookie = reviewer.headers.get('Set-Cookie').split(';')[0];
  assert.notEqual(reviewerCookie.split('=')[0], STAFF_COOKIE, 'reviewer and staff sessions need different cookie names');
  assert.equal((await reviewerGate(request('/admin/', 'GET', undefined, reviewerCookie), env, loadPage)).status, 303);
  assert.equal(await (await reviewerGate(request('/login?next=%2Fadmin%2F&staff=1', 'GET', undefined, reviewerCookie), env, loadPage)).text(), 'login.html');
  assert.equal((await call(env, reviewerCookie, '/api/admin/submissions')).status, 401);
  assert.equal((await call(env, null, '/api/admin/submissions')).status, 401);
  const logout = await reviewerGate(request('/auth/logout', 'POST', {}), env, loadPage);
  assert.equal(logout.headers.getSetCookie().length, 2);
  assert.ok(logout.headers.getSetCookie().every(value => value.includes('Max-Age=0')));
});

test('users persist with hashed passwords, unique normalized emails, and role enforcement', async t => {
  const env = environment(t), adminCookie = await cookieFor(env);
  const user = await addUser(env, adminCookie, 'viewer', 'STAFF@example.gov');
  assert.equal(user.email, 'staff@example.gov');
  assert.equal(user.password_hash, undefined);
  const saved = await dashboardStore(env).user(user.id);
  assert.match(saved.password_hash, /^pbkdf2\$100000\$/);
  assert.notEqual(saved.password_hash, 'test-colleague-password');
  assert.notEqual(await hashPassword('same-password'), await hashPassword('same-password'));
  const viewerCookie = await cookieFor(env, user.email, 'test-colleague-password');
  assert.equal((await call(env, viewerCookie, '/api/admin/submissions')).status, 200);
  assert.equal((await call(env, viewerCookie, '/api/admin/users')).status, 403);
  assert.equal((await call(env, viewerCookie, '/api/admin/users', 'POST', {})).status, 403);
  assert.equal((await call(env, viewerCookie, '/api/admin/submissions/id', 'PATCH', { status: 'reviewed' })).status, 403);
  assert.equal((await call(env, adminCookie, '/api/admin/users', 'POST', { name: 'Duplicate', email: 'STAFF@example.gov', role: 'viewer', password: 'test-colleague-password' })).status, 409);
  assert.equal((await call(env, adminCookie, '/api/admin/users', 'POST', { name: 'Bad role', email: 'other@example.gov', role: 'superadmin', password: 'test-colleague-password' })).status, 400);
  assert.equal(await authenticateStaff(user.email, 'wrong-password', env), null);
  assert.equal(await authenticateStaff('unknown@example.gov', 'wrong-password', env), null);
});

test('disable, re-enable, role changes and password resets revoke existing sessions', async t => {
  const env = environment(t), adminCookie = await cookieFor(env);
  const user = await addUser(env, adminCookie);
  const cookie = await cookieFor(env, user.email, 'test-colleague-password');
  assert.ok(await staffSession(request('/', 'GET', undefined, cookie), env));
  assert.equal((await call(env, adminCookie, `/api/admin/users/${user.id}`, 'PATCH', { active: false })).status, 200);
  assert.equal(await staffSession(request('/', 'GET', undefined, cookie), env), null);
  assert.equal(await authenticateStaff(user.email, 'test-colleague-password', env), null);
  await call(env, adminCookie, `/api/admin/users/${user.id}`, 'PATCH', { active: true });
  assert.equal(await staffSession(request('/', 'GET', undefined, cookie), env), null);
  const newCookie = await cookieFor(env, user.email, 'test-colleague-password');
  await call(env, adminCookie, `/api/admin/users/${user.id}`, 'PATCH', { role: 'admin' });
  assert.equal(await staffSession(request('/', 'GET', undefined, newCookie), env), null);
  await call(env, adminCookie, `/api/admin/users/${user.id}`, 'PATCH', { password: 'replacement-password-123' });
  assert.equal(await authenticateStaff(user.email, 'test-colleague-password', env), null);
  assert.ok(await authenticateStaff(user.email, 'replacement-password-123', env));
  assert.equal((await call(env, adminCookie, '/api/admin/users/bootstrap', 'PATCH', { active: false })).status, 400);
  assert.equal(await staffSession(request('/', 'GET', undefined, adminCookie + 'x'), env), null);
  assert.equal(await staffSession(request('/', 'GET', undefined, adminCookie), { ...env, ADMIN_PASSWORD: 'rotated-password' }), null);
});

test('API rejects cross-origin, malformed, excessive and unconfigured requests', async t => {
  const env = environment(t), cookie = await cookieFor(env);
  assert.equal((await handleDashboardRequest(request('/api/admin/users', 'POST', {}, cookie, { Origin: 'https://other.example' }), env)).status, 403);
  assert.equal((await call(env, null, '/api/submissions', 'POST', { value: 'x'.repeat(33000) })).status, 413);
  assert.equal((await handleDashboardRequest(new Request(origin + '/api/submissions', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: 'invalid' }), env)).status, 400);
  assert.equal((await call(env, null, '/api/submissions', 'POST', plan())).status, 201);
  assert.equal((await call({ ...env, DASHBOARD_DB: undefined }, null, '/api/submissions', 'POST', plan())).status, 503);
  const privateResponse = await call(env, cookie, '/api/admin/submissions');
  assert.match(privateResponse.headers.get('Cache-Control'), /no-store/);
  assert.match(privateResponse.headers.get('X-Robots-Tag'), /noindex/);
});

test('date boundaries include complete local days for submissions and feedback and reject invalid ranges', async t => {
  const env = environment(t), cookie = await cookieFor(env);
  const store = dashboardStore(env);
  // One millisecond either side of local midnight at the start and end of September.
  const start = localMidnight('2026-09-01'), end = localMidnight('2026-10-01');
  const timestamps = [start - 1, start, end - 1, end].map(instant => new Date(instant).toISOString());
  for (const submitted_at of timestamps) {
    await store.createSubmission({ ...validateSubmission(plan()), submitted_at });
    await store.createFeedback({ id: crypto.randomUUID(), submitted_at, helpful: 'yes', comment: '' });
  }
  const data = await (await call(env, cookie, '/api/admin/submissions?from=2026-09-01&to=2026-09-30')).json();
  assert.deepEqual(data.submissions.map(row => row.submittedAt).sort(), timestamps.slice(1, 3));
  const feedback = await (await call(env, cookie, '/api/admin/feedback?from=2026-09-01&to=2026-09-30')).json();
  assert.deepEqual(feedback.feedback.map(row => row.submitted_at).sort(), timestamps.slice(1, 3));
  for (const query of ['from=2026-02-30', 'from=2026-10-01&to=2026-09-01', 'from=2020-01-01&to=2026-01-01']) assert.throws(() => dateRange(new URLSearchParams(query)));
  const reviewed = await call(env, cookie, `/api/admin/submissions/${data.submissions[0].id}`, 'PATCH', { status: 'reviewed' });
  assert.equal(reviewed.status, 200);
  assert.equal((await store.submission(data.submissions[0].id)).status, 'reviewed');
});

test('analytics include zero-cut departments, median, frequency, and separate catalog versions', () => {
  const cut = ALL_COST_CENTERS[0];
  const rows = [
    { id: '1', submittedAt: '2026-09-01T10:00:00Z', status: 'new', catalogVersion: 'one', reduction: 100, cuts: [cut] },
    { id: '2', submittedAt: '2026-09-01T11:00:00Z', status: 'reviewed', catalogVersion: 'one', reduction: 300, cuts: [] },
    { id: '3', submittedAt: '2026-09-02T00:00:00Z', status: 'new', catalogVersion: 'two', reduction: 500, cuts: [cut] },
  ];
  const summary = summarizeSubmissions(rows);
  assert.equal(summary.count, 3);
  assert.equal(summary.reviewed, 1);
  assert.equal(summary.averageReduction, 300);
  assert.equal(summary.medianReduction, 300);
  assert.equal(summary.departments.length, SERVICES.length);
  for (const department of summary.departments) {
    const chosen = department.id === cut.serviceId;
    assert.equal(department.average, chosen ? cut.savings * 2 / 3 : 0, department.id);
    assert.equal(department.selections, chosen ? 2 : 0, department.id);
  }
  assert.equal(summary.cuts.length, 2);
  assert.equal(summary.cuts[0].count, 1);
  const days = Object.entries(Object.groupBy(rows, row => localDay(row.submittedAt))).map(([date, group]) => ({ date, count: group.length })).sort((a, b) => a.date.localeCompare(b.date));
  assert.deepEqual(summary.days, days);
  assert.equal(summarizeSubmissions(rows.slice(0, 2)).medianReduction, 200);
  assert.equal(summarizeSubmissions([]).averageReduction, 0);
});

test('CSV retains dollars and neutralizes spreadsheet formulas and embedded quotes', () => {
  assert.equal(csvCell('=SUM(A1:A2)'), '"\'=SUM(A1:A2)"');
  assert.equal(csvCell('\t@BAD'), '"\'\t@BAD"');
  assert.equal(csvCell('A "quote"'), '"A ""quote"""');
  const submittedAt = '2026-09-02T01:30:00Z';
  const csv = submissionsCSV([{ id: 'id', submittedAt, status: 'new', catalogVersion: 'demo-1', illustrative: true, reduction: 5200000, cuts: [{ name: '=malicious' }], budget: Object.fromEntries(SERVICES.map(service => [service.id, 1.25])) }]);
  assert.ok(csv.startsWith('\ufeff'));
  const [header, line] = csv.slice(1).split('\r\n').map(text => [...text.matchAll(/"((?:[^"]|"")*)"/g)].map(match => match[1]));
  assert.equal(header.length, 10 + SERVICES.length);
  assert.equal(line.length, header.length);
  SERVICES.forEach((service, i) => assert.ok(header[10 + i].includes(service.name.replaceAll('"', '""')), service.name));
  // The timestamp is shown on the local calendar date of the configured zone.
  assert.ok(line[1].startsWith(`${dashboardDate(localDay(submittedAt), { year: 'numeric' })}, `), line[1]);
  assert.ok(csv.includes('"5200000"'));
  assert.ok(csv.includes('"1250000"'));
  assert.ok(csv.includes('"\'=malicious"'));
});

test('feedback validates ratings and comments, timestamps on server, and deduplicates retries', async t => {
  const env = environment(t), cookie = await cookieFor(env);
  const body = { id: crypto.randomUUID(), helpful: 'somewhat', comment: '  More detail, please.  ', submitted_at: '1999-01-01' };
  const first = await call(env, null, '/api/feedback', 'POST', body);
  assert.equal(first.status, 201);
  assert.equal((await call(env, null, '/api/feedback', 'POST', body)).status, 201);
  assert.equal((await call(env, null, '/api/feedback', 'POST', { ...body, helpful: 'no' })).status, 409);
  const data = await (await call(env, cookie, '/api/admin/feedback')).json();
  assert.equal(data.feedback.length, 1);
  assert.equal(data.feedback[0].comment, 'More detail, please.');
  assert.ok(data.feedback[0].submitted_at.startsWith(new Date().toISOString().slice(0, 10)));
  for (const change of [{ helpful: 'invalid' }, { comment: 'x'.repeat(501) }, { comment: null }, { botcheck: true }, { id: 'bad' }]) {
    assert.equal((await call(env, null, '/api/feedback', 'POST', { ...body, ...change })).status, 400);
  }
  assert.equal((await handleDashboardRequest(request('/api/feedback', 'POST', body, undefined, { Origin: 'https://other.example' }), env)).status, 403);
  assert.equal((await call(env, null, '/api/admin/feedback')).status, 401);
  const viewer = await addUser(env, cookie);
  const viewerCookie = await cookieFor(env, viewer.email, 'test-colleague-password');
  assert.equal((await call(env, viewerCookie, '/api/admin/feedback')).status, 200);
  assert.equal((await call(env, viewerCookie, `/api/admin/feedback/${body.id}`, 'PATCH', { status: 'reviewed' })).status, 403);
  assert.equal((await call(env, cookie, `/api/admin/feedback/${body.id}`, 'PATCH', { status: 'reviewed' })).status, 200);
  assert.equal((await dashboardStore(env).feedbackById(body.id)).status, 'reviewed');
});

test('coming-soon toggle persists, defaults closed, and never exposes staff routes', async t => {
  const env = environment(t), cookie = await cookieFor(env), loadPage = async name => new Response(name);
  const gate = path => reviewerGate(request(path), env, loadPage);
  assert.equal(await (await gate('/')).text(), 'coming-soon.html');
  assert.equal((await call(env, cookie, '/api/admin/settings')).status, 200);
  assert.equal((await call(env, cookie, '/api/admin/settings', 'PATCH', { comingSoon: 'false' })).status, 400);
  await addUser(env, cookie);
  const viewerCookie = await cookieFor(env, 'staff@example.gov', 'test-colleague-password');
  for (const method of ['GET', 'PATCH']) assert.equal((await call(env, viewerCookie, '/api/admin/settings', method, method === 'PATCH' ? { comingSoon: false } : undefined)).status, 403);
  assert.equal((await call(env, cookie, '/api/admin/settings', 'PATCH', { comingSoon: false })).status, 200);
  assert.equal((await dashboardStore(env).setting('coming_soon')).value, 'false');
  for (const path of ['/', '/assets/main.js', '/api/submissions', '/api/feedback', '/robots.txt', '/sitemap.xml']) assert.equal(await gate(path), null);
  assert.equal((await gate('/admin/')).status, 303);
  for (const path of ['/api/admin/session', '/api/admin/feedback', '/api/admin/settings']) assert.equal((await gate(path)).status, 401);
  assert.equal(await (await gate('/coming-soon')).text(), 'coming-soon.html');
  assert.equal((await call(env, cookie, '/api/admin/settings', 'PATCH', { comingSoon: true })).status, 200);
  assert.equal(await (await gate('/')).text(), 'coming-soon.html');
  assert.equal((await gate('/api/feedback')).status, 401);
  assert.equal(await (await reviewerGate(request('/'), {}, loadPage)).text(), 'coming-soon.html');
});

test('only administrators can delete individual responses, and reports update after deletion', async t => {
  const env = environment(t), admin = await cookieFor(env);
  await addUser(env, admin);
  const viewer = await cookieFor(env, 'staff@example.gov', 'test-colleague-password');
  const submission = plan(), keep = plan(), feedback = { id: crypto.randomUUID(), helpful: 'yes', comment: 'Test response' };
  await call(env, null, '/api/submissions', 'POST', submission);
  await call(env, null, '/api/submissions', 'POST', keep);
  await call(env, null, '/api/feedback', 'POST', feedback);
  for (const path of [`/api/admin/submissions/${submission.id}`, `/api/admin/feedback/${feedback.id}`]) {
    assert.equal((await call(env, null, path, 'DELETE')).status, 401);
    assert.equal((await call(env, viewer, path, 'DELETE')).status, 403);
    assert.equal((await handleDashboardRequest(request(path, 'DELETE', undefined, admin, { Origin: 'https://other.example' }), env)).status, 403);
    assert.equal((await call(env, admin, path, 'DELETE')).status, 200);
    assert.equal((await call(env, admin, path, 'DELETE')).status, 404);
  }
  const data = await (await call(env, admin, '/api/admin/submissions')).json();
  assert.equal(data.summary.count, 1);
  assert.equal(data.submissions[0].id, keep.id);
  assert.equal((await (await call(env, admin, '/api/admin/feedback')).json()).feedback.length, 0);
  assert.equal((await call(env, admin, '/api/admin/submissions/not-an-id', 'DELETE')).status, 400);
  assert.equal((await call(env, admin, '/api/admin/submissions', 'DELETE')).status, 404);
  assert.equal((await call(env, admin, '/api/admin/users/bootstrap', 'DELETE')).status, 404);
});
