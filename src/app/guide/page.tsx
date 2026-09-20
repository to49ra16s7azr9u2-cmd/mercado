import Link from "next/link";
import {
  CASH_FEE, CONDITIONS, FEE_RATE, MIN_PAYOUT, MSI_MIN, PAYOUT_FEE, SHIPPING_METHODS,
} from "@/lib/constants";
import { money } from "@/lib/format";

export const metadata = { title: "Cómo funciona Mercado" };

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Cómo funciona Mercado</h1>
      <p className="mt-2 text-sm text-muted">
        Publicar es gratis. Solo cobramos una comisión del {FEE_RATE * 100} % cuando vendes, y el dinero
        de quien compra queda retenido hasta que confirma que ha recibido el artículo.
      </p>

      <section id="vender" className="mt-8 scroll-mt-28">
        <h2 className="text-lg font-bold">Guía para vender</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {[
            ["Haz buenas fotos", "Con luz natural, sobre fondo liso y enseñando etiquetas y defectos."],
            ["Escribe un título claro", "Marca, modelo, talla y color. Así aparecerás en más búsquedas."],
            ["Elige categoría y estado", "Cuanto más precisa sea la ficha, menos preguntas recibirás."],
            ["Fija el precio", `Te mostramos la comisión del ${FEE_RATE * 100} % y lo que recibirás antes de publicar.`],
            ["Envía en 24-48 h", "Usa el método de envío que elegiste y anota el número de seguimiento."],
            ["Cobra", "Cuando ambas partes valoran, el monto se agrega a tu saldo."],
          ].map(([title, body], i) => (
            <li key={title} className="card flex gap-3 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {i + 1}
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="block text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/sell" className="btn-primary mt-4 inline-flex">Publicar un artículo</Link>
      </section>

      <section id="comprar" className="mt-10 scroll-mt-28">
        <h2 className="text-lg font-bold">Guía para comprar</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li>1. Busca por palabra clave, categoría, marca, talla o precio y guarda tus búsquedas.</li>
          <li>2. Pregunta en los comentarios o envía una oferta si quien vende las acepta.</li>
          <li>3. Paga con tarjeta, meses sin intereses, efectivo en tiendas, SPEI, PayPal, saldo o puntos.</li>
          <li>4. Recibe el paquete, revísalo y confirma la recepción valorando la transacción.</li>
          <li>5. Solo entonces liberamos el dinero a quien vende.</li>
        </ol>
      </section>

      <section id="estados" className="mt-10 scroll-mt-28">
        <h2 className="text-lg font-bold">Estados del artículo</h2>
        <dl className="card mt-3 divide-y divide-line text-sm">
          {CONDITIONS.map((condition) => (
            <div key={condition.value} className="flex gap-4 p-3">
              <dt className="w-48 shrink-0 font-bold">{condition.label}</dt>
              <dd className="text-muted">{condition.hint}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="envios" className="mt-10 scroll-mt-28">
        <h2 className="text-lg font-bold">Métodos de envío</h2>
        <dl className="card mt-3 divide-y divide-line text-sm">
          {SHIPPING_METHODS.map((method) => (
            <div key={method.value} className="p-3">
              <dt className="font-bold">{method.label}</dt>
              <dd className="text-muted">{method.hint}</dd>
              {method.cost.length > 0 && (
                <dd className="mt-1 text-xs text-muted">
                  Tarifas: {method.cost.map((c) => `hasta ${c.max} kg · ${money(c.price)}`).join(" / ")}
                </dd>
              )}
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted">
          Con «Envío Fácil» y «Envío Cómodo» tu dirección permanece oculta y el paquete va asegurado.
        </p>
      </section>

      <section id="shops" className="mt-10 scroll-mt-28">
        <h2 className="text-lg font-bold">Mercado Shops</h2>
        <p className="mt-2 text-sm text-muted">
          Si vendes como negocio puedes abrir una tienda gratis: publicas productos con inventario
          y variantes (talla, color, sabor), recibes varios pedidos del mismo artículo y tus datos
          fiscales se publican en la ficha «Información del vendedor», como lo pide la Ley Federal
          de Protección al Consumidor.
        </p>
        <ul className="card mt-3 divide-y divide-line text-sm">
          <li className="flex justify-between p-3"><span>Abrir la tienda</span><span className="font-bold">Gratis</span></li>
          <li className="flex justify-between p-3"><span>Comisión por venta</span><span className="font-bold">{FEE_RATE * 100} %</span></li>
          <li className="flex justify-between p-3"><span>Inventario y variantes</span><span className="font-bold">Incluidos</span></li>
          <li className="flex justify-between p-3"><span>Meses sin intereses para tus clientes</span><span className="font-bold">3, 6, 9 y 12</span></li>
        </ul>
        <Link href="/mypage/shop/new" className="btn-primary mt-4 inline-flex">Abrir mi tienda</Link>
      </section>

      <section id="comisiones" className="mt-10 scroll-mt-28">
        <h2 className="text-lg font-bold">Comisiones y cobros</h2>
        <ul className="card mt-3 divide-y divide-line text-sm">
          <li className="flex justify-between p-3"><span>Publicar un artículo</span><span className="font-bold">Gratis</span></li>
          <li className="flex justify-between p-3"><span>Comisión de venta</span><span className="font-bold">{FEE_RATE * 100} % del precio</span></li>
          <li className="flex justify-between p-3"><span>Transferencia a tu banco (CLABE)</span><span className="font-bold">{money(PAYOUT_FEE)} (mínimo {money(MIN_PAYOUT)})</span></li>
          <li className="flex justify-between p-3"><span>Pago en efectivo en tiendas</span><span className="font-bold">{money(CASH_FEE)}</span></li>
          <li className="flex justify-between p-3"><span>Meses sin intereses</span><span className="font-bold">Desde {money(MSI_MIN)}</span></li>
        </ul>
      </section>
    </article>
  );
}
