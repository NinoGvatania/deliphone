import { DelifonTokens } from "@deliphone/shared-types/tokens";

export function HelloPage() {
  return (
    <main className="min-h-full grid place-items-center bg-ink-50 px-16 py-32">
      <section className="w-full max-w-[480px] rounded-2xl bg-ink-0 shadow-elev-2 p-24 sm:p-32">
        <span
          className="inline-block bg-accent text-accent-ink rounded-full font-sans caption px-12 py-4 font-semibold"
          style={{ letterSpacing: "0.01em" }}
        >
          {DelifonTokens.brand.name} · v0.1
        </span>
        <h1 className="mt-16 h1 font-sans text-ink-900">Hello Deliphone client</h1>
        <p className="mt-8 body-lg text-ink-500 font-sans">
          {DelifonTokens.brand.tagline}
        </p>
        <div className="mt-24 flex items-center gap-8">
          <button
            type="button"
            className="h-44 px-18 rounded-full bg-accent text-accent-ink font-sans font-semibold shadow-elev-1 hover:bg-[#C3EB2A] active:bg-[#AED41A] transition-[background-color] duration-[120ms]"
          >
            Начать
          </button>
          <button
            type="button"
            className="h-44 px-18 rounded-full bg-transparent border-[1.5px] border-ink-200 text-ink-900 font-sans font-semibold"
          >
            Уже есть аккаунт
          </button>
        </div>
      </section>
    </main>
  );
}
