// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Ensure you run: npm install axios
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
// Increased limit for high-res images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- STRIPE PAYMENT ---
app.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 199, // $1.99 (Profitable Price Point)
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4242, () => console.log('Server running on port 4242'));

// --- MESHY AI PROXY ---
const MESHY_API_KEY = process.env.MESHY_API_KEY; 

// 1. Create Task (With Safety Net)
app.post('/api/meshy/create', async (req, res) => {
  // We accept the paymentIntentId to refund if things go wrong
  const { paymentIntentId, ...meshyPayload } = req.body;

  if (!MESHY_API_KEY) {
    console.error("❌ CRITICAL: MESHY_API_KEY Missing");
    if (paymentIntentId) await refundUser(paymentIntentId);
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  try {
    console.log("🚀 Sending request to Meshy...");
    
    // Using AXIOS for better compatibility
    const response = await axios.post("https://api.meshy.ai/openapi/v1/image-to-3d", meshyPayload, {
      headers: {
        "Authorization": `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    console.log("✅ Meshy Task Started:", response.data);
    res.json(response.data);

  } catch (error) {
    // Extract error details
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("❌ Meshy Create Error:", errorMsg);

    // 🚨 SAFETY NET: REFUND THE USER AUTOMATICALLY 🚨
    if (paymentIntentId) {
        console.log(`💸 Issuing Refund for ${paymentIntentId} due to API failure...`);
        await refundUser(paymentIntentId);
    }

    res.status(500).json({ 
        error: "Generation Failed. You have been automatically refunded.", 
        details: errorMsg 
    });
  }
});

// 2. Check Status (Polling)
app.get('/api/meshy/status/:id', async (req, res) => {
  try {
    const response = await axios.get(`https://api.meshy.ai/openapi/v1/image-to-3d/${req.params.id}`, {
      headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Polling Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Refund User
async function refundUser(paymentIntentId) {
    try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        console.log("✅ Refund Successful");
    } catch (err) {
        console.error("❌ CRITICAL: Refund Failed manually check Stripe", err.message);
    }
}