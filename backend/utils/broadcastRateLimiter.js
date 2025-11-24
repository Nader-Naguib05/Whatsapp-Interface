import axios from "axios";

const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_TOKEN = process.env.META_ACCESS_TOKEN;

// Queue to store pending jobs
let jobQueue = [];
let isRunning = false;

function sendWhatsAppTemplate({ phone, templateName, language, components }) {
  const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;

  return axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

function startProcessor() {
  if (isRunning) return;

  isRunning = true;

  setInterval(async () => {
    if (jobQueue.length === 0) return;

    const jobsToSend = jobQueue.splice(0, 20); // send 20 per second

    for (const job of jobsToSend) {
      try {
        const response = await sendWhatsAppTemplate(job.data);
        job.resolve({ success: true, data: response.data });
      } catch (err) {
        job.resolve({
          success: false,
          error: err?.response?.data || err.message,
        });
      }
    }
  }, 1000);
}

export function addJob(data) {
  return new Promise((resolve) => {
    jobQueue.push({ data, resolve });
    startProcessor();
  });
}
