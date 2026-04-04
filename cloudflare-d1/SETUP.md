Cloudflare D1 Setup

1. Create a D1 database:

   wrangler d1 create phonix-db

2. Apply schema:

   wrangler d1 execute phonix-db --file=cloudflare-d1/schema.sql

3. Create an API Token in Cloudflare with D1 edit/query permissions.

4. Add these environment variables to your deployment (Vercel or other server runtime):

   CF_ACCOUNT_ID=<your_cloudflare_account_id>
   CF_D1_DATABASE_ID=<your_d1_database_id>
   CF_API_TOKEN=<your_cloudflare_api_token>

5. Deploy. The app will then:
   - Load saved app state from D1 for logged-in users with email.
   - Auto-save app state changes back to D1.

Notes:
- Guest users are not synced.
- User identity key is the lowercased email.
