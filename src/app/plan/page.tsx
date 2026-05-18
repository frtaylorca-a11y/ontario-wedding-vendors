export const metadata = {
  title: "Wedding budget planner",
  description: "AI-assisted budget planning for Ontario weddings.",
};

export default function PlanPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-5xl">Wedding budget planner</h1>
      <p className="mt-4 text-lg text-[var(--owv-warm-grey)]">
        Enter your budget, guest count, and style — Claude will help allocate it
        across venue and vendors.
      </p>
      <p className="mt-8 text-xs text-[var(--owv-warm-grey)]">
        UI components pending. Wires up to the Anthropic API on submit.
      </p>
    </main>
  );
}
