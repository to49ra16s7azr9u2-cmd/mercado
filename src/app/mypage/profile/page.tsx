import { currentUser } from "@/lib/auth";
import { updateProfileAction } from "@/lib/actions";
import { ProfileForm } from "@/components/SettingsForms";

export const metadata = { title: "Editar perfil" };

export default async function ProfilePage() {
  const user = (await currentUser())!;
  return (
    <>
      <h1 className="text-xl font-bold">Editar perfil</h1>
      <p className="mt-1 text-sm text-muted">Así te ve el resto de personas en Mercado.</p>
      <div className="mt-4">
        <ProfileForm
          action={updateProfileAction}
          user={{ name: user.name, handle: user.handle, bio: user.bio, avatar_seed: user.avatar_seed }}
        />
      </div>
    </>
  );
}
