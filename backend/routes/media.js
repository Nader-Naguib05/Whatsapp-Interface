import axios from "axios";
import express from "express";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const mediaId = req.params.id;

  try {
    console.log("Fetching metadata for:", mediaId);

    const metadataRes = await axios.get(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      {
        params: { fields: "url,mime_type" },
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        },
        validateStatus: () => true, // DON'T throw errors, return them
      }
    );

    console.log("META RESPONSE:", metadataRes.data);

    // Return EVERYTHING to frontend so I can see the real error
    return res.json({
      meta_response: metadataRes.data,
      http_status: metadataRes.status,
      note: "This is diagnostic mode. NOT returning media binary.",
    });

  } catch (err) {
    console.log("Diagnostic Error:", err.response?.data || err.message);

    return res.json({
      error: true,
      diagnostic: err.response?.data || err.message,
    });
  }
});

export default router;
