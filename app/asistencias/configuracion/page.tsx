"use client";

import { GearSixIcon } from "@phosphor-icons/react/ssr";

import { AttendancePlaceholder } from "@/components/Attendance/attendance-placeholder";

export default function AsistenciasConfiguracionPage() {
  return (
    <AttendancePlaceholder
      title="Configuración"
      description="Reglas y parametros de asistencias."
      icon={GearSixIcon}
    />
  );
}
