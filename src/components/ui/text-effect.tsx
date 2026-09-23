"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const TAGS = {
  h1: motion.h1,
  h2: motion.h2,
  p: motion.p,
} as const;

const word: Variants = {
  hidden: { opacity: 0, y: "0.35em", filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

interface TextEffectProps {
  children: string;
  as?: keyof typeof TAGS;
  className?: string;
  delay?: number;
  stagger?: number;
  /** Animate when scrolled into view instead of on mount. */
  inView?: boolean;
}

export function TextEffect({
  children,
  as = "p",
  className,
  delay = 0,
  stagger = 0.07,
  inView = false,
}: TextEffectProps) {
  const reduce = useReducedMotion();
  const Tag = TAGS[as];
  const container: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: delay, staggerChildren: stagger } },
  };
  const trigger = inView
    ? { whileInView: "visible", viewport: { once: true, amount: 0.6 } }
    : { animate: "visible" };

  return (
    <Tag
      className={className}
      variants={container}
      initial={reduce ? false : "hidden"}
      {...trigger}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden>
        {children.split(" ").map((w, i, all) => (
          <span key={i}>
            <motion.span variants={word} className={cn("inline-block will-change-transform")}>
              {w}
            </motion.span>
            {i < all.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
