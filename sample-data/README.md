# RIDA GARMENTS demo data pack

Contains **68 sample products, 40 sample customers, 30 sample enquiries, and 11 settings**. Every demo record uses DEMO- IDs and example.com email addresses. These are fictional records for testing, not real customers or real orders.

## Safe import sequence
1. Make a backup copy of your Google Sheet.
2. Run `setup()` in Apps Script first. It creates missing tabs and does not clear existing data.
3. For each CSV, open the matching tab in Google Sheets, choose **File → Import → Upload**, select the CSV, and choose **Append to current sheet**. Do not replace the existing sheet.
4. Import products into `Products`, customers into `Customers`, enquiries into `Enquiries`, and settings into `Settings`.
5. Import Settings only if you want the demo values. Replace demo phone, email, address and WhatsApp before publishing.
6. Product image links are public Unsplash sample imagery and are not actual RIDA product photography.

**Important:** CSV imports add records; they do not automatically deduplicate them. Import each file once. Remove rows with `DEMO-` IDs when you are ready to go live. Never import demo settings over your real settings.
