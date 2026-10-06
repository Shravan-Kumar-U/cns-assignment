# Deploying this project

This project has two separate pieces, and they are deployed to two
different places:

- `backend/` — an Express server that keeps running and stores data
  (the user registry and inboxes). This needs a real server, so it goes
  on **Render**.
- `frontend/` — a React/Vite app that compiles down to static HTML/JS/CSS.
  This goes on **Vercel**, which is built for exactly this.

Deploy the backend first, because the frontend needs to know the
backend's URL before it is built.

---

## Step 0: Push to GitHub

From the project root:

```bash
cd pgp-smime-app
git init
git add .
git commit -m "Multi-user PGP/S-MIME hybrid encryption demo"
```

Create a new empty repository on GitHub (no README/license, so it stays
empty), then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

---

## Step 1: Deploy the backend to Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** → **Web Service**.
3. Select your repository.
4. Fill in:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. Click **Create Web Service**. Render will build and deploy — this
   takes a minute or two the first time.
6. Once it's live, copy the URL Render gives you, something like:
   `https://pgp-smime-backend.onrender.com`
7. Test it: open that URL in a browser. You should see
   `PGP/S-MIME Backend is running`. If you see that, the backend is live.

**Leave the `FRONTEND_URL` environment variable unset for now** — we'll
come back and set it after the frontend is deployed in Step 3, because
we need the frontend's URL first.

> Free-tier note: Render spins the service down after 15 minutes of no
> traffic. The next request after that wakes it up again, but that first
> request can take 30-50 seconds. Open the backend URL a minute or two
> before your viva to "wake it up" so the demo feels instant.

---

## Step 2: Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project**, select the same repository.
3. Vercel will ask for the project settings:
   - **Root Directory**: click Edit, choose `frontend`
   - **Framework Preset**: Vite (should be auto-detected)
   - **Build Command**: `npm run build` (default, leave as is)
   - **Output Directory**: `dist` (default, leave as is)
4. Before clicking Deploy, expand **Environment Variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: the Render backend URL from Step 1, e.g.
     `https://pgp-smime-backend.onrender.com`
     (no trailing slash)
5. Click **Deploy**. Wait for the build to finish, then open the URL
   Vercel gives you, something like:
   `https://your-project.vercel.app`

> Important: Vite bakes `VITE_API_URL` into the built files at build
> time. If you ever change it, you must trigger a new deployment
> (Vercel's **Deployments** tab → **Redeploy**) for the change to take
> effect — just editing the env var alone does not update a build that
> already happened.

---

## Step 3: Point the backend's CORS at the frontend

Now that you have the Vercel URL, go back to Render:

1. Open your backend service → **Environment**.
2. Add an environment variable:
   - **Key**: `FRONTEND_URL`
   - **Value**: your Vercel URL, e.g. `https://your-project.vercel.app`
     (no trailing slash)
3. Save — Render will automatically redeploy with the new setting.

This locks down CORS so only your deployed frontend (not just anyone)
can call your backend's API. Without this step the backend still works
(it defaults to allowing any origin), but setting it is better practice
and worth mentioning if your teacher asks about security.

---

## Step 4: Test the live site

Open your Vercel URL in **two separate browser tabs**:

1. Tab 1: log in as `alice`, generate keys.
2. Tab 2: log in as `bob`, generate keys.
3. In Tab 1, send Alice → Bob a message.
4. In Tab 2, check the inbox, decrypt, confirm the signature shows verified.
5. Repeat in the other direction.

This should behave exactly like the local version — the `sessionStorage`
trick that gives each tab its own identity works the same whether the
site is on `localhost` or deployed, because it's purely a browser
mechanism, not something tied to where the files are hosted.

---

## Known limitations worth knowing for your viva

- **No real authentication.** Usernames are just labels, not accounts —
  anyone can "log in" as any name. This is intentional for an
  encryption-focused assignment, but worth naming if asked.
- **Data is not permanently durable.** The backend stores the user
  registry and inboxes as JSON files on Render's disk. This survives
  normal restarts, but a fresh deploy (e.g. pushing a code change) gets
  a clean disk, which wipes registered users and messages. For a class
  demo this is a non-issue — just regenerate keys again after a redeploy.
- **Free-tier cold starts.** Covered above — wake the backend a couple
  of minutes before presenting.
