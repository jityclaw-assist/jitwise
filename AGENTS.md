**agents.md vol. 2**

**Jitwise - Crecimiento & Monetización**

Marzo 2026 · Post fases 0-8 · 4 iniciativas de distribución

| **Contexto de este volumen**                                                                |
| ------------------------------------------------------------------------------------------- |
| Las mejoras técnicas del vol. 1 están implementadas. Este documento cubre las 4 iniciativas |
| necesarias para pasar de "app funcionando" a "producto con usuarios y revenue".             |
|                                                                                             |
| 1\. Onboarding guiado - reducir Time to Value al mínimo                                     |
| 2\. Pricing + tier freemium - definir el modelo antes de adquirir usuarios                  |
| 3\. Landing page orientada a conversión - no a features                                     |
| 4\. Loop de referidos en el share link - adquisición pasiva y automática                    |
|                                                                                             |
| Cada sección incluye pasos de implementación, spec UX completa y criterios de éxito.        |

## **Índice**

| **#** | **Iniciativa**     | **Objetivo**      | **Esfuerzo** | **Impacto**      |
| ----- | ------------------ | ----------------- | ------------ | ---------------- |
| 1     | Onboarding guiado  | Activación        | Medio        | Muy Alto         |
| 2     | Pricing + freemium | Monetización      | Medio        | Muy Alto         |
| 3     | Landing page       | Adquisición       | Medio-Alto   | Alto             |
| 4     | Loop de referidos  | Adquisición viral | Bajo         | Alto (compuesto) |

# **Iniciativa 1 - Onboarding guiado**

**Activación** **Esfuerzo: Medio** **Archivos nuevos: 3-4**

## **Objetivo**

El Time to Value (tiempo desde que el usuario se registra hasta que ve un resultado que le importa) es el predictor más fuerte de activación. Si supera los 5 minutos, la mayoría abandona. El objetivo de esta iniciativa es llevar ese número a menos de 3 minutos, con una estimación pre-cargada y personalizada lista para editar en el primer acceso.

## **Contexto: flujo actual vs. flujo objetivo**

| **Flujo actual**                                                                                                                             | **Flujo objetivo**                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuario se registra → ve dashboard vacío → no sabe por dónde empezar → abre el wizard → llena 3 pasos desde cero → ve resultados (~8-12 min) | Usuario se registra → pantalla de 2 preguntas (30 seg) → wizard pre-cargado → llega al paso 3 con números reales en < 3 min → momento "wow" |

## **Pasos de implementación**

### **Paso 1 - Detectar si es el primer acceso del usuario**

Archivo: src/app/(app)/layout.tsx o middleware.ts

- Al cargar el layout autenticado, verificar si el usuario tiene estimaciones guardadas (query COUNT a Supabase).
- Si count === 0 y no existe una cookie/flag "onboarding_completed", redirigir a /onboarding.
- Guardar el flag en la tabla profiles (campo onboarding_completed BOOLEAN DEFAULT FALSE) para que el redirect no se repita.

### **Paso 2 - Crear la pantalla /onboarding**

Archivo nuevo: src/app/(app)/onboarding/page.tsx

Una pantalla de 2 pasos con un total de 3 preguntas. No es un wizard largo - es una captura de contexto mínima para pre-cargar el wizard inteligentemente.

- Pregunta 1: "¿Qué tipo de proyectos estimás más seguido?" - 4 opciones visuales: SaaS / App móvil / Marketplace / Web corporativa / Proyecto interno. Selección única, chips grandes con ícono.
- Pregunta 2: "¿Cuál es tu tarifa horaria aproximada?" - Input numérico con placeholder "\$75/hr". No es obligatorio - si lo deja vacío, usar 75 como default.
- Pregunta 3: "¿Cuál es tu nombre?" - Para personalizar el onboarding. Si el nombre ya viene del proveedor OAuth, saltear esta pregunta.
- Botón "Build my first estimate →" al final. Sin "Skip" visible en la primera pantalla - el usuario no sabe qué se está salteando.

### **Paso 3 - Definir los templates de pre-carga por tipo de proyecto**

Archivo nuevo: src/lib/onboarding/templates.ts

Para cada tipo de proyecto, definir un EstimationInput pre-armado con los módulos más comunes y su complejidad sugerida:

- SaaS: Authentication (standard), User Profile (standard), Dashboard (standard), Payments (standard), Notifications (low). Risk: medium. Urgency: normal.
- App móvil (web): Authentication (standard), Onboarding Flow (standard), User Profile (low), File Storage (low), Notifications (standard).
- Marketplace: Authentication (high), Payments (high), Search (standard), Dashboard (standard), User Profile (standard), Roles & Permissions (standard).
- Web corporativa: Landing / Marketing Pages (standard), Analytics & Tracking (low), Admin Panel (low).
- Proyecto interno: Admin Panel (standard), Roles & Permissions (standard), Dashboard (standard), API Integrations (standard).

### **Paso 4 - Pasar el pre-load al wizard**

Archivo: src/app/(app)/estimate/page.tsx y estimator-wizard.tsx

- La pantalla de onboarding, al hacer submit, redirige a /estimate?preset=\[tipo\] (ej: /estimate?preset=saas).
- El wizard lee el searchParam "preset", busca el template correspondiente en templates.ts y lo usa como initialState del paso 1.
- Los módulos pre-seleccionados se muestran ya marcados. El usuario puede deseleccionar o agregar más - no está bloqueado.
- El hourly rate del onboarding se pre-carga en el paso 2.
- Un banner sutil en el paso 1: "We pre-selected modules common for \[tipo de proyecto\]. Customize as needed."

### **Paso 5 - Marcar onboarding como completado**

Cuando el usuario guarda su primera estimación (POST /api/estimations), actualizar profiles.onboarding_completed = true. A partir de ese momento, /onboarding nunca vuelve a aparecer.

### **Paso 6 - Empty state del dashboard post-onboarding**

Archivo: src/app/(app)/estimations/page.tsx (estado vacío actual)

- Si el usuario ya completó el onboarding pero todavía no tiene estimaciones guardadas (las creó pero no las guardó), el empty state cambia: en lugar del CTA genérico, mostrar "Continue your \[SaaS / Marketplace\] estimate" con un link a /estimate?preset=\[tipo del onboarding\].

## **Especificación UX - Pantalla /onboarding**

| **Elemento UX**                  | **Especificación**                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layout**                       | Página centrada, max-width 560px. Sin sidebar ni navegación. Solo el logo de Jitwise arriba. Progress indicator: 2 dots (paso 1 y paso 2). Fondo blanco puro.                                                                                            |
| **Header de la pantalla**        | "Let's build your first estimate" en título grande. Subtítulo: "Answer 2 quick questions and we'll set everything up." Sin mencionar módulos ni wizard - reduce la percepción de complejidad.                                                            |
| **Pregunta 1: tipo de proyecto** | 5 chips grandes (160x80px aprox), grid 2 columnas + 1 al final. Cada chip: ícono grande + label. Selección con borde de color y fondo suave. Al seleccionar uno, el botón "Next →" se activa. Animación suave al seleccionar (scale + color transition). |
| **Pregunta 2: tarifa**           | Input con prefijo "\$" y sufijo "/hr". Placeholder "75". Helper text: "This sets your default rate - you can always change it per project." Botón "Build my first estimate →" en full width, color primario.                                             |
| **Transición entre pasos**       | Slide horizontal suave (CSS transform). El paso 1 sale por la izquierda, el paso 2 entra por la derecha. Duración 250ms.                                                                                                                                 |
| **Mobile**                       | Los chips van en stack vertical en pantallas < 400px. El input de tarifa ocupa el full width.                                                                                                                                                            |
| **Sin fricción de back**         | No hay botón "Back" entre los pasos del onboarding. Si el usuario presiona el back del browser, llega al dashboard (que lo redirige de vuelta al onboarding si no completó).                                                                             |

## **Especificación UX - Banner de preset en el wizard**

| **Elemento UX**               | **Especificación**                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Posición**                  | Top del paso 1, encima de la grilla de módulos. Colapsable - tiene un botón "×" para cerrar si el usuario ya entendió.                                      |
| **Visual**                    | Fondo azul muy claro (#EFF6FF), borde izquierdo azul de 3px, ícono de sparkle. Texto: "Pre-loaded for \[SaaS / Marketplace / etc.\] - customize as needed." |
| **Interacción**               | Al cerrar el banner, guardar en localStorage que fue cerrado para esta sesión (no vuelve a aparecer si el usuario navega hacia atrás).                      |
| **Módulos pre-seleccionados** | Se muestran ya en estado seleccionado (checked) con el chip resaltado. El usuario puede desmarcarlos sin ningún confirm - es edición libre.                 |

## **Criterios de éxito**

- Un nuevo usuario puede llegar al paso 3 del wizard con resultados en menos de 3 minutos desde el registro.
- Los módulos pre-cargados por tipo de proyecto son relevantes (validar con al menos 3 freelancers reales).
- El flag onboarding_completed funciona correctamente - el redirect no se repite en el segundo acceso.
- En mobile, el onboarding es completable sin scroll horizontal ni elementos cortados.
- El empty state del dashboard muestra el CTA correcto según el tipo de proyecto declarado.

# **Iniciativa 2 - Pricing + Tier Freemium**

**Monetización** **Esfuerzo: Medio** **Decisión estratégica primero**

## **Objetivo**

Definir el modelo de monetización antes de adquirir usuarios masivamente. Migrar usuarios free a paid después es entre 3x y 10x más difícil que establecer los límites desde el inicio. El modelo propuesto es freemium con límites que crean fricción en el momento exacto en que el usuario ya percibe el valor del producto.

## **Modelo de pricing propuesto**

|                            | **Free**             | **Pro**                   |
| -------------------------- | -------------------- | ------------------------- |
| **Estimaciones guardadas** | 3 máximo             | Ilimitadas                |
| Share links activos        | 0 (export PDF/MD sí) | Ilimitados                |
| PDF export                 | No                   | Sí                        |
| Comparison View            | No                   | Sí                        |
| Calibration Signals        | No                   | Sí                        |
| AI Scope Advisor           | 3 usos / mes         | Ilimitado                 |
| Documentos adjuntos        | No                   | Sí                        |
| **Precio**                 | \$0 / mes            | \$12 / mes (o \$99 / año) |

| **Razonamiento detrás de los límites elegidos**                                                  |
| ------------------------------------------------------------------------------------------------ |
| • 3 estimaciones en Free: suficiente para probar y convencerse, pero insuficiente para uso real. |
| Un freelancer activo hace 4-6 propuestas por mes. El límite activa en la primera semana de uso.  |
| • Share link en Pro: es el feature más visible externamente. Cada freelancer que quiere verse    |
| profesional frente a su cliente tiene un incentivo concreto de upgrade.                          |
| • AI Advisor con 3 usos/mes en Free: permite descubrir el valor sin dar acceso ilimitado.        |
| El límite se siente cuando el usuario más necesita el feature (en un proyecto grande).           |
| • \$12/mes: precio de referencia. Equivale a 10 minutos de trabajo del freelancer. Poco dolor,   |
| alta percepción de valor. El plan anual (\$99) da 2 meses gratis - incentiva el commitment.      |

## **Pasos de implementación**

### **Paso 1 - Agregar campo plan a la tabla profiles**

- Migración SQL: ALTER TABLE profiles ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'));
- Agregar también: plan_expires_at TIMESTAMP NULLABLE - para el caso de referidos que dan Pro gratis por un mes (Iniciativa 4).
- Agregar: advisor_uses_this_month INTEGER DEFAULT 0 y advisor_month_reset DATE DEFAULT CURRENT_DATE.

### **Paso 2 - Helper de verificación de plan en el servidor**

Archivo nuevo: src/lib/billing/plan.ts

- Función getUserPlan(userId): devuelve { plan, isProActive, advisorUsesLeft }.
- isProActive = plan === "pro" OR (plan_expires_at IS NOT NULL AND plan_expires_at > NOW()) - cubre el caso de Pro gifted por referidos.
- advisorUsesLeft = 3 - advisor_uses_this_month si isProActive === false. Null si es Pro.
- Resetear advisor_uses_this_month cuando advisor_month_reset sea del mes anterior (lazy reset en cada consulta).

### **Paso 3 - Aplicar límites en los endpoints existentes**

Modificar los siguientes endpoints para verificar el plan antes de proceder:

- POST /api/estimations: si plan === free y count(estimations) >= 3, devolver 403 con { error: "limit_reached", limit: "estimations", current: 3 }.
- POST /api/estimations/\[id\]/share: si plan !== pro, devolver 403 con { error: "upgrade_required", feature: "share_link" }.
- GET /api/estimations/\[id\]/export/pdf: si plan !== pro, devolver 403 con { error: "upgrade_required", feature: "pdf_export" }.
- POST /api/advisor: si plan === free y advisorUsesLeft === 0, devolver 403 con { error: "limit_reached", limit: "advisor_monthly" }.
- GET /api/estimations/compare: si plan !== pro, devolver 403 con { error: "upgrade_required", feature: "comparison" }.

### **Paso 4 - Componente UpgradeGate reutilizable**

Archivo nuevo: src/components/billing/upgrade-gate.tsx

- Recibe: feature (string), children, y opcionalmente un fallback.
- Si el usuario es Pro, renderiza children normalmente.
- Si es Free, renderiza un overlay o bloqueo visual sobre el children con el mensaje de upgrade contextual.
- Usar este componente para envolver: el botón Share en la vista guardada, el botón PDF export, la pestaña Comparison en /estimations, la sección Calibration en /insights.

### **Paso 5 - Modal de upgrade contextual**

Archivo nuevo: src/components/billing/upgrade-modal.tsx

- Se dispara cuando un endpoint devuelve 403 con error upgrade_required o limit_reached.
- El modal es específico por feature - no genérico. Ejemplos:
  - "You've reached 3 saved estimates. Upgrade to Pro to keep building - your work stays saved." (para limit_reached: estimations)
  - "Share links are a Pro feature. Send clients a clean, professional link instead of a PDF attachment." (para upgrade_required: share_link)
  - "You've used your 3 Advisor analyses this month. Upgrade for unlimited AI-powered scope reviews." (para limit_reached: advisor_monthly)
- Dos CTAs: "Upgrade to Pro - \$12/mo" (primary) y "Maybe later" (ghost). Sin X para cerrar en mobile - fuerza una decisión.
- El modal NO aparece en hover ni en features bloqueadas que el usuario no intentó usar. Solo al intentar la acción.

### **Paso 6 - Integración con Stripe (o Lemon Squeezy)**

Recomendación: usar Lemon Squeezy para simplicidad inicial (sin cuentas de merchant separadas, maneja impuestos globalmente). Migrar a Stripe si el volumen lo justifica.

- Crear producto "Jitwise Pro" con precio mensual (\$12) y anual (\$99).
- Webhook de activación: al completarse el pago, actualizar profiles.plan = "pro".
- Webhook de cancelación/fallo: revertir a "free" al vencer el período.
- Endpoint nuevo: POST /api/billing/checkout - crea una sesión de checkout y devuelve la URL. El cliente redirige.
- Endpoint nuevo: GET /api/billing/portal - genera un link al portal de gestión de suscripción (Lemon Squeezy / Stripe self-serve).

## **Especificación UX - Upgrade Gate y Modal**

| **Elemento UX**                      | **Especificación**                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Upgrade Gate visual**              | El contenido bloqueado se muestra desaturado (filter: grayscale(0.6) opacity(0.5)) con un overlay semitransparente encima. Encima del overlay: ícono de lock pequeño + texto "Pro feature" + botón "Upgrade". No difuminar completamente - el usuario debe ver lo que se está perdiendo. |
| **Modal de upgrade**                 | Centrado, max-width 480px. Header con ícono del feature específico (Link2 para share, FileText para PDF, etc.). Título con el mensaje contextual. Bullet list de 3 beneficios de Pro relevantes al feature que intentó usar. CTAs: botón primary full-width + ghost link "Maybe later".  |
| **Contador de usos del Advisor**     | Visible en el panel del Scope Advisor cuando el usuario es Free: "3 analyses remaining this month". Al llegar a 0: "Monthly limit reached - resets \[fecha\] or upgrade for unlimited."                                                                                                  |
| **Banner de límite de estimaciones** | Cuando el usuario tiene 2 de 3 estimaciones usadas: banner amarillo sutil en /estimations: "1 estimate remaining on Free plan." Con link "Upgrade to Pro". No en el dashboard principal - solo en la lista.                                                                              |
| **Pricing page /pricing**            | Ruta pública. Tabla de comparación de planes. Los CTAs de "Upgrade" en toda la app linkean aquí si el usuario no está autenticado, o disparan el modal si está autenticado.                                                                                                              |

## **Criterios de éxito**

- Un usuario Free que intenta crear la 4ta estimación ve el modal de upgrade con el mensaje correcto.
- Un usuario Pro no ve ningún gate ni modal en ninguna parte de la app.
- El pago via Lemon Squeezy actualiza el plan en Supabase en menos de 10 segundos (webhook).
- El contador de usos del Advisor se resetea correctamente el primer día de cada mes.
- El Pro gifted por referidos (plan_expires_at) funciona correctamente - el usuario tiene acceso completo hasta la fecha de expiración y luego vuelve a Free sin perder datos.

# **Iniciativa 3 - Landing Page orientada a conversión**

**Adquisición** **Esfuerzo: Medio-Alto** **Ruta: / (pública)**

## **Objetivo**

Una landing que describe features no convierte. Una landing que muestra el output sí convierte. El objetivo es que un freelancer que llega desde Google, Twitter o una recomendación entienda el valor en 10 segundos y complete el registro en menos de 2 minutos.

Principio guía: el copy de la landing no habla de Jitwise - habla del problema del freelancer y muestra la solución en acción.

## **Estructura de la página (secciones en orden)**

### **Sección 1 - Hero**

- Headline principal: "Turn a client call into a professional project estimate in 3 minutes."
- Subheadline: "Select your modules, set your rate, and get a client-ready brief with AI-powered scope analysis. No more spreadsheets, no more guesswork."
- CTA primario: "Start estimating free →" (link a /sign-up o directamente al onboarding).
- CTA secundario: "See a live example" (scroll suave a la sección de demo o abre el share link de ejemplo en nueva tab).
- Social proof inline: "Used by \[X\] freelancers" o alternativamente logos de herramientas integradas (Supabase, Vercel, etc.) como stack de confianza técnica.
- Visual del hero: una captura del paso 3 del wizard (los resultados con las pestañas y la tarjeta hero de probable cost/hours). Es el output - no un mockup genérico.

### **Sección 2 - El problema (3 puntos)**

- "You write a proposal in Google Docs for 2 hours. The client asks for a discount. You guess a new number."
- "You underestimate a module. The project runs 40% over. You eat the cost."
- "You can't remember why last month's project cost more than this one."

Estos pain points se muestran como tarjetas con ícono de X roja. Cada uno resuena con un segmento específico del freelancer.

### **Sección 3 - Cómo funciona (3 pasos visuales)**

- Paso 1: "Select your modules" - captura del paso 1 del wizard con módulos seleccionados.
- Paso 2: "Set your parameters" - captura del paso 2 con risk/urgency/rate.
- Paso 3: "Get your estimate + brief" - captura del paso 3, pestaña Client Summary con las 3 cards.

Cada paso tiene una descripción de 1 línea. No más. El visual hace el trabajo.

### **Sección 4 - Demo interactiva o share link de ejemplo**

- Opción A (más impacto, más esfuerzo): un mini-wizard embebido en la landing que permite seleccionar 2-3 módulos y ver un resultado inmediato sin registrarse. Al hacer clic en "Save this estimate", redirige al sign-up con los módulos pre-cargados.
- Opción B (más simple, igualmente efectivo): un share link real de una estimación de ejemplo (ej: "SaaS MVP - Authentication + Dashboard + Payments") embebido en un iframe o como link destacado. El visitante puede abrirlo y ver la página pública del share link.
- Recomendación: empezar con la Opción B. Se implementa en 2 horas. La Opción A es una iteración posterior.

### **Sección 5 - Testimonios (o resultados esperados)**

- Si no hay usuarios reales todavía: usar "expected outcomes" formulados como resultados. Ej: "Freelancers using Jitwise report sending proposals 5x faster and reducing scope disputes by clearly separating what's included from what isn't."
- Formato: 3 tarjetas con quote, nombre/rol ficticios por ahora (marcar para reemplazar cuando llegue feedback real).
- Cuando lleguen usuarios reales, reemplazar con testimonios reales. El componente ya está preparado.

### **Sección 6 - Pricing (simplificado)**

- La tabla completa de pricing vive en /pricing. Aquí solo: Free vs Pro, 3 diferencias clave, CTA "Start free" y "See all features →".
- No mostrar el precio Pro en el hero de la landing - reduce fricción cognitiva inicial. El precio aparece cuando el usuario ya entendió el valor.

### **Sección 7 - CTA final**

- "Ready to estimate smarter?" + botón "Create your first estimate free →" + texto pequeño "No credit card required. 3 estimates free forever."

## **Especificación UX - Landing page**

| **Elemento UX**             | **Especificación**                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estética general**        | Dark mode como opción predeterminada (fondo #0F172A, texto blanco, accents en el color del brand). Contrasta fuertemente con otras tools de estimación que tienen UI genérica clara. Alternativa: light mode con tipografía editorial fuerte. Elegir una dirección y ejecutarla con consistencia. |
| **Tipografía**              | Display/headlines: fuente con carácter fuerte (ej: Sora, DM Serif Display, o similar). Body: Calibri o DM Sans. NUNCA Inter ni Arial en la landing - son genéricas.                                                                                                                               |
| **Navegación**              | Navbar minimal: logo + links "How it works / Pricing / Sign in" + botón "Start free" (primary). Sticky en desktop. En mobile: hamburger con drawer.                                                                                                                                               |
| **Hero visual**             | La captura del wizard debe ser real, no un mockup dibujado. Usar una screenshot con números reales y plausibles (ej: "SaaS MVP, \$8,400-\$19,600"). Una estimación falsa con números redondos o genéricos no convierte.                                                                           |
| **CTA buttons**             | El CTA primario en el hero tiene que ser el elemento más llamativo visualmente. Full width en mobile. Hover state con micro-animación (scale 1.02 + shadow).                                                                                                                                      |
| **Sección "El problema"**   | Las 3 tarjetas de pain points tienen fondo ligeramente diferente al resto. Ícono de X o warning. El copy es en primera persona del freelancer, no en tercera persona sobre el producto.                                                                                                           |
| **Demo / share link**       | Si es la Opción B (iframe o link), enmarcar con una browser chrome falsa para dar contexto de "esto es lo que el cliente ve". Agrega profesionalismo a la demo.                                                                                                                                   |
| **Testimonios placeholder** | Marcar con un comentario en el código: "// TODO: replace with real testimonial from \[nombre\] when confirmed". No inventar nombres reales.                                                                                                                                                       |
| **SEO básico**              | Title: "Jitwise - Project Estimation Tool for Freelancers". Meta description con la propuesta de valor. OG image con el nombre del producto y el tagline. Sitemap.xml básico.                                                                                                                     |
| **Performance**             | La landing no debe cargar el bundle completo de Next.js app. Mantener como ruta estática o con SSG. Target: LCP < 1.5s en mobile.                                                                                                                                                                 |

## **Criterios de éxito**

- Un visitante nuevo entiende qué hace Jitwise en menos de 10 segundos (test: cubrir el logo y preguntar a alguien "¿qué hace este producto?").
- El CTA "Start estimating free" lleva directamente al onboarding guiado de la Iniciativa 1.
- La demo (share link de ejemplo) abre correctamente y muestra una estimación real y plausible.
- Lighthouse score > 90 en Performance y > 95 en SEO en mobile.
- El copy no menciona "módulos", "complexity levels", "base scope points" ni ningún término técnico interno.

# **Iniciativa 4 - Loop de referidos en el Share Link**

**Adquisición viral** **Esfuerzo: Bajo** **Se construye sobre vol. 1 Mejora 2**

## **Objetivo**

El share link ya existe (Mejora 2 del vol. 1). Cada vez que un freelancer comparte una estimación, hay un cliente en el otro extremo que ve la página. Ese cliente -o alguien en su equipo- puede ser un freelancer o tener un equipo de desarrollo. El loop de referidos convierte esa superficie de exposición en un canal de adquisición automático con un incentivo real para el referidor.

## **Mecánica del loop**

| **1** | Freelancer A comparte estimación → cliente ve la página pública /share/\[token\]                                        |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| **2** | Footer: "Built with Jitwise - Try it free →" con link a landing page con ref=\[userId de A\]                            |
| **3** | Visitante B llega a la landing con el ref param. Ve una estimación de ejemplo (la del share link original).             |
| **4** | B se registra. El sistema asocia B a A como referidor (tabla referrals).                                                |
| **5** | B guarda su primera estimación. El sistema marca la referral como "activated".                                          |
| **6** | A recibe automáticamente 1 mes de Pro gratis (plan_expires_at += 30 días).                                              |
| **7** | A recibe un email/notificación: "You unlocked 1 month of Pro - someone you referred just created their first estimate." |

## **Pasos de implementación**

### **Paso 1 - Tabla de referrals en Supabase**

- CREATE TABLE referrals: id UUID PK, referrer_id UUID FK → auth.users, referred_id UUID FK → auth.users NULLABLE, ref_token TEXT UNIQUE, status TEXT CHECK (pending/activated/rewarded), created_at, activated_at NULLABLE.
- ref_token es el identificador público que va en la URL. Usar nanoid(10).
- Un usuario puede tener múltiples referrals (uno por cada persona que se registró desde su link).

### **Paso 2 - Generar el ref_token por usuario**

- Al crear el perfil de usuario (trigger post-registro), generar automáticamente un ref_token único e insertarlo en la tabla referrals con status "pending" y referred_id NULL.
- Alternativamente, generarlo lazy: la primera vez que el usuario genera un share link, crear también su ref_token si no existe.
- El ref_token del usuario es único y permanente - no cambia entre estimaciones.

### **Paso 3 - Actualizar la página pública /share/\[token\]**

Archivo: src/app/share/\[token\]/page.tsx (ya existe desde Mejora 2)

- El footer "Built with Jitwise" pasa de ser un texto estático a un link con el ref_token del dueño de la estimación: "Built with Jitwise →" → /sign-up?ref=\[refToken\] (o /?ref=\[refToken\] si la landing es la entrada de adquisición).
- También agregar meta tag de referral para tracking: no visible para el usuario, solo para el sistema.

### **Paso 4 - Capturar el ref param en el registro**

Archivo: src/app/sign-up/page.tsx o el flujo de auth de Supabase

- Al llegar a la página de registro con ?ref=\[token\], guardar el ref_token en sessionStorage.
- Después del registro exitoso, leer el ref_token del sessionStorage y llamar a POST /api/referrals/claim con { refToken }.
- Este endpoint busca el referral pendiente con ese token, le asigna referred_id = nuevo usuario, y actualiza status a "pending_activation".

### **Paso 5 - Trigger de activación**

Archivo: src/app/api/estimations/route.ts (POST, cuando se guarda la primera estimación)

- Al guardar la primera estimación de un usuario, verificar si tiene un referral en status "pending_activation".
- Si existe: actualizar a status "activated", registrar activated_at.
- Llamar a POST /api/referrals/reward con el referrer_id para activar el mes de Pro.

### **Paso 6 - Endpoint de reward**

Archivo nuevo: src/app/api/referrals/reward/route.ts

- Actualizar profiles.plan_expires_at del referrer: si era NULL o pasado, = NOW() + 30 días. Si ya tiene una fecha futura, += 30 días (los rewards se acumulan).
- Actualizar referral.status = "rewarded".
- Enviar notificación al referrer (ver paso 7).

### **Paso 7 - Notificación al referidor**

- Email simple (Resend o el proveedor que ya use la app): "Someone you referred just saved their first estimate. You've unlocked 1 month of Jitwise Pro."
- Alternativamente, si no hay sistema de email configurado: un banner en el dashboard la próxima vez que el referidor inicia sesión. Implementar con un campo profiles.pending_reward_notification BOOLEAN.

### **Paso 8 - Sección "Referrals" en el perfil del usuario**

Archivo: src/app/(app)/settings/page.tsx o una ruta nueva /settings/referrals

- Mostrar: tu link de referido (copiable), número de referidos registrados, número de meses Pro ganados, historial de referrals con estado.
- CTA: "Share your referral link" con botones de copy y share nativo (Web Share API en mobile).

## **Especificación UX - Footer del share link**

| **Elemento UX** | **Especificación**                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Posición**    | Footer al final de la página pública /share/\[token\]. Siempre visible, no colapsable.                                                                                                    |
| **Visual**      | Fondo levemente distinto al body (un tono más oscuro o más claro). Texto: "Built with" + logo Jitwise (texto pequeño) + "- Create your free estimate →". El link es el CTA de conversión. |
| **Tono**        | Discreto pero presente. No debe competir con el contenido de la estimación. El tamaño del texto es 14px, color muted. El link tiene un hover state claro.                                 |
| **Tracking**    | El link incluye UTM params además del ref: ?ref=\[token\]&utm_source=share_link&utm_medium=referral&utm_campaign=jitwise_share. Para analytics futuros.                                   |

## **Especificación UX - Landing con ref param**

| **Elemento UX**              | **Especificación**                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personalización del hero** | Cuando la landing se carga con ?ref=\[token\], el headline puede cambiar levemente: "Your colleague uses Jitwise to estimate projects. Try it free →". Si es demasiado complejo, mantener el hero estándar - el ref se captura igual. |
| **Preview de la estimación** | Si el ref viene de un share link específico, mostrar en la landing una preview de esa estimación como ejemplo real: "Here's what an estimate looks like →" con una tarjeta que muestra el probable cost y algunos módulos.            |
| **Sign-up form**             | El formulario de registro no debe perder el ref_token. Guardarlo en sessionStorage inmediatamente al cargar la página con el param, antes de que el usuario haga nada.                                                                |

## **Especificación UX - Sección Referrals en Settings**

| **Elemento UX**  | **Especificación**                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layout**       | Card dentro de la página de settings. Título "Refer & earn". Subtítulo: "Share Jitwise with a freelancer colleague. When they save their first estimate, you get 1 month of Pro free."                  |
| **Tu link**      | Input read-only con la URL completa. Botón "Copy" y botón "Share" (Web Share API). Debajo: contador "X freelancers referred · X months earned".                                                         |
| **Historial**    | Lista simple: fecha, estado (Pending / Activated / Rewarded), y si está rewarded: "You earned 1 month of Pro on \[fecha\]". No mostrar el nombre ni email del referido por privacidad - solo el estado. |
| **Estado vacío** | "No referrals yet. Share your link and earn Pro months for free." Con el botón de copy prominente.                                                                                                      |

## **Criterios de éxito**

- Al abrir un share link, el footer tiene el link de referido del dueño de la estimación con el ref_token correcto.
- Un usuario que llega desde un share link, se registra y guarda su primera estimación activa correctamente el reward del referidor.
- El plan_expires_at del referidor se actualiza en menos de 5 segundos después de que el referido guarda su primera estimación.
- Los rewards se acumulan correctamente (2 referidos = 2 meses adicionales de Pro).
- La sección Referrals en Settings es coherente con el estado real de la tabla referrals.

# **Apéndice - Visión del funnel completo**

Con las 4 iniciativas de este volumen implementadas, el funnel de Jitwise queda así:

| **Etapa**       | **Mecanismo**                           | **Iniciativa responsable**                        |
| --------------- | --------------------------------------- | ------------------------------------------------- |
| **Awareness**   | Landing page, SEO, share links visibles | Iniciativa 3 (Landing) + Iniciativa 4 (Referidos) |
| **Adquisición** | CTA → Sign up gratuito                  | Iniciativa 3 (CTA de la landing)                  |
| **Activación**  | Primer resultado en < 3 min             | Iniciativa 1 (Onboarding guiado)                  |
| **Retención**   | Uso recurrente, calibración             | Vol. 1: Mejoras 3 y 4 (Comparison + Calibration)  |
| **Revenue**     | Upgrade a Pro en momento de fricción    | Iniciativa 2 (Pricing + Freemium)                 |
| **Referral**    | Share link → nuevo usuario → reward     | Iniciativa 4 (Loop de referidos)                  |

| **Orden de implementación recomendado para este volumen**                                             |
| ----------------------------------------------------------------------------------------------------- |
| 1° Pricing + Freemium - definir límites antes de tener usuarios evita migraciones dolorosas.          |
| 2° Onboarding guiado - sin esto, traer tráfico da una tasa de activación baja.                        |
| 3° Landing page - con pricing definido y onboarding funcionando, la landing tiene argumento completo. |
| 4° Loop de referidos - se construye sobre el share link existente. Escala solo con el uso.            |
|                                                                                                       |
| Nota: las Iniciativas 1 y 2 pueden desarrollarse en paralelo si hay capacidad.                        |
| La Landing (3) depende de que el Onboarding (1) esté funcionando - el CTA principal linkea allí.      |

Jitwise agents.md vol. 2 · Crecimiento & Monetización · Marzo 2026