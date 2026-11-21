import { NextResponse } from 'next/server';
import records from '@/lib/data/candidates_clean.json';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get('q') ?? '').trim().toLowerCase();
  const constituency = params.get('constituency') ?? '';
  const filter = params.get('filter') ?? '';
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
  const pageSize = 9;
  const constituencies = [...new Set(records.map(c => c.constituency))].sort((a, b) => a.localeCompare(b));
  const partyCounts = new Map<string, number>();
  for (const c of records) partyCounts.set(c.party, (partyCounts.get(c.party) ?? 0) + 1);
  let matches = records.filter(c => (!query || [c.name, c.party, c.constituency].some(s => s.toLowerCase().includes(query))) && (!constituency || c.constituency === constituency));
  if (filter === 'no-cases') matches = matches.filter(c => c.criminalCases === 0);
  if (filter === 'crorepati') matches = matches.filter(c => c.assets >= 10000000);
  if (filter === 'under-40') matches = matches.filter(c => c.age < 40);
  if (filter === 'highest-assets') matches = [...matches].sort((a, b) => b.assets - a.assets || Number(a.id) - Number(b.id));
  const total = matches.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  return NextResponse.json({
    summary: {
      candidates: records.length, constituencies: constituencies.length, parties: partyCounts.size,
      declaredCases: records.reduce((s, c) => s + c.criminalCases, 0),
      withCases: records.filter(c => c.criminalCases > 0).length,
      noCases: records.filter(c => c.criminalCases === 0).length,
      averageAge: Math.round(records.reduce((s, c) => s + c.age, 0) / records.length),
    },
    parties: [...partyCounts].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([party, count]) => ({ party, count })),
    constituencies,
    candidates: matches.slice((currentPage - 1) * pageSize, currentPage * pageSize), total, page: currentPage, pages,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
