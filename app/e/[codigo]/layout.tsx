import type { Metadata } from "next";

import { shippingLinksApi } from "@/lib/api/shipping-links";

type EnvioLayoutProps = {
  children: React.ReactNode;
};

type EnvioMetadataProps = {
  params: Promise<{ codigo: string }>;
};

export async function generateMetadata({
  params,
}: EnvioMetadataProps): Promise<Metadata> {
  const { codigo } = await params;
  const path = `/e/${codigo}`;

  try {
    const link = await shippingLinksApi.findOne(codigo);
    const business =
      link.negocio.nombreComercial?.trim() || "Formulario de envío";
    const preview = link.preview ?? null;
    const title =
      preview?.titulo?.trim() || `${business} — Datos de envío`;
    const description =
      preview?.descripcion?.trim() ||
      `Completa tus datos de envío para tu pedido ${link.venta.correlativo}.`;
    const version = preview?.actualizadoAt
      ? `?v=${encodeURIComponent(preview.actualizadoAt)}`
      : "";
    const imagePath = `${path}/opengraph-image${version}`;

    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: {
        type: "website",
        siteName: "Nuvex",
        title,
        description,
        url: path,
        images: [
          {
            url: imagePath,
            width: 1200,
            height: 630,
            alt: "Datos de envío",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imagePath],
      },
    };
  } catch {
    const title = "Enlace no disponible";
    const description =
      "Solicita al negocio un nuevo enlace para registrar tus datos de envío.";

    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        type: "website",
        siteName: "Nuvex",
        title,
        description,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  }
}

export default function EnvioLayout({ children }: EnvioLayoutProps) {
  return children;
}
