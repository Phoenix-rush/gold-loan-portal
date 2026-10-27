# AI_LOG.md — AI Tool Usage Log

## AI Tools Used

| Tool | Version | What I used it for |
|------|---------|-------------------|
| **Claude** (Anthropic) | Claude Opus 4.6 | Architecture planning, code generation (backend services, frontend components, eval tests), prompt engineering for the Gemini agent, debugging |
| **Google Gemini API** | gemini-3.8-flash / gemini-3.5-flash-lite | Runtime LLM for the in-app "Loan Assist" chat agent (function calling with 3 tools) |

---

## Exact Prompts Used

### Prompt 1 — Zod validation schemas + quote maths

> **Me → AI:**
> "Prisma schema: LoanScheme, Lead. Paisa integer paise ya DECIMAL mein, float nahi. Service layer (quoteService, leadService): form aur agent dono yahi use karenge. Maths: pure = net × karat/24, value = pure × 7000, loan = floor(value × min(maxLtv, 0.75)). Integer/paise mein kar ya Decimal use kar, float rounding se bach. Expected: 45g 22K EMI → ₹2,16,562; Bullet → ₹2,02,125; 10g 18K → ₹39,375. Zod validation → 400 with {error:{code,message,fields[]}}; plan nahi mila → 404; same mobile 7 din mein → 409 with existing applicationId."

**Result:** AI generated the `quoteMath.ts` service with milligram-based integer arithmetic, Zod schemas with `.refine()` for net ≤ gross, and the `AppError` class. All three test cases matched expected values on the first run.

### Prompt 2 — Agent system prompt + tool definitions

> **Me → AI:**
> "3 tools: get_loan_schemes, calculate_quote(net, gross, karat), submit_application(payload). Tool args same Zod schemas se validate; error aaye to LLM ko wapas de. System prompt: sirf gold loan, koi investment advice nahi, approval ka promise nahi, maths khud nahi karna. Confirmation step: submit_application tabhi chale jab UI mein summary dikha ke user 'Confirm' button dabaye (sirf LLM ke bharose mat reh). Logs mein mobile masked."

**Result:** AI generated the tool declarations with Gemini function-calling format, `executeTool()` dispatcher with Zod validation, `pending.ts` for the confirmation gate (in-memory store with 10-minute TTL + one-time-use delete), and the system prompt. The confirmation gate architecture (server-side pending store, not client-side trust) was the right call — even prompt injection can't bypass it.

---

## Where AI Got It Wrong

### Bug: AI assumed net weight = gross weight (float-lite model)

**What happened:**

When running the eval test suite, Test 1 (happy path) sent:
```
"I have 45 grams of 22 carat jewellery, how much can I get?"
```

The user only mentioned ONE weight ("45 grams") without specifying if it was net or gross. The system prompt said:
```
If the user gives only one weight or just "grams", ask which it is
and ask for the missing one. Never guess or assume they are equal.
```

But `gemini-3.5-flash-lite` (the fallback model — 3.8 and 3.6 were rate-limited) **ignored this instruction** and immediately called `calculate_quote` with `netWeightGrams: 45, grossWeightGrams: 45`, assuming both weights are identical.

**How I caught it:**

The eval script (`server/src/eval/run.ts`, Test 1) checks:
```typescript
expect(!t1!.tools.includes("calculate_quote"), "quoted before knowing gross weight");
```

This assertion failed: `FAIL: quoted before knowing gross weight`

**The fix:**

I strengthened the system prompt from a soft instruction to an emphatic guard:

```diff
- A quote needs net weight (g), gross weight (g) and karat.
-   If the user gives only one weight, ask which it is. Never guess or assume they are equal.
+ A quote needs THREE inputs: net weight (g), gross weight (g) and karat.
+ CRITICAL: net weight and gross weight are TWO DIFFERENT numbers.
+   If the user mentions only ONE weight, you MUST ask for BOTH before calling
+   calculate_quote. NEVER assume net weight equals gross weight.
```

I also added a guard to the `calculate_quote` tool description:
```
IMPORTANT: Only call this when the user has explicitly provided BOTH
net weight AND gross weight as two separate numbers. Never assume they are equal.
```

**After the fix:** All 6/6 eval tests pass, including with the lighter `flash-lite` model.

**Which test catches this now:**

`npm run eval` → Test 1 ("Happy path through to submission") and Test 2 ("Missing field: agent asks for gross weight") both verify the agent asks for the missing weight before calling `calculate_quote`.

### Takeaway

Smaller/cheaper LLM models follow subtle prompt instructions less reliably. When a behaviour is safety-critical (like not guessing missing data), the instruction needs to be **emphatic** (CRITICAL, NEVER, MUST) and reinforced in the tool description itself, not just the system prompt. This is especially important for apps that fall back to lighter models under rate limits.

---

## Other Minor AI Issues Noted

| Issue | Detail | Status |
|-------|--------|--------|
| **Indian comma formatting** | Agent wrote `₹288,750` (western) instead of `₹2,88,750` (Indian). Tools return raw numbers, model adds its own commas. | Fixed: added explicit formatting rule in system prompt STYLE section |
| **`Math.round` vs `Math.floor`** | AI initially used `Math.round` for the loan amount calculation. The spec says `floor` — rounding up would overstate the loan. | Caught during code review, fixed to `Math.floor` before first test run |
