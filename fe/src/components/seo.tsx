import Head from "next/head";

const SITE_NAME = "Fortune Teller";
const DEFAULT_DESCRIPTION =
  "Το ψηφιακό σου μαντείο. Ανάγνωση καφέ, ταρό και αστρολογία με τεχνητή νοημοσύνη.";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://fortuneteller.gr";
const DEFAULT_OG_IMAGE = `${APP_URL}/og-image.png`;

interface SeoProps {
  title: string;
  description?: string;
  /** Prevent indexing — use for auth-protected pages */
  noindex?: boolean;
  ogImage?: string;
  /** Pass true for the homepage to skip the " | Fortune Teller" suffix */
  isHome?: boolean;
}

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
  isHome = false,
}: SeoProps) {
  const fullTitle = isHome ? title : `${title} | ${SITE_NAME}`;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}
