import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onFormReady: () => void;
  color?: string; 
}

export const PaymentForm = ({ onSuccess, onCancel, onFormReady, color = "indigo" }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [msg, setMsg] = useState("");
  // New state to track if the message is good (green) or bad (red)
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsLoading(true);
    setMsg(""); // Clear previous messages

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          billing_details: { address: { country: 'US' } }
        }
      }
    });

    if (error) {
      setMessageType('error');
      setMsg(error.message || "Payment Failed");
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      setMessageType('success');
      setMsg("Payment Successful! Redirecting...");
      // Delay strictly for reading the success message
      setTimeout(onSuccess, 1500);
    }
  };

  const btnColor = color === 'purple' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' 
                 : color === 'cyan' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
                 : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20';

  return (
    <form onSubmit={handleSubmit} className="mt-4 w-full relative animate-in fade-in duration-700">
      <PaymentElement 
        options={{
            layout: "tabs",
            fields: { billingDetails: { address: 'auto' } }
        }}
        onReady={onFormReady}
      />
      
      {/* DYNAMIC MESSAGE BOX */}
      {msg && (
        <div className={`mt-4 text-xs font-mono text-center border p-2 rounded flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            messageType === 'success' 
            ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-400' 
            : 'border-red-900/50 bg-red-900/20 text-red-400'
        }`}>
            {messageType === 'success' ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
            {msg}
        </div>
      )}
      
      <div className="flex gap-3 mt-8">
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs uppercase font-bold tracking-wider transition-colors"
        >
          Cancel
        </button>
        <button 
          disabled={isLoading || !stripe || !elements || messageType === 'success'} 
          className={`flex-1 py-3 text-white rounded-lg text-xs uppercase font-bold tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${btnColor} flex items-center justify-center gap-2`}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin"/> : null}
          {isLoading ? "Processing..." : messageType === 'success' ? "Paid" : "Pay Now"}
        </button>
      </div>
    </form>
  );
};