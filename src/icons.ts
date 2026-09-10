/** SVG icon builders for board nodes — cartoon style */

export function deskPcSvg(accent = '#64748b'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90" viewBox="0 0 120 90">
    <rect x="10" y="52" width="100" height="12" rx="3" fill="${accent}"/>
    <rect x="18" y="64" width="8" height="16" rx="2" fill="#475569"/>
    <rect x="94" y="64" width="8" height="16" rx="2" fill="#475569"/>
    <rect x="34" y="14" width="52" height="36" rx="4" fill="#0f172a"/>
    <rect x="38" y="18" width="44" height="28" rx="2" fill="#134e4a"/>
    <rect x="56" y="50" width="8" height="4" fill="#475569"/>
  </svg>`
}

export function personSvg(gender: 'male' | 'female'): string {
  const hair = gender === 'female' ? '#f472b6' : '#334155'
  const shirt = gender === 'female' ? '#fda4af' : '#38bdf8'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="72" viewBox="0 0 64 72">
    <circle cx="32" cy="22" r="14" fill="#fde68a"/>
    <path d="M18 18 Q32 6 46 18" fill="${hair}"/>
    <circle cx="26" cy="22" r="2" fill="#0f172a"/>
    <circle cx="38" cy="22" r="2" fill="#0f172a"/>
    <path d="M27 28 Q32 32 37 28" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="20" y="38" width="24" height="26" rx="8" fill="${shirt}"/>
  </svg>`
}

export function robotSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="84" viewBox="0 0 72 84">
    <rect x="16" y="20" width="40" height="36" rx="10" fill="#2dd4bf"/>
    <rect x="22" y="28" width="28" height="16" rx="4" fill="#0f172a"/>
    <circle cx="30" cy="36" r="3" fill="#67e8f9"/>
    <circle cx="42" cy="36" r="3" fill="#67e8f9"/>
    <rect x="28" y="48" width="16" height="4" rx="2" fill="#0f766e"/>
    <rect x="30" y="8" width="12" height="10" rx="3" fill="#99f6e4"/>
    <circle cx="36" cy="8" r="3" fill="#f43f5e"/>
    <rect x="12" y="56" width="48" height="20" rx="8" fill="#ccfbf1"/>
    <rect x="8" y="30" width="8" height="18" rx="3" fill="#5eead4"/>
    <rect x="56" y="30" width="8" height="18" rx="3" fill="#5eead4"/>
  </svg>`
}

export function frontBadgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <rect width="28" height="28" rx="8" fill="#0f766e"/>
    <text x="14" y="19" text-anchor="middle" font-size="14" font-weight="700" fill="#ecfdf5">前</text>
  </svg>`
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
