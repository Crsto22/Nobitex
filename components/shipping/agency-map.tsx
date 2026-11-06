"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicShippingAgency } from "@/lib/api/shipping-links";
import type { SaleShippingAgency } from "@/lib/api/sales";

type AgencyMapProps = {
  agencies: PublicShippingAgency[];
  selectedExternalId: string;
  onSelect: (agency: PublicShippingAgency) => void;
  courier: SaleShippingAgency;
  userLocation?: { latitude: number; longitude: number } | null;
};

const PERU_CENTER: [number, number] = [-9.19, -75.0152];

export function AgencyMap({
  agencies,
  selectedExternalId,
  onSelect,
  courier,
  userLocation,
}: AgencyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void import("leaflet").then((leafletModule) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = leafletModule.default;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(PERU_CENTER, 5);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setIsMapReady(true);
    });

    return () => {
      cancelled = true;
      markersRef.current?.clearLayers();
      markersRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void import("leaflet").then((leafletModule) => {
      const L = leafletModule.default;
      const map = mapRef.current;
      const markers = markersRef.current;
      if (cancelled || !map || !markers || !isMapReady) return;

      markers.clearLayers();
      const positioned = agencies.filter(
        (agency) => agency.latitud !== null && agency.longitud !== null,
      );
      const bounds = L.latLngBounds([]);

      positioned.forEach((agency) => {
        const markerButton = document.createElement("button");
        markerButton.type = "button";
        markerButton.title = `Seleccionar ${agency.nombre}`;
        markerButton.setAttribute(
          "aria-label",
          `Seleccionar agencia ${agency.nombre}`,
        );
        markerButton.className = `shipping-agency-marker shipping-agency-marker-${courier.toLowerCase()} ${
          agency.externalId === selectedExternalId
            ? "shipping-agency-marker-selected"
            : ""
        }`;
        markerButton.onclick = () => onSelect(agency);

        const popup = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = agency.nombre;
        const address = document.createElement("p");
        address.textContent = [
          agency.direccion,
          agency.distrito,
          agency.provincia,
        ]
          .filter(Boolean)
          .join(" · ");
        popup.append(name, address);

        L.marker([agency.latitud!, agency.longitud!], {
          icon: L.divIcon({
            html: markerButton,
            className: "",
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -34],
          }),
          title: agency.nombre,
        })
          .bindPopup(popup)
          .addTo(markers);

        bounds.extend([agency.latitud!, agency.longitud!]);
      });

      if (userLocation) {
        const locationDot = document.createElement("span");
        locationDot.className = "shipping-user-location-marker";
        locationDot.setAttribute("aria-label", "Tu ubicación");
        L.marker([userLocation.latitude, userLocation.longitude], {
          icon: L.divIcon({
            html: locationDot,
            className: "",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          title: "Tu ubicación",
          zIndexOffset: 1000,
        })
          .bindPopup("Tu ubicación")
          .addTo(markers);
        bounds.extend([userLocation.latitude, userLocation.longitude]);
      }

      if (positioned.length === 1 && !userLocation) {
        map.flyTo(bounds.getCenter(), 14, { duration: 0.5 });
      } else if (positioned.length > 1 || userLocation) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      }

      window.setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      cancelled = true;
    };
  }, [agencies, courier, isMapReady, onSelect, selectedExternalId, userLocation]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-sidebar-bg)]">
      <div ref={containerRef} className="h-72 w-full" />
      <p className="border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-muted-foreground)]">
        Pulsa un pin para seleccionar la agencia. © OpenStreetMap contributors
      </p>
    </div>
  );
}
