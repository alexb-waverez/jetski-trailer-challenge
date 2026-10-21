import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Settings, 
  AlertTriangle,
  Globe,
  Terminal
} from 'lucide-react';
import { getFullDbConfig } from '../lib/appwrite';

interface AppwriteCorsNoticeProps {
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  onOpenSettings?: () => void;
  compact?: boolean;
}

export const AppwriteCorsNotice: React.FC<AppwriteCorsNoticeProps> = ({
  errorTitle = "Appwrite Connection Blocked (Failed to fetch)",
  errorMessage = "TypeError: Failed to fetch",
  onRetry,
  isRetrying = false,
  onOpenSettings,
  compact = false
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const config = getFullDbConfig();
  
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (e) {
      console.warn("Could not copy text to clipboard:", e);
    }
  };

  const appwriteConsoleUrl = config.projectId 
    ? `https://cloud.appwrite.io/console/project-${config.projectId}`
    : 'https://cloud.appwrite.io/console';

  if (compact) {
    return (
      <div className="p-4 bg-gradient-to-r from-amber-955/40 via-red-955/30 to-black/80 border border-amber-500/40 rounded-2xl text-xs space-y-3 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-orbitron font-bold uppercase tracking-wider text-amber-300 text-xs">
                {errorTitle}
              </span>
              <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-mono font-bold">
                Origin Blocked
              </span>
            </div>
            <p className="text-gray-300 font-sans leading-relaxed text-[11px]">
              Appwrite blocked this request because your production hostname{' '}
              <code className="text-cyan-300 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30 font-mono font-bold">
                {currentHostname}
              </code>{' '}
              is not yet registered under <strong>Platforms &rarr; Web</strong> in your Appwrite Console.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={() => copyToClipboard(currentHostname, 'hostname')}
            className="px-2.5 py-1.5 bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-500/40 rounded-lg text-[11px] font-mono font-bold text-cyan-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedKey === 'hostname' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedKey === 'hostname' ? 'Copied Hostname!' : `Copy Hostname (${currentHostname})`}</span>
          </button>

          <a
            href={appwriteConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-amber-950/70 hover:bg-amber-900/70 border border-amber-500/40 rounded-lg text-[11px] font-mono font-bold text-amber-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Appwrite Console</span>
          </a>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="ml-auto px-3 py-1.5 bg-black/60 hover:bg-white/10 border border-white/20 rounded-lg text-[11px] font-mono font-bold text-gray-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-amber-955/30 via-slate-950/90 to-black border border-amber-500/40 rounded-3xl p-5 sm:p-7 text-left space-y-5 shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-orbitron font-black italic uppercase tracking-wider text-base sm:text-lg text-white">
                {errorTitle}
              </h3>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-500/40">
                CORS / Origin Blocked
              </span>
            </div>
            <p className="text-xs text-amber-300/80 font-mono mt-0.5">
              {errorMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="px-3.5 py-2 bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Connection'}</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-2 bg-black/60 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Config</span>
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed font-sans">
        <p>
          Your browser threw <strong className="text-white font-mono">TypeError: Failed to fetch</strong> when contacting Appwrite. 
          By default, Appwrite rejects any browser request coming from an origin not explicitly listed in its{' '}
          <strong className="text-amber-300">Authorized Web Platforms</strong> list. Because Appwrite omits CORS headers on unauthorized origins, the browser blocks the response.
        </p>
      </div>

      {/* Quick Values Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
        {/* Production Hostname */}
        <div className="p-3.5 bg-black/70 border border-white/10 rounded-2xl space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-300">
              <Globe className="h-3.5 w-3.5" /> Production Hostname
            </span>
            <span className="text-[10px] text-gray-500 font-sans">Required by Appwrite</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-xl border border-white/5">
            <span className="font-mono text-cyan-200 text-xs truncate select-all" title={currentHostname}>
              {currentHostname || 'localhost'}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(currentHostname, 'hostname')}
              className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
              title="Copy hostname to clipboard"
            >
              {copiedKey === 'hostname' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedKey === 'hostname' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Wildcard Option */}
        <div className="p-3.5 bg-black/70 border border-white/10 rounded-2xl space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-300">
              <Terminal className="h-3.5 w-3.5" /> Wildcard Hostname (*)
            </span>
            <span className="text-[10px] text-gray-500 font-sans">Permits all preview URLs</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-xl border border-white/5">
            <span className="font-mono text-amber-200 text-xs">
              * (asterisk wildcard)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard('*', 'wildcard')}
              className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[11px] rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
              title="Copy asterisk to clipboard"
            >
              {copiedKey === 'wildcard' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedKey === 'wildcard' ? 'Copied *' : 'Copy *'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Resolution Guide */}
      <div className="p-4 bg-black/60 rounded-2xl border border-white/10 space-y-3 text-xs">
        <h4 className="font-bold text-amber-300 uppercase tracking-widest font-mono text-[11px] flex items-center gap-2">
          <span>&rarr; How to fix in 30 seconds:</span>
        </h4>
        <ol className="space-y-2 list-decimal list-inside text-gray-300 font-sans leading-relaxed">
          <li>
            Open your{' '}
            <a
              href={appwriteConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold inline-flex items-center gap-1"
            >
              <span>Appwrite Console (Project: {config.projectId || 'Console'})</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            Go to <strong>Overview</strong> &rarr; scroll down to <strong>Platforms</strong> &rarr; click <strong>Add Platform</strong> &rarr; select <strong>Web App</strong>.
          </li>
          <li>
            Enter a Name (e.g. <code>Production Web</code>) and enter your Hostname:{' '}
            <button
              type="button"
              onClick={() => copyToClipboard(currentHostname, 'hostname')}
              className="text-cyan-300 hover:underline font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 cursor-pointer inline-flex items-center gap-1"
            >
              <code>{currentHostname}</code>
              <Copy className="h-2.5 w-2.5" />
            </button>{' '}
            or use{' '}
            <button
              type="button"
              onClick={() => copyToClipboard('*', 'wildcard')}
              className="text-amber-300 hover:underline font-mono bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 cursor-pointer inline-flex items-center gap-1"
            >
              <code>*</code>
              <Copy className="h-2.5 w-2.5" />
            </button>{' '}
            to allow all domains.
          </li>
          <li>
            Save the platform, then return here and click{' '}
            <button
              type="button"
              onClick={onRetry}
              className="text-cyan-400 hover:text-cyan-300 underline font-bold font-mono cursor-pointer"
            >
              Retry Connection
            </button>.
          </li>
        </ol>

        <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 font-sans">
          💡 <em>Note:</em> If you are using <strong>Brave Browser</strong> or an ad blocker like <strong>uBlock Origin</strong>, temporarily disable shields for this site or allow <code>*.cloud.appwrite.io</code>, as aggressive privacy shields can block Appwrite API endpoints.
        </div>
      </div>
    </div>
  );
};
