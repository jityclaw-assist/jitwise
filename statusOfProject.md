# Jitwise — Project Status

**Last updated:** 2026-03-13
**Branch:** main
**Last commit:** `d2a460b feat: integrate advisor insights into client summary and exports`

---

## Roadmap Phase Completion

| Phase | Description | Estado |
|-------|-------------|--------|
| 0 | Foundation (Next.js, Supabase, TypeScript, estructura) | ✅ Completo |
| 1 | Core Estimation Engine (puntos, multipliers, rangos) | ✅ Completo |
| 2 | Estimation Interface (wizard 3 pasos, módulos, complejidad) | ✅ Completo |
| 3 | Persistence Layer (CRUD estimaciones, historial) | ✅ Completo |
| 4 | Client Summary Generator (determinístico + AI) | ✅ Completo |
| 5 | Documents System (upload, adjuntar a estimaciones) | ⏳ Parcial — infraestructura Supabase Storage lista, UI básica |
| 6 | Estimation Quality Insights | 🔲 No iniciado (page placeholder existe) |
| 7 | AI Scope Advisor | ✅ Completo (adelantado al roadmap) |
| 8 | Export System (PDF, Markdown, JSON) | ✅ Completo |
| 9 | CLI Tool | 🔲 No iniciado |
| 10 | Team Collaboration | 🔲 No iniciado |

---

## Funcionalidades implementadas

### Estimación
- Wizard de 3 pasos: selección de módulos → riesgo/urgencia → revisión
- Catálogo de módulos con complejidad (low / standard / high) y providers
- Engine determinístico: puntos base → multipliers → rangos de horas y precio
- Edición de estimaciones existentes

### Resumen del cliente
- Resumen determinístico como fallback
- Resumen AI via OpenAI (auto-generado, debounced, con abort controller)
- Los hallazgos del advisor se pasan al prompt de OpenAI para enriquecer el resumen
- Badge `+ advisor context` visible cuando el advisor ha corrido

### Scope Advisor (AI)
- Análisis de gaps, complejidad técnica, riesgos de integración, concerns operacionales, preguntas abiertas
- Selección de items para agregar al scope template
- Al generar, sube el contenido completo al wizard vía `onAnalysisChange`

### Integración advisor → resumen (último bloque de trabajo)
- `extractAdvisorInsights()` parsea determinísticamente el output del advisor
  - **Risks**: secciones de complejidad técnica, integración/infraestructura, concerns operacionales
  - **Questions**: preguntas worth clarifying
- `ClientSummaryPanel` muestra dos secciones inline después del texto del resumen:
  - `RISK FACTORS & COMPLEXITY` — justifica el precio con factores técnicos reales
  - `OPEN QUESTIONS` — items pendientes de clarificar antes de cerrar la estimación
- Export de markdown incluye ambas secciones al final del archivo
- Al guardar la estimación, `advisorContent` se envía al servidor → los insights se almacenan en `clientSummary.advisorInsights`
- PDF renderiza `RISK FACTORS & COMPLEXITY` y `OPEN QUESTIONS` como secciones dedicadas si existen

### Scope Template
- Generación determinística desde módulos seleccionados + items del advisor
- Generación AI via `/api/templates/scope` usando el resumen + items del advisor
- Copy to clipboard + Export `.md`

### Exports
- **PDF**: `@react-pdf/renderer`, generado server-side, incluye scope table, rangos, multipliers, notas, resumen AI, y secciones del advisor
- **Markdown**: reporte completo con scope, estimaciones, riesgo/urgencia, resumen, y secciones del advisor
- **JSON**: export completo del payload de estimación

### Persistencia
- Supabase Auth (sesiones JWT)
- CRUD completo de estimaciones (`/api/estimations`)
- `clientSummary` almacenado como JSONB incluyendo `advisorInsights` cuando disponible

---

## Arquitectura de archivos clave

```
src/
  app/
    (app)/
      estimate/          # Wizard nuevo/editar
      estimations/       # Lista + detalle con exports
      insights/          # Placeholder — no implementado
    api/
      advisor/           # POST — análisis de scope con OpenAI
      estimations/       # GET/POST + [id] GET/PUT/DELETE
      summary/           # POST — resumen AI
      templates/scope/   # POST — developer checklist AI
  components/estimate/
    estimator-wizard.tsx          # Estado central del wizard
    client-summary-panel.tsx      # Resumen + secciones de advisor insights
    scope-advisor-panel.tsx       # Panel del advisor con onAnalysisChange
    scope-template-panel.tsx      # Template de developer
    client-summary-actions.tsx    # Exports en página de detalle
  lib/
    catalog/modules.ts            # Catálogo estático de módulos
    engine/calculate-estimation.ts
    summary/
      generate-client-summary.ts  # Tipo ClientSummary + generación determinística
      ai-client-summary.ts        # Generación AI con contexto del advisor
      extract-advisor-sections.ts # Parser de output del advisor → { risks, questions }
    export/
      build-markdown-export.ts    # Reporte .md
      build-json-export.ts
      pdf/EstimationPdfDocument.tsx
```

---

## Flujo de datos (estado actual)

```
Wizard step 1 → módulos seleccionados
      ↓
Wizard step 2 → riskLevel, urgencyLevel, hourlyRate
      ↓
Wizard step 3 → calculateEstimation() (sync, determinístico)
      ↓
ClientSummaryPanel → POST /api/summary { input, result, advisorContent }
      → OpenAI genera narrativa enriquecida con hallazgos del advisor
      → onSummaryTextChange() sube texto al wizard

ScopeAdvisorPanel → POST /api/advisor { input }
      → OpenAI retorna análisis en 5 secciones
      → onAnalysisChange() sube contenido al wizard
      → ClientSummaryPanel detecta cambio y regenera el resumen

[Save] → POST /api/estimations { input, advisorContent? }
      → servidor: calculateEstimation + generateClientSummary
      → servidor: extractAdvisorInsights(advisorContent)
      → servidor: generateAiClientSummaryMarkdown(input, result, advisorContent)
      → almacena { input, result, clientSummary: { ...base, summaryText: AI, advisorInsights } }

[PDF export] → GET /api/estimations/:id/export/pdf
      → lee clientSummary del DB (incluye advisorInsights si se guardaron)
      → renderEstimationPdf() → secciones RISK FACTORS + OPEN QUESTIONS si existen
```

---

## Deuda técnica / pendientes

| Item | Prioridad | Notas |
|------|-----------|-------|
| Insights page (Phase 6) | Media | Solo placeholder, sin datos |
| Documents system UI completa | Baja | Supabase Storage listo, UI mínima |
| Tests unitarios del engine | Media | `calculateEstimation` es puro, ideal para tests |
| Tests del extractor de advisor | Media | `extractAdvisorInsights` es puro, 100% testeable |
| Rate limiting en rutas de AI | Alta | Sin protección actual contra abuso |
| Error boundaries en el wizard | Baja | Failures de AI ya manejados con fallback |
| Estimations list pagination | Baja | Actualmente carga todas las estimaciones |
| CLI (Phase 9) | Baja | No planificado aún |
