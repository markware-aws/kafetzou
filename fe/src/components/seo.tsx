import Head from "next/head";

// Hardcoded rather than read from NEXT_PUBLIC_APP_URL: a local or preview build must never
// emit canonical URLs that point anywhere but the production host.
export const SITE_URL = "https://www.fortuneteller.gr";
export const SITE_NAME = "Fortune Teller";
/** 1200×630 share image, see public/og-image.png. */
const SHARE_IMAGE_URL = `${SITE_URL}/og-image.png`;

interface IndexablePageSeo {
  /** Page title without the brand; " | Fortune Teller" is appended. */
  title: string;
  /** Search-result snippet, ideally 120–155 characters. */
  description: string;
  /** Canonical path with a trailing slash (next.config uses trailingSlash), e.g. "/astrology/". */
  path: string;
  noindex?: false;
}

/** Pages behind login, tied to one user, or too thin to rank: a tab title, kept out of search. */
interface PrivatePageSeo {
  title: string;
  noindex: true;
}

type SeoProps = IndexablePageSeo | PrivatePageSeo;

/**
 * Per-page <head> tags for public pages. Guarded pages get theirs from <AuthGuard title>:
 * the guard renders its children only after the client-side auth check, so a <Seo> placed
 * inside it would never reach the exported HTML.
 */
export function Seo(props: SeoProps) {
  const fullTitle = `${props.title} | ${SITE_NAME}`;

  if (props.noindex) {
    return (
      <Head>
        <title>{fullTitle}</title>
        <meta name="robots" content="noindex" />
      </Head>
    );
  }

  const url = `${SITE_URL}${props.path}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={props.description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="el_GR" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={props.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={SHARE_IMAGE_URL} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  );
}
