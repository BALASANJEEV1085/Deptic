'use client';
import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { API_URL, getAuthHeaders } from '@/lib/api';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  url: string;
  sent_at: string;
  read_at: string | null;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/notifications`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markRead = async (id: string, url: string) => {
    const headers = await getAuthHeaders();
    await fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setIsOpen(false);
    if (url) router.push(url);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    const headers = await getAuthHeaders();
    for (const id of unreadIds) {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers });
    }
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#e8ecf4', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36,
          borderRadius: '50%',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 8, height: 8,
            background: '#ef4444', borderRadius: '50%'
          }} />
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 48, right: 0, width: 360, maxHeight: 480,
          background: '#0f1117', border: '1px solid #1a1f2e', borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#f0f4ff' }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8b91a8' }}>
                <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: 14 }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map(n => {
                let icon = '🔔';
                if (n.type === 'scan_complete') icon = '✅';
                if (n.type === 'scan_failed') icon = '❌';
                if (n.type === 'critical_cve') icon = '🚨';
                if (n.type === 'high_cve') icon = '⚠️';
                if (n.type === 'fix_pr_created') icon = '⚡';
                if (n.type === 'webhook_triggered') icon = '🔄';

                return (
                  <div key={n.id} onClick={() => markRead(n.id, n.url)} style={{
                    padding: '16px 20px', borderBottom: '1px solid #1a1f2e', cursor: 'pointer',
                    background: n.read_at ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                    display: 'flex', gap: 12
                  }}>
                    <div style={{ fontSize: 20 }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: '#e8ecf4', marginBottom: 4 }}>{n.title}</div>
                      <div style={{ fontSize: 13, color: '#8b91a8', lineHeight: 1.5 }}>{n.body}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: '12px 20px', borderTop: '1px solid #1a1f2e', textAlign: 'center' }}>
            <button onClick={() => { setIsOpen(false); router.push('/dashboard/settings'); }} style={{ background: 'transparent', border: 'none', color: '#8b91a8', fontSize: 13, cursor: 'pointer' }}>
              Notification settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
