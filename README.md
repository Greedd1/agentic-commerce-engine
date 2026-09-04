# ⚡ Agentic Commerce Engine | Aurex Fragrances

An autonomous, agentic storefront built with **Next.js**, **Node.js**, and **Gemini 2.5 Flash**. This project demonstrates a production-grade Conversational In-App Checkout system capable of real-time price negotiation, dynamic campaign orchestration, and secure financial processing via Razorpay.

## 🎯 Architecture Overview
Traditional e-commerce relies on static product pages and rigid checkout flows. This project introduces a **Conversational Commerce Agent** that not only assists customers but acts as an autonomous sales representative with explicit financial boundaries. 

The system intercepts conversational intent, calculates dynamic upsells, verifies safety limits, and triggers programmatic checkouts—all without leaving the chat interface.

### Tech Stack
*   **Frontend:** Next.js, React, Tailwind CSS, Lucide Icons
*   **Backend:** Node.js, Express.js
*   **AI Engine:** Gemini 2.5 Flash (Direct REST Integration)
*   **Payment Gateway:** Razorpay SDK

---

## ✨ Core Features & Technical Highlights

### 1. 🧠 Autonomous Negotiation Protocol
Instead of rigid pricing, the AI is equipped with a "Floor Price" logic. If a customer hesitates or complains about the price of an upsell (e.g., the Travel Atomizer at ₹800), the agent is authorized to autonomously drop the price to a 50% discount (₹400) to close the sale. 

### 2. 🎛️ Live Campaign Orchestrator
A real-time prompt-injection dashboard that allows administrators to hot-swap the AI's internal directives without restarting the server.
*   **Standard Luxury:** Focuses on gentle ₹800 upsells with negotiation capabilities.
*   **Flash Sale:** Shifts persona to aggressive liquidation, pitching 50% discounts immediately.
*   **VIP Concierge:** Pivots to high-end gifting, offering ₹500 wax-sealed packaging.

### 3. 🛡️ Financial Guardrails & Audit Trail
LLMs are prone to hallucination, which is dangerous in fintech. This system implements a strict deterministic middleware gate:
*   **Cart Limits:** Hard-capped at ₹10,000 to prevent AI-generated overcharging.
*   **Upsell Thresholds:** Strict percentage-based blocks to ensure the AI doesn't dynamically invent unauthorized products or pricing.
*   **Explainability:** Every AI financial decision is intercepted and logged on the frontend dashboard with explicit reasoning before Razorpay is ever triggered.

### 4. 🚨 Chaos Mode (Graceful Failure Simulation)
Built-in Chaos Engineering. A "Trigger Chaos Mode" function simulates severe network degradation and API timeouts. The backend catches the failure, blocks the transaction, and updates the Audit Trail, proving the system fails securely without crashing the UI.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
*   Node.js (v18+)
*   Razorpay Test Account
*   Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Greedd1/agentic-commerce-engine.git](https://github.com/Greedd1/agentic-commerce-engine.git)
   cd agentic-commerce-engine
