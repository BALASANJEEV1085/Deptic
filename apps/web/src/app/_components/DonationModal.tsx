"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, DollarSign } from 'lucide-react';

export function DonationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState<number>(10);
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingGeo, setFetchingGeo] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Fetch GeoIP
      setFetchingGeo(true);
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((data) => {
          if (data.country_code === 'IN') {
            setCurrency('INR');
            setAmount(500); // Default to 500 INR for India
          } else if (data.currency) {
            setCurrency(data.currency); // E.g. EUR, GBP, USD
            setAmount(10);
          }
        })
        .catch((err) => {
          console.error("GeoIP fetch failed:", err);
          // Fallback to USD
          setCurrency('USD');
        })
        .finally(() => {
          setFetchingGeo(false);
        });
    }
  }, [isOpen]);

  const handleDonate = async () => {
    if (amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deptic-api.onrender.com';
      const res = await fetch(`${apiUrl}/api/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize payment');

      // Load Razorpay Script dynamically if not present
      if (!(window as any).Razorpay) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }
      
      const options = {
        key: data.key,
        amount: amount * 100,
        currency: currency,
        name: "DEPTIC",
        description: "Donation",
        order_id: data.orderId,
        handler: function (response: any) {
          alert(`Thank you for your donation! Payment ID: ${response.razorpay_payment_id}`);
          onClose();
        },
        theme: { color: "#3b82f6" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        setError("Payment failed. Please try again.");
      });
      rzp.open();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during checkout.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">Support DEPTIC</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Your donation helps keep DEPTIC free for everyone.
        </p>

        {fetchingGeo ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                Select Amount ({currency})
              </label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[5, 10, 20].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(currency === 'INR' ? preset * 50 : preset)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      amount === (currency === 'INR' ? preset * 50 : preset)
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {currency === 'INR' ? '₹' : '$'}{currency === 'INR' ? preset * 50 : preset}
                  </button>
                ))}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {currency === 'INR' ? (
                    <span className="text-zinc-500 font-medium">₹</span>
                  ) : (
                    <DollarSign className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="w-full pl-9 pr-4 py-3 bg-black border border-white/10 rounded-xl text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Custom amount"
                  min="1"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

            <button
              onClick={handleDonate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                `Donate ${currency === 'INR' ? '₹' : ''}${amount} ${currency !== 'INR' ? currency : ''}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
