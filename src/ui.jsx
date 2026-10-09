import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, CircleAlert, CircleCheck, Copy, Eye, EyeOff, LoaderCircle, X } from 'lucide-react';

export const inputClass =
  'w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-base text-ink placeholder:text-mute/70 transition-colors ' +
  'focus:border-acc focus:outline-none focus:ring-4 focus:ring-acc-soft disabled:bg-mist disabled:text-mute';

const variants = {
  primary: 'bg-acc text-paper hover:bg-acc-hover focus-visible:ring-acc-soft',
  secondary: 'bg-card text-ink-soft border border-line hover:border-line-strong hover:bg-paper focus-visible:ring-mist',
  outline: 'bg-transparent text-acc border border-line hover:bg-acc-soft focus-visible:ring-acc-soft',
  ghost: 'text-ink-soft hover:bg-mist focus-visible:ring-mist',
  danger: 'bg-copper text-paper hover:brightness-90 focus-visible:ring-copper-soft',
  dangerQuiet: 'bg-transparent text-copper border border-line hover:bg-copper-soft focus-visible:ring-copper-soft',
};

export function Button({ variant = 'primary', icon: Icon, loading = false, className = '', children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4 shrink-0" strokeWidth={1.75} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex size-9 items-center justify-center rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-acc-soft ${className}`}
      {...props}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  );
}

export function Field({ label, hint, error, required, children, className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">
          {label}
          {required && <span className="text-copper"> *</span>}
        </label>
      )}
      {typeof children === 'function' ? children(id) : children}
      {error ? <p className="mt-1.5 text-sm text-copper">{error}</p> : hint && <p className="mt-1.5 text-xs leading-6 text-mute">{hint}</p>}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        dir="ltr"
        className={`${inputClass} pe-11 text-left`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-mute transition-colors hover:text-ink"
        aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
      >
        {visible ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
      </button>
    </div>
  );
}

export function Alert({ tone = 'error', children, className = '' }) {
  const tones = {
    error: 'bg-copper-soft text-copper',
    success: 'bg-acc-soft text-acc',
    info: 'bg-mist text-ink-soft',
    warning: 'bg-amber-soft text-amber',
  };
  const Icon = tone === 'success' ? CircleCheck : CircleAlert;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`fade flex gap-2.5 rounded-lg p-3.5 text-sm leading-7 ${tones[tone]} ${className}`}>
      <Icon className="mt-1.5 size-4 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Tag({ tone = 'grey', children, className = '' }) {
  const tones = {
    grey: 'bg-mist text-ink-soft',
    acc: 'bg-acc-soft text-acc',
    amber: 'bg-amber-soft text-amber',
    copper: 'bg-copper-soft text-copper',
  };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>{children}</span>;
}

export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-xl border border-line bg-card ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
        <span className="mt-3 block h-0.5 w-10 rounded-full bg-gold" aria-hidden="true" />
        {subtitle && <p className="mt-3 text-sm text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// إفصاح تدريجي: يُظهر المحتوى عند الحاجة فقط
export function Disclosure({ title, hint, defaultOpen = false, children, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right"
      >
        <span>
          <span className="block font-semibold text-ink">{title}</span>
          {hint && <span className="mt-0.5 block text-sm text-mute">{hint}</span>}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-mute transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>
      {open && <div className="fade border-t border-line px-5 py-5">{children}</div>}
    </Card>
  );
}

export function Spinner({ className = 'size-6' }) {
  return <LoaderCircle className={`animate-spin text-acc ${className}`} strokeWidth={1.75} />;
}

export function FullScreenLoader({ label = 'جاري التحميل…' }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-sm text-mute">
      <Spinner className="size-6" />
      <p>{label}</p>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  // تُرسم النافذة في جسم الصفحة مباشرة حتى لا تحصرها أي حاوية متحركة
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fade flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-paper sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {onClose && <IconButton icon={X} label="إغلاق" onClick={onClose} className="text-mute hover:bg-mist hover:text-ink" />}
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap gap-2 border-t border-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function CopyButton({ text, label = 'نسخ', copiedLabel = 'تم النسخ', variant = 'secondary', className = '' }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    const value = typeof text === 'function' ? text() : text;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant={variant} icon={copied ? Check : Copy} onClick={copy} className={className}>
      {copied ? copiedLabel : label}
    </Button>
  );
}

// ===== التنبيهات المنبثقة =====
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)] sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`fade pointer-events-auto flex max-w-md items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${t.tone === 'error' ? 'bg-copper text-paper' : 'bg-ink text-paper'}`}
          >
            {t.tone === 'error' ? <CircleAlert className="size-4 shrink-0" strokeWidth={1.75} /> : <CircleCheck className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ===== نافذة التأكيد =====
const ConfirmContext = createContext(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((options) => new Promise((resolve) => setState({ ...options, resolve })), []);
  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        title={state?.title || 'تأكيد'}
        onClose={() => close(false)}
        footer={
          <>
            <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)} className="flex-1">
              {state?.confirmLabel || 'تأكيد'}
            </Button>
            <Button variant="secondary" onClick={() => close(false)} className="flex-1">
              إلغاء
            </Button>
          </>
        }
      >
        <p className="leading-8 text-ink-soft">{state?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}
