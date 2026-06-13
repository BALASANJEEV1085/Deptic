'use client';
import { useEffect, useState } from 'react';
import { isPushSupported, isPushSubscribed, subscribeToPush } from '@/lib/push';

export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('deptic-push-dismissed');
    if (dismissed) return;

    const timer = setTimeout(async () => {
      if (!isPushSupported()) return;
      const subscribed = await isPushSubscribed();
      if (!subscribed) setShow(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  async function enable() {
    setLoading(true);
    const sub = await subscribeToPush();
    setLoading(false);
    setShow(false);
    if (sub) {
      new Notification('Deptic notifications enabled ✓', {
        body: 'You will now receive alerts for scans and vulnerabilities.',
        icon: '/icon-192.png',
      });
    }
  }

  function dismiss() {
    localStorage.setItem('deptic-push-dismissed', 'true');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[999] rounded-xl p-5 max-w-[340px] shadow-2xl"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border-hover)',
        boxShadow: `0 20px 40px var(--shadow-color)`,
        animation: 'slideUp 0.3s ease',
      }}
    >
      <div className="flex gap-3 items-start">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-lg"
          style={{ background: 'var(--avatar-bg)' }}
        >
          🔔
        </div>
        <div>
          <div className="font-semibold text-sm mb-1 text-[var(--text-primary)]">Enable security alerts</div>
          <div className="text-xs leading-relaxed mb-3.5 text-[var(--text-secondary)]">
            Get instant browser notifications for critical CVEs, scan results, and Fix PRs.
          </div>
          <div className="flex gap-2">
            <button
              onClick={enable}
              disabled={loading}
              className="rounded-md px-4 py-2 text-xs font-semibold cursor-pointer border-none bg-[var(--green)] text-black"
            >
              {loading ? 'Enabling...' : 'Enable notifications'}
            </button>
            <button
              onClick={dismiss}
              className="rounded-md px-3 py-2 text-xs cursor-pointer bg-transparent text-[var(--text-tertiary)] border border-[var(--border-hover)]"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
