import React, { useState, useEffect } from 'react';
import { Attendee } from '../types';
import { client, databases, getFullDbConfig, isAppwriteConfigured, ID } from '../lib/appwrite';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  Edit2, 
  Mail, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Database,
  CloudLightning,
  Sparkles,
  Download,
  Upload
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

const AttendeesPage: React.FC = () => {
  const { role } = useAuth();
  
  // State
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attendeeToDelete, setAttendeeToDelete] = useState<string | null>(null);

  // CSV Import States
  const [dragOver, setDragOver] = useState(false);
  const [pendingCsvRows, setPendingCsvRows] = useState<{ firstName: string; lastName: string; email: string }[] | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // Load Attendees
  const fetchAttendees = async () => {
    setLoading(true);
    setStatusMessage(null);
    const config = getFullDbConfig();

    if (isAppwriteConfigured()) {
      try {
        const response = await databases.listDocuments(
          config.databaseId,
          config.attendeesCollectionId
        );
        
        const mapped: Attendee[] = response.documents.map((doc: any) => ({
          id: doc.$id,
          firstName: doc.firstName || '',
          lastName: doc.lastName || '',
          email: doc.email || '',
        }));

        setAttendees(mapped);
        setIsCloudMode(true);
      } catch (err: any) {
        console.warn("Failed to load attendees from Appwrite, falling back to local offline cache:", err);
        loadLocalAttendees();
        setIsCloudMode(false);
        setStatusMessage({
          text: `Appwrite collection '${config.attendeesCollectionId}' not found. Operating from offline storage. Create the collection in Appwrite console to enable cloud sync.`,
          type: 'info'
        });
      } finally {
        setLoading(false);
      }
    } else {
      loadLocalAttendees();
      setIsCloudMode(false);
      setLoading(false);
    }
  };

  const loadLocalAttendees = () => {
    const local = localStorage.getItem('offline_attendees');
    if (local) {
      try {
        setAttendees(JSON.parse(local));
      } catch (e) {
        console.error("Failed to parse offline attendees data:", e);
        setAttendees([]);
      }
    } else {
      setAttendees([]);
    }
  };

  const saveLocalAttendees = (newList: Attendee[]) => {
    localStorage.setItem('offline_attendees', JSON.stringify(newList));
    setAttendees(newList);
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  // Form handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setStatusMessage({ text: 'Please fill out all fields.', type: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setStatusMessage({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    setLoading(true);
    const config = getFullDbConfig();

    if (isCloudMode && isAppwriteConfigured()) {
      try {
        if (editingId) {
          // Update
          await databases.updateDocument(
            config.databaseId,
            config.attendeesCollectionId,
            editingId,
            {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim().toLowerCase()
            }
          );
          
          setAttendees(prev => prev.map(item => 
            item.id === editingId 
              ? { ...item, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase() }
              : item
          ));
          setStatusMessage({ text: 'Attendee updated successfully in cloud.', type: 'success' });
        } else {
          // Create
          const doc = await databases.createDocument(
            config.databaseId,
            config.attendeesCollectionId,
            ID.unique(),
            {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim().toLowerCase()
            }
          );

          setAttendees(prev => [
            {
              id: doc.$id,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim().toLowerCase()
            },
            ...prev
          ]);
          setStatusMessage({ text: 'Attendee registered successfully in cloud.', type: 'success' });
        }
        
        // Reset form
        resetFormState();
      } catch (err: any) {
        console.error("Appwrite save failure:", err);
        setStatusMessage({ text: `Appwrite write error: ${err.message || 'Check database permissions or schemas.'}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      // Local Storage Offline Mode
      const newAttendees = [...attendees];
      if (editingId) {
        const updatedList = newAttendees.map(item => 
          item.id === editingId 
            ? { ...item, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase() }
            : item
        );
        saveLocalAttendees(updatedList);
        setStatusMessage({ text: 'Attendee updated locally.', type: 'success' });
      } else {
        const payload: Attendee = {
          id: 'local_' + Date.now(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase()
        };
        const updatedList = [payload, ...newAttendees];
        saveLocalAttendees(updatedList);
        setStatusMessage({ text: 'Attendee added to local database.', type: 'success' });
      }
      resetFormState();
      setLoading(false);
    }
  };

  const startEdit = (attendee: Attendee) => {
    setEditingId(attendee.id);
    setFirstName(attendee.firstName);
    setLastName(attendee.lastName);
    setEmail(attendee.email);
    setStatusMessage(null);
  };

  const resetFormState = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const config = getFullDbConfig();

    if (isCloudMode && isAppwriteConfigured()) {
      try {
        await databases.deleteDocument(
          config.databaseId,
          config.attendeesCollectionId,
          id
        );
        setAttendees(prev => prev.filter(item => item.id !== id));
        setStatusMessage({ text: 'Attendee deleted from cloud.', type: 'success' });
      } catch (err: any) {
        console.error("Appwrite delete error:", err);
        setStatusMessage({ text: `Appwrite deletion failed: ${err.message}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      const updated = attendees.filter(item => item.id !== id);
      saveLocalAttendees(updated);
      setStatusMessage({ text: 'Attendee deleted locally.', type: 'success' });
      setLoading(false);
    }
  };

  // CSV Import Helpers and Parsing Logic
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return [];

    // Parse header
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    let firstNameIdx = headers.findIndex(h => h.includes('first') || (h.includes('name') && !h.includes('last')));
    let lastNameIdx = headers.findIndex(h => h.includes('last'));
    let emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));

    // Fallbacks if headers are missing or not matching:
    if (firstNameIdx === -1) firstNameIdx = 0;
    if (lastNameIdx === -1) lastNameIdx = 1;
    if (emailIdx === -1) emailIdx = 2;

    const results: { firstName: string; lastName: string; email: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowRaw = lines[i];
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let charIdx = 0; charIdx < rowRaw.length; charIdx++) {
        const char = rowRaw[charIdx];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());

      const rawFirst = row[firstNameIdx] || '';
      const rawLast = row[lastNameIdx] || '';
      const rawEmail = row[emailIdx] || '';

      const cleanFirst = rawFirst.replace(/^["']|["']$/g, '').trim();
      const cleanLast = rawLast.replace(/^["']|["']$/g, '').trim();
      const cleanEmail = rawEmail.replace(/^["']|["']$/g, '').trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (cleanFirst && cleanLast && emailRegex.test(cleanEmail)) {
        results.push({
          firstName: cleanFirst,
          lastName: cleanLast,
          email: cleanEmail
        });
      }
    }

    return results;
  };

  const handleCsvFile = (file: File) => {
    setStatusMessage(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setStatusMessage({ text: 'Please upload a valid CSV file (.csv extension).', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        try {
          const parsed = parseCSV(text);
          if (parsed.length === 0) {
            setStatusMessage({ text: 'No valid attendee records were resolved from the uploaded CSV. Ensure headers exist and are named correctly.', type: 'error' });
          } else {
            setPendingCsvRows(parsed);
          }
        } catch (err: any) {
          setStatusMessage({ text: `Failed to parse CSV file: ${err.message}`, type: 'error' });
        }
      }
    };
    reader.onerror = () => {
      setStatusMessage({ text: 'Error reading file.', type: 'error' });
    };
    reader.readAsText(file);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCsvFile(file);
    }
    e.target.value = '';
  };

  const executeCsvImport = async () => {
    if (!pendingCsvRows || pendingCsvRows.length === 0) return;
    setImportingCsv(true);
    setStatusMessage(null);
    const config = getFullDbConfig();

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const importedList: Attendee[] = [];

    if (isCloudMode && isAppwriteConfigured()) {
      try {
        const currentEmails = new Set(attendees.map(a => a.email.toLowerCase()));

        for (const row of pendingCsvRows) {
          const lowerEmail = row.email.trim().toLowerCase();
          if (currentEmails.has(lowerEmail)) {
            duplicateCount++;
            continue;
          }

          try {
            const doc = await databases.createDocument(
              config.databaseId,
              config.attendeesCollectionId,
              ID.unique(),
              {
                firstName: row.firstName.trim(),
                lastName: row.lastName.trim(),
                email: lowerEmail
              }
            );
            importedList.push({
              id: doc.$id,
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              email: lowerEmail
            });
            successCount++;
            currentEmails.add(lowerEmail);
          } catch (rowErr: any) {
            console.error(`Error importing row: ${row.email}`, rowErr);
            errorCount++;
          }
        }

        setAttendees(prev => [...importedList, ...prev]);
        
        let msg = `Batch import completed. Successfully registered ${successCount} spectator attendees.`;
        if (duplicateCount > 0) msg += ` Duplicates ignored: ${duplicateCount}.`;
        if (errorCount > 0) msg += ` Database write errors on ${errorCount} items.`;

        setStatusMessage({
          text: msg,
          type: errorCount > 0 ? 'error' : 'success'
        });

      } catch (err: any) {
        setStatusMessage({ text: `Cloud batch import failed: ${err.message}`, type: 'error' });
      } finally {
        setImportingCsv(false);
        setPendingCsvRows(null);
      }
    } else {
      const currentList = [...attendees];
      const currentEmails = new Set(currentList.map(a => a.email.toLowerCase()));

      for (const row of pendingCsvRows) {
        const lowerEmail = row.email.trim().toLowerCase();
        if (currentEmails.has(lowerEmail)) {
          duplicateCount++;
          continue;
        }

        const payload: Attendee = {
          id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: lowerEmail
        };
        currentList.unshift(payload);
        successCount++;
        currentEmails.add(lowerEmail);
      }

      saveLocalAttendees(currentList);
      
      let msg = `Local import completed. Successfully registered ${successCount} spectator attendees.`;
      if (duplicateCount > 0) msg += ` Duplicates skipped: ${duplicateCount}.`;

      setStatusMessage({
        text: msg,
        type: 'success'
      });
      setImportingCsv(false);
      setPendingCsvRows(null);
    }
  };

  // Search filter
  const filteredAttendees = attendees.filter(val => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      val.firstName.toLowerCase().includes(query) ||
      val.lastName.toLowerCase().includes(query) ||
      val.email.toLowerCase().includes(query)
    );
  });

  if (role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-950/80 backdrop-blur-xl border border-red-500/40 rounded-3xl p-8 text-center shadow-glass-glow space-y-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto animate-bounce drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
        <h2 className="text-2xl font-orbitron font-extrabold italic uppercase tracking-wider text-white">Access Denied</h2>
        <p className="text-gray-300 text-sm leading-relaxed font-sans">
          The Attendees Directory is reserved exclusively for the tournament admin team to manage registrations and support bidding rosters.
        </p>
        <button
          onClick={() => window.location.hash = '#/'}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-orbitron font-bold italic uppercase tracking-wider rounded-xl text-xs transition cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]"
        >
          Return to Arena
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* Page Title Block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between items-center text-center md:text-left border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
            {isCloudMode ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold leading-none bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                <CloudLightning className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>APPWRITE ACTIVE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold leading-none bg-amber-950/60 text-amber-300 border border-amber-500/40">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>OFFLINE STORAGE</span>
              </span>
            )}
            <span className="text-xs text-gray-400 font-bold font-mono uppercase tracking-widest pl-2">
              ADMINISTRATION DIRECTORY
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white flex items-center gap-3 justify-center md:justify-start drop-shadow-[0_2px_4px_rgba(8,145,178,0.5)]">
            <Users className="h-8 w-8 text-cyan-400" />
            Spectator Attendees
          </h1>
          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            onChange={handleCsvFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border backdrop-blur-xl flex items-start gap-3 text-sm leading-relaxed shadow-glass-glow ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
              : statusMessage.type === 'error'
              ? 'bg-red-950/60 text-red-300 border-red-500/40'
              : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
          {statusMessage.type === 'info' && <Database className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-orbitron font-bold text-white uppercase text-xs tracking-wider">
              {statusMessage.type === 'success' && 'Operation Completed'}
              {statusMessage.type === 'error' && 'System Error'}
              {statusMessage.type === 'info' && 'Appwrite Sync Alert'}
            </p>
            <p className="mt-0.5 text-xs text-gray-300 font-sans">{statusMessage.text}</p>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-white transition">
            <X className="h-4.5 w-4.5" />
          </button>
        </motion.div>
      )}

      {/* CSV Import Preview */}
      {pendingCsvRows && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/40 p-6 md:p-8 rounded-3xl shadow-glass-glow space-y-5"
        >
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" /> Confirm CSV Batch Import
              </h3>
              <p className="text-xs text-gray-300 mt-1 font-sans">
                Please verify the resolved attendee roster before initiating DB insertions. Duplicate email addresses in your database will be ignored.
              </p>
            </div>
            <button 
              onClick={() => setPendingCsvRows(null)}
              className="p-2 px-4 bg-black/60 hover:bg-white/10 text-gray-300 font-mono font-bold border border-white/10 rounded-xl text-xs tracking-wider transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto border border-white/10 rounded-2xl divide-y divide-white/10 bg-black/40">
            {pendingCsvRows.map((row, idx) => (
              <div key={idx} className="flex justify-between items-center p-3.5 text-xs">
                <div>
                  <span className="font-orbitron font-bold text-white text-sm">{row.firstName} {row.lastName}</span>
                  <span className="text-cyan-300 font-mono text-[11px] block mt-0.5">{row.email}</span>
                </div>
                <span className="text-[9px] font-mono font-bold px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-lg uppercase">
                  Pending Import
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setPendingCsvRows(null)}
              disabled={importingCsv}
              className="flex-1 py-3 bg-black/60 hover:bg-white/10 border border-white/10 text-gray-300 font-mono font-bold rounded-xl text-xs tracking-wider uppercase transition cursor-pointer"
            >
              Discard Batch
            </button>
            <button
              onClick={executeCsvImport}
              disabled={importingCsv}
              className="flex-[2] py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-orbitron font-bold italic uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            >
              {importingCsv ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                  Processing DB Insertions...
                </>
              ) : (
                `Confirm and Register ${pendingCsvRows.length} Attendees`
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Add / Edit Column */}
        <div className="lg:col-span-4 bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-6 md:p-7 rounded-3xl shadow-glass-glow flex flex-col self-start space-y-5">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-cyan-400" />
              {editingId ? 'Edit Attendee' : 'Register Attendee'}
            </h3>
            <p className="text-gray-400 text-xs mt-1 font-sans">
              Add attendees who will cast votes and bid on the challenge results.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="input-first-name" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 mb-1">
                First Name
              </label>
              <input
                id="input-first-name"
                type="text"
                required
                disabled={loading}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="e.g. Maverick"
                className="w-full px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
              />
            </div>

            <div>
              <label htmlFor="input-last-name" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 mb-1">
                Last Name
              </label>
              <input
                id="input-last-name"
                type="text"
                required
                disabled={loading}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="e.g. Mitchell"
                className="w-full px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
              />
            </div>

            <div>
              <label htmlFor="input-email" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                <input
                  id="input-email"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-all"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetFormState}
                  className="flex-1 py-3 bg-black/60 hover:bg-white/10 border border-white/10 text-gray-300 font-mono font-bold rounded-xl text-xs tracking-wider uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-orbitron font-bold italic uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                ) : editingId ? (
                  'Update Attendee'
                ) : (
                  'Save Attendee'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Directory List */}
        <div className="lg:col-span-8 bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-glass-glow overflow-hidden flex flex-col">
          {/* Header filters */}
          <div className="p-6 border-b border-white/10 bg-black/40 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-orbitron font-extrabold italic uppercase tracking-wider text-white">
                  Attendee Registry Grid
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Total Attendees Registered: <span className="text-cyan-300 font-bold">{attendees.length}</span>
                </p>
              </div>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleCsvFile(file);
              }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
              className={`p-4 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                dragOver 
                  ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 scale-[1.01]' 
                  : 'border-white/10 bg-black/40 text-gray-400 hover:border-cyan-500/40 hover:bg-black/60'
              } flex items-center justify-center gap-3.5 group`}
            >
              <Upload className={`h-6 w-6 stroke-[2] transition-transform ${dragOver ? 'text-cyan-400 -translate-y-0.5' : 'text-gray-400 group-hover:text-cyan-300 group-hover:-translate-y-0.5'}`} />
              <div className="text-left select-none">
                <p className="text-xs font-bold text-gray-200">
                  Drag and drop attendees CSV file here, or <span className="text-cyan-400 group-hover:underline">browse files</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                  Supported columns: <span className="text-cyan-300">firstName</span>, <span className="text-cyan-300">lastName</span>, <span className="text-cyan-300">email</span>
                </p>
              </div>
            </div>

            {/* Live Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Spectator by Name or Email address..."
                value={searchQuery}
                aria-label="Search spectator directory"
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm transition-colors font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 p-1 text-gray-400 hover:text-white rounded-lg bg-black/60 border border-white/10 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Directory Grid Table */}
          {filteredAttendees.length === 0 ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <Users className="h-14 w-14 text-gray-600" />
              <p className="text-base font-orbitron font-bold text-gray-300">No attendees match your search.</p>
              <p className="text-xs text-gray-400 max-w-sm font-sans leading-relaxed">
                Add spectators using the registration panel on the left, or seed some mock participants using the sample button.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/80 border-b border-white/10 text-cyan-300 font-bold font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-4 px-6">Attendee Full Name</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6 text-center w-28">Origin</th>
                    <th className="py-4 px-6 text-right w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <AnimatePresence initial={false}>
                    {filteredAttendees.map(attendee => {
                      const isOfflineItem = attendee.id.startsWith('local_') || attendee.id === 'demo1' || attendee.id === 'demo2' || attendee.id === 'demo3' || attendee.id === 'demo4' || attendee.id === 'demo5';
                      
                      return (
                        <motion.tr
                          key={attendee.id}
                          layoutId={attendee.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-white/5 group transition border-b border-white/10"
                        >
                          <td className="py-4 px-6">
                            <span className="font-orbitron font-bold text-white text-base">
                              {attendee.firstName} {attendee.lastName}
                            </span>
                          </td>
                          
                          <td className="py-4 px-6">
                            <span className="font-mono text-xs text-cyan-300 hover:underline">
                              {attendee.email}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-center">
                            {isOfflineItem ? (
                              <span className="inline-flex text-[9px] font-bold font-mono tracking-wide px-2 py-0.5 bg-black/60 text-gray-300 border border-white/10 rounded-lg">
                                OFFLINE
                              </span>
                            ) : (
                              <span className="inline-flex text-[9px] font-bold font-mono tracking-wide px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-lg">
                                CLOUD
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {attendeeToDelete === attendee.id ? (
                                <div className="flex items-center gap-1 bg-red-955/40 p-1 border border-red-500/30 rounded-xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDelete(attendee.id);
                                      setAttendeeToDelete(null);
                                    }}
                                    className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-mono font-bold text-[10px] rounded-lg transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAttendeeToDelete(null)}
                                    className="px-2.5 py-1 bg-black/60 hover:bg-white/10 border border-white/10 text-gray-300 font-mono font-bold text-[10px] rounded-lg transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(attendee)}
                                    className="p-2 text-gray-400 hover:text-cyan-300 bg-black/40 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 rounded-xl transition cursor-pointer"
                                    title="Edit Attendee Record"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setAttendeeToDelete(attendee.id)}
                                    className="p-2 text-gray-400 hover:text-red-400 bg-black/40 hover:bg-white/10 border border-white/10 hover:border-red-500/40 rounded-xl transition cursor-pointer"
                                    title="Delete Attendee Record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendeesPage;
