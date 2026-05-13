"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

import { HEADER_LOGO_SRC } from "./constants";
import { WhatsAppButton } from "./whatsapp-button";

export function Header() {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const nextLocale = locale === "es" ? "en" : "es";
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    router.push(segments.join("/") || "/");
  }

  return (
    <header className="sticky top-0 z-20 px-6 py-4 md:px-10">
      <div className="mx-auto flex w-full max-w-[1728px] items-center justify-between">
        <Image
          src={HEADER_LOGO_SRC}
          alt="FarmaPlus"
          width={167}
          height={22}
          className="h-auto w-[130px] md:w-[167px] backdrop-blur p-2"
          priority
        />

        <div className="flex items-center gap-2">
          <button
            onClick={switchLocale}
            className="rounded-full border border-[#e0ddcf]/40 px-3 py-1.5 text-sm text-[#e0ddcf]/70 transition-colors hover:border-[#e0ddcf]/70 hover:text-[#e0ddcf] backdrop-blur"
            aria-label="Switch language"
          >
            {t("switchLocale")}
          </button>
          <WhatsAppButton
            className="rounded-full border border-[#e0ddcf] hover:border-[#e0ddcf]/60 backdrop-blur px-4 py-2 text-sm text-[#e0ddcf] md:px-[13px] md:py-4 md:text-[20px] md:leading-[26px]"
          >
            {t("contact")}
          </WhatsAppButton>
        </div>
      </div>
    </header>
  );
}
