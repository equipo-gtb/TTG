// src/components/NavigationTabs.tsx
import { NavLink } from "react-router-dom";

const icons = {
  inicio: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  asignacion: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  devolucion: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12a2 2 0 012 2v1" />
    </svg>
  ),
  territorios: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 4L9 7" />
    </svg>
  ),
  usuarios: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

const tabs = [
  { name: "Inicio", path: "/", icon: icons.inicio },
  { name: "Asignación", path: "/asignacion", icon: icons.asignacion },
  { name: "Devolución", path: "/devolucion", icon: icons.devolucion },
  { name: "Territorios", path: "/territorio", icon: icons.territorios },
  { name: "Usuarios", path: "/usuario", icon: icons.usuarios },
];

export default function NavigationTabs() {
  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 mb-6" aria-label="Tabs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex space-x-6 sm:space-x-10 h-16">
            {tabs.map((tab) => (
              <NavLink
                key={tab.name}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 py-4 px-1 border-b-2 font-black text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${
                    isActive
                      ? "border-indigo-600 text-indigo-600 opacity-100 translate-y-0"
                      : "border-transparent text-slate-400 hover:text-slate-600 opacity-70 hover:opacity-100 hover:-translate-y-0.5"
                  }`
                }
              >
                {/* Usamos el render prop de NavLink para el color de fondo del icono */}
                {({ isActive }) => (
                  <>
                    <span className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent'
                    }`}>
                      {tab.icon}
                    </span>
                    {tab.name}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </nav>
  );
}