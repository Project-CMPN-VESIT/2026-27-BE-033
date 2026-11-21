import type { CleanCandidate } from './buildAssistantData';

export function formatRupees(amount: number): string {
  const n = Math.abs(amount), sign = amount < 0 ? '-' : '';
  if (n >= 1e7) return `Rs ${sign}${(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `Rs ${sign}${(n / 1e5).toFixed(2)} lakh`;
  return `Rs ${amount.toLocaleString('en-IN')}`;
}
const norm = (s: string) => s.toLowerCase().replace(/\s*\((sc|st)\)\s*/gi, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const numeric = ['min_age', 'max_age', 'min_criminal_cases', 'max_criminal_cases', 'min_assets', 'max_assets', 'min_liabilities', 'max_liabilities', 'min_net_worth', 'max_net_worth'];
const filterProperties = Object.fromEntries([
  ['reservation', { type: 'string', enum: ['SC', 'ST', 'general'], description: 'Reservation explicitly recorded in the constituency label; general means no SC/ST tag in this sheet.' }],
  ['winner', { type: 'boolean', description: 'Filter by an explicit Winner marker in the sheet candidate name. Missing marker does not establish losing. Not a prediction or independently verified result.' }],
  ...['party', 'constituency', 'education'].map(k => [k, { type: 'string', description: 'Exact label preferred. Ambiguous partial labels require clarification.' }]),
  ...numeric.map(k => [k, { type: 'number', ...(k.includes('net_worth') ? {} : { minimum: 0 }), description: 'Inclusive bound; money is integer rupees. Net worth can be negative.' }]),
]);
const AGGREGATE_METRICS = ['count', 'avg_age', 'avg_assets', 'total_criminal_cases', 'max_assets', 'total_assets', 'avg_liabilities', 'total_liabilities', 'avg_net_worth', 'total_net_worth', 'min_age', 'max_age', 'avg_criminal_cases', 'candidates_with_cases', 'percentage_with_cases'] as const;
export const TOOL_DECLARATIONS = [
  { name: 'search_candidates', description: 'Filter candidates. Returns total and at most 10 records. For counts use total. No predictions or voting recommendations.', parameters: { type: 'object', properties: { ...filterProperties, sort_by: { type: 'string', enum: ['assets', 'liabilities', 'net_worth', 'age', 'criminal_cases', 'name'] }, order: { type: 'string', enum: ['asc', 'desc'] }, limit: { type: 'integer', minimum: 1, maximum: 10 } } } },
  { name: 'get_candidate', description: 'Find one candidate by name; fuzzy matches are suggestions requiring confirmation. If duplicate names, ask for constituency then use candidate_id.', parameters: { type: 'object', properties: { name: { type: 'string' }, candidate_id: { type: 'string' } }, required: ['name'] } },
  { name: 'aggregate', description: 'Calculate exact statistics in code. Use group_by:all for totals/averages over every matching candidate. count is candidates, not sum of cases. Apply all needed filters. Money numericValue is exact rupees; percentage_with_cases is 0-100. Returns top 10 groups.', parameters: { type: 'object', properties: { group_by: { type: 'string', enum: ['all', 'party', 'constituency', 'education'] }, metric: { type: 'string', enum: AGGREGATE_METRICS }, filters: { type: 'object', properties: filterProperties }, order: { type: 'string', enum: ['asc', 'desc'] }, limit: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['group_by', 'metric'] } },
];
export interface SearchFilters { party?: string; constituency?: string; education?: string; winner?: boolean; reservation?: 'SC' | 'ST' | 'general'; min_liabilities?: number; max_liabilities?: number; min_net_worth?: number; max_net_worth?: number; min_age?: number; max_age?: number; min_criminal_cases?: number; max_criminal_cases?: number; min_assets?: number; max_assets?: number }
export interface SearchArgs extends SearchFilters { sort_by?: 'assets' | 'liabilities' | 'net_worth' | 'age' | 'criminal_cases' | 'name'; order?: 'asc' | 'desc'; limit?: number }
export interface GetCandidateArgs { name: string; candidate_id?: string }
export interface AggregateArgs { group_by: 'all' | 'party' | 'constituency' | 'education'; metric: typeof AGGREGATE_METRICS[number]; filters?: SearchFilters; order?: 'asc' | 'desc'; limit?: number }
export type ToolArgs = SearchArgs | GetCandidateArgs | AggregateArgs;
class Clarification extends Error {
  constructor(public field: string, public query: string, public matches: string[]) { super('Please clarify the requested label.'); }
}
// Explicit language aliases only; ambiguous names still use normal clarification.
const aliases: Record<'party' | 'constituency' | 'education', Record<string, string>> = {
  constituency: { 'ठाणे': 'THANE', 'ठाण्यात': 'THANE', 'थाने': 'THANE', 'थाणे': 'THANE', 'पुणे': 'PUNE', 'पुण्यात': 'PUNE', 'दिल्ली': 'Delhi', 'नवी दिल्ली': 'New Delhi', 'नई दिल्ली': 'New Delhi', 'मुंबई': 'Mumbai', 'मुंबई उत्तर': 'MUMBAI NORTH', 'मुंबई दक्षिण': 'MUMBAI SOUTH', 'मुंबई उत्तर पश्चिम': 'MUMBAI NORTH - WEST', 'मुंबई उत्तर पूर्व': 'MUMBAI NORTH - EAST', 'मुंबई उत्तर मध्य': 'MUMBAI NORTH - CENTRAL', 'मुंबई दक्षिण मध्य': 'MUMBAI SOUTH - CENTRAL', 'नागपूर': 'NAGPUR', 'नागपुर': 'NAGPUR', 'नाशिक': 'NASHIK', 'कोल्हापूर': 'KOLHAPUR', 'कोल्हापुर': 'KOLHAPUR', 'सातारा': 'SATARA', 'सोलापूर': 'SOLAPUR', 'सोलापुर': 'SOLAPUR' },
  party: { 'भाजप': 'BJP', 'भाजपा': 'BJP', 'काँग्रेस': 'INC', 'कांग्रेस': 'INC', 'अपक्ष': 'IND', 'निर्दलीय': 'IND', 'बसपा': 'BSP', 'शिवसेना': 'Shiv Sena', 'आम आदमी पक्ष': 'AAP', 'आम आदमी पार्टी': 'AAP' },
  education: { 'पदवीधर': 'Graduate', 'स्नातक': 'Graduate', 'पदव्युत्तर': 'Post Graduate', 'स्नातकोत्तर': 'Post Graduate', 'व्यावसायिक पदवीधर': 'Graduate Professional', 'बारावी उत्तीर्ण': '12th Pass', 'दहावी उत्तीर्ण': '10th Pass', 'साक्षर': 'Literate', 'निरक्षर': 'Illiterate', 'इतर': 'Others', 'अन्य': 'Others' },
};
function aliasLabel(field: keyof typeof aliases, value: string): string {
  return aliases[field][value.trim().replace(/\s+/g, ' ')] ?? value;
}
function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + Number(a[i - 1] !== b[j - 1]));
    prev = row;
  }
  return prev[b.length];
}
function resolveLabel(field: 'party' | 'constituency' | 'education', query: string, data: CleanCandidate[]) {
  query = aliasLabel(field, query);
  const labels = [...new Set(data.map(c => c[field]))], key = norm(query);
  const exact = labels.find(s => norm(s) === key);
  if (exact) return exact;
  const partial = labels.filter(s => norm(s).includes(key));
  const close = partial.length ? partial : labels.filter(s => distance(norm(s), key) <= 3);
  throw new Clarification(field, query, close.slice(0, 10));
}
function applyFilters(data: CleanCandidate[], f: SearchFilters) {
  const labels: Partial<Record<'party' | 'constituency' | 'education', string>> = {};
  const allDelhi = f.constituency !== undefined && norm(aliasLabel('constituency', f.constituency)) === 'delhi';
  for (const k of ['party', 'constituency', 'education'] as const) if (f[k] && !(k === 'constituency' && allDelhi)) labels[k] = resolveLabel(k, f[k]!, data);
  return data.filter(c => {
    if (f.reservation && (f.reservation === 'general' ? c.reservation !== null : c.reservation !== f.reservation)) return false;
    if (allDelhi && !/\bdelhi\b/i.test(c.constituency)) return false;
    if (f.winner !== undefined && /\bWinner\)?\s*$/i.test(c.name) !== f.winner) return false;
    for (const k of ['party', 'constituency', 'education'] as const) if (labels[k] && norm(c[k]) !== norm(labels[k]!)) return false;
    for (const [suffix, value] of [['age', c.age], ['criminal_cases', c.criminalCases], ['assets', c.assets], ['liabilities', c.liabilities], ['net_worth', c.netWorth]] as const) {
      const lo = f[`min_${suffix}`], hi = f[`max_${suffix}`];
      if (lo !== undefined && value < lo || hi !== undefined && value > hi) return false;
    }
    return true;
  });
}
const display = (c: CleanCandidate) => ({ ...c, winnerMarkedInSheet: /\bWinner\)?\s*$/i.test(c.name), assetsRupees: c.assets, liabilitiesRupees: c.liabilities, netWorthRupees: c.netWorth, assets: formatRupees(c.assets), liabilities: formatRupees(c.liabilities), netWorth: formatRupees(c.netWorth) });
const limitOf = (n?: number) => Math.max(1, Math.min(10, Math.floor(n ?? 10)));
export function toolSearchCandidates(args: SearchArgs, data: CleanCandidate[]) {
  const filtered = applyFilters(data, args), key = args.sort_by ?? 'assets', direction = args.order === 'asc' ? 1 : -1;
  const value = (c: CleanCandidate) => key === 'criminal_cases' ? c.criminalCases : key === 'net_worth' ? c.netWorth : c[key];
  filtered.sort((a, b) => {
    const x = value(a), y = value(b);
    return (typeof x === 'string' ? x.localeCompare(String(y)) : x - Number(y)) * direction || Number(a.id) - Number(b.id);
  });
  const shown = filtered.slice(0, limitOf(args.limit));
  return { total: filtered.length, shown: shown.length, candidates: shown.map(display) };
}
export function toolGetCandidate(args: GetCandidateArgs, data: CleanCandidate[]) {
  const key = norm(args.name);
  const exact = data.filter(c => norm(c.name) === key && (!args.candidate_id || c.id === args.candidate_id));
  if (exact.length === 1) return { found: true, candidate: display(exact[0]) };
  const possible = exact.length ? exact : data.filter(c => norm(c.name).includes(key) || distance(norm(c.name), key) <= 3);
  const matches = possible.length ? possible : data.filter(c => key.split(' ').some(w => w.length > 2 && norm(c.name).includes(w)));
  return { found: false, needsClarification: true, totalMatches: matches.length, closeMatches: matches.slice(0, 10).map(c => ({ id: c.id, name: c.name, party: c.party, constituency: c.constituencyRaw })) };
}
export function toolAggregate(args: AggregateArgs, data: CleanCandidate[]) {
  const filtered = applyFilters(data, args.filters ?? {}), map = new Map<string, CleanCandidate[]>();
  for (const c of filtered) { const key = args.group_by === 'all' ? 'All matching candidates' : c[args.group_by]; map.set(key, [...(map.get(key) ?? []), c]); }
  const groups = [...map].map(([label, items]) => {
    let numericValue: number;
    switch (args.metric) {
      case 'count': numericValue = items.length; break;
      case 'total_assets': numericValue = items.reduce((s, c) => s + c.assets, 0); break;
      case 'avg_liabilities': numericValue = items.reduce((s, c) => s + c.liabilities, 0) / items.length; break;
      case 'total_liabilities': numericValue = items.reduce((s, c) => s + c.liabilities, 0); break;
      case 'avg_net_worth': numericValue = items.reduce((s, c) => s + c.netWorth, 0) / items.length; break;
      case 'total_net_worth': numericValue = items.reduce((s, c) => s + c.netWorth, 0); break;
      case 'min_age': numericValue = Math.min(...items.map(c => c.age)); break;
      case 'max_age': numericValue = Math.max(...items.map(c => c.age)); break;
      case 'avg_criminal_cases': numericValue = items.reduce((s, c) => s + c.criminalCases, 0) / items.length; break;
      case 'candidates_with_cases': numericValue = items.filter(c => c.criminalCases > 0).length; break;
      case 'percentage_with_cases': numericValue = items.filter(c => c.criminalCases > 0).length * 100 / items.length; break;
      case 'avg_age': numericValue = items.reduce((s, c) => s + c.age, 0) / items.length; break;
      case 'avg_assets': numericValue = items.reduce((s, c) => s + c.assets, 0) / items.length; break;
      case 'total_criminal_cases': numericValue = items.reduce((s, c) => s + c.criminalCases, 0); break;
      case 'max_assets': numericValue = Math.max(...items.map(c => c.assets)); break;
    }
    return { label, numericValue, value: ['avg_assets', 'max_assets', 'total_assets', 'avg_liabilities', 'total_liabilities', 'avg_net_worth', 'total_net_worth'].includes(args.metric) ? formatRupees(numericValue) : numericValue, count: items.length };
  });
  groups.sort((a, b) => (a.numericValue - b.numericValue) * (args.order === 'asc' ? 1 : -1) || a.label.localeCompare(b.label));
  return { total: filtered.length, groupBy: args.group_by, metric: args.metric, totalGroups: groups.length, shownGroups: Math.min(groups.length, limitOf(args.limit)), groups: groups.slice(0, limitOf(args.limit)) };
}
function validate(name: string, args: unknown): asserts args is Record<string, unknown> {
  const declaration = TOOL_DECLARATIONS.find(t => t.name === name);
  if (!declaration) throw new Error('Unknown tool');
  function check(value: unknown, schema: any): void {
    if (schema.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
      const obj = value as Record<string, unknown>;
      for (const k of schema.required ?? []) if (!(k in obj)) throw new Error(`Missing ${k}`);
      for (const [k, v] of Object.entries(obj)) {
        if (!(k in schema.properties)) throw new Error(`Unknown argument ${k}`);
        check(v, schema.properties[k]);
      }
    } else if (schema.type === 'boolean') {
      if (typeof value !== 'boolean') throw new Error('Invalid boolean argument');
    } else if (schema.type === 'string') {
      if (typeof value !== 'string' || !value.trim() || value.length > 300) throw new Error('Invalid text argument');
    } else if (typeof value !== 'number' || !Number.isFinite(value) || (value < 0 && schema.minimum === 0) || (schema.type === 'integer' && !Number.isInteger(value))) throw new Error('Invalid numeric argument');
    if (schema.enum && !schema.enum.includes(value)) throw new Error('Invalid argument choice');
    if (schema.minimum !== undefined && Number(value) < schema.minimum || schema.maximum !== undefined && Number(value) > schema.maximum) throw new Error('Argument outside allowed range');
  }
  check(args, declaration.parameters);
  const f = (args as Record<string, unknown>).filters ?? args;
  for (const k of ['age', 'assets', 'criminal_cases', 'liabilities', 'net_worth']) {
    const obj = f as Record<string, number>;
    if (obj[`min_${k}`] !== undefined && obj[`max_${k}`] !== undefined && obj[`min_${k}`] > obj[`max_${k}`]) throw new Error('Minimum exceeds maximum');
  }
}
export function executeTool(name: string, args: unknown, data: CleanCandidate[]) {
  try {
    validate(name, args);
    switch (name) {
      case 'search_candidates': return toolSearchCandidates(args as SearchArgs, data);
      case 'get_candidate': return toolGetCandidate(args as unknown as GetCandidateArgs, data);
      case 'aggregate': return toolAggregate(args as unknown as AggregateArgs, data);
      default: throw new Error('Unknown tool');
    }
  } catch (error) {
    if (error instanceof Clarification) return { needsClarification: true, field: error.field, query: error.query, closeMatches: error.matches };
    return { error: error instanceof Error ? error.message : 'Invalid tool arguments' };
  }
}
