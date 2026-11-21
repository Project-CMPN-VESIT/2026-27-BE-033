"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";

type CandidateListItem = {
  id: string;
  displayName: string;
  party: string;
  constituency: string;
  state: string;
  adrFound: boolean;
  adrMatchType: "exact" | "fuzzy" | "none";
  qwenFound: boolean;
};

type FieldCheck = {
  field: string;
  detailed: string;
  adr: string;
  qwen: string;
  status: "match" | "differs" | "missing" | "not-compared";
};

type VerificationResponse = {
  candidate: {
    displayName: string;
    party: string;
    constituency: string;
    state: string;
    adr: {
      found: boolean;
      matchType: "exact" | "fuzzy" | "none";
      matchScore: number;
      page: number | null;
    };
    qwen: { found: boolean; matchType: "exact" | "fuzzy" | "none" };
  };
  checks: FieldCheck[];
  summary: { matched: number; differing: number; missing: number; totalCompared: number };
};

const sourceNames = [
  { key: "detailed" as const, label: "Candidate Detailed Info" },
  { key: "adr" as const, label: "ADR affidavit PDF" },
  { key: "qwen" as const, label: "Qwen Model data" },
];

function statusStyle(status: FieldCheck["status"]) {
  if (status === "match") return "border-green-200 bg-green-50";
  if (status === "differs") return "border-red-200 bg-red-50";
  return "border-amber-200 bg-amber-50";
}

function StatusIcon({ status }: { status: FieldCheck["status"] }) {
  if (status === "match") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "differs") return <XCircle className="h-4 w-4 text-red-600" />;
  return <AlertCircle className="h-4 w-4 text-amber-600" />;
}

export function Verification() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCandidate, setLoadingCandidate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoadingList(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (state !== "all") params.set("state", state);

    fetch(`/api/verification?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load candidates.");
        return response.json() as Promise<{ candidates: CandidateListItem[] }>;
      })
      .then((data) => {
        setCandidates(data.candidates);
        setSelectedId((current) =>
          data.candidates.some((candidate) => candidate.id === current)
            ? current
            : data.candidates[0]?.id ?? "",
        );
        setError("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load candidates.");
      })
      .finally(() => setLoadingList(false));

    return () => controller.abort();
  }, [search, state]);

  useEffect(() => {
    if (!selectedId) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    setLoadingCandidate(true);
    fetch(`/api/verification/${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load verification details.");
        return response.json() as Promise<VerificationResponse>;
      })
      .then((data) => {
        setResult(data);
        setError("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load verification details.");
      })
      .finally(() => setLoadingCandidate(false));

    return () => controller.abort();
  }, [selectedId]);

  const selected = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedId),
    [candidates, selectedId],
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-3 text-blue-100 ring-1 ring-white/20">
            <FileCheck2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Candidate Verification</h1>
            <p className="mt-1 text-sm text-blue-100">
              Cross-check candidate declarations against detailed records, ADR affidavits, and Qwen extraction.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {["Delhi", "Kerala", "Maharashtra", "Karnataka"].map((region) => (
            <button
              key={region}
              type="button"
              // Form-helper extensions can inject fdprocessedid before React hydrates.
              // Limit the escape hatch to native form controls, not the page tree.
              suppressHydrationWarning
              onClick={() => setState(region)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                state === region ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {region}
            </button>
          ))}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setState("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              state === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All states
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              suppressHydrationWarning
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidate, party, or constituency"
              className="pl-9"
            />
          </div>
          <select
            suppressHydrationWarning
            value={state}
            onChange={(event) => setState(event.target.value)}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            aria-label="Filter by state"
          >
            <option value="all">All states</option>
            <option value="Delhi">Delhi</option>
            <option value="Kerala">Kerala</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Karnataka">Karnataka</option>
          </select>
        </div>
        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="candidate-select">
          Select a candidate
        </label>
        <div className="relative mt-2">
          <select
            id="candidate-select"
            suppressHydrationWarning
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={loadingList || candidates.length === 0}
            className="h-12 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {candidates.length === 0 && <option value="">No candidates found</option>}
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.displayName} — {candidate.party} — {candidate.constituency}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
        {loadingList && <p className="mt-2 text-xs text-gray-500">Loading candidate names...</p>}
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {selected && result && !loadingCandidate && (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{result.candidate.displayName}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {result.candidate.party} · {result.candidate.constituency}, {result.candidate.state}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{result.candidate.adr.found ? `ADR ${result.candidate.adr.matchType}` : "ADR not found"}</Badge>
                <Badge variant="outline">{result.candidate.qwen.found ? `Qwen ${result.candidate.qwen.matchType}` : "Qwen not found"}</Badge>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-green-50 p-3"><strong className="block text-xl text-green-700">{result.summary.matched}</strong><span className="text-xs text-green-800">Matching</span></div>
              <div className="rounded-lg bg-red-50 p-3"><strong className="block text-xl text-red-700">{result.summary.differing}</strong><span className="text-xs text-red-800">Different</span></div>
              <div className="rounded-lg bg-amber-50 p-3"><strong className="block text-xl text-amber-700">{result.summary.missing}</strong><span className="text-xs text-amber-800">Missing</span></div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="hidden grid-cols-[160px_repeat(3,minmax(0,1fr))] gap-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
              <span>Field</span>
              {sourceNames.map((source) => <span key={source.key}>{source.label}</span>)}
            </div>
            {result.checks.map((check) => (
              <article key={check.field} className={`rounded-xl border p-4 ${statusStyle(check.status)}`}>
                <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <StatusIcon status={check.status} />
                  {check.field}
                  <span className="ml-auto text-xs font-medium uppercase text-gray-500">{check.status}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[check.detailed, check.adr, check.qwen].map((value, index) => (
                    <div key={sourceNames[index].key} className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs font-medium text-gray-500 md:hidden">{sourceNames[index].label}</p>
                      <p className="mt-1 min-h-5 break-words text-sm text-gray-900">{value || "\u00a0"}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
          <p className="text-xs text-gray-500">
            ADR source match: {Math.round(result.candidate.adr.matchScore * 100)}%
            {result.candidate.adr.page ? ` · PDF page ${result.candidate.adr.page}` : ""}. Values are displayed as extracted or supplied; a difference is not automatically proof of wrongdoing.
          </p>
        </>
      )}

      {loadingCandidate && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-10 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading verification details...
        </div>
      )}
    </div>
  );
}
