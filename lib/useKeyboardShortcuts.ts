'use client';

import { useEffect, useCallback } from 'react';

// ============================================
// Keyboard Shortcuts Hook
// ============================================

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // لا نفعّل الاختصارات أثناء الكتابة في حقول النص
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Esc فقط تعمل حتى أثناء الكتابة
        if (e.key !== 'Escape') return;
      }

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.key !== 'Control' && e.key !== 'Meta' && e.key !== 'Shift' && e.key !== 'Alt') {
        parts.push(e.key.toUpperCase());
      }

      const combo = parts.join('+');
      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const SHORTCUTS = {
  NEW: 'Ctrl+N',
  SEARCH: 'Ctrl+F',
  ESCAPE: 'ESCAPE',
} as const;
