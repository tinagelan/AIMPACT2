# AImpact — Business efficiency diagnosis (MVP)

A SaaS that turns an SMB's headcount, processes and software spend into a prioritized, financially honest efficiency plan. Built from PRD v1.0, Phase One.

## Run locally

```powershell
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000 (Hebrew, RTL) or http://localhost:3000/en. In development the sign-in page shows the magic link directly, because there is no mail server. Sign in with the email in `ADMIN_EMAILS` (`.env`) to see `/admin/catalog` and `/admin/metrics`.

Optional: set `ANTHROPIC_API_KEY` in `.env` to enable the free-text extraction and the AI-worded clarifying questions. Without it, the app works fully on forms.

## Tests

```powershell
npm test
```

Engine unit tests, including golden cases for the 3 PRD scenarios and the "iron rule".

```powershell
npx playwright install chromium
npm run e2e
```

Browser end-to-end test for scenario 2. It needs the Playwright browser download first.

## Architecture

| Area | Where | Notes |
|---|---|---|
| Engine (pure TS, no I/O) | `src/engine/` | `analyze(profile, catalog)` → `Report`. Runs on the server for reports and in the browser for the simulator. |
| Financial rules | `employerCost.ts`, `severance.ts`, `roi.ts`, `benefits.ts` | 25–30% employer multiplier; Section 14 severance; PRD ROI and break-even formulas. |
| Iron rule | `benefits.ts` (`PnLSaving` branded type) | Hours turn into P&L money only through a confirmed FTE reduction. Revenue only counts with a redirect plus a known value per hour. Hire avoidance is shown as *avoided cost*, never as P&L. |
| Recommendation rules | `src/engine/rules/` | Duplicate SaaS, unused seats, low usage, process change vs. automation (alternatives, counted once), hire vs. automate. |
| Confidence | `confidence.ts` | Exact > range > benchmark. Benchmark-heavy input is capped at Medium. Lists what would raise confidence. |
| Benchmarks | `src/benchmarks/` | Vertical task splits and indicative salaries. Always labeled as benchmarks. |
| Catalog | `src/catalog/` | 43 seeded tools, all **unverified** until an admin verifies them. A Claude-assisted price check creates proposals that an admin approves. |
| AI | `src/ai/` | Claude (`claude-opus-5-5`, low effort, refusal fallbacks). Extracts structure from free text and words questions. It never computes numbers and never receives salaries. |
| Paywall | `src/paywall/` | Free-tier redaction happens server-side. The payment provider is a mock (`payments.ts`). |
| Import | `src/ingest/`, `/api/upload` | CSV/XLSX parsed in memory; files are never stored. |

## Deviations from the plan

- **SQLite instead of Postgres:** this machine has no Docker or Postgres. To switch, change `provider` in `prisma/schema.prisma` to `postgresql`.
- **Wizard answers are stored as one validated JSON profile** per diagnosis (Zod), not as normalized tables.
- **Minimal built-in magic-link auth** instead of Auth.js (tokens hashed, httpOnly session cookie). Production needs a mail provider in `src/lib/auth.ts`.
- **PDF export uses a print-optimized page** with the browser's "Save as PDF". Server-side PDF libraries render Hebrew RTL incorrectly.
- **Claude model is `claude-opus-5-5`** (the plan said Sonnet). Change `AI_MODEL` in `src/ai/client.ts` to trade quality for cost.

## Before production

- Real payment provider (hosted card page only) in `src/paywall/payments.ts`.
- Transactional email for magic links.
- Verify catalog prices: every seeded price is indicative.
- Review salary benchmarks and the employer multiplier with an Israeli payroll expert. Have a lawyer review the severance and Section 14 wording.
