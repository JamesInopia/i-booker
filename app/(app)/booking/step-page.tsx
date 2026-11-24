import { STEPS } from "./steps";

export function StepFrame({
  step,
  subtitle,
  children,
}: {
  step: 1 | 2 | 3;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="px-4 pb-6 pt-3 sm:px-8 sm:pt-4 lg:px-16 lg:pb-8 lg:pt-6">
      <section className="rounded-xl bg-container p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold sm:text-2xl">{STEPS[step - 1].title}</h1>
        {subtitle && <p className="mt-1 text-accent-3">{subtitle}</p>}
        {children}
      </section>
    </main>
  );
}
