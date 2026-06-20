# Contact form Cloud Function

HTTP-triggered Google Cloud Function (2nd gen, Node 20) that receives the
contact-form POST from the static site and **appends each submission to a
Google Sheet**. An hourly Apps Script trigger on the Sheet emails new rows
(native `MailApp` — no SendGrid, no SMTP, no API keys).

## Deployed configuration (live)

| | |
|---|---|
| Function | `legendary-contact` (gen2, nodejs20) |
| Project | `langbench-1528148150979` |
| Region | `us-central1` |
| Endpoint | `https://us-central1-langbench-1528148150979.cloudfunctions.net/legendary-contact` |
| Runtime service account | `68925516043-compute@developer.gserviceaccount.com` |
| Sheet | "Legendary AI Leads" → tab `Submissions` (`SPREADSHEET_ID` env var) |
| Env vars | `ALLOWED_ORIGIN=https://legendary.ai`, `SHEET_NAME=Submissions`, `SPREADSHEET_ID=…` |

The endpoint is wired into `../site.js` (`CONTACT_ENDPOINT`).

## How it works

1. Browser POSTs `{email, message, _gotcha}` (JSON) to the function.
2. The function validates, runs a honeypot spam check, and appends a row
   (`Timestamp, Email, Message, User Agent, IP`) to the Sheet using its own
   service account (Application Default Credentials — no keys). The Sheet is
   shared with that service account as **Editor**.
3. The Apps Script in `notify.gs` runs hourly and emails any new rows.

## One-time setup (already done, for reference)

```sh
# Enable APIs
gcloud services enable sheets.googleapis.com cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com \
  --project langbench-1528148150979

# Deploy
gcloud functions deploy legendary-contact \
  --gen2 --runtime=nodejs20 --region=us-central1 \
  --source=. --entry-point=contact --trigger-http --allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGIN=https://legendary.ai,SHEET_NAME=Submissions \
  --project langbench-1528148150979

# Point it at the Sheet (no rebuild)
gcloud run services update legendary-contact --region us-central1 \
  --project langbench-1528148150979 \
  --update-env-vars SPREADSHEET_ID=<sheet-id>
```

The Sheet must be **shared as Editor** with the runtime service account
(`68925516043-compute@developer.gserviceaccount.com`). A service account on a
consumer Google account has no Drive storage, so it can append to a shared
sheet but cannot create or own one — create the Sheet from your own account.

## Email notifier (`notify.gs`)

In the Sheet: **Extensions → Apps Script**, paste `notify.gs`, then run
`installTrigger` once and approve the permission prompt. It polls hourly
(API writes don't fire `onEdit`/`onChange`) and emails new rows to the address
in `NOTIFY_TO`.

## Redeploy after code changes

```sh
gcloud functions deploy legendary-contact \
  --gen2 --runtime=nodejs20 --region=us-central1 \
  --source=. --entry-point=contact --trigger-http \
  --project langbench-1528148150979
```

(Use `--update-env-vars` to change a single env var without wiping the others —
never `--set-env-vars` on an update.)
