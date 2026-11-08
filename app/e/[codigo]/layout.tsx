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
    const title = `${business} — Datos de envío`;
    const description = `Completa tus datos de envío para tu pedido ${link.venta.correlativo}.`;

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
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
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
