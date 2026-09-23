import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { StartButton } from "@/components/landing/StartButton";

export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-6 px-6 py-16 outline-none"
    >
      <p className="font-[family-name:var(--font-display)] text-7xl font-bold tracking-tight text-line">
        404
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Такого района в Астане нет
      </h1>
      <p className="max-w-xl text-base text-ink-muted">
        Страница не найдена. Вернитесь на главную или сразу откройте симулятор и соберите свой план
        из пяти решений.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <StartButton />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon size={16} weight="bold" aria-hidden />
          На главную
        </Link>
      </div>
    </main>
  );
}
