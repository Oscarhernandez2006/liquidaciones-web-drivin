# Vista Liquidación Domiciliario

Portal web para que los **domiciliarios** consulten y descarguen su **liquidación de incentivos** publicada desde el aplicativo de escritorio (Liquidaciones Drivin).

Sigue el patrón de diseño del aplicativo: barra oscura con logo, tarjetas de período con gradiente índigo y secciones de conceptos coloreadas (fijos = verde, Run Errands = naranja, variables = azul).

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** (paleta de marca en `tailwind.config.ts`)
- **PostgreSQL** vía `pg` (misma base del aplicativo)

## Cómo funciona

1. El domiciliario ingresa su **documento** + **código de vehículo**.
2. El portal lista sus liquidaciones publicadas (tarjetas por período).
3. Al abrir una, ve el **recibo**: métricas, conceptos por sección y total, con opción de **imprimir / guardar en PDF**.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre http://localhost:3000

### Modo demo (sin base de datos)

Si `DATABASE_URL` está vacío (ver `.env.local`), el portal arranca con **datos de ejemplo**:
ingresa cualquier documento y código (no vacíos) y verás liquidaciones de muestra.

### Conectar a la base real

1. Crea la tabla ejecutando `db/schema.sql` en la base PostgreSQL.
2. En `.env.local` define la cadena de conexión:

   ```env
   DATABASE_URL=postgresql://USUARIO:PASSWORD@HOST:PUERTO/BASEDEDATOS
   # PGSSL=disable   # solo para PostgreSQL local sin SSL
   ```

3. Reinicia `npm run dev`.

## Publicación desde el aplicativo (pendiente de integrar)

El aplicativo WPF debe **insertar** en `liquidaciones_publicadas` una fila por domiciliario y período
al momento de "publicar" una liquidación. La columna `detalle` (JSONB) lleva la fila completa
(conceptos, métricas y total). La estructura esperada está documentada al final de `db/schema.sql`.

> Nota: el `Domiciliario` del aplicativo hoy no tiene campo **documento/cédula**; será necesario
> agregarlo (o mapear otro identificador) para que la búsqueda por documento funcione con datos reales.

## Estructura

```
src/
  app/
    page.tsx                    # Inicio: formulario de consulta
    liquidacion/[id]/page.tsx   # Recibo de una liquidación
    api/
      consultar/route.ts        # POST documento+código -> liquidaciones
      liquidacion/[id]/route.ts # GET detalle (valida credenciales)
    layout.tsx, globals.css
  components/                   # Header, TarjetaPeriodo, ReciboLiquidacion, ...
  lib/                          # db (pool pg), consultas, tipos, formato
  data/mock.ts                  # datos del modo demo
db/schema.sql                   # tabla liquidaciones_publicadas
```

## Build de producción

```bash
npm run build
npm start
```
