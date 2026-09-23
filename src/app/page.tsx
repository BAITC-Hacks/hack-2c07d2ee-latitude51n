import { LandingStory } from "@/components/landing/LandingStory";
import {
  FinalCta,
  FormulaSection,
  LandingFooter,
  LandingNav,
  RulesSection,
} from "@/components/landing/Sections";
import { buildLandingData } from "@/lib/landing";

export default function Home() {
  const data = buildLandingData();
  return (
    <>
      <LandingNav />
      <main id="main" tabIndex={-1} className="outline-none">
        <LandingStory data={data} />
        <RulesSection />
        <FormulaSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
