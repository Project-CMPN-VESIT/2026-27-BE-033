import type {
  FieldCheck,
  FieldCheckStatus,
  VerificationCandidate,
  VerificationSummary,
} from "./verificationTypes";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const stripPrefix = (s: string) =>
  s
    .replace(/\b(dr|adv|advocate|shri|sri|smt|shrimati|prof|professor|mr|mrs|ms|kum|kumari|winner|winners)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeConst = (c: string) =>
  norm(String(c || "").replace(/^Delhi\((.*)\)$/i, "$1").replace(/\s*\(NCT\)$/i, ""));

const amountValue = (value: string) => {
  const match = String(value || "").match(/[\d][\d,]*/);
  if (!match) return null;
  const digits = match[0].replace(/,/g, "");
  return digits ? Number(digits) : null;
};

const educationLevel = (value: string) => {
  const s = String(value || "").toLowerCase();
  if (!s) return "";
  if (s.includes("doctor") || s.includes("phd")) return "doctorate";
  if (s.includes("post") && (s.includes("graduate") || s.includes("graduation"))) return "post-graduate";
  if (s.includes("graduate") || s.includes("graduation")) return "graduate";
  if (s.includes("12")) return "12th";
  if (s.includes("10")) return "10th";
  if (s.includes("8")) return "8th";
  if (s.includes("5")) return "5th";
  if (s.includes("literate")) return "literate";
  if (s.includes("illiterate")) return "illiterate";
  if (s.includes("others") || s.includes("other")) return "others";
  return norm(s);
};

type SourceKey = "detailed" | "adr" | "qwen";

interface FieldDefinition {
  field: string;
  expected: SourceKey[];
  values: (c: VerificationCandidate) => Record<SourceKey, string>;
  compare: (a: string, b: string) => boolean;
}

const sameText = (a: string, b: string) => norm(stripPrefix(a)) === norm(stripPrefix(b));
const sameRawText = (a: string, b: string) => norm(a) === norm(b);
const sameConstituency = (a: string, b: string) => normalizeConst(a) === normalizeConst(b);
const sameNumber = (a: string, b: string) => {
  const na = amountValue(a);
  const nb = amountValue(b);
  return na !== null && nb !== null && na === nb;
};

const fields: FieldDefinition[] = [
  {
    field: "Name",
    expected: ["detailed", "adr", "qwen"],
    values: (c) => ({ detailed: c.detailed.name, adr: c.adr.name, qwen: c.qwen.name }),
    compare: sameText,
  },
  {
    field: "Party",
    expected: ["detailed", "adr"],
    values: (c) => ({ detailed: c.detailed.party, adr: c.adr.party, qwen: "" }),
    compare: sameRawText,
  },
  {
    field: "Constituency",
    expected: ["detailed", "adr"],
    values: (c) => ({ detailed: c.detailed.constituency, adr: c.adr.constituency, qwen: "" }),
    compare: sameConstituency,
  },
  {
    field: "Age",
    expected: ["detailed", "adr"],
    values: (c) => ({
      detailed: c.detailed.age === null ? "" : String(c.detailed.age),
      adr: c.adr.age === null ? "" : String(c.adr.age),
      qwen: "",
    }),
    compare: sameNumber,
  },
  {
    field: "Total assets",
    expected: ["detailed", "adr"],
    values: (c) => ({ detailed: c.detailed.totalAssets, adr: c.adr.totalAssets, qwen: "" }),
    compare: sameNumber,
  },
  {
    field: "Criminal cases",
    expected: ["detailed", "qwen"],
    values: (c) => ({
      detailed: String(c.detailed.criminalCases),
      adr: "",
      qwen: c.qwen.criminalCases === null ? "" : String(c.qwen.criminalCases),
    }),
    compare: sameNumber,
  },
  {
    field: "Education",
    expected: ["detailed", "qwen"],
    values: (c) => ({ detailed: c.detailed.education, adr: "", qwen: c.qwen.education }),
    compare: (a, b) => educationLevel(a) === educationLevel(b),
  },
  {
    field: "Liabilities",
    expected: ["detailed", "qwen"],
    values: (c) => ({ detailed: c.detailed.liabilities, adr: "", qwen: c.qwen.liabilities }),
    compare: sameNumber,
  },
];

function sourceAvailable(candidate: VerificationCandidate, source: SourceKey) {
  if (source === "adr") return candidate.adr.found;
  if (source === "qwen") return candidate.qwen.found;
  return true;
}

export function buildChecks(candidate: VerificationCandidate): FieldCheck[] {
  return fields.map((definition) => {
    const values = definition.values(candidate);
    const present = definition.expected.filter((source) => sourceAvailable(candidate, source) && values[source].trim() !== "");
    const missing = present.length !== definition.expected.length;

    let status: FieldCheckStatus = "match";
    if (missing) {
      status = "missing";
    } else {
      const first = values[definition.expected[0]];
      const differs = definition.expected.some((source) => !definition.compare(first, values[source]));
      status = differs ? "differs" : "match";
    }

    return {
      field: definition.field,
      detailed: values.detailed,
      adr: values.adr,
      qwen: values.qwen,
      status,
    };
  });
}

export function summarizeChecks(checks: FieldCheck[]): VerificationSummary {
  return checks.reduce<VerificationSummary>(
    (summary, check) => {
      if (check.status === "match") summary.matched++;
      else if (check.status === "differs") summary.differing++;
      else if (check.status === "missing") summary.missing++;
      summary.totalCompared++;
      return summary;
    },
    { matched: 0, differing: 0, missing: 0, totalCompared: 0 },
  );
}
