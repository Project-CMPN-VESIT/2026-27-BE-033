import * as XLSX from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export interface CleanCandidate {
  id: string; name: string; party: string; constituency: string; constituencyRaw: string;
  constituencyKey: string; reservation: 'SC' | 'ST' | null;
  education: string; age: number; criminalCases: number; assets: number; liabilities: number;
  netWorth: number; net_worth: number;
}
const text = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
export function parseRupees(raw: string): number {
  const value = raw.replace(/Rs\.?/gi, '').replace(/[\s,\u00a0]/g, '');
  if (/^nil$/i.test(value)) return 0;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Invalid rupee value: ${raw}`);
  return Number(value);
}
export function build(sourcePath: string): CleanCandidate[] {
  const workbook = XLSX.read(fs.readFileSync(sourcePath));
  if (workbook.SheetNames.length !== 1) throw new Error('Expected exactly one sheet');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
  const headers = rows[0].map(text);
  const required = ['Sr.no', 'Candidate', 'Political Party', 'Criminal Cases', 'Education', 'Age', 'Total Assets', 'Liabilities', 'Constituency'];
  for (const label of required) if (!headers.includes(label)) throw new Error(`Missing column: ${label}`);
  const ids = new Set<string>(), labels = new Map<string, string>();
  function canonical(field: string, raw: string) {
    const key = `${field}:${raw.toLowerCase()}`;
    const result = labels.get(key) ?? raw;
    labels.set(key, result); return result;
  }
  return rows.slice(1).filter(row => row.some(v => text(v))).map((row, index) => {
    const read = (label: string) => text(row[headers.indexOf(label)]);
    const integer = (label: string) => {
      const raw = read(label), n = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(n)) throw new Error(`Invalid ${label} at row ${index + 2}`);
      return n;
    };
    const id = String(integer('Sr.no'));
    if (ids.has(id)) throw new Error(`Duplicate Sr.no: ${id}`);
    ids.add(id);
    const name = read('Candidate'), constituencyRaw = read('Constituency');
    if (!name || !constituencyRaw || !read('Education') || !read('Political Party')) throw new Error(`Missing text at row ${index + 2}`);
    const tag = /\(\s*(SC|ST)\s*\)/i.exec(constituencyRaw);
    const cleaned = text(constituencyRaw.replace(/\(\s*(SC|ST)\s*\)/gi, ''));
    const assets = parseRupees(read('Total Assets')), liabilities = parseRupees(read('Liabilities'));
    return { id, name, party: canonical('party', read('Political Party')), constituency: canonical('constituency', cleaned), constituencyRaw, constituencyKey: cleaned.toLowerCase(), reservation: tag ? tag[1].toUpperCase() as 'SC' | 'ST' : null, education: canonical('education', read('Education')), age: integer('Age'), criminalCases: integer('Criminal Cases'), assets, liabilities, netWorth: assets - liabilities, net_worth: assets - liabilities };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const source = path.resolve(process.argv[2] ?? '../Candidate Affidavits/Candidate Detailed Info.xlsx');
  const data = build(source), output = path.resolve('src/lib/data');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'candidates_clean.json'), JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'assistant_source.json'), JSON.stringify({ source: path.relative(process.cwd(), source).split(path.sep).join('/'), count: data.length }, null, 2) + '\n');
  console.log(`Cleaned ${data.length} candidates from ${source}`);
}
