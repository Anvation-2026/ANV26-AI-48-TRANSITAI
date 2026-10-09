const express = require("express");
const cors = require("cors");
require("dotenv").config();

const twilio = require("twilio");

const app = express();

app.use(cors());
app.use(express.json());

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
  console.error(
    "Missing Twilio config. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM in server/.env"
  );
  process.exit(1);
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Test route
app.get("/", (req, res) => {
  res.send("TransitAI SMS Server is running");
});

// Send SMS
app.post("/api/send-sms", async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: "Phone number and message are required",
      });
    }

    if (!/^\+[1-9]\d{7,14}$/.test(to)) {
      return res.status(400).json({
        success: false,
        error: "Phone number must be in international format, e.g. +919XXXXXXXXX",
      });
    }

    const sms = await client.messages.create({
      body: message,
      from: TWILIO_FROM,
      to: to,
    });

    console.log("SMS sent:", sms.sid);

    res.json({
      success: true,
      sid: sms.sid,
      status: sms.status,
    });
  } catch (error) {
    console.error("SMS Error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`TransitAI SMS Server running on port ${PORT}`);
});