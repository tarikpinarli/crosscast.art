/**
 * THE CHECKOUT GATEKEEPER (ULTRA-SMOOTH VERSION)
 * Uses a "curtain" technique to ensure a seamless transition from loading to loaded.
 */
import React, { useState } from 'react';
import { X, Download, Lock, Ticket, CheckCircle, AlertCircle } from 'lucide-react';
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentForm } from './PaymentForm';

// Initialize Stripe once outside component to avoid re-loading on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
  clientSecret: string | null;
  onClose: () => void;
  onSuccess: () => void;
  color?: string;
  price: string;
}

export const PaymentModal = ({ clientSecret, onClose, onSuccess, color = "cyan", price }: PaymentModalProps) => {
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // New state to track if the child form is actually finished rendering
  const [isFormReady, setIsFormReady] = useState(false);

  const appearance = {
    theme: 'night' as const,
    variables: { 
      colorPrimary: color === 'purple' ? '#a855f7' : '#22d3ee', 
      colorBackground: '#000000', 
      colorText: '#e2e8f0', 
      colorDanger: '#ff3333',
      fontFamily: 'monospace'
    },
  };

  const checkCoupon = () => {
    if (couponInput === "003611") {
        setCouponMessage({ type: 'success', text: "ACCESS GRANTED. BYPASSING PAYMENT..." });
        setTimeout(onSuccess, 1500);
    } else {
        setCouponMessage({ type: 'error', text: "ACCESS DENIED: INVALID CODE" });
    }
  };

  // Calculate if we should still show the loading skeleton (The Curtain)
  // It should show if we don't have the secret OR the form isn't ready yet.
  const showLoader = !clientSecret || !isFormReady;

  return (
    <div className={`
        fixed inset-0 z-50 flex items-start justify-center pt-4 md:pt-10 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300 overflow-y-auto
        [&::-webkit-scrollbar]:w-1.5 
        [&::-webkit-scrollbar-track]:bg-black 
        [&::-webkit-scrollbar-thumb]:bg-zinc-800 
        [&::-webkit-scrollbar-thumb]:rounded-full 
    `}>
      
      <div className={`relative w-full max-w-md bg-black border border-white/10 shadow-[0_0_50px_${color === 'purple' ? 'rgba(192,132,252,0.15)' : 'rgba(34,211,238,0.15)'}] rounded-lg flex flex-col mb-10 transition-all duration-500`}>
        
        {/* Header */}
        <div className="flex justify-end p-2">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors group" title="Close">
                <X size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
            </button>
        </div>

        <div className="px-6 md:px-8 pb-8 -mt-2">
            
            {/* Title Section */}
            <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 bg-${color}-900/20 border border-${color}-400/50 text-white flex items-center justify-center rounded-md shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                    <Download size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Export STL</h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Secure Transfer</p>
                </div>
            </div>

            {/* Price Display */}
            <div className={`mb-6 border-l-2 border-${color}-500 pl-4 py-1 flex justify-between items-center bg-gradient-to-r from-${color}-900/10 to-transparent`}>
                <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Transaction Fee</p>
                    <p className="text-2xl font-mono text-white tracking-tight">{price}</p> 
                </div>
            </div>

            {/* Coupon Section */}
            <div className="mb-6 p-3 bg-zinc-900/30 border border-white/5 rounded-sm">
                <label className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">
                    <Ticket size={10} className={`text-${color}-500`}/> Promo Code
                </label>
                <div className="flex gap-2">
                    <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="000-000" className="flex-1 bg-black border border-zinc-800 text-white text-xs font-mono px-3 py-2 focus:border-white/20 focus:outline-none uppercase placeholder-zinc-800 transition-colors"/>
                    <button onClick={checkCoupon} className={`bg-zinc-300 hover:bg-${color}-600 hover:text-white text-${color}-500 border border-zinc-700 hover:border-${color}-400 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all`}>Apply</button>
                </div>
                {couponMessage && (
                    <div className={`mt-2 flex items-center gap-2 text-[10px] font-mono ${couponMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {couponMessage.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        <span className="animate-pulse">{couponMessage.text}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 my-6 opacity-50">
                <div className="h-px bg-zinc-800 flex-1"></div>
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Encrypted Checkout</span>
                <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            {/* --- CRITICAL FIX: THE SMOOTH LOADER AREA --- */}
            {/* We set a minimum height to prevent layout shifts during loading */}
            <div className="min-h-[280px] relative transition-all duration-500">
                
                {/* 1. The Cyberpunk Skeleton Overlay (The "Curtain") */}
                {/* It sits on top (absolute) and fades out when showLoader becomes false */}
                <div 
                    className={`absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-black/80 backdrop-blur-sm z-20 transition-opacity duration-700 ${showLoader ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                     <div className={`w-12 h-12 rounded-full border-2 border-${color}-500/20 border-t-${color}-500 animate-spin`}></div>
                     <div className="text-center space-y-2">
                         <div className={`h-2 w-24 bg-${color}-500/20 rounded mx-auto animate-pulse`}></div>
                         <p className={`text-[10px] text-${color}-500/60 font-mono tracking-widest animate-pulse`}>
                             ESTABLISHING SECURE UPLINK...
                         </p>
                     </div>
                </div>

                {/* 2. The Actual Form (Renders in background) */}
                {clientSecret && (
                    // We render this immediately so Stripe starts loading behind the curtain
                    <Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
                        <PaymentForm 
                            onSuccess={onSuccess} 
                            onCancel={onClose} 
                            onFormReady={() => setIsFormReady(true)} // Tell parent to lift curtain
                            color={color} 
                        />
                    </Elements>
                )}
            </div>
            
            <div className="mt-6 flex justify-center items-center gap-2 text-[9px] text-zinc-700 uppercase font-mono pt-3 border-t border-white/5">
                <Lock size={10} /> <span>TLS 1.3 Encrypted Connection</span>
            </div>
        </div>
      </div>
    </div>
  );
};