'use client';
import { useEffect, useState } from 'react';
import { isPushSupported, isPushSubscribed, subscribeToPush } from '@/lib/push';

export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show after 3 seconds on first dashboard visit
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
      // Show a test notification immediately
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
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: '#0f1117', border: '1px solid #1a1f2e',
      borderRadius: 12, padding: '20px 24px', maxWidth: 340,
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255, 255, 255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🔔</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#f0f4ff' }}>Enable security alerts</div>
          <div style={{ fontSize: 12, color: '#8b91a8', lineHeight: 1.6, marginBottom: 14 }}>
            Get instant browser notifications for critical CVEs, scan results, and Fix PRs.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={enable} disabled={loading} style={{
              background: '#ffffff', color: '#000', border: 'none',
              borderRadius: 7, padding: '8px 16px', fontSize: 12,
              fontWeight: 600, cursor: 'pointer',
            }}>
              {loading ? 'Enabling...' : 'Enable notifications'}
            </button>
            <button onClick={dismiss} style={{
              background: 'transparent', color: '#4a5068',
              border: '1px solid #1a1f2e', borderRadius: 7,
              padding: '8px 12px', fontSize: 12, cursor: 'pointer',
            }}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
