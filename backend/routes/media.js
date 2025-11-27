import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const mediaId = req.params.id;

  try {
    // Step 1 — Fetch metadata properly with fields=url MIME type
    const metadataRes = await axios.get(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      {
        params: { fields: "url,mime_type" },
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        },
      }
    );

    const fileUrl = metadataRes.data.url;
    const mimeType = metadataRes.data.mime_type;

    if (!fileUrl) {
      console.error("Meta returned no file URL: ", metadataRes.data);
      return res.status(404).json({
        error: "File URL not found",
        meta: metadataRes.data,
      });
    }

    // Step 2 — Download actual media binary from fileUrl
    const fileRes = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    res.setHeader("Content-Type", mimeType || "application/octet-stream");
    return res.send(Buffer.from(fileRes.data));

  } catch (err) {
    console.error("Media fetch error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to fetch media",
      details: err.response?.data || err.message,
    });
  }
});

export default router;
