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

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=220%",
          scrub: 1,
          pin: stageRef.current,
          pinSpacing: true,
          anticipatePin: 1,
        },
      });

      paragraphs.forEach((paragraph, index) => {
        timeline.to(paragraph, {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
        });

        if (index < paragraphs.length - 1) {
          timeline.to(paragraph, {
            autoAlpha: 0,
            y: -24,
            duration: 1,
            ease: "power2.inOut",
          });
        }
      });

      timeline
        .to(paragraphs[paragraphs.length - 1], {
          autoAlpha: 0,
          y: -24,
          duration: 1,
          ease: "power2.inOut",
        })
        .to(logo, {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
        })
        .to({}, { duration: 0.4 })
        .to(logo, {
          autoAlpha: 0,
          y: -16,
          duration: 0.8,
          ease: "power2.inOut",
        })
        .set(logo, { autoAlpha: 0, clearProps: "transform" })
        .to({}, { duration: 0.8 });
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
        <div className="relative h-[260vh]">
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
                className="h-auto w-[260px] md:w-[420px] lg:w-[527px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
