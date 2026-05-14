# 🗺️ SmartFinance AI — Master Build Plan

## Phase Overview

| Phase | Feature | Effort | Priority |
| :--- | :--- | :--- | :--- |
| Phase 1 | AI Finance Advisor Chat | 2–3 hrs | 🔴 Critical |
| Phase 2 | Smart Auto-Categorization | 1–2 hrs | 🔴 Critical |
| Phase 3 | Roast My Spending Report | 1–2 hrs | 🟡 High |
| Phase 4 | Predictive Spend Alerts | 4–5 hrs | 🟡 High |
| Phase 5 | Receipt / UPI OCR | 5–6 hrs | 🟢 Advanced |

---

## ✅ Phase 1 — AI Finance Advisor Chat
**Goal:** Let users ask natural language questions about their own financial data.

### Checklist
- [x] Add `POST /api/chat` endpoint in `server.js`
- [x] Inside the endpoint, fetch live data from `/api/summary`, `/api/trend`, `/api/category-breakdown`
- [x] Build a system prompt that injects the fetched JSON as context:
    ```text
    You are a personal finance advisor for an Indian college student.
    Their financial data this month: {summary JSON}
    Category breakdown: {breakdown JSON}
    Answer concisely. Use ₹ for amounts. Be practical.
    ```
- [x] Call Groq API (`llama-3.3-70b-versatile`) with the system prompt + user message
- [ ] Add a chat widget in `index.html` (floating button → slide-up panel)
- [x] Wire `app.js` to call `POST /api/chat` on message send
- [x] Stream the response (optional but impressive)

**Phase 1 Done When:**
User can type "How much did I spend on food this month?" and get a data-backed answer from the dashboard.

---

## ✅ Phase 2 — Smart Auto-Categorization
**Goal:** When user types a transaction description, AI suggests the correct category instantly.

### Checklist
- [ ] Add `POST /api/suggest-category` endpoint in `server.js`
- [ ] Fetch all category names from DB and pass to Gemini Flash prompt:
    ```text
    Given this transaction description: "{description}"
    And these available categories: {categories list}
    Return ONLY the most likely category name. No explanation.
    ```
- [ ] Use Gemini Flash (`gemini-1.5-flash`) for speed (sub-200ms response)
- [ ] In the Add Transaction form (`index.html`), add a debounced `oninput` listener on the description field
- [ ] Auto-select the dropdown value when suggestion returns
- [ ] Show a small ✨ icon to indicate AI-suggested category (user can override)

**Phase 2 Done When:**
Typing "Zomato biryani" in the description field auto-selects "Food & Dining" in the category dropdown.

---

## ✅ Phase 3 — Roast My Spending
**Goal:** Generate a witty, personalized monthly financial roast using LLM.

### Checklist
- [ ] Add `GET /api/roast?month=YYYY-MM` endpoint in `server.js`
- [ ] Fetch full month's category breakdown and budget health data
- [ ] Build prompt:
    ```text
    You are a brutally honest but funny financial advisor.
    Roast this Indian college student's spending for {month}:
    {category breakdown with amounts}
    Budget status: {budget health JSON}
    Write 3–4 punchy sentences. Use ₹. Be specific, funny, and actionable.
    ```
- [ ] Use Gemini Flash or Groq for generation
- [ ] Add a "Roast Me 🔥" button on the Dashboard
- [ ] Display result in a styled modal/toast card with a fire emoji header
- [ ] Cache the roast in `localStorage` per month (don't re-generate on refresh)

**Phase 3 Done When:**
Clicking "Roast Me 🔥" generates a unique, data-specific roast like "₹2,400 on Swiggy? Your kitchen exists for decoration apparently."

---

## ✅ Phase 4 — Predictive Spend Alerts
**Goal:** Warn users early in the month if they're trending toward budget overrun.

### Checklist
- [ ] Add `GET /api/predict-alerts` endpoint in `server.js`
- [ ] Fetch last 3 months of transactions grouped by category from DB
- [ ] Calculate current month's spend-so-far per category
- [ ] Build prompt:
    ```text
    Given 3 months of spending history and current month's partial data:
    History: {JSON}
    Current (day {X} of month): {JSON}
    Budgets: {JSON}
    Predict which categories will exceed budget. Return JSON array:
    [{ category, predicted_total, budget, risk: "high"|"medium" }]
    ```
- [ ] Parse LLM JSON response (use `JSON.parse` with `try/catch`)
- [ ] Display alerts as colored warning banners on the Dashboard
- [ ] Re-fetch alerts once daily (store last fetch timestamp in `localStorage`)
- [ ] Add a visual trend indicator (↑ / → / ↓) per category in Budget view

**Phase 4 Done When:**
On day 15 of the month, the dashboard shows "⚠️ Food is on track to exceed budget by ₹800 this month" based on trend.

---

## ✅ Phase 5 — Receipt / UPI Screenshot OCR
**Goal:** User uploads a GPay/PhonePe screenshot → transaction auto-fills.

### Checklist
- [ ] Add `POST /api/ocr-receipt` endpoint in `server.js` (accept `multipart/form-data`)
- [ ] Use `multer` middleware for file upload handling
- [ ] Send image to Gemini Vision (`gemini-1.5-flash` with image input):
    ```text
    Extract transaction details from this UPI payment screenshot.
    Return JSON only: { amount, merchant_name, date, suggested_category }
    ```
- [ ] On success, auto-populate the Add Transaction form fields
- [ ] Add an "📷 Scan Receipt" button next to the Add Transaction form
- [ ] Handle errors gracefully (non-receipt images, blurry screenshots)
- [ ] Show a preview thumbnail of the uploaded image in the form

**Phase 5 Done When:**
Uploading a GPay screenshot auto-fills ₹349, "Zomato", today's date, and suggests "Food & Dining" — user just clicks Save.

---

## 🔁 Execution Rules
1. Complete each phase's full checklist before moving to the next.
2. Test on real data — use your own mock transactions from `seed.sql`.
3. **Environment variables:** Store all API keys in a `.env` file, never hardcode.
4. **Error boundaries:** Every LLM call must have a `try/catch` with a graceful fallback UI message.
5. **Rate limit awareness:** Cache LLM responses where possible (roast, alerts) to avoid burning API quota.
