import Image from "next/image";

import { HEADER_LOGO_SRC } from "./constants";
import { WhatsAppButton } from "./whatsapp-button";

export function Header() {
  return (
    <header className="sticky top-0 z-20 px-6 py-4 md:px-10">
      <div className="mx-auto flex w-full max-w-[1728px] items-center justify-between">
        <Image
          src={HEADER_LOGO_SRC}
          alt="FarmaPlus"
          width={167}
          height={22}
          className="h-auto w-[130px] md:w-[167px] backdrop-blur p-4"
          priority
        />

        <div className="flex items-center gap-2">
          <WhatsAppButton
            className="rounded-full border border-[#e0ddcf] hover:border-[#e0ddcf]/60 backdrop-blur px-4 py-2 text-sm text-[#e0ddcf] md:px-[13px] md:py-4 md:text-[20px] md:leading-[26px]"
          >
            Contacto
          </WhatsAppButton>
         
        </div>
      </div>
    </header>
  );
}
