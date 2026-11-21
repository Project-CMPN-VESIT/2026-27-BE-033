import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/assistant/route';

let sequence = 0;
const request = (body: unknown, ip = `test-${++sequence}`) => new NextRequest('http://localhost/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) });
const provider = (parts: unknown[]) => new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts } }] }), { headers: { 'Content-Type': 'application/json' } });
const final = (kind: string, message: string) => provider([{ text: JSON.stringify({ kind, message }) }]);

test('Assistant API contract and tool conversation (mock provider, no paid calls)', async t => {
  const savedFetch = globalThis.fetch;
  const originalKey = process.env.ASSISTANT_API_KEY;
  process.env.ASSISTANT_API_KEY = 'test-only-key';
  try {
    await t.test('rejects malformed JSON and invalid question lengths', async () => {
      assert.equal((await POST(request({ question: 'x'.repeat(301) }))).status, 400);
      assert.equal((await POST(request({ question: '' }))).status, 400);
      assert.equal((await POST(new NextRequest('http://localhost/api/assistant', { method: 'POST', body: '{' }))).status, 400);
    });
    let context = '';
    await t.test('executes every parallel call and keeps signatures', async () => {
      let calls = 0;
      globalThis.fetch = async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-only-key');
        assert.equal(body.generationConfig.responseMimeType, 'application/json');
        assert.deepEqual(body.generationConfig.responseSchema.required, ['kind', 'message']);
        if (++calls === 1) return provider([
          { functionCall: { name: 'search_candidates', args: { party: 'BJP' }, id: 'one' }, thoughtSignature: 'signature' },
          { functionCall: { name: 'aggregate', args: { group_by: 'party', metric: 'avg_age', filters: { party: 'BJP' } }, id: 'two' } },
        ]);
        const results = body.contents.at(-1).parts;
        assert.equal(results.length, 2);
        assert.equal(results[0].functionResponse.id, 'one');
        assert.equal(results[0].functionResponse.response.result.total, 64);
        assert.equal(results[1].functionResponse.response.result.groups[0].numericValue, 57.109375);
        assert.equal(body.contents.at(-2).parts[0].thoughtSignature, 'signature');
        return final('answer', 'The sheet lists 64 BJP candidates, with an average age of 57.11 years.');
      };
      const response = await POST(request({ question: 'How many BJP candidates and what is their average age?' }));
      assert.equal(response.status, 200);
      const result = await response.json(); context = result.context;
      assert.match(result.answer, /not convictions/);
      assert.equal(calls, 2);
    });
    await t.test('signed history carries clarification/follow-up context', async () => {
      globalThis.fetch = async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        assert.ok(body.contents.some((m: any) => m.role === 'model' && m.parts[0].text.includes('64 BJP')));
        assert.equal(body.contents.at(-1).parts[0].text, 'And their assets?');
        return final('clarification', 'Would you like average assets or the highest assets among BJP candidates?');
      };
      const response = await POST(request({ question: 'And their assets?', context }));
      assert.equal(response.status, 200);
      assert.match((await response.json()).answer, /average assets/);
    });
    await t.test('rejects forged conversation state', async () => {
      assert.equal((await POST(request({ question: 'Hello', context: context + 'tampered' }))).status, 400);
    });
    await t.test('blocks factual answers with no current tool result', async () => {
      globalThis.fetch = async () => final('answer', 'Invented candidate facts.');
      const response = await POST(request({ question: 'Who has the highest assets?' }));
      const body = await response.json();
      assert.doesNotMatch(body.answer, /Invented/);
      assert.match(body.answer, /sheet lookup/);
    });
    await t.test('unsupported questions can be declined without a tool call', async () => {
      globalThis.fetch = async () => { throw new Error('Predictions must be rejected before calling the provider'); };
      assert.match((await (await POST(request({ question: 'Who will win?' }))).json()).answer, /cannot predict/);
    });
    await t.test('temporary provider outages retry once within the timeout', async () => {
      let calls = 0;
      globalThis.fetch = async () => ++calls === 1 ? new Response('unavailable', { status: 503 }) : final('clarification', 'Which candidate would you like to look up?');
      assert.equal((await POST(request({ question: 'Help me find a candidate' }))).status, 200);
      assert.equal(calls, 2);
    });
    await t.test('Delhi follow-up still answers from tool data when final model output is truncated', async () => {
      let calls = 0;
      globalThis.fetch = async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        assert.equal(body.contents[0].role, 'user');
        if (++calls === 1) return provider([{ functionCall: { name: 'search_candidates', args: { constituency: 'Delhi', min_assets: 10000001 } } }]);
        const result = body.contents.at(-1).parts[0].functionResponse.response.result;
        assert.equal(result.total, 33);
        return provider([{ text: '{"kind":"answer","message":"unfinished' }]);
      };
      const response = await POST(request({ question: 'Who had assets more than 1 Crore from Delhi', context }));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.match(result.answer, /33 matching candidates/);
      assert.match(result.answer, /Ramvir Singh Bidhuri/);
      assert.match(result.answer, /Showing 10/);
      assert.equal(calls, 2);
    });
    await t.test('successful tools survive a provider failure on the final writing step', async () => {
      let calls = 0;
      globalThis.fetch = async () => ++calls === 1 ? provider([{ functionCall: { name: 'search_candidates', args: { constituency: 'Delhi', min_assets: 10000001 } } }]) : new Response('unavailable', { status: 503 });
      const response = await POST(request({ question: 'Who had assets more than 1 Crore from Delhi' }));
      assert.equal(response.status, 200);
      assert.match((await response.json()).answer, /33 matching candidates/);
    });
    await t.test('ambiguity is terminal: the model cannot drop an unresolved filter', async () => {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return provider([{ functionCall: { name: 'search_candidates', args: { constituency: 'Mumbai', min_assets: 10000001 } } }]); };
      const response = await POST(request({ question: 'Who has assets over 1 crore in Mumbai?' }));
      assert.equal(response.status, 200);
      assert.match((await response.json()).answer, /Please confirm which constituency/);
      assert.equal(calls, 1);
    });
    await t.test('unknown tools become bounded errors for the model', async () => {
      let calls = 0;
      globalThis.fetch = async (_input, init) => {
        if (++calls === 1) return provider([{ functionCall: { name: 'delete_data', args: {} } }]);
        const body = JSON.parse(String(init?.body));
        assert.equal(body.contents.at(-1).parts[0].functionResponse.response.result.error, 'Unknown tool');
        return final('clarification', 'Which candidate would you like to look up?');
      };
      assert.equal((await POST(request({ question: 'Find a candidate' }))).status, 200);
    });
    await t.test('provider errors never leak response payloads or keys', async () => {
      globalThis.fetch = async () => new Response('secret-provider-payload', { status: 401 });
      const response = await POST(request({ question: 'Find candidates' }));
      assert.equal(response.status, 503);
      assert.doesNotMatch(await response.text(), /secret-provider|test-only-key/);
    });
    await t.test('network failures explain server connectivity rather than hiding the cause', async () => {
      globalThis.fetch = async () => { throw new TypeError('fetch failed: EACCES secret-provider-payload'); };
      const response = await POST(request({ question: 'Who was the winner in thane' }));
      assert.equal(response.status, 503);
      const body = await response.text();
      assert.match(body, /server cannot reach the AI service/);
      assert.doesNotMatch(body, /EACCES|secret-provider|test-only-key/);
    });
    await t.test('provider quota errors have actionable feedback', async () => {
      globalThis.fetch = async () => new Response('secret-provider-payload', { status: 429 });
      const response = await POST(request({ question: 'Average age of BJP candidates?' }));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Retry-After'), '60');
      assert.match(await response.text(), /quota/);
    });
    await t.test('past-winner question executes a lookup against the sheet marker', async () => {
      let calls = 0;
      globalThis.fetch = async (_input, init) => {
        if (++calls === 1) return provider([{ functionCall: { name: 'search_candidates', args: { constituency: 'Thane', winner: true } } }]);
        const body = JSON.parse(String(init?.body));
        const result = body.contents.at(-1).parts[0].functionResponse.response.result;
        assert.equal(result.total, 1);
        assert.equal(result.candidates[0].id, '977');
        assert.equal(result.candidates[0].winnerMarkedInSheet, true);
        return final('answer', 'Naresh Ganpat Mhaske (Shiv Sena) is marked Winner for Thane in this sheet.');
      };
      const response = await POST(request({ question: 'Who was the winner in thane' }));
      assert.equal(response.status, 200);
      assert.match((await response.json()).answer, /Naresh Ganpat Mhaske/);
    });
    await t.test('rate limits the eleventh request from the same IP', async () => {
      for (let i = 0; i < 10; i++) assert.equal((await POST(request({ question: '' }, 'limited-test'))).status, 400);
      const response = await POST(request({ question: '' }, 'limited-test'));
      assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '60');
    });
    await t.test('Hindi is detected for older clients that omit the language field', async () => {
      globalThis.fetch = async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        assert.match(body.systemInstruction.parts[0].text, /पूरा उत्तर सरल हिन्दी और देवनागरी/);
        return final('clarification', 'आप किस उम्मीदवार के बारे में जानना चाहते हैं?');
      };
      const response = await POST(request({ question: 'उम्मीदवार की आयु बताइए' }));
      const result = await response.json();
      assert.equal(response.status, 200);
      assert.match(result.answer, /स्रोत: सूची/);
      assert.doesNotMatch(result.answer, /[a-z]/i);
    });
    await t.test('explicit Hinglish overrides a Hindi question', async () => {
      globalThis.fetch = async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        assert.match(body.systemInstruction.parts[0].text, /RESPONSE LANGUAGE: Hinglish/);
        return final('clarification', 'Aap kis candidate ki umar jaanna chahte hain?');
      };
      const response = await POST(request({ question: 'उम्मीदवार की आयु बताइए', language: 'hinglish' }));
      const result = await response.json();
      assert.match(result.answer, /Aap kis candidate/);
      assert.doesNotMatch(result.answer, /[\u0900-\u097f]/);
    });
    await t.test('English preference overrides Hindi input and previous chat language', async () => {
      globalThis.fetch = async (_input, init) => {
        assert.match(JSON.parse(String(init?.body)).systemInstruction.parts[0].text, /RESPONSE LANGUAGE: English/);
        return final('clarification', 'Which candidate would you like to check?');
      };
      const response = await POST(request({ question: 'उम्मीदवार की आयु बताइए', language: 'en', context }));
      assert.match((await response.json()).answer, /Which candidate/);
    });
    await t.test('Hindi preference localizes factual fallback and prevents Roman Hindi replies', async () => {
      let calls = 0;
      globalThis.fetch = async () => ++calls === 1 ? provider([{ functionCall: { name: 'search_candidates', args: { constituency: 'Delhi', sort_by: 'age', order: 'desc', limit: 1 } } }]) : final('answer', 'Delhi mein sabse jyada umar Jai Prakash Agarwal ki hai, 79 saal.');
      const response = await POST(request({ question: 'Who is the oldest candidate in Delhi?', language: 'hi', context }));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.match(result.answer, /आयु 79/);
      assert.match(result.answer, /संपत्ति/);
      assert.match(result.answer, /स्रोत: सूची/);
      assert.doesNotMatch(result.answer, /Delhi mein|declared cases|Rs |crore|Source:/);
    });
    await t.test('Hindi clarification is rendered locally without a second model call', async () => {
      globalThis.fetch = async () => provider([{ functionCall: { name: 'search_candidates', args: { constituency: 'Mumbai' } } }]);
      const response = await POST(request({ question: 'मुंबई के उम्मीदवार बताइए', language: 'hi' }));
      assert.match((await response.json()).answer, /कृपया स्पष्ट करें/);
    });
    await t.test('unsupported language values are rejected', async () => {
      assert.equal((await POST(request({ question: 'Hello', language: 'fr' }))).status, 400);
      assert.equal((await POST(request({ question: 'Hello', language: { value: 'hi' } }))).status, 400);
    });
    await t.test('explicit Marathi overrides Hindi input and conversation history', async () => {
      globalThis.fetch = async (_input, init) => {
        assert.match(JSON.parse(String(init?.body)).systemInstruction.parts[0].text, /RESPONSE LANGUAGE: मराठी/);
        return final('clarification', 'तुम्हाला कोणत्या उमेदवाराची माहिती हवी आहे?');
      };
      const response = await POST(request({ question: 'उम्मीदवार की जानकारी बताइए', language: 'mr', context }));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.match(body.answer, /तुम्हाला कोणत्या/);
      assert.match(body.answer, /प्रतिज्ञापत्रे/);
      assert.doesNotMatch(body.answer, /[a-z]/i);
    });
    await t.test('Marathi questions are recognized without an explicit mode', async () => {
      globalThis.fetch = async (_input, init) => {
        assert.match(JSON.parse(String(init?.body)).systemInstruction.parts[0].text, /RESPONSE LANGUAGE: मराठी/);
        return final('clarification', 'तुम्हाला कोणत्या मतदारसंघाची माहिती हवी आहे?');
      };
      assert.equal((await POST(request({ question: 'उमेदवारांची माहिती सांगा' }))).status, 200);
    });
    await t.test('Marathi general summary falls back to exact totals when the model writes Hindi', async () => {
      let calls = 0;
      globalThis.fetch = async () => ++calls === 1 ? provider([{ functionCall: { name: 'aggregate', args: { group_by: 'all', metric: 'total_liabilities' } } }]) : final('answer', 'सभी उम्मीदवारों की कुल देनदारियाँ इस सूची में हैं।');
      const response = await POST(request({ question: 'सर्व उमेदवारांची एकूण देणी किती आहेत?', language: 'mr' }));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.match(body.answer, /एकूण देणी/);
      assert.match(body.answer, /1092.15 कोटी/);
      assert.match(body.answer, /999/);
      assert.doesNotMatch(body.answer, /उम्मीदवारों|करोड़|crore/);
    });
    await t.test('Marathi clarification and predictions remain neutral and localized', async () => {
      globalThis.fetch = async () => provider([{ functionCall: { name: 'search_candidates', args: { constituency: 'Mumbai' } } }]);
      const clarification = await POST(request({ question: 'मुंबईतील उमेदवारांची माहिती सांगा', language: 'mr' }));
      assert.match((await clarification.json()).answer, /कृपया अपेक्षित मतदारसंघ स्पष्ट करा/);
      globalThis.fetch = async () => { throw new Error('Prediction must not call provider'); };
      const prediction = await POST(request({ question: 'ठाण्यात कोण जिंकेल?', language: 'mr' }));
      assert.match((await prediction.json()).answer, /भाकीत करता येत नाही/);
    });
  } finally {
    globalThis.fetch = savedFetch;
    if (originalKey === undefined) delete process.env.ASSISTANT_API_KEY; else process.env.ASSISTANT_API_KEY = originalKey;
  }
});
