import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { MonadSpeed } from '@/components/landing/monad-speed'
import { Footer } from '@/components/landing/footer'

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <MonadSpeed />
      </main>
      <Footer />
    </>
  )
}