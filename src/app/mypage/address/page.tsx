import { currentUser } from "@/lib/auth";
import { updateAddressAction } from "@/lib/actions";
import { AddressForm } from "@/components/SettingsForms";

export const metadata = { title: "Dirección de envío" };

export default async function AddressPage() {
  const user = (await currentUser())!;
  return (
    <>
      <h1 className="text-xl font-bold">Dirección de envío</h1>
      <p className="mt-1 text-sm text-muted">
        La usaremos en tus compras. Con los envíos de Mercado permanece oculta para quien vende.
      </p>
      <div className="mt-4">
        <AddressForm
          action={updateAddressAction}
          address={{
            name: user.addr_name, zip: user.addr_zip, region: user.addr_region,
            city: user.addr_city, line: user.addr_line, phone: user.addr_phone,
          }}
        />
      </div>
    </>
  );
}
