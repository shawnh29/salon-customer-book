# Salon Customer Book

A small web app for a hair stylist to keep her customers: add, search (English and Korean), view, edit, delete, and export to CSV. Data is stored in a real PostgreSQL database (**Netlify Database**) and accessed only through Netlify Functions.

Stack: React + TypeScript + Vite, Netlify Functions, Netlify Database (`@netlify/database`), npm.

> ## ⚠️ There is no login — this app is not private
> By design there is no authentication. **Anyone who can open the published site's URL can view, change, and delete every customer record.** Do not share the URL, and do not put sensitive information in notes. Export a CSV regularly as a backup. If you later want a password, that needs to be added.

## What is done for you vs. what you must do

| Already done in this project | You must do (needs your Netlify login/account) |
|---|---|
| App code, API, SQL migration, `netlify.toml`, `.gitignore` | Install Node and the Netlify CLI on your computer |
| `@netlify/database` is used via `getDatabase()` with bound SQL parameters | `netlify login`, link or create your Netlify site |
| Migration is in `netlify/database/migrations/` and is applied automatically on deploy | Confirm your account can use Netlify Database (see "Free plan" below) |
| | Push to Git and connect the repo (or deploy with the CLI) |
| | Test the live site by hand |

## 1. Install Node and dependencies

You need **Node.js 20.12.2 or newer** (required by the `netlify database` commands). Node 22 is recommended; install it from https://nodejs.org, then check:

```bash
node --version
```

In this project folder:

```bash
npm install
```

This creates `package-lock.json`. **Commit that file**, so Netlify installs the exact same versions. (`package.json` lists dependencies as `latest` because the first install could not be run when this project was generated; the lock file pins them.)

## 2. Install and log in to the Netlify CLI

You need **Netlify CLI 26.0.0 or newer**.

```bash
npm install -g netlify-cli
netlify --version
netlify login
```

`netlify login` opens your browser so you can authorize the CLI.

## 3. Link the project to your Netlify site

Put the project in a Git repository and push it to GitHub/GitLab/Bitbucket first (step 7), or link by CLI:

```bash
netlify link      # link to an existing Netlify site, or
netlify init      # create a new site and connect it to your Git repo
```

## 4. Database setup and verification

The project **already contains** the database package, the helper code, and the migration, so you do **not** need to run `netlify database init` (it scaffolds its own starter migration and can optionally add sample data, which this project does not want).

Check the local database state:

```bash
netlify database status
```

On the production side, Netlify provisions the database and applies migrations as part of the deploy (see step 8). If you prefer to create it first, open your project in the Netlify dashboard → **Data & Storage → Database → Create a database manually**.

There are two migrations, applied in order:

1. `20261015000000_create_customers` creates the `customers` table.
2. `20261015120000_simplify_customers` makes `name` and `birth_year` optional and **drops the `english_name` and `korean_name` columns** (any data in those two columns is discarded).

Migration folders must be named `<number>_<slug>`, each containing a `migration.sql`.

## 5. Run locally (functions + local database)

Terminal 1 — start the dev server (this also starts a local Postgres database):

```bash
netlify dev
```

Terminal 2 — apply the migration to the **local** database (local databases do not apply migrations automatically; production does):

```bash
netlify database migrations apply
netlify database status      # should list the migration as applied
```

Open the address `netlify dev` prints (usually http://localhost:8888). Add a customer, refresh, and confirm it is still there.

Start over with an empty local database any time: `netlify database reset` (affects local only).

## 6. Build the production frontend

```bash
npm run build
```

This type-checks and builds to `dist/`, which Netlify publishes (see `netlify.toml`). Use `netlify dev` rather than `npm run preview` to try the full app, because only `netlify dev` runs the functions and database.

## 7. Connect the repository to Netlify

```bash
git init
git add .
git commit -m "Salon customer book"
```

Push to a new repository on your Git host. Then in Netlify: **Add new project → Import an existing project**, pick the repo. Build command, publish directory (`dist`), functions folder, and Node version are read from `netlify.toml`. Alternative without Git: `netlify deploy --build --prod`.

## 8. Deploy

Pushing to your production branch triggers a deploy. On a production deploy, Netlify applies pending migrations **just before** the new version is published; if a migration fails, the deploy is not published. If the deploy log shows a database or migration error, read it, fix, and push again.

## 9. Verify production

1. In the deploy log, confirm the deploy succeeded (no migration errors).
2. In the Netlify dashboard → **Data & Storage → Database**, confirm a database exists and a `customers` table is listed (the dashboard has a "View and edit data" page).
3. Open the live site and add a test customer, then delete it.
4. Export CSV from the live site and open it in a spreadsheet.

## 10. Check that data really persists

1. Add a customer with a name (try one in English and one in Korean, e.g. 김민지), a year of birth, and a note. Also add one with only a note, to confirm name and year are optional.
2. Refresh the page — the customer is still listed.
3. Close the tab, open the site again — still there.
4. Open the site in a **different browser** (or on your phone) — still there.
5. Search an English name in any capitalization, part of a Korean name, and a word from the notes — each finds the right customer.
6. Edit the year of birth and confirm the age in parentheses changes. Delete the test customer (a confirmation appears).

## Netlify Free plan: limits and credits

Checked against Netlify's pricing page and Netlify Database docs on 15 Oct 2026 (links below). Plans can change, so re-check before relying on this.

- **Eligibility:** Netlify Database is available on **credit-based plans only**. The pricing page lists it on Free ("Basic" limits). The pricing FAQ says accounts created **before 4 Sep 2025 can keep a legacy plan**; if your account is one of those, open **Usage & billing → Plan details** in Netlify to see which plan you are on — you may need to choose **Change team plan** to move to the credit-based Free plan. This could not be checked from here because it depends on your account.
- **Free plan credit limit:** 300 credits per month, a hard limit. The Free plan cannot incur charges, but when the limit is reached your sites are **paused until the next billing cycle**, and per the FAQ all projects on the account pause together.
- **What uses credits:** production deploys (15 credits each), function compute (10 credits per GB-hour), bandwidth (20 credits per GB), web requests (2 credits per 10,000), and **database compute (10 credits per compute unit)** plus database bandwidth (20 credits per GB).
- **Free database limits:** 3 databases per account, 5 GB storage, 5 GB data out and 5 GB data written per billing period, 1 compute unit, **sleeps after 5 minutes of inactivity**, and at most 48 compute units per database per billing period. Backup retention is 3 days.
- **What this means for you (my reading, not Netlify's wording):** the database wakes up when someone uses the app and sleeps after 5 idle minutes, so the first request after a quiet period can be slower. Compute is billed per active hour, so at 10 credits per unit-hour, about 30 active hours of database would use the whole 300-credit monthly allowance. A single stylist using the app lightly should be far below that, but check **Usage & billing** after the first week.

## How things work

- **Age** is never stored. It is calculated as *current calendar year − year of birth* everywhere (list, detail, form, CSV). Because no birth date is collected, it is an **estimate** and can be off by one year.
- **Search** runs in the database with a bound parameter and `ILIKE '%text%'` on name and notes (partial, case-insensitive). Text is normalized to Unicode NFC on save and on search. English and Korean are **not** translated into each other — a search only matches the text as it was saved (for example, if you want a customer found by both spellings, write both in the name or notes). Searches wait for a Korean IME syllable to finish before running.
- **Validation** is done on the server (the browser repeats it for quick feedback). Every field is optional, but **at least one of name, year of birth, or notes must be filled in** so empty records can't be saved. If given: name ≤100 characters, year of birth four digits from 1900 to the current year, notes ≤5000. Customers with no name show as "Unnamed customer" and sort to the end of the list; a missing year shows as "Not provided". Notes are plain text and are never rendered as HTML.
- **`updated_at`** is set to `now()` by the API on every update. (There is no database trigger, so changes made directly in the database dashboard will not touch it.)
- **CSV export** is generated by the server from the database as UTF-8 (with a byte-order mark so Excel reads Korean correctly). Fields are quoted, quotes are doubled, and multi-line notes are preserved. Columns are Name, Year of Birth, Age (estimate at export), Notes, Created At, and Updated At; year and age are blank when no year was entered. Text that starts with `=`, `+`, `-`, `@`, tab, or carriage return gets a leading `'` so spreadsheets do not run it as a formula (so a note beginning with "- " will show as "'- ").
- **Errors:** the API returns normal HTTP status codes (400, 404, 405, 413, 500). If the database is unreachable the app shows an error with a "Try again" button — it never shows made-up data, and database details are only written to the function logs.

## API

| Method & path | Purpose |
|---|---|
| `GET /api/customers?q=text` | List customers (optional search) |
| `POST /api/customers` | Create (201) |
| `GET /api/customers/:id` | One customer |
| `PUT /api/customers/:id` | Update |
| `DELETE /api/customers/:id` | Delete (204) |
| `GET /api/export` | Download CSV |

## Project layout

```
netlify.toml                         build + functions settings
netlify/database/migrations/         SQL migration(s)
netlify/functions/customers.ts       customers API
netlify/functions/export.ts          CSV export
netlify/functions/lib/http.ts        JSON/error/LIKE-escape helpers
src/shared/                          age + validation (used by browser and server)
src/App.tsx, src/components/         the UI
src/styles.css                       styling
```

## References

- Netlify Database — Getting started: https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/
- Database API (`getDatabase`, `sql`): https://docs.netlify.com/build/data-and-storage/netlify-database/api/
- Migrations (folder, naming, when applied): https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/
- Local development: https://docs.netlify.com/build/data-and-storage/netlify-database/local-development/
- CLI reference (Node 20.12.2+, CLI 26.0.0+, commands): https://docs.netlify.com/build/data-and-storage/netlify-database/cli/
- Billing, limits (Free limits, credit costs): https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/
- Functions API (`config.path`, `context.params`): https://docs.netlify.com/build/functions/api
- Pricing and FAQ: https://www.netlify.com/pricing/

Not covered by those pages and written from general knowledge of the Netlify CLI, so double-check if a command misbehaves: `netlify link`, `netlify init`, `netlify deploy --build --prod`, the default `netlify dev` address (http://localhost:8888), and the exact dashboard menu wording.
