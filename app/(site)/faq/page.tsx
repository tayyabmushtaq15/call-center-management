import type { Metadata } from "next";
import { CtaBand, Faq, PageHero, Section } from "@/components/site/SiteUI";
import { FAQS } from "@/components/site/content";

export const metadata: Metadata = {
  title: "FAQ | SYMBO DID Portal",
  description: "Answers about DIDs, local presence dialing, pool sizing and reliability.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions call center owners ask."
        intro="Straight answers about what the service does and how to start."
      />
      {FAQS.map((group, i) => (
        <Section key={group.category} tint={i % 2 === 1} title={group.category}>
          <div className="max-w-3xl">
            <Faq items={group.items} />
          </div>
        </Section>
      ))}
      <CtaBand title="Still have a question?" text="Get in touch and we will walk you through your setup." />
    </>
  );
}
