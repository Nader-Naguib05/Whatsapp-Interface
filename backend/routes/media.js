import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const mediaId = req.params.id;

  try {
    // Step 1 — get metadata (URL, mime)
    const meta = await axios.get(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      {
        params: { fields: "url,mime_type" },
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        },
      }
    );

    let url = meta.data.url;
    const mime = meta.data.mime_type || "application/octet-stream";

    if (!url) {
      return res.status(404).json({ error: "No URL found in metadata" });
    }

    // Step 2 — handle redirect manually
    // We MUST disable auto-redirects or Meta CDN drops session credentials.
    const redirectRes = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status === 200,
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      },
    });

    // If 302, extract true CDN URL
    if (redirectRes.status === 302) {
      url = redirectRes.headers.location;
    }

    // Step 3 — fetch actual CDN file
    const fileRes = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Accept: "*/*",
      },
    });

    // Step 4 — send file to browser
    res.setHeader("Content-Type", mime);
    return res.send(Buffer.from(fileRes.data));

  } catch (err) {
    console.error("MEDIA ROUTE ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      error: true,
      detail: err.response?.data || err.message,
    });
  }
});

export default router;
