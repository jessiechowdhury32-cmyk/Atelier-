// Vercel serverless function.
// Deploy this folder to Vercel, set FASHN_API_KEY as an environment variable
// in the Vercel dashboard, then use the deployed URL + "/api/tryon" as the
// proxy URL in the Atelier app's Try-On tab.

export default async function handler(req, res) {
  // Allow the browser app to call this from any origin (tighten this to your
  // actual domain once you have one).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { modelImage, garmentImage } = req.body || {};
  if (!modelImage || !garmentImage) {
    return res.status(400).json({ error: "modelImage and garmentImage are required (base64 data URLs or public URLs)" });
  }

  const API_KEY = process.env.FASHN_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "Server is missing FASHN_API_KEY" });

  try {
    // 1. Submit the job
    const submitRes = await fetch("https://api.fashn.ai/v1/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model_name: "tryon-v1.6",
        inputs: {
          model_image: modelImage,
          garment_image: garmentImage,
        },
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return res.status(502).json({ error: `FASHN submit failed: ${errText}` });
    }
    const { id } = await submitRes.json();
    if (!id) return res.status(502).json({ error: "FASHN did not return a job id" });

    // 2. Poll for the result (try-on typically takes 5-50 seconds)
    const started = Date.now();
    const timeoutMs = 90_000;
    while (Date.now() - started < timeoutMs) {
      await new Promise((r) => setTimeout(r, 2500));
      const pollRes = await fetch(`https://api.fashn.ai/v1/status/${id}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const result = await pollRes.json();

      if (result.status === "completed") {
        return res.status(200).json({ imageUrl: result.output?.[0] });
      }
      if (result.status === "failed") {
        return res.status(502).json({ error: result.error?.message || "Generation failed" });
      }
      // otherwise: still "processing" / "in_queue" — keep polling
    }
    return res.status(504).json({ error: "Timed out waiting for the result" });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
