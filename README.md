# Mercado

Clon completo de Mercari con la identidad visual en verde LINE (`#06C755`) y **toda la
interfaz en español**. Es una aplicación real de principio a fin: cuentas, publicación de
artículos, búsqueda con filtros, ofertas, compra con pago retenido, mensajería de la
transacción, valoraciones mutuas, saldo, puntos, cupones y notificaciones.

![Mercado](https://img.shields.io/badge/Next.js-16-black) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06C755)

## Puesta en marcha

```bash
npm install
npm run seed     # crea data/mercado.db con 13 personas y ~130 artículos de ejemplo
npm run dev      # http://localhost:3000
```

Cuenta de demostración: **demo@mercado.es** / **demo1234**
(el resto de cuentas de ejemplo usan la contraseña `mercado1234`).

Otros comandos:

```bash
npm run build      # compilación de producción + comprobación de tipos
npm start          # servidor de producción
npm run test:e2e   # prueba end-to-end del recorrido completo (requiere npm run dev)
                   # si Chromium está en otra ruta: CHROMIUM_PATH=/ruta/chrome npm run test:e2e
```

## Funcionalidades

**Cuenta y perfil**
- Registro y acceso con sesión en cookie `httpOnly` y contraseñas con `scrypt`.
- Perfil público (`/user/[handle]`) con artículos en venta, vendidos y valoraciones.
- Edición de perfil, avatar, presentación, dirección de envío y cambio de contraseña.
- Verificación de identidad (necesaria para transferir el saldo).
- Seguir y dejar de seguir a otras personas, con listas de seguidos y seguidores.

**Catálogo y búsqueda**
- Portada con banners, categorías, búsquedas populares, novedades de quien sigues,
  tendencias, envío gratis, chollos y recomendaciones según tu historial.
- Árbol de 13 categorías con tres niveles (123 categorías en total) y menú desplegable.
- Búsqueda por palabra clave, categoría, marca, rango de precio, estado, gastos de envío
  y disponibilidad, con seis criterios de ordenación y paginación.
- Búsquedas guardadas con aviso, historial de visitas y favoritos.
- Listado de marcas y páginas de categoría con migas de pan.

**Publicación**
- Formulario completo: fotos (subida real con vista previa o icono provisional),
  título, descripción, categoría en cascada, marca, talla, color, estado,
  quién paga el envío, método de envío, origen, plazo y aceptación de ofertas.
- Cálculo en vivo de la comisión del 10 % y del importe a recibir.
- Borradores, edición, cambio rápido de precio, pausar/reanudar y eliminar.
- Al bajar el precio se avisa a quien tiene el artículo en favoritos.

**Compra y transacción**
- Ficha con galería, favoritos, comentarios públicos, ofertas (aceptar/rechazar),
  datos de envío, vendedor con valoraciones y artículos relacionados.
- Pago con tarjeta, saldo, puntos, cupones, Bizum, PayPal, transferencia o tienda.
- Flujo de transacción: pago → envío con seguimiento → recepción → valoración mutua →
  finalizada, con posibilidad de cancelar antes del envío (con reembolso).
- Mensajería privada entre comprador y vendedor dentro de la transacción.
- El importe de la venta se abona al saldo al cerrarse la transacción.

**Dinero**
- Saldo con movimientos y solicitud de transferencia por IBAN (mínimo 20 €, comisión 2 €).
- Puntos: compra, conversión desde el saldo e historial.
- Cupones disponibles, usados y caducados.
- Métodos de pago: alta de tarjetas, tarjeta predeterminada y borrado.

**Otros**
- Centro de notificaciones con tipos (favoritos, comentarios, ofertas, pedidos, mensajes,
  valoraciones, novedades, seguidores) y preferencias por tipo.
- Guía de uso, centro de ayuda, denuncia de contenidos y textos legales
  (términos, privacidad, cookies y artículos prohibidos).
- Diseño adaptable con barra de navegación inferior en móvil, `sitemap.xml`, `robots.txt`
  y manifiesto PWA.

## Arquitectura

| Capa | Detalle |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Server Components y Server Actions) |
| Estilos | Tailwind CSS v4 con tokens de la paleta LINE |
| Datos | SQLite mediante el módulo nativo `node:sqlite` (sin dependencias binarias) |
| Sesiones | Cookie `httpOnly` + tabla `sessions`; contraseñas con `scrypt` |
| Imágenes | Subida a `public/uploads` y generador SVG en `/api/photo` |

```
src/
  app/            rutas (portada, búsqueda, categoría, artículo, venta, compra,
                  transacción, mi cuenta, perfil, avisos, guía, ayuda, legal…)
  components/     cabecera, tarjetas, galería, formularios y filtros
  lib/            db.ts, auth.ts, queries.ts, actions.ts, constants.ts, format.ts
  db/schema.sql   esquema de 20 tablas
scripts/          seed.ts (datos de ejemplo) y e2e.mjs (prueba end-to-end)
```

## 日本語での概要

メルカリと同等の機能をひととおり備えたクローンサイトです。配色は LINE グリーン
（`#06C755`）、UI テキストはすべてスペイン語。出品・検索・いいね・コメント・値下げ
交渉・購入・取引メッセージ・発送通知・受取評価・相互評価・売上金・ポイント・クーポン・
本人確認・通知設定などを実装しています。

```bash
npm install && npm run seed && npm run dev   # http://localhost:3000
```

デモアカウント: `demo@mercado.es` / `demo1234`

> 本サイトはデモです。決済や配送は実際には行われません。
