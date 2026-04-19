import { PackageCheck, PackageOpen, UserPlus } from "lucide-react";
import { Badge, Button, Card, brand } from "@deliphone/ui";

const stats = {
  awaitingIssue: 0,
  awaitingReturn: 0,
  totalDevices: 5,
  availableDevices: 5,
};

export function HelloPage() {
  return (
    <main className="min-h-full bg-ink-50 px-24 py-32 lg:px-48 lg:py-64">
      <div className="max-w-[1024px] mx-auto flex flex-col gap-24">
        <Header />
        <StatsBlock />
        <Actions />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-16 flex-wrap">
      <div className="flex items-center gap-12">
        <span className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-accent text-accent-ink">
          <span className="h2 leading-none font-bold">Д</span>
        </span>
        <div>
          <div className="h2 m-0">{brand.name}</div>
          <div className="body-sm text-ink-500">Точка · ул. Примерная, 12 · оператор Иван И.</div>
        </div>
      </div>
      <Badge variant="soft" size="lg">
        partner · v0.1
      </Badge>
    </header>
  );
}

function StatsBlock() {
  return (
    <section>
      <div className="caption text-ink-500 uppercase tracking-wider mb-8">Сейчас</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <StatCard label="Ожидают выдачу сегодня" value={stats.awaitingIssue} />
        <StatCard label="Ожидают возврат сегодня" value={stats.awaitingReturn} />
        <StatCard
          label="Устройств на точке"
          value={stats.totalDevices}
          hint={`из них свободных: ${stats.availableDevices}`}
        />
      </div>
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card variant="outlined" padding={20}>
      <div className="body-sm text-ink-500">{label}</div>
      <div className="display text-ink-900 mt-8 leading-none">{value}</div>
      {hint && <div className="body-sm text-ink-500 mt-8">{hint}</div>}
    </Card>
  );
}

function Actions() {
  return (
    <section>
      <div className="caption text-ink-500 uppercase tracking-wider mb-8">Что делаем?</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <Button variant="primary" size="lg" icon={PackageOpen} fullWidth>
          Выдать устройство
        </Button>
        <Button variant="secondary" size="lg" icon={PackageCheck} fullWidth>
          Принять устройство
        </Button>
        <Button variant="ghost" size="lg" icon={UserPlus} fullWidth>
          Зарегистрировать клиента
        </Button>
      </div>
    </section>
  );
}
