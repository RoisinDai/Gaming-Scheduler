/** Locally generated placeholder avatar as an SVG data URI. No network, no external assets. */
export function mockAvatar(initials: string, color: string, variant: number): string {
  const shapes = [
    `<path d="M0 64 L64 0 L64 26 L26 64 Z" fill="${color}" opacity="0.9"/>`,
    `<path d="M0 40 L40 0 L64 0 L0 64 Z" fill="${color}" opacity="0.85"/><path d="M38 64 L64 38 L64 64 Z" fill="${color}" opacity="0.5"/>`,
    `<path d="M14 0 L50 0 L64 14 L64 64 L46 64 L46 22 L32 8 Z" fill="${color}" opacity="0.8"/>`,
    `<path d="M0 0 L64 0 L64 18 L18 64 L0 64 Z" fill="${color}" opacity="0.75"/>`,
    `<polygon points="32,4 60,32 32,60 4,32" fill="${color}" opacity="0.8"/>`,
    `<path d="M0 22 L22 0 L64 0 L64 12 L12 64 L0 64 Z" fill="${color}" opacity="0.85"/><path d="M40 64 L64 40 L64 64 Z" fill="${color}"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1b2733"/>${
    shapes[variant % shapes.length]
  }<rect width="64" height="64" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1923" stop-opacity="0"/><stop offset="1" stop-color="#0f1923" stop-opacity="0.55"/></linearGradient></defs><text x="32" y="41" text-anchor="middle" font-family="Arial Narrow, Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="1" fill="#ece8e1">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
