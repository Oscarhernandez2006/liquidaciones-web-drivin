// Iconos SVG de línea (estilo profesional). Reemplazan a los emojis en la UI.
type Props = { className?: string };

export function IconoMapa({ className = "h-5 w-5" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

/** Bandera (marca el inicio de la ruta). */
export function IconoBandera({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

/** Bandera a cuadros (marca la meta/destino). */
export function IconoMeta({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 2a1 1 0 0 0-1 1v18a1 1 0 1 0 2 0v-6.2c1.1-.4 2.1-.3 3.4.2 1.7.6 3.8 1.4 6.4.3.5-.2.8-.7.8-1.3V4.8c0-1-1-1.7-1.9-1.3-1.9.8-3.5.2-5.1-.4C8.9 2.5 7.4 2.2 6 2.7V3a1 1 0 0 0-1-1zm1 3.6c1-.3 2 0 3.2.4l.3.1V9l-.5-.2C9 8.4 8 8.1 6 8.4V5.6zM11 6.7c.9.3 1.9.5 3 .4v2.8c-1 .1-2-.1-3-.4V6.7zM6 10.4c1-.2 2 0 3 .3v2.8c-1-.3-2-.4-3-.2v-2.9zm5 .9c1 .3 2 .5 3 .4v2.7c-1 .1-2 0-3-.3v-2.8z" />
    </svg>
  );
}

export function IconoMas({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconoCaja({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function IconoCheck({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconoEquis({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function IconoBrujula({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export function IconoGrafico({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function IconoPlay({ className = "h-4 w-4" }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}
