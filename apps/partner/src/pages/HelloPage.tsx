import { DelifonTokens } from "@deliphone/shared-types/tokens";

export function HelloPage() {
  return (
    <main className="min-h-full grid place-items-center bg-ink-50 px-32 py-48">
      <section className="w-full max-w-[680px] rounded-2xl bg-ink-0 shadow-elev-2 p-40">
        <span
          className="inline-block bg-accent text-accent-ink rounded-full font-sans body-sm px-16 py-6 font-semibold"
          style={{ letterSpacing: "0.01em" }}
        >
          {DelifonTokens.brand.name} · Партнёр · v0.1
        </span>
        <h1 className="mt-20 display font-sans text-ink-900">Hello Deliphone partner</h1>
        <p className="mt-12 body-lg text-ink-500 font-sans">
          Партнёрский кабинет для выдачи и приёма устройств на планшете 1024×768.
        </p>
        <div className="mt-32 grid grid-cols-2 gap-16">
          <button
            type="button"
            className="h-56 px-24 rounded-full bg-accent text-accent-ink font-sans font-semibold shadow-elev-1 h3"
          >
            Зарегистрировать клиента
          </button>
          <button
            type="button"
            className="h-56 px-24 rounded-full bg-ink-900 text-ink-0 font-sans font-semibold h3"
          >
            Выдать устройство
          </button>
        </div>
      </section>
    </main>
  );
}
