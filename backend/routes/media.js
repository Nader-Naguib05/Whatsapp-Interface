import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const mediaId = req.params.id;

  try {
    // STEP 1 — Fetch metadata to know MIME type
    const meta = await axios.get(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      {
        params: { fields: "mime_type" },
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        },
      }
    );

    const mime = meta.data.mime_type || "application/octet-stream";

    // STEP 2 — Fetch the ACTUAL FILE from Graph API, NOT lookaside CDN
    const file = await axios.get(
      `https://graph.facebook.com/v20.0/${mediaId}/media`,
      {
        responseType: "arraybuffer",
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        },
      }
    );

    res.setHeader("Content-Type", mime);
    res.send(Buffer.from(file.data));

  } catch (err) {
    console.error("Final media fetch error:", err.response?.data || err.message);

    res.status(500).json({
      error: true,
      detail: err.response?.data || err.message,
    });
  }
});

export default router;
