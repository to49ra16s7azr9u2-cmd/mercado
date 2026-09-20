# Mercado

Clon completo de Mercari **para México**, con la identidad visual en verde LINE
(`#06C755`) y toda la interfaz en español mexicano. Es una aplicación real de principio a
fin: cuentas, publicación de artículos, búsqueda con filtros, ofertas, compra con pago
retenido, mensajería de la transacción, calificaciones mutuas, saldo, puntos, cupones,
notificaciones y **Mercado Shops**, el módulo de tiendas con inventario y variantes.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06C755) ![MXN](https://img.shields.io/badge/moneda-MXN-06C755)

## Sitio de presentación (GitHub Pages)

`docs/` contiene un recorrido estático del proyecto (capturas reales y explicación de la red de
negocios) pensado para GitHub Pages: <https://to49ra16s7azr9u2-cmd.github.io/mercado/>.

Publicación (configuración actual): **Settings → Pages → Source: «Deploy from a branch»**,
rama `claude/lucid-meitner-eebxnm`, carpeta `/docs`. Cada push a esa rama actualiza el sitio.

Alternativa: cambiar el origen a **«GitHub Actions»** y usar `.github/workflows/pages.yml`
(sólo se dispara en `main` o a mano, porque el entorno `github-pages` restringe los despliegues
a la rama por defecto).

La aplicación en sí es dinámica (Server Actions y base de datos), así que GitHub Pages sólo sirve
el recorrido; para usarla se ejecuta en local como se indica abajo.

## Puesta en marcha

```bash
npm install
npm run seed     # crea data/mercado.db con 13 personas, 4 tiendas y ~150 artículos
npm run dev      # http://localhost:3000
```

> Si vuelves a ejecutar `npm run seed` con el servidor encendido, reinícialo: la conexión
> SQLite del proceso sigue apuntando al archivo anterior.

Cuenta de demostración: **demo@mercado.mx** / **demo1234**
(las demás cuentas de ejemplo usan la contraseña `mercado1234`).

Otros comandos:

```bash
npm run build      # compilación de producción + verificación de tipos
npm start          # servidor de producción
npm run test:e2e   # prueba end-to-end del recorrido completo (requiere npm run dev)
                   # si Chromium está en otra ruta: CHROMIUM_PATH=/ruta/chrome npm run test:e2e
```

## Adaptación a México

| Elemento | Implementación |
| --- | --- |
| Moneda | Peso mexicano (MXN), formato `es-MX`, precios desde $30 |
| Territorio | Los 32 estados, municipios/alcaldías, C.P. de 5 dígitos, teléfonos de 10 dígitos |
| Pagos | Tarjeta, **meses sin intereses** (3, 6, 9 y 12 desde $2,000), efectivo en tiendas, **SPEI**, saldo y puntos, PayPal |
| Cobros | Transferencia a **CLABE** de 18 dígitos (mínimo $300, comisión $25) |
| Envíos | Envío Fácil y Envío Cómodo con guía prepagada y rastreo, correo nacional, paquetería propia, entrega en persona |
| Idioma | Español de México (playera, tenis, bolsa, chamarra, celular, computadora, carriola…) |
| Legal | Ley Federal de Protección al Consumidor, LFPDPPP con derechos ARCO, Profeco, artículos prohibidos según la normativa mexicana |

## Funcionalidades

**Cuenta y perfil**
- Registro y acceso con sesión en cookie `httpOnly` y contraseñas con `scrypt`.
- Perfil público (`/user/[handle]`) con artículos en venta, vendidos y calificaciones.
- Edición de perfil, avatar, presentación, dirección de envío y cambio de contraseña.
- Verificación de identidad (requisito para transferir el saldo).
- Seguir personas, con listas de seguidos y seguidores.

**Catálogo y búsqueda**
- Portada con banners, categorías, búsquedas populares, novedades de quien sigues,
  tendencias, envío gratis, ofertas y recomendaciones según tu historial.
- Árbol de 13 categorías en tres niveles (123 categorías) y menú desplegable.
- Búsqueda por palabra clave, categoría, marca, rango de precio, estado, costo de envío,
  **tipo de vendedor (persona o tienda)** y disponibilidad, con seis ordenamientos y paginación.
- Búsquedas guardadas con aviso, historial de visitas, favoritos y directorio de marcas.

**Publicación (personas)**
- Fotos con subida real y vista previa, categoría en cascada, marca, talla, color, estado,
  costo de envío, método, origen, plazo y aceptación de ofertas.
- Cálculo en vivo de la comisión del 10 % y del monto a recibir.
- Borradores, edición, cambio rápido de precio, pausar/reanudar y eliminar.
- Al bajar el precio se avisa a quien tiene el artículo en favoritos.

**Mercado Shops (tiendas)**
- Alta de tienda con giro, tipo de vendedor (persona física o moral), razón social, RFC,
  domicilio, teléfono, correo y política de devoluciones; queda **en revisión** hasta su activación.
- Página pública de la tienda con portada, estadísticas, productos, vendidos, «sobre la tienda»
  y ficha de **Información del vendedor** con los datos fiscales.
- Productos con **inventario** y **variantes** (talla, color, presentación) con existencias y SKU
  independientes; el inventario se descuenta al pagar y se restituye si se cancela.
- Compra de **varias piezas** en un mismo pedido, con selector de variante y cantidad.
- Panel de la tienda: métricas, inventario editable en línea, pedidos por estado y envío con guía.
- Seguir tiendas, avisos de productos nuevos, directorio `/shops` por giro y filtro de
  «solo Mercado Shops» en la búsqueda.
- Reglas del programa en `/legal/shops`.

**Red de negocios entre tiendas (B2B)**
- **Mayoreo**: cada tienda define precios por volumen (escalones de piezas) y aprueba a las tiendas
  que quieren surtirse con ella; los pedidos de mayoreo pagan 5 % de comisión.
- **Especialización**: cada tienda declara en qué se especializa y qué quiere surtir con otras;
  el panel sugiere proveedores para lo que te falta y compradoras para lo que produces.
- **Reventa con crédito al taller**: la mercancía comprada en mayoreo se publica en tu tienda con
  un clic, conservando en la ficha el crédito de quien la elabora, y midiendo qué parte de tu
  catálogo produces tú y qué parte surtes.
- **Envíos consolidados**: agrupa pedidos pagados en una sola recolección, con tarifa por paquete,
  ahorro calculado y guías individuales al marcar la recolección.
- **Colectivos**: mercados, corredores comerciales o alianzas de oficio con página y escaparate común.
- **Paquetes cruzados**: productos de varias tiendas en un paquete; quien compra uno recibe un cupón
  para las demás tiendas del paquete.
- **Adelanto de ventas**: cobra hasta el 70 % de las ventas en curso con 5 % de comisión; se amortiza
  automáticamente conforme se completan esas ventas.
- **Importar y exportar catálogo (CSV)**: alta masiva por SKU con variantes, plantilla descargable y
  exportación del catálogo completo.

**Compra y transacción**
- Ficha con galería, favoritos, comentarios públicos, ofertas (aceptar/rechazar) y relacionados.
- Checkout con dirección, método de pago, MSI, puntos, cupones y desglose en vivo.
- Flujo: pago → envío con guía → recepción → calificación mutua → finalizada, con cancelación
  y reembolso antes del envío.
- Mensajería privada dentro de la transacción; el monto se libera al cerrarse.

**Dinero**
- Saldo con movimientos y transferencia por CLABE; puntos (compra y conversión desde saldo);
  cupones vigentes, usados y vencidos; alta de tarjetas.

**Otros**
- Centro de notificaciones por tipo (favoritos, comentarios, ofertas, pedidos, mensajes,
  calificaciones, novedades, seguidores y Mercado Shops) con preferencias.
- Guía, centro de ayuda, denuncias, avisos legales, diseño adaptable con barra inferior en
  móvil, `sitemap.xml`, `robots.txt` y manifiesto PWA.

## Arquitectura

| Capa | Detalle |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Server Components y Server Actions) |
| Estilos | Tailwind CSS v4 con tokens de la paleta LINE |
| Datos | SQLite con el módulo nativo `node:sqlite` (sin dependencias binarias) y migración de columnas |
| Sesiones | Cookie `httpOnly` + tabla `sessions`; contraseñas con `scrypt` |
| Imágenes | Subida a `public/uploads` y generador SVG en `/api/photo` |

```
src/
  app/            rutas (portada, búsqueda, categoría, artículo, venta, compra,
                  transacción, mi cuenta, tiendas, perfil, avisos, guía, ayuda, legal…)
  components/     cabecera, tarjetas, galería, formularios, filtros y panel de compra
  lib/            db.ts, auth.ts, queries.ts, actions.ts, constants.ts, format.ts
  db/schema.sql   esquema de 31 tablas (shops, variantes, mayoreo, colectivos, paquetes,
                  envíos consolidados y adelantos)
scripts/          seed.ts (datos de ejemplo) y e2e.mjs (prueba end-to-end, 27 pasos)
```

## 日本語での概要

メルカリと同等の機能をひととおり備えたクローンサイトの**メキシコ版**です。配色は LINE
グリーン（`#06C755`）、UI テキストはすべてメキシコのスペイン語、通貨は MXN（ペソ）。
出品・検索・いいね・コメント・値下げ交渉・購入・取引メッセージ・発送通知・受取評価・
相互評価・売上金・ポイント・クーポン・本人確認・通知設定に加えて、**メルカリShops 相当の
「Mercado Shops」**（在庫・バリエーション管理、複数個購入、ショップ運営ダッシュボード、
特定商取引法にあたる「Información del vendedor」表示）を実装しています。

さらに、**業者間の卸売ネットワーク**を実装しています。各店が「自分の専門（作れるもの）」と
「他店から仕入れたいもの」を宣言すると、提携提案・卸価格（数量別）・卸注文・仕入れた商品の
自店への再出品（生産者クレジット付き）・専門特化率の可視化までが一本の流れになります。
共同集荷による配送費の削減、コレクティブ（市場や商店街単位の共同出店）、店舗横断のクロスセル
クーポン、売掛金の前払い、CSV による在庫一括取り込みも含みます。

メキシコ向けのローカライズとして、32州・5桁郵便番号・10桁電話番号、MSI（分割手数料無料）、
OXXO等の店頭現金払い、SPEI送金、CLABEへの振込、連邦消費者保護法・LFPDPPP（ARCO権）に
沿った法務ページを備えています。

```bash
npm install && npm run seed && npm run dev   # http://localhost:3000
```

デモアカウント: `demo@mercado.mx` / `demo1234`

> 本サイトはデモです。決済や配送は実際には行われません。
