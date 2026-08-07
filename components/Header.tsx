
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Settings as SettingsIcon, RotateCcw, X, Database, Save, LogOut } from 'lucide-react';
import { getFullDbConfig, saveFullDbConfig } from '../lib/appwrite';
import glowingWaveLogo from '../src/assets/images/glowing_wave_logo_1779561795140.png';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, role, dbRole, dbRolesConfigured, toggleSimulatedRole, isConfigured } = useAuth();
  
  // Settings Form State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dbId, setDbId] = useState('');
  const [eventsId, setEventsId] = useState('');
  const [usersId, setUsersId] = useState('');
  const [bidsId, setBidsId] = useState('');
  const [attendeesId, setAttendeesId] = useState('');

  const [showResetPrompt, setShowResetPrompt] = useState(false);

  const openSettings = () => {
    const config = getFullDbConfig();
    setDbId(config.databaseId);
    setEventsId(config.collectionId);
    setUsersId(config.usersCollectionId);
    setBidsId(config.bidsCollectionId);
    setAttendeesId(config.attendeesCollectionId);
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
      attendeesCollectionId: attendeesId.trim(),
    });
    setIsSettingsOpen(false);
    window.location.reload();
  };

  const handleResetSettings = () => {
    localStorage.removeItem('appwrite_database_id');
    localStorage.removeItem('appwrite_collection_id');
    localStorage.removeItem('appwrite_users_collection_id');
    localStorage.removeItem('appwrite_bids_collection_id');
    localStorage.removeItem('appwrite_attendees_collection_id');
    setIsSettingsOpen(false);
    window.location.reload();
  };

  const activeLinkStyle = {
    color: '#38bdf8',
    textShadow: '0 0 10px rgba(56, 189, 248, 0.6)',
    borderBottom: '2px solid #38bdf8',
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <nav className="container mx-auto px-4 md:px-8 py-3.5 flex justify-between items-center">
        <NavLink to="/" onClick={closeMenu} className="group flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-xl p-1 -ml-1">
            <div className="relative flex items-center justify-center p-0.5 rounded-full bg-cyan-950/30 border border-cyan-400/40 shadow-[0_0_18px_rgba(34,211,238,0.4)] group-hover:scale-105 transition-all">
              <img 
                src={glowingWaveLogo} 
                alt="Jetski Challenge Wave Logo" 
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-base sm:text-xl drop-shadow-[0_2px_4px_rgba(8,145,178,0.5)]">
                JETSKI TRAILER
              </span>
              <span className="font-orbitron font-black italic uppercase tracking-wide text-white text-[10px] sm:text-xs opacity-90 -mt-1 leading-none">
                SKILLS CHALLENGE
              </span>
            </div>
        </NavLink>
        
        <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300 hover:text-white p-2 rounded-lg bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400">
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
          <ul className="flex space-x-5 text-sm mr-2 items-center font-orbitron font-bold italic uppercase tracking-wider">
            <li>
              <NavLink
                to="/"
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-300 hover:text-cyan-400 transition-colors duration-300 pb-1"
              >
                Home
              </NavLink>
            </li>
            {role === 'admin' && (
              <>
                <li>
                  <NavLink
                    to="/competition"
                    style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                    className="text-gray-300 hover:text-cyan-400 transition-colors duration-300 pb-1"
                  >
                    Competition
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/attendees"
                    style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                    className="text-gray-300 hover:text-cyan-400 transition-colors duration-300 pb-1"
                  >
                    Attendees
                  </NavLink>
                </li>
              </>
            )}
            <li>
              <NavLink
                to="/results"
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-300 hover:text-cyan-400 transition-colors duration-300 pb-1"
              >
                Results
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/bids"
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-300 hover:text-cyan-400 transition-colors duration-300 pb-1"
              >
                Bids
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/leaderboard"
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-300 hover:text-cyan-400 transition-colors duration-300 pb-1 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Leaderboard</span>
              </NavLink>
            </li>
            {role === 'admin' && (
              <li>
                <button
                  onClick={openSettings}
                  className="px-2.5 py-1 text-[11px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 rounded-lg flex items-center gap-1.5 transition cursor-pointer font-mono font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                  title="Database Configuration"
                >
                  <SettingsIcon className="h-3.5 w-3.5 animate-[spin_10s_linear_infinite]" />
                  <span>DB SETTINGS</span>
                </button>
              </li>
            )}
          </ul>

          {user && (
            <div className="flex items-center space-x-3 border-l border-white/10 pl-5 animate-fade-in text-right">
              <div>
                <div className="flex items-center gap-1.5 justify-end mb-0.5">
                  {!isConfigured ? (
                    <button
                      onClick={toggleSimulatedRole}
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded cursor-pointer transition select-none tracking-wider ${
                        role === 'admin'
                          ? 'bg-red-950/80 text-red-300 border border-red-500/40 hover:bg-red-900'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900'
                      }`}
                      title="Offline simulated fallback. Click to swap."
                    >
                      {role} ⚡ MOCK
                    </button>
                  ) : (
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                        role === 'admin'
                          ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {role}
                    </span>
                  )}
                </div>
                <div className="text-xs text-sky-300 font-mono font-bold max-w-[140px] truncate" title={user.name || user.email}>
                  {user.name || user.email}
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="px-3 py-1.5 bg-black/60 hover:bg-red-950/80 text-gray-300 hover:text-red-300 text-xs font-mono font-bold rounded-xl border border-white/10 hover:border-red-500/40 transition-all duration-300 cursor-pointer ml-2 flex items-center gap-1"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Exit</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {isMenuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-2xl border-t border-white/10">
            <ul className="flex flex-col items-center space-y-3 py-5 font-orbitron font-bold italic uppercase tracking-wider text-sm">
            <li>
                <NavLink
                to="/"
                onClick={closeMenu}
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-200 hover:text-cyan-400 transition-colors duration-300 pb-1 px-4 py-1.5 block"
                >
                Home
                </NavLink>
            </li>
            {role === 'admin' && (
              <>
                <li>
                    <NavLink
                    to="/competition"
                    onClick={closeMenu}
                    style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                    className="text-gray-200 hover:text-cyan-400 transition-colors duration-300 pb-1 px-4 py-1.5 block"
                    >
                    Competition
                    </NavLink>
                </li>
                <li>
                    <NavLink
                    to="/attendees"
                    onClick={closeMenu}
                    style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                    className="text-gray-200 hover:text-cyan-400 transition-colors duration-300 pb-1 px-4 py-1.5 block"
                    >
                    Attendees
                    </NavLink>
                </li>
              </>
            )}
            <li>
                <NavLink
                to="/results"
                onClick={closeMenu}
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-200 hover:text-cyan-400 transition-colors duration-300 pb-1 px-4 py-1.5 block"
                >
                Results
                </NavLink>
            </li>
            <li>
                <NavLink
                to="/bids"
                onClick={closeMenu}
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-200 hover:text-cyan-400 transition-colors duration-300 pb-1 px-4 py-1.5 block"
                >
                Bids
                </NavLink>
            </li>
            <li>
                <NavLink
                to="/leaderboard"
                onClick={closeMenu}
                style={({ isActive }) => (isActive ? activeLinkStyle : {})}
                className="text-gray-200 hover:text-cyan-400 transition-colors duration-300 pb-1 px-4 py-1.5 block flex items-center justify-center gap-1.5"
                >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Leaderboard</span>
                </NavLink>
            </li>
            {role === 'admin' && (
              <li className="w-full px-6 py-1 flex justify-center">
                  <button
                    onClick={() => {
                      closeMenu();
                      openSettings();
                    }}
                    className="w-full text-center hover:text-cyan-300 transition-colors duration-300 px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer font-mono font-bold text-cyan-400 text-xs border border-cyan-500/30 rounded-xl bg-cyan-950/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                  >
                    <SettingsIcon className="h-4 w-4 animate-[spin_12s_linear_infinite]" />
                    <span>Database Settings</span>
                  </button>
              </li>
            )}

            {user && (
              <li className="w-full pt-4 border-t border-white/10 flex flex-col items-center gap-2 px-6">
                <span className="text-[10px] text-cyan-300/80 font-mono tracking-widest uppercase">My Role Status</span>
                {!isConfigured ? (
                  <button
                    onClick={toggleSimulatedRole}
                    className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg tracking-widest transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                    }`}
                    title="Click to toggle role"
                  >
                    {role} ⚡ SIMULATED
                  </button>
                ) : (
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg tracking-widest ${
                      role === 'admin'
                        ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {role}
                  </span>
                )}
                <div className="text-xs text-sky-300 font-mono font-bold text-center truncate w-full mt-1" title={user.name || user.email}>
                  {user.name || user.email}
                </div>
                <button
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="mt-2 w-full py-2.5 bg-black/60 hover:bg-red-950/80 text-gray-300 hover:text-red-300 text-xs font-mono font-bold rounded-xl border border-white/10 hover:border-red-500/40 transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Exit Session</span>
                </button>
              </li>
            )}

            </ul>
        </div>
      )}

      {/* Appwrite Settings Portal Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-950/90 border border-white/10 rounded-3xl max-w-lg w-full shadow-glass-glow overflow-hidden transition-all transform scale-100 flex flex-col text-left">
            <div className="bg-black/40 p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Database className="h-5 w-5 animate-pulse" />
                <h3 className="font-orbitron font-extrabold italic uppercase tracking-wider text-white text-base">Appwrite Database Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
              <p className="text-xs text-gray-300 leading-normal font-sans">
                These settings are stored locally in your browser's <code className="text-cyan-300 font-mono bg-black/60 px-1 py-0.5 rounded">localStorage</code> to override env configurations.
              </p>

              <div className="space-y-3">
                {/* Database ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-300 mb-1">
                    Appwrite Database ID
                  </label>
                  <input
                    type="text"
                    required
                    value={dbId}
                    onChange={(e) => setDbId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    placeholder="e.g. 6a0f6ada00142e16390e"
                  />
                </div>

                {/* Events Collection ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-300 mb-1">
                    Event Registration Collection ID
                  </label>
                  <input
                    type="text"
                    required
                    value={eventsId}
                    onChange={(e) => setEventsId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    placeholder="e.g. events"
                  />
                </div>

                {/* Users Collection ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-300 mb-1">
                    User Roles Collection ID
                  </label>
                  <input
                    type="text"
                    required
                    value={usersId}
                    onChange={(e) => setUsersId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    placeholder="e.g. users"
                  />
                </div>

                {/* Bids Collection ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-300 mb-1">
                    Support Pledges Collection ID
                  </label>
                  <input
                    type="text"
                    required
                    value={bidsId}
                    onChange={(e) => setBidsId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    placeholder="e.g. bids"
                  />
                </div>

                {/* Attendees Collection ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-300 mb-1">
                    Attendees Collection ID
                  </label>
                  <input
                    type="text"
                    required
                    value={attendeesId}
                    onChange={(e) => setAttendeesId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sky-400 font-mono text-xs font-bold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    placeholder="e.g. attendees"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
                {showResetPrompt ? (
                  <div className="flex items-center gap-1.5 bg-red-950/60 p-1.5 border border-red-500/40 rounded-xl">
                    <span className="text-[10px] font-bold text-red-300 font-mono px-1">Reset keys?</span>
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetPrompt(false)}
                      className="px-2 py-1.5 bg-black/60 hover:bg-black/90 text-gray-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetPrompt(true)}
                    className="w-full sm:w-auto px-3 py-2 bg-black/50 hover:bg-red-950/40 hover:text-red-300 rounded-xl border border-white/10 hover:border-red-500/30 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                    className="px-4 py-2 bg-black/40 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold tracking-wide uppercase transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black font-orbitron italic rounded-xl text-xs tracking-wider uppercase flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]"
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
