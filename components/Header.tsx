
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, role, dbRole, dbRolesConfigured, toggleSimulatedRole, isConfigured } = useAuth();

  const activeLinkStyle = {
    color: '#38bdf8', // light blue for active link
    borderBottom: '2px solid #38bdf8',
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="bg-gray-800 shadow-lg">
      <nav className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <NavLink to="/" onClick={closeMenu} className="group flex items-center text-xl sm:text-2xl font-bold text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg p-1 -ml-1">
            <div className="h-10 w-10 mr-3 rounded-full bg-sky-500 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
                <svg
                    className="h-6 w-6 text-white"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path fill="currentColor" d="M5.00832 15.2016C5.00832 15.2016 7.02683 16.5278 9.50832 16.6816C11.9898 16.8354 15.5083 15.2016 15.5083 15.2016L18.5083 13.2016L15.0083 9.20164L11.5083 9.70164L9.50832 12.2016L7.50832 11.7016L5.00832 15.2016Z" />
                    <path d="M12.5083 9.70166L14.0083 8.20166" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            <span className="transition-colors duration-300 group-hover:text-sky-300 hidden sm:inline">
                Jetski Trailer Skills Challenge
            </span>
            <span className="transition-colors duration-300 group-hover:text-sky-300 sm:hidden">
                JTSC
            </span>
        </NavLink>
        <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 rounded">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>
        </div>

        <div className="hidden md:flex items-center space-x-6">
          <ul className="flex space-x-6 text-lg mr-4">
            <li>
              <NavLink
                to="/"
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="hover:text-sky-400 transition-colors duration-300 pb-1"
              >
                Home
              </NavLink>
            </li>
            {role === 'admin' && (
              <li>
                <NavLink
                  to="/competition"
                  style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                  className="hover:text-sky-400 transition-colors duration-300 pb-1"
                >
                  Competition
                </NavLink>
              </li>
            )}
            <li>
              <NavLink
                to="/results"
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="hover:text-sky-400 transition-colors duration-300 pb-1"
              >
                Results
              </NavLink>
            </li>
          </ul>

          {user && (
            <div className="flex items-center space-x-3 border-l border-gray-750 pl-6 animate-fade-in text-right">
              <div>
                <div className="flex items-center gap-1.5 justify-end mb-0.5">
                  {!isConfigured ? (
                    <button
                      onClick={toggleSimulatedRole}
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded cursor-pointer transition select-none tracking-wider ${
                        role === 'admin'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
                          : 'bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/25'
                      }`}
                      title="Offline simulated fallback. Click to swap."
                    >
                      {role} ⚡ Mock
                    </button>
                  ) : (
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                        role === 'admin'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/15'
                      }`}
                    >
                      {role}
                    </span>
                  )}
                </div>
                <div className="text-sm text-sky-400 font-semibold max-w-[140px] truncate" title={user.name || user.email}>
                  {user.name || user.email}
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="px-3 py-1.5 bg-gray-700 hover:bg-red-955/70 hover:text-red-305 text-gray-300 text-sm font-semibold rounded-md border border-gray-600 hover:border-red-550/45 transition-all duration-300 active:scale-95 cursor-pointer ml-3"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {isMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <ul className="flex flex-col items-center space-y-2 py-4">
            <li>
                <NavLink
                to="/"
                onClick={closeMenu}
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="hover:text-sky-400 transition-colors duration-300 pb-1 px-4 py-2 block"
                >
                Home
                </NavLink>
            </li>
            {role === 'admin' && (
              <li>
                  <NavLink
                  to="/competition"
                  onClick={closeMenu}
                  style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                  className="hover:text-sky-400 transition-colors duration-300 pb-1 px-4 py-2 block"
                  >
                  Competition
                  </NavLink>
              </li>
            )}
            <li>
                <NavLink
                to="/results"
                onClick={closeMenu}
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="hover:text-sky-400 transition-colors duration-300 pb-1 px-4 py-2 block"
                >
                Results
                </NavLink>
            </li>

            {user && (
              <li className="w-full pt-4 border-t border-gray-750/60 flex flex-col items-center gap-2 px-6">
                <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">My Role Status</span>
                {!isConfigured ? (
                  <button
                    onClick={toggleSimulatedRole}
                    className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded tracking-widest transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                    }`}
                    title="Click to toggle role"
                  >
                    {role} ⚡ SIMULATED
                  </button>
                ) : (
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded tracking-widest ${
                      role === 'admin'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                        : 'bg-sky-500/10 text-sky-400 border border-sky-500/15'
                    }`}
                  >
                    {role}
                  </span>
                )}
                <div className="text-sm text-sky-400 font-semibold text-center truncate w-full mt-1" title={user.name || user.email}>
                  {user.name || user.email}
                </div>
                <button
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="mt-2 w-full py-2 bg-red-955/50 border border-red-505/25 hover:bg-red-900 text-red-105 text-sm font-semibold rounded-md transition duration-300 cursor-pointer"
                >
                  Logout
                </button>
              </li>
            )}

            </ul>
        </div>
      )}
    </header>
  );
};

export default Header;
