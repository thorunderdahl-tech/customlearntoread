# CustomLearnToRead — self-hosted store

Next.js 14 + Stripe site that replaces the Etsy listing. Sells personalized
learn-to-read books as one-time orders or as a monthly subscription. Orders
arrive in your inbox as a formatted email — no admin dashboard, no inventory
system, no Etsy fees.

## What it does

- Landing page with hero, how-it-works, format options, monthly book club, FAQ
- Personalization order form (child name, look, themes, photos can be sent via reply)
- Stripe Checkout for both one-time payments and recurring monthly subscriptions
- Stripe webhook that emails you (the shop owner) every order with full personalization details
- Customer confirmation email
- Privacy and terms pages

## Run locally

```bash
cd site
npm install
cp .env.example .env.local
# fill in .env.local with your Stripe + Resend keys (see below)
npm run dev
```

Visit http://localhost:3000.

## Stripe setup (one-time, ~15 minutes)

1. Create a Stripe account at https://dashboard.stripe.com.
2. In the dashboard, go to **Product catalog → Add product**. Create five products:

| Product | Price | Type |
|---|---|---|
| Digital PDF | $19 | One-time |
| Single Paperback | $34 | One-time |
| Paperback Set of 3 | $89 | One-time |
| Hardcover Set of 3 | $129 | One-time |
| Monthly Book Club | $24/month | Recurring (monthly) |

3. After creating each, click into the product and copy the **Price ID** (starts with `price_`).
4. Paste those IDs into `.env.local`:

```
STRIPE_PRICE_DIGITAL=price_...
STRIPE_PRICE_PAPERBACK_SINGLE=price_...
STRIPE_PRICE_PAPERBACK_SET=price_...
STRIPE_PRICE_HARDCOVER_SET=price_...
STRIPE_PRICE_SUBSCRIPTION_MONTHLY=price_...
```

5. Get your API keys from **Developers → API keys** and add to `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

(Use the test keys while developing; switch to live keys when ready.)

### Webhook

The webhook is what triggers the order email to you after a successful payment.

**Locally (testing):** install the Stripe CLI and forward events to your dev server:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook
```

The CLI prints a webhook signing secret (`whsec_...`). Add it to `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**On production (after deploy):**

1. In Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://yourdomain.com/api/webhook`.
3. Listen for: `checkout.session.completed` and `invoice.paid`.
4. Copy the signing secret and set `STRIPE_WEBHOOK_SECRET` in your Vercel/host env vars.

## Email setup (Resend, ~5 minutes)

The site uses [Resend](https://resend.com) to email you and the customer.

1. Create a free Resend account (free tier covers 3,000 emails/month).
2. Add and verify your sending domain — or for fast testing, use the
   pre-verified `onboarding@resend.dev` sender.
3. Copy your API key into `.env.local`:

```
RESEND_API_KEY=re_...
OWNER_EMAIL=lydia@example.com         # where new orders are emailed
FROM_EMAIL=orders@customlearntoread.com  # must be a verified domain
```

If `RESEND_API_KEY` is missing, payments still work — orders just won't get
emailed. You can read them in the Stripe dashboard under Payments / Subscriptions.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to vercel.com → New Project → import the repo.
3. Set **Root Directory** to `site` (this folder).
4. Add every env var from `.env.example` to Vercel's project settings.
5. Deploy. Then add your custom domain.
6. Set up the production webhook in Stripe (see Webhook section above) pointing
   at `https://yourdomain.com/api/webhook`.

## Pricing / catalog changes

Edit `lib/products.ts` to change prices, names, or copy. If you change a price,
also update the matching Stripe Price (or create a new one and swap the ID).

## What's not included (intentionally)

- **No admin dashboard.** Orders come to you as emails; Stripe is your source of truth.
- **No file/photo upload.** Customers can attach reference photos by replying to the confirmation email.
- **No AI book generation.** You craft each book yourself, using the order details from the email.

If you want any of those later, they're additive — the data layer is the order email + Stripe metadata.

## File map

```
site/
├── app/
│   ├── layout.tsx           # global shell, header, footer
│   ├── page.tsx             # landing page
│   ├── globals.css          # all styles
│   ├── order/
│   │   ├── page.tsx         # order form wrapper
│   │   ├── OrderForm.tsx    # client component, posts to /api/checkout
│   │   ├── success/page.tsx
│   │   └── cancel/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── api/
│       ├── checkout/route.ts  # creates Stripe Checkout session
│       └── webhook/route.ts   # verifies signature, emails you + customer
├── lib/
│   ├── products.ts          # product catalog (edit prices here)
│   └── stripe.ts            # Stripe client
└── README.md
```
