"use client";
import { useState, useEffect } from "react";
import { CredibilityScore } from "../components/CredibilityScore";
import { Button } from "../components/ui/button";
import { Candidate } from "../data/mockData";
import {
  AlertCircle,
  TrendingUp,
  GraduationCap,
  Award,
  ChevronDown,
  Trophy,
  MapPin,
  Info,
  X,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function Comparison() {
  const regions = ["all", "Delhi", "Kerala", "Maharashtra", "Karnataka"];
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [filterState, setFilterState] = useState<string>("all");
  const [filterConstituency, setFilterConstituency] = useState<string>("");
  const [constituencies, setConstituencies] = useState<{ constituency: string; state: string; count: number }[]>([]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "1000");
    fetch(`/api/candidates?${params}`)
      .then(async (res) => {
        if (!res.ok) return { candidates: [] };
        return res.json();
      })
      .then((data) => {
        setAllCandidates(data.candidates || []);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  useEffect(() => {
    fetch(`/api/constituencies?state=${filterState}`)
      .then(async (res) => res.ok ? res.json() : { constituencies: [] })
      .then((data) => setConstituencies(data.constituencies || []))
      .catch(() => undefined);
  }, [filterState]);

  const comparedCandidates = allCandidates.filter((c) => selectedCandidates.includes(c.id));
  const regionCounts = allCandidates.reduce<Record<string, number>>((counts, candidate) => {
    if (candidate.state) counts[candidate.state] = (counts[candidate.state] || 0) + 1;
    return counts;
  }, {});
  const visibleCandidates = allCandidates.filter((candidate) => {
    const matchesState = filterState === "all" || candidate.state === filterState;
    const matchesConstituency = !filterConstituency || candidate.constituency === filterConstituency;
    return matchesState && matchesConstituency;
  });

  const radarData = [
    {
      metric: "Criminal Risk",
      ...comparedCandidates.reduce((acc, c) => ({ ...acc, [c.name]: c.criminalRisk }), {}),
    },
    {
      metric: "Financial",
      ...comparedCandidates.reduce((acc, c) => ({ ...acc, [c.name]: c.financialTransparency }), {}),
    },
    {
      metric: "Performance",
      ...comparedCandidates.reduce((acc, c) => ({ ...acc, [c.name]: c.performance }), {}),
    },
  ];

  const barData = comparedCandidates.map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    "Criminal Cases": c.criminalCases,
    Score: c.credibilityScore,
  }));

  const colors = ["#1E3A8A", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

  function parseDeclaredAmount(value: string) {
    const match = value.match(/([\d,.]+)\s*(Cr|Lakh)?/i);
    if (!match) return 0;
    const amount = Number(match[1].replace(/,/g, ""));
    const unit = match[2]?.toLowerCase();
    return amount * (unit === "cr" ? 10000000 : unit === "lakh" ? 100000 : 1);
  }

  function educationScore(value: string) {
    const text = value.toLowerCase().replace(/[.,]/g, " ");
    if (/(doctorate|ph\.?d|m\.?d|ll\.?b|professional degree)/i.test(text)) return 100;
    if (/(post graduate|postgraduate|post-graduate)/i.test(text)) return 85;
    if (/(graduate professional|graduate degree|graduate|b\.?a|b\.?sc|b\.?tech|b\.?com)/i.test(text)) return 70;
    if (/(higher secondary|12th|twelfth)/i.test(text)) return 50;
    if (/(secondary|10th|matriculation)/i.test(text)) return 35;
    if (/(8th|5th|literate|primary|below 10th)/i.test(text)) return 20;
    return 10;
  }

  function scoreBreakdown(candidate: Candidate) {
    const legal = Math.round(100 / (1 + candidate.criminalCases));
    const education = educationScore(candidate.education);
    const assets = parseDeclaredAmount(candidate.assets);
    const liabilities = parseDeclaredAmount(candidate.liabilities || "₹0");
    const financial = Math.round(Math.max(0, (1 - liabilities / (assets + 1)) * 100));
    return { legal, education, financial };
  }

  const bestCandidate = [...comparedCandidates].sort((a, b) => b.credibilityScore - a.credibilityScore)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#172d72] via-[#1e3a8a] to-[#2563b8] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Make an informed choice</p>
            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Candidate Comparison</h1>
            <p className="max-w-2xl text-sm leading-6 text-blue-100">
              Compare up to three candidates across Delhi, Kerala, Maharashtra, and Karnataka using the same transparent metrics.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-left sm:min-w-36">
            <p className="text-xs text-blue-200">Candidates selected</p>
            <p className="mt-1 text-2xl font-bold">{comparedCandidates.length}<span className="text-base font-normal text-blue-200"> / 3</span></p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">Filter by region</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            {regions.map((s) => (
              <button
                key={s}
                onClick={() => { setFilterState(s); setFilterConstituency(""); }}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  filterState === s
                    ? "bg-[#1e3a8a] text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-[#1e3a8a]"
                }`}
              >
                {s === "all" ? "All Regions" : `${s} (${regionCounts[s] || 0})`}
              </button>
            ))}
          </div>
          <select
            value={filterConstituency}
            onChange={(e) => setFilterConstituency(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white"
          >
            <option value="">All Constituencies</option>
            {constituencies.map((c) => (
              <option key={c.constituency} value={c.constituency}>
                {c.constituency} ({c.count})
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500">Change regions to select candidates from another region without losing your current selections.</p>
      </div>

      {/* Candidate Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="flex items-center justify-between w-full"
        >
          <span className="flex items-center gap-2 font-semibold text-gray-900">
            Select candidates
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-[#1e3a8a]">{comparedCandidates.length}/3</span>
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showSelector ? "rotate-180" : ""}`} />
        </button>
        {comparedCandidates.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {comparedCandidates.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 py-1.5 pl-2 pr-1.5">
                <img src={candidate.photo} alt="" className="h-7 w-7 rounded-full" />
                <span className="max-w-40 truncate text-xs font-semibold text-[#172d72]">{candidate.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${candidate.name}`}
                  onClick={() => setSelectedCandidates((current) => current.filter((id) => id !== candidate.id))}
                  className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {showSelector && (
          <div className="mt-4">
            <p className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4 text-[#1e3a8a]" />
              Choose up to three candidates. Use the region filter to browse another region; existing selections remain saved.
            </p>
          <div className="grid max-h-80 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            {loading ? (
              <p className="text-sm text-gray-500 col-span-2">Loading candidates...</p>
            ) : (
              visibleCandidates.map((candidate) => (
                <label
                  key={candidate.id}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-colors ${
                    !selectedCandidates.includes(candidate.id) && selectedCandidates.length >= 3
                      ? "cursor-not-allowed border-slate-100 opacity-50"
                      : "cursor-pointer hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCandidates.includes(candidate.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (selectedCandidates.length < 3) {
                          setSelectedCandidates([...selectedCandidates, candidate.id]);
                        }
                      } else {
                        setSelectedCandidates(selectedCandidates.filter((cid) => cid !== candidate.id));
                      }
                    }}
                    disabled={!selectedCandidates.includes(candidate.id) && selectedCandidates.length >= 3}
                    className="h-4 w-4 accent-[#1e3a8a]"
                  />
                  <img src={candidate.photo} alt={candidate.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{candidate.name}</p>
                    <p className="text-xs text-gray-500 truncate">{candidate.party} · {candidate.constituency}</p>
                  </div>
                </label>
              ))
            )}
            {!loading && visibleCandidates.length === 0 && (
              <p className="col-span-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No candidates are available for this region yet.
              </p>
            )}
          </div>
          </div>
        )}
      </div>

      {comparedCandidates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500">Select candidates to compare</p>
        </div>
      ) : (
        <>
          {/* Best Candidate Highlight */}
          {bestCandidate && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">Top Rated Candidate</h3>
                  <p className="text-gray-700">
                    <strong>{bestCandidate.name}</strong> has the highest credibility score of{" "}
                    <strong>{bestCandidate.credibilityScore}</strong> among selected candidates, with {bestCandidate.criminalCases} criminal cases
                    and {bestCandidate.assets} in declared assets.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Credibility Score Comparison */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Credibility Scores</h2>
                <p className="mt-1 text-sm text-gray-500">A 0–100 composite score based on affidavit data.</p>
              </div>
              <Award className="hidden h-6 w-6 text-[#f59e0b] sm:block" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {comparedCandidates.map((candidate) => (
                <div key={candidate.id} className="text-center">
                  <img
                    src={candidate.photo}
                    alt={candidate.name}
                    className="w-16 h-16 rounded-full mx-auto mb-3 ring-4 ring-gray-100"
                  />
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">{candidate.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{candidate.constituency}</p>
                  <CredibilityScore score={candidate.credibilityScore} size="sm" />
                  <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                    {Object.entries(scoreBreakdown(candidate)).map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-slate-50 px-1 py-1.5">
                        <span className="block font-bold text-slate-700">{value}</span>
                        <span className="capitalize">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#1e3a8a]" />
              <div>
                <h2 className="font-semibold text-[#172d72]">How the credibility score is calculated</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  CCI = (100 / (1 + C)) × 0.50 + E × 0.20 + max(0, (1 − L / (A + 1)) × 100) × 0.30.
                  Here, C is pending criminal cases, E is the education score, A is declared assets, and L is declared liabilities.
                  Education is scored from 10 to 100 using the affidavit education bands. A candidate reaches 100 only when all three
                  components are 100: zero criminal cases, a 100-point education category, and zero liabilities. The final score is rounded
                  to the nearest whole number.
                </p>
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Metrics</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                {comparedCandidates.map((candidate, index) => (
                  <Radar
                    key={candidate.id}
                    name={candidate.name.split(" ")[0]}
                    dataKey={candidate.name}
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart Comparison */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Key Metrics Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Score" fill="#1E3A8A" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Criminal Cases" fill="#EF4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Metric
                    </th>
                    {comparedCandidates.map((candidate) => (
                      <th
                        key={candidate.id}
                        className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                      >
                        {candidate.name.length > 15 ? candidate.name.slice(0, 15) + "…" : candidate.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <ComparisonRow
                    label="Credibility Score"
                    icon={Award}
                    values={comparedCandidates.map((c) => c.credibilityScore.toString())}
                    highlight
                  />
                  <ComparisonRow
                    label="Criminal Cases"
                    icon={AlertCircle}
                    values={comparedCandidates.map((c) => c.criminalCases.toString())}
                  />
                  <ComparisonRow
                    label="Assets"
                    icon={TrendingUp}
                    values={comparedCandidates.map((c) => c.assets)}
                  />
                  <ComparisonRow
                    label="Liabilities"
                    icon={TrendingUp}
                    values={comparedCandidates.map((c) => c.liabilities || "₹0")}
                  />
                  <ComparisonRow
                    label="Education"
                    icon={GraduationCap}
                    values={comparedCandidates.map((c) => c.education)}
                  />
                  <ComparisonRow
                    label="Age"
                    icon={Award}
                    values={comparedCandidates.map((c) => `${c.age} years`)}
                  />
                  <ComparisonRow
                    label="Constituency"
                    icon={MapPin}
                    values={comparedCandidates.map((c) => c.constituency)}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ComparisonRow({
  label,
  icon: Icon,
  values,
  highlight = false,
}: {
  label: string;
  icon: any;
  values: string[];
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-blue-50" : ""}>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
      </td>
      {values.map((value, index) => (
        <td key={index} className="px-4 py-4 text-center">
          <span className={`text-sm ${highlight ? "font-semibold text-blue-900" : "text-gray-700"}`}>
            {value}
          </span>
        </td>
      ))}
    </tr>
  );
}
