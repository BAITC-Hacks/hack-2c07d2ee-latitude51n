"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedTab<T extends string> {
  id: T;
  label: ReactNode;
}

interface AnimatedTabsProps<T extends string> {
  tabs: AnimatedTab<T>[];
  value: T;
  onValueChange: (id: T) => void;
  label: string;
  className?: string;
  indicatorClassName?: string;
  tabClassName?: string;
  transition?: Transition;
}

export function AnimatedTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  label,
  className,
  indicatorClassName,
  tabClassName,
  transition = { type: "spring", bounce: 0.2, duration: 0.3 },
}: AnimatedTabsProps<T>) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (index === last ? 0 : index + 1)
        : e.key === "ArrowLeft"
          ? (index === 0 ? last : index - 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    onValueChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={cn("flex", className)}>
      {tabs.map((tab, index) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-checked={active}
            onClick={() => onValueChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn("relative inline-flex items-center", tabClassName)}
          >
            {active && (
              <motion.span
                layoutId={`tab-indicator-${layoutId}`}
                className={cn("absolute inset-0", indicatorClassName)}
                transition={reduce ? { duration: 0 } : transition}
                aria-hidden
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
