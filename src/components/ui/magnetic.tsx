"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, type SpringOptions } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SPRING: SpringOptions = { stiffness: 180, damping: 14, mass: 0.2 };

interface MagneticProps {
  children: ReactNode;
  intensity?: number;
  range?: number;
  className?: string;
}

export function Magnetic({ children, intensity = 0.35, range = 140, className }: MagneticProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const pull = Math.max(0, 1 - Math.hypot(dx, dy) / range);
    x.set(dx * intensity * pull);
    y.set(dy * intensity * pull);
  }

  function release() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x: springX, y: springY }}
      onPointerMove={onPointerMove}
      onPointerLeave={release}
    >
      {children}
    </motion.div>
  );
}
