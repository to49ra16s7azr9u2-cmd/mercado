import Link from "next/link";

export const metadata = { title: "Centro de ayuda" };

const FAQS = [
  {
    id: "seguridad",
    title: "Compra y venta seguras",
    items: [
      ["¿Cuándo cobra quien vende?", "Retenemos el monto hasta que quien compra confirma la recepción y califica la transacción."],
      ["¿Se ve mi dirección?", "Con los envíos de Mercado tu dirección permanece oculta para la otra parte."],
      ["¿Puedo pagar fuera de la plataforma?", "No. Pagar o cobrar fuera de Mercado anula todas las protecciones y está prohibido."],
    ],
  },
  {
    id: "problemas",
    title: "Resolución de incidencias",
    items: [
      ["El artículo no ha llegado", "Si pasan 7 días desde el envío, escribe por los mensajes de la transacción y abre una incidencia."],
      ["El artículo no es como se describía", "No confirmes la recepción: contacta con la otra parte y con nuestro equipo en un plazo de 3 días."],
      ["Quiero cancelar una compra", "Puedes solicitar la cancelación mientras el pedido no se haya enviado."],
      ["Me han enviado un artículo prohibido", "Denúncialo desde la ficha del artículo y lo revisaremos."],
    ],
  },
  {
    id: "cuenta",
    title: "Cuenta y datos",
    items: [
      ["No recuerdo mi contraseña", "Desde Configuración puedes cambiarla introduciendo la actual."],
      ["¿Cómo verifico mi identidad?", "En Mi cuenta › Verificación de identidad. Es obligatorio para transferir el saldo."],
      ["¿Cómo desactivo los avisos?", "En Mi cuenta › Configuración puedes elegir qué notificaciones recibes."],
    ],
  },
];

export default function HelpPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Centro de ayuda</h1>
      <p className="mt-2 text-sm text-muted">
        Resolvemos las dudas más habituales. Si no encuentras lo que buscas, escríbenos.
      </p>

      {FAQS.map((section) => (
        <section key={section.id} id={section.id} className="mt-8 scroll-mt-28">
          <h2 className="text-lg font-bold">{section.title}</h2>
          <div className="card mt-3 divide-y divide-line">
            {section.items.map(([question, answer]) => (
              <details key={question} className="group p-4">
                <summary className="cursor-pointer list-none text-sm font-bold marker:hidden">
                  <span className="mr-2 text-brand">▸</span>
                  {question}
                </summary>
                <p className="mt-2 pl-5 text-sm text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section id="contacto" className="mt-10 scroll-mt-28">
        <h2 className="text-lg font-bold">Contactar con el equipo</h2>
        <div className="card mt-3 p-4 text-sm">
          <p>Escríbenos a <span className="font-bold">ayuda@mercado.mx</span> y te respondemos en menos de 24 h.</p>
          <p className="mt-2 text-muted">
            Si tu duda es sobre un artículo concreto, incluye el enlace. También puedes{" "}
            <Link href="/report" className="link">denunciar un contenido</Link>.
          </p>
        </div>
      </section>
    </article>
  );
}
