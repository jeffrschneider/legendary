# Contact form Cloud Function

HTTP-triggered Google Cloud Function (2nd gen, Node 20) that receives the
contact form POST from the static site and emails it via SendGrid.

## One-time setup

1. **SendGrid** (free tier): create an account, verify a sender address or
   domain, and create an API key (Mail Send permission).

2. **Store the API key in Secret Manager** (don't put it in code):
   ```sh
   printf '%s' 'SG.your-key-here' | gcloud secrets create sendgrid-api-key --data-file=-
   ```

## Deploy

From this directory:

```sh
gcloud functions deploy contact \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=contact \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGIN=https://legendary.ai,TO_EMAIL=jeffrschneider@gmail.com,FROM_EMAIL=no-reply@legendary.ai \
  --set-secrets SENDGRID_API_KEY=sendgrid-api-key:latest
```

The command prints the function URL (e.g.
`https://contact-xxxxxxxx-uc.a.run.app`). Put that URL into
`CONTACT_ENDPOINT` in `../site.js`.

## Notes

- `FROM_EMAIL` must be a sender/domain you verified in SendGrid, otherwise the
  send is rejected.
- `ALLOWED_ORIGIN` locks CORS to your site; use `*` only for local testing.
- The function honors a `_gotcha` honeypot field for basic spam filtering.

## Test locally

```sh
npm install
SENDGRID_API_KEY=SG.xxx FROM_EMAIL=you@verified.com TO_EMAIL=you@gmail.com \
  npx functions-framework --target=contact
# then POST to http://localhost:8080
```
