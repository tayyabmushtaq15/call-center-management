import type { Metadata } from "next";
import { CallFlowCard, CtaBand, NumberedSteps, PageHero, Section } from "@/components/site/SiteUI";
import { STEPS } from "@/components/site/content";

export const metadata: Metadata = {
  title: "How it works | SYMBO DID Portal",
  description: "Get set up, connect your dialer and start showing local numbers on your calls.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Simple to start. Invisible to your agents."
        intro="We set you up and help you connect. After that, your team dials as normal and your customers see a local number."
      >
        <CallFlowCard />
      </PageHero>

      <Section title="Getting going in four steps">
        <NumberedSteps steps={STEPS} />
      </Section>

      <CtaBand />
    </>
  );
}
