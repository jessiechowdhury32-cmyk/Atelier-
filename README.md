# Atelier Try-On Proxy

A one-file backend that keeps your FASHN.ai API key secret and talks to their
virtual try-on model on behalf of the Atelier app.

## Why this exists

FASHN's API needs a secret key in every request. Putting that key in the
browser app would let anyone reading the page source use (and bill) your
account. This proxy holds the key server-side; the browser only ever talks
to your own proxy URL.

## Deploy it (Vercel, free tier works)

1. Get a FASHN API key: sign up at fashn.ai, go to the API dashboard, copy your key.
2. Install the Vercel CLI if you don't have it: `npm i -g vercel`
3. From inside this `tryon-proxy` folder, run: `vercel`
4. When it asks about environment variables, or afterward in the Vercel
   dashboard under Project Settings → Environment Variables, add:
   - `FASHN_API_KEY` = your key from step 1
5. Redeploy (`vercel --prod`) after adding the env var so it's picked up.
6. Vercel gives you a URL like `https://your-project.vercel.app`. Your proxy
   endpoint is `https://your-project.vercel.app/api/tryon`.

Any other serverless host (Cloudflare Workers, Netlify Functions, a small
Express app on Render) works the same way — the only requirement is that the
API key lives in a server-side environment variable, never in client code.

## Using it from the app

Paste `https://your-project.vercel.app/api/tryon` into the "Proxy URL" field
on the Try-On tab. The app sends `{ modelImage, garmentImage }` as base64
data URLs; this function submits the job to FASHN, polls until it's done
(typically 5-50 seconds), and returns `{ imageUrl }`.

## Cost

FASHN charges per generated image (roughly $0.075/image on-demand, less at
volume) — see fashn.ai/pricing. This proxy doesn't add its own markup; you're
billed directly by FASHN for whatever you generate.
