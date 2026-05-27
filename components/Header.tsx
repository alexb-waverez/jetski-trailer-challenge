
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Settings as SettingsIcon, RotateCcw, X, Database, Save } from 'lucide-react';
import { getFullDbConfig, saveFullDbConfig } from '../lib/appwrite';
import waveLogo from '../src/assets/images/dark_wave_favicon_1779903270799.png';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, role, dbRole, dbRolesConfigured, toggleSimulatedRole, isConfigured } = useAuth();
  
  // Settings Form State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dbId, setDbId] = useState('');
  const [eventsId, setEventsId] = useState('');
  const [usersId, setUsersId] = useState('');
  const [bidsId, setBidsId] = useState('');

  const [showResetPrompt, setShowResetPrompt] = useState(false);

  const openSettings = () => {
    const config = getFullDbConfig();
    setDbId(config.databaseId);
    setEventsId(config.collectionId);
    setUsersId(config.usersCollectionId);
    setBidsId(config.bidsCollectionId);
    setShowResetPrompt(false);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveFullDbConfig({
      databaseId: dbId.trim(),
      collectionId: eventsId.trim(),
      usersCollectionId: usersId.trim(),
      bidsCollectionId: bidsId.trim(),
    });
    setIsSettingsOpen(false);
    window.location.reload();
  };

  const handleResetSettings = () => {
    localStorage.removeItem('appwrite_database_id');
    localStorage.removeItem('appwrite_collection_id');
    localStorage.removeItem('appwrite_users_collection_id');
    localStorage.removeItem('appwrite_bids_collection_id');
    setIsSettingsOpen(false);
    window.location.reload();
  };

  const activeLinkStyle = {
    color: '#38bdf8', // light blue for active link
    borderBottom: '2px solid #38bdf8',
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="bg-gray-800 shadow-lg">
      <nav className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <NavLink to="/" onClick={closeMenu} className="group flex items-center text-xl sm:text-2xl font-bold text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg p-1 -ml-1">
            <img 
              src={waveLogo} 
              alt="Blue Wave Logo" 
              className="h-10 w-10 mr-3 rounded-lg border border-sky-455/20 shadow-md shadow-sky-500/15 object-cover transition-transform duration-300 group-hover:scale-110 flex-shrink-0"
              referrerPolicy="no-referrer"
            />
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
          <ul className="flex space-x-5 text-lg mr-4 items-center">
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
            <li>
              <NavLink
                to="/leaderboard"
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="hover:text-sky-400 transition-colors duration-300 pb-1 flex items-center gap-1 bg-emerald-950/15 border border-transparent hover:border-emerald-500/20 px-2 py-0.5 rounded-md"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Leaderboard</span>
              </NavLink>
            </li>
            {role === 'admin' && (
              <li>
                <button
                  onClick={openSettings}
                  className="p-1.5 px-2.5 text-xs text-sky-400 hover:text-white bg-sky-950/40 hover:bg-sky-900 border border-sky-850/40 hover:border-sky-500/30 rounded flex items-center gap-1.5 transition cursor-pointer font-semibold"
                  title="Database Configuration"
                >
                  <SettingsIcon className="h-3.5 w-3.5 animate-[spin_10s_linear_infinite]" />
                  <span>Db Settings</span>
                </button>
              </li>
            )}
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
            <li>
                <NavLink
                to="/leaderboard"
                onClick={closeMenu}
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="hover:text-sky-400 transition-colors duration-300 pb-1 px-4 py-2 block flex items-center justify-center gap-1.5"
                >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Leaderboard</span>
                </NavLink>
            </li>
            {role === 'admin' && (
              <li className="w-full px-4 py-1 flex justify-center">
                  <button
                    onClick={() => {
                      closeMenu();
                      openSettings();
                    }}
                    className="w-full text-center hover:text-sky-400 transition-colors duration-300 px-4 py-2 flex items-center justify-center gap-1.5 cursor-pointer font-bold text-sky-400/90 text-sm border border-gray-700 hover:border-sky-500/35 rounded bg-gray-750/30"
                  >
                    <SettingsIcon className="h-4 w-4 animate-[spin_12s_linear_infinite]" />
                    <span>Database Settings</span>
                  </button>
              </li>
            )}

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

      {/* Appwrite Settings Portal Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-800 border border-gray-750 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden transition-all transform scale-100 flex flex-col text-left">
            <div className="bg-gray-850 p-5 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400">
                <Database className="h-5 w-5 animate-pulse" />
                <h3 className="font-bold text-lg text-white font-sans">Appwrite Database Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
              <p className="text-xs text-gray-400 leading-normal">
                These settings are stored locally in your browser's <code className="text-sky-300 font-mono bg-gray-900 px-1 py-0.5 rounded">localStorage</code> to override env configurations.
              </p>

              <div className="space-y-3">
                {/* Database ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-450 mb-1">
                    Appwrite Database ID
                  </label>
                  <input
                    type="text"
                    required
                    value={dbId}
                    onChange={(e) => setDbId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-750 rounded-md text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    placeholder="e.g. 6a0f6ada00142e16390e"
                  />
                </div>

                {/* Events Collection ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-450 mb-1">
                    Event Registration Collection ID
                  </label>
                  <input
                    type="text"
                    required
                    value={eventsId}
                    onChange={(e) => setEventsId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-750 rounded-md text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    placeholder="e.g. events"
                  />
                </div>

                {/* Users Collection ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-450 mb-1">
                    User Roles Collection ID
                  </label>
                  <input
                    type="text"
                    required
                    value={usersId}
                    onChange={(e) => setUsersId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-750 rounded-md text-sky-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors font-bold"
                    placeholder="e.g. users"
                  />
                </div>

                {/* Bids Collection ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-450 mb-1">
                    Support Pledges Collection ID
                  </label>
                  <input
                    type="text"
                    required
                    value={bidsId}
                    onChange={(e) => setBidsId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-750 rounded-md text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    placeholder="e.g. bids"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-750 flex flex-col sm:flex-row justify-between items-center gap-3">
                {showResetPrompt ? (
                  <div className="flex items-center gap-1.5 bg-red-955/30 p-1 border border-red-500/20 rounded">
                    <span className="text-[10px] font-bold text-red-300 font-mono px-1">Reset keys?</span>
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetPrompt(false)}
                      className="px-2 py-1.5 bg-gray-750 hover:bg-gray-700 text-gray-305 text-xs font-semibold rounded transition cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetPrompt(true)}
                    className="w-full sm:w-auto px-3 py-2 bg-gray-700/60 hover:bg-red-950/40 hover:text-red-300 rounded border border-gray-650 hover:border-red-900/30 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Wipe LocalStorage configurations and read .env values directly."
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Use Sys Defaults (.env)</span>
                  </button>
                )}

                <div className="flex gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 bg-gray-700/40 hover:bg-gray-750 text-gray-350 hover:text-white rounded text-xs font-bold tracking-wide uppercase transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 transition cursor-pointer shadow"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save & Reload</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
