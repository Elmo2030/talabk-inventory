'use client';

/**
 * AnimatedList — DRY wrapper around framer-motion's AnimatePresence for
 * lists that re-order, insert, or remove items at runtime (filter changes,
 * new optimistic rows, deletions).
 *
 * Premium feel: rows fade-slide in/out instead of snapping. Keeps the
 * underlying DOM (div, tbody, etc.) flexible via the `as` prop.
 *
 * Usage:
 *   <AnimatedList>
 *     {items.map(i => <AnimatedRow key={i.id}>...</AnimatedRow>)}
 *   </AnimatedList>
 *
 * The `key` on each `AnimatedRow` is what drives enter/exit; the parent
 * provides AnimatePresence's `mode="popLayout"` for natural layout shifts
 * on remove.
 */

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function AnimatedList({ children }: { children: ReactNode }) {
  return <AnimatePresence mode="popLayout">{children}</AnimatePresence>;
}

interface AnimatedRowProps {
  /** Stable key — required for enter/exit to work correctly. */
  rowKey: string | number;
  children: ReactNode;
  /** Render as a `<tr>` (default) or `<div>` depending on parent. */
  as?: 'tr' | 'div' | 'li';
  className?: string;
}

export function AnimatedRow({ rowKey, children, as = 'div', className }: AnimatedRowProps) {
  const baseProps = {
    layout:    true,
    initial:   { opacity: 0, y: -8 },
    animate:   { opacity: 1, y: 0 },
    exit:      { opacity: 0, y: 8, transition: { duration: 0.15 } },
    transition: { type: 'spring', stiffness: 500, damping: 38, mass: 0.6 },
    className,
  } as const;

  if (as === 'tr') {
    return <motion.tr key={rowKey} {...baseProps}>{children}</motion.tr>;
  }
  if (as === 'li') {
    return <motion.li key={rowKey} {...baseProps}>{children}</motion.li>;
  }
  return <motion.div key={rowKey} {...baseProps}>{children}</motion.div>;
}
