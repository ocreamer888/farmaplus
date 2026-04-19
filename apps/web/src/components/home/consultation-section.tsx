import Image from "next/image";

import { WhatsAppButton } from "./whatsapp-button";

export function ConsultationSection() {
  return (
    <section className="relative z-10 px-4 pb-16 md:px-10 md:pb-24 py-24">
      <div
        className="mx-auto flex w-full max-w-[1200px] border border-[#e0ddcf]/20 flex-col overflow-hidden rounded-[42px] px-4 md:rounded-[102px] md:px-16 pt-16 lg:flex-row lg:items-end"
        style={{
          backgroundImage:
            "linear-gradient(344deg, rgba(33, 64, 29, 0.2) 14.951%, rgba(76, 120, 57, 0.2) 81.354%)",
        }}
      >
        <div className="flex flex-col items-center justify-end lg:justify-start z-10 gap-4 lg:h-[600px] max-w-[795px]">
          <h2 className="font-serif text-[52px] leading-[0.9] text-white md:text-[80px] lg:text-[82px] lg:leading-[0.9] xl:text-[80px]">
            Teleconsulta
            <br />
            a la distancia
            <br />
            de un click
          </h2>

          <p className="px-8 max-w-[492px] text-base text-[#e0ddcf] md:text-[20px] md:leading-[28.6px] md:tracking-[-0.84px]">
            Qué tu salud no espere. Nuestro equipo de médicos te atiende en línea para resolver tus dudas y brindarte la mejor atención.
          </p>

          <WhatsAppButton
            className="flex h-[56px] mt-8 w-full max-w-[500px] border border-[#e0ddcf]/50 items-center justify-center rounded-[62px] bg-[#408733] text-[15px] text-[#eceadd]"
          >
            WhatsApp
          </WhatsAppButton>
        </div>

        <div className="relative flex w-full justify-center mt-16 lg:flex-1 lg:justify-center">
          <Image
            src="/dr-javier-leon-farmaplus-huacas.png"
            alt="Doctor Javier Leon - FarmaPlus Huacas"
            width={832}
            height={1008}
            loading="lazy"
            quality={100}
            className="h-auto w-full max-w-[300px] lg:max-w-[400px]"
          />
        </div>
      </div>
    </section>
  );
}
