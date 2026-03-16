# Jitwise — Estado actual del proyecto

> Documento de referencia técnica. Describe la funcionalidad implementada, cómo funciona cada parte del sistema, y el estado real de cada fase del roadmap.
> Última actualización: marzo 2026.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, server + client components) |
| Lenguaje | TypeScript (strict mode) |
| Estilos | TailwindCSS |
| Base de datos + Auth | Supabase (PostgreSQL + Row Level Security) |
| Storage | Supabase Storage |
| IA | OpenAI API (`OPENAI_API_KEY`, `OPENAI_MODEL` configurables) |
| Notificaciones UI | Sileo (`sileo`) |
| Gestor de paquetes | pnpm |
| Despliegue | Vercel (implícito por estructura App Router) |

---

## Arquitectura general

```
src/
├── app/
│   ├── (app)/                    # Layout autenticado
│   │   ├── estimate/             # Crear nueva estimación
│   │   ├── estimate/[id]/        # Editar estimación guardada
│   │   ├── estimations/          # Lista de estimaciones
│   │   ├── estimations/[id]/     # Vista detallada de estimación guardada
│   │   └── insights/             # Métricas de calidad
│   └── api/
│       ├── advisor/              # POST — Scope Advisor (IA)
│       ├── summary/              # POST — Client Summary (IA)
│       ├── templates/scope/      # POST — Scope Template (IA)
│       ├── estimations/          # GET + POST
│       ├── estimations/[id]/     # GET + PUT + DELETE
│       ├── estimations/[id]/outcome/   # GET + PUT
│       ├── estimations/[id]/export/pdf/ # GET
│       └── documents/            # GET + POST + [id] GET/DELETE
├── components/estimate/          # Todos los componentes de UI de estimación
├── lib/
│   ├── catalog/modules.ts        # Catálogo de módulos
│   ├── engine/                   # Motor de cálculo determinístico
│   ├── schema/estimation.ts      # Tipos Zod validados
│   ├── summary/                  # Generador de client summary
│   └── export/                   # Builders de exportación (MD, JSON)
```

---

## Base de datos (Supabase)

### Tablas implementadas

**`estimations`**
- `id` UUID, PK
- `user_id` UUID FK → auth.users
- `created_at` timestamp
- `input` JSONB — `EstimationInput` (modules[], riskLevel, urgencyLevel, hourlyRate)
- `result` JSONB — `EstimationResult` (baseScopePoints, riskMultiplier, urgencyMultiplier, hoursRange, pricingRange)
- `client_summary` JSONB — `ClientSummary` (summaryText, advisorContent, templateContent, advisorInsights, scope[], ranges)

**`estimation_outcomes`**
- `id` UUID, PK
- `estimation_id` UUID FK → estimations
- `user_id` UUID FK → auth.users
- `actual_hours` numeric nullable
- `actual_cost` numeric nullable
- `completed_at` timestamp nullable
- `notes` text nullable
- `created_at` / `updated_at` timestamps

**`documents`**
- `id` UUID, PK
- `estimation_id` UUID FK → estimations
- `user_id` UUID FK → auth.users
- `title` text
- `original_name` text
- `storage_path` text (ruta en Supabase Storage)
- `mime_type` text nullable
- `size_bytes` integer nullable
- `created_at` timestamp

**`profiles`**
- Tabla de perfiles de usuario (referenciada en arquitectura, vinculada a auth.users)

Todas las tablas tienen Row Level Security (RLS) habilitado. El acceso siempre filtra por `user_id = auth.uid()`.

---

## Motor de estimación (determinístico)

**Archivo:** `src/lib/engine/calculate-estimation.ts`

El motor es una función pura y determinística. No hace llamadas externas. Dado el mismo `EstimationInput` siempre produce el mismo `EstimationResult`.

### Fórmula de cálculo

```
baseScopePoints = Σ points[moduleId][complexity]

hoursMin      = baseScopePoints × 1.5 × riskMultiplier × urgencyMultiplier
hoursProbable = baseScopePoints × 2.5 × riskMultiplier × urgencyMultiplier
hoursMax      = baseScopePoints × 4.0 × riskMultiplier × urgencyMultiplier

costMin      = hoursMin      × hourlyRate
costProbable = hoursProbable × hourlyRate
costMax      = hoursMax      × hourlyRate
```

### Multiplicadores de riesgo

| Nivel | Multiplicador |
|---|---|
| Low | 1.00 |
| Medium | 1.15 |
| High | 1.30 |

### Multiplicadores de urgencia

| Nivel | Multiplicador |
|---|---|
| Normal | 1.00 |
| Expedite | 1.20 |
| Rush | 1.40 |

Todos los resultados se redondean a la décima más cercana (`Math.round(value * 10) / 10`).

---

## Catálogo de módulos

**Archivo:** `src/lib/catalog/modules.ts`

16 módulos definidos, cada uno con 3 niveles de complejidad (`low`, `standard`, `high`), cada nivel con un valor de puntos y descripción específica.

| Módulo | Categoría | Pts (L/S/H) |
|---|---|---|
| Authentication | Core | 3 / 6 / 10 |
| User Profile | Core | 2 / 4 / 7 |
| Onboarding Flow | Core | 2 / 5 / 9 |
| Landing / Marketing Pages | Core | 2 / 4 / 7 |
| Payments | Commerce | 4 / 8 / 13 |
| Dashboard | Data | 5 / 9 / 14 |
| Search | Data | 3 / 6 / 10 |
| Analytics & Tracking | Data | 2 / 4 / 7 |
| API Integrations | Infrastructure | 4 / 8 / 12 |
| Notifications | Infrastructure | 2 / 4 / 7 |
| File Storage | Infrastructure | 2 / 5 / 9 |
| Real-time Features | Infrastructure | 3 / 7 / 12 |
| Admin Panel | Internal | 3 / 6 / 9 |
| Multi-tenancy | Internal | 5 / 10 / 16 |
| Roles & Permissions | Internal | 3 / 6 / 10 |

Algunos módulos tienen campo `providers` opcional (ej: Authentication → Supabase, Auth0, NextAuth.js, Firebase).

---

## Flujo del wizard de estimación

**Rutas:**
- Nueva estimación: `/estimate`
- Editar existente: `/estimate/[id]`

**Componente principal:** `src/components/estimate/estimator-wizard.tsx`

El wizard tiene 3 pasos lineales. El estado se mantiene en el cliente.

---

### Paso 1 — Selección de módulos

- Se muestran todos los módulos del catálogo agrupados por categoría.
- El usuario hace clic en un módulo para seleccionarlo/deseleccionarlo.
- Por cada módulo seleccionado aparece un selector de complejidad (`low` / `standard` / `high`).
- Si el módulo tiene providers definidos, aparece un selector de proveedor (opcional).
- El botón "Continue" se activa cuando hay al menos un módulo seleccionado.

---

### Paso 2 — Parámetros del proyecto

Tiene dos secciones:

**Sección de estimación:**
- Risk level: `low` / `medium` / `high` (radio buttons con descripción)
- Urgency level: `normal` / `expedite` / `rush` (radio buttons con descripción)
- Hourly rate: input numérico ($/hr)

**Sección de contexto del proyecto** (alimenta al Scope Advisor, no afecta el cálculo):
- Project type (texto libre: SaaS, marketplace, etc.)
- Delivery phase (texto libre: MVP, v2, etc.)
- Team size (texto libre: solo dev, 2 devs, etc.)
- Tech stack (texto libre)
- Additional notes (textarea)

---

### Paso 3 — Resultados con pestañas

El motor se ejecuta en el cliente cuando el usuario llega al paso 3. Los resultados se muestran en 4 pestañas. El estado de cada pestaña persiste mientras se navega entre ellas (los componentes quedan montados con CSS `hidden`, no se desmontan).

**Tarjeta hero** (siempre visible sobre las pestañas):
- Probable hours / Probable cost
- Min–max ranges
- Risk badge + urgency badge

#### Pestaña 1 — Breakdown

- Tabla de esfuerzo por módulo: pts, % del total, hrs probable, rango, costo probable.
- Fórmula: `(modulePts / baseScopePoints) × totalHours.probable` (ratio proporcional).
- Summary de multiplicadores: baseScopePoints, riskMultiplier, urgencyMultiplier, hourlyRate.
- Rangos completos (min / probable / max) de horas y pricing.

#### Pestaña 2 — Client Summary

- Componente: `ClientSummaryPanel`
- Al entrar a esta pestaña por primera vez se llama automáticamente a `POST /api/summary` con el input de estimación + el `advisorContent` si ya fue generado.
- El resultado es un texto markdown generado por IA que resume el proyecto de forma profesional para enviar al cliente.
- Si ya hay contenido guardado (`initialGeneratedText`), **no** se regenera. Se usa lo guardado directamente.
- El usuario puede copiar el texto o exportarlo como `.md`.
- Si hay advisor content, se muestra una sección adicional con riesgos y preguntas extraídas del análisis del advisor.

#### Pestaña 3 — Advisor

- Componente: `ScopeAdvisorPanel`
- El usuario pulsa "Analyze scope" manualmente (no es automático).
- Llama a `POST /api/advisor` con: input de estimación, project context (del paso 2), y títulos de documentos adjuntos.
- La respuesta es un análisis markdown estructurado **por módulo**, con secciones:
  - `## Module Analysis` — para cada módulo seleccionado: missing considerations, technical complexity, integration risks, questions.
  - `## Cross-cutting Concerns` — Infrastructure & Deployment, Operational Concerns, Top Questions.
- Temperatura OpenAI: 0.2 (respuestas consistentes).
- Tras generar, se extrae el contenido en el `ClientSummaryPanel` para enriquecer el summary con advisor context.
- El checklist de items (bullet points del análisis) permite seleccionar items y agregarlos al scope template.

#### Pestaña 4 — Template

- Componente: `ScopeTemplatePanel`
- El usuario pulsa "Generate template" manualmente.
- Llama a `POST /api/templates/scope` con el input + el advisorContent completo.
- Genera un checklist markdown de desarrollo con secciones como: setup, módulo por módulo, deployment & ops checklist.
- El usuario puede editar el template en un textarea directamente.
- Puede copiar el template o exportarlo como `.md`.
- Los items seleccionados del advisor (pestaña 3) pueden insertarse en el template.

---

### Guardar una estimación

Al pulsar "Save estimate":
1. Se envía `POST /api/estimations` (nueva) o `PUT /api/estimations/[id]` (editar).
2. El body incluye: `input`, `result`, y opcionalmente `summaryMarkdown`, `advisorContent`, `templateContent`.
3. Si `summaryMarkdown` está presente, el servidor lo almacena directamente **sin llamar a OpenAI** para regenerar.
4. Todo se guarda en el campo JSONB `client_summary` de la tabla `estimations`.
5. Sileo muestra un toast de éxito o error.

---

## Vista de estimación guardada

**Ruta:** `/estimations/[id]`
**Componente principal:** `EstimationViewTabs` (client component)

La vista usa el mismo concepto de pestañas que el wizard, con coherencia visual y de flujo.

**Encabezado** (siempre visible):
- Título, fecha de creación.
- Botones de acción: Export brief, Copy summary, Export Markdown, Export JSON, Export PDF, Edit, Back to list, Delete.

**Strip de stats hero** (siempre visible sobre las pestañas):
- 3 tarjetas: Effort probable, Cost probable, Multipliers (risk + urgency + hourlyRate + basePts).

**Pestañas con badges de estado:**

| Pestaña | Badge | Contenido |
|---|---|---|
| Overview | — | Módulos seleccionados + Output ranges + Effort-by-module table |
| Client summary | — | Texto guardado del client summary con risk signals y open questions |
| Scope analysis | "Saved" (si hay contenido) | Advisor content guardado + Developer checklist (template guardado) |
| Actuals | "Logged" (si hay outcome) | Formulario de outcome + Advisor retrospective |
| Documents | count (si hay docs) | Upload + lista de archivos adjuntos |

La pestaña **Scope analysis** muestra el contenido guardado directamente (sin regenerar). El `ScopeAdvisorPanel` está presente y permite re-analizar si el usuario lo decide.

La pestaña **Actuals** incluye el **Advisor retrospective**: si el usuario llenó actual hours/cost y hay `advisorInsights` guardados, se muestran los riesgos y preguntas que el advisor predijo, junto con un mensaje de calibración ("Project ran X hrs over/under the probable estimate").

---

## Lista de estimaciones

**Ruta:** `/estimations`

- Muestra todas las estimaciones del usuario paginadas (6 por página).
- Cada tarjeta muestra: fecha, número de módulos, risk/urgency, probable hours, y un preview de las primeras 4 líneas del client summary.
- **Filtros** (GET params): sort (`newest` / `oldest`), risk (`low` / `medium` / `high`), urgency (`normal` / `expedite` / `rush`). Los filtros se aplican a nivel de query en Supabase.
- **Paginación** server-side con `range(from, to)` en Supabase.
- Estado vacío: si no hay estimaciones, se muestra un CTA a crear la primera. Si hay filtros activos sin resultados, se muestra un link a limpiar filtros.
- Es un server component: renderiza directamente desde Supabase sin state de cliente.

---

## Página de Insights

**Ruta:** `/insights`

Server component que cruza los datos de `estimations` y `estimation_outcomes` para calcular métricas de calidad de estimación.

### Métricas calculadas

**Fila 1 — resumen global:**
- Total estimations (count de `estimations`)
- Outcomes captured (count de `estimation_outcomes`)
- Completed projects (count de outcomes con `completed_at` no nulo)
- Accuracy rate: % de outcomes donde `actual_hours` cayó dentro del rango `[hoursRange.min, hoursRange.max]` estimado

**Fila 2 — deltas promedio:**
- Avg actual hours: promedio de todos los `actual_hours` registrados
- Avg actual cost: promedio de todos los `actual_cost` registrados
- Avg hours delta: promedio de `(actual_hours - hoursRange.probable)` — verde si negativo (bajo), ámbar si positivo (sobre)
- Avg cost delta: promedio de `(actual_cost - pricingRange.probable)`

**Sección de riesgo:**
Para cada nivel de riesgo (`low`, `medium`, `high`): número de outcomes, avg delta de horas, cantidad dentro del rango estimado.

**Sección de outcomes recientes:**
Los 8 outcomes más recientes (ordenados por `completed_at` o `created_at`) con: ID de estimación (link), badge "Within range" / "Outside range", actual hours, actual cost, hours delta, cost delta.

---

## Sistema de documentos

**Componente:** `DocumentsPanel`
**API:** `GET /api/documents?estimationId=`, `POST /api/documents`, `GET /api/documents/[id]`, `DELETE /api/documents/[id]`

- El usuario puede subir archivos (drag & drop o browse).
- El título se auto-completa desde el nombre del archivo, pero es editable.
- Los archivos se almacenan en **Supabase Storage**. La metadata (title, original_name, storage_path, mime_type, size_bytes) se guarda en la tabla `documents`.
- Descarga: genera una URL firmada temporal (`/api/documents/[id]` devuelve `{ url: string }`).
- Los títulos de los documentos adjuntos se pasan al **Scope Advisor** como contexto adicional (via `documentTitles`), mejorando la calidad del análisis.

---

## Sistema de exportación

### Client Summary (desde `ClientSummaryPanel`)
- **Copy to clipboard**: texto markdown del summary + appendix de advisor insights (risks + questions).
- **Export Markdown**: descarga `jitwise-client-summary.md`.

### Desde la vista de estimación guardada (`ClientSummaryActions`)
- **Copy summary**: copia el `summaryText`.
- **Export Markdown**: usa `buildMarkdownExport` — genera un `.md` con: estimation ID, fecha, hourly rate, scope, ranges, risk/urgency, summaryText.
- **Export JSON**: usa `buildJsonExport` — genera un `.json` con toda la data estructurada (input, result, clientSummary).
- **Export PDF**: llama a `GET /api/estimations/[id]/export/pdf` — genera un PDF del brief del lado del servidor.

### Project Brief (`ProjectBriefExport`)
- Descarga `jitwise-project-brief.md`.
- Contenido: Estimate at a Glance (tabla min/probable/max), Effort by Module (tabla por módulo), Client Summary, Scope Advisor Findings, Risk Register, Open Questions, Scope Template, Estimation Assumptions.

---

## APIs de IA

Todas requieren autenticación Bearer token (JWT de Supabase).

### `POST /api/advisor`

**Input:**
```json
{
  "input": EstimationInput,
  "projectContext": { "type", "stack", "teamSize", "phase", "notes" },
  "documentTitles": string[]
}
```

**Output:** `{ "content": string }` — markdown con análisis por módulo + cross-cutting concerns.

El prompt instruye al modelo a:
- Analizar cada módulo seleccionado individualmente.
- No estimar horas ni costos.
- Ser conciso y accionable, sin consejos genéricos.
- Temperatura: 0.2.

---

### `POST /api/summary`

**Input:**
```json
{
  "input": EstimationInput,
  "result": EstimationResult,
  "advisorContent": string (opcional)
}
```

**Output:** `{ "content": string }` — texto markdown de client summary enriquecido con advisor context si está disponible.

---

### `POST /api/templates/scope`

**Input:**
```json
{
  "input": EstimationInput,
  "advisorContent": string (opcional)
}
```

**Output:** `{ "content": string }` — checklist markdown de desarrollo con: setup inicial, checklist por módulo, infrastructure & ops, y deployment checklist. Si hay `advisorContent`, el template refleja los riesgos y gaps identificados por el advisor.

---

## Flujo completo de datos (extremo a extremo)

```
1. Usuario selecciona módulos + complexity         → EstimationInput
2. Motor calcula determinísticamente               → EstimationResult
3. (Opcional) Scope Advisor analiza scope          → advisorContent (IA)
4. Client Summary se genera con advisor context    → summaryText (IA)
5. Scope Template se genera con advisor context    → templateContent (IA)
6. Usuario guarda la estimación                    → DB: estimations.client_summary
7. Vista /estimations/[id] carga desde DB          → muestra todo sin regenerar
8. Usuario registra outcome real                   → DB: estimation_outcomes
9. Advisor retrospective compara predicción/real   → calibración de futuras estimaciones
10. Insights page agrega todos los outcomes         → métricas de accuracy
```

---

## Estado de las fases del roadmap

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Foundation (Next.js, Supabase, TS, TailwindCSS) | **Completo** |
| 1 | Motor de estimación determinístico | **Completo** |
| 2 | Interfaz del estimador (wizard 3 pasos) | **Completo** |
| 3 | Persistencia (save, list, delete, edit) | **Completo** |
| 4 | Client Summary Generator | **Completo** (IA + estático) |
| 5 | Sistema de documentos | **Completo** |
| 6 | Estimation Quality Insights | **Completo** (outcome tracking + accuracy metrics + risk breakdown) |
| 7 | AI Scope Advisor | **Completo** (análisis por módulo, cross-cutting concerns, project context, doc titles) |
| 8 | Export System | **Completo** (PDF, Markdown, JSON, Project Brief) |
| 9 | CLI Tool | No iniciado |
| 10 | Team Collaboration | No iniciado |

---

## Funcionalidades no contempladas en el roadmap original (implementadas)

- **Scope Template Generator** (IA): genera un checklist de desarrollo basado en el advisor output. Pestaña dedicada en el wizard y en la vista guardada.
- **Per-module effort breakdown**: tabla que desglosa hrs y costo por módulo usando ratios proporcionales sobre `baseScopePoints`.
- **Advisor retrospective**: sección en Outcome Panel que muestra qué riesgos y preguntas del advisor se materializaron, con mensaje de calibración.
- **Project context fields**: tipo de proyecto, fase, equipo, stack, notas — se usan como contexto adicional para el Scope Advisor.
- **Sileo toasts**: sistema de notificaciones para todos los estados de IA, guardado, copy, y export.
- **Advisor insights integrados en Client Summary**: riesgos y preguntas del advisor se renderizan también dentro del panel de client summary.
- **Persistencia de contenido IA**: `advisorContent`, `summaryText`, `templateContent` se guardan en `client_summary` JSONB. Al re-editar, se cargan como `initialContent` para no regenerar innecesariamente.
- **Vista de estimación guardada con pestañas**: Overview / Client Summary / Scope Analysis / Actuals / Documents — coherente con el flujo del wizard.

---

## Convenciones clave de implementación

- **CSS `hidden` vs unmount**: los paneles de pestañas usan `className={tab !== active ? "hidden" : ""}` para preservar estado (evitar re-renders y re-llamadas a la IA al cambiar de pestaña).
- **Pre-seeding de `lastRequestKeyRef`**: en `ClientSummaryPanel`, si `initialGeneratedText` está presente, el ref se inicializa con el `summaryKey` actual para que el `useEffect` no dispare una llamada a la IA automáticamente.
- **Server bypasses IA si hay `summaryMarkdown`**: los endpoints `POST /api/estimations` y `PUT /api/estimations/[id]` guardan el markdown enviado por el cliente directamente, sin regenerar con OpenAI.
- **Autenticación doble**: server components usan `getAuthenticatedSupabase()` (SSR), client components hacen fetch a APIs con `Bearer {accessToken}` obtenido de `supabase.auth.getSession()`.
- **Ratio proporcional para breakdown**: `moduleHrs = (modulePts / baseScopePoints) × totalProbableHrs`. Es matemáticamente equivalente a calcular horas por módulo con las mismas constantes del engine.
