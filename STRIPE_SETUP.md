# Stripe Setup — Guía completa

## Resumen de lo que ya está en el código

| Archivo | Qué hace |
|--------|----------|
| `src/lib/stripe/client.ts` | Cliente Stripe singleton |
| `src/app/api/stripe/checkout/route.ts` | Crea sesión de Checkout → redirige a Stripe |
| `src/app/api/stripe/webhook/route.ts` | Recibe eventos de Stripe y actualiza `profiles.plan` |
| `src/app/api/stripe/portal/route.ts` | Abre Customer Portal (cancelar, cambiar tarjeta) |
| `src/app/(marketing)/pricing/page.tsx` | Página `/pricing` pública |
| `src/app/(app)/settings/page.tsx` | Panel de plan en `/settings` |
| `supabase/migrations/20260316_stripe_customer.sql` | Agrega `stripe_customer_id` a `profiles` |

---

## Paso 1 — Crear cuenta Stripe y proyecto

1. Ve a [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register) y crea tu cuenta.
2. En el dashboard, asegúrate de estar en **modo Test** (el toggle arriba a la derecha debe decir "Test mode").

---

## Paso 2 — Crear el producto Pro

1. En el sidebar de Stripe: **Product catalog → Add product**
2. Rellena:
   - **Name:** `Jitwise Pro`
   - **Description:** `Unlimited estimates, share links, PDF export, AI advisor`
3. En la sección **Pricing**:
   - Pricing model: **Standard pricing**
   - Price: `$12.00`
   - Billing period: **Monthly**
   - Currency: `USD`
4. Haz clic en **Save product**
5. Copia el **Price ID** que aparece (formato `price_xxxxxxxxxxxxxxxx`)

---

## Paso 3 — Variables de entorno

Agrega estas líneas a tu `.env.local`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...         # Dashboard → Developers → API keys → Secret key
STRIPE_PRO_PRICE_ID=price_...         # El Price ID del paso anterior
STRIPE_WEBHOOK_SECRET=whsec_...       # Se obtiene en el Paso 5
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Para obtener el **Secret Key**:
- Stripe Dashboard → **Developers** → **API keys** → **Secret key** → Reveal

---

## Paso 4 — Ejecutar la migración SQL

En el **SQL Editor de Supabase** ([app.supabase.com](https://app.supabase.com)), ejecuta el contenido de:

```
supabase/migrations/20260316_stripe_customer.sql
```

O directamente:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles (stripe_customer_id);
```

---

## Paso 5 — Configurar el Webhook (local con Stripe CLI)

### Instalar Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### Autenticar

```bash
stripe login
```

Se abre el navegador para vincular tu cuenta.

### Escuchar eventos localmente

Con tu servidor Next.js corriendo (`pnpm dev`), en otra terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

La CLI imprimirá algo como:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxx
```

Copia ese valor y agrégalo a `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

Reinicia el servidor (`pnpm dev`) para que tome la nueva variable.

### Eventos que el webhook maneja

| Evento Stripe | Acción en Jitwise |
|--------------|-------------------|
| `checkout.session.completed` | Marca usuario como Pro |
| `customer.subscription.updated` | Sincroniza estado y fecha de expiración |
| `customer.subscription.created` | Activa Pro |
| `customer.subscription.deleted` | Regresa a Free |

---

## Paso 6 — Activar el Customer Portal

El Customer Portal permite a los usuarios cancelar, cambiar tarjeta, y ver facturas.

1. Stripe Dashboard → **Settings** → **Billing** → **Customer portal**
2. Haz clic en **Activate test link**
3. Configura (opcional):
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to update payment methods
   - ✅ Show invoices

Sin este paso, el botón "Manage subscription" en `/settings` no funcionará.

---

## Paso 7 — Probar el flujo completo

### Flujo de upgrade

1. Ve a `http://localhost:3000/pricing`
2. Haz clic en **Upgrade to Pro →**
3. Si no estás logueado, te redirige a `/login?next=/pricing`
4. Una vez logueado, se crea la sesión de Checkout y te redirige a Stripe
5. Usa la tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC
6. Completa el pago
7. Stripe redirige a `http://localhost:3000/dashboard?upgraded=1`
8. En la terminal de Stripe CLI verás el evento `checkout.session.completed`
9. Tu `profiles.plan` se actualiza a `pro` en Supabase

### Verificar en Supabase

```sql
SELECT id, plan, plan_expires_at, stripe_customer_id
FROM public.profiles
WHERE id = '<tu-user-id>';
```

### Flujo de cancelación

1. Ve a `http://localhost:3000/settings`
2. Haz clic en **Manage subscription →**
3. Se abre el Customer Portal de Stripe
4. Cancela la suscripción
5. Stripe envía `customer.subscription.deleted`
6. Tu plan regresa a `free`

---

## Paso 8 — Configurar Webhook en producción

Cuando despliegues en Vercel (u otro hosting):

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://tu-dominio.com/api/stripe/webhook`
3. **Events to listen:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Haz clic en **Add endpoint**
5. Copia el **Signing secret** (`whsec_...`) que aparece
6. Agrega ese valor como variable de entorno en Vercel:
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (este es **diferente** al de la CLI local)

### Variables de entorno en Vercel

En Vercel Dashboard → tu proyecto → **Settings** → **Environment Variables**:

```
STRIPE_SECRET_KEY          → sk_live_... (producción) o sk_test_... (preview)
STRIPE_PRO_PRICE_ID        → price_...
STRIPE_WEBHOOK_SECRET      → whsec_... (el del webhook de producción)
NEXT_PUBLIC_APP_URL        → https://tu-dominio.com
```

---

## Checklist final

- [ ] Cuenta Stripe creada
- [ ] Producto "Jitwise Pro" creado con precio $12/mes
- [ ] `STRIPE_SECRET_KEY` en `.env.local`
- [ ] `STRIPE_PRO_PRICE_ID` en `.env.local`
- [ ] Migración SQL ejecutada en Supabase
- [ ] Stripe CLI instalada y autenticada
- [ ] `stripe listen` corriendo en terminal separada
- [ ] `STRIPE_WEBHOOK_SECRET` en `.env.local` (el que imprime la CLI)
- [ ] Servidor reiniciado después de agregar variables
- [ ] Customer Portal activado en Stripe Dashboard
- [ ] Flujo de pago probado con tarjeta `4242 4242 4242 4242`
- [ ] Verificado que `profiles.plan = 'pro'` en Supabase después del pago
- [ ] Para producción: webhook endpoint configurado en Stripe con URL real

---

## Tarjetas de prueba útiles

| Número | Comportamiento |
|--------|---------------|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0000 0000 0002` | Tarjeta declinada |
| `4000 0025 0000 3155` | Requiere autenticación 3D Secure |
| `4000 0000 0000 9995` | Fondos insuficientes |

Fecha de expiración: cualquier fecha futura. CVC: cualquier 3 dígitos.
