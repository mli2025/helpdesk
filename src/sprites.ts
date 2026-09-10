/** Compact sprites for floor-plan nodes */

export function mondaySvg(mood: string): string {
  const face =
    mood === 'crazy'
      ? `<ellipse cx="38" cy="40" rx="4.2" ry="5.5"/><ellipse cx="62" cy="40" rx="4.2" ry="5.5"/>
         <path d="M40 58 Q50 48 60 58" fill="none" stroke="#9f1239" stroke-width="3" stroke-linecap="round"/>`
      : mood === 'busy'
        ? `<circle cx="38" cy="40" r="3.2"/><circle cx="62" cy="40" r="3.2"/>
           <path d="M42 56 Q50 62 58 56" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>`
        : `<circle cx="38" cy="40" r="3"/><circle cx="62" cy="40" r="3"/>
           <path d="M42 54 Q50 60 58 54" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>`

  return `
  <svg class="monday-svg mood-${mood}" viewBox="0 0 100 120" aria-hidden="true">
    <defs>
      <linearGradient id="monBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5eead4"/>
        <stop offset="100%" stop-color="#2dd4bf"/>
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="112" rx="28" ry="5" fill="rgba(15,23,42,.16)"/>
    <g class="body">
      <rect x="28" y="62" width="44" height="42" rx="14" fill="#f1f5f9"/>
      <rect x="34" y="70" width="32" height="8" rx="3" fill="#0f766e" opacity=".85"/>
      <circle cx="50" cy="42" r="28" fill="url(#monBody)"/>
      <g fill="#0f172a">${face}</g>
    </g>
  </svg>`
}

export function deskSvg(mood: string, index: number): string {
  return `
  <svg class="desk-svg mood-${mood}" viewBox="0 0 160 110" aria-hidden="true">
    <ellipse cx="80" cy="100" rx="54" ry="7" fill="rgba(15,23,42,.14)"/>
    <rect x="18" y="58" width="124" height="14" rx="4" fill="#94a3b8"/>
    <rect x="28" y="72" width="8" height="22" rx="2" fill="#64748b"/>
    <rect x="124" y="72" width="8" height="22" rx="2" fill="#64748b"/>
    <rect x="48" y="22" width="64" height="40" rx="4" fill="#0f172a"/>
    <rect class="screen" x="52" y="26" width="56" height="32" rx="2" fill="#134e4a"/>
    <g class="code-lines">
      <rect x="56" y="30" width="28" height="3" rx="1" fill="#5eead4" opacity=".85"/>
      <rect x="56" y="36" width="40" height="3" rx="1" fill="#99f6e4" opacity=".55"/>
      <rect x="56" y="42" width="22" height="3" rx="1" fill="#5eead4" opacity=".7"/>
    </g>
    <g class="worker">
      <circle cx="80" cy="70" r="10" fill="#5eead4"/>
      <rect x="70" y="78" width="20" height="14" rx="5" fill="#e2e8f0"/>
    </g>
    <g class="mail-stack">
      <rect x="118" y="46" width="18" height="12" rx="2" fill="#fde68a" transform="rotate(6 129 52)"/>
    </g>
  </svg>`
}

export function moodLabel(mood: string): string {
  if (mood === 'crazy') return '爆单'
  if (mood === 'busy') return '忙碌'
  return '空闲'
}
