import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  Coins, 
  Trophy, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Flame, 
  BookOpen, 
  Flag, 
  AlertTriangle, 
  Check 
} from 'lucide-react';
import jetskiStormBg from '../src/assets/images/jetski_storm_bg_1779561776139.png';
import glowingWaveLogo from '../src/assets/images/glowing_wave_logo_1779561795140.png';

type LoginTab = 'signin' | 'register' | 'guide';

const LoginPage: React.FC = () => {
  const { login, signup, error, setError, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<LoginTab>('signin');
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
      if (activeTab === 'register') {
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
      // Error is caught and surfaced by AuthProvider state
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  return (
    <div 
      style={{ backgroundImage: `url(${jetskiStormBg})` }}
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-y-auto font-sans"
    >
      {/* Dark tint overlay to emphasize contrast and readability */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-brightness-[0.85] pointer-events-none" />

      <div className={`w-full relative z-10 flex flex-col items-center space-y-6 transition-all duration-300 ${
        activeTab === 'guide' ? 'max-w-2xl' : 'max-w-md'
      }`}>
        
        {/* Animated Radial Wave Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center p-1.5 rounded-full bg-cyan-950/25 border border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.35)] animate-pulse mb-3 group hover:scale-[1.04] transition-all duration-300">
            <div className="absolute inset-x-0 w-24 sm:w-28 h-24 sm:h-28 rounded-full bg-cyan-400/10 blur-[12px] group-hover:blur-[18px] transition-all" />
            <img
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border border-cyan-400/40 object-cover relative z-10 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              src={glowingWaveLogo}
              alt="Jetski Skills Challenge Logo"
              referrerPolicy="no-referrer"
            />
          </div>

          <h1 className="mt-1 text-center select-none font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-2.5xl sm:text-4.5xl leading-none drop-shadow-[0_2.5px_6px_rgba(8,145,178,0.55)]">
            JETSKI TRAILER
          </h1>
          <h2 className="text-center select-none font-orbitron font-black italic uppercase tracking-wide text-white text-3xl sm:text-5xl leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] mt-1.5">
            SKILLS CHALLENGE
          </h2>
          <div className="flex items-center gap-2 mt-3 text-cyan-200/90 font-mono text-xs md:text-sm font-semibold tracking-[0.22em] select-none text-center">
            <span>RIDE THE STORM</span>
            <span className="text-amber-500 scale-125 select-none">•</span>
            <span>CONQUER THE WAVES</span>
          </div>
        </div>

        {/* Dynamic Glass-Morphism Main Card */}
        <div className="w-full bg-slate-950/75 backdrop-blur-2xl border border-white/[0.09] shadow-glass-glow rounded-3xl p-5 sm:p-8 space-y-6 transition-all duration-300">
          
          {/* Main Segmented Tab Bar */}
          <div className="grid grid-cols-3 p-1.5 bg-black/60 rounded-2xl border border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] gap-1">
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-orbitron text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-orbitron text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Register</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('guide')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-orbitron text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 flex-shrink-0" />
              <span className="truncate">How to Bid</span>
            </button>
          </div>

          {/* TAB 1 & 2: SIGN IN / REGISTER */}
          {activeTab !== 'guide' && (
            <div className="space-y-6 animate-fade-in">
              {!isConfigured ? (
                /* Appwrite Setup Guide if context unconfigured */
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
                /* Interactive Sign In / Register Form */
                <>
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

                  {/* Form fields */}
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
                    {activeTab === 'register' && (
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
                          placeholder={activeTab === 'register' ? 'At least 8 characters' : 'Enter your password'}
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

                    {/* Submit Button */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="relative w-full overflow-hidden rounded-xl p-[1px] focus:outline-none transition-all duration-300 group shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_35px_rgba(249,115,22,0.65)] hover:scale-[1.015] active:scale-[0.99] cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 animate-[pulse_2s_infinite] opacity-90 blur-[1.5px]" />
                        
                        <div className="relative w-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 group-hover:from-red-500 group-hover:via-orange-400 group-hover:to-amber-400 text-white font-black text-sm md:text-base tracking-[0.15em] uppercase py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45)]">
                          {loading && (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          
                          <span className="drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.65)] font-orbitron italic">
                            {loading ? 'LAUNCHING...' : activeTab === 'register' ? 'SIGN UP TO PLAY' : 'SIGN IN & PLAY'}
                          </span>
                        </div>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* TAB 3: HOW TO REGISTER & DO THE BIDDING GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-6 text-left animate-fade-in">
              {/* Header Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black font-orbitron uppercase italic text-white tracking-wide">
                      Player & Spectator Guide
                    </h3>
                    <p className="text-xs text-amber-300/80 font-mono">
                      How to Register & Place Tournament Bids
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 self-start sm:self-center">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Live Tournament Rules
                </span>
              </div>

              {/* SECTION 1: HOW TO REGISTER */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-bold text-xs uppercase tracking-wider">
                  <UserPlus className="w-4 h-4" />
                  <span>Part 1 • How to Register</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-black flex items-center justify-center">
                          1
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">Step 1</span>
                      </div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Create Your Account</h4>
                      <p className="text-[11px] sm:text-xs text-gray-300 mt-1 leading-relaxed">
                        Switch to the <strong className="text-cyan-300">Register</strong> tab above. Enter your full name, email address, and a secure password.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-black flex items-center justify-center">
                          2
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">Step 2</span>
                      </div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Attendee Sync</h4>
                      <p className="text-[11px] sm:text-xs text-gray-300 mt-1 leading-relaxed">
                        Using your official registered email will link your account to the tournament attendee roster and verified badge status.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-black flex items-center justify-center">
                          3
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">Step 3</span>
                      </div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Sign In & Access</h4>
                      <p className="text-[11px] sm:text-xs text-gray-300 mt-1 leading-relaxed">
                        Sign in to gain real-time access to the <strong className="text-white">Bids & Predictions Ledger</strong>, <strong className="text-white">Live Leaderboard</strong>, and event standings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: HOW TO DO THE BIDDING */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-amber-400 font-orbitron font-bold text-xs uppercase tracking-wider">
                  <Coins className="w-4 h-4" />
                  <span>Part 2 • How to Do the Bidding & Predictions</span>
                </div>

                <div className="space-y-3">
                  {/* Step-by-step walkthrough */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-black/80 border border-amber-500/20 space-y-3 shadow-[0_0_20px_rgba(245,158,11,0.06)]">
                    
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        A
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Go to the Bids Page</h4>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          Once signed in, click <strong className="text-cyan-300">Bids</strong> in the top header navigation bar to open the tournament prediction hall.
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-white/[0.06]" />

                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        B
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Pick Your Winning Competitor</h4>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          In the <strong className="text-white">Submit Winner Prediction</strong> card, choose your champion racer from the registered lineup dropdown. Review their company affiliation and historical rankings.
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-white/[0.06]" />

                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        C
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Confirm Your Email & Submit</h4>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          Your email will auto-fill from your session. Click <strong className="text-amber-400">Submit Prediction</strong>. Your prediction will enter the ledger and be queued for admin approval.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CRITICAL WINDOW NOTICE */}
                  <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/35 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="text-xs font-black uppercase tracking-wider font-orbitron text-red-300">
                        Critical Timing Rule: Bids Lock Before Race Start
                      </h5>
                      <p className="text-[11px] sm:text-xs text-red-200/90 leading-relaxed">
                        Predictions are strictly accepted <strong>only while all racers are in "Pending" status</strong>. The moment the first racer launches onto the course, predictions automatically lock to guarantee fair competition!
                      </p>
                    </div>
                  </div>

                  {/* SCORING & LEADERBOARD RULES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">How Penalties Affect Bids</h5>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                          Each course penalty adds <strong className="text-amber-400">+5.00s</strong> to the raw time. Clean precision often beats pure speed!
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-start gap-2.5">
                      <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">Winning Predictions</h5>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                          The racer with the fastest total adjusted time takes 1st place. Spectators who accurately predicted the winner are celebrated on the podium!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK ACTION BUTTONS */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('signin')}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-black/60 hover:bg-black/90 border border-white/15 hover:border-white/30 text-white font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-cyan-400" />
                  <span>Sign In to Bid</span>
                </button>
              </div>
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
