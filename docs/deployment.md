# Deployment

## Recommended Hosting Stack

For this repo, the cleanest production-style setup is:

- frontend on Vercel
- API on Railway
- PostgreSQL on Railway
- Redis on Railway

This keeps the Next.js app on the platform it is best suited for, while the FastAPI service runs as a persistent container with direct access to Postgres and Redis.

This setup gives you:

- a public URL for the web app
- automatic deployments from GitHub on push
- persistent seeded demo data in the database
- preview deployments for frontend changes on Vercel
- a stable backend URL for the web app to call

## Frontend on Vercel

Import the GitHub repository into Vercel and set:

- Root Directory: `apps/web`
- Framework Preset: `Next.js`

Required environment variable:

- `NEXT_PUBLIC_API_BASE_URL=https://your-api-service.railway.app/api/v1`

Notes:

- Vercel supports monorepos by setting the project Root Directory to the app directory.
- Connect the repository to GitHub in Vercel so pushes to `main` create production deployments and other branches create previews.

## API on Railway

Create a Railway service from the same GitHub repository and set:

- Root Directory: `/apps/api`

Railway will detect the `Dockerfile` in `apps/api` and use it to build the API image.

The API container now starts with:

1. `alembic upgrade head`
2. `seed_database(...)`
3. `uvicorn`

That means every fresh environment automatically gets the schema and demo data. The seeding logic is idempotent, so restarts do not duplicate records.

Required API environment variables:

- `APP_NAME=ZB Vaka API`
- `ENVIRONMENT=production`
- `API_V1_PREFIX=/api/v1`
- `DATABASE_URL=<Railway Postgres connection string>`
- `REDIS_URL=<Railway Redis connection string>`
- `JWT_SECRET=<long random secret>`
- `CORS_ORIGINS=https://your-production-web.vercel.app`
- `CORS_ORIGIN_REGEX=https://.*\.vercel\.app`
- `FRONTEND_URL=https://your-production-web.vercel.app`
- `SEED_ADMIN_EMAIL=admin@zbvaka.co.zw`
- `SEED_ADMIN_PASSWORD=Admin123!`

## PostgreSQL and Redis on Railway

Inside the same Railway project:

- add a PostgreSQL service
- add a Redis service

Use the connection variables Railway provides and map them into the API service as:

- `DATABASE_URL`
- `REDIS_URL`

Because the application data lives in Postgres, your seeded demo users, transactions, offers, and alerts persist across deploys.

## Domains and Public URLs

After the first Railway deploy:

- generate a public Railway domain for the API service

After the first Vercel deploy:

- use the default `vercel.app` domain or attach your custom domain

Then update:

- Vercel `NEXT_PUBLIC_API_BASE_URL` to the Railway API URL
- Railway `CORS_ORIGINS` and `FRONTEND_URL` to the Vercel URL

Redeploy both services after changing environment variables.

## Automatic Deployments

Once the repo is connected:

- Vercel deploys automatically on Git push
- Railway deploys automatically on Git push

Recommended branch policy:

- `main` -> production deploy
- feature branches / PRs -> previews on Vercel

## Demo Access

The seeded demo logins are:

- `admin@zbvaka.co.zw` / `Admin123!`
- `tariro@zbvaka.co.zw` / `Merchant123!`
- `sibusiso@zbvaka.co.zw` / `Merchant123!`
- `rudo@zbvaka.co.zw` / `Merchant123!`

## Important Notes

- The `/seed` endpoint is still public. That is acceptable for demo hosting, but not for a real production environment.
- Railway and Vercel environment variables apply only to new deployments, so any variable change should be followed by a redeploy.
- If you later add a stable custom domain for the frontend, update both `CORS_ORIGINS` and `FRONTEND_URL` in Railway.
