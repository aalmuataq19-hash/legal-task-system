import { BRAND, Emblem } from '../brand.jsx';

// رمز الشركة بالذهبي، أو شعار مرفوع من الإعدادات إن وُجد
const MARK_SIZES = {
  xl: { emblem: 'h-24', logo: 'size-24' },
  lg: { emblem: 'h-16', logo: 'size-16' },
  md: { emblem: 'h-9', logo: 'size-10' },
};

export function OfficeMark({ settings, size = 'lg' }) {
  const s = MARK_SIZES[size];
  if (settings?.logo) {
    return <img src={settings.logo} alt="شعار المكتب" className={`${s.logo} shrink-0 rounded-xl border border-line bg-card object-contain p-1`} />;
  }
  return <Emblem className={`${s.emblem} w-auto shrink-0 text-gold`} />;
}

export const officeName = (settings) => settings?.office_name || BRAND.name;

// أقواس متداخلة بخطوط ذهبية رفيعة جداً: إحساس معماري عربي حديث دون تشويش
export function ArchBackdrop({ className = '' }) {
  return (
    <svg viewBox="0 0 480 620" fill="none" className={className} aria-hidden="true">
      <path d="M40 620V250C40 130 140 40 240 18C340 40 440 130 440 250V620" stroke="currentColor" strokeWidth="1" />
      <path d="M88 620V262C88 168 164 96 240 76C316 96 392 168 392 262V620" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <path d="M136 620V276C136 206 190 152 240 138C290 152 344 206 344 276V620" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

export default function AuthShell({ settings, title, subtitle, children, wide = false }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-paper px-5 pb-12 pt-14 sm:pt-20">
      <ArchBackdrop className="pointer-events-none absolute left-1/2 top-0 h-[620px] w-[480px] max-w-[130vw] -translate-x-1/2 text-gold/25" />
      <div className={`fade relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <header className="mb-10 flex flex-col items-center text-center">
          <OfficeMark settings={settings} size="xl" />
          <h1 className="mt-7 text-[26px] font-bold leading-tight text-acc sm:text-3xl">{officeName(settings)}</h1>
          <span className="mt-4 block h-px w-16 bg-gold/70" aria-hidden="true" />
          <p className="mt-4 text-sm tracking-wide text-gold-deep">{subtitle || BRAND.tagline}</p>
        </header>
        <main className="rounded-2xl border border-line bg-card p-7 shadow-[0_1px_2px_rgba(24,32,47,0.03)] sm:p-9">
          {title && <h2 className="mb-7 text-xl font-bold text-ink">{title}</h2>}
          {children}
        </main>
        <p className="mt-10 text-center text-xs tracking-wide text-mute">نظام إدارة المهام القانونية</p>
      </div>
    </div>
  );
}
