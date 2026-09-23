"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Magnetic } from "@/components/ui/magnetic";
import { cn } from "@/lib/utils";

export function StartButton({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Magnetic intensity={size === "lg" ? 0.3 : 0.2}>
      <Link
        href="/simulator"
        className={cn(
          "group inline-flex items-center gap-2 rounded-xl bg-ink font-medium whitespace-nowrap text-white shadow-[0_10px_30px_-12px_rgba(13,39,68,0.55)] transition-[background-color,transform] hover:bg-teal-deep active:scale-[0.98]",
          size === "lg" ? "px-6 py-3.5 text-base" : "px-4 py-2 text-sm",
        )}
      >
        Начать симуляцию
        <ArrowRightIcon
          size={size === "lg" ? 18 : 16}
          weight="bold"
          aria-hidden
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </Magnetic>
  );
}
