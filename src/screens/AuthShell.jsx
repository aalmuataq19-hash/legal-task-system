import { Scale } from 'lucide-react';

export function OfficeMark({ settings, className = 'size-20' }) {
  if (settings?.logo) {
    return <img src={settings.logo} alt="شعار المكتب" className={`${className} rounded-2xl bg-white object-contain p-1.5 shadow-lg`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg`}>
      <Scale className="size-1/2 text-white" />
    </div>
  );
}

export default function AuthShell({ settings, title, subtitle, children, wide = false }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-10">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <OfficeMark settings={settings} />
          <h1 className="mt-4 text-2xl font-extrabold text-white">{settings?.office_name || 'نظام إدارة المهام القانونية'}</h1>
          {subtitle && <p className="mt-1 text-indigo-200">{subtitle}</p>}
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          {title && <h2 className="mb-5 text-xl font-bold text-slate-800">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}
