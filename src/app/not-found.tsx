import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl" aria-hidden>🔍</p>
      <h1 className="mt-4 text-xl font-bold">No hemos encontrado esta página</h1>
      <p className="mt-2 text-sm text-muted">
        Puede que el artículo se haya vendido o que el enlace haya cambiado.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-primary">Ir al inicio</Link>
        <Link href="/search" className="btn-outline">Buscar artículos</Link>
      </div>
    </div>
  );
}
