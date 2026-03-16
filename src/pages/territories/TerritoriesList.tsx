// src/pages/territories/TerritoriesList.tsx
import { useEffect, useMemo, useState } from "react";
import {
  getTerritoriosList,
  updateTerritorio,
  deleteTerritorio,
  deleteTerritorios,
} from "../../services/territories";
import type { Territory } from "../../types/territory";
import { format, isBefore, startOfDay } from "date-fns";

// Badges de estado
function estadoBadgeClasses(estado: string) {
  switch (estado) {
    case "caducado":
      return "bg-red-100 text-red-700 border-red-200";
    case "en_uso":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "disponible":
      return "bg-green-100 text-green-700 border-green-200";
    case "inhabilitado":
    case "habilitado": // alias tolerado
      return "bg-gray-200 text-gray-700 border-gray-300";
    case "especial":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
const normalizeEstado = (s?: string) =>
  s === "habilitado" ? "inhabilitado" : s ?? "";

export default function TerritoriesList() {
  const [territorios, setTerritorios] = useState<Territory[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editables
  const [editNumero, setEditNumero] = useState<number>(0);
  const [editEstado, setEditEstado] = useState<string>("");
  const [editFechaEntrega, setEditFechaEntrega] = useState<string>("");
  const [editFechaCaducidad, setEditFechaCaducidad] = useState<string>("");
  const [applyCaducado, setApplyCaducado] = useState<boolean>(false);

  // Filtro por estado
  const [filterEstado, setFilterEstado] = useState<string>("todos");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getTerritoriosList();
    setTerritorios(data);
    setSelectedIds(new Set());
    setEditingId(null);
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  }

  async function handleBulkDelete() {
    if (!confirm(`¿Borrar ${selectedIds.size} territorios?`)) return;
    await deleteTerritorios(Array.from(selectedIds));
    load();
  }

  function startEdit(t: Territory) {
    setEditingId(t.id);
    setEditNumero(t.numero);
    setEditEstado(t.estado);
    setEditFechaEntrega(t.fecha_entrega ? format(new Date(t.fecha_entrega), "yyyy-MM-dd") : "");
    setEditFechaCaducidad(t.fecha_caducidad ? format(new Date(t.fecha_caducidad), "yyyy-MM-dd") : "");
    setApplyCaducado(false);
  }

  async function saveEdit(id: string) {
    if (editFechaEntrega && editFechaCaducidad) {
      const d1 = new Date(editFechaEntrega).getTime();
      const d2 = new Date(editFechaCaducidad).getTime();
      if (d2 < d1) {
        alert("La fecha de caducidad no puede ser anterior a la de entrega.");
        return;
      }
    }

    const shouldForceCaducado =
      applyCaducado &&
      !!editFechaCaducidad &&
      isBefore(new Date(editFechaCaducidad), startOfDay(new Date()));

    const finalEstado = shouldForceCaducado ? "caducado" : editEstado;

    const payload: Partial<Territory> = {
      numero: editNumero,
      estado: finalEstado,
      fecha_entrega: editFechaEntrega || null,
      fecha_caducidad: editFechaCaducidad || null,
    };

    await updateTerritorio(id, payload);
    load();
  }

  // Opciones de filtro (base + lo que venga de BD)
  const estadoOptions = useMemo(() => {
    const base = ["en_uso", "disponible", "inhabilitado", "caducado", "especial"];
    const fromData = Array.from(new Set(territorios.map(t => t.estado))).filter(Boolean);
    const all = Array.from(new Set([...base, ...fromData]));
    if (fromData.includes("habilitado") && !all.includes("habilitado")) all.push("habilitado");
    return all;
  }, [territorios]);

  // Lista filtrada
  const filteredTerritorios = useMemo(() => {
    if (filterEstado === "todos") return territorios;
    const target = normalizeEstado(filterEstado);
    return territorios.filter(t => normalizeEstado(t.estado) === target);
  }, [territorios, filterEstado]);

  // Reset selección al cambiar filtro
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterEstado]);

  // Chip helper
  const Chip = ({
    value,
    label,
  }: {
    value: string;
    label?: string;
  }) => {
    const active = filterEstado === value;
    return (
      <button
        type="button"
        onClick={() => setFilterEstado(value)}
        className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
          active
            ? "bg-indigo-600 text-white border-indigo-600 shadow"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        ].join(" ")}
        title={`Filtrar: ${label ?? value}`}
      >
        {label ?? value}
      </button>
    );
  };

  return (
    <div className="relative overflow-x-auto shadow-sm sm:rounded-2xl">
      {/* Toolbar bonita */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Bloque de filtro */}
        <div className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl shadow-sm p-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Select con chevron */}
            <div className="min-w-[240px]">
              <label htmlFor="estadoFilter" className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                Filtrar por estado
              </label>
              <div className="relative">
                <select
                  id="estadoFilter"
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  {estadoOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {/* chevron */}
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Chips de acceso rápido */}
            <div className="flex items-center gap-2">
              <Chip value="en_uso" />
              <Chip value="disponible" />
              <Chip value="inhabilitado" label="inhabilitado" />
            </div>

            {/* Limpiar + contador */}
            <div className="ml-auto flex items-center gap-3">
              {filterEstado !== "todos" && (
                <button
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                  onClick={() => setFilterEstado("todos")}
                >
                  {/* icono X */}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  limpiar
                </button>
              )}
              <span className="text-xs text-slate-500">
                Mostrando <span className="font-semibold text-slate-700">{filteredTerritorios.length}</span> de {territorios.length}
              </span>
            </div>
          </div>
        </div>

        {/* Botón borrar seleccionados */}
        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.size === 0}
          className="inline-flex items-center justify-center rounded-full bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* trash icon simple */}
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M9 6v12m6-12v12M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Borrar seleccionados
        </button>
      </div>

      {/* Tabla */}
      <table className="w-full text-sm text-left text-slate-600">
        <thead className="text-xs uppercase bg-slate-800 text-slate-100">
          <tr>
            <th scope="col" className="p-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedIds(new Set(filteredTerritorios.map((t) => t.id)));
                    else setSelectedIds(new Set());
                  }}
                  checked={
                    filteredTerritorios.length > 0 &&
                    filteredTerritorios.every(t => selectedIds.has(t.id))
                  }
                  aria-label="Seleccionar todos los visibles"
                />
              </div>
            </th>
            <th className="px-6 py-3">Número</th>
            <th className="px-6 py-3">Estado</th>
            <th className="px-6 py-3">Asignado a</th>
            <th className="px-6 py-3">Entregado</th>
            <th className="px-6 py-3">Caduca</th>
            <th className="px-6 py-3">Descansa hasta</th>
            <th className="px-6 py-3">Comentarios</th>
            <th className="px-6 py-3">Acciones</th>
          </tr>
        </thead>

        <tbody className="bg-white">
          {filteredTerritorios.map((t) => {
            const isEditing = editingId === t.id;
            const showCaducadoWarning =
              isEditing &&
              !!editFechaCaducidad &&
              isBefore(new Date(editFechaCaducidad), startOfDay(new Date())) &&
              editEstado !== "caducado";

            return (
              <tr key={t.id} className="border-b last:border-b-0 hover:bg-slate-50">
                {/* Checkbox fila */}
                <td className="w-4 p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                  />
                </td>

                {/* Número */}
                <td className="px-6 py-4 font-medium text-slate-900">
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      value={editNumero}
                      onChange={(e) => setEditNumero(+e.target.value)}
                    />
                  ) : (
                    t.numero
                  )}
                </td>

                {/* Estado */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <select
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value)}
                      disabled={applyCaducado}
                    >
                      {estadoOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                        estadoBadgeClasses(t.estado)
                      }
                      title={t.estado}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                      {t.estado}
                    </span>
                  )}
                </td>

                {/* Asignado a */}
                <td className="px-6 py-4">{t.usuario_asignado?.nombre ?? "-"}</td>

                {/* Entregado */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <input
                      type="date"
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      value={editFechaEntrega}
                      onChange={(e) => setEditFechaEntrega(e.target.value)}
                    />
                  ) : t.fecha_entrega ? (
                    format(new Date(t.fecha_entrega), "dd/MM/yyyy")
                  ) : (
                    "-"
                  )}
                </td>

                {/* Caduca + aviso + checkbox */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <>
                      <input
                        type="date"
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        value={editFechaCaducidad}
                        onChange={(e) => setEditFechaCaducidad(e.target.value)}
                      />
                      {showCaducadoWarning && (
                        <div className="mt-1">
                          <p className="text-xs text-amber-600">
                            Sugerencia: con esta fecha el territorio estaría <strong>caducado</strong>.
                          </p>
                          <label className="mt-1 flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={applyCaducado}
                              onChange={(e) => setApplyCaducado(e.target.checked)}
                            />
                            Aplicar y marcar como <strong>caducado</strong> al guardar
                          </label>
                        </div>
                      )}
                    </>
                  ) : t.fecha_caducidad ? (
                    format(new Date(t.fecha_caducidad), "dd/MM/yyyy")
                  ) : (
                    "-"
                  )}
                </td>

                {/* Descansa hasta */}
                <td className="px-6 py-4">
                  {t.descansa_hasta ? format(new Date(t.descansa_hasta), "dd/MM/yyyy") : "-"}
                </td>

                {/* Comentarios */}
                <td className="px-6 py-4">{t.comentarios ?? "-"}</td>

                {/* Acciones */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => saveEdit(t.id)} className="text-indigo-600 hover:underline">
                        Guardar
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-slate-600 hover:underline">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => startEdit(t)} className="text-indigo-600 hover:underline">
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("¿Borrar este territorio?")) {
                            deleteTerritorio(t.id).then(load);
                          }
                        }}
                        className="text-rose-600 hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}