// Composition examples — реальные экраны, собранные из компонентов.

const Tc = window.DelifonTokens;
const Ic = window.Icon;

// ---------- PHONE FRAME (для клиентских экранов) ----------
const PhoneFrame = ({ children, statusBarColor = '#fff' }) => (
  <div style={{
    width: 380, height: 760, background: '#000', borderRadius: 44, padding: 10,
    boxShadow: Tc.shadow[4], flexShrink: 0,
  }}>
    <div style={{
      width: '100%', height: '100%', background: '#fff', borderRadius: 36,
      overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column',
    }}>
      <window.StatusBar color={statusBarColor} />
      {/* notch */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 110, height: 30, background: '#000', borderRadius: 999, zIndex: 10,
      }} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  </div>
);

// ---------- COMPOSITION 1 — Экран активной аренды (Клиент) ----------
const ClientActiveRental = () => {
  const [tab, setTab] = React.useState('home');
  return (
    <PhoneFrame>
      <window.ScreenHeader title="Аренда" subtitle="Точка · Метро Савёловская" action="help" />
      <div style={{ padding: '4px 16px 16px', background: Tc.color.ink[50], flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <window.RentalStatus
          model="Xiaomi Redmi 13"
          days={3}
          dailyRate={149}
          nextCharge="Завтра в 14:32 · 149 ₽"
        />

        <window.Card padding={16} variant="outlined">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: Tc.color.ink[700] }}>Способ оплаты</div>
            <button style={{ background: 'none', border: 'none', color: Tc.color.ink[600], fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Изменить</button>
          </div>
          <window.PaymentMethodCard brand="MIR" last4="5678" expiry="09/28" primary />
        </window.Card>

        <window.Card padding={16} variant="outlined">
          <div style={{ fontSize: 13, fontWeight: 600, color: Tc.color.ink[700], marginBottom: 10 }}>Быстрые действия</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <window.Button variant="ghost" size="sm" icon="pin" fullWidth>Найти точку</window.Button>
            <window.Button variant="ghost" size="sm" icon="messageCircle" fullWidth>Поддержка</window.Button>
            <window.Button variant="ghost" size="sm" icon="history" fullWidth>История</window.Button>
            <window.Button variant="ghost" size="sm" icon="alert" fullWidth>Сообщить о проблеме</window.Button>
          </div>
        </window.Card>
      </div>
      <window.BottomNav value={tab} onChange={setTab} items={[
        { value: 'home', label: 'Главная', icon: 'home' },
        { value: 'map', label: 'Точки', icon: 'map' },
        { value: 'bell', label: 'Уведомления', icon: 'bell', badge: 2 },
        { value: 'user', label: 'Профиль', icon: 'user' },
      ]} />
    </PhoneFrame>
  );
};

// ---------- COMPOSITION 2 — Карта точек (Клиент) ----------
const ClientMap = () => {
  const [tab, setTab] = React.useState('map');
  const [filter, setFilter] = React.useState('all');
  return (
    <PhoneFrame>
      <div style={{ padding: '8px 12px', display: 'flex', gap: 8 }}>
        <window.Input icon="search" placeholder="Адрес или метро" />
        <button style={{ width: 48, height: 48, borderRadius: 14, border: `1.5px solid ${Tc.color.ink[200]}`, background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic name="filter" size={18} />
        </button>
      </div>
      <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {[
          { v: 'all', l: 'Все' },
          { v: 'open', l: 'Открыто' },
          { v: 'iphone', l: 'iPhone' },
          { v: 'android', l: 'Android' },
          { v: '149', l: 'до 149 ₽/сут' },
        ].map(c => (
          <window.Chip key={c.v} selected={filter === c.v} onClick={() => setFilter(c.v)}>{c.l}</window.Chip>
        ))}
      </div>
      {/* fake map */}
      <div style={{
        height: 240, position: 'relative', overflow: 'hidden',
        background: `
          radial-gradient(circle at 30% 40%, ${Tc.color.ink[100]} 0%, transparent 40%),
          radial-gradient(circle at 70% 60%, ${Tc.color.ink[100]} 0%, transparent 40%),
          ${Tc.color.ink[50]}
        `,
      }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
          <defs>
            <pattern id="roads" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 0 20 L 40 20 M 20 0 L 20 40" stroke={Tc.color.ink[300]} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#roads)" />
        </svg>
        {/* pins */}
        {[
          { x: 30, y: 40, n: 3 },
          { x: 70, y: 30, n: 1 },
          { x: 55, y: 70, n: 5 },
          { x: 20, y: 75, n: 0 },
        ].map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -100%)' }}>
            <div style={{
              padding: '6px 12px', background: p.n > 0 ? Tc.color.ink[900] : Tc.color.ink[400], color: '#fff',
              borderRadius: 999, fontSize: 13, fontWeight: 700, boxShadow: Tc.shadow[2],
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.n > 0 ? Tc.color.accent.DEFAULT : '#fff' }} />
              {p.n > 0 ? `${p.n} шт` : 'нет'}
            </div>
          </div>
        ))}
        {/* you */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div style={{ width: 18, height: 18, background: Tc.color.accent.DEFAULT, border: '3px solid #fff', borderRadius: '50%', boxShadow: Tc.shadow[2] }} />
        </div>
      </div>
      {/* list */}
      <div style={{ padding: 12, background: Tc.color.ink[50], flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: Tc.color.ink[500], textTransform: 'uppercase', letterSpacing: '0.08em' }}>Рядом · 4 точки</div>
        <window.MapCard name="Делифон · Савёловская" address="ул. Нижняя Масловка, 6" distance="180 м" available={3} total={5} rating={4.8} open />
        <window.MapCard name="Делифон · Белорусская" address="1-я Тверская-Ямская, 14" distance="1.2 км" available={1} total={4} rating={4.6} open />
      </div>
      <window.BottomNav value={tab} onChange={setTab} items={[
        { value: 'home', label: 'Главная', icon: 'home' },
        { value: 'map', label: 'Точки', icon: 'map' },
        { value: 'bell', label: 'Уведомления', icon: 'bell', badge: 2 },
        { value: 'user', label: 'Профиль', icon: 'user' },
      ]} />
    </PhoneFrame>
  );
};

// ---------- COMPOSITION 3 — Мастер выдачи (Партнёр) ----------
const PartnerIssue = () => (
  <div style={{
    width: 520, background: '#fff', borderRadius: 24, overflow: 'hidden',
    boxShadow: Tc.shadow[3], display: 'flex', flexDirection: 'column',
    border: `1px solid ${Tc.color.ink[100]}`, flexShrink: 0,
  }}>
    <div style={{ padding: '20px 24px', background: Tc.color.ink[900], color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: Tc.color.accent.DEFAULT, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Выдача устройства</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>#OP-1847</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Шаг 3 из 4 · Подпись</div>
    </div>
    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${Tc.color.ink[100]}` }}>
      <window.StepIndicator steps={['Клиент', 'Устройство', 'Подпись', 'Готово']} current={2} />
    </div>
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
      <window.Alert variant="info" title="Проверь всё перед выдачей">
        Клиент согласен с тарифом 149 ₽/сут и залогом 3 000 ₽ на карте.
      </window.Alert>

      <window.Card padding={16} variant="filled">
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: Tc.color.ink[500], fontWeight: 600 }}>Клиент</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <window.Avatar name="Азамат Каримов" size={48} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Азамат Каримов</div>
            <div style={{ fontSize: 13, color: Tc.color.ink[600] }}>+7 (903) ••• 48-22 · Яндекс.Еда</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${Tc.color.ink[200]}` }}>
          <div>
            <div style={{ fontSize: 11, color: Tc.color.ink[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Устройство</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Redmi 13</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: Tc.color.ink[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Тариф</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>149 ₽/сут</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: Tc.color.ink[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Залог</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>3 000 ₽</div>
          </div>
        </div>
      </window.Card>

      <window.SignatureCapture />

      <div style={{ display: 'flex', gap: 8 }}>
        <window.Button variant="ghost" size="lg">Назад</window.Button>
        <window.Button variant="primary" size="lg" fullWidth iconRight="arrowRight">Выдать устройство</window.Button>
      </div>
    </div>
  </div>
);

// ---------- COMPOSITION 4 — Админ-дашборд ----------
const AdminDashboard = () => {
  const [tab, setTab] = React.useState('overview');
  return (
    <div style={{
      width: 1180, background: Tc.color.ink[50], borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${Tc.color.ink[200]}`, display: 'flex', flexShrink: 0,
      boxShadow: Tc.shadow[3],
    }}>
      {/* sidebar */}
      <aside style={{ width: 224, background: Tc.color.ink[900], color: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 16px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: Tc.color.accent.DEFAULT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic name="phone" size={18} color={Tc.color.accent.ink} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Делифон</div>
        </div>
        {[
          { v: 'overview', l: 'Обзор', ico: 'chart' },
          { v: 'devices', l: 'Устройства', ico: 'phone' },
          { v: 'points', l: 'Точки', ico: 'map' },
          { v: 'users', l: 'Клиенты', ico: 'users' },
          { v: 'incidents', l: 'Инциденты', ico: 'alertTriangle', badge: 7 },
          { v: 'finance', l: 'Финансы', ico: 'wallet' },
          { v: 'settings', l: 'Настройки', ico: 'settings' },
        ].map(it => {
          const active = tab === it.v;
          return (
            <button key={it.v} onClick={() => setTab(it.v)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, background: active ? 'rgba(214,255,61,0.14)' : 'transparent',
              color: active ? Tc.color.accent.DEFAULT : 'rgba(255,255,255,0.7)',
              fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer', border: 'none',
              textAlign: 'left', fontFamily: Tc.font.sans, transition: `all ${Tc.motion.fast}`,
            }}>
              <Ic name={it.ico} size={18} />
              <span style={{ flex: 1 }}>{it.l}</span>
              {it.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', background: Tc.color.danger.DEFAULT, color: '#fff', borderRadius: 999 }}>{it.badge}</span>}
            </button>
          );
        })}
      </aside>
      {/* main */}
      <main style={{ flex: 1, padding: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Обзор сети</div>
            <div style={{ fontSize: 13, color: Tc.color.ink[500], marginTop: 2 }}>Сегодня, 19 апреля · 14:32</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <window.Tabs tabs={[
              { value: '24h', label: '24 ч' },
              { value: '7d', label: '7 дней' },
              { value: '30d', label: 'Месяц' },
            ]} value="7d" onChange={() => {}} />
            <window.Button variant="ghost" size="md" icon="download">Экспорт</window.Button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { l: 'Активные аренды', v: '1 284', d: '+8%', icon: 'phone' },
            { l: 'Выручка за день', v: '191 316 ₽', d: '+12%', icon: 'ruble' },
            { l: 'Средний чек', v: '149 ₽', d: '0%', icon: 'chart' },
            { l: 'Инциденты', v: '7', d: '-2', icon: 'alertTriangle', bad: true },
          ].map((k, i) => (
            <window.Card key={i} padding={16} variant="outlined">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, background: Tc.color.ink[100],
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ic name={k.icon} size={16} color={Tc.color.ink[700]} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: k.bad ? Tc.color.success.DEFAULT : Tc.color.success.DEFAULT, fontVariantNumeric: 'tabular-nums' }}>{k.d}</span>
              </div>
              <div style={{ fontSize: 11, color: Tc.color.ink[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.l}</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
            </window.Card>
          ))}
        </div>

        {/* chart + table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <window.Card padding={20} variant="outlined">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Выручка, 7 дней</div>
              <window.Badge variant="soft">+12% к прошлой неделе</window.Badge>
            </div>
            <svg viewBox="0 0 400 140" width="100%" height="140">
              <defs>
                <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={Tc.color.accent.DEFAULT} />
                  <stop offset="100%" stopColor={Tc.color.accent.DEFAULT} stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {[60, 80, 70, 95, 110, 130, 125].map((h, i) => (
                <g key={i}>
                  <rect x={i * 56 + 10} y={140 - h} width={38} height={h} rx={8} fill="url(#barGrad)" />
                  <text x={i * 56 + 29} y={138 - h - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={Tc.color.ink[700]}>{h}k</text>
                </g>
              ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 11, color: Tc.color.ink[500], fontWeight: 600, marginTop: 4 }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <span key={d}>{d}</span>)}
            </div>
          </window.Card>
          <window.Card padding={0} variant="outlined">
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${Tc.color.ink[100]}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Последние инциденты</div>
              <button style={{ background: 'none', border: 'none', color: Tc.color.ink[600], fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Все →</button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {[
                { t: 'Разбит экран', w: 'Redmi 12C #A83', s: 'review', time: '12 мин' },
                { t: 'Не вернул устройство', w: 'Realme C55 #B21', s: 'charged', time: '1 час' },
                { t: 'Утеря', w: 'iPhone 11 #C04', s: 'review', time: '3 часа' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < 2 ? `1px solid ${Tc.color.ink[100]}` : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: r.s === 'charged' ? Tc.color.warning.bg : Tc.color.info.bg, color: r.s === 'charged' ? Tc.color.warning.DEFAULT : Tc.color.info.DEFAULT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic name="alertTriangle" size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.t}</div>
                    <div style={{ fontSize: 12, color: Tc.color.ink[500], fontFamily: Tc.font.mono }}>{r.w}</div>
                  </div>
                  <span style={{ fontSize: 12, color: Tc.color.ink[500] }}>{r.time}</span>
                </div>
              ))}
            </div>
          </window.Card>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { PhoneFrame, ClientActiveRental, ClientMap, PartnerIssue, AdminDashboard });
