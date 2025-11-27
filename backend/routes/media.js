// routes/media.js
import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const mediaId = req.params.id;

    // 1) Get metadata (url + mime_type)
    const metaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;

    const metaRes = await axios.get(metaUrl, {
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      },
    });

    const fileUrl = metaRes.data.url;
    const mimeType =
      metaRes.data.mime_type || "application/octet-stream";

    if (!fileUrl) {
      console.error("No file URL in media metadata:", metaRes.data);
      return res.status(404).send("Media URL not found");
    }

    // 2) Download the real media binary from the signed URL
    const fileRes = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    // Prefer WhatsApp's content-type if present, else use mime_type
    const contentType =
      fileRes.headers["content-type"] || mimeType;

    res.set("Content-Type", contentType);
    return res.send(Buffer.from(fileRes.data));
  } catch (err) {
    console.error("Media fetch error:", err.response?.data || err);
    return res.status(404).send("Media not found");
  }
});

export default router;
