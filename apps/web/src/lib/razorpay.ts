declare global {
	interface Window {
		Razorpay: any;
	}
}

export async function loadRazorpay(): Promise<boolean> {
	return new Promise((resolve) => {
		if (window.Razorpay) { resolve(true); return; }
		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/checkout.js';
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});
}

export async function initiatePayment(
	orderId: string,
	amount: number,
	userEmail: string,
	userName: string,
	onSuccess: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void,
	onFailure: (error: any) => void
) {
	const loaded = await loadRazorpay();
	if (!loaded) {
		onFailure(new Error('Razorpay SDK failed to load'));
		return;
	}

	const options = {
		key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
		amount: amount,
		currency: 'INR',
		name: 'Deptic',
		description: 'Enterprise Plan — Monthly Subscription',
		image: 'https://deptic.in/icon-192.png',
		order_id: orderId,
		prefill: {
			email: userEmail,
			name: userName,
		},
		theme: {
			color: '#ffffff',
			backdrop_color: '#000000',
		},
		modal: {
			ondismiss: () => onFailure(new Error('Payment cancelled by user')),
		},
		handler: (response: any) => {
			onSuccess({
				razorpay_order_id: response.razorpay_order_id,
				razorpay_payment_id: response.razorpay_payment_id,
				razorpay_signature: response.razorpay_signature,
			});
		},
	};

	const rzp = new window.Razorpay(options);

	rzp.on('payment.failed', (response: any) => {
		onFailure(response.error);
	});

	rzp.open();
}
