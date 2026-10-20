# QA checklist

| Area | Test | Expected result |
|---|---|---|
| Storefront | Open home page on desktop and mobile | Layout fits viewport and navigation remains usable |
| Catalogue | Load published products | Published products show; drafts remain hidden |
| Enquiry | Submit valid name, phone and message | Enquiry saved and customer lead created/updated |
| Validation | Submit invalid phone or short message | Request rejected with useful validation feedback |
| Admin | Sign in with configured owner credentials | Dashboard opens after successful authentication |
| Products | Create, edit and publish a product | Store reflects the published item after cache refresh |
| Inventory | Adjust stock | Stock changes and movement is recorded |
| CRM | Move customer stage and add note | Stage and note persist in Sheet |
| Follow-up | Set a date for today | Customer appears in follow-up indicators |
| Settings | Save contact and store settings | Store displays configured information |
| Security | Open admin API action without token | Admin operation is rejected |

Live integration tests must be completed by the owner after deploying their own Apps Script URL.
