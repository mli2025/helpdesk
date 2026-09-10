/** SVG fragments for Monday board characters & furniture */

export function mondaySvg(mood: string): string {
  const face =
    mood === 'crazy'
      ? `<ellipse class="eye left" cx="38" cy="40" rx="4.2" ry="5.5"/><ellipse class="eye right" cx="62" cy="40" rx="4.2" ry="5.5"/>
         <path class="mouth crazy" d="M40 58 Q50 48 60 58" fill="none" stroke-width="3" stroke-linecap="round"/>
         <path class="brow" d="M32 30 L44 34" stroke-width="2.5" stroke-linecap="round"/>
         <path class="brow" d="M68 30 L56 34" stroke-width="2.5" stroke-linecap="round"/>`
      : mood === 'busy'
        ? `<circle class="eye left" cx="38" cy="40" r="3.2"/><circle class="eye right" cx="62" cy="40" r="3.2"/>
           <path class="mouth" d="M42 56 Q50 62 58 56" fill="none" stroke-width="2.5" stroke-linecap="round"/>
           <circle class="focus" cx="50" cy="18" r="3"/>`
        : `<circle class="eye left" cx="38" cy="40" r="3"/><circle class="eye right" cx="62" cy="40" r="3"/>
           <path class="mouth" d="M42 54 Q50 60 58 54" fill="none" stroke-width="2.5" stroke-linecap="round"/>
           <path class="zzz" d="M70 18 h8 l-8 8 h8" fill="none" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`

  return `
  <svg class="monday-svg mood-${mood}" viewBox="0 0 100 120" aria-hidden="true">
    <defs>
      <linearGradient id="monBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5eead4"/>
        <stop offset="100%" stop-color="#2dd4bf"/>
      </linearGradient>
      <linearGradient id="monShirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
    </defs>
    <ellipse class="shadow" cx="50" cy="112" rx="28" ry="5" fill="rgba(15,23,42,.18)"/>
    <g class="body">
      <rect x="28" y="62" width="44" height="42" rx="14" fill="url(#monShirt)"/>
      <rect x="34" y="70" width="32" height="8" rx="3" fill="#0f766e" opacity=".85"/>
      <circle class="head" cx="50" cy="42" r="28" fill="url(#monBody)"/>
      <circle cx="50" cy="42" r="28" fill="none" stroke="rgba(15,23,42,.08)" stroke-width="2"/>
      <g class="face" fill="#0f172a" stroke="#0f172a">${face}</g>
      <g class="arms">
        <path class="arm left" d="M30 78 Q18 88 26 98" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
        <path class="arm right" d="M70 78 Q82 88 74 98" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
      </g>
    </g>
    <g class="fx"></g>
  </svg>`
}

export function deskSvg(mood: string, index: number): string {
  return `
  <svg class="desk-svg mood-${mood}" viewBox="0 0 160 110" aria-hidden="true">
    <defs>
      <linearGradient id="deskTop${index}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </linearGradient>
    </defs>
    <ellipse class="desk-shadow" cx="80" cy="100" rx="54" ry="7" fill="rgba(15,23,42,.16)"/>
    <rect x="18" y="58" width="124" height="14" rx="4" fill="url(#deskTop${index})"/>
    <rect x="28" y="72" width="8" height="22" rx="2" fill="#64748b"/>
    <rect x="124" y="72" width="8" height="22" rx="2" fill="#64748b"/>
    <g class="monitor">
      <rect x="48" y="22" width="64" height="40" rx="4" fill="#0f172a"/>
      <rect class="screen" x="52" y="26" width="56" height="32" rx="2" fill="#134e4a"/>
      <g class="code-lines">
        <rect x="56" y="30" width="28" height="3" rx="1" fill="#5eead4" opacity=".85"/>
        <rect x="56" y="36" width="40" height="3" rx="1" fill="#99f6e4" opacity=".55"/>
        <rect x="56" y="42" width="22" height="3" rx="1" fill="#5eead4" opacity=".7"/>
        <rect x="56" y="48" width="34" height="3" rx="1" fill="#2dd4bf" opacity=".45"/>
      </g>
      <rect x="76" y="62" width="8" height="6" fill="#475569"/>
    </g>
    <g class="worker">
      <circle cx="80" cy="70" r="10" fill="#5eead4"/>
      <rect x="70" y="78" width="20" height="14" rx="5" fill="#e2e8f0"/>
    </g>
    <g class="mail-stack">
      <rect x="118" y="46" width="18" height="12" rx="2" fill="#fef3c7" transform="rotate(-8 127 52)"/>
      <rect x="120" y="50" width="18" height="12" rx="2" fill="#fde68a" transform="rotate(6 129 56)"/>
    </g>
  </svg>`
}

export function moodLabel(mood: string): string {
  if (mood === 'crazy') return '爆单'
  if (mood === 'busy') return '忙碌'
  return '空闲'
}
