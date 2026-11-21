export type AssistantLanguage = 'en' | 'hinglish' | 'hi' | 'mr';
export const LANGUAGE_OPTIONS = [
  { value: 'en' as const, label: 'English' },
  { value: 'hinglish' as const, label: 'Hinglish' },
  { value: 'hi' as const, label: 'हिन्दी' },
  { value: 'mr' as const, label: 'मराठी' },
];
export function detectLanguage(question: string): AssistantLanguage {
  if (/(?:आहेत|आहे|कोण|किती|सर्वाधिक|सर्वात|वय|संपत्ती|उमेदवारांची|उमेदवारांचे|उमेदवारांना|मतदारसंघ|सांगा|नाही|यांची|त्यांची|यांचे|त्यांचे|मधील)/u.test(question)) return 'mr';
  if (/[\u0900-\u097f]/u.test(question)) return 'hi';
  if (/\b(kaun|kitne|kitni|kya|mein|hain|hai|batao|sabse|umar|unka|unki|jeetega|jitega)\b/i.test(question)) return 'hinglish';
  return 'en';
}
export function isAssistantLanguage(value: unknown): value is AssistantLanguage {
  return value === 'en' || value === 'hinglish' || value === 'hi' || value === 'mr';
}
export function matchesLanguageScript(message: string, language: AssistantLanguage): boolean {
  const devanagari = (message.match(/[\u0900-\u097f]/g) ?? []).length;
  const latin = (message.match(/[a-z]/gi) ?? []).length;
  if (language === 'mr' && /(?:^|\s)(?:है|हैं|उम्मीदवारों|उम्मीदवार|कुल|संपत्ति|आपका)(?:\s|[।,.!?]|$)/u.test(message)) return false;
  return language === 'hi' || language === 'mr' ? devanagari > 0 && devanagari >= latin : devanagari === 0;
}
export const LANGUAGE_INSTRUCTIONS: Record<AssistantLanguage, string> = {
  mr: 'RESPONSE LANGUAGE: मराठी. संपूर्ण उत्तर सोप्या मराठी भाषेत आणि देवनागरी लिपीत लिहा. हिंदी, इंग्रजी वाक्ये किंवा रोमन लिपीतील मराठी वापरू नका. उमेदवारांची, पक्षांची आणि मतदारसंघांची नावेही देवनागरीत लिहा. संपत्ती, देणी, निव्वळ संपत्ती, वय, शिक्षण, घोषित गुन्हेगारी प्रकरणे, लाख, कोटी आणि रुपये हे मराठी शब्द वापरा. उदाहरण: या यादीतील उमेदवारांचे सरासरी वय 57.11 वर्षे आहे. आकडे 0-9 मध्ये चालतील. Translate presentation only; keep tool names, arguments and exact source labels unchanged in tool calls. This explicit language choice overrides the input language and previous replies. Do not confuse Marathi and Hindi merely because both use Devanagari.',
  en: 'RESPONSE LANGUAGE: English. Write the entire message in simple English, regardless of the question language or previous messages.',
  hinglish: 'RESPONSE LANGUAGE: Hinglish. Write Hindi phrasing in Roman/Latin letters mixed naturally with simple English. Do not use Devanagari. Example: Is sheet ke mutabik unki umar 79 saal hai.',
  hi: 'RESPONSE LANGUAGE: हिन्दी. पूरा उत्तर सरल हिन्दी और देवनागरी लिपि में लिखें। रोमन हिन्दी, हिंग्लिश और अंग्रेज़ी वाक्य न लिखें। उम्मीदवारों, दलों और निर्वाचन क्षेत्रों के नाम भी देवनागरी में लिप्यंतरित करें। संपत्ति, देनदारियाँ, आयु, शिक्षा, घोषित मामले, लाख, करोड़ और रुपये जैसे हिन्दी शब्द प्रयोग करें। संख्याएँ 0-9 में लिख सकते हैं। Translate only the presentation; tool names, tool arguments and exact dataset labels used in tool calls must remain unchanged. This explicit language selection overrides the language of earlier conversation messages and the current question.',
};
export const ASSISTANT_COPY = {
  mr: {
    welcome: 'नमस्कार! मी चुनाव बोधचा सहाय्यक आहे.\n\nयादीतील उमेदवारांची घोषित संपत्ती, देणी, गुन्हेगारी प्रकरणे, शिक्षण, वय किंवा पक्ष यांबद्दल विचारा. तुम्ही तुलना, एकूण आकडे, सरासरी आणि क्रमवारीही विचारू शकता. गरज असल्यास मी अधिक माहिती विचारेन.\n\nवर तुमची भाषा निवडा आणि प्रश्न विचारा.',
    placeholder: 'उमेदवार, संपत्ती, देणी, वय किंवा शिक्षणाबद्दल विचारा…', newChat: 'नवीन संभाषण', retry: 'पुन्हा प्रयत्न करा', tryAsking: 'हे प्रश्न विचारू शकता', loading: 'प्रतिज्ञापत्रातील माहिती शोधत आहे…', followup: 'अधिक माहिती किंवा पुढचा प्रश्न येथे लिहा.', language: 'उत्तराची भाषा', hint: 'पुढचे उत्तर निवडलेल्या भाषेत मिळेल. मराठी आणि हिंदीसाठी देवनागरी, हिंग्लिशसाठी रोमन लिपी वापरली जाईल.', input: 'तुमचा प्रश्न', send: 'प्रश्न पाठवा', footer: 'पाठवण्यासाठी एंटर दाबा · जास्तीत जास्त 300 अक्षरे · एका मिनिटात 10 प्रश्न',
    disclaimer: 'स्रोत: यादीत नोंदवलेली उमेदवारांची प्रतिज्ञापत्रे. गुन्हेगारी प्रकरणे म्हणजे घोषित केलेली प्रकरणे; त्याचा अर्थ दोष सिद्ध झाला आहे असा नाही.',
    prediction: 'या यादीवरून निवडणुकीतील विजेत्याचे भाकीत करता येत नाही. एखाद्या मतदारसंघात कोणाला विजेता म्हणून नोंदवले आहे किंवा घोषित संपत्ती, वय, शिक्षण आणि प्रकरणांची तुलना याबद्दल विचारू शकता.',
    lookup: 'उत्तर देण्यापूर्वी यादीत शोध घेणे आवश्यक आहे. तुम्हाला कोणत्या उमेदवाराची, मतदारसंघाची किंवा आकडेवारीची माहिती हवी आहे?',
    examples: ['ठाण्यात यादीत विजेता म्हणून कोणाची नोंद आहे?', 'पुण्यात कोणत्या उमेदवाराची संपत्ती सर्वाधिक आहे?', 'भाजपच्या उमेदवारांचे सरासरी वय किती आहे?', 'सर्वात कमी वयाचा उमेदवार कोण आहे?', 'मुंबई उत्तरमधील किती उमेदवारांनी गुन्हेगारी प्रकरणे घोषित केली आहेत?', 'सर्व उमेदवारांची एकूण देणी किती आहेत?'],
  },
  en: {
    welcome: "Namaste! I'm the Chunav Bodh AI Assistant.\n\nAsk about candidates in the sheet — their declared assets, liabilities, cases, education, age, or party. I'll ask you to clarify when needed.\n\nChoose English, Hinglish, हिन्दी or मराठी above, then ask your question.",
    placeholder: 'Ask about candidates, assets, cases, education…', newChat: 'New chat', retry: 'Retry', tryAsking: 'Try asking', loading: 'Searching affidavit data…', followup: 'Reply here to clarify or ask a follow-up.', language: 'Answer language', hint: 'Your choice applies to the next reply. Hindi uses देवनागरी; Hinglish uses Roman letters.', input: 'Your question', send: 'Send question', footer: 'Press Enter to send · Up to 300 characters · 10 questions per minute',
    disclaimer: 'Source: candidate affidavits as recorded in the sheet. Criminal cases are declared cases, not convictions.',
    prediction: 'I cannot predict election winners from this sheet. You can ask who is marked Winner in a constituency, or compare declared assets, age, education and cases.',
    lookup: 'I need a sheet lookup before I can answer. Which candidate, constituency, or statistic would you like to check?',
    examples: ['Which candidates in New Delhi have the highest assets?', 'How many candidates have criminal cases in Mumbai North?', 'Average age of BJP candidates?', 'Who is the youngest candidate?', 'List candidates with no criminal cases in New Delhi', 'Which party has the most candidates with graduate education?'],
  },
  hinglish: {
    welcome: 'Namaste! Main Chunav Bodh AI Assistant hoon.\n\nSheet mein diye candidates ki assets, liabilities, declared cases, padhai, umar ya party ke baare mein poochhiye. Zaroorat par main clarification maangunga.\n\nUpar apni language chuniye aur sawaal poochhiye.',
    placeholder: 'Candidates, assets, cases ya padhai ke baare mein poochhiye…', newChat: 'Nayi chat', retry: 'Dobara koshish', tryAsking: 'Ye sawaal poochhiye', loading: 'Affidavit data mein dhoondh rahe hain…', followup: 'Clarification ya agla sawaal yahin likhiye.', language: 'Jawab ki language', hint: 'Agla jawab is language mein aayega. Hindi mein Devanagari, Hinglish mein Roman letters honge.', input: 'Aapka sawaal', send: 'Sawaal bhejiye', footer: 'Enter se bhejiye · Adhiktam 300 characters · Ek minute mein 10 sawaal',
    disclaimer: 'Source: sheet mein darj candidates ke affidavits. Criminal cases ka matlab ghoshit maamle hain, doshi saabit hona nahi.',
    prediction: 'Is sheet se election winner ki bhavishyavani nahi ki ja sakti. Aap poochh sakte hain ki sheet mein kise Winner mark kiya gaya hai, ya declared assets, umar, padhai aur cases compare kar sakte hain.',
    lookup: 'Jawab ke liye pehle sheet mein dekhna hoga. Aap kis candidate, constituency ya aankde ke baare mein poochhna chahte hain?',
    examples: ['New Delhi mein sabse zyada assets kiske hain?', 'Mumbai North mein kitne candidates ke criminal cases hain?', 'BJP candidates ki average umar kya hai?', 'Sabse kam umar ka candidate kaun hai?', 'New Delhi mein kin candidates ke zero criminal cases hain?', 'Kis party mein sabse zyada Graduate candidates hain?'],
  },
  hi: {
    welcome: 'नमस्ते! मैं चुनाव बोध का सहायक हूँ।\n\nइस सूची में उम्मीदवारों की घोषित संपत्ति, देनदारियों, मामलों, शिक्षा, आयु या दल के बारे में पूछिए। ज़रूरत होने पर मैं स्पष्टीकरण माँगूँगा।\n\nऊपर अपनी भाषा चुनें और प्रश्न पूछें।',
    placeholder: 'उम्मीदवारों, संपत्ति, मामलों या शिक्षा के बारे में पूछें…', newChat: 'नई बातचीत', retry: 'फिर कोशिश करें', tryAsking: 'ये प्रश्न पूछ सकते हैं', loading: 'शपथपत्र के आँकड़ों में खोज जारी है…', followup: 'स्पष्टीकरण या अगला प्रश्न यहीं लिखें।', language: 'उत्तर की भाषा', hint: 'अगला उत्तर चुनी हुई भाषा में मिलेगा। हिन्दी में देवनागरी और हिंग्लिश में रोमन अक्षर होंगे।', input: 'आपका प्रश्न', send: 'प्रश्न भेजें', footer: 'भेजने के लिए एंटर दबाएँ · अधिकतम 300 अक्षर · प्रति मिनट 10 प्रश्न',
    disclaimer: 'स्रोत: सूची में दर्ज उम्मीदवारों के शपथपत्र। आपराधिक मामलों से तात्पर्य घोषित मामलों से है, दोषसिद्धि से नहीं।',
    prediction: 'इस सूची से चुनाव के विजेता की भविष्यवाणी नहीं की जा सकती। आप पूछ सकते हैं कि किसी निर्वाचन क्षेत्र में किसे विजेता चिह्नित किया गया है, या घोषित संपत्ति, आयु, शिक्षा और मामलों की तुलना कर सकते हैं।',
    lookup: 'उत्तर देने से पहले सूची में खोज ज़रूरी है। आप किस उम्मीदवार, निर्वाचन क्षेत्र या आँकड़े के बारे में जानना चाहते हैं?',
    examples: ['नई दिल्ली में किन उम्मीदवारों की संपत्ति सबसे अधिक है?', 'मुंबई उत्तर में कितने उम्मीदवारों ने आपराधिक मामले घोषित किए हैं?', 'भाजपा उम्मीदवारों की औसत आयु क्या है?', 'सबसे कम उम्र का उम्मीदवार कौन है?', 'नई दिल्ली में किन उम्मीदवारों ने शून्य आपराधिक मामले घोषित किए हैं?', 'किस दल में सबसे अधिक स्नातक उम्मीदवार हैं?'],
  },
};
