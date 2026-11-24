import { SERVICES } from './budget.js';
import { dashboardDay, dashboardTimestamp } from './dashboard-time.js';

export function summarizeSubmissions(rows) {
  const count = rows.length;
  const reductions = rows.map(row => row.reduction).sort((a, b) => a - b);
  const cuts = new Map();
  const revenues = new Map();
  const days = new Map();
  const departments = SERVICES.map(service => ({ id: service.id, name: service.name, proposed: Math.round(service.proposed * 1e8) / 100, total: 0, selections: 0 }));
  for (const row of rows) {
    for (const item of row.revenues || []) {
      const key = `${row.catalogVersion}:${item.id}:${item.amount}`;
      const entry = revenues.get(key) || { ...item, catalogVersion: row.catalogVersion, count: 0 };
      entry.count++;
      revenues.set(key, entry);
    }
    const day = dashboardDay(row.submittedAt);
    days.set(day, (days.get(day) || 0) + 1);
    for (const department of departments) {
      const selected = row.cuts.filter(cut => cut.serviceId === department.id);
      department.total += selected.reduce((sum, cut) => sum + cut.savings, 0);
      if (selected.length) department.selections++;
    }
    for (const cut of row.cuts) {
      const key = `${row.catalogVersion}:${cut.id}`;
      const entry = cuts.get(key) || { ...cut, catalogVersion: row.catalogVersion, count: 0 };
      entry.count++;
      cuts.set(key, entry);
    }
  }
  return {
    count,
    averageRevenue: count ? rows.reduce((sum, row) => sum + (row.revenue || 0), 0) / count : 0,
    averageGapClosed: count ? rows.reduce((sum, row) => sum + (row.gapClosed ?? row.reduction), 0) / count : 0,
    revenues: [...revenues.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    reviewed: rows.filter(row => row.status === 'reviewed').length,
    averageReduction: count ? rows.reduce((sum, row) => sum + row.reduction, 0) / count : 0,
    medianReduction: count ? (reductions[Math.floor((count - 1) / 2)] + reductions[Math.floor(count / 2)]) / 2 : 0,
    averageCuts: count ? rows.reduce((sum, row) => sum + row.cuts.length, 0) / count : 0,
    departments: departments.map(department => ({ ...department, average: count ? department.total / count : 0, percent: count ? department.total / count / department.proposed * 100 : 0 })),
    cuts: [...cuts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    days: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    catalogVersions: [...new Set(rows.map(row => row.catalogVersion))],
  };
}

// Quoting alone does not prevent spreadsheet formula injection.
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function submissionsCSV(rows) {
  const header = ['Submission ID', 'Submitted at (Eastern Time)', 'Review status', 'Catalog', 'Illustrative', 'Net service cuts ($)', 'Selected cuts', 'Potential revenue ($)', 'Gap closed ($)', 'Selected revenue options', ...SERVICES.map(service => `${service.name} retained ($)`)];
  return '\ufeff' + [header, ...rows.map(row => [row.id, dashboardTimestamp(row.submittedAt), row.status, row.catalogVersion, row.illustrative, row.reduction, row.cuts.map(cut => cut.name).join('; '), row.revenue || 0, row.gapClosed ?? row.reduction, (row.revenues || []).map(item => item.name).join('; '), ...SERVICES.map(service => Math.round(row.budget[service.id] * 1e6))])].map(row => row.map(csvCell).join(',')).join('\r\n');
}
