import GradientButton from "@/components/kokonutui/gradient-button";


const HeroCta = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <GradientButton
        href="/login"
        label="Start estimating free →"
        variant="emerald"
        rel="noopener noreferrer"
      />
      <GradientButton
        href="#example-output"
        label="See a live example"
        variant="purple"
        rel="noopener noreferrer"
      />
    </div>
  )
}

export default HeroCta
