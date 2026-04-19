import { ArrowRight, MapPin, QrCode } from "lucide-react";
import { Badge, Button, Card, brand } from "@deliphone/ui";

export function HelloPage() {
  return (
    <main className="min-h-full bg-ink-50 px-16 py-24 md:px-24 md:py-48 flex items-center justify-center">
      <div className="w-full max-w-[480px] flex flex-col gap-16">
        <header className="flex items-center gap-8">
          <BrandMark />
          <Badge variant="soft" size="sm">
            client · v0.1
          </Badge>
        </header>

        <Card variant="elevated" padding={24}>
          <div className="flex flex-col gap-16">
            <div>
              <h1 className="h1 m-0">Hello Deliphone client</h1>
              <p className="body-lg text-ink-500 mt-8 m-0">{brand.tagline}</p>
            </div>

            <div className="flex flex-wrap gap-12">
              <Button variant="primary" size="lg" iconRight={ArrowRight}>
                Начать
              </Button>
              <Button variant="secondary" size="lg">
                Уже есть аккаунт
              </Button>
            </div>
          </div>
        </Card>

        <Card variant="filled" padding={20}>
          <div className="flex items-center gap-12">
            <div className="w-40 h-40 rounded-full bg-ink-900 text-accent flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="body-sm text-ink-500">Ближайшая точка</div>
              <div className="body font-semibold">Появится после KYC</div>
            </div>
            <Button variant="ghost" size="sm" icon={QrCode} aria-label="QR" />
          </div>
        </Card>
      </div>
    </main>
  );
}

function BrandMark() {
  return (
    <span className="inline-flex items-center gap-6">
      <span className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-accent text-accent-ink">
        <span className="h3 leading-none font-bold">Д</span>
      </span>
      <span className="h3 text-ink-900 tracking-tight">{brand.name}</span>
    </span>
  );
}
