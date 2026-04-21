import { useState } from "react";

const COUNTRIES = [
  { code: "+7", flag: "🇷🇺", name: "Россия", maxDigits: 10 },
  { code: "+7", flag: "🇰🇿", name: "Казахстан", maxDigits: 10 },
  { code: "+375", flag: "🇧🇾", name: "Беларусь", maxDigits: 9 },
  { code: "+998", flag: "🇺🇿", name: "Узбекистан", maxDigits: 9 },
  { code: "+996", flag: "🇰🇬", name: "Кыргызстан", maxDigits: 9 },
  { code: "+992", flag: "🇹🇯", name: "Таджикистан", maxDigits: 9 },
  { code: "+374", flag: "🇦🇲", name: "Армения", maxDigits: 8 },
  { code: "+995", flag: "🇬🇪", name: "Грузия", maxDigits: 9 },
  { code: "+994", flag: "🇦🇿", name: "Азербайджан", maxDigits: 9 },
  { code: "+373", flag: "🇲🇩", name: "Молдова", maxDigits: 8 },
] as const;

type Country = (typeof COUNTRIES)[number];

type Props = {
  value: string;
  onChange: (raw: string) => void;
  className?: string;
};

export function PhoneInput({ value, onChange, className }: Props) {
  const [country, setCountry] = useState<Country>(COUNTRIES[0]!);
  const [showPicker, setShowPicker] = useState(false);
  const [digits, setDigits] = useState(value.replace(/\D/g, "").slice(country.code.replace("+", "").length));

  function handleDigitsChange(input: string) {
    const clean = input.replace(/\D/g, "").slice(0, country.maxDigits);
    setDigits(clean);
    onChange(country.code + clean);
  }

  function selectCountry(c: Country) {
    setCountry(c);
    setShowPicker(false);
    setDigits("");
    onChange(c.code);
  }

  const isFull = digits.length === country.maxDigits;

  return (
    <div className={className} style={{ position: "relative" }}>
      <div className="flex items-center gap-0 w-full rounded-full border border-ink-200 bg-ink-0 overflow-hidden focus-within:border-accent">
        {/* Country selector */}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-4 px-12 py-12 bg-transparent border-none cursor-pointer shrink-0"
          style={{ borderRight: "1px solid #E3E3DF" }}
        >
          <span style={{ fontSize: 20 }}>{country.flag}</span>
          <span className="body-sm text-ink-700">{country.code}</span>
          <span className="text-ink-400" style={{ fontSize: 10 }}>▼</span>
        </button>

        {/* Phone digits */}
        <input
          type="tel"
          inputMode="numeric"
          value={digits}
          onChange={(e) => handleDigitsChange(e.target.value)}
          placeholder={"0".repeat(country.maxDigits)}
          maxLength={country.maxDigits + 5}
          className="flex-1 px-12 py-12 body text-ink-900 outline-none bg-transparent"
          style={{ letterSpacing: "0.05em" }}
        />

        {isFull && (
          <span className="pr-12 text-success" style={{ fontSize: 18 }}>✓</span>
        )}
      </div>

      {/* Country picker dropdown */}
      {showPicker && (
        <div
          className="absolute top-full left-0 right-0 mt-4 bg-ink-0 rounded-lg border border-ink-200 overflow-hidden z-50"
          style={{ boxShadow: "0 8px 24px rgba(15,15,14,0.12)" }}
        >
          {COUNTRIES.map((c, i) => (
            <button
              key={`${c.code}-${c.name}`}
              onClick={() => selectCountry(c)}
              className="w-full flex items-center gap-12 px-16 py-10 text-left hover:bg-ink-50 transition-colors"
              style={{
                borderBottom: i < COUNTRIES.length - 1 ? "1px solid #EFEFED" : "none",
                background: c.name === country.name ? "rgba(214,255,61,0.1)" : "transparent",
              }}
            >
              <span style={{ fontSize: 20 }}>{c.flag}</span>
              <span className="body-sm text-ink-900 flex-1">{c.name}</span>
              <span className="body-sm text-ink-500">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
