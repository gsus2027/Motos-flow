"use client";
import { useRouter } from "next/navigation";
import FormularioRentaEbike from "@/components/FormularioRentaEbike";

export default function NuevaRentaEbikeStaff() {
  const router = useRouter();
  return (
    <div>
      <h1 className="v2-panel-h">Nueva renta de Ebike</h1>
      <p className="v2-panel-sub">
        Regístrala tú mismo con el cliente presente, o compárteles el link{" "}
        <code>/rentar-ebike</code> para que la llenen desde su propio celular.
      </p>
      <FormularioRentaEbike
        onExito={() => {
          router.push("/admin");
          router.refresh();
        }}
      />
    </div>
  );
}
