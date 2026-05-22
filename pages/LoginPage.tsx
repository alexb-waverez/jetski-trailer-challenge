import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { getFullDbConfig } from '../lib/appwrite';

const LoginPage: React.FC = () => {
  const { login, signup, error, setError, isConfigured } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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
        setSuccess("Account created successfully!");
      } else {
        await login(email, password);
        setSuccess("Logged in successfully!");
      }
    } catch (err: any) {
      // Errors are caught and handled by AuthProvider context, but we handle loading locally
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-sky-500 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
            <svg
              className="h-10 w-10 text-white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fill="currentColor" d="M5.00832 15.2016C5.00832 15.2016 7.02683 16.5278 9.50832 16.6816C11.9898 16.8354 15.5083 15.2016 15.5083 15.2016L18.5083 13.2016L15.0083 9.20164L11.5083 9.70164L9.50832 12.2016L7.50832 11.7016L5.00832 15.2016Z" />
              <path d="M12.5083 9.70166L14.0083 8.20166" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-sky-400 tracking-tight">
            Jetski Trailer Skills Challenge
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Please authenticate to access competitor registration and timing.
          </p>
        </div>

        {!isConfigured ? (
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-amber-500/30 space-y-6">
            <div className="flex items-center gap-3 text-amber-400">
              <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold">Appwrite Integration Required</h3>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed">
              This applet uses <strong>Appwrite</strong> for persistent user authentication. To complete the integration, please set your Appwrite keys:
            </p>

            <div className="bg-gray-900 p-4 rounded-md text-xs font-mono text-gray-400 border border-gray-750 space-y-2">
              <div>VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1</div>
              <div>VITE_APPWRITE_PROJECT_ID=<span className="text-amber-400">[YOUR_PROJECT_ID]</span></div>
            </div>

            <div className="text-sm text-gray-400 space-y-3">
              <h4 className="font-semibold text-gray-300">Quick Configuration Steps:</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Create an account or login at <a href="https://cloud.appwrite.io/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Appwrite Cloud</a>.</li>
                <li>Create a new project named <code className="text-sky-300 px-1 bg-gray-900 rounded">Jetski Challenge</code>.</li>
                <li>Copy your <strong>Project ID</strong> from the project settings.</li>
                <li>Add it to your <strong>Project Settings / Environment Variables</strong> on AI Studio as <code className="text-sky-300 px-1 bg-gray-900 rounded">VITE_APPWRITE_PROJECT_ID</code>.</li>
              </ol>
            </div>

            <div className="pt-2 border-t border-gray-700/50 flex flex-col gap-2">
              <p className="text-xs text-amber-400/80 italic text-center">
                Configure your Appwrite variables to activate real, secure member sign-in.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700 space-y-6">
            <div className="flex border-b border-gray-700 pb-2">
              <button
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-1/2 pb-2 text-center text-lg font-medium transition ${
                  !isRegister ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-1/2 pb-2 text-center text-lg font-medium transition ${
                  isRegister ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-4 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 p-4 rounded-md text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label htmlFor="auth-name" className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-650 rounded-md focus:ring-sky-500 focus:border-sky-500 transition-colors placeholder-gray-500"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-650 rounded-md focus:ring-sky-500 focus:border-sky-500 transition-colors placeholder-gray-500"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-650 rounded-md focus:ring-sky-500 focus:border-sky-500 transition-colors placeholder-gray-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-sky-650 hover:bg-sky-750 text-white font-bold rounded-md transition duration-300 ease-in-out transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:bg-sky-850 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
