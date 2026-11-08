import { ImageResponse } from "next/og";

import { API_BASE_URL } from "@/lib/api/client";
import {
  shippingLinksApi,
  type PublicShippingLink,
} from "@/lib/api/shipping-links";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";
export const ogImageAlt = "Datos de envío";

type ShippingOgImageProps = {
  params: Promise<{ codigo: string }>;
};

async function loadLink(codigo: string): Promise<PublicShippingLink | null> {
  try {
    return await shippingLinksApi.findOne(codigo);
  } catch {
    return null;
  }
}

async function resolveLogoSource(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;

  const candidate = /^https?:\/\//i.test(logoUrl)
    ? logoUrl
    : logoUrl.startsWith("/")
      ? `${API_BASE_URL}${logoUrl}`
      : null;

  if (!candidate) return null;

  try {
    const response = await fetch(candidate);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 5_000_000) return null;

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function buildShippingOgImage({ params }: ShippingOgImageProps) {
  const { codigo } = await params;
  const link = await loadLink(codigo);

  const business =
    link?.negocio.nombreComercial?.trim() || "Formulario de envío";
  const correlativo = link?.venta.correlativo?.trim();
  const logo = await resolveLogoSource(link?.negocio.logoUrl ?? null);
  const initial = business.slice(0, 1).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #070d33 0%, #101D69 55%, #1f2f9e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: 420,
            background: "rgba(255,255,255,0.08)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            right: 180,
            width: 380,
            height: 380,
            borderRadius: 380,
            background: "rgba(99,102,241,0.28)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 30,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              overflow: "hidden",
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt={business}
                width={100}
                height={100}
                style={{ width: 100, height: 100, objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontSize: 60, fontWeight: 800, color: "#101D69" }}>
                {initial}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 760,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                color: "#a5b4fc",
              }}
            >
              DATOS DE ENVÍO
            </span>
            <span
              style={{
                fontSize: business.length > 22 ? 46 : 56,
                fontWeight: 800,
                lineHeight: 1.05,
                marginTop: 8,
              }}
            >
              {business}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 44,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 34, fontWeight: 700, color: "#e0e7ff" }}>
            Confirma cómo quieres recibir tu pedido
          </span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: "#c7d2fe",
              marginTop: 14,
            }}
          >
            Completa tus datos y elige el método de envío en pocos pasos.
          </span>
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 3,
                color: "#a5b4fc",
              }}
            >
              PEDIDO
            </span>
            <span style={{ fontSize: 42, fontWeight: 800, marginTop: 6 }}>
              {correlativo || "Enlace de envío"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              padding: "14px 26px",
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700 }}>
              Formulario seguro con Nuvex
            </span>
          </div>
        </div>
      </div>
    ),
    { ...ogImageSize },
  );
}
