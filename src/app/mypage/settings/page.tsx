import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { changePasswordAction, logOutAction, updateNotificationSettingsAction } from "@/lib/actions";
import { NotificationsForm, PasswordForm } from "@/components/SettingsForms";
import { SubmitButton } from "@/components/SubmitButton";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const user = await requireUser("/mypage/settings");
  return (
    <>
      <h1 className="text-xl font-bold">Configuración</h1>

      <h2 className="mt-5 text-sm font-bold text-muted">Datos de la cuenta</h2>
      <dl className="card mt-2 divide-y divide-line p-4 text-sm">
        <div className="flex justify-between py-2"><dt className="text-muted">Correo electrónico</dt><dd>{user.email}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-muted">Nombre de usuario</dt><dd>@{user.handle}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-muted">Miembro desde</dt><dd>{shortDate(user.created_at)}</dd></div>
        <div className="flex justify-between py-2">
          <dt className="text-muted">Identidad</dt>
          <dd>{user.is_verified ? "Verificada ✅" : <Link href="/mypage/identity" className="link">Sin verificar</Link>}</dd>
        </div>
      </dl>

      <h2 className="mt-5 text-sm font-bold text-muted">Notificaciones</h2>
      <div className="mt-2">
        <NotificationsForm
          action={updateNotificationSettingsAction}
          settings={{
            notify_like: user.notify_like,
            notify_comment: user.notify_comment,
            notify_order: user.notify_order,
            notify_message: user.notify_message,
            notify_news: user.notify_news,
          }}
        />
      </div>

      <h2 className="mt-5 text-sm font-bold text-muted">Seguridad</h2>
      <div className="mt-2">
        <PasswordForm action={changePasswordAction} />
      </div>

      <h2 className="mt-5 text-sm font-bold text-muted">Sesión</h2>
      <form action={logOutAction} className="card mt-2 p-4">
        <p className="text-sm text-muted">Cierra la sesión en este dispositivo.</p>
        <SubmitButton className="btn-outline mt-3">Cerrar sesión</SubmitButton>
      </form>

      <div className="card mt-5 p-4 text-xs text-muted">
        <p className="font-bold text-ink">Enlaces útiles</p>
        <ul className="mt-2 space-y-1">
          <li><Link href="/legal/terminos" className="link">Términos de uso</Link></li>
          <li><Link href="/legal/privacidad" className="link">Política de privacidad</Link></li>
          <li><Link href="/legal/prohibidos" className="link">Artículos prohibidos</Link></li>
          <li><Link href="/help" className="link">Centro de ayuda</Link></li>
        </ul>
      </div>
    </>
  );
}
