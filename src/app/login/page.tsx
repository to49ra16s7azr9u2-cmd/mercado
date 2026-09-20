import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { logInAction } from "@/lib/actions";
import { LogInForm } from "@/components/AuthForms";

export const metadata = { title: "Entrar" };

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="text-center text-2xl font-bold">Entrar en Mercado</h1>
      <p className="mt-1 text-center text-sm text-muted">
        Compra, vende y sigue tus transacciones desde cualquier dispositivo.
      </p>
      <div className="card mt-6 p-6">
        <LogInForm action={logInAction} next={next ?? "/"} />
      </div>
      <div className="card mt-4 bg-brand-soft p-4 text-center text-xs text-brand-darker">
        <p className="font-bold">Cuenta de demostración</p>
        <p className="mt-1">demo@mercado.mx · contraseña: demo1234</p>
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        ¿Problemas para entrar? <Link href="/help" className="link">Consulta el centro de ayuda</Link>
      </p>
    </div>
  );
}
