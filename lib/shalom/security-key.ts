/**
 * Mismas reglas que aplica shalom-service antes de encolar el registro.
 * Shalom rechaza claves consecutivas (1234, 4321) y con un solo digito
 * repetido (1111). Validar aqui evita gastar un intento del job.
 */
export function securityKeyIssue(key: string): string | null {
  if (!/^\d{4}$/.test(key)) {
    return "La clave debe tener exactamente 4 dígitos";
  }

  const digits = key.split("").map(Number);

  if (new Set(digits).size === 1) {
    return "Shalom rechaza claves con el mismo dígito repetido (ej. 1111)";
  }

  const consecutive = digits.every((digit, index) => {
    if (index === 0) return true;
    const previous = digits[index - 1] ?? 0;
    return Math.abs(digit - previous) === 1;
  });

  if (consecutive) {
    return "Shalom rechaza claves consecutivas (ej. 1234)";
  }

  return null;
}

/** Genera una clave de 4 digitos valida para Shalom. */
export function generateSecurityKey(): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const candidate = String(1000 + (buffer[0] % 9000));
    if (!securityKeyIssue(candidate)) return candidate;
  }

  return "1962";
}
