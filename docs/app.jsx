// Main design-system showcase — живая документация Делифон.

const Ts = window.DelifonTokens;
const Is = window.Icon;

// ---------- SECTION ----------
const Section = ({ id, eyebrow, title, description, children }) => (
  <section id={id} style={{ padding: '64px 0', borderTop: `1px solid ${Ts.color.ink[100]}` }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <span style={{
          fontFamily: Ts.font.mono, fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: Ts.color.ink[500], fontWeight: 600,
        }}>{eyebrow}</span>
        <span style={{ flex: 1, height: 1, background: Ts.color.ink[200] }} />
      </div>
      <h2 style={{
        fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em',
        margin: 0, lineHeight: 1.05,
      }}>{title}</h2>
      {description && (
        <p style={{
          fontSize: 17, color: Ts.color.ink[600], maxWidth: 720, lineHeight: 1.5,
          marginTop: 16, marginBottom: 0,
        }}>{description}</p>
      )}
      <div style={{ marginTop: 40 }}>{children}</div>
    </div>
  </section>
);

// ---------- SUBSECTION TITLE ----------
const SubTitle = ({ children, hint }) => (
  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{children}</h3>
    {hint && <span style={{ fontSize: 13, color: Ts.color.ink[500] }}>{hint}</span>}
  </div>
);

// ---------- SWATCH ----------
const Swatch = ({ color, name, value, contrast }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{
      height: 80, background: color, borderRadius: 14,
      border: color === '#FFFFFF' ? `1px solid ${Ts.color.ink[200]}` : 'none',
      boxShadow: Ts.shadow[1], position: 'relative',
    }}>
      {contrast && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          padding: '2px 6px', borderRadius: 4, fontSize: 10,
          fontFamily: Ts.font.mono, fontWeight: 600,
        }}>{contrast}</span>
      )}
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 12, color: Ts.color.ink[500], fontFamily: Ts.font.mono }}>{value}</div>
    </div>
  </div>
);

// ---------- DEMO CELL ----------
const DemoCell = ({ label, desc, children, bg, cols = 1 }) => (
  <div style={{
    background: bg || '#fff', borderRadius: 20, padding: 24,
    border: `1px solid ${Ts.color.ink[100]}`, display: 'flex', flexDirection: 'column',
    gridColumn: cols === 2 ? 'span 2' : undefined,
  }}>
    {label && <div style={{ fontSize: 12, fontWeight: 700, color: Ts.color.ink[500], textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>}
    {desc && <div style={{ fontSize: 13, color: Ts.color.ink[600], marginBottom: 16, lineHeight: 1.4 }}>{desc}</div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'flex-start' }}>{children}</div>
  </div>
);

// ---------- TOP NAV (internal doc nav) ----------
const DocNav = ({ surface, setSurface }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(14px)', borderBottom: `1px solid ${Ts.color.ink[100]}`,
  }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: Ts.color.ink[900], display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Is name="phone" size={17} color={Ts.color.accent.DEFAULT} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>Делифон</div>
          <div style={{ fontSize: 10, color: Ts.color.ink[500], fontFamily: Ts.font.mono, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Design System · v0.1</div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <nav style={{ display: 'flex', gap: 2 }} className="doc-nav-links">
        {[
          ['#foundations', 'Основы'],
          ['#typography', 'Шрифты'],
          ['#components', 'Компоненты'],
          ['#product', 'Продукт'],
          ['#patterns', 'Паттерны'],
          ['#examples', 'Экраны'],
        ].map(([h, l]) => (
          <a key={h} href={h} style={{
            padding: '8px 12px', color: Ts.color.ink[700], textDecoration: 'none',
            fontSize: 13, fontWeight: 500, borderRadius: 999,
          }}>{l}</a>
        ))}
      </nav>
      <window.Tabs
        tabs={[
          { value: 'client', label: 'Клиент' },
          { value: 'partner', label: 'Партнёр' },
          { value: 'admin', label: 'Админ' },
        ]}
        value={surface} onChange={setSurface} variant="pills"
      />
    </div>
  </div>
);

// ---------- HERO ----------
const Hero = () => (
  <div style={{
    position: 'relative', overflow: 'hidden',
    background: Ts.color.ink[900], color: '#fff',
  }}>
    {/* bg grid */}
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.14,
      backgroundImage: `
        linear-gradient(${Ts.color.accent.DEFAULT} 1px, transparent 1px),
        linear-gradient(90deg, ${Ts.color.accent.DEFAULT} 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
    }} />
    <div style={{
      position: 'absolute', top: -120, right: -120, width: 480, height: 480, borderRadius: '50%',
      background: Ts.color.accent.DEFAULT, opacity: 0.35, filter: 'blur(80px)',
    }} />
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 32px 64px', position: 'relative' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(214,255,61,0.16)', borderRadius: 999, fontSize: 12, color: Ts.color.accent.DEFAULT, fontWeight: 600, fontFamily: Ts.font.mono, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: Ts.color.accent.DEFAULT, animation: 'delifon-pulse 2s infinite' }} />
        Design system · v0.1
      </div>
      <h1 style={{
        fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 700, letterSpacing: '-0.04em',
        lineHeight: 0.96, margin: 0, textWrap: 'balance',
      }}>
        Делифон.<br />
        <span style={{ color: Ts.color.accent.DEFAULT }}>Смартфон</span> для курьера, <br />
        в одну кнопку.
      </h1>
      <p style={{
        fontSize: 19, maxWidth: 620, marginTop: 24, opacity: 0.78, lineHeight: 1.5,
      }}>
        Визуальный язык сервиса аренды смартфонов.
        Функциональный, честный, быстрый — ровно таким должен быть UX для тех,
        кто живёт в дороге и работает руками.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap' }}>
        {[
          { l: '34', c: 'Компонента' },
          { l: '4', c: 'Окружения' },
          { l: 'AA', c: 'Контраст' },
          { l: '44px', c: 'Min touch' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, minWidth: 110 }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.l}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginTop: 2 }}>{s.c}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ---------- FOUNDATIONS: COLORS ----------
const ColorsSection = () => (
  <>
    <SubTitle hint="единственный «цветной» цвет продукта">Акцент — кислотный лайм</SubTitle>
    <div style={{
      background: Ts.color.accent.DEFAULT, color: Ts.color.accent.ink,
      borderRadius: 24, padding: 32, marginBottom: 16, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 12, fontFamily: Ts.font.mono, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>ACCENT · #D6FF3D</div>
      <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 8, lineHeight: 1 }}>
        Этот цвет<br />работает в курьерке.
      </div>
      <div style={{ maxWidth: 520, marginTop: 16, fontSize: 15, lineHeight: 1.5, opacity: 0.8 }}>
        Лайм — единственный яркий акцент продукта. Он не пересекается с цветами агрегаторов
        (жёлтый Яндекс, синий Ozon, фиолетовый WB, красный Delivery), читается при любом
        освещении, уверенно «пробивает» карту и видео-фид камеры при сканировании QR.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        {[
          ['DEFAULT', Ts.color.accent.DEFAULT],
          ['hover', Ts.color.accent.hover],
          ['press', Ts.color.accent.press],
          ['soft', Ts.color.accent.soft],
          ['ink', Ts.color.accent.ink],
        ].map(([n, c]) => (
          <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ height: 40, background: c, borderRadius: 8, border: c === Ts.color.accent.DEFAULT ? 'none' : '1px solid rgba(15,15,14,0.1)' }} />
            <div style={{ fontSize: 11, fontFamily: Ts.font.mono, fontWeight: 600 }}>{n}</div>
            <div style={{ fontSize: 10, fontFamily: Ts.font.mono, opacity: 0.5 }}>{c}</div>
          </div>
        ))}
      </div>
    </div>

    <SubTitle hint="9 шагов: бумага → графит">Нейтральная шкала</SubTitle>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
      {Object.entries(Ts.color.ink).map(([k, v]) => (
        <Swatch key={k} name={`ink.${k}`} value={v} color={v}
          contrast={['0','50','100','200','300'].includes(k) ? '' : 'AA'} />
      ))}
    </div>

    <SubTitle hint="форма + цвет вместе для дальтоников">Семантические цвета</SubTitle>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {[
        ['success', Ts.color.success, 'checkCircle', 'Всё прошло успешно'],
        ['warning', Ts.color.warning, 'alertTriangle', 'Обрати внимание'],
        ['danger',  Ts.color.danger,  'alert', 'Что-то пошло не так'],
        ['info',    Ts.color.info,    'info', 'Справочная информация'],
      ].map(([n, c, ic, msg]) => (
        <div key={n} style={{ background: c.bg, color: c.ink, padding: 16, borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Is name={ic} size={18} color={c.DEFAULT} />
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{n}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: Ts.font.mono, marginBottom: 4 }}>{c.DEFAULT}</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{msg}</div>
        </div>
      ))}
    </div>
  </>
);

// ---------- TYPOGRAPHY ----------
const TypographySection = () => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
      <div>
        <div style={{ fontSize: 12, fontFamily: Ts.font.mono, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: Ts.color.ink[500] }}>Onest · Variable · Google Fonts</div>
        <div style={{ fontSize: 128, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.9, marginTop: 12 }}>Aa</div>
        <div style={{ fontSize: 13, color: Ts.color.ink[500], marginTop: 8, lineHeight: 1.4 }}>
          Onest — бесплатный гротеск с отличной кириллицей. Тёплые формы, чёткая гарнитура,
          читаемость на бюджетных Android. Веса 400 / 500 / 600 / 700.
        </div>
      </div>
      <div style={{ background: Ts.color.ink[900], color: '#fff', padding: 24, borderRadius: 20 }}>
        <div style={{ fontSize: 12, fontFamily: Ts.font.mono, letterSpacing: '0.1em', color: Ts.color.accent.DEFAULT }}>ПРИМЕР</div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.05 }}>
          Курьер Азамат<br />взял Redmi 13.<br />3 дня · 447 ₽.
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 14 }}>
          Аудитория живёт в движении, язык — короткий и конкретный. Крупно, без лишнего.
        </div>
      </div>
    </div>
    <div style={{ border: `1px solid ${Ts.color.ink[100]}`, borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px 140px', padding: '12px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: Ts.color.ink[500], background: Ts.color.ink[50] }}>
        <div>Стиль</div><div>Пример</div><div style={{ fontFamily: Ts.font.mono }}>Size / Line</div><div style={{ fontFamily: Ts.font.mono }}>Weight · Track</div>
      </div>
      {Ts.type.map(t => (
        <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px 140px', padding: '16px 20px', borderTop: `1px solid ${Ts.color.ink[100]}`, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontFamily: Ts.font.mono, fontWeight: 600 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: Ts.color.ink[500], marginTop: 2 }}>{t.use}</div>
          </div>
          <div style={{ fontSize: t.size, lineHeight: `${t.line}px`, fontWeight: t.weight, letterSpacing: t.track, color: Ts.color.ink[900] }}>
            {t.name.startsWith('display') ? 'Сдал в любой точке' : t.name.startsWith('h') ? 'Аренда активна' : 'Списание — завтра в 14:32'}
          </div>
          <div style={{ fontSize: 12, fontFamily: Ts.font.mono, color: Ts.color.ink[600] }}>{t.size} / {t.line}</div>
          <div style={{ fontSize: 12, fontFamily: Ts.font.mono, color: Ts.color.ink[600] }}>{t.weight} · {t.track}</div>
        </div>
      ))}
    </div>
  </>
);

// ---------- SPACING + RADIUS + SHADOW ----------
const SpacingSection = () => (
  <>
    <SubTitle hint="4px baseline · kebab-mobile">Spacing</SubTitle>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 40 }}>
      {Ts.space.filter(s => s > 0).map(s => (
        <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: s, height: s, background: Ts.color.ink[900], borderRadius: 2 }} />
          <div style={{ fontSize: 11, fontFamily: Ts.font.mono, color: Ts.color.ink[600] }}>{s}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <SubTitle hint='крупные скругления "пилюля"'>Radii</SubTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Object.entries(Ts.radius).slice(0, 8).map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{
                height: 70, background: Ts.color.ink[100], borderRadius: v === 999 ? '50%' : v,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, color: Ts.color.ink[700], width: '100%',
              }}>{k}</div>
              <div style={{ fontSize: 11, fontFamily: Ts.font.mono, marginTop: 6 }}>{v}px</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SubTitle hint="0 → 4 elevation, плюс тонкий бордер">Shadows</SubTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[0,1,2,3,4].map(s => (
            <div key={s} style={{ textAlign: 'center' }}>
              <div style={{
                height: 70, background: '#fff', boxShadow: Ts.shadow[s], borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: Ts.color.ink[700],
              }}>{s}</div>
              <div style={{ fontSize: 11, fontFamily: Ts.font.mono, color: Ts.color.ink[500], marginTop: 6 }}>elevation-{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

// ---------- BASE COMPONENTS ----------
const BaseComponents = () => {
  const [checked, setChecked] = React.useState(true);
  const [radio, setRadio] = React.useState('a');
  const [sw1, setSw1] = React.useState(true);
  const [tab, setTab] = React.useState('overview');
  const [modal, setModal] = React.useState(false);
  const [sheet, setSheet] = React.useState(false);
  const [sel, setSel] = React.useState('redmi');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      <DemoCell label="Button" desc="Primary — главное действие. Secondary — важное тёмное. Ghost — вторичное. Destructive — удаление." cols={2}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <window.Button variant="primary">Забронировать</window.Button>
          <window.Button variant="secondary">Сдать устройство</window.Button>
          <window.Button variant="ghost">Подробнее</window.Button>
          <window.Button variant="destructive" icon="trash">Удалить</window.Button>
          <window.Button variant="link">Забыли пароль?</window.Button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <window.Button variant="primary" size="sm" icon="plus">Продлить</window.Button>
          <window.Button variant="primary" size="md" icon="qr">Сканировать QR</window.Button>
          <window.Button variant="primary" size="lg" iconRight="arrowRight">Выдать</window.Button>
          <window.Button variant="primary" loading>Загрузка</window.Button>
          <window.Button variant="primary" disabled>Нет в наличии</window.Button>
        </div>
      </DemoCell>

      <DemoCell label="Input · Textarea" desc="48px высота, жирный фокус. Префикс/суффикс, иконки, hint, ошибка.">
        <window.Input label="Номер телефона" icon="phoneCall" placeholder="+7 •••" prefix="+7" />
        <window.Input label="Промокод" placeholder="Введи код" suffix="применить" />
        <window.Input label="E-mail" icon="send" value="kar@mail" error="Похоже, e-mail написан не полностью" />
        <window.Textarea label="Комментарий" placeholder="Что случилось?" rows={3} />
      </DemoCell>

      <DemoCell label="Select" desc="Мобильное открытие вниз. Галочка на выбранном.">
        <window.Select label="Устройство" value={sel} onChange={setSel} options={[
          { value: 'redmi', label: 'Xiaomi Redmi 13 · 128 ГБ' },
          { value: 'realme', label: 'Realme C55 · 64 ГБ' },
          { value: 'iphone', label: 'iPhone 11 · 64 ГБ' },
        ]} hint="Доступно 3 модели в этой точке" />
      </DemoCell>

      <DemoCell label="Checkbox · Radio · Switch" desc="Острые углы у чекбокса, чтобы не путать с радио.">
        <window.Checkbox checked={checked} onChange={setChecked} label="Согласен с условиями оферты" />
        <window.Checkbox checked={false} label="Получать уведомления" />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <window.Radio checked={radio === 'a'} onChange={() => setRadio('a')} label="Сутки" />
          <window.Radio checked={radio === 'b'} onChange={() => setRadio('b')} label="Неделя" />
          <window.Radio checked={radio === 'c'} onChange={() => setRadio('c')} label="Месяц" />
        </div>
        <window.Switch checked={sw1} onChange={setSw1} label="Push-уведомления" />
      </DemoCell>

      <DemoCell label="Badge · Chip" desc="Badge — статичный статус. Chip — фильтр, его можно нажать.">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <window.Badge variant="accent">Свободен</window.Badge>
          <window.Badge variant="ink">В аренде</window.Badge>
          <window.Badge variant="info" icon="clock">В пути</window.Badge>
          <window.Badge variant="warning" icon="alertTriangle">Сервис</window.Badge>
          <window.Badge variant="danger" icon="alert">Утеря</window.Badge>
          <window.Badge variant="success" icon="checkCircle">Возвращён</window.Badge>
          <window.Badge variant="outline">KYC нужен</window.Badge>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <window.Chip selected>Все</window.Chip>
          <window.Chip>iPhone</window.Chip>
          <window.Chip icon="pin">Рядом</window.Chip>
          <window.Chip>до 149 ₽</window.Chip>
        </div>
      </DemoCell>

      <DemoCell label="Avatar · Tag" desc="Инициалы на угольном фоне с лаймовой типографикой.">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <window.Avatar name="Азамат Каримов" size={56} />
          <window.Avatar name="Иван Петров" size={44} />
          <window.Avatar name="Ольга" size={36} />
          <window.Avatar name="+" size={36} bg={Ts.color.accent.DEFAULT} />
        </div>
      </DemoCell>

      <DemoCell label="Progress" desc="Linear и circular. Fills акцентом.">
        <window.Progress value={35} label="Проверка документов" />
        <window.Progress value={78} label="Заряд батареи" />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
          <window.CircularProgress value={64} />
          <window.CircularProgress value={28} size={56} stroke={5} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <window.Spinner size={22} color={Ts.color.ink[900]} />
            <span style={{ fontSize: 13, color: Ts.color.ink[600] }}>Ищем устройство…</span>
          </div>
        </div>
      </DemoCell>

      <DemoCell label="Alert" desc="Форма + цвет вместе. Иконка — не декор, она несёт смысл.">
        <window.Alert variant="info" title="Новый тариф">С 1 мая аренда на неделю — 899 ₽.</window.Alert>
        <window.Alert variant="success" title="Устройство принято">Депозит вернётся в течение часа.</window.Alert>
        <window.Alert variant="warning" title="Заряд 12%">Подзаряди перед возвратом.</window.Alert>
        <window.Alert variant="danger" title="Оплата не прошла">Проверь карту и попробуй ещё раз.</window.Alert>
      </DemoCell>

      <DemoCell label="Tabs" desc="Pills — для мобильных сегментов. Underline — для админ-разделов.">
        <window.Tabs value={tab} onChange={setTab} tabs={[
          { value: 'overview', label: 'Обзор' },
          { value: 'spec', label: 'Характеристики' },
          { value: 'rent', label: 'Аренда' },
        ]} />
        <window.Tabs value={tab} onChange={setTab} variant="underline" tabs={[
          { value: 'overview', label: 'Обзор' },
          { value: 'spec', label: 'Характеристики' },
          { value: 'rent', label: 'Аренда' },
        ]} />
      </DemoCell>

      <DemoCell label="Skeleton" desc="Всегда предпочтительнее спиннера — пользователь видит структуру сразу.">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <window.Skeleton width={56} height={56} radius={14} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <window.Skeleton width="70%" height={14} />
            <window.Skeleton width="50%" height={12} />
            <window.Skeleton width="40%" height={12} />
          </div>
        </div>
      </DemoCell>

      <DemoCell label="Empty State" desc="Что произошло и что делать дальше.">
        <window.EmptyState
          icon="map"
          title="Точек рядом нет"
          description="Попробуй увеличить радиус или посмотри список по метро."
          action={<window.Button size="sm" variant="primary" icon="navigation">Расширить радиус</window.Button>}
        />
      </DemoCell>

      <DemoCell label="Tooltip · Divider" desc="Tooltip по hover/focus. Divider с лейблом для разбивки форм.">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <window.Tooltip label="Это фиксированная сумма — без скрытых списаний">
            <window.Badge icon="help" variant="outline">Цена честная</window.Badge>
          </window.Tooltip>
          <window.Tooltip label="Оператор сканирует этот QR">
            <window.Button variant="ghost" size="sm" icon="qr">QR выдачи</window.Button>
          </window.Tooltip>
        </div>
        <window.Divider label="или оплати иначе" margin={4} />
      </DemoCell>

      <DemoCell label="Card variants" desc="Elevated (тень), Outlined (бордер), Filled (light fill), Ink (угольный), Accent (акцент)." cols={2}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {['elevated', 'outlined', 'filled', 'ink', 'accent'].map(v => (
            <window.Card key={v} variant={v} padding={16}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6 }}>{v}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, letterSpacing: '-0.01em' }}>Контент карточки</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>Пример текста</div>
            </window.Card>
          ))}
        </div>
      </DemoCell>

      <DemoCell label="Modal · BottomSheet" desc="Модал — центр. BottomSheet — главный паттерн на мобайле." cols={2}>
        <div style={{ display: 'flex', gap: 8 }}>
          <window.Button variant="secondary" onClick={() => setModal(true)}>Открыть Modal</window.Button>
          <window.Button variant="secondary" onClick={() => setSheet(true)}>Открыть BottomSheet</window.Button>
        </div>
        <window.Modal open={modal} onClose={() => setModal(false)} title="Отменить аренду?"
          footer={<><window.Button variant="ghost" fullWidth onClick={() => setModal(false)}>Не сейчас</window.Button>
                    <window.Button variant="destructive" fullWidth onClick={() => setModal(false)}>Отменить</window.Button></>}>
          <div style={{ fontSize: 14, color: Ts.color.ink[600], lineHeight: 1.5 }}>
            С карты спишется 50 ₽ за бронирование. Вернуть эти деньги нельзя.
          </div>
        </window.Modal>
        <window.Modal open={sheet} onClose={() => setSheet(false)} title="Выбери тариф" mobile
          footer={<window.Button variant="primary" fullWidth onClick={() => setSheet(false)}>Продолжить</window.Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Сутки', '149 ₽', true],
              ['Неделя', '899 ₽', false],
              ['Месяц', '2 990 ₽', false],
            ].map(([l, v, s]) => (
              <div key={l} style={{ padding: '14px 16px', border: `1.5px solid ${s ? Ts.color.ink[900] : Ts.color.ink[200]}`, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{l}</div>
                  <div style={{ fontSize: 12, color: Ts.color.ink[500] }}>Авто-продление</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              </div>
            ))}
          </div>
        </window.Modal>
      </DemoCell>

      <DemoCell label="Toast" desc="Короткая обратная связь, уходит сама через 3 секунды.">
        <window.Toast variant="success" title="Устройство забронировано" description="Приходи в точку в течение часа" />
        <window.Toast variant="danger" title="Связь потеряна" description="Пытаемся переподключиться…" />
      </DemoCell>
    </div>
  );
};

// ---------- PRODUCT COMPONENTS ----------
const ProductComponents = ({ surface }) => {
  const [step] = React.useState(2);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {/* Shared */}
      <DemoCell label="RentalStatus" desc="Главный блок активной аренды — таймер, сумма, действия. Угольный фон для визуального веса." cols={2}>
        <window.RentalStatus model="Xiaomi Redmi 13" days={3} dailyRate={149} nextCharge="Завтра в 14:32 · 149 ₽" />
      </DemoCell>

      <DemoCell label="MapCard" desc="Карточка точки на карте.">
        <window.MapCard name="Делифон · Савёловская" address="ул. Нижняя Масловка, 6" distance="180 м" available={3} total={5} rating={4.8} open />
      </DemoCell>

      <DemoCell label="DeviceCard" desc="Карточка смартфона в каталоге.">
        <window.DeviceCard model="Xiaomi Redmi 13" storage="128 ГБ" rate={149} status="free" battery={87} id="A42" />
        <window.DeviceCard model="Realme C55" storage="64 ГБ" rate={129} status="rented" battery={42} id="B21" />
        <window.DeviceCard model="iPhone 11" storage="64 ГБ" rate={249} status="service" id="C04" />
      </DemoCell>

      <DemoCell label="BalanceCard" desc="Баланс и задолженность. Акцентный — хороший, угольный с CTA — должок.">
        <window.BalanceCard amount="0" />
        <window.BalanceCard amount="447" debt onPay={() => {}} />
      </DemoCell>

      <DemoCell label="PaymentMethodCard · StepIndicator" desc="Платёжка и прогресс многошаговых флоу.">
        <window.PaymentMethodCard brand="MIR" last4="5678" expiry="09/28" primary />
        <window.PaymentMethodCard brand="VISA" last4="0081" expiry="04/27" />
        <div style={{ paddingTop: 8 }}>
          <window.StepIndicator steps={['Телефон', 'Паспорт', 'Карта', 'Готово']} current={step} />
        </div>
      </DemoCell>

      <DemoCell label="QRDisplay" desc="Большой QR для сканирования оператором.">
        <window.QRDisplay value="DLF-7K3P-QN82" hint="Покажи этот QR оператору, чтобы получить телефон" />
      </DemoCell>

      <DemoCell label="QRScanner" desc="Экран сканирования камерой с живой рамкой и линией.">
        <window.QRScanner />
      </DemoCell>

      <DemoCell label="PhotoCapture · SignatureCapture" desc="Съёмка документа с индикатором качества. Подпись пальцем.">
        <window.PhotoCapture label="Паспорт · страница 2" quality="Хорошо" />
        <div style={{ marginTop: 12 }}>
          <window.SignatureCapture />
        </div>
      </DemoCell>

      <DemoCell label="IncidentCard" desc="Инцидент с устройством — тип, статус, сумма, фото.">
        <window.IncidentCard type="Разбит экран" status="review" amount="3 500" time="12 мин назад" description="Падение с высоты. Задняя крышка цела." />
        <window.IncidentCard type="Не вернул вовремя" status="charged" amount="450" time="вчера" description="Продление начислено автоматически, 3 дня × 149 ₽." />
      </DemoCell>

      <DemoCell label="ChatBubble · NotificationItem" desc="Поддержка и уведомления." cols={2}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: Ts.color.ink[50], padding: 16, borderRadius: 16 }}>
            <window.ChatBubble from="system">Разговор начат · 14:32</window.ChatBubble>
            <window.ChatBubble from="support" name="Настя · поддержка" time="14:33">Привет! Что случилось с устройством?</window.ChatBubble>
            <window.ChatBubble from="user" time="14:34">Экран мигает, не могу принять заказ</window.ChatBubble>
            <window.ChatBubble from="support" name="Настя · поддержка" time="14:35">Сейчас поможем. Пришли, пожалуйста, короткое видео — 10 секунд.</window.ChatBubble>
          </div>
          <div style={{ background: Ts.color.ink[50], padding: 12, borderRadius: 16 }}>
            <window.NotificationItem icon="checkCircle" variant="accent" title="Устройство забронировано" description="Savёловская · забери в течение часа" time="Только что" unread />
            <window.NotificationItem icon="ruble" variant="warning" title="Списание завтра" description="149 ₽ за следующие сутки аренды" time="30 мин назад" unread />
            <window.NotificationItem icon="bell" title="Новая точка на Белорусской" description="Открылась новая точка — 4 устройства" time="Вчера" />
          </div>
        </div>
      </DemoCell>

      <DemoCell label="Money" desc="Единый блок для денег — крупные цифры, отделённые копейки, валюта.">
        <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <window.Money value="149" size="xl" />
          <window.Money value="2990.00" size="lg" />
          <window.Money value="447" size="md" />
          <window.Money value="50" size="sm" muted />
        </div>
      </DemoCell>
    </div>
  );
};

// ---------- PATTERNS ----------
const Patterns = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
    <DemoCell label="Пустое состояние" desc="Всегда объясни, почему пусто, и дай следующий шаг.">
      <window.EmptyState icon="history" title="Аренд пока нет" description="Выбери точку и возьми первый смартфон за пару минут." action={<window.Button variant="primary" size="md" icon="map">К точкам</window.Button>} />
    </DemoCell>

    <DemoCell label="Состояние ошибки" desc="Всегда дай кнопку «Попробовать ещё раз».">
      <window.EmptyState icon="x" title="Что-то пошло не так" description="Проверь интернет и попробуй обновить." action={<window.Button variant="secondary" size="md" icon="refresh">Попробовать ещё</window.Button>} />
    </DemoCell>

    <DemoCell label="Офлайн-баннер" desc="Не блокирует UI. Говорит что можно делать сейчас.">
      <window.Alert variant="warning" title="Нет интернета" icon="wifi">
        Ты в офлайне. Статус аренды актуален на 14:28 — освежим, как только появится связь.
      </window.Alert>
      <div style={{ padding: 12, background: Ts.color.ink[900], color: '#fff', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: Ts.color.danger.DEFAULT }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Офлайн · некоторые действия недоступны</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: Ts.color.accent.DEFAULT }}>Обновить</span>
      </div>
    </DemoCell>

    <DemoCell label="Подтверждение действия" desc="Destructive — красный, но кнопка отмены — всегда первая.">
      <window.Card padding={20} variant="outlined">
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Сдать устройство?</div>
        <div style={{ fontSize: 14, color: Ts.color.ink[600], marginBottom: 16 }}>Зарядки 12% — мы возьмём 50 ₽ за подзарядку.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <window.Button variant="ghost" fullWidth>Не сейчас</window.Button>
          <window.Button variant="secondary" fullWidth>Сдать</window.Button>
        </div>
      </window.Card>
    </DemoCell>

    <DemoCell label="Деньги · иерархия" desc="Крупная сумма — главное. Подпись — что это. Кнопка — что делать.">
      <window.Card padding={24} variant="outlined">
        <div style={{ fontSize: 11, fontWeight: 700, color: Ts.color.ink[500], textTransform: 'uppercase', letterSpacing: '0.08em' }}>К оплате</div>
        <div style={{ marginTop: 8 }}>
          <window.Money value="447" size="xl" />
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: Ts.color.ink[600] }}>3 дня аренды × 149 ₽</div>
        <div style={{ marginTop: 18 }}>
          <window.Button variant="primary" size="lg" fullWidth icon="ruble">Оплатить картой</window.Button>
        </div>
      </window.Card>
    </DemoCell>

    <DemoCell label="Форма · ошибки и успех" desc="Ошибка — под полем, рядом с иконкой. Успех — в тосте, не блокирует.">
      <window.Input label="Номер карты" icon="card" value="4242 42" error="Проверь номер — похоже, пропущены цифры" />
      <window.Input label="CVV" type="password" value="•••" rightIcon="eyeOff" hint="3 цифры на обороте" />
      <window.Button variant="primary" size="lg" fullWidth>Привязать карту</window.Button>
    </DemoCell>
  </div>
);

// ---------- APP ROOT ----------
const App = () => {
  const [surface, setSurface] = React.useState('client');
  const example = {
    client: <><ClientActiveRental /><ClientMap /></>,
    partner: <PartnerIssue />,
    admin: <AdminDashboard />,
  }[surface];
  const surfaceMeta = {
    client: { t: 'Клиентское приложение', d: 'Mobile-first. Крупные тач-зоны, свайпы, bottom sheets. Фокус — карта и статус аренды.' },
    partner: { t: 'Партнёрский кабинет', d: 'Планшет/смартфон на точке. Очень крупные кнопки, минимум текста, пошаговые мастера.' },
    admin:  { t: 'Админ-панель', d: 'Desktop web. Плотные таблицы с фильтрами, боковая навигация, дашборды с метриками.' },
  }[surface];

  return (
    <>
      <DocNav surface={surface} setSurface={setSurface} />
      <Hero />

      <Section id="foundations" eyebrow="01 · Основы" title="Цвет"
        description="Продукт чёрно-белый с одним сигнальным цветом. Нейтральная шкала — графит с лёгким тёплым оттенком: живее чистого чёрного, строже холодного синего.">
        <ColorsSection />
      </Section>

      <Section id="typography" eyebrow="02 · Типографика" title="Onest"
        description="Один семейство шрифтов на всю систему. Цифры — табулярные, чтобы суммы и таймеры не «прыгали» при изменении.">
        <TypographySection />
      </Section>

      <Section id="spacing" eyebrow="03 · Пространство" title="Сетка, скругления, тени"
        description="4px baseline. Крупные скругления дают тёплый вид поверх строгой функциональности. Elevation даёт иерархию без цвета.">
        <SpacingSection />
      </Section>

      <Section id="components" eyebrow="04 · Базовые компоненты" title="Атомы интерфейса"
        description="Всё, из чего собираются экраны — кнопки, поля, бейджи, карточки, модалки. Каждый компонент имеет состояния default / hover / active / focus / disabled / loading / error.">
        <BaseComponents />
      </Section>

      <Section id="product" eyebrow="05 · Продуктовые компоненты" title="Специфика Делифона"
        description="Куски интерфейса, которых нет в shadcn/ui — они построены на сценариях нашего продукта: аренда, точки, QR, инциденты, чат, деньги.">
        <ProductComponents surface={surface} />
      </Section>

      <Section id="patterns" eyebrow="06 · Паттерны" title="Как всё складывается"
        description="Готовые решения типовых UX-ситуаций: пустые состояния, ошибки, оффлайн, подтверждения, деньги, валидация форм.">
        <Patterns />
      </Section>

      <Section id="examples" eyebrow="07 · Примеры экранов"
        title={surfaceMeta.t}
        description={surfaceMeta.d}>
        <div style={{
          margin: '0 -32px', padding: '8px 32px', overflowX: 'auto',
        }}>
          <div style={{ display: 'flex', gap: 24, paddingBottom: 24, alignItems: 'flex-start' }}>
            {example}
          </div>
        </div>
      </Section>

      <footer style={{ borderTop: `1px solid ${Ts.color.ink[100]}`, padding: '48px 32px', textAlign: 'center', color: Ts.color.ink[500] }}>
        <div style={{ fontFamily: Ts.font.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          Делифон · Design System v0.1 · 2026
        </div>
        <div style={{ fontSize: 13, marginTop: 8 }}>Смартфон в аренду. Сеть точек по городу.</div>
      </footer>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
