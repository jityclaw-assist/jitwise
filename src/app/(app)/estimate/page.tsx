import { EstimatorWizard } from "@/components/estimate/estimator-wizard";
import { MODULE_CATALOG } from "@/lib/catalog/modules";

export default function EstimatePage() {
  return (
    <main className="flex flex-col gap-10 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Estimation
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Build a defensible estimate
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Select scope modules, define risk and urgency, and review a structured
            effort and pricing range.
          </p>
        </div>
      </header>
      <EstimatorWizard modules={MODULE_CATALOG} />
    </main>
  );
}
