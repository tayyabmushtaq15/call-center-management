import type { Metadata } from "next";
import { ButtonLink, CardGrid, CheckList, PageHero, Section } from "@/components/site/SiteUI";
import { CHECKLIST, CONTACT_EMAIL, ONBOARDING } from "@/components/site/content";

export const metadata: Metadata = {
  title: "Get started | SYMBO DID Portal",
  description: "How a call center is onboarded and what to have ready.",
};

export default function GetStartedPage() {
  return (
    <>
      <PageHero
        eyebrow="Get started"
        title="From sign-up to first matched call."
        intro="We set everything up with you. Here is what to expect, and what to have ready."
        actions={
          <>
            {CONTACT_EMAIL && <ButtonLink href={`mailto:${CONTACT_EMAIL}`}>Contact us</ButtonLink>}
            <ButtonLink href="/admin/login" variant={CONTACT_EMAIL ? "secondary" : "primary"}>
              Administrator sign in
            </ButtonLink>
          </>
        }
      />
      <Section title="How onboarding works">
        <CardGrid items={ONBOARDING} cols={4} />
      </Section>
      <Section tint title="What to have ready">
        <div className="max-w-2xl">
          <CheckList items={CHECKLIST} />
        </div>
      </Section>
    </>
  );
}
