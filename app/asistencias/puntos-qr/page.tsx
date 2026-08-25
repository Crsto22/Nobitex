"use client";

import { QrCodeIcon } from "@phosphor-icons/react/ssr";

import { AttendancePlaceholder } from "@/components/Attendance/attendance-placeholder";

export default function AsistenciasPuntosQrPage() {
  return (
    <AttendancePlaceholder
      title="Puntos QR"
      description="Puntos de marcaje por QR."
      icon={QrCodeIcon}
    />
  );
}
