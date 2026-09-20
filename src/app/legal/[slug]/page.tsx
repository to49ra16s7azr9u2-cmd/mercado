import { notFound } from "next/navigation";

type Doc = { title: string; updated: string; sections: { heading: string; body: string[] }[] };

const DOCS: Record<string, Doc> = {
  terminos: {
    title: "Términos y condiciones de uso",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "1. Objeto y aceptación", body: [
        "Mercado es una plataforma en línea que permite a personas usuarias y a tiendas de Mercado Shops ofrecer, comprar y vender artículos nuevos y de segunda mano en los Estados Unidos Mexicanos. Mercado actúa como intermediario y no es propietario de los artículos publicados.",
        "Este sitio es un proyecto de demostración: las operaciones no son reales y no generan obligaciones económicas ni fiscales.",
      ]},
      { heading: "2. Cuenta de usuario", body: [
        "Para publicar o comprar debes registrarte con un correo electrónico válido, ser mayor de edad y mantener tus datos actualizados.",
        "Cada persona puede tener una sola cuenta y es responsable de resguardar su contraseña.",
      ]},
      { heading: "3. Publicaciones", body: [
        "Quien publica declara que cuenta con el artículo, que puede comercializarlo legalmente y que la descripción y las imágenes son veraces, conforme al artículo 32 de la Ley Federal de Protección al Consumidor.",
        "Está prohibido publicar los artículos señalados en la política de artículos prohibidos.",
      ]},
      { heading: "4. Precios, pagos y facturación", body: [
        "Todos los precios se expresan en pesos mexicanos (MXN) e incluyen impuestos.",
        "El monto pagado por quien compra queda retenido por Mercado hasta que se confirma la recepción del artículo.",
        "Mercado cobra una comisión del 10 % sobre el precio de venta. Las tiendas de Mercado Shops pueden emitir factura (CFDI) a solicitud de la persona compradora.",
      ]},
      { heading: "5. Envíos y entregas", body: [
        "Los envíos con guía prepagada de Mercado incluyen rastreo y protección. Las direcciones permanecen ocultas para la contraparte.",
        "Los plazos de entrega son estimados y pueden variar por causas atribuibles a la paquetería.",
      ]},
      { heading: "6. Cancelaciones y devoluciones", body: [
        "Puede solicitarse la cancelación mientras el artículo no haya sido enviado. Después del envío se requiere el acuerdo de ambas partes.",
        "Las tiendas de Mercado Shops publican su política de devoluciones en la ficha «Información del vendedor».",
      ]},
      { heading: "7. Conductas prohibidas", body: [
        "Se prohíbe pagar o cobrar fuera de la plataforma, comercializar productos apócrifos, suplantar identidades y manipular las calificaciones.",
      ]},
      { heading: "8. Responsabilidad y solución de controversias", body: [
        "Mercado no es responsable del estado de los artículos, pero media en las controversias y puede retener o reembolsar el monto según el resultado.",
        "Para cualquier controversia, las partes se someten a la Procuraduría Federal del Consumidor (Profeco) y, en su caso, a los tribunales competentes de la Ciudad de México.",
      ]},
    ],
  },
  privacidad: {
    title: "Aviso de privacidad",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "Responsable del tratamiento", body: [
        "Mercado (proyecto de demostración), con domicilio en la Ciudad de México, es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Contacto: ayuda@mercado.mx.",
      ]},
      { heading: "Datos que recabamos", body: [
        "Datos de identificación y contacto (nombre, correo, teléfono), domicilio de envío, historial de compras y ventas, mensajes de la transacción y datos de navegación.",
        "En Mercado Shops también recabamos datos fiscales (RFC, razón social y domicilio) que se publican en la ficha «Información del vendedor».",
        "No almacenamos números completos de tarjeta: solo los últimos cuatro dígitos y la fecha de vencimiento.",
      ]},
      { heading: "Finalidades", body: [
        "Finalidades primarias: crear y administrar tu cuenta, procesar compras, envíos y pagos, prevenir fraudes y atender aclaraciones.",
        "Finalidades secundarias: enviarte recomendaciones, avisos y promociones. Puedes oponerte en cualquier momento desde Configuración.",
      ]},
      { heading: "Transferencias", body: [
        "Compartimos los datos necesarios con las empresas de paquetería y con los procesadores de pago para completar la operación. No transferimos datos a terceros con fines distintos sin tu consentimiento.",
      ]},
      { heading: "Derechos ARCO", body: [
        "Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, así como revocar tu consentimiento, escribiendo a ayuda@mercado.mx. Responderemos en un plazo máximo de 20 días hábiles.",
      ]},
      { heading: "Cambios al aviso", body: [
        "Cualquier modificación a este aviso de privacidad se publicará en esta misma página.",
      ]},
    ],
  },
  cookies: {
    title: "Política de cookies",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "Qué son", body: ["Archivos pequeños que el sitio guarda en tu navegador para recordar tu sesión y tus preferencias."] },
      { heading: "Cookies que utilizamos", body: [
        "Necesarias: mantienen tu sesión iniciada y protegen los formularios.",
        "De personalización: recuerdan tus filtros y búsquedas recientes.",
        "Analíticas: nos ayudan a entender de forma agregada qué secciones se usan más.",
      ]},
      { heading: "Cómo gestionarlas", body: ["Puedes bloquearlas desde la configuración de tu navegador; algunas funciones dejarán de estar disponibles."] },
    ],
  },
  prohibidos: {
    title: "Artículos prohibidos",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "No se pueden vender en Mercado", body: [
        "Armas, municiones y réplicas realistas.",
        "Drogas, tabaco, bebidas alcohólicas y medicamentos que requieren receta.",
        "Productos apócrifos o copias no autorizadas.",
        "Animales vivos y especies protegidas por la NOM-059-SEMARNAT.",
        "Datos personales, cuentas de usuario y contraseñas.",
        "Alimentos sin etiquetado ni trazabilidad y cosméticos de uso íntimo ya abiertos.",
        "Contenido para adultos y material que incite al odio o a la violencia.",
        "Dinero de curso legal, tarjetas bancarias y servicios financieros.",
        "Piezas arqueológicas y bienes del patrimonio cultural de la nación.",
      ]},
      { heading: "Consecuencias", body: [
        "Retiramos la publicación, podemos suspender la cuenta o la tienda y, cuando corresponde, damos aviso a las autoridades competentes.",
      ]},
    ],
  },
  shops: {
    title: "Reglas de Mercado Shops",
    updated: "1 de enero de 2026",
    sections: [
      { heading: "Quién puede abrir una tienda", body: [
        "Personas físicas con actividad empresarial y personas morales con RFC vigente. El alta es gratuita y está sujeta a revisión de los datos fiscales.",
      ]},
      { heading: "Obligaciones de la tienda", body: [
        "Publicar de forma visible nombre o razón social, RFC, domicilio, teléfono, correo de atención y política de devoluciones.",
        "Mantener el inventario actualizado y enviar dentro del plazo publicado.",
        "Emitir comprobante fiscal (CFDI) cuando la persona compradora lo solicite.",
      ]},
      { heading: "Inventario y variantes", body: [
        "Cada producto puede tener varias piezas y variantes de talla, color o presentación con inventario independiente. El inventario se descuenta al confirmarse el pago y se restituye si la operación se cancela.",
      ]},
      { heading: "Comisiones", body: [
        "La comisión por venta es del 10 % del precio del producto. No hay cuota de alta ni mensualidad.",
      ]},
      { heading: "Suspensión", body: [
        "Mercado puede suspender una tienda que incumpla estas reglas, la Ley Federal de Protección al Consumidor o la política de artículos prohibidos.",
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
