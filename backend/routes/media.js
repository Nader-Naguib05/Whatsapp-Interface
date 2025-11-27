import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const mediaId = req.params.id;

  try {
    // --- Step 1: Get metadata: URL + MIME
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
    const mime = metadataRes.data.mime_type;

    if (!fileUrl) {
      console.log("Meta returned no file URL");
      return res.status(404).json({ error: "No file URL" });
    }

    // --- CRITICAL FIX:
    // Lookaside CDN needs access_token appended manually.
    const authenticatedUrl = `${fileUrl}&access_token=${process.env.META_ACCESS_TOKEN}`;

    // --- Step 2: download the actual binary
    const fileRes = await axios.get(authenticatedUrl, {
      responseType: "arraybuffer",
    });

    res.setHeader("Content-Type", mime || "application/octet-stream");

    return res.send(Buffer.from(fileRes.data));

  } catch (err) {
    console.error("Media fetch error:", err.response?.data || err.message);

    return res.status(500).json({
      error: true,
      detail: err.response?.data || err.message,
    });
  }
});

export default router;
