import Hero from "./_components/hero/Hero";
import PainSection from "./_components/sections/PainSection";
import HowItWorksSection from "./_components/sections/HowItWorksSection";
import ExampleOutputSection from "./_components/sections/ExampleOutputSection";
import SocialProofSection from "./_components/sections/SocialProofSection";
import PricingSection from "./_components/sections/PricingSection";
import FinalCtaSection from "./_components/sections/FinalCtaSection";
import FooterMini from "./_components/sections/FooterMini";


export default function Landing() {
  return (
    <>
      <Hero />
      <PainSection />
      <HowItWorksSection />
      <ExampleOutputSection />
      <SocialProofSection />
      <PricingSection />
      <FinalCtaSection />
      <FooterMini />
    </>
  );
}
