import { notFound } from "next/navigation";

type Doc = { title: string; updated: string; sections: { heading: string; body: string[] }[] };

const DOCS: Record<string, Doc> = {
  terminos: {
    title: "Términos de uso",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "1. Objeto", body: [
        "Mercado es un mercado en línea que permite a personas particulares comprar y vender artículos de segunda mano. Mercado actúa como intermediario y no es propietario de los artículos publicados.",
        "Este sitio es un proyecto de demostración: las transacciones no son reales y no generan obligaciones económicas.",
      ]},
      { heading: "2. Cuenta de usuario", body: [
        "Para publicar o comprar es necesario registrarse con una dirección de correo válida y mantener los datos actualizados.",
        "Cada persona puede tener una sola cuenta y es responsable de la confidencialidad de su contraseña.",
      ]},
      { heading: "3. Publicación de artículos", body: [
        "Quien publica garantiza que dispone del artículo, que puede venderlo legalmente y que la descripción es veraz.",
        "Está prohibido publicar los artículos indicados en la política de artículos prohibidos.",
      ]},
      { heading: "4. Compras y pagos", body: [
        "El importe abonado por quien compra queda retenido por Mercado hasta que se confirma la recepción del artículo.",
        "Mercado aplica una comisión del 10 % sobre el precio de venta.",
      ]},
      { heading: "5. Cancelaciones", body: [
        "Se puede solicitar la cancelación mientras el artículo no haya sido enviado. Una vez enviado, ambas partes deben acordarla.",
      ]},
      { heading: "6. Conducta prohibida", body: [
        "Se prohíbe pagar o cobrar fuera de la plataforma, publicar productos falsificados, suplantar identidades o manipular las valoraciones.",
      ]},
      { heading: "7. Responsabilidad", body: [
        "Mercado no responde por el estado de los artículos, pero media en los conflictos y puede retener o reembolsar el importe según el resultado.",
      ]},
    ],
  },
  privacidad: {
    title: "Política de privacidad",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "Responsable del tratamiento", body: ["Mercado (proyecto de demostración). Contacto: ayuda@mercado.es."] },
      { heading: "Datos que tratamos", body: [
        "Datos de registro (nombre, correo), datos de envío, historial de compras y ventas, mensajes de transacción y datos de uso del sitio.",
        "No almacenamos números completos de tarjeta: solo los cuatro últimos dígitos y la caducidad.",
      ]},
      { heading: "Finalidades", body: [
        "Gestionar tu cuenta, tramitar compras y envíos, prevenir fraudes, ofrecer recomendaciones y enviarte avisos que hayas activado.",
      ]},
      { heading: "Conservación", body: ["Conservamos los datos mientras la cuenta esté activa y durante los plazos legales aplicables."] },
      { heading: "Tus derechos", body: [
        "Puedes acceder, rectificar, suprimir, limitar y oponerte al tratamiento, así como solicitar la portabilidad, escribiendo a ayuda@mercado.es.",
      ]},
    ],
  },
  cookies: {
    title: "Política de cookies",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "Qué son", body: ["Pequeños archivos que el sitio guarda en tu navegador para recordar tu sesión y tus preferencias."] },
      { heading: "Cookies que usamos", body: [
        "Técnicas: imprescindibles para iniciar sesión y mantener el carrito de la transacción.",
        "De personalización: recuerdan tus filtros y búsquedas recientes.",
        "Analíticas: nos ayudan a entender qué secciones se usan más de forma agregada.",
      ]},
      { heading: "Cómo gestionarlas", body: ["Puedes bloquearlas desde la configuración de tu navegador, aunque algunas funciones dejarán de estar disponibles."] },
    ],
  },
  prohibidos: {
    title: "Artículos prohibidos",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "No se pueden vender en Mercado", body: [
        "Armas, munición y réplicas realistas.",
        "Drogas, tabaco, alcohol y medicamentos con receta.",
        "Productos falsificados o copias no autorizadas.",
        "Animales vivos y especies protegidas.",
        "Datos personales, cuentas de usuario y claves de acceso.",
        "Alimentos sin etiquetado ni trazabilidad y cosméticos abiertos de uso íntimo.",
        "Contenido para adultos y material que incite al odio.",
        "Dinero en curso legal, tarjetas de crédito y servicios financieros.",
      ]},
      { heading: "Consecuencias", body: [
        "Retiramos la publicación, podemos suspender la cuenta y, si procede, lo comunicamos a las autoridades competentes.",
      ]},
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: DOCS[slug]?.title ?? "Aviso legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">{doc.title}</h1>
      <p className="mt-1 text-xs text-muted">Última actualización: {doc.updated}</p>
      <div className="card mt-5 divide-y divide-line">
        {doc.sections.map((section) => (
          <section key={section.heading} className="p-5">
            <h2 className="text-base font-bold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed text-muted">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
