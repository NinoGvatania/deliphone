import { PackageCheck, PackageOpen, UserPlus } from "lucide-react";
import { AppHeader, Button, Card, Logo } from "@deliphone/ui";

/**
 * Главный экран партнёрского кабинета (SPEC §6.3).
 *  - Sticky top bar: Logo слева, точка + оператор справа, без переноса
 *  - Блок «Сейчас» — 3 stat-карточки
 *  - Блок действий — 3 большие кнопки: выдать / принять / зарегистрировать
 */
const stats = {
  awaitingIssue: 0,
  awaitingReturn: 0,
  totalDevices: 5,
  availableDevices: 5,
};

const operator = { point: "ул. Примерная, 12", name: "Иван И." };

export function HelloPage() {
  return (
    <div className="min-h-full flex flex-col bg-ink-50">
      <AppHeader
        sticky
        paddingInline={24}
        left={<Logo size="md" />}
        right={
          <div className="flex items-center gap-8 body-sm text-ink-500 whitespace-nowrap">
            <span className="truncate max-w-[260px]">{operator.point}</span>
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-full bg-ink-300 shrink-0"
            />
            <span className="truncate max-w-[140px]">{operator.name}</span>
          </div>
        }
      />

      <main className="flex-1 px-24 py-24 lg:px-48 lg:py-32">
        <div className="max-w-[1024px] mx-auto flex flex-col gap-24">
          <StatsBlock />
          <Actions />
        </div>
      </main>
    </div>
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
