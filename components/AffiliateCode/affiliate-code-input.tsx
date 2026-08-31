"use client";

import { useState } from "react";
import { TagIcon } from "@phosphor-icons/react/ssr";

import { plansApi } from "@/lib/api/plans";

export function AffiliateCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [input, setInput] = useState(value);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      onChange("");
      setMessage("");
      return;
    }
    setLoading(true);
    try {
      const result = await plansApi.validateAffiliateCode(code);
      if (!result.valid) {
        onChange("");
        setMessage(
          result.reason === "inactive"
            ? "El código está inactivo."
            : "Código no válido.",
        );
        return;
      }
      setInput(result.code);
      onChange(result.code);
      setMessage(`Código aplicado: ${result.discountPercent}% de descuento.`);
    } catch (error) {
      onChange("");
      setMessage(
        error instanceof Error ? error.message : "No se pudo validar.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#10b981]/10 text-[#059669]">
          <TagIcon size={19} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-circular-bold text-[var(--color-text)]">
            Código de afiliación
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Disponible solo durante la prueba o antes de la primera compra.
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => {
            setInput(event.target.value.toUpperCase());
            onChange("");
            setMessage("");
          }}
          onBlur={() => void validate()}
          maxLength={30}
          placeholder="Código de afiliado"
          className="h-11 min-w-0 flex-1 rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm font-circular-bold uppercase text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        <button
          type="button"
          onClick={() => void validate()}
          disabled={loading || !input.trim()}
          className="h-11 rounded-[12px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white disabled:opacity-50"
        >
          {loading ? "Validando..." : "Aplicar"}
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
