import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const mediaId = req.params.id;

  try {
    // Step 1 — fetch metadata (for mime)
    const metadata = await axios.get(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      {
        params: { fields: "url,mime_type" },
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        },
      }
    );

    const url = metadata.data.url;
    const mime = metadata.data.mime_type;

    if (!url) {
      return res.status(404).json({ error: "No URL in metadata" });
    }

    // Step 2 — fetch CDN binary WITHOUT AUTH HEADERS
    const file = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Accept: "*/*",   // <- IMPORTANT
      },
      validateStatus: () => true, // avoid axios errors
    });

    // Handle auth errors gracefully
    if (file.status >= 400) {
      console.log("CDN error response:", file.data);
      return res.status(file.status).json({
        error: true,
        detail: file.data,
        note: "CDN rejected request",
      });
    }

    res.setHeader("Content-Type", mime || "application/octet-stream");
    return res.send(Buffer.from(file.data));

  } catch (err) {
    console.error("FETCH ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      error: true,
      detail: err.response?.data || err.message,
    });
  }
});

export default router;
