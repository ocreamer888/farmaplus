import Image from "next/image";

import { CONTACT, CONTACT_SERVICE_ROWS } from "./constants";
import { WhatsAppButton } from "./whatsapp-button";

export function ContactSection() {
  return (
    <section
      id="contact"
      className="relative scroll-mt-24"
    >
      <div className="grid min-h-0 grid-cols-1 gap-4 p-4 md:min-h-[85vh] md:p-6 lg:grid-cols-[1fr_700px] xl:grid-cols-[1fr_800px]">
        <div className="relative border border-[#e0ddcf]/15 h-[70vh] min-h-[320px] overflow-hidden rounded-[42px] lg:h-full lg:min-h-[560px]"
        style={{
          backgroundImage:
            "linear-gradient(344deg, rgba(33, 64, 29, 0.2) 14.951%, rgba(76, 120, 57, 0.2) 81.354%)",
        }}>
          
          <div className="absolute inset-0 bg-[#222721]/35" />
          <div className="relative flex h-full w-full flex-col items-center justify-center p-6 md:p-10 lg:items-start lg:justify-end">
            <h2 className="max-w-[14ch] text-center font-serif text-5xl leading-[0.95] text-[#fffff3] md:text-7xl lg:text-left lg:text-8xl text-balance">
              Contacto
            </h2>
            <p className="mt-4 max-w-md text-center text-lg tracking-tight text-[#e0ddcf] lg:text-left">
              Telemedicina, farmacia 24/7 y farmacia express en Huacas, Guanacaste.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col items-stretch justify-between gap-4 md:flex-row">
            <div className="flex h-full min-h-[280px] flex-1 flex-col justify-between rounded-[42px] border border-[#e0ddcf]/20 bg-[#222721]/40 p-8 backdrop-blur-sm md:p-10">
              <h3 className="mb-8 flex w-full justify-center text-2xl font-light text-[#fffff3] md:justify-start">
                Servicios
              </h3>
              <div className="space-y-4">
                {CONTACT_SERVICE_ROWS.map((row) => (
                  <a href={row.whatsappLink} target="_blank" rel="noreferrer">
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-[#e0ddcf]"
                  >
                    <span className="text-sm tracking-wide md:text-base">
                      {row.label}
                    </span>
                    <span className="mx-3 flex-1 border-b border-dotted border-[#408733]/40" />
                    <span className="text-sm font-light md:text-base">
                      {row.detail}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-[42px] border border-[#e0ddcf]/10 md:min-h-[300px]">
              <iframe
                title="Mapa — Huacas, Guanacaste"
                src={CONTACT.mapsEmbedSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 min-h-[280px] w-full"
              />
            </div>
          </div>

          <div className="flex w-full h-full flex-col items-start justify-between rounded-[42px] border border-[#e0ddcf]/20 bg-[#222721]/40 p-8 backdrop-blur-sm md:p-10">
            <h3 className="mb-8 text-center text-2xl font-light text-[#fffff3] md:text-3xl">
              Datos de contacto
            </h3>
            <div className="flex w-full flex-col h-full justify-center gap-6 text-[#e0ddcf]">
              <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-xs tracking-wider text-[#e0ddcf]/60">
                  Ubicación
                </p>
                <span className="mx-3 flex-1 border-b border-dotted border-[#408733]/40" />
                <p className="text-base md:text-lg">{CONTACT.address}</p>
              </div>

              {CONTACT.phone ? (
                <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs tracking-wider text-[#e0ddcf]/60">
                    Teléfono
                  </p>
                  <a
                    href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                    className="text-base transition-colors hover:text-[#fffff3] md:text-lg"
                  >
                    {CONTACT.phone}
                  </a>
                </div>
              ) : null}

              {CONTACT.email ? (
                <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs tracking-wider text-[#e0ddcf]/60">
                    Correo
                  </p>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="text-base break-all transition-colors hover:text-[#fffff3] md:text-lg"
                  >
                    {CONTACT.email}
                  </a>
                </div>
              ) : null}

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs tracking-wider text-[#e0ddcf]/60">
                  WhatsApp
                </p>
                <span className="mx-3 flex-1 border-b border-dotted border-[#408733]/40" />
                <WhatsAppButton
              className="flex h-[56px] w-[70%] items-center justify-center rounded-[62px] bg-[#408733] text-[15px] text-[#eceadd]">
                WhatsApp
              </WhatsAppButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
