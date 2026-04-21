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
    case "habilitado":
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

  // 🔧 LOGICA DE PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getTerritoriosList();
    setTerritorios(data);
    setSelectedIds(new Set());
    setEditingId(null);
  }

  // 🔧 FUNCIÓN TÉCNICA: Habilitar territorio (Limpia historial actual y descansos)
  async function forceEnable(t: Territory) {
    if (!confirm(`¿Habilitar territorio #${t.numero} inmediatamente? Esto borrará el periodo de descanso y lo dejará disponible.`)) return;
    
    const payload: Partial<Territory> = {
      estado: "disponible",
      fecha_entrega: null,
      fecha_caducidad: null,
      descansa_hasta: null, // Rompe la regla de los 6 meses de Supabase
      usuario_asignado: null, // Limpia la relación con el último usuario
    };

    await updateTerritorio(t.id, payload);
    load();
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
      fecha_entrega: editEstado === "disponible" ? null : editFechaEntrega || null,
      fecha_caducidad: editEstado === "disponible" ? null : editFechaCaducidad || null,
    };

    // Si guardas como disponible, limpiamos el descanso para evitar que Supabase lo bloquee
    if (editEstado === "disponible") {
      payload.descansa_hasta = null;
    }

    await updateTerritorio(id, payload);
    load();
  }

  const estadoOptions = useMemo(() => {
    const base = ["en_uso", "disponible", "inhabilitado", "caducado", "especial"];
    const fromData = Array.from(new Set(territorios.map(t => t.estado))).filter(Boolean);
    const all = Array.from(new Set([...base, ...fromData]));
    if (fromData.includes("habilitado") && !all.includes("habilitado")) all.push("habilitado");
    return all;
  }, [territorios]);

  const filteredTerritorios = useMemo(() => {
    if (filterEstado === "todos") return territorios;
    const target = normalizeEstado(filterEstado);
    return territorios.filter(t => normalizeEstado(t.estado) === target);
  }, [territorios, filterEstado]);

  const totalPages = Math.ceil(filteredTerritorios.length / itemsPerPage);
  const currentTerritorios = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTerritorios.slice(start, start + itemsPerPage);
  }, [filteredTerritorios, currentPage]);

  useEffect(() => {
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [filterEstado]);

  const Chip = ({ value, label }: { value: string; label?: string }) => {
    const active = filterEstado === value;
    return (
      <button
        type="button"
        onClick={() => setFilterEstado(value)}
        className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
          active ? "bg-indigo-600 text-white border-indigo-600 shadow" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        ].join(" ")}
      >
        {label ?? value}
      </button>
    );
  };

  return (
    <div className="relative shadow-sm sm:rounded-2xl pb-10">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl shadow-sm p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-full sm:min-w-[240px]">
              <label htmlFor="estadoFilter" className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                Filtrar por estado
              </label>
              <div className="relative">
                <select
                  id="estadoFilter"
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  {estadoOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip value="en_uso" />
              <Chip value="disponible" />
              <Chip value="inhabilitado" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Mostrando <span className="font-semibold text-slate-700">{filteredTerritorios.length}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.size === 0}
          className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M9 6v12m6-12v12M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Borrar ({selectedIds.size})
        </button>
      </div>

      {/* --- VISTA RESPONSIVE (CARDS) --- */}
      <div className="grid grid-cols-1 gap-4 md:hidden px-1">
        {currentTerritorios.map((t) => {
          const isEditing = editingId === t.id;
          return (
            <div key={t.id} className={`bg-white p-4 rounded-xl border ${selectedIds.has(t.id) ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-200'} shadow-sm`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                  />
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-sm font-bold shadow-sm outline-none"
                      value={editNumero}
                      onChange={(e) => setEditNumero(+e.target.value)}
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-900">#{t.numero}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${estadoBadgeClasses(t.estado)}`}>
                    {t.estado}
                  </span>
                  {/* Botón Habilitar ya (Móvil) */}
                  {!isEditing && t.estado === "inhabilitado" && (
                    <button 
                      onClick={() => forceEnable(t)}
                      className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded shadow-sm"
                    >
                      Habilitar ya
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-4 px-2">
                <div className="flex justify-between font-medium"><span className="text-slate-400 font-normal">Asignado a:</span> {t.usuario_asignado?.nombre ?? "-"}</div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Entrega:</span>
                  {isEditing ? (
                    <input type="date" className="text-xs border rounded px-1" value={editFechaEntrega} onChange={(e) => setEditFechaEntrega(e.target.value)} />
                  ) : (
                    <span>{t.fecha_entrega ? format(new Date(t.fecha_entrega), "dd/MM/yyyy") : "-"}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Caduca:</span>
                  {isEditing ? (
                    <input type="date" className="text-xs border rounded px-1" value={editFechaCaducidad} onChange={(e) => setEditFechaCaducidad(e.target.value)} />
                  ) : (
                    <span>{t.fecha_caducidad ? format(new Date(t.fecha_caducidad), "dd/MM/yyyy") : "-"}</span>
                  )}
                </div>
                <div className="flex justify-between font-medium"><span className="text-slate-400 font-normal">Descansa:</span> <span>{t.descansa_hasta ? format(new Date(t.descansa_hasta), "dd/MM/yyyy") : "-"}</span></div>
              </div>

              <div className="flex justify-end gap-4 pt-2 border-t border-slate-100">
                {isEditing ? (
                  <>
                    <button onClick={() => saveEdit(t.id)} className="text-indigo-600 font-bold text-sm">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 text-sm">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(t)} className="text-indigo-600 font-medium text-sm">Editar</button>
                    <button onClick={() => confirm("¿Borrar?") && deleteTerritorio(t.id).then(load)} className="text-rose-600 font-medium text-sm">Borrar</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- VISTA DESKTOP (TABLA) --- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs uppercase bg-slate-800 text-slate-100">
            <tr>
              <th className="p-4 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(currentTerritorios.map((t) => t.id)));
                    else setSelectedIds(new Set());
                  }}
                  checked={currentTerritorios.length > 0 && currentTerritorios.every(t => selectedIds.has(t.id))}
                />
              </th>
              <th className="px-6 py-4 font-bold">Número</th>
              <th className="px-6 py-4 font-bold">Estado</th>
              <th className="px-6 py-4 font-bold">Asignado a</th>
              <th className="px-6 py-4 font-bold">Entregado</th>
              <th className="px-6 py-4 font-bold">Caduca</th>
              <th className="px-6 py-4 font-bold text-center">Descansa</th>
              <th className="px-6 py-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentTerritorios.map((t) => {
              const isEditing = editingId === t.id;
              return (
                <tr key={t.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="w-4 p-4 text-center">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {isEditing ? <input type="number" className="w-20 rounded border border-slate-300 px-2 py-1 outline-none" value={editNumero} onChange={(e) => setEditNumero(+e.target.value)} /> : t.numero}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <select className="rounded border border-slate-300 px-2 py-1 outline-none" value={editEstado} onChange={(e) => setEditEstado(e.target.value)}>
                        {estadoOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${estadoBadgeClasses(t.estado)}`}>
                        {t.estado}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{t.usuario_asignado?.nombre ?? "-"}</td>
                  <td className="px-6 py-4">
                    {isEditing ? <input type="date" className="border rounded px-2 py-1 text-xs" value={editFechaEntrega} onChange={(e) => setEditFechaEntrega(e.target.value)} /> : (t.fecha_entrega ? format(new Date(t.fecha_entrega), "dd/MM/yyyy") : "-")}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? <input type="date" className="border rounded px-2 py-1 text-xs" value={editFechaCaducidad} onChange={(e) => setEditFechaCaducidad(e.target.value)} /> : (t.fecha_caducidad ? format(new Date(t.fecha_caducidad), "dd/MM/yyyy") : "-")}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-slate-400">
                    {t.descansa_hasta ? format(new Date(t.descansa_hasta), "dd/MM/yyyy") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      {isEditing ? (
                        <button onClick={() => saveEdit(t.id)} className="text-indigo-600 font-bold hover:underline">Guardar</button>
                      ) : (
                        <>
                          <button onClick={() => startEdit(t)} className="text-indigo-600 hover:underline">Editar</button>
                          {t.estado === "inhabilitado" && (
                            <button onClick={() => forceEnable(t)} className="text-green-600 font-bold hover:underline">Habilitar</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- PAGINACIÓN --- */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="inline-flex shadow-sm rounded-lg overflow-hidden border border-slate-300">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
          >
            Anterior
          </button>
          <div className="px-4 py-2 bg-white text-sm font-semibold border-x border-slate-300">
            {currentPage} / {totalPages || 1}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-2 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
          >
            Siguiente
          </button>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          Total de {filteredTerritorios.length} registros encontrados
        </p>
      </div>
    </div>
  );
}