# AI Election Transparency Platform

An AI-powered web platform that makes election candidate information transparent and easy to understand for voters. It ingests candidate affidavit data, scores candidates on credibility and financial transparency, and presents everything through an intuitive dashboard — including candidate profiles, side-by-side comparisons, data insights, and an AI chatbot.

Built with the **Next.js 15 App Router** and **React 18**.

## Features

- **Candidate Directory** — Browse and search candidates across constituencies and states, with filters for no criminal cases, high assets, and experience.
- **Candidate Profiles** — Detailed affidavits: criminal cases, assets, liabilities, education, age, and experience, plus AI-derived credibility, criminal-risk, financial-transparency, and performance scores.
- **Comparison** — Put candidates side by side to make informed decisions.
- **Insights** — Aggregated charts and analytics (top offenders, wealth distribution, criminal cases by party/constituency, etc.).
- **AI Chatbot** — Ask questions about candidates and get plain-language answers.
- **Affidavit OCR** — Upload a candidate's affidavit PDF; a vision LLM (OpenRouter Qwen3-VL) reads it page by page and returns the Form 26 fields as structured JSON, cross-validated against the candidate record. If OpenRouter is not configured, the endpoint falls back to OCR (Baidu Cloud, self-hosted Unlimited-OCR, Google Cloud Vision + Tesseract).

## Tech Stack

| Area          | Technology                                                              |
| ------------- | ----------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router), React 18, TypeScript                           |
| UI            | Material UI (MUI), Tailwind CSS 4, shadcn/ui (Radix), Framer Motion     |
| Charts        | Recharts                                                                 |
| Database      | PostgreSQL via Neon + Drizzle ORM                                       |
| OCR           | OpenRouter (Qwen3-VL), Google Gemini, Baidu Cloud Unlimited-OCR API, Baidu Unlimited-OCR (self-hosted), Google Cloud Vision, Tesseract.js, pdf.js, pdf-parse |
| Other         | Canvas, xlsx (Excel parsing), date-fns, react-hook-form                 |

## Getting Started

### Prerequisites

- Node.js (18+ recommended)
- npm (or pnpm/yarn)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in the values:

```bash
cp .env.local.example .env.local
```

| Variable                        | Purpose                                              | Required |
| ------------------------------- | ---------------------------------------------------- | -------- |
| `DATABASE_URL`                  | PostgreSQL (Neon) connection string for persistence  | Optional |
| `GEMINI_API_KEY`                | Google Gemini key for structured Form 26 extraction (bulk pipeline) | Optional |
| `GEMINI_OCR_MODEL`              | Gemini model (default `gemini-3-flash-preview`)      | Optional |
| `OPENROUTER_API_KEY`            | OpenRouter key used by both the upload endpoint and the bulk pipeline | Optional |
| `OPENROUTER_OCR_MODEL`          | OpenRouter model (default `qwen/qwen3-vl-32b-instruct`) | Optional |
| `GOOGLE_CLOUD_PROJECT`          | Google Cloud project ID for Vision OCR               | Optional |
| `GOOGLE_APPLICATION_CREDENTIALS`| Path to your Google Cloud service-account JSON       | Optional |
| `UNLIMITED_OCR_URL`             | Base URL of a self-hosted Baidu Unlimited-OCR server (OpenAI-compatible SGLang/vLLM) | Optional |
| `UNLIMITED_OCR_BACKEND`         | `sglang` or `vllm` (defaults to `vllm`)            | Optional |
| `UNLIMITED_OCR_MODEL`           | Model name served by the server (default `Unlimited-OCR`) | Optional |
| `BAIDU_API_KEY` / `BAIDU_SECRET_KEY` | Baidu Cloud OCR credentials for the fully managed Unlimited-OCR API | Optional |

> The app works out of the box with a bundled verified demo dataset. The database and OCR integrations are **optional** — without their environment variables, database-backed API endpoints return `HTTP 503` and the UI gracefully falls back to the demo data.
>
> There are two OCR paths:
>
> - **Upload endpoint** (`app/api/ocr`, used by the UI): **OpenRouter Qwen3-VL → Baidu Cloud (managed) → self-hosted Unlimited-OCR → Google Vision / pdf-text**. The Qwen step applies to PDFs and needs `OPENROUTER_API_KEY` plus prepaid OpenRouter credits; images still use the OCR providers below.
> - **Bulk pipeline** (`npm run db:ocr`, structured Form 26 JSON): **OpenRouter → Gemini → Baidu → self-hosted Unlimited-OCR → Tesseract**, selected automatically from which keys are set.
>
> Both paths store the same row shape: `_source`, `_model`, token counts, and `_estimatedCostUsd` sit in `parsedData` as `_`-prefixed meta keys alongside the Form 26 fields.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 4. (Optional) Set up the database

Apply the Drizzle schema and load demo candidates from the provided Excel data:

```bash
npm run db:push    # apply the schema
npm run db:seed    # load candidates from the Excel source
```

## Database & OCR

To run the bulk OCR pipeline that reads all candidate affidavit PDFs, extracts their Form 26 fields, matches them to candidates in the database, and stores scan records:

```bash
npm run db:ocr
```

`--engine` selects the extraction engine:

| Engine       | What it does                                                                 | Cost                                     |
| ------------ | ---------------------------------------------------------------------------- | ---------------------------------------- |
| `openrouter` | A vision LLM (default Qwen3-VL-32B) reads the whole PDF and returns Form 26 fields as JSON | ~$0.002/document; use a model ending in `:free` for the free tier |
| `gemini`     | Gemini reads the whole PDF with structured output                            | Free tier, quota-limited                 |
| `baidu`      | Managed Baidu Cloud Unlimited-OCR API (text OCR)                             | Free tier: 200–1000 pages                |
| `unlimited`  | Self-hosted Baidu Unlimited-OCR (SGLang/vLLM)                                | Your GPU                                 |
| `tesseract`  | Local Tesseract.js fallback                                                  | Free                                     |

With no `--engine` the pipeline picks the first configured engine in that order. `openrouter` and `gemini` store the structured extraction directly (only these report key-field coverage); the others store OCR text that is then parsed with regexes.

Useful options:

```bash
npm run db:ocr -- --engine=openrouter --limit=20 --state=Delhi --budget-cap=0.50 --concurrency=4
```

| Flag                      | Effect                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| `--engine=<name>`         | Select the extraction engine (table above)                          |
| `--limit=N`, `--state=X`  | Cap the queue / restrict to one state folder                        |
| `--force`                 | Re-scan files that already have a scan from this engine             |
| `--replace`               | Hard-delete existing rows for a file before inserting               |
| `--budget-cap=<usd>`      | Hard-stop before projected OpenRouter spend passes this amount      |
| `--concurrency=N`         | Parallel workers (default 4)                                        |
| `--keep-pan`              | Keep the PAN field (redaction is on by default)                     |
| `--max-pages=N`, `--scale=X` | Pages rendered / render scale for page-image engines            |
| `--verbose`               | Print every retry                                                   |

A VLM engine only skips files **it** has already read, so `--engine=openrouter` re-reads anything last processed by Tesseract or Gemini instead of inheriting those rows. PDFs whose filename matches no candidate in the database fail with `no DB match` and are listed at the end of the run.

### Comparing engines and diagnosing a bad extraction

```bash
npm run db:ocr:shootout -- --file=Delhi/Adv. Krupal.pdf   # try several Gemini models on one PDF
npm run db:ocr:compare                                     # field-by-field agreement across stored engines
npm run db:ocr:inspect -- "A. Gopala Krishna.pdf"          # dump the newest stored scan for a file
npm run db:ocr:probe -- "A. Gopala Krishna.pdf" qwen/qwen3-vl-32b-instruct 4   # raw model response, no DB write
```

### Interesting: use the managed Baidu Cloud API

The exact Unlimited-OCR model is hosted on Baidu Cloud — no GPU, no Python server. Sign up at [Baidu Cloud](https://cloud.baidu.com/product/ocr), create an OCR application, then set:

```
BAIDU_API_KEY=your-api-key
BAIDU_SECRET_KEY=your-secret-key
```

Free tier: 200 pages (personal) / 1000 pages (business verification). This works on any machine — the bulk pipeline becomes simply:

```bash
npm run db:ocr -- --engine=baidu
```

### Running self-hosted Baidu Unlimited-OCR (optional)

**Local GPU or cloud GPU required.** Open [`colab/Unlimited-OCR-server.ipynb`](./colab/Unlimited-OCR-server.ipynb) in Google Colab (free T4 GPU), run all cells, and copy the printed tunnel URL into `.env.local`.

```bash
# SGLang (omit --attention-backend on T4/Ampere GPUs; SGLang picks the right one)
python -m sglang.launch_server \
  --model baidu/Unlimited-OCR \
  --served-model-name Unlimited-OCR \
  --page-size 1 --mem-fraction-static 0.8 \
  --context-length 32768 --enable-custom-logit-processor \
  --host 0.0.0.0 --port 10000
```

```bash
# vLLM (also set UNLIMITED_OCR_BACKEND=vllm)
docker run --rm --gpus all --network host --ipc host \
  vllm/vllm-openai:unlimited-ocr \
  baidu/Unlimited-OCR --trust-remote-code \
  --logits_processors vllm.model_executor.models.unlimited_ocr:NGramPerReqLogitsProcessor \
  --no-enable-prefix-caching --mm-processor-cache-gb 0
```

Single-image requests use the `gundam` mode (`image_size=640`); multi-page/PDF requests use `base` mode (`image_size=1024`).

## Available Scripts

| Script         | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `npm run dev`  | Start the Next.js development server                              |
| `npm run build`| Create a production build                                         |
| `npm run start`| Start the production server (after `build`)                       |
| `npm run db:push` | Apply the Drizzle schema to the database                     |
| `npm run db:seed` | Load demo candidates from the Excel source into the database  |
| `npm run db:ocr`  | Run the bulk affidavit OCR pipeline                          |
| `npm run db:ocr:shootout` | Compare Gemini models on one affidavit PDF            |
| `npm run db:ocr:compare`   | Field-by-field agreement report across stored scans  |
| `npm run db:ocr:inspect`   | Dump the newest stored scan for a filename           |
| `npm run db:ocr:probe`     | Print a raw model response for one PDF (no DB write) |
| `npm run test`       | Run the OCR extraction unit tests (`src/lib/ocr/vlm.test.ts`) |

## Project Structure

```
├── app/                    # Next.js App Router (routes + API endpoints)
│   ├── page.tsx            # Home page
│   ├── candidate/          # Candidate profile pages
│   ├── chat/               # AI chatbot page
│   ├── compare/            # Candidate comparison page
│   ├── insights/           # Insights / analytics page
│   └── api/                # API routes (candidates, constituencies, insights, ocr)
├── src/
│   ├── app/
│   │   ├── components/     # Reusable React components (UI + feature)
│   │   ├── data/           # Mock / demo data
│   │   └── pages/          # Feature page implementations
│   └── lib/
│       ├── db.ts           # Database client (Drizzle + Neon)
│       ├── schema.ts       # Drizzle table definitions
│       ├── seed.ts         # Database seeding script
│       ├── parseCandidates.ts # Excel → candidate data parser
│       ├── ocrBulk.ts      # Bulk pipeline: queue, candidate matching, storage
│       ├── ocrCompare.ts   # Cross-engine field agreement report
│       ├── ocrShootout.ts  # Gemini model shootout on one PDF
│       ├── ocrProbe.ts     # Raw model response for one PDF (no DB write)
│       ├── ocrInspect.ts   # Dump the newest stored scan for a file
│       └── ocr/            # Extraction engines + shared layer
│           ├── vlm.ts      # Engine interface, Form 26 prompt/schema, JSON repair, tests
│           ├── gemini.ts   # Gemini engine (whole-PDF structured output)
│           ├── openrouter.ts # OpenRouter vision-LLM engine
│           ├── baidu.ts    # Managed Baidu Cloud OCR client
│           ├── unlimited.ts # Self-hosted Unlimited-OCR client
│           ├── service.ts  # Extraction chain used by the upload endpoint
│           ├── parser.ts   # Regex parser for OCR text
│           ├── pdf.ts      # PDF page rendering
│           └── privacy.ts  # PAN / PII redaction
├── colab/                  # Google Colab notebook for running Unlimited-OCR on a free GPU
├── Candidate Affidavits/   # Raw affidavit source data (Excel)
├── drizzle.config.ts       # Drizzle Kit configuration
└── .env.local.example      # Example environment variables
```

## Design Reference

The original UI design for this platform is available on Figma:
[Ai Election Transparency Platform (Figma)](https://www.figma.com/design/QXVjKQ5hSKJ7vqE2Z3oLzQ/AI-Election-Transparency-Platform)

## License

Private / educational project. See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party attributions.

## AI Assistant

The existing `/chat` page is the **AI Assistant** entry in the shared desktop/mobile navigation. It uses the same Next.js App Router, TypeScript, Tailwind cards, Lucide icons and shared UI controls as Candidate Verification and Candidate Comparison. No extra dependencies or database are needed.

### Configure and run

Set `ASSISTANT_API_KEY` (or the existing `GEMINI_API_KEY`) in `.env.local`. `ASSISTANT_MODEL` defaults to `gemini-3.5-flash-lite` and can be changed to a Gemini model supporting `generateContent` function calling. Keys stay in the server route; never use a `NEXT_PUBLIC_` variable. Restart the dev server after changing environment variables.

```bash
npm run assistant:clean
npm run test:assistant
npm run dev
```

Open `http://localhost:3000/chat`. An unconfigured assistant displays a configuration error; it does not substitute invented demo answers.

### Source data and cleaning

The default source is `../Candidate Affidavits/Candidate Detailed Info.xlsx`, the original workbook at the repository root. There is also a different copy at `Candidate Affidavits/Candidate Detailed Info (1).xlsx` used by verification. They each have 999 records but contain some different spellings and education values; they are not silently merged. Choose a different source explicitly with:

```bash
npm run assistant:clean -- "Candidate Affidavits/Candidate Detailed Info (1).xlsx"
```

The script writes `src/lib/data/candidates_clean.json` and source metadata in `assistant_source.json`. It trims text and repeated whitespace, merges case variants within education/party/constituency labels, converts assets and liabilities to exact integer rupees, and derives `net_worth` (`netWorth` is a compatibility alias). `id` preserves the sheet's Sr.no; IDs are not assumed to be contiguous. Constituency original labels remain in `constituencyRaw`, SC/ST becomes `reservation`, and `constituencyKey` supports normalized lookup. Only named required columns are read; extra columns are ignored. Invalid money, duplicate IDs and missing required values fail loudly. No state is inferred because the sheet has no state column. Rebuild/restart after changing the generated JSON.

### API and clarification

`POST /api/assistant` accepts `{ "question": "Average age of BJP candidates?" }` and returns `{ answer, context }`. Send the returned opaque `context` with the next question to continue. It is signed, expires after one hour, keeps up to 12 messages and can be reset with **New chat**. Set a stable `AUTH_SECRET` across production instances (otherwise the API key signs context). The frontend keeps the token only in memory.

Gemini chooses from `search_candidates`, `get_candidate`, and `aggregate`. TypeScript validates every tool argument and executes filtering, numerical sorting, counts and aggregates on bundled JSON. Each response includes exact rupees alongside Indian money formatting. Names with typos/partial matches and duplicate names require confirmation; unmatched or partial constituency/education/party labels return suggestions. Exact names or labels can then be used in a follow-up. Results are capped at 10 with total counts. Final factual answers require successful tool results in the current turn; unsupported questions and clarification questions can be answered without a lookup. Neutrality and language rules are in the server system prompt, and a source/declared-cases disclaimer is appended in code.

The endpoint supports parallel and sequential tool calls within a bounded budget, preserves Gemini thought signatures, limits questions to 300 characters, bounds request bytes and provider time, and returns safe errors. The UI includes six examples, loading feedback, accessible chat/error states, retry and a new-chat control.

Rate limiting is basic: 10 requests/minute/IP in process memory with expired-entry eviction. Production replicas need a shared limiter (for example Redis) and a trusted reverse proxy that overwrites forwarding headers. Signed context is tamper-resistant, not encrypted; avoid putting sensitive personal information in questions. The sheet and prompt constrain answers, but live model behavior still needs manual checks; this implementation does not claim that arbitrary model wording is guaranteed accurate.

### Accuracy checks

`src/lib/assistantTools.test.ts` contains 15 natural-language sample questions with fixed expected answers independently checked against the original XLSX, plus full-row money reconciliation and ambiguity/validation tests. These check calculations directly without a paid LLM call. If the source workbook is intentionally changed, review and update the frozen answers rather than regenerating them automatically.

`src/lib/assistantRoute.test.ts` uses a mocked Gemini provider to check the endpoint, multiple tools, signed follow-ups, clarification, no-tool factual-answer blocking, errors, input bounds and rate limiting. To check live model interpretation manually, ask the 15 sample questions in the UI and compare with their expected values; also try `Who will win?`, `Tell me about Kumar`, `Candidates in Mumbai`, and a follow-up such as `And their liabilities?`. Gemini function calling follows the [official API documentation](https://ai.google.dev/gemini-api/docs/function-calling).

### Troubleshooting assistant connectivity

The development server must be allowed to make outbound HTTPS requests to Gemini. A server launched inside a restricted execution sandbox can serve the UI while every AI request fails with a network access error. Run `npm run dev` from a terminal with network access, or allow network access when launching it through an agent. The endpoint distinguishes network, timeout, provider authentication, model availability and quota errors; server logs contain only safe error codes/statuses, not provider payloads or API keys.

Past-winner lookups use only an explicit trailing `Winner` marker in the sheet candidate names (`search_candidates` filter `winner: true`). For example, Thane has Naresh Ganpat Mhaske marked Winner. Answers describe that sheet marker; they do not infer an election year, current office, vote count, margin or future outcome. Candidates without the marker are not automatically classified as losers.

Delhi queries cover all seven constituency labels containing Delhi in this sheet (70 candidates); New Delhi remains a single constituency (10 candidates). For example, 33 Delhi candidates have assets strictly above Rs 1 crore. Other partial constituency labels such as Mumbai still require confirmation. Clarification tool results end the turn immediately, so a model cannot silently drop a filter after receiving an ambiguity response.

When tools have already returned exact data, a malformed, truncated, timed-out or unavailable final LLM response falls back to a plain-code rendering of those tool results. This fallback does not parse questions or invent queries and still shows result totals, up to 10 records, and the source disclaimer. If the initial model lookup itself cannot run, the service error is still displayed.

### Assistant languages

The assistant has four explicit response modes: **English**, **Hinglish** (Hindi phrasing in Roman letters) and **हिन्दी** (Hindi vocabulary in Devanagari). The selected mode applies to the next reply without resetting conversation context and is remembered in browser local storage when available. Before a manual choice, input script/wording can select an initial mode. Welcome text, examples, input prompts, controls and source disclaimers follow the selected language.

Send `language: "en"`, `"hinglish"`, `"hi"`, or `"mr"` with `POST /api/assistant`. Invalid values return 400. Clients omitting the field get language detection from the question. Explicit selection overrides the current question's language and previous conversation language. The server adds a language-specific system instruction and checks the response script. Hindi requires Devanagari instead of Roman Hindi. Clarifications and code-rendered fallback answers use localized vocabulary and rupee units; unfamiliar proper names retain their exact source spelling in fallback output to avoid inventing transliterations.


Marathi uses its own system instruction, localized examples, controls, source note, clarification and fallback wording. The selector remembers Marathi just like the other modes. Explicit preference takes priority; older clients without a language field can detect common Marathi wording separately from Hindi. Tool lookups accept a curated set of native-label aliases such as ????/THANE, ????/PUNE, ????/BJP and ??????/Graduate; ambiguous ????? still asks for a constituency. Unknown proper names retain source spelling in fallback output.

General sheet queries now support inclusive filters for liabilities and net worth (including negative values), plus SC/ST/no-tag constituency reservation filters. Overall summaries use `aggregate` with `group_by: "all"`. Added metrics cover total assets, average/total liabilities, average/total net worth, minimum/maximum age, average declared cases, candidates declaring cases and their percentage. Existing party/constituency/education grouping, rankings and candidate-profile tools remain available. SC/ST refers to the recorded constituency label, not candidate caste; missing tags are not treated as independently verified reservation status. Information absent from the sheet still requires a clear limitation or clarification.


## Dashboard and appearance

The shared application shell has a navy sidebar, breadcrumb header, responsive mobile navigation, keyboard focus indicators and a skip-to-content link. The dashboard combines a hero, four sheet-based summary cards, quick links, a paginated candidate directory, party-count bars and a source-context panel. It uses initials instead of external photo requests and presents declared figures directly from the cleaned sheet. The dashboard does not depend on the database: `GET /api/dashboard` reads bundled cleaned JSON, supports search, constituency and quick filters, and returns nine candidates per page. Existing verification, comparison, assistant, profile and authentication routes remain available.

Run `npm run test:dashboard` for summary reconciliation, search, filters, sorting, pagination and empty-state checks.

## Login and accounts

`/signup` creates a database account and signs the user in; `/login` verifies saved credentials and opens the dashboard. Usernames are case-sensitive (3-64 letters, digits, dots, underscores or hyphens for new accounts). Registration validates name, integer age 1-120, an 8-128-character password and matching confirmation on the server. The form handles pending requests, repeat submissions, server errors and network failures. The workspace header refreshes its account state after navigation and provides Sign out.

Passwords use salted scrypt hashes. Session cookies are HTTP-only, SameSite=Lax, Secure in production and expire after 30 days; the signed token also enforces expiry on the server. Login, registration and session responses use Cache-Control: no-store. Basic per-process rate limiting caps valid-shaped login/registration attempts at 20 per IP/action per 10 minutes; production replicas need a shared limiter and a trusted proxy for forwarding headers.

A database with the `users` table is required. Set a strong, stable `AUTH_SECRET` in production and whenever sessions should survive development-server restarts. Development without that variable uses a randomly generated process secret, retained through hot reloads. Old session cookies from the previous token format require signing in again. Candidate information remains publicly accessible; adding login does not restrict the existing public pages. Password recovery is not configured because the account currently has no verified recovery channel. Placeholder Terms/Privacy buttons have been removed instead of presenting nonfunctional legal controls.

Run `npm run test:auth` for isolated validation, hashing, session, duplicate-account, error-handling and rate-limit tests. With the local dev server running and `.env.local` configured, `npm run auth:check-live` exercises real registration, login, session cookies and logout against localhost. It creates one randomly named synthetic account and removes exactly that account afterward; it prints no passwords or cookies. `tsx --env-file=.env.local src/lib/checkAuthLive.ts --check-only` checks access to the users table without reading account records.

## Vercel deployment

Deploy from `source_code` (set that as the Root Directory when importing the repository). The Next.js preset and build command are in `vercel.json`.

Set production environment variables in Vercel: `DATABASE_URL`, a strong random `AUTH_SECRET`, and the existing AI/OCR provider keys. For Google Vision, set `GOOGLE_CREDENTIALS_JSON` to the service-account JSON contents instead of copying the local `GOOGLE_APPLICATION_CREDENTIALS` path. Credentials must stay server-only. A self-hosted OCR URL must be reachable from Vercel.

The deployment includes the verification workbook and bundled candidate JSON. `.vercelignore` excludes local environment files, development artifacts and the bulk source PDF archive; bulk OCR scripts remain local jobs.

Run `npx vercel login`, `npx vercel link`, then `npx vercel --prod` from this directory. Production OCR requests are also subject to Vercel's request body and execution limits.
