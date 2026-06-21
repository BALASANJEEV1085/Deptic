'use client';

import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'deptic_cookie_consent';

type ConsentState = {
	necessary: boolean;
	analytics: boolean;
	marketing: boolean;
	consented: boolean;
	timestamp: string;
};

export function CookieConsent() {
	const [visible, setVisible] = useState(false);
	const [showDetails, setShowDetails] = useState(false);
	const [analytics, setAnalytics] = useState(true);
	const [marketing, setMarketing] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
		if (!stored) {
			// Show banner after a short delay for better UX
			const timer = setTimeout(() => setVisible(true), 1500);
			return () => clearTimeout(timer);
		}
	}, []);

	function saveConsent(analyticsVal: boolean, marketingVal: boolean) {
		const consent: ConsentState = {
			necessary: true,
			analytics: analyticsVal,
			marketing: marketingVal,
			consented: true,
			timestamp: new Date().toISOString(),
		};
		localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

		// Send to backend (fire and forget)
		const sessionId = getOrCreateSessionId();
		fetch(`${process.env.NEXT_PUBLIC_API_URL}/cookies/consent`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				session_id: sessionId,
				analytics: analyticsVal,
				marketing: marketingVal,
			}),
		}).catch(() => {}); // silently fail

		setVisible(false);
	}

	function handleAcceptAll() {
		saveConsent(true, true);
	}

	function handleAcceptNecessary() {
		saveConsent(false, false);
	}

	function handleSavePreferences() {
		saveConsent(analytics, marketing);
	}

	if (!visible) return null;

	return (
		<div
			style={{
				position: 'fixed',
				bottom: 24,
				left: 24,
				right: 24,
				maxWidth: 480,
				zIndex: 9999,
				background: '#0A0A0A',
				border: '1px solid #222',
				borderRadius: 16,
				padding: '20px 24px',
				boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
				fontFamily: 'system-ui, -apple-system, sans-serif',
				animation: 'slideUp 0.4s ease-out',
			}}
		>
			<style>{`
				@keyframes slideUp {
					from { transform: translateY(100px); opacity: 0; }
					to { transform: translateY(0); opacity: 1; }
				}
			`}</style>

			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<Cookie size={18} color="#ffffff" />
					<span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Cookie Preferences</span>
				</div>
				<button
					onClick={handleAcceptNecessary}
					style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
				>
					<X size={16} color="#666" />
				</button>
			</div>

			<p style={{ fontSize: 13, color: '#999', lineHeight: 1.5, marginBottom: 16 }}>
				We use cookies to improve your experience and analyze site usage.
				Necessary cookies are always active.{' '}
				<a href="/privacy" style={{ color: '#aaa', textDecoration: 'underline' }}>
					Privacy Policy
				</a>
			</p>

			{showDetails && (
				<div style={{ marginBottom: 16, borderTop: '1px solid #1a1a1a', paddingTop: 12 }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'default' }}>
						<input type="checkbox" checked disabled style={{ accentColor: '#22c55e' }} />
						<span style={{ color: '#ccc', fontSize: 13 }}>Necessary — Always on</span>
					</label>
					<label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
						<input
							type="checkbox"
							checked={analytics}
							onChange={(e) => setAnalytics(e.target.checked)}
							style={{ accentColor: '#22c55e' }}
						/>
						<span style={{ color: '#ccc', fontSize: 13 }}>Analytics — Usage insights</span>
					</label>
					<label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
						<input
							type="checkbox"
							checked={marketing}
							onChange={(e) => setMarketing(e.target.checked)}
							style={{ accentColor: '#22c55e' }}
						/>
						<span style={{ color: '#ccc', fontSize: 13 }}>Marketing — Product updates</span>
					</label>
				</div>
			)}

			<div style={{ display: 'flex', gap: 8 }}>
				{!showDetails ? (
					<>
						<button
							onClick={() => setShowDetails(true)}
							style={{
								flex: 1, padding: '10px 0', borderRadius: 10,
								background: 'transparent', border: '1px solid #333',
								color: '#ccc', fontSize: 13, fontWeight: 500, cursor: 'pointer',
								transition: 'all 0.2s',
							}}
						>
							Customize
						</button>
						<button
							onClick={handleAcceptAll}
							style={{
								flex: 1, padding: '10px 0', borderRadius: 10,
								background: '#fff', border: 'none',
								color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer',
								transition: 'all 0.2s',
							}}
						>
							Accept All
						</button>
					</>
				) : (
					<>
						<button
							onClick={handleAcceptNecessary}
							style={{
								flex: 1, padding: '10px 0', borderRadius: 10,
								background: 'transparent', border: '1px solid #333',
								color: '#ccc', fontSize: 13, fontWeight: 500, cursor: 'pointer',
							}}
						>
							Necessary Only
						</button>
						<button
							onClick={handleSavePreferences}
							style={{
								flex: 1, padding: '10px 0', borderRadius: 10,
								background: '#fff', border: 'none',
								color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer',
							}}
						>
							Save Preferences
						</button>
					</>
				)}
			</div>
		</div>
	);
}

function getOrCreateSessionId(): string {
	const key = 'deptic_session_id';
	let id = localStorage.getItem(key);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(key, id);
	}
	return id;
}
