import type { executeTool } from './assistantTools';
import type { AssistantLanguage } from './assistantLanguage';

type Result = ReturnType<typeof executeTool>;
const cleanName = (name: string) => name.replace(/\s*\(?Winner\)?\s*$/i, '').trim();
const words = {
  mr: { assets: 'संपत्ती', liabilities: 'देणी', net: 'निव्वळ संपत्ती', age: 'वय', cases: 'घोषित प्रकरणे', education: 'शिक्षण', winner: 'यादीत विजेता म्हणून नोंद', empty: 'या यादीत दिलेल्या अटींशी जुळणारा उमेदवार आढळला नाही.', missing: 'या यादीत हे नाव आढळले नाही. कृपया उमेदवाराचे किंवा मतदारसंघाचे अचूक नाव सांगाल का?', clarify: 'कृपया अपेक्षित', candidate: 'उमेदवार', constituency: 'मतदारसंघ', party: 'पक्ष', educationField: 'शिक्षण', count: 'संख्या', avg_age: 'सरासरी वय', avg_assets: 'सरासरी संपत्ती', total_criminal_cases: 'एकूण घोषित प्रकरणे', max_assets: 'सर्वाधिक संपत्ती' },
  en: { assets: 'assets', liabilities: 'liabilities', net: 'net worth', age: 'age', cases: 'declared cases', education: 'education', winner: 'marked Winner in the sheet', empty: 'No candidates match those filters in this sheet.', missing: 'I could not find that name or label in this sheet. Could you provide the exact candidate name or constituency?', clarify: 'Please confirm which', candidate: 'candidate', constituency: 'constituency', party: 'party', educationField: 'education', count: 'count', avg_age: 'average age', avg_assets: 'average assets', total_criminal_cases: 'total declared cases', max_assets: 'highest assets' },
  hinglish: { assets: 'assets', liabilities: 'liabilities', net: 'net worth', age: 'umar', cases: 'declared cases', education: 'padhai', winner: 'sheet mein Winner mark hain', empty: 'Is sheet mein in filters se koi candidate nahi mila.', missing: 'Is sheet mein yeh naam nahi mila. Kya aap candidate ya constituency ka exact naam bata sakte hain?', clarify: 'Kripya confirm kijiye ki aap kis', candidate: 'candidate', constituency: 'constituency', party: 'party', educationField: 'padhai', count: 'ginti', avg_age: 'average umar', avg_assets: 'average assets', total_criminal_cases: 'kul declared cases', max_assets: 'sabse zyada assets' },
  hi: { assets: 'संपत्ति', liabilities: 'देनदारियाँ', net: 'शुद्ध संपत्ति', age: 'आयु', cases: 'घोषित मामले', education: 'शिक्षा', winner: 'सूची में विजेता चिह्नित', empty: 'इस सूची में इन शर्तों से मेल खाने वाला कोई उम्मीदवार नहीं मिला।', missing: 'इस सूची में यह नाम नहीं मिला। क्या आप उम्मीदवार या निर्वाचन क्षेत्र का सही नाम बता सकते हैं?', clarify: 'कृपया स्पष्ट करें कि आपका आशय किस', candidate: 'उम्मीदवार', constituency: 'निर्वाचन क्षेत्र', party: 'दल', educationField: 'शिक्षा', count: 'संख्या', avg_age: 'औसत आयु', avg_assets: 'औसत संपत्ति', total_criminal_cases: 'कुल घोषित मामले', max_assets: 'अधिकतम संपत्ति' },
};
const hindiLabels: Record<string, string> = { BJP: 'भाजपा', INC: 'कांग्रेस', IND: 'निर्दलीय', BSP: 'बसपा', AAP: 'आम आदमी पार्टी', Graduate: 'स्नातक', 'Graduate Professional': 'व्यावसायिक स्नातक', 'Post Graduate': 'स्नातकोत्तर', Doctorate: 'डॉक्टरेट', Literate: 'साक्षर', Illiterate: 'निरक्षर', Others: 'अन्य', '12th Pass': 'बारहवीं उत्तीर्ण', '10th Pass': 'दसवीं उत्तीर्ण', 'New Delhi': 'नई दिल्ली', 'North East Delhi': 'उत्तर पूर्वी दिल्ली', 'North West Delhi': 'उत्तर पश्चिमी दिल्ली', 'South Delhi': 'दक्षिण दिल्ली', 'West Delhi': 'पश्चिम दिल्ली', 'Delhi(Chandni Chowk)': 'दिल्ली (चाँदनी चौक)', 'Delhi(East Delhi)': 'दिल्ली (पूर्वी दिल्ली)' };
const marathiLabels: Record<string, string> = { BJP: 'भाजप', INC: 'काँग्रेस', IND: 'अपक्ष', BSP: 'बसपा', AAP: 'आम आदमी पक्ष', Graduate: 'पदवीधर', 'Graduate Professional': 'व्यावसायिक पदवीधर', 'Post Graduate': 'पदव्युत्तर', Doctorate: 'डॉक्टरेट', Literate: 'साक्षर', Illiterate: 'निरक्षर', Others: 'इतर', '12th Pass': 'बारावी उत्तीर्ण', '10th Pass': 'दहावी उत्तीर्ण', THANE: 'ठाणे', PUNE: 'पुणे', 'MUMBAI NORTH': 'मुंबई उत्तर', 'All matching candidates': 'अटींशी जुळणारे सर्व उमेदवार' };
const aggregateLabels = {
  en: { total_assets: 'total assets', avg_liabilities: 'average liabilities', total_liabilities: 'total liabilities', avg_net_worth: 'average net worth', total_net_worth: 'total net worth', min_age: 'minimum age', max_age: 'maximum age', avg_criminal_cases: 'average declared cases', candidates_with_cases: 'candidates declaring cases', percentage_with_cases: 'percentage declaring cases (%)' },
  hinglish: { total_assets: 'kul assets', avg_liabilities: 'average liabilities', total_liabilities: 'kul liabilities', avg_net_worth: 'average net worth', total_net_worth: 'kul net worth', min_age: 'sabse kam umar', max_age: 'sabse zyada umar', avg_criminal_cases: 'average declared cases', candidates_with_cases: 'cases declare karne wale candidates', percentage_with_cases: 'cases declare karne wale candidates ka pratishat (%)' },
  hi: { total_assets: 'कुल संपत्ति', avg_liabilities: 'औसत देनदारियाँ', total_liabilities: 'कुल देनदारियाँ', avg_net_worth: 'औसत शुद्ध संपत्ति', total_net_worth: 'कुल शुद्ध संपत्ति', min_age: 'न्यूनतम आयु', max_age: 'अधिकतम आयु', avg_criminal_cases: 'औसत घोषित मामले', candidates_with_cases: 'मामले घोषित करने वाले उम्मीदवार', percentage_with_cases: 'मामले घोषित करने वाले उम्मीदवारों का प्रतिशत (%)' },
  mr: { total_assets: 'एकूण संपत्ती', avg_liabilities: 'सरासरी देणी', total_liabilities: 'एकूण देणी', avg_net_worth: 'सरासरी निव्वळ संपत्ती', total_net_worth: 'एकूण निव्वळ संपत्ती', min_age: 'किमान वय', max_age: 'कमाल वय', avg_criminal_cases: 'सरासरी घोषित प्रकरणे', candidates_with_cases: 'प्रकरणे घोषित केलेले उमेदवार', percentage_with_cases: 'प्रकरणे घोषित केलेल्या उमेदवारांची टक्केवारी (%)' },
};
export const localizeMoney = (value: string, language: AssistantLanguage) => language === 'hi' || language === 'mr' ? value.replace(/Rs\s*/g, 'रु. ').replace(/crore/g, language === 'mr' ? 'कोटी' : 'करोड़').replace(/lakh/g, 'लाख').replace(/thousand/g, language === 'mr' ? 'हजार' : 'हज़ार') : value;
const label = (value: string, language: AssistantLanguage) => language === 'mr' ? marathiLabels[value] ?? hindiLabels[value] ?? value : language === 'hi' ? value === 'All matching candidates' ? 'सभी मेल खाने वाले उम्मीदवार' : hindiLabels[value] ?? value : value;

// Exact tool data is retained; source spellings of unknown proper names are never guessed.
export function renderToolAnswer(result: Result, language: AssistantLanguage = 'en'): string | undefined {
  const w = words[language];
  if ('needsClarification' in result) {
    const choices = (result.closeMatches ?? []).map(match => typeof match === 'string' ? label(match, language) : `${match.name} — ${label(match.constituency, language)} (${label(match.party, language)}, ${language === 'mr' ? 'ओळख' : language === 'hi' ? 'पहचान' : 'ID'} ${match.id})`);
    const field = 'field' in result ? result.field : 'candidate';
    const fieldName = field === 'education' ? w.educationField : field === 'party' ? w.party : field === 'constituency' ? w.constituency : w.candidate;
    return choices.length ? `${w.clarify} ${fieldName}${language === 'mr' ? ' स्पष्ट करा:' : language === 'hi' ? ' से है?' : language === 'hinglish' ? ' ki baat kar rahe hain?' : ' you mean:'}\n${choices.map(c => `• ${c}`).join('\n')}` : w.missing;
  }
  if ('error' in result) return undefined;
  type Candidate = ReturnType<typeof import('./assistantTools').toolSearchCandidates>['candidates'][number];
  const record = (c: Candidate) => `${cleanName(c.name)} (${label(c.party, language)}), ${label(c.constituencyRaw, language)}: ${w.assets} ${localizeMoney(c.assets, language)}; ${w.liabilities} ${localizeMoney(c.liabilities, language)}; ${w.net} ${localizeMoney(c.netWorth, language)}; ${w.age} ${c.age}; ${w.cases} ${c.criminalCases}; ${w.education} ${label(c.education, language)}${c.winnerMarkedInSheet ? `; ${w.winner}` : ''}.`;
  if ('candidates' in result) {
    if (!result.total) return w.empty;
    const heading = language === 'mr' ? `या यादीत ${result.total} उमेदवार अटींशी जुळतात. त्यांपैकी ${result.shown} दाखवले आहेत:` : language === 'hi' ? `इस सूची में ${result.total} उम्मीदवार मेल खाते हैं। इनमें से ${result.shown} दिखाए गए हैं:` : language === 'hinglish' ? `Is sheet mein ${result.total} candidates mile. ${result.shown} dikhaye gaye hain:` : `Found ${result.total.toLocaleString('en-IN')} matching candidates in this sheet. Showing ${result.shown}:`;
    return heading + '\n' + result.candidates.map((c, i) => `${i + 1}. ${record(c)}`).join('\n');
  }
  if ('groups' in result) {
    if (!result.totalGroups) return w.empty;
    const metric = (aggregateLabels[language] as Record<string, string>)[result.metric] ?? w[result.metric as keyof typeof w] ?? result.metric;
    const heading = language === 'mr' ? `${metric}: या यादीतील ${result.total} उमेदवार. ${result.totalGroups} गटांपैकी ${result.shownGroups} दाखवले आहेत:` : language === 'hi' ? `${metric}: इस सूची में ${result.total} उम्मीदवार। ${result.totalGroups} समूहों में से ${result.shownGroups} दिखाए गए हैं:` : language === 'hinglish' ? `${metric}: is sheet mein ${result.total} candidates. ${result.totalGroups} groups mein se ${result.shownGroups}:` : `${metric} by ${result.groupBy} in this sheet (${result.total} candidates). Showing ${result.shownGroups} of ${result.totalGroups} groups:`;
    return heading + '\n' + result.groups.map(g => `• ${label(g.label, language)}: ${typeof g.value === 'number' ? Number(g.value.toFixed(2)).toLocaleString('en-IN') : localizeMoney(g.value, language)} (${g.count} ${language === 'mr' ? 'उमेदवार' : language === 'hi' ? 'उम्मीदवार' : 'candidates'})`).join('\n');
  }
  if ('candidate' in result && result.candidate) return record(result.candidate);
  return undefined;
}
