import { STEPS } from "./steps";

export function StepFrame({
  step,
  subtitle,
  children,
}: {
  step: 1 | 2 | 3 | 4;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="px-16 pb-8 pt-6">
      <section className="rounded-xl bg-container p-8 shadow-sm">
        <h1 className="text-2xl font-bold">{STEPS[step - 1].title}</h1>
        {subtitle && <p className="mt-1 text-accent-3">{subtitle}</p>}
        {children}
      </section>
    </main>
  );
}