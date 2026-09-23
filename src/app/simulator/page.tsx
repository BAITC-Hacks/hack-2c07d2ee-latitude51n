import type { Metadata } from "next";
import { Simulator } from "@/components/Simulator";
import { REFERENCE_PLAN } from "@/lib/engine";

export const metadata: Metadata = {
  title: "Симулятор · QALA",
};

export default async function SimulatorPage({ searchParams }: PageProps<"/simulator">) {
  const { plan } = await searchParams;
  const initialPlan = plan === "reference" ? REFERENCE_PLAN.map((d) => ({ ...d })) : null;
  return <Simulator initialPlan={initialPlan} />;
}
