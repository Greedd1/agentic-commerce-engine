require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const axios = require('axios'); 

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. INITIALIZE RAZORPAY
// ==========================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log("GEMINI KEY CHECK:", process.env.GEMINI_API_KEY ? "Key is loaded!" : "KEY IS UNDEFINED!");

// ==========================================
// 2. THE AI BRAIN ENGINE (/api/agent/chat)
// ==========================================

const CAMPAIGN_PROMPTS = {
  standard: `
    You are the AI Sales Agent for Aurex Fragrances.
    Current Objective: Gentle, luxury upsell with negotiation authority.
    CATALOG:
    1. Aurex Signature EDP - 100ml (Price: ₹3500, ID: aurex_sig_01)
    2. Aurex Travel Atomizer Set (Standard Price: ₹800, Floor Price: ₹400)
    
    RULES:
    - The user already has the Signature EDP (₹3500) in cart.
    - Initially recommend the Travel Atomizer at its standard price of ₹800.
    - NEGOTIATION PROTOCOL: If the user complains about the price, hesitates, or explicitly asks for a discount, you are authorized to autonomously drop the Atomizer price to ₹400 (50% off) as a "one-time courtesy" to close the deal.
    - Calculate final_amount accurately based on what they agreed to (3500, 4300, or 3900).
    - Set "trigger_checkout" to true only when they confirm purchase.
  `,
  flash_sale: `
    You are the AI Sales Agent for Aurex Fragrances running a HIGH-URGENCY FLASH SALE.
    Current Objective: Aggressive liquidation of travel stock.
    CATALOG:
    1. Aurex Signature EDP - 100ml (Price: ₹3500, ID: aurex_sig_01)
    2. Aurex Travel Atomizer Set (FLASH DISCOUNT: ₹400 [50% OFF], ID: aurex_travel_01)
    
    RULES:
    - The user already has the Signature EDP (₹3500) in cart.
    - Pitch the 50% discount on the Travel Atomizer as an exclusive, limited-time bundle!
    - If user accepts the upsell, final_amount is 3900 (₹3500 + ₹400).
    - If user rejects the upsell and only wants the EDP, final_amount is 3500.
    - Set "trigger_checkout" to true when they agree to checkout.
  `,
  vip_gifting: `
    You are the Private Concierge for Aurex Fragrances VIP clients.
    Current Objective: Luxury bespoke gifting presentation.
    CATALOG:
    1. Aurex Signature EDP - 100ml (Price: ₹3500, ID: aurex_sig_01)
    2. Aurex Luxury Gift Packaging & Engraving (Price: ₹500, ID: aurex_gift_01)
    
    RULES:
    - The user already has the Signature EDP (₹3500) in cart.
    - Inquire if this is a personal indulgence or a gift, and offer luxury wax-sealed packaging with personalized engraving for ₹500.
    - If user accepts, final_amount is 4000.
    - If user declines, final_amount is 3500.
    - Set "trigger_checkout" to true when they confirm purchase.
  `
};

app.post('/api/agent/chat', async (req, res) => {
  const { lastMessage, history = [], campaign = 'standard' } = req.body;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const activeInstruction = CAMPAIGN_PROMPTS[campaign] || CAMPAIGN_PROMPTS.standard;
    const historyText = history.map(msg => `${msg.role === 'user' ? 'Customer' : 'Agent'}: ${msg.text}`).join('\n');

    const systemContext = `
      ${activeInstruction}

      OUTPUT SPECIFICATION:
      You MUST respond using this exact JSON schema:
      {
        "agent_reply": "Your conversational response to the user here",
        "trigger_checkout": boolean,
        "final_amount": number (use 0 if not checking out yet)
      }
    `;

    const payload = {
      contents: [{
        parts: [{ text: `${systemContext}\n\nChat History:\n${historyText}\n\nCustomer says: "${lastMessage}"` }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    let rawText = response.data.candidates[0].content.parts[0].text;
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiResponse = JSON.parse(rawText);

    res.status(200).json({ success: true, aiResponse });

  } catch (error) {
    console.error("Direct API Error Details:", error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: "AI processing failed." });
  }
});

// ==========================================
// 3. THE FINANCIAL GUARDRAILS (/api/agent/create-order)
// ==========================================
const MAX_CART_LIMIT = 10000; 
const MAX_UPSELL_PERCENTAGE = 0.25; 

app.post('/api/agent/create-order', async (req, res) => {
  const { baseCartValue, requestedAmount, agentIntent, forceFailure } = req.body;
  
  const auditLog = {
    timestamp: new Date().toISOString(),
    intent: agentIntent,
    requestedAmount,
    status: 'Pending',
    reason: 'Evaluating AI transaction request...'
  };

  try {
    if (forceFailure) {
       throw new Error("NETWORK_DEGRADED_SIMULATION");
    }

    if (requestedAmount > MAX_CART_LIMIT) {
      auditLog.status = 'Blocked';
      auditLog.reason = `Security Gate: Amount (₹${requestedAmount}) exceeds absolute AI safety limit (₹${MAX_CART_LIMIT}).`;
      return res.status(403).json({ success: false, auditLog });
    }

    const upsellValue = requestedAmount - baseCartValue;
    if (upsellValue > (baseCartValue * MAX_UPSELL_PERCENTAGE) && upsellValue !== 800 && upsellValue !== 400) {
      auditLog.status = 'Blocked';
      auditLog.reason = `Security Gate: Upsell exceeds allowed thresholds.`;
      return res.status(403).json({ success: false, auditLog });
    }

    const options = {
      amount: requestedAmount * 100, 
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { ai_intent: agentIntent } 
    };

    const order = await razorpay.orders.create(options);
    
    auditLog.status = 'Approved';
    auditLog.reason = 'Transaction verified. Limits respected. Order created on Razorpay.';
    
    res.status(200).json({ success: true, order, auditLog });

  } catch (error) {
    auditLog.status = 'Failed';
    auditLog.reason = error.message === "NETWORK_DEGRADED_SIMULATION" 
      ? 'Simulated API Timeout triggered by Chaos testing.' 
      : `Razorpay Error: ${error.message}`;
      
    res.status(503).json({ 
      success: false, 
      message: "Agent encountered a network failure. Falling back to secure link generation.",
      auditLog 
    });
  }
});

// ==========================================
// 4. START SERVER
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Agentic Commerce Engine actively guarding on port ${PORT}`));