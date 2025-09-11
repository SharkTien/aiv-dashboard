"use client";
import { useEffect, useRef } from "react";

export default function RichHtmlEditor({ html, onChange, placeholder }: { html: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== html) {
      ref.current.innerHTML = html || '';
    }
  }, [html]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onInput = () => onChange(el.innerHTML);
    const onPaste = (e: ClipboardEvent) => {
      // Allow rich HTML paste: prefer text/html, fallback to text/plain
      const dt = e.clipboardData;
      if (!dt) return;
      const htmlData = dt.getData('text/html');
      const text = dt.getData('text/plain');
      if (htmlData) {
        e.preventDefault();
        document.execCommand('insertHTML', false, htmlData);
      } else if (text) {
        e.preventDefault();
        document.execCommand('insertText', false, text);
      }
      onChange(el.innerHTML);
    };
    el.addEventListener('input', onInput as any);
    el.addEventListener('paste', onPaste as any);
    return () => {
      el.removeEventListener('input', onInput as any);
      el.removeEventListener('paste', onPaste as any);
    };
  }, [onChange]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="w-full min-h-[10rem] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      data-placeholder={placeholder || ''}
      style={{ outline: 'none' }}
    />
  );
}

