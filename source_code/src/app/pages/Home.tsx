"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BarChart3, ChevronDown, ChevronLeft, ChevronRight, FileCheck2, FileText, GraduationCap, MapPin, MessageSquare, RefreshCw, Scale, Search, ShieldCheck, SlidersHorizontal, Sparkles, Users, Wallet } from "lucide-react";
import type { CleanCandidate } from "@/lib/buildAssistantData";

type DashboardData = {
  summary: { candidates: number; constituencies: number; parties: number; declaredCases: number; withCases: number; noCases: number; averageAge: number };
  parties: Array<{ party: string; count: number }>;
  constituencies: string[];
  candidates: CleanCandidate[]; total: number; page: number; pages: number;
};
const money = (n: number) => n >= 1e7 ? `Rs ${(n / 1e7).toFixed(2)} crore` : n >= 1e5 ? `Rs ${(n / 1e5).toFixed(2)} lakh` : `Rs ${n.toLocaleString("en-IN")}`;
const displayName = (name: string) => name.replace(/\s*\(?Winner\)?\s*$/i, "").trim();
const filters = [
  { value: "no-cases", label: "No declared cases", icon: ShieldCheck },
  { value: "crorepati", label: "Assets ≥ Rs 1 crore", icon: Wallet },
  { value: "under-40", label: "Under 40", icon: Users },
  { value: "highest-assets", label: "Highest assets", icon: BarChart3 },
];

export function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [query, setQuery] = useState("");
  const [constituency, setConstituency] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ q: query, constituency, filter, page: String(page) });
        const response = await fetch(`/api/dashboard?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("The candidate directory could not load. Please try again.");
        const result = await response.json() as DashboardData;
        setData(result);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load candidates.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, constituency, filter, page, retry]);
  const summary = data?.summary;
  const reset = () => { setQuery(""); setConstituency(""); setFilter(""); setPage(1); };
  const hasFilters = !!(query || constituency || filter);

  return (
    <div className="dashboard-page">
      <section className="dashboard-heading"><div><p className="section-eyebrow">THE OVERVIEW</p><h1>Your election workspace</h1><p>Make sense of the declarations. Explore with confidence.</p></div><span className="dataset-label"><FileText size={15} />Candidate Detailed Info</span></section>

      <section className="dashboard-hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy"><span className="hero-eyebrow"><span /> CLARITY STARTS WITH THE FACTS</span><h2>Know the people.<br />Understand the <em>record.</em></h2><p>Explore candidate declarations, compare the details, and get answers grounded in the data.</p><div className="hero-buttons"><Link href="/verification" className="button-amber"><FileCheck2 size={18} />Explore verification</Link><Link href="/chat" className="button-glass"><Sparkles size={17} />Ask the AI assistant</Link></div><div className="hero-footnote"><ShieldCheck size={15} />Candidate affidavits, as recorded in the sheet.</div></div>
        <div className="hero-visual" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="floating-label"><span className="floating-icon"><Users size={17} /></span><span><strong>{summary?.candidates.toLocaleString("en-IN") ?? "—"}</strong><small>candidate records</small></span></div><div className="hero-document"><div className="document-topline"><span className="document-mark"><ShieldCheck size={25} /></span><span>CANDIDATE<br /><strong>AT A GLANCE</strong></span><FileText size={17} /></div><div className="document-profile"><div className="document-avatar"><Users size={25} /></div><div><i /><i /></div></div><div className="document-row"><Wallet size={16} /><span>Assets & liabilities</span><span className="document-check">Declared</span></div><div className="document-row"><GraduationCap size={16} /><span>Education & age</span><span className="document-check">On record</span></div><div className="document-row"><FileCheck2 size={16} /><span>Candidate declarations</span><span className="document-check">Explore</span></div><div className="document-bottom"><span />INFORMATION, IN PERSPECTIVE</div></div><div className="hero-language-tag"><Sparkles size={16} /><span>One assistant. Four languages.</span></div></div>
      </section>

      <section className="dashboard-stats" aria-label="Candidate sheet overview">
        {[{ label: "Candidate records", value: summary?.candidates, icon: Users, note: "People behind the declarations", tone: "blue" }, { label: "Constituencies", value: summary?.constituencies, icon: MapPin, note: "Distinct normalized sheet labels", tone: "teal" }, { label: "Political parties", value: summary?.parties, icon: Scale, note: "Distinct party labels in the sheet", tone: "violet" }, { label: "Declared cases", value: summary?.declaredCases, icon: FileText, note: "Declared cases, not convictions", tone: "amber" }].map(stat => <article key={stat.label} className={`dashboard-stat tone-${stat.tone}`}><div className="stat-top"><span>{stat.label}</span><span className="stat-icon"><stat.icon size={19} /></span></div><strong>{stat.value?.toLocaleString("en-IN") ?? "—"}</strong><p>{stat.note}</p></article>)}
      </section>

      <section className="workspace-tools" aria-label="Explore the platform">
        {[{ href: "/verification", icon: FileCheck2, title: "Verify the details", text: "Cross-check declarations across available records.", color: "blue" }, { href: "/compare", icon: Scale, title: "See them side by side", text: "Bring up to three candidate profiles into focus.", color: "teal" }, { href: "/chat", icon: Sparkles, title: "Turn questions into clarity", text: "Ask in English, Hinglish, हिन्दी or मराठी.", color: "violet" }].map(tool => <Link key={tool.href} href={tool.href} className={`workspace-tool tone-${tool.color}`}><span className="tool-icon"><tool.icon size={22} /></span><div><h3>{tool.title}</h3><p>{tool.text}</p></div><ChevronRight size={18} className="tool-chevron" /></Link>)}
      </section>

      <div className="dashboard-lower">
        <section className="directory-panel" id="candidate-directory">
          <div className="panel-heading"><div><p className="section-eyebrow">LOOK A LITTLE CLOSER</p><h2>Explore the candidates</h2></div><span className="count-pill">{data?.total.toLocaleString("en-IN") ?? "—"} records</span></div>
          <div className="directory-controls"><div className="directory-search"><Search size={19} /><input aria-label="Search candidates" placeholder="Name, party or constituency…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div><div className="directory-select"><MapPin size={16} /><select aria-label="Filter by constituency" value={constituency} onChange={e => { setConstituency(e.target.value); setPage(1); }}><option value="">All constituencies</option>{data?.constituencies.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown size={15} /></div></div>
          <div className="directory-filters"><SlidersHorizontal size={16} aria-hidden="true" />{filters.map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} className={filter === item.value ? "selected" : ""} onClick={() => { setFilter(filter === item.value ? "" : item.value); setPage(1); }}><item.icon size={14} />{item.label}</button>)}{hasFilters && <button type="button" onClick={reset} className="clear-filters">Clear filters</button>}</div>
          {error ? <div role="alert" className="directory-empty"><AlertCircle size={28} /><h3>Let’s try that again</h3><p>{error}</p><button onClick={() => setRetry(n => n + 1)}><RefreshCw size={15} />Retry</button></div> : loading ? <div className="candidate-directory-grid" aria-label="Loading candidates" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="directory-skeleton" key={i}><span /><i /><i /><i /></div>)}</div> : !data?.candidates.length ? <div className="directory-empty"><Search size={30} /><h3>No matches just yet</h3><p>Try a different name or widen your filters.</p><button onClick={reset}>Reset filters</button></div> : <><div className="candidate-directory-grid">{data.candidates.map((c, index) => <Link key={c.id} href={`/candidate/${c.id}`} className="directory-candidate"><div className="candidate-top"><span className={`candidate-monogram avatar-${index % 4}`}>{displayName(c.name).split(" ").filter(Boolean).map(s => s[0]).slice(0, 2).join("")}</span><span className="candidate-party" title={c.party}>{c.party}</span></div><h3>{displayName(c.name)}</h3><p className="candidate-location"><MapPin size={13} /><span>{c.constituencyRaw}</span></p><div className="candidate-figures"><div><span>Declared assets</span><strong>{money(c.assets)}</strong></div><div><span>Declared cases</span><strong>{c.criminalCases}</strong></div></div><div className="candidate-card-bottom"><span>Age {c.age}</span><span>View profile <ChevronRight size={14} /></span></div></Link>)}</div><div className="directory-pagination"><span>Page {data.page} of {data.pages} <span className="pagination-total">· {data.total} matches</span></span><div><button type="button" aria-label="Previous page" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}><ChevronLeft size={17} /></button><button type="button" aria-label="Next page" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}><ChevronRight size={17} /></button></div></div></>}
        </section>
        <aside className="dashboard-right">
          <section className="party-panel"><div className="panel-heading"><div><p className="section-eyebrow">THE DATA LANDSCAPE</p><h2>Party representation</h2></div><BarChart3 size={21} /></div><p className="panel-description">Six largest party labels by candidate count in this sheet.</p><div className="party-bars">{data?.parties.map(p => <div key={p.party}><div className="party-bar-label"><span title={p.party}>{p.party}</span><strong>{p.count}</strong></div><div className="party-bar-track"><div style={{ width: `${p.count / Math.max(...data.parties.map(party => party.count)) * 100}%` }} /></div></div>) ?? <p className="panel-description">Loading the overview…</p>}</div><div className="party-panel-note"><FileText size={15} />IND is the independent label in the sheet.</div></section>
          <section className="snapshot-panel"><span className="snapshot-icon"><ShieldCheck size={22} /></span><p className="section-eyebrow">A NOTE ON THE NUMBERS</p><h2>Declarations.<br />With context.</h2><p><strong>{summary?.noCases.toLocaleString("en-IN") ?? "—"}</strong> candidates have declared zero criminal cases in this sheet.</p><p>Declared cases are not convictions. Each figure is a starting point for understanding the record.</p><Link href="/chat">Ask about the data <MessageSquare size={16} /></Link></section>
        </aside>
      </div>
      <div className="dashboard-source"><ShieldCheck size={18} /><p>Figures come from candidate affidavits as recorded in the Candidate Detailed Info sheet. Explore verification for comparisons across sources. This platform does not recommend voting choices.</p></div>
    </div>
  );
}
