<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agentes especializados

- Para cambios de envios, codigos, catalogos, XML/UBL, CDR, tickets, estados o validaciones SUNAT, usar el agente especializado definido en `docs/agents/sunat-envios-agent.md`.
- Ese agente solo debe tocar codigo relacionado con SUNAT y debe verificar cada actualizacion contra fuentes oficiales vigentes antes de modificar el proyecto.
