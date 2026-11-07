import Head from "next/head";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SITE_URL } from "@/components/seo";

export interface Crumb {
  label: string;
  /** Path with a trailing slash, e.g. "/taro/". */
  path: string;
}

/** Visible trail plus BreadcrumbList structured data. "Αρχική" is added automatically. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: "Αρχική", path: "/" }, ...items];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          // JSON.stringify output is safe here: labels are our own content, not user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <nav aria-label="Διαδρομή" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-violet-300">
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1">
                {isLast ? (
                  <span aria-current="page" className="text-violet-200">
                    {crumb.label}
                  </span>
                ) : (
                  <>
                    <Link href={crumb.path} className="hover:text-violet-50 transition-colors">
                      {crumb.label}
                    </Link>
                    <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
