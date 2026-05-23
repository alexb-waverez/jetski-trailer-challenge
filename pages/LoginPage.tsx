import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { AlertCircle, Eye, EyeOff, ShieldCheck, Database, Layout } from 'lucide-react';
import jetskiStormBg from '../src/assets/images/jetski_storm_bg_1779561776139.png';
import glowingWaveLogo from '../src/assets/images/glowing_wave_logo_1779561795140.png';

const LoginPage: React.FC = () => {
  const { login, signup, error, setError, isConfigured } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error("Full name is required for registration.");
        }
        await signup(email, password, name);
        setSuccess("Account created successfully! Welcome to the Challenge.");
      } else {
        await login(email, password);
        setSuccess("Signed in successfully! Launching timer...");
      }
    } catch (err: any) {
      // Error is caught by AuthProvider state, but loading handles local state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ backgroundImage: `url(${jetskiStormBg})` }}
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-y-auto font-sans"
    >
      {/* Dark tint overlay to emphasize contrast and readability */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-brightness-[0.85] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 flex flex-col items-center space-y-8">
        
        {/* Animated Radial Wave Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center p-1.5 rounded-full bg-cyan-950/25 border border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.35)] animate-pulse mb-4 group hover:scale-[1.04] transition-all duration-300">
            <div className="absolute inset-x-0 w-28 h-28 rounded-full bg-cyan-400/10 blur-[12px] group-hover:blur-[18px] transition-all" />
            <img
              className="h-28 w-28 rounded-full border border-cyan-400/40 object-cover relative z-10 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              src={glowingWaveLogo}
              alt="Jetski Skills Challenge Logo"
              referrerPolicy="no-referrer"
            />
          </div>

          <h1 className="mt-2 text-center select-none font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-3xl sm:text-4.5xl leading-none drop-shadow-[0_2.5px_6px_rgba(8,145,178,0.55)]">
            JETSKI TRAILER
          </h1>
          <h2 className="text-center select-none font-orbitron font-black italic uppercase tracking-wide text-white text-3.5xl sm:text-5xl leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] mt-1.5">
            SKILLS CHALLENGE
          </h2>
          <div className="flex items-center gap-2 mt-4 text-cyan-200/90 font-mono text-xs md:text-sm font-semibold tracking-[0.22em] select-none text-center">
            <span>RIDE THE STORM</span>
            <span className="text-amber-500 scale-125 select-none">•</span>
            <span>CONQUER THE WAVES</span>
          </div>
        </div>

        {/* Dynamic Glass-Morphism Form Card */}
        <div className="w-full bg-slate-950/65 backdrop-blur-xl border border-white/[0.08] shadow-glass-glow rounded-3xl p-6 sm:p-9 space-y-6 transition-all duration-300">
          
          {!isConfigured ? (
            /* Styled Appwrite Setup Guide if context remains unconfigured */
            <div className="space-y-5 text-left">
              <div className="flex items-center gap-2.5 text-amber-400 border-b border-white/10 pb-3">
                <AlertCircle className="h-5.5 w-5.5 flex-shrink-0 animate-bounce" />
                <h3 className="text-base font-bold uppercase tracking-wider font-orbitron italic">Appwrite Integration Required</h3>
              </div>
              
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                Persistent database engines require active Appwrite configuration. Set credentials to access registrations:
              </p>

              <div className="bg-black/45 p-3.5 rounded-lg text-xs font-mono text-cyan-300 border border-white/[0.06] space-y-1.5 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.8)]">
                <div className="text-gray-400">VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1</div>
                <div>VITE_APPWRITE_PROJECT_ID=<span className="text-amber-400 font-bold">[YOUR_PROJECT_ID]</span></div>
              </div>

              <div className="text-xs text-gray-400 space-y-2.5">
                <h4 className="font-semibold text-gray-300 uppercase tracking-widest text-[10px]">Quick Setup Protocol:</h4>
                <ol className="list-decimal pl-4.5 space-y-1.5 leading-normal">
                  <li>Visit <a href="https://cloud.appwrite.io/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors">Appwrite Console</a>.</li>
                  <li>Draft a new project named <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded font-mono">Jetski Challenge</code>.</li>
                  <li>Copy your unique <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded font-mono">Project ID</code> from general settings.</li>
                  <li>Configure it in <strong className="text-white">AI Studio Project Settings / Environment Variables</strong> as <code className="text-amber-400 bg-black/60 px-1 py-0.5 rounded font-mono">VITE_APPWRITE_PROJECT_ID</code>.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-white/10 text-center">
                <p className="text-[10px] text-amber-400/90 italic">
                  * Live databases auto-deploy once properties are matched.
                </p>
              </div>
            </div>
          ) : (
            /* High-Fidelity Interactive Form with Tabs */
            <div className="space-y-6">
              
              {/* Custom Animated Subtab Bar */}
              <div className="flex border-b border-white/10 pb-4 relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`w-1/2 pb-1 text-center font-orbitron text-sm sm:text-base font-black italic uppercase tracking-wider transition-all duration-300 relative cursor-pointer ${
                    !isRegister ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Sign In
                  {!isRegister && (
                    <div className="absolute bottom-[-17px] left-1/4 right-1/4 h-[3px] bg-cyan-400 rounded-full shadow-[0_0_12px_#22d3ee] animate-fade-in" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`w-1/2 pb-1 text-center font-orbitron text-sm sm:text-base font-black italic uppercase tracking-wider transition-all duration-300 relative cursor-pointer ${
                    isRegister ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Create Account
                  {isRegister && (
                    <div className="absolute bottom-[-17px] left-1/4 right-1/4 h-[3px] bg-cyan-400 rounded-full shadow-[0_0_12px_#22d3ee] animate-fade-in" />
                  )}
                </button>
              </div>

              {/* Status Message Logs */}
              {error && (
                <div className="bg-red-950/50 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in text-left">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 p-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in text-left">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
                  <span>{success}</span>
                </div>
              )}

              {/* Complete Action Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
                {isRegister && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label htmlFor="auth-name" className="block text-xs font-bold uppercase tracking-wider text-gray-300 ml-1">
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Alexander Bain"
                      className="w-full px-4.5 py-3.5 bg-black/60 hover:bg-black/95 border border-white/[0.08] hover:border-cyan-500/35 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-sans text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-gray-300 ml-1">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-4.5 py-3.5 bg-black/60 hover:bg-black/95 border border-white/[0.08] hover:border-cyan-500/35 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-sans text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-wider text-gray-300 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
                      className="w-full pl-4.5 pr-11 py-3.5 bg-black/60 hover:bg-black/95 border border-white/[0.08] hover:border-cyan-500/35 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-sans text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* SIGN IN & LAUNCH MOLTEN BURNING BUTTON */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full overflow-hidden rounded-xl p-[1px] focus:outline-none transition-all duration-300 group shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_35px_rgba(249,115,22,0.65)] hover:scale-[1.015] active:scale-[0.99] cursor-pointer"
                  >
                    {/* Animated hot fire glow backing */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 animate-[pulse_2s_infinite] opacity-90 blur-[1.5px]" />
                    
                    <div className="relative w-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 group-hover:from-red-500 group-hover:via-orange-400 group-hover:to-amber-400 text-white font-black text-sm md:text-base tracking-[0.15em] uppercase py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45)]">
                      {loading && (
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      
                      <span className="drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.65)] font-orbitron italic">
                        {loading ? 'LAUNCHING...' : isRegister ? 'SIGN UP TO PLAY' : 'SIGN IN & PLAY'}
                      </span>
                    </div>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        
        {/* Footer info lockup */}
        <p className="text-gray-500 font-mono text-[10px] sm:text-xs tracking-wider select-none relative z-10">
          WAVEREZ PRODUCT • SECURE CLOUD GATEWAY
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
