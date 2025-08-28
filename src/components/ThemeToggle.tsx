"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      const mode = localStorage.getItem('themeMode') || 'system';
      let dark;
      if (mode === 'light') dark = false;
      else if (mode === 'dark') dark = true;
      else dark = m.matches; // system mode
      setIsDark(dark);
    };
    update();
    m.addEventListener('change', update);
    window.addEventListener('storage', update);
    // Also listen for custom theme change events
    const handleThemeChange = () => update();
    window.addEventListener('themechange', handleThemeChange);
    return () => { 
      m.removeEventListener('change', update); 
      window.removeEventListener('storage', update);
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  function toggle() {
    const current = localStorage.getItem('themeMode') || 'system';
    // cycle: system -> light -> dark -> system
    const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    localStorage.setItem('themeMode', next);
    
    // Apply the same logic as ThemeScript
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    let dark;
    if (next === 'light') dark = false;
    else if (next === 'dark') dark = true;
    else dark = mq.matches; // system mode
    
    // Remove existing dark class first, then add if needed
    document.documentElement.classList.remove('dark');
    if (dark) {
      document.documentElement.classList.add('dark');
    }
    
    setIsDark(dark);
    
    // Trigger custom theme change event
    window.dispatchEvent(new Event('themechange'));
  }

  return (
    <label className="switch select-none cursor-pointer" aria-label="Toggle theme" title="Toggle dark/light mode">
      <input type="checkbox" checked={isDark} onChange={toggle} />
      <span className="slider" />
    </label>
  );
}


