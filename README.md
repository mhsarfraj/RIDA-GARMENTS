# RIDA GARMENTS — Complete Professional Website Package

A responsive clothing catalogue + admin workspace + Google Apps Script / Google Sheets backend + CRM customer pipeline + realistic fictional demo data. Built from the provided RIDA GARMENTS source package; existing page flows and backend contract retained.

## Package map
- `index.html` — customer-facing storefront
- `admin/index.html` — owner/admin workspace (products, stock, enquiries, customers, dashboard, settings)
- `google-apps-script/Code.gs` — Google Apps Script backend
- `sample-data/` — CSV templates and realistic demo records
- `docs/` — setup, launch checklist, data dictionary, QA checklist
- `404.html`, `_headers`, `robots.txt` — hosting support

## Start locally
Open `index.html` in a browser for the storefront UI. For Apps Script-connected API requests, host the folder on a static web host and configure the API URL in both HTML files. Use the admin page at `/admin/`.

## Connect Google Sheets (live mode)
1. Create a private Google Sheet named `RIDA GARMENTS Database`.
2. Open Extensions → Apps Script. Paste `google-apps-script/Code.gs` into the editor.
3. Run `setup()` and approve permissions. It creates missing tabs only; it does not erase existing rows.
4. In `setAdmin()`, replace `owner@example.com` and `CHANGE-THIS-PASSWORD` with your own credentials (password 12+ characters). Run `setAdmin()` once, then remove the password from source and save.
5. Deploy → New deployment → Web app; Execute as **Me**. Use **Anyone** access only because the public catalogue reads published products; all admin actions still require authentication. Keep the Sheet private.
6. Paste the deployment URL into `const API = \"\";` in `index.html` and `admin/index.html`.
7. Run smoke tests with the QA checklist before sharing publicly.

## Add demo data safely
See `sample-data/README.md`. Back up your Sheet first. Import each CSV once using **Append to current sheet**, matching the tab name. Product data has 68 demo items, Customers 40 fictional contacts, Enquiries 30 sample enquiries and Settings 11 starter values. Do not import Settings if you already configured real shop details. All demo IDs begin `DEMO-`; remove demo rows before production. Images are generic public sample images, not actual inventory photography.

## What the application does
- Storefront: product catalogue, category browsing, product details, enquiry/contact flow and responsive layout.
- Admin: product editing, stock adjustments, enquiry tracking, customer CRM pipeline, follow-up dates, notes/activity, dashboard and shop settings.
- Backend: private Google Sheet storage, admin session token, password hash stored in Script Properties, login lockout, basic input checks, enquiry honeypot/rate limit, product image upload, activity and stock history.

## Security and production caveats
- Never make the Google Sheet public or share edit access publicly.
- Set a unique admin password and keep it out of source control.
- Replace all demo contact details and verify the WhatsApp number before launch.
- This is a small-business Apps Script solution, not a substitute for a hardened commerce platform. It is a catalogue + enquiry workflow, not a payment checkout.
- Test against your own Google account. This package has not been authenticated against your live Sheet or deployed to your hosting.

## Hosting
Upload the contents of `rida-garments/` to Netlify, Cloudflare Pages, or GitHub Pages. Preserve the folder structure. Storefront is `/`; admin is `/admin/`. Keep `google-apps-script/Code.gs` as a source file for Apps Script, not a public server endpoint.

## Owner profile and brand colours (Settings page)
- **Owner profile:** upload a photo (it is cropped square automatically), then add your name, title and a short message. They appear in the store's About section, and your photo shows in the admin top bar. Remove the photo to go back to an initial.
- **Brand colours:** pick a background, a text (foreground) colour and an accent colour. A live preview shows how they look and warns when the text contrast is too low. Leave them empty for the default palette. Background and text apply in light mode; visitors who choose their own palette keep their choice.
- After updating `Code.gs`, redeploy: **Deploy > Manage deployments > Edit > New version**. Without this, saving the new settings will be ignored.
## Also new
Image zoom on the product photo (tap or click), a "Recently viewed" row, "View store" and "Export CSV" buttons in the admin, and a greeting on the dashboard.
