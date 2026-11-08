import {
  buildShippingOgImage,
  ogImageAlt,
  ogImageContentType,
  ogImageSize,
} from "./og-image";

export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = ogImageContentType;
export const runtime = "nodejs";

export default function Image({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  return buildShippingOgImage({ params });
}
