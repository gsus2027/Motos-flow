"use client";
import { useRouter } from "next/navigation";
import FormularioRenta from "@/components/FormularioRenta";

export default function NuevaRentaStaff() {
  const router = useRouter();
  return (
    <div>
      <h1 className="v2-panel-h">Nueva renta</h1>
      <p className="v2-panel-sub">
        Regístrala tú mismo con el cliente presente, o compárteles el link{" "}
        <code>/rentar</code> para que la llenen desde su propio celular.
      </p>
      <FormularioRenta
        onExito={() => {
          router.push("/admin");
          router.refresh();
        }}
      />
    </div>
  );
}
