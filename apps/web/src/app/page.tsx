import { ConsultationSection } from "@/components/home/consultation-section";
import { ContactSection } from "@/components/home/contact-section";
import { Header } from "@/components/home/header";
import { HeroSection } from "@/components/home/hero-section";
import { StatementSection } from "@/components/home/statement-section";

export default function HomePage() {
  return (
    <main className="border border-[#222721] bg-[#222721] text-[#fffff3]">
      <Header />
      <HeroSection />
      <StatementSection />
      <ConsultationSection />
      <ContactSection />
    </main>
  );
}
