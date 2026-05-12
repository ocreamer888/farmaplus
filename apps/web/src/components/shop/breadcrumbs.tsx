import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[#e0ddcf]/60">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-[#e0ddcf]">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-[#e0ddcf]">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
