# Deploy ALPC: Atlas + Render + Vercel

This guide deploys the Next.js frontend to Vercel and two Docker web services
(API/compiler and ML) to Render. MongoDB Atlas stores accounts and learning data.
The root `render.yaml` is the only supported Render Blueprint. The old
backend-only Dockerfile does not contain the compiler; use the root Dockerfile.

## 1. Apply and push the patch

Start with a clean checkout of this repository at commit `7a4e5b1` (or a later
commit to which the patch applies). Extract the patch ZIP outside the repository.
In VS Code's terminal, from the repository root:

```bash
git status
git switch -c deploy-ready
git am /path/to/0001-deploy-ready.patch
git push -u origin deploy-ready
```

On Windows use the actual path, for example:

```powershell
git am "C:\Users\YourName\Downloads\ALPC_DEPLOY_PATCH\0001-deploy-ready.patch"
```

If `git am` reports a conflict, use `git am --abort` to return to the starting
state; do not overwrite unrelated local changes. Open a pull request into `main`,
wait for **all CI jobs** (including Deployment images and Compiler Linux), and
merge it before deploying from `main`. Docker builds have not been run in the
patch author's environment; a green image job is required before launch.

## 2. Create the database in MongoDB Atlas

1. Create an account at https://www.mongodb.com/cloud/atlas/register and a project.
2. Create a **Free** cluster. Check the selected tier before confirming.
3. Under **Database Access**, create a database user with a new password and
   `readWrite` access to the `learnsmart` database. This is separate from your Atlas login.
4. Under **Network Access**, add your current IP if you want to connect locally.
   After creating the Render API, add its outbound IP ranges from Render's
   **Connect / Outbound** information. Prefer those ranges over opening the
   database to every IP.
5. Select **Connect → Drivers → Node.js** and copy the connection string. Set the
   database name to `learnsmart`, and replace the username/password placeholders.
   URL-encode reserved characters in the password. Keep the URI private.

Example shape (not a working credential):

```text
mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/learnsmart?retryWrites=true&w=majority
```

The API creates collections and seeds quiz questions on its first successful
connection. Do not paste your database URI into GitHub or a frontend variable.

## 3. Create the frontend on Vercel

1. Sign in at https://vercel.com and choose **Add New → Project**.
2. Import your GitHub repository after merging the patch.
3. Select **Next.js** and set **Root Directory** to `frontend`.
4. Use Node.js **22.x**. Leave build and output settings at the Next.js defaults.
5. Add `NEXT_PUBLIC_API_URL=https://example.invalid` temporarily, then deploy to
   reserve your production hostname. The backend-dependent pages will not work yet.
6. Copy the production origin, such as `https://your-project.vercel.app`.
   Do not include a path or trailing slash.

## 4. Create the Render services

1. Sign in at https://render.com and choose **New → Blueprint**.
2. Connect the repository and select the branch containing the merged patch.
3. Use the root `render.yaml`. It defines **learnsmart-api** and **learnsmart-ml**,
   both explicitly on the `free` plan. Review the plan before confirming.
4. Fill in the prompted API variables:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | Your Atlas connection string |
   | `FRONTEND_URL` | The exact Vercel production origin from step 3 |

   The Blueprint generates `JWT_SECRET`. Do not replace it with an example secret.
   It also supplies `ML_SERVICE_HOST` from the ML service's public hostname.
5. Create the services. Add the API's outbound IP ranges to Atlas's Network
   Access list. If the first API start failed before you did that, redeploy it.
6. Wait for both services to become healthy. Open each service's public URL
   followed by `/health`; expect `{"status":"ok",...}`.
7. Copy the API's actual public HTTPS origin. Names can get a suffix, so copy the
   displayed URL instead of assuming `learnsmart-api.onrender.com`.

Free Render web services cannot receive private network traffic, so the ML
connection deliberately uses public HTTPS. Do not replace it with `hostport`.
If updating services created previously, new `sync: false` variables may need to
be added manually in their Environment settings. If a hostname reference is
not populated, set `ML_SERVICE_URL` to the ML service's actual public HTTPS URL.

## 5. Connect the frontend and redeploy

1. In Vercel **Project → Settings → Environment Variables**, replace
   `NEXT_PUBLIC_API_URL` with the API's actual public HTTPS origin, with no trailing
   slash and **without `/api`**.
2. Apply it to **Production**, then redeploy the frontend. Next.js embeds this
   variable at build time; changing the variable alone does not update a build.
3. Ensure Render's `FRONTEND_URL` exactly matches the frontend origin you open.
   Preview URLs and custom domains are different origins. Update this variable
   when changing domains, and redeploy the API.

## 6. Verify the deployed application

- Open `/compiler`; enter `OUTCOME core; SET state = 62; IF state >= 50 GOTO core;`.
  Compile: expect score **62**, outcome **core**, tokens/AST/IR, optimizer output
  and a control-flow graph. Introduce a syntax error and check the live underline.
- Register a test account, complete a diagnostic and open the dashboard.
- Open a study topic, follow a resource, and mark/unmark it done.
- Complete a topic quiz; check its answer explanation and updated mastery.
- Open decision history, then a decision's compiler stages. Reload and confirm
  the account's saved data remains.
- For a disposable test account, verify wrong-password deletion is rejected,
  then delete it with the correct password and confirm login fails.

`tests/deploy-smoke.sh` is run by CI after both images build. It starts a disposable
MongoDB and checks API/ML health, real compilation, LLVM optimization and a BKT
mastery update. It does not replace the browser/account checks above.

## Hosting settings and troubleshooting

| Setting or symptom | What to check |
|---|---|
| `JWT_SECRET` startup error | Keep the generated secret; production requires at least 32 characters and rejects known example secrets. |
| `FRONTEND_URL` startup error | One exact HTTP(S) origin, no slash, path, wildcard or comma-separated list. |
| CORS error | Match the browser's origin exactly; API CORS is not an authentication mechanism. |
| `TRUST_PROXY_HOPS=1` | For Render's single trusted reverse proxy. Use `0` for direct local access. Do not set unrestricted proxy trust. If you add another proxy, review its forwarded-header behavior before changing this. |
| ML times out | Blueprint sets `ML_TIMEOUT_MS=120000`; check the public ML `/health` URL, then retry after it wakes. Local default is 5000 ms. |
| MongoDB connection fails | Check credentials, database name and Atlas IP access list. API health becomes available only after database connection and seeding. |
| Compiler executable missing | Deploy the root Dockerfile, with repository root as build context. |
| All visitors share a rate limit | Check that the Render proxy setting is applied. Limits are in-memory, per API process. |
| API URL still points to localhost or example.invalid | Set Vercel's production variable and rebuild/redeploy. |

Free services spin down when idle and have usage quotas; two running services
share the workspace's free instance hours. This is suitable for a demo, not a
promise of always-on hosting. Budget for cold starts, and check current account
limits before selecting any paid upgrade.

## Rollback

Revert the deployment commit on a new branch, review CI, and redeploy the previous
known-good application images. This patch does not migrate or delete database
records. Keep the same production secrets and MongoDB URI when rolling back.

## Official references

- Render Blueprint: https://render.com/docs/blueprint-spec
- Render free service behavior and quotas: https://render.com/docs/free
- Vercel Next.js deployment: https://vercel.com/docs/frameworks/full-stack/nextjs
- Atlas network access: https://www.mongodb.com/docs/atlas/security/ip-access-list/
- Express proxy trust: https://expressjs.com/en/guide/behind-proxies/
