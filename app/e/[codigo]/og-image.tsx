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

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [16, 29, 105];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function shiftColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const shift = (channel: number) =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(
          amount >= 0
            ? channel + (255 - channel) * amount
            : channel * (1 + amount),
        ),
      ),
    );
  return `rgb(${shift(r)}, ${shift(g)}, ${shift(b)})`;
}

function previewGradient(color: string): string {
  return `linear-gradient(135deg, ${shiftColor(color, -0.28)} 0%, ${color} 55%, ${shiftColor(color, 0.22)} 100%)`;
}

function previewTextColor(color: string): string {
  const [r, g, b] = hexToRgb(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
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
  const preview = link?.preview ?? null;
  const previewColor = preview?.colorPrimario ?? "";
  const color = /^#[0-9a-fA-F]{6}$/.test(previewColor) ? previewColor : "#101D69";
  const textoCentral =
    preview?.textoCentral?.trim() || "Registra tu envío";
  const textColor = previewTextColor(color);
  const mutedColor =
    textColor === "#ffffff" ? "rgba(255,255,255,0.78)" : "rgba(17,24,39,0.72)";
  const overlayColor =
    textColor === "#ffffff" ? "rgba(255,255,255,0.08)" : "rgba(17,24,39,0.06)";
  const escala = (preview?.escalaContenido ?? 100) / 100;

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
          background: previewGradient(color),
          color: textColor,
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
            background: overlayColor,
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
            background: overlayColor,
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
              width: Math.round(112 * escala),
              height: Math.round(112 * escala),
              borderRadius: Math.round(28 * escala),
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: Math.round(14 * escala),
              overflow: "hidden",
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt={business}
                width={Math.round(84 * escala)}
                height={Math.round(84 * escala)}
                style={{
                  width: Math.round(84 * escala),
                  height: Math.round(84 * escala),
                  objectFit: "contain",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: Math.round(52 * escala),
                  fontWeight: 800,
                  color: "#101D69",
                }}
              >
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
                color: mutedColor,
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

        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            marginBottom: 22,
          }}
        >
          <span
            style={{
              fontSize: textoCentral.length > 22 ? 46 : 56,
              fontWeight: 900,
              lineHeight: 1.08,
              maxWidth: 880,
              color: "#ffffff",
              background: "rgba(0,0,0,0.45)",
              borderRadius: 999,
              padding: "14px 30px",
            }}
          >
            {textoCentral}
          </span>
        </div>

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
                color: mutedColor,
              }}
            >
              PEDIDO
            </span>
            <span
              style={{
                fontSize: 42,
                fontWeight: 800,
                marginTop: 6,
              }}
            >
              {correlativo || "Enlace de envío"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderRadius: 999,
              background: overlayColor,
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
