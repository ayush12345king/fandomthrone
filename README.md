# Fandom Throne

Fans pay to put their favourite on top of a live leaderboard. Seven boards: IPL teams, cricketers, K-pop groups, anime characters, football clubs, Bollywood stars and F1 drivers. Fans can add missing names.

No dependencies. Static pages in `public/`, serverless functions in `api/`, data in Upstash Redis, payments through Stripe or Razorpay.

## Run locally

```
npm run dev        # http://localhost:3000, in-memory database, fake payments
```

## Deploy on Vercel (about 15 minutes)

1. **Import the repo.** vercel.com → Add New → Project → import `fandomthrone` from GitHub. Framework preset: **Other**. Leave the build settings empty. Deploy.
2. **Add the database.** Project → Storage → Create/Connect → **Upstash for Redis** (free plan) → connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. **Add environment variables** (Project → Settings → Environment Variables):

| Name | Value |
|---|---|
| `PAYMENT_PROVIDER` | `dodo` (default), `stripe` or `razorpay` |
| `DODO_API_KEY` | Dodo API key (Developer → API keys) |
| `DODO_ENV` | `test` or `live` |
| `DODO_PRODUCT_INR` / `DODO_PRODUCT_USD` | ids of two "Pay What You Want" products, one priced in INR and one in USD |
| `DODO_WEBHOOK_SECRET` | `whsec_…` from Developer → Webhooks (endpoint `/api/webhook-dodo`, event `payment.succeeded`) |
| `CURRENCY` | `USD` (Stripe) or `INR` (Razorpay) |
| `MIN_BID` | optional, e.g. `1` for USD, `20` for INR |
| `SITE_URL` | `https://your-domain.com` |
| `ADMIN_TOKEN` | a long random password for moderation |
| `STRIPE_SECRET_KEY` | `sk_live_…` (Stripe → Developers → API keys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (step 4) |
| `RAZORPAY_KEY_ID` | `rzp_live_…` (Razorpay → Account & Settings → API keys) |
| `RAZORPAY_KEY_SECRET` | from the same page |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you type in step 4 |

4. **Add the payment webhook** (backup in case a buyer closes the tab before the thank-you page loads):
   - Stripe: Developers → Webhooks → Add endpoint → `https://your-domain.com/api/webhook-stripe`, event `checkout.session.completed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
   - Razorpay: Settings → Webhooks → Add → `https://your-domain.com/api/webhook-razorpay`, events `payment.captured` and `order.paid`, choose a secret and put it in `RAZORPAY_WEBHOOK_SECRET`.
5. **Connect the domain.** Project → Settings → Domains → add your domain and follow the DNS instructions from your registrar.
6. **Redeploy** (Deployments → ⋯ → Redeploy) so the new variables are used.

## Moderation

Hide a contender, or clear the latest message on one:

```
curl -X POST https://your-domain.com/api/admin -H 'Content-Type: application/json' \
  -d '{"token":"ADMIN_TOKEN","action":"hide","board":"kpop","id":"some-id"}'
```

Actions: `hide`, `unhide`, `clearMsg`. Board ids: `ipl`, `cricketers`, `kpop`, `anime`, `football`, `bollywood`, `f1`. Contender ids are shown in `/api/board?id=<board>`.

Names, display names and messages also go through a word filter in `lib/util.js`.

## Change the boards

Edit `lib/boards.js`. Each board has an id, name, colour, text colour, one-line blurb and starting names.
