import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { BuyEnterpriseButton } from '@/components/buy-enterprise-button';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata = {
	title: 'Pricing | Deptic',
	description: 'Simple, transparent pricing for individuals and organizations.',
};

export default function PricingPage() {
	return (
		<div className="min-h-screen bg-[#050505] text-[#ffffff] font-sans selection:bg-[#ffffff] selection:text-[#000000]">
			<Navbar />
			
			<main className="max-w-[1200px] mx-auto px-6 pt-32 pb-24">
				<div className="text-center mb-16">
					<h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
						Simple, transparent pricing
					</h1>
					<p className="text-xl text-zinc-400 max-w-2xl mx-auto">
						Start free. Upgrade when you need more.
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">
					{/* Free Tier */}
					<div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 flex flex-col transition-all hover:border-[#333333]">
						<div className="mb-8">
							<h2 className="text-2xl font-semibold mb-2">Free</h2>
							<div className="flex items-baseline gap-2 mb-4">
								<span className="text-5xl font-bold">₹0</span>
								<span className="text-zinc-500">/month</span>
							</div>
							<p className="text-zinc-400">For individuals getting started</p>
						</div>

						<ul className="space-y-4 mb-8 flex-1">
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">10 scans per day</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">npm, pip, Maven, Go ecosystems</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">CVE detection</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">CycloneDX + SPDX export</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">2 active webhooks (30 min gap)</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">1 workspace</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">2 API keys per day</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-300">Community support</span></li>
							<li className="flex items-start gap-3 opacity-50"><X className="w-5 h-5 text-zinc-600 mt-0.5 shrink-0" /><span className="text-zinc-500">PDF reports (Enterprise only)</span></li>
							<li className="flex items-start gap-3 opacity-50"><X className="w-5 h-5 text-zinc-600 mt-0.5 shrink-0" /><span className="text-zinc-500">Slack/Jira integration</span></li>
							<li className="flex items-start gap-3 opacity-50"><X className="w-5 h-5 text-zinc-600 mt-0.5 shrink-0" /><span className="text-zinc-500">Fix with PR automation</span></li>
						</ul>

						<Link href="/login" className="block w-full py-4 text-center rounded-xl bg-[#111] hover:bg-[#222] border border-[#333] text-white font-semibold transition-colors">
							Start free
						</Link>
					</div>

					{/* Enterprise Tier */}
					<div className="bg-[#0A0A0A] border border-[#ffffff]/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-2xl p-8 flex flex-col relative overflow-hidden">
						<div className="absolute top-0 right-0 bg-[#ffffff] text-[#000000] text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
						<div className="mb-8">
							<h2 className="text-2xl font-semibold mb-2">Enterprise</h2>
							<div className="flex items-baseline gap-2 mb-4">
								<span className="text-5xl font-bold">₹2</span>
								<span className="text-zinc-500">/month</span>
							</div>
							<p className="text-zinc-400">For organizations at scale</p>
						</div>

						<ul className="space-y-4 mb-8 flex-1">
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100 font-medium">25 scans per day</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">All 8 ecosystems</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">Advanced CVE detection + NVD</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">CycloneDX + SPDX + PDF export</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">5 active webhooks (10 min gap)</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">5 workspaces</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">10 API keys per day</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">Fix with PR automation</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">Slack + Jira integration</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">Badge generator</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">Priority support</span></li>
							<li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /><span className="text-zinc-100">30-day money-back guarantee</span></li>
						</ul>

						<BuyEnterpriseButton />
					</div>
				</div>

				{/* FAQ Section */}
				<div className="max-w-3xl mx-auto pt-16 border-t border-[#1A1A1A]">
					<h3 className="text-2xl font-bold mb-10 text-center">Frequently Asked Questions</h3>
					
					<div className="space-y-8">
						<div>
							<h4 className="text-lg font-medium mb-2 text-zinc-200">What happens when I hit my scan limit?</h4>
							<p className="text-zinc-400">A banner appears and scans are blocked until the next day (midnight IST reset).</p>
						</div>
						
						<div>
							<h4 className="text-lg font-medium mb-2 text-zinc-200">Can I cancel anytime?</h4>
							<p className="text-zinc-400">Yes. Your Enterprise plan runs until the end of the billing month.</p>
						</div>
						
						<div>
							<h4 className="text-lg font-medium mb-2 text-zinc-200">Is my payment secure?</h4>
							<p className="text-zinc-400">All payments are processed securely by Razorpay — PCI DSS compliant.</p>
						</div>
						
						<div>
							<h4 className="text-lg font-medium mb-2 text-zinc-200">What ecosystems are supported?</h4>
							<p className="text-zinc-400">npm, pip, Maven, Go, Rust, Ruby, PHP, .NET</p>
						</div>
					</div>
				</div>
			</main>

			<Footer />
		</div>
	);
}
