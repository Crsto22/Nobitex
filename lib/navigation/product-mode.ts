const posEntryModuleKeys = new Set([
  "dashboard",
  "ventas-pos",
  "productos",
  "caja",
]);

export function getProductModeFromModuleKeys(
  moduleKeys: readonly string[] = [],
) {
  const hasAttendanceModules = moduleKeys.some((key) =>
    key.startsWith("asistencias-"),
  );
  const hasPosModules = moduleKeys.some((key) => posEntryModuleKeys.has(key));

  return {
    hasAttendanceModules,
    hasPosModules,
    attendanceOnly: hasAttendanceModules && !hasPosModules,
    posOnly: hasPosModules && !hasAttendanceModules,
    both: hasAttendanceModules && hasPosModules,
  };
}
