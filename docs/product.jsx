// Product-specific components for Делифон
const Tp = window.DelifonTokens;
const Ip = window.Icon;

// ---------- STATUS BAR (phone frame) ----------
const StatusBar = ({ time = '14:32', color = '#fff' }) => (
  <div style={{
    height: 44, padding: '0 24px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color,
    fontFamily: Tp.font.sans,
  }}>
    <span>{time}</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <window.Icon name="signal" size={15} color={color} />
      <window.Icon name="wifi" size={15} color={color} />
      <window.Icon name="battery" size={18} color={color} />
    </span>
  </div>
);

// ---------- SCREEN HEADER ----------
const ScreenHeader = ({ title, back, action, subtitle, onBack, onAction }) => (
  <div style={{
    display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 8, minHeight: 56,
  }}>
    {back !== false && (
      <button onClick={onBack} aria-label="Назад" style={{
        width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${Tp.color.ink[200]}`,
        background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Ip name="chevronLeft" size={18} />
      </button>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: Tp.color.ink[500], marginTop: 1 }}>{subtitle}</div>}
    </div>
    {action && (
      <button onClick={onAction} style={{
        width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${Tp.color.ink[200]}`,
        background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ip name={action} size={18} />
      </button>
    )}
  </div>
);

// ---------- BOTTOM NAV ----------
const BottomNav = ({ items, value, onChange }) => (
  <div style={{
    display: 'flex', background: '#fff', borderTop: `1px solid ${Tp.color.ink[100]}`,
    padding: '8px 8px 22px',
  }}>
    {items.map(it => {
      const active = value === it.value;
      return (
        <button key={it.value} onClick={() => onChange(it.value)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer',
          color: active ? Tp.color.ink[900] : Tp.color.ink[500],
        }}>
          <div style={{ position: 'relative' }}>
            <Ip name={it.icon} size={22} strokeWidth={active ? 2.4 : 2} />
            {it.badge && <span style={{
              position: 'absolute', top: -2, right: -6, background: Tp.color.danger.DEFAULT,
              color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999,
              minWidth: 16, height: 16, padding: '0 4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{it.badge}</span>}
          </div>
          <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{it.label}</span>
        </button>
      );
    })}
  </div>
);

// ---------- IMAGE PLACEHOLDER ----------
const ImagePlaceholder = ({ label, width = '100%', height = 120, radius = Tp.radius.lg }) => (
  <div style={{
    width, height, borderRadius: radius,
    backgroundColor: Tp.color.ink[100],
    backgroundImage: `repeating-linear-gradient(135deg, ${Tp.color.ink[200]} 0, ${Tp.color.ink[200]} 1px, transparent 1px, transparent 12px)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: Tp.color.ink[500], fontFamily: Tp.font.mono, fontSize: 11,
    letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center',
  }}>{label || 'IMAGE'}</div>
);

// ---------- MAP CARD (точка проката) ----------
const MapCard = ({ name, address, distance, available, total, rating, open, image }) => (
  <window.Card padding={0} style={{ overflow: 'hidden' }}>
    <div style={{ position: 'relative' }}>
      <ImagePlaceholder label="point photo" height={140} radius={0} />
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
        <window.Badge variant={open ? 'ink' : 'danger'} icon={open ? 'clock' : 'close'}>
          {open ? 'Открыто' : 'Закрыто'}
        </window.Badge>
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12 }}>
        <window.Badge variant="soft" icon="star">{rating}</window.Badge>
      </div>
    </div>
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 13, color: Tp.color.ink[500], lineHeight: 1.3 }}>{address}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{distance}</div>
          <div style={{ fontSize: 11, color: Tp.color.ink[500], textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>отсюда</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${Tp.color.ink[100]}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex', padding: '4px 10px', borderRadius: 999,
            background: available > 0 ? Tp.color.accent.DEFAULT : Tp.color.ink[100],
            color: available > 0 ? Tp.color.accent.ink : Tp.color.ink[600],
            fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          }}>
            {available}/{total}
          </div>
          <span style={{ fontSize: 13, color: Tp.color.ink[600] }}>в наличии</span>
        </div>
        <window.Button size="sm" variant={available > 0 ? 'primary' : 'ghost'} disabled={available === 0}>
          {available > 0 ? 'Забронировать' : 'Нет устройств'}
        </window.Button>
      </div>
    </div>
  </window.Card>
);

// ---------- DEVICE CARD ----------
const DeviceCard = ({ model, storage, rate, status, battery, id }) => {
  const statusMap = {
    free:     { label: 'Свободен',  variant: 'accent' },
    rented:   { label: 'В аренде',  variant: 'ink' },
    transit:  { label: 'В пути',    variant: 'info' },
    service:  { label: 'На сервисе', variant: 'warning' },
  };
  const st = statusMap[status];
  return (
    <window.Card padding={16} variant="outlined">
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{
          width: 64, height: 84, borderRadius: Tp.radius.md, background: Tp.color.ink[900],
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          position: 'relative',
        }}>
          <Ip name="phone" size={34} color={Tp.color.accent.DEFAULT} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em' }}>{model}</div>
              <div style={{ fontSize: 12, color: Tp.color.ink[500], fontFamily: Tp.font.mono, marginTop: 2 }}>#{id} · {storage}</div>
            </div>
            <window.Badge variant={st.variant} size="sm">{st.label}</window.Badge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: Tp.color.ink[500], textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>тариф</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {rate}<span style={{ fontSize: 12, color: Tp.color.ink[500], fontWeight: 500 }}> ₽/сут</span>
              </div>
            </div>
            {battery !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: battery > 30 ? Tp.color.success.DEFAULT : Tp.color.warning.DEFAULT, fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                <Ip name="battery" size={16} /> {battery}%
              </div>
            )}
          </div>
        </div>
      </div>
    </window.Card>
  );
};

// ---------- RENTAL STATUS — главный блок активной аренды ----------
const RentalStatus = ({ model, days, dailyRate, nextCharge, onPay, onExtend, onReturn }) => (
  <div style={{
    background: Tp.color.ink[900], color: '#fff', borderRadius: Tp.radius.xl,
    padding: 20, position: 'relative', overflow: 'hidden',
    boxShadow: Tp.shadow[3],
  }}>
    {/* Accent glow */}
    <div style={{
      position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%',
      background: Tp.color.accent.DEFAULT, opacity: 0.18, filter: 'blur(24px)',
    }} />
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: Tp.color.accent.DEFAULT, fontWeight: 700 }}>Аренда активна</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>{model}</div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ip name="phone" size={22} color={Tp.color.accent.DEFAULT} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>В аренде</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {days}<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}> {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span>
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Тариф</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {dailyRate}<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}> ₽/сут</span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.06)',
        borderRadius: Tp.radius.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Следующее списание</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{nextCharge}</div>
        </div>
        <Ip name="clock" size={20} color="rgba(255,255,255,0.5)" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <window.Button variant="primary" size="md" fullWidth onClick={onExtend} icon="plus">Продлить</window.Button>
        <window.Button variant="ghost" size="md" fullWidth onClick={onReturn} style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff' }}>
          Сдать
        </window.Button>
      </div>
    </div>
  </div>
);

// ---------- PAYMENT METHOD ----------
const PaymentMethodCard = ({ brand = 'MIR', last4, primary, expiry }) => (
  <window.Card padding={16} variant="outlined">
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 48, height: 32, borderRadius: 6,
        background: Tp.color.ink[900], color: Tp.color.accent.DEFAULT,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', fontFamily: Tp.font.mono, flexShrink: 0,
      }}>{brand}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, fontFamily: Tp.font.mono, letterSpacing: '0.1em' }}>•••• {last4}</div>
        <div style={{ fontSize: 12, color: Tp.color.ink[500], marginTop: 2 }}>до {expiry}</div>
      </div>
      {primary && <window.Badge variant="soft">Основная</window.Badge>}
    </div>
  </window.Card>
);

// ---------- STEP INDICATOR ----------
const StepIndicator = ({ steps, current }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: done ? Tp.color.ink[900] : active ? Tp.color.accent.DEFAULT : Tp.color.ink[100],
              color: done ? Tp.color.accent.DEFAULT : active ? Tp.color.accent.ink : Tp.color.ink[500],
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, transition: `all ${Tp.motion.base}`,
            }}>
              {done ? <Ip name="check" size={14} strokeWidth={3} /> : i + 1}
            </div>
            <div style={{
              fontSize: 11, fontWeight: active ? 700 : 500,
              color: active ? Tp.color.ink[900] : Tp.color.ink[500],
              whiteSpace: 'nowrap',
            }}>{s}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: done ? Tp.color.ink[900] : Tp.color.ink[100], marginBottom: 22, borderRadius: 999, transition: `background ${Tp.motion.base}` }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ---------- QR DISPLAY ----------
const QRDisplay = ({ value = 'DLF-7K3P-QN82', hint }) => {
  // Random-looking QR pattern (decorative).
  const cells = React.useMemo(() => {
    const seed = (value || '').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    let x = seed;
    const rnd = () => { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return (x >>> 0) % 100; };
    const out = [];
    for (let i = 0; i < 21 * 21; i++) out.push(rnd() < 50);
    return out;
  }, [value]);

  const renderFinder = (x, y) => (
    <g transform={`translate(${x}, ${y})`}>
      <rect width="7" height="7" fill={Tp.color.ink[900]} />
      <rect x="1" y="1" width="5" height="5" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" fill={Tp.color.ink[900]} />
    </g>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        background: '#fff', padding: 18, borderRadius: Tp.radius.xl,
        border: `1.5px solid ${Tp.color.ink[100]}`, boxShadow: Tp.shadow[2],
      }}>
        <svg width={220} height={220} viewBox="0 0 21 21" shapeRendering="crispEdges">
          <rect width="21" height="21" fill="#fff" />
          {cells.map((on, idx) => {
            const cx = idx % 21, cy = Math.floor(idx / 21);
            const inFinder =
              (cx < 7 && cy < 7) || (cx > 13 && cy < 7) || (cx < 7 && cy > 13);
            if (!on || inFinder) return null;
            return <rect key={idx} x={cx} y={cy} width="1" height="1" fill={Tp.color.ink[900]} />;
          })}
          {renderFinder(0, 0)}
          {renderFinder(14, 0)}
          {renderFinder(0, 14)}
        </svg>
      </div>
      <div style={{ fontFamily: Tp.font.mono, fontSize: 14, fontWeight: 600, letterSpacing: '0.1em' }}>{value}</div>
      {hint && <div style={{ fontSize: 13, color: Tp.color.ink[500], textAlign: 'center', maxWidth: 280 }}>{hint}</div>}
    </div>
  );
};

// ---------- QR SCANNER FRAME ----------
const QRScanner = ({ hint = 'Наведи камеру на QR устройства' }) => (
  <div style={{
    position: 'relative', width: '100%', aspectRatio: '1',
    background: Tp.color.ink[900], borderRadius: Tp.radius.xl, overflow: 'hidden',
  }}>
    {/* fake camera noise */}
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(circle at 30% 40%, ${Tp.color.ink[700]} 0%, ${Tp.color.ink[900]} 60%)`,
    }} />
    {/* viewfinder */}
    <div style={{
      position: 'absolute', inset: '15%', borderRadius: Tp.radius.lg,
    }}>
      {['tl', 'tr', 'bl', 'br'].map(c => (
        <span key={c} style={{
          position: 'absolute', width: 32, height: 32,
          borderTop: c[0] === 't' ? `3px solid ${Tp.color.accent.DEFAULT}` : 'none',
          borderBottom: c[0] === 'b' ? `3px solid ${Tp.color.accent.DEFAULT}` : 'none',
          borderLeft: c[1] === 'l' ? `3px solid ${Tp.color.accent.DEFAULT}` : 'none',
          borderRight: c[1] === 'r' ? `3px solid ${Tp.color.accent.DEFAULT}` : 'none',
          top: c[0] === 't' ? 0 : 'auto', bottom: c[0] === 'b' ? 0 : 'auto',
          left: c[1] === 'l' ? 0 : 'auto', right: c[1] === 'r' ? 0 : 'auto',
          borderRadius: c[1] === 'l' && c[0] === 't' ? '12px 0 0 0' :
                        c[1] === 'r' && c[0] === 't' ? '0 12px 0 0' :
                        c[1] === 'l' && c[0] === 'b' ? '0 0 0 12px' : '0 0 12px 0',
        }} />
      ))}
      {/* scan line */}
      <div style={{
        position: 'absolute', left: 12, right: 12, height: 2,
        background: Tp.color.accent.DEFAULT, boxShadow: `0 0 16px ${Tp.color.accent.DEFAULT}`,
        animation: 'delifon-scan 2s ease-in-out infinite',
      }} />
    </div>
    <div style={{
      position: 'absolute', bottom: 20, left: 20, right: 20, textAlign: 'center',
      color: '#fff', fontSize: 14, fontWeight: 500,
      background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: 999,
      backdropFilter: 'blur(8px)',
    }}>{hint}</div>
  </div>
);

// ---------- PHOTO CAPTURE ----------
const PhotoCapture = ({ label = 'Фото паспорта', quality = 'Хорошо' }) => (
  <div style={{
    width: '100%', aspectRatio: '1.6', background: Tp.color.ink[900], borderRadius: Tp.radius.xl,
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', inset: '10%', border: `2px dashed ${Tp.color.accent.DEFAULT}`,
      borderRadius: Tp.radius.md,
    }} />
    <div style={{
      position: 'absolute', top: 14, left: 14, padding: '6px 10px',
      background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 600,
      backdropFilter: 'blur(8px)',
    }}>{label}</div>
    <div style={{
      position: 'absolute', bottom: 14, left: 14, right: 14, padding: '8px 12px',
      background: 'rgba(0,0,0,0.5)', borderRadius: 999, fontSize: 12, color: '#fff',
      display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)',
    }}>
      <Ip name="checkCircle" size={14} color={Tp.color.accent.DEFAULT} /> Качество: {quality}
    </div>
  </div>
);

// ---------- SIGNATURE CAPTURE ----------
const SignatureCapture = () => (
  <div style={{
    border: `1.5px dashed ${Tp.color.ink[300]}`, borderRadius: Tp.radius.lg,
    padding: 16, background: '#fff',
  }}>
    <div style={{ height: 120, position: 'relative', borderBottom: `1px solid ${Tp.color.ink[200]}` }}>
      <svg viewBox="0 0 300 100" width="100%" height="100%" preserveAspectRatio="none">
        <path d="M10 70 Q 30 20, 60 50 T 110 60 Q 140 30, 170 70 T 220 50 Q 250 20, 290 60"
              fill="none" stroke={Tp.color.ink[900]} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
      <div style={{ fontSize: 12, color: Tp.color.ink[500] }}>Подпишись пальцем выше</div>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: Tp.color.ink[600], fontSize: 13, fontWeight: 600 }}>
        Стереть
      </button>
    </div>
  </div>
);

// ---------- INCIDENT CARD ----------
const IncidentCard = ({ type, status, amount, description, time }) => {
  const statusMap = {
    review:   { label: 'На проверке', variant: 'info' },
    charged:  { label: 'Удержано',    variant: 'warning' },
    resolved: { label: 'Решено',      variant: 'success' },
  };
  const st = statusMap[status];
  return (
    <window.Card padding={16} variant="outlined">
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: Tp.radius.md, background: Tp.color.danger.bg,
          color: Tp.color.danger.DEFAULT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Ip name="alertTriangle" size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{type}</div>
            <window.Badge variant={st.variant} size="sm">{st.label}</window.Badge>
          </div>
          <div style={{ fontSize: 13, color: Tp.color.ink[600], marginTop: 4, lineHeight: 1.4 }}>{description}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${Tp.color.ink[100]}` }}>
            <div style={{ fontSize: 12, color: Tp.color.ink[500] }}>{time}</div>
            {amount && <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{amount} ₽</div>}
          </div>
        </div>
      </div>
    </window.Card>
  );
};

// ---------- BALANCE CARD ----------
const BalanceCard = ({ amount, debt, onPay }) => (
  <div style={{
    background: debt ? Tp.color.ink[900] : Tp.color.accent.DEFAULT,
    color: debt ? '#fff' : Tp.color.accent.ink,
    padding: 20, borderRadius: Tp.radius.xl, position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, opacity: debt ? 0.7 : 0.8 }}>
      {debt ? 'Задолженность' : 'Баланс'}
    </div>
    <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 6, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
      {amount}<span style={{ fontSize: 22, opacity: 0.6 }}> ₽</span>
    </div>
    {debt && (
      <div style={{ marginTop: 16 }}>
        <window.Button variant="primary" size="md" fullWidth onClick={onPay} icon="ruble">
          Оплатить сейчас
        </window.Button>
      </div>
    )}
  </div>
);

// ---------- CHAT BUBBLE ----------
const ChatBubble = ({ from = 'user', children, time, name }) => {
  const styles = {
    user:    { bg: Tp.color.ink[900], color: '#fff', side: 'flex-end', radius: '20px 20px 4px 20px' },
    support: { bg: Tp.color.ink[100], color: Tp.color.ink[900], side: 'flex-start', radius: '20px 20px 20px 4px' },
    system:  { bg: 'transparent', color: Tp.color.ink[500], side: 'center', radius: 0 },
  };
  const s = styles[from];
  if (from === 'system') return (
    <div style={{ textAlign: 'center', fontSize: 12, color: s.color, padding: '8px 0' }}>{children}</div>
  );
  return (
    <div style={{ display: 'flex', justifyContent: s.side, marginBottom: 6 }}>
      <div style={{ maxWidth: '78%' }}>
        {name && <div style={{ fontSize: 11, color: Tp.color.ink[500], marginBottom: 2, marginLeft: 10 }}>{name}</div>}
        <div style={{
          background: s.bg, color: s.color, padding: '10px 14px', borderRadius: s.radius,
          fontSize: 14, lineHeight: 1.35,
        }}>{children}</div>
        {time && <div style={{ fontSize: 10, color: Tp.color.ink[400], marginTop: 3, textAlign: from === 'user' ? 'right' : 'left', padding: '0 10px' }}>{time}</div>}
      </div>
    </div>
  );
};

// ---------- NOTIFICATION ITEM ----------
const NotificationItem = ({ icon = 'bell', title, description, time, unread, variant = 'neutral' }) => {
  const variants = {
    neutral: { bg: Tp.color.ink[100], color: Tp.color.ink[700] },
    accent:  { bg: Tp.color.accent.DEFAULT, color: Tp.color.accent.ink },
    success: { bg: Tp.color.success.bg, color: Tp.color.success.DEFAULT },
    warning: { bg: Tp.color.warning.bg, color: Tp.color.warning.DEFAULT },
    danger:  { bg: Tp.color.danger.bg, color: Tp.color.danger.DEFAULT },
  };
  const v = variants[variant];
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: unread ? Tp.color.ink[50] : 'transparent', borderRadius: Tp.radius.md }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: v.bg, color: v.color,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Ip name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: Tp.color.ink[900] }}>{title}</div>
        <div style={{ fontSize: 13, color: Tp.color.ink[600], marginTop: 2, lineHeight: 1.35 }}>{description}</div>
        <div style={{ fontSize: 11, color: Tp.color.ink[500], marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{time}</div>
      </div>
      {unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: Tp.color.accent.DEFAULT, marginTop: 6, flexShrink: 0 }} />}
    </div>
  );
};

// ---------- MONEY DISPLAY ----------
const Money = ({ value, size = 'md', muted }) => {
  const [rub, kop] = String(value).split('.');
  const sizes = { sm: 16, md: 22, lg: 32, xl: 48 };
  const fs = sizes[size];
  return (
    <span style={{
      fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      color: muted ? Tp.color.ink[500] : Tp.color.ink[900],
      display: 'inline-flex', alignItems: 'baseline', gap: 2,
    }}>
      <span style={{ fontSize: fs, lineHeight: 1 }}>{rub}</span>
      {kop && <span style={{ fontSize: fs * 0.5, opacity: 0.5 }}>,{kop}</span>}
      <span style={{ fontSize: fs * 0.55, opacity: 0.5, marginLeft: 2 }}>₽</span>
    </span>
  );
};

Object.assign(window, {
  StatusBar, ScreenHeader, BottomNav, MapCard, DeviceCard, RentalStatus,
  PaymentMethodCard, StepIndicator, QRDisplay, QRScanner, PhotoCapture,
  SignatureCapture, IncidentCard, BalanceCard, ChatBubble, NotificationItem,
  ImagePlaceholder, Money,
});
