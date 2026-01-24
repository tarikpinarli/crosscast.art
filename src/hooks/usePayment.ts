import { useState } from 'react';
import { BACKEND_URL } from '../config';

interface PaymentState {
  showModal: boolean;
  clientSecret: string;
  isLoading: boolean;
}

export function usePayment(moduleId: string) {
  const [state, setState] = useState<PaymentState>({
    showModal: false,
    clientSecret: "",
    isLoading: false,
  });

  const startCheckout = async () => {
    setState(prev => ({ ...prev, showModal: true, isLoading: true }));
    try {
      // FIX: Use the variable, not the hardcoded shadow-sculpture string
      const res = await fetch(`${BACKEND_URL}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setState(prev => ({ ...prev, clientSecret: data.clientSecret, isLoading: false }));
    } catch (error) {
      console.error(error);
      alert("Payment Server Error: Check console.");
      setState(prev => ({ ...prev, showModal: false, isLoading: false }));
    }
  };

  const closeModal = () => setState(prev => ({ ...prev, showModal: false }));

  return {
    ...state,
    startCheckout,
    closeModal
  };
}