// Base UI components — Делифон design system.
// All exported to window for cross-script access.

const T = window.DelifonTokens;
const Ico = window.Icon;

// ---------- BUTTON ----------
const Button = ({
  children, variant = 'primary', size = 'md', icon, iconRight,
  disabled, loading, onClick, style = {}, fullWidth, type = 'button',
  ariaLabel,
}) => {
  const sizes = {
    sm: { h: 36, px: 14, fs: 13, gap: 6, r: 999, icon: 16 },
    md: { h: 44, px: 18, fs: 15, gap: 8, r: 999, icon: 18 },
    lg: { h: 56, px: 24, fs: 17, gap: 10, r: 999, icon: 20 },
  };
  const s = sizes[size];

  const variants = {
    primary:   { bg: T.color.accent.DEFAULT, color: T.color.accent.ink, border: 'transparent', shadow: T.shadow[1] },
    secondary: { bg: T.color.ink[900], color: '#fff', border: 'transparent', shadow: T.shadow[1] },
    ghost:     { bg: 'transparent', color: T.color.ink[900], border: T.color.ink[200], shadow: 'none' },
    destructive: { bg: T.color.danger.DEFAULT, color: '#fff', border: 'transparent', shadow: T.shadow[1] },
    link:      { bg: 'transparent', color: T.color.ink[900], border: 'transparent', shadow: 'none' },
  };
  const v = variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className="delifon-btn"
      style={{
        height: s.h,
        padding: variant === 'link' ? 0 : `0 ${s.px}px`,
        fontSize: s.fs,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        background: v.bg,
        color: v.color,
        border: `1.5px solid ${v.border === 'transparent' ? 'transparent' : v.border}`,
        borderRadius: s.r,
        boxShadow: v.shadow,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        textDecoration: variant === 'link' ? 'underline' : 'none',
        textUnderlineOffset: 3,
        transition: `all ${T.motion.fast}`,
        width: fullWidth ? '100%' : 'auto',
        fontFamily: T.font.sans,
        ...style,
      }}
    >
      {loading && <Spinner size={s.icon} color={v.color} />}
      {!loading && icon && <Ico name={icon} size={s.icon} />}
      {children}
      {!loading && iconRight && <Ico name={iconRight} size={s.icon} />}
    </button>
  );
};

// ---------- SPINNER ----------
const Spinner = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'delifon-spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="3" opacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ---------- INPUT ----------
const Input = ({
  label, value, onChange, placeholder, type = 'text', icon, rightIcon,
  error, hint, disabled, suffix, prefix, id, autoFocus,
}) => {
  const inputId = id || `inp-${label?.replace(/\s/g, '-') || Math.random().toString(36).slice(2, 7)}`;
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={{
          fontSize: 13, fontWeight: 500, color: T.color.ink[700], letterSpacing: '0.01em',
        }}>{label}</label>
      )}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        height: 48, background: disabled ? T.color.ink[50] : '#fff',
        border: `1.5px solid ${error ? T.color.danger.DEFAULT : focused ? T.color.ink[900] : T.color.ink[200]}`,
        borderRadius: T.radius.md, padding: '0 14px', gap: 10,
        transition: `border-color ${T.motion.fast}`,
        boxShadow: focused && !error ? '0 0 0 4px rgba(15,15,14,0.06)' : 'none',
      }}>
        {icon && <Ico name={icon} size={18} color={T.color.ink[500]} />}
        {prefix && <span style={{ fontSize: 15, color: T.color.ink[500] }}>{prefix}</span>}
        <input
          id={inputId}
          type={type}
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 15, fontFamily: T.font.sans, color: T.color.ink[900],
            minWidth: 0,
          }}
        />
        {suffix && <span style={{ fontSize: 13, fontWeight: 500, color: T.color.ink[500] }}>{suffix}</span>}
        {rightIcon && <Ico name={rightIcon} size={18} color={T.color.ink[500]} />}
      </div>
      {(error || hint) && (
        <div style={{
          fontSize: 12, color: error ? T.color.danger.DEFAULT : T.color.ink[500],
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {error && <Ico name="alert" size={13} />}
          {error || hint}
        </div>
      )}
    </div>
  );
};

// ---------- TEXTAREA ----------
const Textarea = ({ label, value, onChange, placeholder, rows = 4, hint }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: T.color.ink[700] }}>{label}</label>}
      <textarea
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: 14,
          border: `1.5px solid ${focused ? T.color.ink[900] : T.color.ink[200]}`,
          borderRadius: T.radius.md, background: '#fff', outline: 'none', resize: 'vertical',
          fontSize: 15, fontFamily: T.font.sans, color: T.color.ink[900],
          transition: `border-color ${T.motion.fast}`,
        }}
      />
      {hint && <div style={{ fontSize: 12, color: T.color.ink[500] }}>{hint}</div>}
    </div>
  );
};

// ---------- CHECKBOX ----------
const Checkbox = ({ checked, onChange, label, disabled }) => (
  <label style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    fontSize: 15, color: T.color.ink[900], userSelect: 'none',
  }}>
    <span style={{
      width: 22, height: 22, borderRadius: 6,
      border: `1.5px solid ${checked ? T.color.ink[900] : T.color.ink[300]}`,
      background: checked ? T.color.ink[900] : '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transition: `all ${T.motion.fast}`, flexShrink: 0,
    }}>
      {checked && <Ico name="check" size={14} color={T.color.accent.DEFAULT} strokeWidth={3} />}
    </span>
    <input type="checkbox" checked={!!checked} onChange={e => onChange && onChange(e.target.checked)} disabled={disabled} style={{ display: 'none' }} />
    {label}
  </label>
);

// ---------- RADIO ----------
const Radio = ({ checked, onChange, label, disabled }) => (
  <label style={{
    display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 15, color: T.color.ink[900], userSelect: 'none', opacity: disabled ? 0.5 : 1,
  }}>
    <span style={{
      width: 22, height: 22, borderRadius: '50%',
      border: `1.5px solid ${checked ? T.color.ink[900] : T.color.ink[300]}`,
      background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: `all ${T.motion.fast}`,
    }}>
      {checked && <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.color.ink[900] }} />}
    </span>
    <input type="radio" checked={!!checked} onChange={() => onChange && onChange(true)} disabled={disabled} style={{ display: 'none' }} />
    {label}
  </label>
);

// ---------- SWITCH ----------
const Switch = ({ checked, onChange, label, disabled }) => (
  <label style={{
    display: 'inline-flex', alignItems: 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 15, color: T.color.ink[900], opacity: disabled ? 0.5 : 1, userSelect: 'none',
  }}>
    <span
      role="switch"
      aria-checked={!!checked}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 999,
        background: checked ? T.color.ink[900] : T.color.ink[300],
        position: 'relative', transition: `background ${T.motion.base}`, flexShrink: 0,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: checked ? T.color.accent.DEFAULT : '#fff',
        transition: `all ${T.motion.base}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </span>
    {label}
  </label>
);

// ---------- BADGE ----------
const Badge = ({ children, variant = 'neutral', icon, size = 'md' }) => {
  const variants = {
    neutral: { bg: T.color.ink[100], color: T.color.ink[800] },
    ink:     { bg: T.color.ink[900], color: '#fff' },
    accent:  { bg: T.color.accent.DEFAULT, color: T.color.accent.ink },
    soft:    { bg: T.color.accent.soft, color: T.color.ink[900] },
    success: { bg: T.color.success.bg, color: T.color.success.ink },
    warning: { bg: T.color.warning.bg, color: T.color.warning.ink },
    danger:  { bg: T.color.danger.bg, color: T.color.danger.ink },
    info:    { bg: T.color.info.bg, color: T.color.info.ink },
    outline: { bg: 'transparent', color: T.color.ink[700], border: `1px solid ${T.color.ink[200]}` },
  };
  const v = variants[variant];
  const sizes = { sm: { h: 22, fs: 11, px: 8, ico: 11 }, md: { h: 26, fs: 12, px: 10, ico: 13 }, lg: { h: 32, fs: 13, px: 12, ico: 15 } };
  const s = sizes[size];
  return (
    <span style={{
      height: s.h, padding: `0 ${s.px}px`, borderRadius: 999, background: v.bg, color: v.color,
      border: v.border || 'none', fontSize: s.fs, fontWeight: 600, letterSpacing: '0.02em',
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
    }}>
      {icon && <Ico name={icon} size={s.ico} />}
      {children}
    </span>
  );
};

// ---------- AVATAR ----------
const Avatar = ({ name, src, size = 40, bg }) => {
  const initials = (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg || T.color.ink[900], color: T.color.accent.DEFAULT,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, overflow: 'hidden', flexShrink: 0,
      backgroundImage: src ? `url(${src})` : undefined, backgroundSize: 'cover',
    }}>
      {!src && initials}
    </div>
  );
};

// ---------- CARD ----------
const Card = ({ children, variant = 'elevated', padding = 20, style = {}, onClick }) => {
  const variants = {
    elevated: { background: '#fff', border: `1px solid ${T.color.ink[100]}`, boxShadow: T.shadow[2] },
    outlined: { background: '#fff', border: `1.5px solid ${T.color.ink[200]}`, boxShadow: 'none' },
    filled:   { background: T.color.ink[50], border: '1px solid transparent', boxShadow: 'none' },
    ink:      { background: T.color.ink[900], border: 'none', color: '#fff', boxShadow: T.shadow[2] },
    accent:   { background: T.color.accent.DEFAULT, border: 'none', color: T.color.accent.ink, boxShadow: T.shadow[1] },
  };
  const v = variants[variant];
  return (
    <div onClick={onClick} style={{
      ...v, borderRadius: T.radius.xl, padding,
      cursor: onClick ? 'pointer' : 'default',
      transition: `transform ${T.motion.fast}`, ...style,
    }}>{children}</div>
  );
};

// ---------- ALERT ----------
const Alert = ({ variant = 'info', title, children, icon, onClose }) => {
  const variants = {
    info:    { bg: T.color.info.bg, ink: T.color.info.ink, icon: 'info' },
    success: { bg: T.color.success.bg, ink: T.color.success.ink, icon: 'checkCircle' },
    warning: { bg: T.color.warning.bg, ink: T.color.warning.ink, icon: 'alertTriangle' },
    danger:  { bg: T.color.danger.bg, ink: T.color.danger.ink, icon: 'alert' },
  };
  const v = variants[variant];
  return (
    <div role="alert" style={{
      background: v.bg, color: v.ink, padding: 16, borderRadius: T.radius.lg,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <Ico name={icon || v.icon} size={20} color={v.ink} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 600, fontSize: 15, marginBottom: children ? 4 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.92 }}>{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: v.ink, padding: 4 }}>
          <Ico name="close" size={18} />
        </button>
      )}
    </div>
  );
};

// ---------- TAG / CHIP (pressable) ----------
const Chip = ({ children, selected, onClick, icon }) => (
  <button onClick={onClick} style={{
    height: 36, padding: '0 14px', borderRadius: 999,
    background: selected ? T.color.ink[900] : '#fff',
    color: selected ? '#fff' : T.color.ink[800],
    border: `1.5px solid ${selected ? T.color.ink[900] : T.color.ink[200]}`,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', gap: 6,
    display: 'inline-flex', alignItems: 'center', fontFamily: T.font.sans,
    transition: `all ${T.motion.fast}`, whiteSpace: 'nowrap',
  }}>
    {icon && <Ico name={icon} size={14} />}
    {children}
  </button>
);

// ---------- TABS ----------
const Tabs = ({ tabs, value, onChange, variant = 'pills' }) => {
  if (variant === 'pills') {
    return (
      <div style={{
        display: 'inline-flex', padding: 4, background: T.color.ink[100],
        borderRadius: 999, gap: 2,
      }}>
        {tabs.map(t => {
          const active = value === t.value;
          return (
            <button key={t.value} onClick={() => onChange(t.value)} style={{
              height: 36, padding: '0 14px', borderRadius: 999, border: 'none',
              background: active ? '#fff' : 'transparent',
              color: active ? T.color.ink[900] : T.color.ink[600],
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font.sans,
              boxShadow: active ? T.shadow[1] : 'none', transition: `all ${T.motion.fast}`,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {t.icon && <Ico name={t.icon} size={14} />}
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }
  // underline
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${T.color.ink[200]}`, gap: 24 }}>
      {tabs.map(t => {
        const active = value === t.value;
        return (
          <button key={t.value} onClick={() => onChange(t.value)} style={{
            padding: '12px 0', border: 'none', background: 'transparent',
            color: active ? T.color.ink[900] : T.color.ink[500],
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: T.font.sans,
            borderBottom: active ? `2px solid ${T.color.ink[900]}` : '2px solid transparent',
            marginBottom: -1, transition: `all ${T.motion.fast}`,
          }}>{t.label}</button>
        );
      })}
    </div>
  );
};

// ---------- PROGRESS ----------
const Progress = ({ value = 0, label, variant = 'accent' }) => {
  const colors = { accent: T.color.accent.DEFAULT, ink: T.color.ink[900], danger: T.color.danger.DEFAULT };
  return (
    <div style={{ width: '100%' }}>
      {label && <div style={{ fontSize: 13, color: T.color.ink[600], marginBottom: 6, fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span>{value}%</span>
      </div>}
      <div style={{ height: 8, background: T.color.ink[100], borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: colors[variant], borderRadius: 999, transition: `width ${T.motion.base}` }} />
      </div>
    </div>
  );
};

const CircularProgress = ({ value = 0, size = 64, stroke = 6, label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={T.color.ink[100]} strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={T.color.ink[900]} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} strokeLinecap="round"
          style={{ transition: `stroke-dashoffset ${T.motion.slow}` }} />
      </svg>
      <div style={{ position: 'absolute', fontWeight: 700, fontSize: size * 0.25, color: T.color.ink[900] }}>{label ?? `${value}%`}</div>
    </div>
  );
};

// ---------- SKELETON ----------
const Skeleton = ({ width = '100%', height = 16, radius = 8, style = {} }) => (
  <div style={{
    width, height, borderRadius: radius,
    background: `linear-gradient(90deg, ${T.color.ink[100]} 0%, ${T.color.ink[50]} 50%, ${T.color.ink[100]} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'delifon-skeleton 1.4s ease-in-out infinite',
    ...style,
  }} />
);

// ---------- DIVIDER ----------
const Divider = ({ label, margin = 16 }) => {
  if (!label) return <div style={{ height: 1, background: T.color.ink[100], margin: `${margin}px 0` }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: `${margin}px 0` }}>
      <div style={{ flex: 1, height: 1, background: T.color.ink[100] }} />
      <span style={{ fontSize: 12, color: T.color.ink[500], letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: T.color.ink[100] }} />
    </div>
  );
};

// ---------- TOOLTIP (static demo) ----------
const Tooltip = ({ children, label }) => {
  const [show, setShow] = React.useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          background: T.color.ink[900], color: '#fff', padding: '6px 10px', borderRadius: 8,
          fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
        }}>{label}</span>
      )}
    </span>
  );
};

// ---------- MODAL / BOTTOMSHEET ----------
const Modal = ({ open, onClose, title, children, footer, mobile }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,15,14,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: mobile ? 'flex-end' : 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff',
        borderRadius: mobile ? `${T.radius['2xl']}px ${T.radius['2xl']}px 0 0` : T.radius['2xl'],
        width: '100%', maxWidth: mobile ? '100%' : 420,
        boxShadow: T.shadow[4],
        animation: `delifon-${mobile ? 'slideup' : 'popin'} ${T.motion.spring}`,
      }}>
        {mobile && <div style={{ width: 44, height: 4, background: T.color.ink[200], borderRadius: 999, margin: '10px auto 0' }} />}
        {title && <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Ico name="close" size={20} color={T.color.ink[600]} />
          </button>
        </div>}
        <div style={{ padding: '16px 24px 24px' }}>{children}</div>
        {footer && <div style={{ padding: '0 24px 24px', display: 'flex', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
};

// ---------- EMPTY STATE ----------
const EmptyState = ({ icon, title, description, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 24px', textAlign: 'center', gap: 12,
  }}>
    {icon && (
      <div style={{
        width: 64, height: 64, borderRadius: T.radius.xl,
        background: T.color.ink[100], display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: 4,
      }}>
        <Ico name={icon} size={28} color={T.color.ink[600]} />
      </div>
    )}
    <div style={{ fontSize: 18, fontWeight: 700, color: T.color.ink[900], letterSpacing: '-0.01em' }}>{title}</div>
    {description && <div style={{ fontSize: 14, color: T.color.ink[500], maxWidth: 300, lineHeight: 1.4 }}>{description}</div>}
    {action && <div style={{ marginTop: 8 }}>{action}</div>}
  </div>
);

// ---------- TOAST ----------
const Toast = ({ variant = 'info', title, description, icon }) => {
  const variants = {
    info:    { bg: T.color.ink[900], fg: '#fff', ic: 'info' },
    success: { bg: T.color.ink[900], fg: '#fff', accent: T.color.accent.DEFAULT, ic: 'checkCircle' },
    danger:  { bg: T.color.danger.DEFAULT, fg: '#fff', ic: 'alert' },
  };
  const v = variants[variant];
  return (
    <div style={{
      background: v.bg, color: v.fg, padding: '14px 16px', borderRadius: T.radius.lg,
      display: 'flex', gap: 12, alignItems: 'center', boxShadow: T.shadow[3],
      minWidth: 280, maxWidth: 380,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: variant === 'success' ? T.color.accent.DEFAULT : 'rgba(255,255,255,0.1)',
        color: variant === 'success' ? T.color.accent.ink : v.fg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Ico name={icon || v.ic} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        {description && <div style={{ fontSize: 12.5, opacity: 0.7, marginTop: 2 }}>{description}</div>}
      </div>
    </div>
  );
};

// ---------- SELECT ----------
const Select = ({ label, value, options, onChange, placeholder = 'Выбрать', hint }) => {
  const [open, setOpen] = React.useState(false);
  const selected = options?.find(o => o.value === value);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: T.color.ink[700], display: 'block', marginBottom: 6 }}>{label}</label>}
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', height: 48, padding: '0 14px', background: '#fff',
        border: `1.5px solid ${open ? T.color.ink[900] : T.color.ink[200]}`,
        borderRadius: T.radius.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 15, color: selected ? T.color.ink[900] : T.color.ink[500], cursor: 'pointer',
        fontFamily: T.font.sans,
      }}>
        <span>{selected?.label || placeholder}</span>
        <Ico name="chevronDown" size={18} color={T.color.ink[500]} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', borderRadius: T.radius.md, boxShadow: T.shadow[3],
          padding: 4, zIndex: 30, border: `1px solid ${T.color.ink[100]}`,
        }}>
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange && onChange(o.value); setOpen(false); }} style={{
              width: '100%', padding: '10px 12px', border: 'none', background: value === o.value ? T.color.ink[100] : 'transparent',
              borderRadius: T.radius.sm, textAlign: 'left', cursor: 'pointer', fontSize: 15, fontFamily: T.font.sans,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{o.label}</span>
              {value === o.value && <Ico name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
      {hint && <div style={{ fontSize: 12, color: T.color.ink[500], marginTop: 6 }}>{hint}</div>}
    </div>
  );
};

Object.assign(window, {
  Button, Spinner, Input, Textarea, Checkbox, Radio, Switch,
  Badge, Avatar, Card, Alert, Chip, Tabs, Progress, CircularProgress,
  Skeleton, Divider, Tooltip, Modal, EmptyState, Toast, Select,
});
