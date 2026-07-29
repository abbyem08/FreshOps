# FreshOps v2 — Setup Guide

This is everything I *can't* click for you (I don't have internet access on
my end, and these need to be your accounts anyway). Total time: roughly
30–45 minutes the first time through. None of it costs money at your scale.

## What you're setting up, in order
1. Supabase — the real database (replaces localStorage entirely)
2. Run the schema (one paste, one click)
3. Enable email login for customers
4. Deploy the app itself (Vercel — also free)
5. (Optional, do later) Email notifications when a request comes in

---

## Step 1 — Create your Supabase project

1. Go to **supabase.com** → **Start your project** → sign up (email or GitHub).
2. Click **New Project**.
3. Name it `freshops`, set a database password (save it somewhere — a password
   manager or a note, you likely won't need it day-to-day but it's your
   master key), pick the region closest to you, click **Create new project**.
4. Wait ~2 minutes while it provisions.

## Step 2 — Run the schema

1. In your new project, click **SQL Editor** in the left sidebar → **New query**.
2. Open `schema.sql` (in this delivery), select all, copy it.
3. Paste it into the SQL Editor, click **Run** (bottom right).
4. You should see "Success. No rows returned." That's it — every table,
   security rule, and view now exists.

## Step 3 — Get your API keys

1. Left sidebar → **Project Settings** → **API**.
2. You'll see **Project URL** and an **anon public** key. Copy both.
3. In the code folder, copy `.env.local.example` to a new file named
   `.env.local`, and paste those two values into
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Step 4 — Enable customer login

1. Left sidebar → **Authentication** → **Providers** → make sure **Email**
   is enabled (it is by default).
2. **Authentication** → **Settings** → turn **off** "Enable email confirmations"
   for now (simpler while testing — you can turn it back on later once
   you're inviting real customers, so they confirm their own email).

**How you'll actually create a customer login** (once the app is deployed):
adding a row to the `customers` table doesn't create a login by itself — that
needs one more small piece (a "Create Portal Login" button that calls
Supabase's invite function) which is the next thing I'll build once you
confirm this foundation works. For now, you can create a test login manually:
**Authentication** → **Users** → **Add user** → enter an email + password →
then in **Table Editor** → `customers`, set that row's `portal_auth_id` to
the new user's ID (shown in the Users list) so the login is linked to that
customer record.

## Step 5 — Deploy the app (make it a real website)

1. Go to **vercel.com** → sign up (free) → **Add New Project**.
2. Vercel will ask you to import a Git repository. Easiest path: create a
   free **github.com** account if you don't have one, create a new empty
   repository called `freshops-v2`, and upload all the files from this
   delivery into it (GitHub's website lets you drag-and-drop files in the
   browser — no command line needed).
3. Back in Vercel, import that `freshops-v2` repository.
4. Before clicking Deploy, expand **Environment Variables** and add the
   same three values from your `.env.local` file.
5. Click **Deploy**. In about a minute you'll get a real URL like
   `freshops-v2.vercel.app` — that's your customer portal login page is at
   `[that-url]/portal/login`, and the staff review queue is at
   `[that-url]/admin/requests`.

## Step 6 (optional, do anytime later) — Email notifications

1. Go to **resend.com** → sign up free → **API Keys** → create one, copy it.
2. In Vercel: your project → **Settings** → **Environment Variables** → add
   `RESEND_API_KEY` (the key you just copied) and `NOTIFY_EMAIL` (your email
   address). Redeploy.
3. You'll now get an email every time a customer submits an order request.

---

## What's built vs. what's next

**Built and working in this delivery:** the full database (every table
from the original design plus Prospects, price history, jacket
close/archive, carrier compliance, claims), customer portal login, the
price sheet + order-request form customers see, and your staff review
queue to approve/convert requests into real orders.

**Not yet ported into this real system:** the rest of the internal app —
Customer Orders management, Jacket Builder, Dispatch Ticket, Operations
Log, Freight, Market Calls entry, Price Sheet builder, Reports. Those all
already exist and work in the standalone file I built earlier; the next
step is rebuilding those same screens to talk to this real database
instead of localStorage, so everything — internal tools and customer
portal — runs on one shared source of truth.

Once you've got Steps 1–5 done and can log into the portal with your test
account, tell me it's working and I'll build out the rest of the internal
app against this same database.
