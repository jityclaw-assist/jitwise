import { AppNav } from "@/components/shared/app-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full relative text-slate-100 dark">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(circle at top, #1c1c1c, #000000)",
        }}
      />
      <div className="relative z-10">
        <AppNav />
        <div className="mx-auto w-full max-w-5xl px-6 pb-16">{children}</div>
      </div>
    </div>
  );
}
