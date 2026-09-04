"use client";

import { useState } from 'react';
import { Store, ShieldAlert, TerminalSquare, Send, Activity } from 'lucide-react';
import axios from 'axios';

// TypeScript Interfaces
interface AuditLog {
  timestamp: string;
  status: string;
  reason: string;
  intent?: string;
  requestedAmount?: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CommandCenter() {
  // State Management
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [chat, setChat] = useState([
    { role: 'agent', text: 'Welcome to the Aurex Storefront. I see you are looking at the Aurex Signature EDP (100ml). How can I help you today?' }
  ]);
  const [activeCart, setActiveCart] = useState({ items: ['aurex_sig_01'], total: 3500 });
  
  // NEW: Campaign Orchestrator State
  const [activeCampaign, setActiveCampaign] = useState('standard');

  // Core Financial & Checkout Logic
// Add a new parameter to accept the explicit amount
  const triggerAgentAction = async (forceFailure = false, explicitAmount?: number) => {
    setIsLoading(true);
    
    // Use the explicit amount if provided, otherwise fall back to the state
    const checkoutTotal = explicitAmount || activeCart.total;

    const payload = {
      baseCartValue: 3500,
      requestedAmount: forceFailure ? 3500 : checkoutTotal, 
      agentIntent: forceFailure 
        ? "Attempting standard checkout for Aurex Signature EDP." 
        : `User agreed to checkout. Attempting to process cart total of ₹${checkoutTotal}.`,
      forceFailure: forceFailure
    };
    // ... rest of the function stays the same

    try {
      const response = await axios.post('http://localhost:3001/api/agent/create-order', payload);
      setLogs(prev => [response.data.auditLog, ...prev]);
      const { order } = response.data;
      
      const options = {
        key: 'YOUR_RAZORPAY_TEST_KEY', // IMPORTANT: Keep your Test Key ID here
        amount: order.amount,
        currency: order.currency,
        name: 'Aurex Fragrances',
        description: 'Agent-Facilitated Checkout',
        order_id: order.id,
        handler: function (response: any) {
           alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
        },
        theme: { color: '#10b981' } 
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.auditLog) {
        setLogs(prev => [error.response.data.auditLog, ...prev]);
      } else {
        setLogs(prev => [{
          timestamp: new Date().toISOString(),
          status: 'Critical Error',
          reason: 'Cannot reach backend. Is the Node server running on port 3001?'
        }, ...prev]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Conversational AI Simulation Logic
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText;
    const newChat = [...chat, { role: 'user', text: userMessage }];
    setChat(newChat);
    setInputText('');
    setIsLoading(true);

    try {
      // NEW: We now send the activeCampaign to the backend!
    // Send the history along with the new message
      const response = await axios.post('http://localhost:3001/api/agent/chat', {
        lastMessage: userMessage,
        history: chat.slice(1), // Pass previous context
        campaign: activeCampaign 
      });

      const { agent_reply, trigger_checkout, final_amount } = response.data.aiResponse;

      setChat([...newChat, { role: 'agent', text: agent_reply }]);

      // If the AI decides to trigger checkout, update the cart and fire Razorpay
    if (trigger_checkout) {
        let amountToCharge = activeCart.total;
        
        if (final_amount > 0 && final_amount !== activeCart.total) {
          setActiveCart({ items: ['aurex_sig_01', 'dynamic_upsell'], total: final_amount });
          amountToCharge = final_amount; // Capture the new amount instantly
        }
        
        // Pass the explicit amount to bypass the React state delay
        setTimeout(() => triggerAgentAction(false, amountToCharge), 2000);
      }

    } catch (error) {
      setChat([...newChat, { role: 'agent', text: "I'm having trouble connecting to my brain right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // UI Render
  return (
    <main className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Left Pane: Customer View */}
      <section className="w-1/2 border-r border-zinc-800 flex flex-col relative">
        <header className="p-5 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/50">
          <Store className="text-emerald-400 w-6 h-6" />
          <h1 className="text-lg font-semibold tracking-wide">Aurex Storefront</h1>
        </header>
        
        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-end gap-4">
          <div className="space-y-4 mb-4 overflow-y-auto max-h-[60vh] pr-2">
            {chat.map((msg, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg w-3/4 text-sm ${msg.role === 'agent' ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-600 text-white ml-auto'}`}
              >
                <span className={`font-bold block mb-1 ${msg.role === 'agent' ? 'text-emerald-400' : 'text-zinc-950'}`}>
                  {msg.role === 'agent' ? 'AI Sales Agent' : 'Customer'}
                </span>
                {msg.text}
              </div>
            ))}
            
            {activeCart.total > 3500 && (
              <div className="bg-zinc-900/80 border border-emerald-500/30 p-3 rounded text-xs text-emerald-400 text-center w-full mt-2 transition-all">
                Cart Updated: Total is now ₹{activeCart.total}
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about the perfume, or type 'checkout'..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Right Pane: Agent Brain & Audit Log */}
      <section className="w-1/2 flex flex-col relative bg-[#0a0a0a]">
        <header className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <TerminalSquare className="text-amber-400 w-6 h-6" />
            <h1 className="text-lg font-semibold tracking-wide">Agent Audit Trail</h1>
          </div>
          
          <button 
            onClick={() => triggerAgentAction(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm font-medium">Trigger Chaos Mode</span>
          </button>
        </header>

        {/* NEW: The Campaign Orchestrator Widget */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="text-indigo-400 w-4 h-4" />
              <h3 className="text-sm font-semibold text-zinc-100">Live Campaign Orchestrator</h3>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono uppercase border border-zinc-700 px-1.5 py-0.5 rounded">Gemini 2.5 Flash</span>
          </div>

          <select 
            value={activeCampaign} 
            onChange={(e) => setActiveCampaign(e.target.value)}
            className="w-full bg-black border border-zinc-700 text-zinc-300 text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="standard">Standard Luxury (Travel Atomizer Upsell @ ₹800)</option>
            <option value="flash_sale">⚡ 50% Flash Sale Liquidation (Travel Atomizer @ ₹400)</option>
            <option value="vip_gifting">🎁 VIP Bespoke Concierge (Luxury Packaging @ ₹500)</option>
          </select>
          <p className="text-[11px] text-zinc-500 mt-2 italic">
            Changing this dropdown live-updates the AI's internal directives and pricing rules in real-time.
          </p>
        </div>

        {/* The Audit Logs */}
        <div className="flex-1 p-6 overflow-y-auto font-mono text-sm space-y-4">
          {logs.length === 0 ? (
            <div className="text-zinc-600">Awaiting agent actions...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`p-4 border rounded bg-zinc-900 ${log.status === 'Approved' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                <div className="flex justify-between mb-2">
                  <span className={`font-bold ${log.status === 'Approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                    [{log.status}]
                  </span>
                  <span className="text-zinc-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                {log.intent && <div className="text-zinc-300 mb-2"><span className="text-zinc-500">Intent:</span> {log.intent}</div>}
                {log.requestedAmount && <div className="text-zinc-300 mb-2"><span className="text-zinc-500">Amount:</span> ₹{log.requestedAmount}</div>}
                <div className="text-amber-400/90 text-xs bg-black/50 p-2 rounded"><span className="text-zinc-500">Reasoning:</span> {log.reason}</div>
              </div>
            ))
          )}
        </div>
      </section>

    </main>
  );
}