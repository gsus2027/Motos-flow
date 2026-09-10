"use client";
import { useRouter } from "next/navigation";
import FormularioRentaEbike from "@/components/FormularioRentaEbike";

export default function NuevaRentaEbikeStaff() {
  const router = useRouter();
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: 0 }}>Nueva renta de Ebike</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
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
