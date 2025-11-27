import axios from "axios";
import express from "express";
const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const mediaId = req.params.id;

    const url = `https://graph.facebook.com/v20.0/${mediaId}`;

    const metaRes = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      },
    });

    // Detect MIME from Meta
    const contentType = metaRes.headers["content-type"];
    res.set("Content-Type", contentType);

    return res.send(Buffer.from(metaRes.data, "binary"));
  } catch (err) {
    console.error("Media fetch error:", err.response?.data || err);
    return res.status(404).send("Media not found");
  }
});

export default router;
