export const HEADER_LOGO_SRC = "/farmaplus-logo-white.png";

export const SECTION_LOGO_SRC = "/farmaplus-logo-w.svg";


/** Verified from brand messaging (Huacas, Guanacaste). Add phone/email when operational details are confirmed. */
export const CONTACT: {
  address: string;
  phone: string | null;
  email: string | null;
  mapsEmbedSrc: string;
} = {
  address: "Cruce de Huacas, Guanacaste, Costa Rica",
  phone: null,
  email: null,
  /** Google Maps embed (area search; not a verified storefront pin). */
  mapsEmbedSrc:
    "https://maps.google.com/maps?q=Huacas%2C%20Santa%20Cruz%2C%20Guanacaste%2C%20Costa%20Rica&hl=es&z=12&ie=UTF8&iwloc=&output=embed",
};

export const CONTACT_SERVICE_ROWS: { label: string; detail: string; whatsappLink: string }[] = [
  { label: "Farmacia", detail: "24/7", whatsappLink: "https://wa.me/50672355555" },
  { label: "Telemedicina", detail: "WhatsApp", whatsappLink: "https://wa.me/50672355555" },
  { label: "Farmacia express", detail: "WhatsApp", whatsappLink: "https://wa.me/50672355555" },
];
