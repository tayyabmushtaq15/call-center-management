import type { Metadata } from "next";
import {
  ButtonLink,
  CallFlowCard,
  CardGrid,
  CtaBand,
  NumberedSteps,
  PageHero,
  Section,
  StatStrip,
} from "@/components/site/SiteUI";
import { AUDIENCES, HIGHLIGHTS, PROBLEMS, SOLUTIONS, STEPS } from "@/components/site/content";

export const metadata: Metadata = {
  title: "SYMBO DID Portal: local-presence dialing for call centers",
  description:
    "Show a local phone number on every outbound call, so more people recognise it and pick up. We look after the numbers.",
};

export default function HomePage() {
  return (
    <>
      <PageHero
        big
        eyebrow="Local-presence dialing"
        title="Every call, from a number that looks local."
        intro="SYMBO DID Portal makes your outbound calls show a phone number from the area you are calling, so more people recognise it and pick up. We look after the numbers."
        actions={
          <>
            <ButtonLink href="/get-started">Get started</ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary">
              See how it works
            </ButtonLink>
          </>
        }
      >
        <CallFlowCard />
      </PageHero>
      <StatStrip items={HIGHLIGHTS} />

      <Section
        eyebrow="The problem"
        title="Outbound calling works better when the number looks familiar"
        intro="Managing the numbers behind that is where it gets difficult."
      >
        <CardGrid items={PROBLEMS} />
      </Section>

      <Section
        tint
        eyebrow="The solution"
        title="Local numbers, handled for you"
        intro="Your dialer and phone provider still make the calls. We take care of the number your customers see."
      >
        <CardGrid items={SOLUTIONS} />
      </Section>

      <Section eyebrow="How it works" title="Up and running in four steps">
        <NumberedSteps steps={STEPS} />
        <div className="mt-4">
          <ButtonLink href="/how-it-works" variant="secondary">
            Read the full walkthrough
          </ButtonLink>
        </div>
      </Section>

      <Section tint eyebrow="Who it is for" title="Built for teams that make outbound calls">
        <CardGrid items={AUDIENCES} />
      </Section>

      <CtaBand />
    </>
  );
}
