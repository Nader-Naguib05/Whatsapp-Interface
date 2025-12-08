import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const mediaId = req.params.id;

  try {
    // Step 1 — Get metadata (url & mime)
    const meta = await axios.get(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      {
        params: { fields: "url,mime_type" },
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        },
      }
    );

    const url = meta.data.url;
    const mime = meta.data.mime_type || "application/octet-stream";

    if (!url) {
      return res.status(404).json({ error: "Missing media URL" });
    }

    // Step 2 — Download the actual file
    // META DOCS: use the SAME auth header for downloading the media.
    const file = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`, // ← REQUIRED
        Accept: "*/*",
      },
    });

    // Step 3 — Serve as binary
    res.setHeader("Content-Type", mime);
    return res.send(Buffer.from(file.data));

  } catch (err) {
    console.error("MEDIA ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      error: true,
      detail: err.response?.data || err.message,
    });
  }
});

export default router;
