import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { signUpAction } from "@/lib/actions";
import { SignUpForm } from "@/components/AuthForms";

export const metadata = { title: "Crear cuenta" };

export default async function SignUpPage() {
  const user = await currentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="text-center text-2xl font-bold">Crear cuenta gratis</h1>
      <p className="mt-1 text-center text-sm text-muted">
        Te regalamos 300 puntos y un cupón de $100 para empezar.
      </p>
      <div className="card mt-6 p-6">
        <SignUpForm action={signUpAction} />
      </div>
      <ul className="mt-5 space-y-2 text-xs text-muted">
        <li>✅ Publicar es gratis: solo pagas el 10 % cuando vendes.</li>
        <li>✅ Envíos con guía prepagada, rastreo y dirección oculta.</li>
        <li>✅ El dinero se libera cuando confirmas que todo está bien.</li>
      </ul>
    </div>
  );
}
