// هوية شركة عبدالمجيد صالح المعتق: الكحلي للتفاعل، والذهبي للمسات الهوية فقط
export const BRAND = {
  name: 'شركة عبدالمجيد صالح المعتق',
  tagline: 'محامون · مستشارون · محكمون · موثقون',
};

// رمز الشعار مرسوماً بخطوط هندسية مطابقة للأصل، فيبقى حاداً بأي حجم
export function Emblem({ className = '' }) {
  return (
    <svg viewBox="0 0 561 767" className={className} role="img" aria-label={BRAND.name}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0 0H193L280.5 87.5L368 0H561V486L486 561V78H403L343 141.5L406 204.5V640L280.5 766.5L155 640V204.5L218 141.5L158 78H75V561L0 486ZM280.5 205L322 244V601.5L280.5 643L239 601.5V244Z"
      />
    </svg>
  );
}
