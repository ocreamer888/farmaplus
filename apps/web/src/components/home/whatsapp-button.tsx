import type { ReactNode } from "react";

type WhatsAppButtonProps = {
  className?: string;
  children?: ReactNode;
};

const WHATSAPP_NUMBER = "50687235555";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export function WhatsAppButton({
  className,
  children = "WhatsApp",
}: WhatsAppButtonProps) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      className={className}
      aria-label="Abrir WhatsApp"
    >
      {children}
    </a>
  );
}
