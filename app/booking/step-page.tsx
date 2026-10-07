import { nextStep, previousStep, submitBooking } from "./actions";
import { requireStep, STEPS } from "./flow";

export async function StepPage({ step }: { step: number }) {
  await requireStep(step);
  const { title } = STEPS[step - 1];
  const last = step === STEPS.length;

  return (
    <main className="px-16 py-8">
      <h1 className="text-4xl font-bold">{title} page</h1>
      <p className="mt-2 text-neutral-500">
        Step {step} of {STEPS.length}
      </p>
      <div className="mt-8 flex gap-4">
        <form action={previousStep}>
          <button className="border border-neutral-900 px-4 py-2">Back</button>
        </form>
        <form action={last ? submitBooking : nextStep}>
          <button className="bg-neutral-900 px-4 py-2 text-white">{last ? "Submit" : "Next"}</button>
        </form>
      </div>
    </main>
  );
}
