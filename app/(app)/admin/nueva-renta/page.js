"use client";
import { useRouter } from "next/navigation";
import FormularioRenta from "@/components/FormularioRenta";

export default function NuevaRentaStaff() {
  const router = useRouter();
  return (
    <div>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 26, margin: 0 }}>Nueva renta</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14.5, margin: "6px 0 26px" }}>
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
