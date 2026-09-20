import { requireUser } from "@/lib/auth";
import { verifyIdentityAction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Verificación de identidad" };

export default async function IdentityPage() {
  const user = await requireUser("/mypage/identity");
  return (
    <>
      <h1 className="text-xl font-bold">Verificación de identidad</h1>
      <p className="mt-1 text-sm text-muted">
        Necesitamos verificar tu identidad para poder transferirte el dinero de tus ventas.
      </p>
      {user.is_verified ? (
        <div className="card mt-4 p-6 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-2 font-bold">Tu identidad está verificada</p>
          <p className="mt-1 text-sm text-muted">Ya puedes solicitar transferencias de tu saldo.</p>
        </div>
      ) : (
        <form action={verifyIdentityAction} className="card mt-4 space-y-4 p-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3"><span className="font-black text-brand">1</span> Haz una foto del anverso y del reverso de tu DNI o NIE.</li>
            <li className="flex gap-3"><span className="font-black text-brand">2</span> Grábate un vídeo corto girando la cabeza.</li>
            <li className="flex gap-3"><span className="font-black text-brand">3</span> Revisamos los datos en menos de 24 horas.</li>
          </ol>
          <div className="rounded-lg border-2 border-dashed border-line p-6 text-center text-sm text-muted">
            📄 Demostración: no se sube ningún documento real.
          </div>
          <SubmitButton className="btn-primary btn-lg">Verificar mi identidad</SubmitButton>
        </form>
      )}
    </>
  );
}
