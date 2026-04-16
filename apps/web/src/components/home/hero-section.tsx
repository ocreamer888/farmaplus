import Image from "next/image";

import { WhatsAppButton } from "./whatsapp-button";

export function HeroSection() {
  return (
    <section className="px-6 pb-20 pt-14 md:px-10 md:pt-16">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center gap-8 text-center">
        <div className="relative">
          <Image
            src="/pill-squircle.webp"
            alt=""
            width={116}
            height={116}
            className="absolute -left-12 -top-10 hidden size-[72px] md:block md:size-[116px]"
          />
          <h1 className="font-serif text-[44px] leading-[1.1] text-white md:text-[80px] lg:text-[120px] text-balance">
            Salud sin pausa.
            <br />
            Cuidado inteligente.
          </h1>
          <Image
            src="/pill-circle.webp"
            alt=""
            width={108}
            height={108}
            className="absolute -right-8 top-16 hidden size-[72px] md:block md:size-[108px]"
          />
        </div>

        <p className="max-w-[520px] text-xl font-medium tracking-[-0.4px] text-[#e0ddcf] md:text-[26px] md:leading-[28.6px] md:tracking-[-0.84px]">
          Telemedicina, farmacia 24/7 y farmacia express en Huacas, Guanacaste.
        </p>

        <div className="flex w-full max-w-[376px] items-center gap-1 rounded-[10px] p-1">
          <WhatsAppButton
            className="flex h-[56px] w-1/2 items-center justify-center rounded-[62px] bg-[#408733] text-[15px] text-[#eceadd]"
          >
            WhatsApp
          </WhatsAppButton>
          <button
            type="button"
            className="flex h-[56px] w-1/2 items-center justify-center rounded-[62px] bg-[#21401d] text-[15px] text-[#fffff3]"
          >
            Browse
          </button>
        </div>

        <Image src="/pill-triangle.webp" alt="" width={146} height={146} className="size-[146px]" />
      </div>
    </section>
  );
}
