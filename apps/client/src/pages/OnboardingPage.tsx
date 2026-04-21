import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo, Button } from "@deliphone/ui";
import { Smartphone, MapPin, Zap, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { colors } from "@deliphone/ui/tokens";

type Slide = { icon: LucideIcon; title: string; subtitle: string };

const SLIDES: Slide[] = [
  {
    icon: Smartphone,
    title: "Арендуй рабочий смартфон от 349 \u20BD/сутки",
    subtitle: "Современные устройства для курьеров и водителей",
  },
  {
    icon: MapPin,
    title: "Забирай в ближайшей точке, сдавай где удобно",
    subtitle: "Сеть партнёрских точек по всему городу",
  },
  {
    icon: Zap,
    title: "Оплата автоматически каждые 24 часа",
    subtitle: "Без залогов и скрытых комиссий",
  },
];

const STORAGE_KEY = "onboarding_done";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current]!;

  function finish() {
    localStorage.setItem(STORAGE_KEY, "true");
    navigate("/auth");
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setCurrent((p) => p + 1);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <header className="flex items-center justify-between px-16 py-12">
        <Logo size="sm" />
        <button onClick={finish} className="body-sm text-ink-500 bg-transparent border-0 cursor-pointer p-4">
          Пропустить
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-20 py-32 text-center gap-32">
        <div className="w-80 h-80 rounded-full bg-accent flex items-center justify-center">
          <slide.icon size={40} style={{ color: colors.accent.ink }} />
        </div>

        <div className="max-w-[360px] flex flex-col gap-12">
          <h1 className="h2 m-0">{slide.title}</h1>
          <p className="body text-ink-500 m-0">{slide.subtitle}</p>
        </div>

        <div className="flex gap-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="border-0 p-0 cursor-pointer rounded-full transition-all"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                background: i === current ? colors.accent.DEFAULT : colors.ink[300],
              }}
              aria-label={`Слайд ${i + 1}`}
            />
          ))}
        </div>
      </main>

      <footer className="px-20 pb-32">
        <Button variant="primary" size="lg" fullWidth iconRight={isLast ? ArrowRight : undefined} onClick={next}>
          {isLast ? "Начать" : "Дальше"}
        </Button>
      </footer>
    </div>
  );
}
