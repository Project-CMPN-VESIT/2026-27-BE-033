export interface DetailedSource {
  name: string;
  party: string;
  criminalCases: number;
  education: string;
  age: number | null;
  totalAssets: string;
  liabilities: string;
  constituency: string;
}

export interface AdrSource {
  found: boolean;
  matchType: "exact" | "fuzzy" | "none";
  matchScore: number;
  sNo: number | null;
  page: number | null;
  name: string;
  state: string;
  constituency: string;
  party: string;
  age: number | null;
  movableAssets: string;
  immovableAssets: string;
  totalAssets: string;
  panGiven: string;
}

export interface QwenSource {
  found: boolean;
  matchType: "exact" | "fuzzy" | "none";
  srNo: number | null;
  name: string;
  criminalCases: number | null;
  education: string;
  liabilities: string;
}

export interface VerificationCandidate {
  id: string;
  srNo: number;
  name: string;
  displayName: string;
  isWinner: boolean;
  party: string;
  constituency: string;
  state: string;
  detailed: DetailedSource;
  adr: AdrSource;
  qwen: QwenSource;
}

export interface VerificationDataset {
  generatedAt: string;
  sources: {
    detailed: { file: string; sheet: string; rowCount: number };
    adr: { file: string; pageCount: number; recordCount: number };
    qwen: { file: string; sheet: string; rowCount: number };
  };
  candidates: VerificationCandidate[];
}

export type FieldCheckStatus = "match" | "differs" | "missing" | "not-compared";

export interface FieldCheck {
  field: string;
  detailed: string;
  adr: string;
  qwen: string;
  status: FieldCheckStatus;
}

export interface VerificationSummary {
  matched: number;
  differing: number;
  missing: number;
  totalCompared: number;
}

export interface VerificationCandidateResponse extends VerificationCandidate {
  checks: FieldCheck[];
  summary: VerificationSummary;
}

export interface VerificationListItem {
  id: string;
  srNo: number;
  name: string;
  displayName: string;
  isWinner: boolean;
  party: string;
  constituency: string;
  state: string;
  adrFound: boolean;
  adrMatchType: "exact" | "fuzzy" | "none";
  qwenFound: boolean;
}

export interface VerificationCoverage {
  total: number;
  adrFound: number;
  adrExact: number;
  adrFuzzy: number;
  adrMissing: number;
  qwenFound: number;
  qwenMissing: number;
}
