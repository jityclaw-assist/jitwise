import HeroCta from "../cta/HeroCta";
import Image from "next/image";
import ShapeHero from "@/components/kokonutui/shape-hero";

const Hero = () => {
  return (
    <section id="hero">
      <ShapeHero
      accent="3 minutes"
      actions={<HeroCta />}
      subtitle="Select your modules, set your rate, and get a client-ready brief with AI-powered scope analysis. No more spreadsheets, no more guesswork."
      title="Turn a client call into a professional project estimate in"
      titleContinuation="."
      footer={
        <Image
          src="/Jitwise.svg"
          alt="Jitwise logo"
          width={1080}
          height={800}
          className="mx-auto px-4 md:px-0 md:mx-4"
          priority
        />
      }
      />
    </section>
  );
};

export default Hero;
