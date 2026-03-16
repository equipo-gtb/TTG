// src/pages/territories/AssignTerritory.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import type { Territory } from "../../types/territory";
import type { User } from "../../types/user";
import { Combobox } from "@headlessui/react";
import { format } from "date-fns";

export default function AssignTerritory() {
  const [territorios, setTerritorios] = useState<Territory[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [selectedUserObj, setSelectedUserObj] = useState<User | null>(null);
  const [selectedTerritorio, setSelectedTerritorio] = useState("");
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const [campania, setCampania] = useState(false);
  const [comentarios, setComentario] = useState("");

  useEffect(() => {
    async function load() {
      // 1) Cargamos todos los territorios disponibles
      const { data: terrs } = await supabase
        .from<Territory, Territory>("territorios")
        .select(
          "id, numero, estado, fecha_entrega, fecha_caducidad, descansa_hasta, usuario_asignado(id), imagen_url"
        );

      const hoy = new Date();
      const libres =
        terrs?.filter((t) => {
          if (t.estado !== "disponible") return false;
          if (t.fecha_caducidad && hoy > new Date(t.fecha_caducidad))
            return false;
          if (t.descansa_hasta && hoy < new Date(t.descansa_hasta))
            return false;
          return true;
        }) || [];
      setTerritorios(libres);

      // 2) Cargamos todos los usuarios (antes solo los que no tenían ninguno)
      const { data: us } = await supabase
        .from<User>("usuarios")
        .select("id, nombre, telefono");

      setUsuarios(us || []); // ahora todos los usuarios

      // 3) Fecha de devolución por defecto a +3 meses
      const t3 = new Date();
      t3.setMonth(t3.getMonth() + 3);
      setFechaDevolucion(t3.toISOString().slice(0, 10));
    }

    load();
  }, []);

  // filtrado local de combobox
  const filteredUsers =
    searchUser === ""
      ? usuarios
      : usuarios.filter((u) =>
          u.nombre.toLowerCase().includes(searchUser.toLowerCase())
        );

  // función para abrir WhatsApp (igual que antes)
  const sendWhatsAppMessage = () => {
    if (!selectedUserObj || !selectedTerritorio) return;

    const territorio = territorios.find((t) => t.id === selectedTerritorio);
    if (!territorio) return;

    const fechaEntrega = format(new Date(), "dd/MM/yyyy");
    const fechaDev = format(new Date(fechaDevolucion), "dd/MM/yyyy");

    const message = `_¡Hola ${selectedUserObj.nombre}!_\n\n` +
      `Te hemos asignado el territorio # *${territorio.numero}*.\n\n` +
      `*📆 Fecha de entrega:* ${fechaEntrega}\n` +
      `*📆 Fecha límite de finalización:* ${fechaDev}\n\n` +
      `*_Sí lo finalizas antes de la fecha indicada por favor avisar para registrarlo_* \n\n` +
      `${territorio.imagen_url ? `\n🔍 *Para ver territorio en formato PDF 📄 toca el siguiente enlace:* ${territorio.imagen_url}\n` : ''}` +
      `*Si no puedes ver el enlace con el PDF, avisar para enviar el archivo por separado* \n\n` +
      `Un saludo 👋`;

    const encodedMessage = encodeURIComponent(message);
    const phone = selectedUserObj.telefono.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
  };

  // al enviar el formulario
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTerritorio || !selectedUserObj) {
      return alert("Territorio y usuario son obligatorios");
    }

    const hoy = new Date().toISOString().slice(0, 10);

    // 1) Actualizar territorio
    const { error: updateError } = await supabase
      .from("territorios")
      .update({
        estado: "en_uso",
        usuario_asignado: selectedUserObj.id,
        fecha_entrega: hoy,
        fecha_devolucion: fechaDevolucion,
        fecha_caducidad: fechaDevolucion,
        es_campaña_especial: campania,
        comentarios,
      })
      .eq("id", selectedTerritorio);

    if (updateError) {
      return alert("Error al asignar: " + updateError.message);
    }

    // 2) Registrar en historial entregas
    const { error: logError } = await supabase.from("entregas").insert([
      {
        territorio_id: selectedTerritorio,
        usuario_id: selectedUserObj.id,
        fecha_entrega: hoy,
        fecha_devolucion: fechaDevolucion,
        comentarios,
        estado_territorio: "entregado",
      },
    ]);

    if (logError) {
      return alert(
        "Asignado, pero error al guardar historial: " + logError.message
      );
    }

    // 3) Abrir WhatsApp
    sendWhatsAppMessage();

    alert(
      "¡Territorio asignado exitosamente! Se abrirá WhatsApp para enviar el mensaje."
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-blue-600">
        Asignación de Territorio
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Territorio */}
        <div>
          <label className="block mb-1 font-medium">Territorio disponible</label>
          <select
            required
            className="input w-full"
            value={selectedTerritorio}
            onChange={(e) => setSelectedTerritorio(e.target.value)}
          >
            <option value="">Seleccionar territorio</option>
            {territorios.map((t) => (
              <option key={t.id} value={t.id}>
                Territorio #{t.numero}
                {t.fecha_caducidad && (
                  <> – vence {format(new Date(t.fecha_caducidad), "dd/MM/yyyy")}</>
                )}
                {t.imagen_url && " (con imagen)"}
              </option>
            ))}
          </select>
        </div>

        {/* Usuario */}
        <div>
          <label className="block mb-1 font-medium">Usuario responsable</label>
          <Combobox
            value={selectedUserObj}
            onChange={setSelectedUserObj}
          >
            <div className="relative">
              <Combobox.Input
                className="input w-full"
                placeholder="Buscar usuario..."
                onChange={(e) => setSearchUser(e.target.value)}
                displayValue={(u: User) => u?.nombre || ""}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                ▼
              </Combobox.Button>
              {filteredUsers.length > 0 && (
                <Combobox.Options className="absolute mt-1 w-full bg-white shadow max-h-60 overflow-auto z-10">
                  {filteredUsers.map((u) => (
                    <Combobox.Option
                      key={u.id}
                      value={u}
                      className={({ active }) =>
                        `cursor-pointer select-none p-2 ${
                          active ? "bg-blue-100" : ""
                        }`
                      }
                    >
                      {u.nombre} – {u.telefono}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              )}
            </div>
          </Combobox>
        </div>

        {/* Fecha (auto) */}
        <div>
          <label className="block mb-1 font-medium">
            Fecha de devolución (auto)
          </label>
          <input
            type="date"
            className="input w-full bg-gray-100 text-gray-700"
            readOnly
            value={fechaDevolucion}
          />
        </div>

        {/* Campaña */}
        <div className="flex items-center space-x-2">
          <input
            id="campania"
            type="checkbox"
            checked={campania}
            onChange={(e) => setCampania(e.target.checked)}
            className="form-checkbox"
          />
          <label htmlFor="campania">¿Campaña especial?</label>
        </div>

        {/* Comentario */}
        <div>
          <label className="block mb-1 font-medium">Comentarios</label>
          <textarea
            className="input w-full"
            rows={3}
            value={comentarios}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Notas adicionales sobre la asignación..."
          />
        </div>

        <button
          type="submit"
          className="text-white bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 font-medium rounded-full text-sm px-5 py-3.5 w-full"
        >
          Asignar Territorio
        </button>
      </form>
    </div>
  );
}
