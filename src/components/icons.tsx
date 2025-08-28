type IconProps = { className?: string };

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 10.5L12 3l9 7.5"/>
      <path d="M5.5 10.5V20a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-9.5"/>
    </svg>
  );
}

export function DatabaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <ellipse cx="12" cy="6" rx="7" ry="3"/>
      <path d="M5 6v6c0 1.66 3.134 3 7 3s7-1.34 7-3V6"/>
      <path d="M5 12v6c0 1.66 3.134 3 7 3s7-1.34 7-3v-6"/>
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 21h18"/>
      <rect x="4" y="12" width="3" height="6" rx="1"/>
      <rect x="10.5" y="7" width="3" height="11" rx="1"/>
      <rect x="17" y="4" width="3" height="14" rx="1"/>
    </svg>
  );
}

export function HandshakeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 12l4-4 4 4 4-4 6 6"/>
      <path d="M12 12l-2 2a2 2 0 0 0 0 3l.5.5a2 2 0 0 0 2.828 0L15 16"/>
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="8" cy="8" r="3"/>
      <circle cx="17" cy="9" r="2.5"/>
      <path d="M3 21v-1.5A5.5 5.5 0 0 1 8.5 14h0A5.5 5.5 0 0 1 14 19.5V21"/>
      <path d="M14.5 21v-1a4.5 4.5 0 0 1 4.5-4.5h0"/>
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1.5.8l-.02.03a2 2 0 1 1-3 0l-.02-.03A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.8-1.5l-.03-.02a2 2 0 1 1 0-3l.03-.02A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l-.06-.06A2 2 0 1 1 7.01 4.13l.06.06A1.8 1.8 0 0 0 9 4.6c.57 0 1.1-.22 1.5-.6l.02-.03a2 2 0 1 1 3 0l.02.03c.4.38.93.6 1.5.6.68 0 1.31-.27 1.77-.74l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.38.4-.6.93-.6 1.5 0 .57.22 1.1.6 1.5.38.4.6.93.6 1.5Z"/>
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/>
      <path d="M16 17l5-5-5-5"/>
      <path d="M21 12H9"/>
    </svg>
  );
}


