import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/sections/hero'

import { StickyStory } from '@/components/sections/sticky-story'
import { BentoFeatures } from '@/components/sections/bento-features'
import { HorizontalScroll } from '@/components/sections/horizontal-scroll'
import { Metrics } from '@/components/sections/metrics'
import { BeforeAfter } from '@/components/sections/before-after'
import { FeatureWalkthrough } from '@/components/sections/feature-walkthrough'

import { ApiSection } from '@/components/sections/api-section'
import { Pricing } from '@/components/sections/pricing'
import { Testimonials } from '@/components/sections/testimonials'
import { FinalCta } from '@/components/sections/final-cta'
import { Footer } from '@/components/footer'

export default function Page() {
  return (
    <main className="dark relative bg-[var(--lp-bg)] text-[var(--lp-text)]">
      <Navbar />
      <Hero />

      <StickyStory />
      <BentoFeatures />
      <HorizontalScroll />
      <Metrics />
      <BeforeAfter />
      <FeatureWalkthrough />

      <ApiSection />
      <Pricing />
      <Testimonials />
      <FinalCta />
      <Footer />
    </main>
  )
}
