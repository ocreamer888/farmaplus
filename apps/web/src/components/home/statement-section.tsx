"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SECTION_LOGO_SRC } from "./constants";

export function StatementSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (!sectionRef.current || !stageRef.current) return;

    const ctx = gsap.context(() => {
      const paragraphs = gsap.utils.toArray<HTMLParagraphElement>(
        "[data-statement-paragraph]",
      );
      const logo = gsap.utils.toArray<HTMLDivElement>("[data-statement-logo]")[0];

      if (!paragraphs.length || !logo) return;

      gsap.set(paragraphs, {
        autoAlpha: 0,
        y: 24,
        position: "absolute",
        left: "50%",
        top: "50%",
        xPercent: -50,
        yPercent: -50,
      });
      gsap.set(logo, {
        autoAlpha: 0,
        y: 24,
        position: "absolute",
        left: "50%",
        top: "50%",
        xPercent: -50,
        yPercent: -50,
      });

      // Same in/out duration for every paragraph and the logo so scroll share is even (4 × 2 halves).
      const half = 1;

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          // Longer scroll distance = slower scrub so each line stays readable.
          end: "+=420%",
          scrub: 1.25,
          pin: stageRef.current,
          pinSpacing: true,
          anticipatePin: 1,
        },
      });

      paragraphs.forEach((paragraph, index) => {
        timeline.to(paragraph, {
          autoAlpha: 1,
          y: 0,
          duration: half,
          ease: "power2.out",
        });

        if (index < paragraphs.length - 1) {
          timeline.to(paragraph, {
            autoAlpha: 0,
            y: -24,
            duration: half,
            ease: "power2.inOut",
          });
        }
      });

      const lastParagraph = paragraphs[paragraphs.length - 1]!;

      timeline
        .to(lastParagraph, {
          autoAlpha: 0,
          y: -24,
          duration: half,
          ease: "power2.inOut",
        })
        .to(logo, {
          autoAlpha: 1,
          y: 0,
          duration: half,
          ease: "power2.out",
        })
        .to(logo, {
          autoAlpha: 0,
          y: -24,
          duration: half,
          ease: "power2.inOut",
        })
        .set(logo, { autoAlpha: 0, clearProps: "transform" });
    }, sectionRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section className="px-6 pb-8 md:px-10">
      <div
        ref={sectionRef}
        className="mx-auto w-full max-w-[1500px]"
      >
        <div className="relative h-[500vh]">
          <div
            ref={stageRef}
            className="relative flex h-screen items-center justify-center text-center"
          >
            <p
              data-statement-paragraph
              className="w-full max-w-[1500px] px-4 font-serif text-[40px] leading-[1.08] tracking-[-0.6px] text-[#e0ddcf] md:text-[64px] lg:text-[86px] lg:leading-[92.88px] lg:tracking-[-1.72px]"
            >
              En salud, esperar no siempre es opción.
            </p>
            <p
              data-statement-paragraph
              className="w-full max-w-[1500px] px-4 font-serif text-[40px] leading-[1.08] tracking-[-0.6px] text-[#e0ddcf] md:text-[64px] lg:text-[86px] lg:leading-[92.88px] lg:tracking-[-1.72px]"
            >
              FarmaPlus integra teleconsulta, farmacia 24/7 y servicio express
              para que el cuidado sea continuo, accesible y humano.
            </p>
            <p
              data-statement-paragraph
              className="w-full max-w-[1500px] px-4 font-serif text-[40px] leading-[1.08] tracking-[-0.6px] text-[#e0ddcf] md:text-[64px] lg:text-[86px] lg:leading-[92.88px] lg:tracking-[-1.72px]"
            >
              En Huacas, Guanacaste, creemos en una salud sin pausa.
            </p>
            <div data-statement-logo>
              <Image
                src={SECTION_LOGO_SRC}
                alt="FarmaPlus icono"
                width={527}
                height={265}
                loading="lazy"
                quality={100}
                className="h-auto w-[260px] md:w-[420px] lg:w-[527px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
