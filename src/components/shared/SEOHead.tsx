import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
}

const BASE_URL = "https://quotrai.lovable.app";
const DEFAULT_OG = "https://storage.googleapis.com/gpt-engineer-file-uploads/2fbjCiwqjfZ3NWb65g3XjQ8mYNE2/social-images/social-1769007219850-quotr appicon.png";

export function SEOHead({ title, description, path = "/", ogImage = DEFAULT_OG }: SEOHeadProps) {
  const url = `${BASE_URL}${path}`;
  const fullTitle = title.includes("Foreman") ? title : `${title} | Foreman`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Foreman" />
    </Helmet>
  );
}
