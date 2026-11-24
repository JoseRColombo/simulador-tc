/** Ícones em SVG (traço de 1.8px, herdam a cor do texto). */
import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const IconeTocar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconePausar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
export const IconeProximo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const IconeAnterior = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const IconeInicio = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M17 6l-6 6 6 6M7 6v12" />
  </svg>
);
export const IconeFim = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7 6l6 6-6 6M17 6v12" />
  </svg>
);
export const IconeOk = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M7.8 12.3l2.8 2.8 5.6-6" />
  </svg>
);
export const IconeErro = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2.2}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" />
  </svg>
);
export const IconeAlerta = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2}>
    <path d="M12 3.5l9.5 16.5h-19z" />
    <path d="M12 10v4.2M12 17.2v.1" />
  </svg>
);
export const IconeInfo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </svg>
);
export const IconeAbrir = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 7.5V18a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0020 18v-8a1.5 1.5 0 00-1.5-1.5H11L9 5.5H5.5A1.5 1.5 0 004 7z" />
  </svg>
);
export const IconeBaixar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
  </svg>
);
export const IconeFormatar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 6h16M8 10h12M8 14h12M4 18h16" />
  </svg>
);
export const IconeConverter = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </svg>
);
export const IconeReorganizar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="12" cy="18" r="2.5" />
    <path d="M8.5 6h7M7.2 8.2l3.6 7.6M16.8 8.2l-3.6 7.6" />
  </svg>
);
export const IconeMedir = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 19.5h16M6.5 16l4-5 3 3 5-7" />
  </svg>
);

/** Logotipo: estado final (círculo duplo) sobre marca-texto. */
export const Logotipo = () => (
  <svg viewBox="0 0 34 34" aria-hidden="true">
    <ellipse cx="17" cy="17.5" rx="15" ry="13.5" fill="#FFE14D" transform="rotate(-8 17 17)" />
    <circle cx="17" cy="17" r="10" fill="#fff" stroke="#18213D" strokeWidth="2" />
    <circle cx="17" cy="17" r="6.6" fill="none" stroke="#18213D" strokeWidth="1.6" />
  </svg>
);
