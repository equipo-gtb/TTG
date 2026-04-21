import { useEffect, useMemo, useState } from "react";
import { getTerritoriosList } from "../services/territories";
import { getEntregas } from "../services/deliverys";
import type { Territory } from "../types/territory";
import type { Delivery } from "../types/delivery";
import { differenceInDays, parseISO, format } from "date-fns";
import { exportHistoryExcel } from "../utils/exportHistoryExcel";

export default function Dashboard() {
  const [territorios, setTerritorios] = useState<Territory[]>([]);
  const [historial, setHistorial] = useState<Delivery[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 🗓️ ESTADO PARA EL FILTRO DE AÑO
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    getTerritoriosList().then(setTerritorios).catch(console.error);

    getEntregas()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
        );
        setHistorial(sorted);
        setCurrentPage(1);
      })
      .catch(console.error);
  }, []);

  const numeroPorId = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of territorios) {
      if (t.id && typeof t.numero === "number") map.set(t.id, t.numero);
    }
    return map;
  }, [territorios]);

  // 🗓️ OBTENER LISTA DE AÑOS DISPONIBLES DINÁMICAMENTE
  const availableYears = useMemo(() => {
    const years = historial.map(r => new Date(r.creado_en).getFullYear().toString());
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [historial]);

  // 🎨 Helper para colores según estado
  const getEstadoStyles = (estado: string) => {
    const s = estado?.toLowerCase();
    if (s === "entregado") return { border: "border-blue-500", badge: "bg-blue-100 text-blue-600" };
    if (s === "devuelto") return { border: "border-green-500", badge: "bg-green-100 text-green-600" };
    return { border: "border-gray-300", badge: "bg-gray-100 text-gray-600" };
  };

  // 📊 LÓGICA DE ESTADÍSTICAS FILTRADA POR AÑO
  const stats = useMemo(() => {
    const userCount: Record<string, number> = {};
    const territoryCount: Record<string, number> = {};

    // Filtramos los datos que procesarán las estadísticas según el año
    const historialForStats = selectedYear === "all" 
      ? historial 
      : historial.filter(r => new Date(r.creado_en).getFullYear().toString() === selectedYear);

    historialForStats.forEach((entrega) => {
      const nombreUser = entrega.usuario_id?.nombre || "Sin nombre";
      userCount[nombreUser] = (userCount[nombreUser] || 0) + 1;

      const numTerritorio = numeroPorId.get(entrega.territorio_id as any);
      const label = numTerritorio ? `#${numTerritorio}` : `ID: ${String(entrega.territorio_id).slice(0, 4)}`;
      territoryCount[label] = (territoryCount[label] || 0) + 1;
    });

    const topUsers = Object.entries(userCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topTerritories = Object.entries(territoryCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return { topUsers, topTerritories };
  }, [historial, numeroPorId, selectedYear]);

  // 🔍 LÓGICA DE FILTRADO (Año + Término de búsqueda)
  const filteredHistorial = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return historial.filter((r) => {
      // Filtro de año
      const matchesYear = selectedYear === "all" || new Date(r.creado_en).getFullYear().toString() === selectedYear;
      if (!matchesYear) return false;

      // Filtro de texto
      const numero = numeroPorId.get(r.territorio_id as any);
      const territorioLabel = numero ? `#${numero}` : "";
      const usuario = r.usuario_id?.nombre?.toLowerCase() ?? "";
      const comentarios = r.comentarios?.toLowerCase() ?? "";
      const estado = r.estado_territorio?.toLowerCase() ?? "";

      return usuario.includes(term) || territorioLabel.includes(term) || comentarios.includes(term) || estado.includes(term);
    });
  }, [historial, searchTerm, numeroPorId, selectedYear]);

  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);
  const currentHistorial = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistorial.slice(start, start + itemsPerPage);
  }, [filteredHistorial, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedYear]);

  const total = territorios.length;
  const disponibles = territorios.filter((t) => t.estado === "disponible").length;
  const enUso = territorios.filter((t) => t.estado === "en_uso").length;
  const inhabilitados = territorios.filter((t) => t.estado === "inhabilitado").length;
  const caducados = territorios.filter((t) => t.estado === "caducado").length;

  const proximosVencimientos = territorios
    .filter((t) => t.estado === "en_uso" && t.fecha_devolucion)
    .map((t) => ({ ...t, diasRestantes: differenceInDays(parseISO(t.fecha_devolucion!), new Date()) }))
    .filter((t) => t.diasRestantes >= 0 && t.diasRestantes <= 7)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800 tracking-tight">Resumen de Territorios</h2>
          
          {/* 🗓️ SELECTOR DE AÑO */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2">Año:</label>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-sm font-bold text-purple-600 bg-transparent outline-none cursor-pointer pr-2"
            >
              <option value="all">Todos los registros</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards de Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
          <SummaryCard color="blue" label="Total" value={total} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4v13a2 2 0 0 1-2 2h-5m-4 0H5a2 2 0 0 1-2-2z" />} />
          <SummaryCard color="green" label="Disponibles" value={disponibles} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />} />
          <SummaryCard color="yellow" label="En Uso" value={enUso} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />} />
          <SummaryCard color="red" label="Inhabilitados" value={inhabilitados} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />} />
          <SummaryCard color="purple" label="Caducados" value={caducados} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m0-4h.01M12 8v4h.01" />} />
        </div>

        {/* ESTADÍSTICAS (Ahora sensibles al año seleccionado) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Top Solicitantes
              </span>
              {selectedYear !== "all" && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded">{selectedYear}</span>}
            </h4>
            <div className="divide-y divide-gray-50">
              {stats.topUsers.length > 0 ? stats.topUsers.map(([nombre, count], i) => (
                <div key={nombre} className="py-2.5 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600"><span className="text-gray-300 mr-2">0{i+1}.</span> {nombre}</span>
                  <span className="text-xs font-bold bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg">{count} territorios</span>
                </div>
              )) : <p className="text-xs text-gray-400 py-4 italic text-center">No hay datos para este año</p>}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Mayor Rotación
              </span>
              {selectedYear !== "all" && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{selectedYear}</span>}
            </h4>
            <div className="divide-y divide-gray-50">
              {stats.topTerritories.length > 0 ? stats.topTerritories.map(([label, count], i) => (
                <div key={label} className="py-2.5 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600"><span className="text-gray-300 mr-2">0{i+1}.</span> Territorio {label}</span>
                  <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">{count} veces usado</span>
                </div>
              )) : <p className="text-xs text-gray-400 py-4 italic text-center">No hay datos para este año</p>}
            </div>
          </div>
        </div>

        {/* Vencimientos */}
        {proximosVencimientos.length > 0 && (
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Vencimientos Próximos</h3>
            <div className="space-y-3">
              {proximosVencimientos.map((t) => (
                <div key={t.id} className="bg-yellow-50 text-gray-800 p-4 rounded-lg flex items-center justify-between border border-yellow-100">
                  <div>
                    <p className="font-semibold text-sm">Territorio #{t.numero} - {t.usuario_asignado?.nombre || "Sin asignar"}</p>
                    <p className="text-xs text-yellow-700">Vence en {t.diasRestantes} día{t.diasRestantes !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-yellow-600 font-bold text-xl">!</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Barra de Acciones */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-t border-gray-100 pt-8">
          <h3 className="text-lg font-semibold text-gray-800">Historial Reciente {selectedYear !== "all" && `(${selectedYear})`}</h3>
          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                placeholder="Buscar por usuario o #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={exportHistoryExcel} className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
              📥 <span>S-13 (Excel)</span>
            </button>
          </div>
        </div>

        {/* Vista Responsive (Cards con colores) */}
        <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
          {currentHistorial.length > 0 ? (
            currentHistorial.map((r) => {
              const numero = numeroPorId.get(r.territorio_id as any);
              const styles = getEstadoStyles(r.estado_territorio);
              return (
                <div key={r.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 ${styles.border}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-bold text-gray-900">#{numero || String(r.territorio_id).slice(0, 4)}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-tight ${styles.badge}`}>
                      {r.estado_territorio}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                    <span className="text-gray-400">Usuario</span>
                    <span className="text-right font-medium text-gray-700">{r.usuario_id?.nombre ?? "-"}</span>
                    <span className="text-gray-400">Fecha</span>
                    <span className="text-right text-gray-600">{r.fecha_entrega ? format(new Date(r.fecha_entrega), "dd/MM/yyyy") : "-"}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-400 text-right italic font-mono">
                    {format(new Date(r.creado_en), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm italic">No se encontraron registros para el año {selectedYear}.</div>
          )}
        </div>

        {/* Vista Desktop (Tabla con colores) */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Territorio</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Entregado</th>
                <th className="px-6 py-4">Devolución</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-600">
              {currentHistorial.map((r) => {
                const styles = getEstadoStyles(r.estado_territorio);
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">#{numeroPorId.get(r.territorio_id as any) || "???"}</td>
                    <td className="px-6 py-4 font-medium">{r.usuario_id?.nombre ?? "-"}</td>
                    <td className="px-6 py-4">{r.fecha_entrega ? format(new Date(r.fecha_entrega), "dd/MM/yyyy") : "-"}</td>
                    <td className="px-6 py-4">{r.fecha_devolucion ? format(new Date(r.fecha_devolucion), "dd/MM/yyyy") : "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${styles.badge}`}>
                        {r.estado_territorio}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-gray-400">{format(new Date(r.creado_en), "dd/MM HH:mm")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginador Cápsula */}
        {totalPages > 1 && (
          <div className="mt-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 disabled:opacity-20 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </button>
              <span className="px-4 text-sm font-semibold text-gray-600">
                Página <span className="text-purple-600">{currentPage}</span> de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 disabled:opacity-20 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ color, label, value, icon }: { color: string, label: string, value: number, icon: JSX.Element }) {
  const styles = {
    blue: "bg-blue-50 text-blue-500",
    green: "bg-green-50 text-green-500",
    yellow: "bg-amber-50 text-amber-500",
    red: "bg-rose-50 text-rose-500",
    purple: "bg-purple-50 text-purple-500",
  }[color as "blue" | "green" | "yellow" | "red" | "purple"];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 transition-all hover:shadow-md">
      <div className={`p-4 rounded-2xl ${styles} shrink-0`}>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
      </div>
      <div>
        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-3xl font-bold text-gray-800 leading-none">{value}</p>
      </div>
    </div>
  );
}