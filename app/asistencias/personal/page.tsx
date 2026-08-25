"use client";

import { UsersThreeIcon } from "@phosphor-icons/react/ssr";

import { AttendancePlaceholder } from "@/components/Attendance/attendance-placeholder";

export default function AsistenciasPersonalPage() {
  return (
    <AttendancePlaceholder
      title="Personal"
      description="Gestion de empleados para asistencias."
      icon={UsersThreeIcon}
    />
  );
}
