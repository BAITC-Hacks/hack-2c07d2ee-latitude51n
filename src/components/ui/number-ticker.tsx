"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const noop = () => () => {};

interface NumberTickerProps {
  value: number;
  /** Value to count up from on first render; later changes tween from the previous value. */
  from?: number;
  decimals?: number;
  duration?: number;
  signed?: boolean;
  className?: string;
}

export function NumberTicker({
  value,
  from,
  decimals = 0,
  duration = 0.8,
  signed = false,
  className,
}: NumberTickerProps) {
  const reduce = useReducedMotion();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const count = useMotionValue(from ?? value);
  const text = useTransform(count, (latest) => {
    const formatted = latest.toLocaleString("ru-RU", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return signed && latest > 0 ? `+${formatted}` : formatted;
  });

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, duration, reduce, count]);

  const final = value.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const label = signed && value > 0 ? `+${final}` : final;
  const instant = reduce && hydrated;

  return (
    <span className={cn("tabular-nums", className)}>
      <motion.span aria-hidden>{instant ? label : text}</motion.span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
