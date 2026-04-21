// src/pages/users/UserList.tsx
import { useEffect, useMemo, useState } from "react";
import { getUsers, updateUser, deleteUser, deleteUsers } from "../../services/users";
import type { User } from "../../types/user";

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Editables
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");

  // 🔍 BUSCADOR Y PAGINACIÓN
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getUsers();
    setUsers(data);
    setSelectedIds(new Set());
    setEditingId(null);
  }

  // 🔍 Lógica de Filtrado
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      u.nombre.toLowerCase().includes(term) || 
      (u.telefono && u.telefono.includes(term))
    );
  }, [users, searchTerm]);

  // 🔧 Lógica de Paginación
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Reset de página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  }

  async function handleBulkDelete() {
    if (!confirm(`¿Borrar ${selectedIds.size} usuarios?`)) return;
    await deleteUsers(Array.from(selectedIds));
    load();
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditNombre(u.nombre);
    setEditTelefono(u.telefono || "");
  }

  async function saveEdit(id: string) {
    await updateUser(id, { nombre: editNombre, telefono: editTelefono });
    load();
  }

  return (
    <div className="relative shadow-sm sm:rounded-2xl pb-10">
      
      {/* Toolbar: Buscador y Botón Borrar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto bg-white border border-slate-200 rounded-xl shadow-sm p-3">
          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full p-2 pl-10 text-sm text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
              placeholder="Buscar usuario o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.size === 0}
          className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Borrar ({selectedIds.size})
        </button>
      </div>

      {/* --- VISTA RESPONSIVE (CARDS) --- */}
      <div className="grid grid-cols-1 gap-4 md:hidden px-1">
        {currentUsers.map((u) => {
          const isEditing = editingId === u.id;
          return (
            <div key={u.id} className={`bg-white p-4 rounded-xl border ${selectedIds.has(u.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} shadow-sm`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                  />
                  {isEditing ? (
                    <input
                      className="w-full rounded border px-2 py-1 text-sm font-bold"
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-900">{u.nombre}</span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${u.activo ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Teléfono:</span>
                  {isEditing ? (
                    <input className="text-xs border rounded px-1" value={editTelefono} onChange={e => setEditTelefono(e.target.value)} />
                  ) : (
                    <span className="font-medium text-slate-800">{u.telefono || "-"}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-2 border-t border-slate-100">
                {isEditing ? (
                  <>
                    <button onClick={() => saveEdit(u.id)} className="text-indigo-600 font-bold text-sm">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 text-sm">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(u)} className="text-indigo-600 font-medium text-sm">Editar</button>
                    <button onClick={() => confirm("¿Borrar?") && deleteUser(u.id).then(load)} className="text-rose-600 font-medium text-sm">Borrar</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- VISTA DESKTOP (TABLA ESTILO TERRITORIES) --- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs uppercase bg-slate-800 text-slate-100">
            <tr>
              <th className="p-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(currentUsers.map(u => u.id)));
                    else setSelectedIds(new Set());
                  }}
                  checked={currentUsers.length > 0 && currentUsers.every(u => selectedIds.has(u.id))}
                />
              </th>
              <th className="px-6 py-3 font-bold">Nombre</th>
              <th className="px-6 py-3 font-bold">Teléfono</th>
              <th className="px-6 py-3 font-bold">Activo</th>
              <th className="px-6 py-3 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentUsers.map((u) => {
              const isEditing = editingId === u.id;
              return (
                <tr key={u.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="w-4 p-4 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {isEditing ? (
                      <input
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                        className="bg-white border border-slate-300 text-sm rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none block w-full p-2"
                      />
                    ) : u.nombre}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        value={editTelefono}
                        onChange={e => setEditTelefono(e.target.value)}
                        className="bg-white border border-slate-300 text-sm rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none block w-full p-2"
                      />
                    ) : (u.telefono || "-")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${u.activo ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {u.activo ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(u.id)} className="text-indigo-600 hover:underline font-bold">Guardar</button>
                          <button onClick={() => setEditingId(null)} className="text-slate-500 hover:underline">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(u)} className="text-indigo-600 hover:underline font-medium">Editar</button>
                          <button onClick={() => confirm("¿Borrar?") && deleteUser(u.id).then(load)} className="text-rose-600 hover:underline font-medium">Borrar</button>
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

      {/* --- PAGINACIÓN (Exactamente como TerritoriesList) --- */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="inline-flex shadow-sm rounded-lg overflow-hidden border border-slate-300">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
          >
            Anterior
          </button>
          <div className="px-4 py-2 bg-white text-sm font-semibold border-x border-slate-300">
            {currentPage} / {totalPages || 1}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-2 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
          >
            Siguiente
          </button>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          Total de {filteredUsers.length} usuarios encontrados
        </p>
      </div>

    </div>
  );
}