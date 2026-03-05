import GradientButton from "@/components/kokonutui/gradient-button";


const HeroCta = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <GradientButton
        href="/login"
        label="Try Jitwise"
        variant="emerald"
        rel="noopener noreferrer"
      />
      <GradientButton
        href="/demo"
        label="See it in action"
        variant="purple"
        rel="noopener noreferrer"
      />
    </div>
  )
}

export default HeroCta
