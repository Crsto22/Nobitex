"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicShippingAgency } from "@/lib/api/shipping-links";

type AgencyMapProps = {
  agencies: PublicShippingAgency[];
  selectedExternalId: string;
  onSelect: (agency: PublicShippingAgency) => void;
};

const PERU_CENTER: [number, number] = [-75.0152, -9.19];

export function AgencyMap({ agencies, selectedExternalId, onSelect }: AgencyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: PERU_CENTER,
        zoom: 4.3,
      });
      mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
      mapRef.current.once("load", () => setIsMapReady(true));
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import("maplibre-gl").then((maplibregl) => {
      const map = mapRef.current;
      if (cancelled || !map || !isMapReady) return;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const positioned = agencies.filter((agency) => agency.latitud !== null && agency.longitud !== null);
      const bounds = new maplibregl.LngLatBounds();
      positioned.forEach((agency) => {
        const element = document.createElement("button");
        element.type = "button";
        element.title = `Seleccionar ${agency.nombre}`;
        element.setAttribute("aria-label", `Seleccionar agencia ${agency.nombre}`);
        element.className = `shipping-agency-marker ${agency.externalId === selectedExternalId ? "shipping-agency-marker-selected" : ""}`;
        element.onclick = () => onSelect(agency);

        const marker = new maplibregl.Marker({ element, anchor: "bottom" })
          .setLngLat([agency.longitud!, agency.latitud!])
          .setPopup(new maplibregl.Popup({ offset: 26 }).setHTML(`<strong>${escapeHtml(agency.nombre)}</strong><br/>${escapeHtml([agency.direccion, agency.distrito, agency.provincia].filter(Boolean).join(" · "))}`))
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([agency.longitud!, agency.latitud!]);
      });
      if (positioned.length === 1) {
        map.flyTo({ center: bounds.getCenter(), zoom: 14, essential: true });
      } else if (positioned.length > 1) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 500 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [agencies, isMapReady, onSelect, selectedExternalId]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-sidebar-bg)]">
      <div ref={containerRef} className="h-72 w-full" />
      <p className="border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-muted-foreground)]">
        Pulsa un pin para seleccionar la agencia. © OpenStreetMap contributors
      </p>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#039;" })[character] ?? character);
}
