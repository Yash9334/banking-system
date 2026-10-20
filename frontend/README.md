# Digital Banking System — Frontend

React + Vite + Tailwind dashboard that exercises the Spring Boot microservices (Account, Transaction, Payment, Fraud Detection, Notification, API Gateway). Everything shown comes from real backend responses; where the backend cannot supply something, the UI says "Not available".

## Run on Windows
Prerequisites: Node.js 18+ (`node -v`), and the backend running: `docker compose up -d` (Kafka, Redis), MySQL on 3306, then start all six Spring Boot services.

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```
Open **http://localhost:5173**. Production check: `npm run build` (output in `dist/`).

## API configuration
The browser calls its own origin; the Vite dev server proxies to the backend (no CORS needed because no service configures it).
- `API_MODE=gateway` (default): `/api/**` → API Gateway `http://localhost:8080`
- `API_MODE=direct`: bypass the gateway (accounts 8081, transactions 8082, payments 8083) — use if the gateway/Redis isn't running.
- Health: `/_health/<service>` → `<service>/actuator/health`; Kafka/Redis/MySQL: TCP probe by the dev server.
Edit `.env`, then restart `npm run dev`. No secrets are used in the frontend (Razorpay only needs the public key id, which the backend returns).

## Endpoints used
| Service | Endpoint |
|---|---|
| Account | `POST /api/v1/accounts`, `GET /api/v1/accounts/{n}`, `GET …/{n}/balance`, `PUT …/{n}/block` |
| Transaction | `POST /api/v1/transactions/transfer`, `GET /{id}`, `GET /account/{n}`, `POST /{id}/verify?otp=` |
| Payment | `POST /api/v1/payments/create-order` |
| Health | `GET /actuator/health` on all six services |
Not used on purpose: `/accounts/{n}/deduct|credit` (internal Saga calls) and `/payments/webhook` (Razorpay → backend only).

## Works end to end
Create/find/block account · transfer with live status polling · history by sender account · fraud outcomes & refund reasons · OTP submission (with status re-check) · Razorpay order creation and Checkout (test mode) · service health · architecture/flow pages.

## Needs backend support
- **Correct OTP does not complete the transfer** (backend bug) — see `docs/BACKEND_NOTES.md`.
- Payment status after checkout (no GET endpoint; webhook needs a public URL such as ngrok).
- Notifications: the service only logs to console; no API/SSE. Two handlers lack `@KafkaListener`.
- System-wide totals and lists (accounts, all transactions) — no such endpoints; dashboard uses accounts seen in this browser.
- Readable error messages (backend returns bare 500s).

## Demo script
1. **Architecture** page: show the services, live health, and the Saga flow.
2. **Accounts**: create "Asha" with ₹10,000 and "Ravi" with ₹500.
3. **Transactions**: send ₹1,000 Asha → Ravi. Watch PROCESSING → COMPLETED.
4. Send ₹5,000 (more than 90% of the remaining balance) → fraud check → **PENDING_VERIFICATION**. Alternatively send 6 transfers within a minute (velocity rule).
5. Open the Notification Service console, copy the OTP ("Your OTP is: …"). On **Fraud & OTP** enter it. (Until the backend fix, a correct OTP leaves the status unchanged — the UI says so. Demonstrate the refund path with a deliberately wrong OTP: sender refunded, status FLAGGED, account BLOCKED.)
6. **Payments**: create an order, open Razorpay Checkout with test credentials; explain the lifecycle panel and the webhook.
7. **Notifications**: explain the Kafka consumers and what is missing for live display.
8. **Dashboard**: summary of status counts and service health.

## Structure
`src/api` (axios + per-service modules) · `components` · `layouts` · `pages` · `hooks` · `utils` · `vite.config.js` (proxy + probe).
