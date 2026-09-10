/** SVG icon builders for Monday board — desks / people / files / agents */

export function deskPcSvg(accent = '#64748b'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90" viewBox="0 0 120 90">
    <rect x="8" y="50" width="104" height="14" rx="3" fill="${accent}"/>
    <rect x="16" y="64" width="8" height="16" rx="2" fill="#475569"/>
    <rect x="96" y="64" width="8" height="16" rx="2" fill="#475569"/>
    <rect x="32" y="10" width="56" height="40" rx="4" fill="#0f172a"/>
    <rect x="36" y="14" width="48" height="30" rx="2" fill="#134e4a"/>
    <rect x="40" y="18" width="18" height="12" rx="1" fill="#5eead4" opacity=".35"/>
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

export function robotSvg(accent = '#2dd4bf'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="84" viewBox="0 0 72 84">
    <rect x="16" y="20" width="40" height="36" rx="10" fill="${accent}"/>
    <rect x="22" y="28" width="28" height="16" rx="4" fill="#0f172a"/>
    <circle cx="30" cy="36" r="3" fill="#67e8f9">
      <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="42" cy="36" r="3" fill="#67e8f9">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="28" y="48" width="16" height="4" rx="2" fill="#0f172a" opacity=".5"/>
    <rect x="30" y="8" width="12" height="10" rx="3" fill="#e2e8f0"/>
    <circle cx="36" cy="8" r="3" fill="#f43f5e">
      <animate attributeName="r" values="2;3.5;2" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <rect x="12" y="56" width="48" height="20" rx="8" fill="#f1f5f9"/>
    <rect x="8" y="30" width="8" height="18" rx="3" fill="${accent}"/>
    <rect x="56" y="30" width="8" height="18" rx="3" fill="${accent}"/>
  </svg>`
}

export function frontBadgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <rect width="28" height="28" rx="8" fill="#0f766e"/>
    <text x="14" y="19" text-anchor="middle" font-size="14" font-weight="700" fill="#ecfdf5">接</text>
  </svg>`
}

/** File stack — height grows with count (0..8 capped visually) */
export function fileStackSvg(count: number, accent = '#f59e0b'): string {
  const n = Math.max(0, Math.min(8, count))
  const sheets: string[] = []
  for (let i = 0; i < n; i++) {
    const y = 36 - i * 4
    const wobble = (i % 2) * 2
    const fill = i % 2 ? '#fef3c7' : '#fff7ed'
    sheets.push(
      '<rect x="' +
        String(8 + wobble) +
        '" y="' +
        String(y) +
        '" width="28" height="8" rx="1.5" fill="' +
        fill +
        '" stroke="' +
        accent +
        '" stroke-width="1"/>',
    )
  }
  if (n === 0) {
    sheets.push(
      '<rect x="10" y="28" width="24" height="6" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 2"/>',
    )
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="48" viewBox="0 0 44 48">' +
    sheets.join('') +
    '<text x="22" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="' +
    accent +
    '">' +
    String(count) +
    '</text></svg>'
  )
}

/** Flying ticket packet for path animation */
export function ticketPacketSvg(color = '#14b8a6'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="22" viewBox="0 0 28 22">
    <rect x="1" y="3" width="26" height="16" rx="3" fill="${color}"/>
    <rect x="5" y="7" width="16" height="2" rx="1" fill="#fff" opacity=".85"/>
    <rect x="5" y="11" width="10" height="2" rx="1" fill="#fff" opacity=".55"/>
  </svg>`
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
