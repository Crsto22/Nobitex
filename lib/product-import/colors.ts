const palette: Record<string, string> = {
  rojo: "#EF4444",
  roja: "#EF4444",
  azul: "#2563EB",
  negro: "#111827",
  negra: "#111827",
  blanco: "#FFFFFF",
  blanca: "#FFFFFF",
  verde: "#16A34A",
  amarillo: "#FACC15",
  amarilla: "#FACC15",
  gris: "#6B7280",
  celeste: "#38BDF8",
  rosado: "#EC4899",
  rosada: "#EC4899",
  morado: "#7C3AED",
  morada: "#7C3AED",
  naranja: "#F97316",
  marron: "#92400E",
  beige: "#D6C7A1",
  turquesa: "#14B8A6",
  vino: "#7F1D1D",
  dorado: "#D4AF37",
  plateado: "#C0C0C0",
};

export function suggestColorHex(name: string) {
  const key = name.trim().toLowerCase();
  return palette[key] ?? "#94A3B8";
}

export function resolveColorHex(
  name: string,
  colors: Array<{ nombre: string; hex: string | null }>,
) {
  const key = name.trim().toLowerCase();
  const match = colors.find(
    (color) => color.nombre.trim().toLowerCase() === key,
  );
  return match?.hex ?? suggestColorHex(name);
}
