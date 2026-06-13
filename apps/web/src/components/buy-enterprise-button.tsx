'use client';
import { useState } from 'react';
import { initiatePayment } from '@/lib/razorpay';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export function BuyEnterpriseButton() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	async function handleBuyNow() {
		setLoading(true);
		setError('');

		try {
			// Step 1: Create order
			const orderResp = await apiFetch('/payment/create-order', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});

			const { order_id, amount, user_email, user_name } = orderResp;

			// Step 2: Open Razorpay
			await initiatePayment(
				order_id,
				amount,
				user_email,
				user_name,
				async (paymentData) => {
					// Step 3: Verify payment on backend
					try {
						const verifyResp = await apiFetch('/payment/verify', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(paymentData),
						});

						if (!verifyResp.success) {
							setError(verifyResp.error || 'Payment verification failed. Contact support@deptic.in');
							setLoading(false);
							return;
						}

						// Step 4: Success — redirect to dashboard with success toast
						router.push('/dashboard?payment=success');
					} catch (verifyErr: any) {
						setError(verifyErr.message || 'Payment verification failed. Contact support@deptic.in');
						setLoading(false);
					}
				},
				(error) => {
					if (error.message !== 'Payment cancelled by user') {
						setError('Payment failed: ' + (error.description || error.message));
					}
					setLoading(false);
				}
			);
		} catch (err: any) {
			setError(err.message || 'Something went wrong');
			setLoading(false);
		}
	}

	return (
		<div>
			<button
				onClick={handleBuyNow}
				disabled={loading}
				style={{
					width: '100%', padding: '14px', borderRadius: 12,
					background: loading ? '#333' : '#ffffff',
					color: loading ? '#999' : '#000000', border: 'none', fontSize: 15,
					fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
					transition: 'all 0.2s',
				}}
			>
				{loading ? 'Processing...' : 'Buy Now — ₹2/mo'}
			</button>
			{error && (
				<div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
					{error}
				</div>
			)}
		</div>
	);
}
