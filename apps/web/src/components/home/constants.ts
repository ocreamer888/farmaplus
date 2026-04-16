export const HEADER_LOGO_SRC = encodeURI(
  "/trumprx.gov (English-US) by html.to.design ❤️ FREE version - 14/04/Capa_1.png",
);

export const SECTION_LOGO_SRC = encodeURI(
  "/trumprx.gov (English-US) by html.to.design ❤️ FREE version - 14/04/Isolation_Mode.svg",
);

/** Verified from brand messaging (Huacas, Guanacaste). Add phone/email when operational details are confirmed. */
export const CONTACT: {
  address: string;
  phone: string | null;
  email: string | null;
  mapsEmbedSrc: string;
} = {
  address: "Huacas, Guanacaste, Costa Rica",
  phone: null,
  email: null,
  /** Google Maps embed (area search; not a verified storefront pin). */
  mapsEmbedSrc:
    "https://maps.google.com/maps?q=Huacas%2C%20Santa%20Cruz%2C%20Guanacaste%2C%20Costa%20Rica&hl=es&z=12&ie=UTF8&iwloc=&output=embed",
};

export const CONTACT_SERVICE_ROWS: { label: string; detail: string }[] = [
  { label: "Farmacia", detail: "24/7" },
  { label: "Telemedicina", detail: "WhatsApp" },
  { label: "Farmacia express", detail: "WhatsApp" },
];
