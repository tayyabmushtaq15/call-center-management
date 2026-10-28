import type { Metadata } from "next";
import { CardGrid, CtaBand, PageHero, Section } from "@/components/site/SiteUI";
import { FEATURE_GROUPS } from "@/components/site/content";

export const metadata: Metadata = {
  title: "Features | SYMBO DID Portal",
  description: "Local numbers on your calls, a live dashboard, call history and reports.",
};

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything you need, nothing to manage."
        intro="Local numbers on your calls, and a clear view of what your team is doing."
      />
      {FEATURE_GROUPS.map((group, i) => (
        <Section key={group.id} id={group.id} tint={i % 2 === 1} title={group.title} intro={group.summary}>
          <CardGrid items={group.items} />
        </Section>
      ))}
      <CtaBand />
    </>
  );
}
