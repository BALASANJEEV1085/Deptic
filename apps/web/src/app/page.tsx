import React from 'react';
import { Navbar } from './_components/Navbar';
import { Hero } from './_components/Hero';
import { FeaturesScrollytelling } from './_components/FeaturesScrollytelling';
import { ApiSection } from './_components/ApiSection';
import { PricingSection } from './_components/PricingSection';
import { Footer } from './_components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] w-full">
      <Navbar />
      <Hero />
      <FeaturesScrollytelling />
      <ApiSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
