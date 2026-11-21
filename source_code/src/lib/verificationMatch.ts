export const normalizeText = (value: string) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const stripHonorifics = (value: string) =>
  String(value || "")
    .replace(/\b(dr|adv|advocate|shri|sri|smt|shrimati|prof|professor|mr|mrs|ms|kum|kumari|winner|winners)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeConstituency = (value: string) =>
  normalizeText(String(value || "").replace(/^Delhi\((.*)\)$/i, "$1").replace(/\s*\(NCT\)$/i, ""));

export const cleanDisplayName = (value: string) =>
  String(value || "").replace(/\s+\b(winner|winners)\b/gi, "").replace(/\s+/g, " ").trim();

export const isWinner = (value: string) => /\bwinner\b/i.test(String(value || ""));

export function determineState(constituency: string, adrState = ""): string {
  if (/DELHI/i.test(adrState)) return "Delhi";
  if (/KERALA/i.test(adrState)) return "Kerala";
  if (/MAHARASHTRA/i.test(adrState)) return "Maharashtra";
  if (/KARNATAKA/i.test(adrState)) return "Karnataka";
  const key = normalizeConstituency(constituency);
  if (
    key === "newdelhi" ||
    key === "chandnichowk" ||
    key === "eastdelhi" ||
    key === "northeastdelhi" ||
    key === "northwestdelhi" ||
    key === "southdelhi" ||
    key === "westdelhi"
  ) {
    return "Delhi";
  }
  if (
    [
      "ahmednagar", "akola", "amaravati", "amaravati sc", "aurangabad", "baramati", "beed",
      "bhandara g ondiya", "bhandara gondiya", "bhandara", "bhiwandi", "buldhana",
      "chandrapur", "dhule", "dindori st", "gadchiroli chimur st", "gadchirolichimur",
      "hatkanangale", "hingoli", "jalgaon", "jalna", "kalyan", "kolhapur", "latursc",
      "lat ur sc", "madha", "maval", "mumbainorth",
      "mumbainorthcentral", "mumbainortheast", "mumbainorthwest", "mumbaisouth",
      "mumbaisouthcentral", "nagpur", "nanded", "nandurbarsc", "nashik",
      "osmanabad", "palgharst", "parbhani", "pune", "raigad", "ramteksc",
      "ratnagirisindhudurg", "raver", "sangli", "satara", "shirdisc", "shirur",
      "solapursc", "thane", "wardha", "yavatmalwashim",
    ].some((value) => key === value.replace(/[^a-z0-9]/g, ""))
  ) {
    return "Maharashtra";
  }
  if (
    [
      "bagalkot", "ballari", "belagavi", "bangalore central", "bangalore north",
      "bangalore rural", "bangalore south", "bengaluru central", "bengaluru north",
      "bengaluru rural", "bengaluru south", "belgaum", "bellary st", "bidar", "bijapur",
      "bijapur sc", "chamarajanagar", "chamarajanagar sc",
      "chikkodi", "chikkaballapur", "chikkballapur", "chitradurga", "chitradurga sc", "dakshina kannada", "davanagere",
      "dharwad", "gulbarga", "gulbarga sc", "hassan", "haveri", "kolar", "kolar sc",
      "koppal", "mandya", "mysore", "raichur", "raichur st", "shimoga", "tumkur",
      "udupi chikmagalur", "uttara kannada",
    ].some((value) => key === value.replace(/[^a-z0-9]/g, ""))
  ) {
    return "Karnataka";
  }
  return "Kerala";
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(prev[j] + 1, current[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = current;
  }
  return prev[b.length];
}

export function nameSimilarity(a: string, b: string): number {
  const left = normalizeText(stripHonorifics(a));
  const right = normalizeText(stripHonorifics(b));
  if (!left || !right) return 0;
  if (left === right) return 1;
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length, 1);
}

export function amountValue(value: string): number | null {
  const match = String(value || "").match(/[\d][\d,]*/);
  if (!match) return null;
  const digits = match[0].replace(/,/g, "");
  return digits ? Number(digits) : null;
}

export function educationLevel(value: string): string {
  const text = String(value || "").toLowerCase();
  if (!text) return "";
  if (text.includes("doctor") || text.includes("phd")) return "doctorate";
  if (text.includes("post") && (text.includes("graduate") || text.includes("graduation"))) return "post-graduate";
  if (text.includes("graduate") || text.includes("graduation")) return "graduate";
  if (text.includes("12")) return "12th";
  if (text.includes("10")) return "10th";
  if (text.includes("8")) return "8th";
  if (text.includes("5")) return "5th";
  if (text.includes("literate")) return "literate";
  if (text.includes("illiterate")) return "illiterate";
  if (text.includes("others") || text.includes("other")) return "others";
  return normalizeText(text);
}
