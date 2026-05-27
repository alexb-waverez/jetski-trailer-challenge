import React, { useRef, useState, useEffect } from 'react';
import { Competitor, CompetitorStatus } from '../types';
import ResultsChart from '../components/ResultsChart';
import { 
  databases, 
  isAppwriteConfigured, 
  getDbConfig 
} from '../lib/appwrite';
import { 
  History, 
  Calendar, 
  Clock, 
  Users, 
  Award, 
  ArrowLeft, 
  RefreshCw, 
  Database,
  Cloud,
  FileText,
  AlertCircle,
  TrendingUp,
  XCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

declare var html2canvas: any;
declare var jspdf: any;

interface ResultsPageProps {
  competitors: Competitor[];
  currentEventName: string | null;
  currentEventId: string | null;
  renameActiveEvent?: (newName: string) => Promise<void>;
}

const PENALTY_MS = 5000;

const formatTime = (ms: number | null): string => {
    if (ms === null) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
  
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
      milliseconds
    ).padStart(3, '0')}`;
};

const ResultsPage: React.FC<ResultsPageProps> = ({ 
    competitors, 
    currentEventName, 
    currentEventId, 
    renameActiveEvent 
}) => {
    const { role } = useAuth();
    const [isSavingPdf, setIsSavingPdf] = useState(false);
    const resultsRef = useRef<HTMLDivElement>(null);
    const generatedAt = new Date().toLocaleString();

    // Past Events Archive States
    const [pastEvents, setPastEvents] = useState<any[]>([]);
    const [loadingPast, setLoadingPast] = useState(false);
    const [pastError, setPastError] = useState<string | null>(null);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    
    // States for currently viewing a historical past event leaderboard
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedEventName, setSelectedEventName] = useState<string | null>(null);
    const [selectedEventCompetitors, setSelectedEventCompetitors] = useState<Competitor[] | null>(null);

    // States for editing event names
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

    useEffect(() => {
        if (selectedEventId) {
            setEditNameValue(selectedEventName || '');
        } else {
            setEditNameValue(currentEventName || '');
        }
        setIsEditingName(false);
    }, [selectedEventId, selectedEventName, currentEventName]);

    const handleRenameSelectedEvent = async () => {
        if (!editNameValue.trim()) return;
        const newName = editNameValue.trim();

        if (role !== 'admin') {
            alert("Only administrators can rename events!");
            return;
        }

        if (selectedEventId) {
            if (selectedEventId === 'local_offline') {
                alert("Cannot rename the local offline state.");
                return;
            }
            try {
                const config = getDbConfig();
                const updateData: Record<string, any> = {
                    eventName: newName
                };
                await databases.updateDocument(
                    config.databaseId,
                    config.collectionId,
                    selectedEventId,
                    updateData
                );
                setSelectedEventName(newName);
                setIsEditingName(false);
                fetchPastEvents();
            } catch (err: any) {
                console.error("Failed to rename historical event:", err);
                alert("Failed to rename historical event: " + (err.message || err));
            }
        } else {
            if (renameActiveEvent) {
                try {
                    await renameActiveEvent(newName);
                    setIsEditingName(false);
                } catch (err: any) {
                    console.error("Failed to rename active event:", err);
                    alert("Failed to rename active event: " + (err.message || err));
                }
            }
        }
    };

    // Delete a past event
    const handleDeletePastEvent = async (docId: string) => {
        if (role !== 'admin') {
            alert("Only administrators are permitted to delete past events!");
            return;
        }
        try {
            const config = getDbConfig();
            await databases.deleteDocument(config.databaseId, config.collectionId, docId);
            if (selectedEventId === docId) {
                setSelectedEventId(null);
                setSelectedEventName(null);
                setSelectedEventCompetitors(null);
            }
            fetchPastEvents();
        } catch (err: any) {
            console.error("Failed to delete past event:", err);
            alert("Error deleting event: " + (err.message || err));
        }
    };

    // Fetch past events
    const fetchPastEvents = async () => {
        if (!isAppwriteConfigured()) return;
        setLoadingPast(true);
        setPastError(null);
        try {
            const config = getDbConfig();
            const response = await databases.listDocuments(
                config.databaseId,
                config.collectionId
            );
            setPastEvents(response.documents);
        } catch (err: any) {
            console.error("Failed to load past events archive:", err);
            setPastError(err.message || "Failed to load past events from Appwrite configuration.");
        } finally {
            setLoadingPast(false);
        }
    };

    useEffect(() => {
        fetchPastEvents();
    }, []);

    const handleLoadPastEvent = (doc: any) => {
        const compList: Competitor[] = [];
        for (let i = 1; i <= 20; i++) {
            const strVal = doc[`competitor${i}`];
            if (strVal && strVal.trim()) {
                try {
                    compList.push(JSON.parse(strVal));
                } catch (e) {
                    console.error("Failed parsing past competitor index:", i, e);
                }
            }
        }
        setSelectedEventId(doc.$id);
        setSelectedEventName(doc.eventName);
        setSelectedEventCompetitors(compList);
    };

    // Fallback: check if local storage offline has competitors saved to check offline historical rankings
    const handleLoadOfflinePastEvent = () => {
        const localComps = localStorage.getItem('offline_competitors');
        if (localComps) {
            try {
                const parsed = JSON.parse(localComps);
                setSelectedEventId('local_offline');
                setSelectedEventName('Local Offline Run');
                setSelectedEventCompetitors(parsed);
                return;
            } catch (e) {
                console.error(e);
            }
        }
        alert("No offline rankings registered in local storage yet!");
    };

    // Switch between currently viewing list or historical list
    const activeList = selectedEventCompetitors !== null ? selectedEventCompetitors : competitors;
    const isViewingHistorical = selectedEventId !== null;

    const finishedCompetitors = activeList
        .filter(c => c.status === CompetitorStatus.Finished && c.elapsedTime !== null)
        .sort((a, b) => 
            (a.elapsedTime! + a.penaltyPoints * PENALTY_MS) - 
            (b.elapsedTime! + b.penaltyPoints * PENALTY_MS)
        );
        
    const disqualifiedCompetitors = activeList.filter(
        c => c.status === CompetitorStatus.Disqualified
    );

    const handleSavePdf = async () => {
        if (!resultsRef.current || isSavingPdf || finishedCompetitors.length === 0) return;
    
        setIsSavingPdf(true);
    
        try {
            const canvas = await html2canvas(resultsRef.current, {
                backgroundColor: '#111827', // bg-gray-900, to match body
                scale: 2 
            });
    
            const imgData = canvas.toDataURL('image/png');
            // Use window.jspdf as it's loaded from CDN
            const pdf = new jspdf.jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });
    
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
 
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            const cleanName = (selectedEventName || 'jetski-competition').toLowerCase().replace(/\s+/g, '-');
            pdf.save(`${cleanName}-results.pdf`);

        } catch (error) {
            console.error("Failed to generate PDF", error);
        } finally {
            setIsSavingPdf(false);
        }
    };

    const getRankColor = (rank: number) => {
        if (rank === 0) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20 hover:bg-yellow-500/15'; // Gold
        if (rank === 1) return 'bg-slate-400/10 text-slate-200 border-slate-400/20 hover:bg-slate-400/15'; // Silver
        if (rank === 2) return 'bg-amber-700/10 text-amber-550 border-amber-700/20 hover:bg-amber-700/15'; // Bronze
        return 'bg-gray-800/40 border-gray-750 hover:bg-gray-750/50';
    };

    const hasFinished = finishedCompetitors.length > 0;
    const hasDisqualified = disqualifiedCompetitors.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-extrabold text-sky-400 tracking-tight">
          Competition Leaderboards
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
          Analyze final rankings, view technical penalty details, and browse past saved challenges.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/*-- Left column: rankings & leaderboard chart --*/}
        <div className="lg:col-span-2 space-y-6">
          
          {/*-- Banner indicating archive vs live state --*/}
          {isViewingHistorical ? (
            <div className="bg-sky-950/60 border border-sky-500/30 p-4 rounded-xl flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-sky-900/50 flex items-center justify-center border border-sky-500/20 flex-shrink-0">
                  <Award className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <span className="text-xs font-bold font-mono text-sky-450 tracking-wider uppercase block">
                    Viewing Historical Archive
                  </span>
                  <h3 className="text-base md:text-lg font-bold text-white leading-tight">
                    {selectedEventName}
                  </h3>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedEventId(null);
                  setSelectedEventName(null);
                  setSelectedEventCompetitors(null);
                }}
                className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-750 hover:border-gray-650 text-xs font-bold rounded-lg transition duration-200 flex items-center gap-2 flex-shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Live
              </button>
            </div>
          ) : (
            <div className="bg-emerald-950/45 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
              <div className="h-10 w-10 rounded-lg bg-emerald-900/35 flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
                <Clock className="h-5 w-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold font-mono text-emerald-450 tracking-wider uppercase block">
                  Active Live Challenge Leaderboard
                </span>
                <p className="text-sm font-medium text-gray-250">
                  Real-time synchronization with active registration table.
                </p>
              </div>
            </div>
          )}

          {!hasFinished && !hasDisqualified ? (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-gray-750 bg-gray-800/40 rounded-xl text-center space-y-3">
              <Calendar className="h-12 w-12 text-gray-600 animate-pulse" />
              <p className="text-gray-300 font-bold text-lg">No Runs Finalized Yet</p>
              <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                {isViewingHistorical 
                  ? "This saved event does not contain any finished or disqualified competitor results."
                  : "Please start the timers and record course penalties for competitors on the Live Competition page first!"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {hasFinished && (
                <div className="flex justify-end pr-4">
                  <button
                    onClick={handleSavePdf}
                    disabled={isSavingPdf}
                    className="py-2.5 px-6 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition duration-300 shadow-md hover:shadow-sky-500/20 flex items-center gap-2 disabled:bg-gray-750 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                  >
                    {isSavingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Document...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4.5 w-4.5" />
                        Save Results as PDF
                      </>
                    )}
                  </button>
                </div>
              )}

              {/*-- Exportable container --*/}
              <div ref={resultsRef} className="p-4 bg-gray-900 rounded-2xl border border-gray-800/80 shadow-2xl relative overflow-hidden">
                
                {/*-- PDF decorative background highlight --*/}
                <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4 mb-6">
                  <div>
                    {isEditingName && (role === 'admin') ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSelectedEvent();
                            if (e.key === 'Escape') setIsEditingName(false);
                          }}
                          className="bg-gray-850 border border-sky-400/50 text-white font-extrabold text-lg md:text-xl rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-sm w-full"
                          placeholder="Rename challenge..."
                          autoFocus
                        />
                        <button
                          onClick={handleRenameSelectedEvent}
                          className="p-1.5 bg-sky-600 hover:bg-sky-550 rounded text-white font-bold transition cursor-pointer"
                          title="Save Name"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingName(false);
                            setEditNameValue(isViewingHistorical ? (selectedEventName || '') : (currentEventName || ''));
                          }}
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2 group">
                        <Award className="h-5.5 w-5.5 text-sky-400 shrink-0" />
                        <span>{isViewingHistorical ? selectedEventName : (currentEventName || 'Active Run Leaderboard')}</span>
                        {(role === 'admin') && (selectedEventId !== 'local_offline') && (
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="p-1 text-gray-400 hover:text-sky-400 hover:bg-sky-950/40 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Rename challenge event"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </h2>
                    )}

                  </div>
                  <div className="text-left md:text-right font-mono text-xs text-gray-450">
                    <p className="font-bold text-sky-455 uppercase tracking-widest text-[10px]">Challenge Export Report</p>
                    <p className="mt-0.5">Timestamp: {generatedAt}</p>
                  </div>
                </div>

                {hasFinished ? (
                  <div className="space-y-8">
                    <div className="bg-gray-800/90 rounded-xl overflow-hidden border border-gray-750 shadow-lg">
                      {/*-- Desktop Header --*/}
                      <div className="hidden md:grid md:grid-cols-[70px_1.5fr_1.5fr_110px_130px] bg-gray-750/80 border-b border-gray-700 font-mono">
                        <div className="p-4 text-xs font-bold uppercase tracking-wider text-center text-gray-300">Rank</div>
                        <div className="p-4 text-xs font-bold uppercase tracking-wider text-gray-300">Name</div>
                        <div className="p-4 text-xs font-bold uppercase tracking-wider text-gray-300">Company</div>
                        <div className="p-4 text-xs font-bold uppercase tracking-wider text-center text-gray-300">Penalties</div>
                        <div className="p-4 text-xs font-bold uppercase tracking-wider text-right text-gray-300">Final Time</div>
                      </div>

                      {/*-- Results list layout --*/}
                      <div className="divide-y divide-gray-750">
                        {finishedCompetitors.map((c, index) => {
                          const totalMs = c.elapsedTime! + (c.penaltyPoints * PENALTY_MS);
                          return (
                            <div 
                              key={c.id} 
                              className={`md:grid md:grid-cols-[70px_1.5fr_1.5fr_110px_130px] md:items-center transition duration-150 ${getRankColor(index)} border-b border-gray-750/50`}
                            >
                              {/*-- Mobile item cards --*/}
                              <div className="p-4 md:hidden space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-full bg-gray-900/60 border border-gray-700 flex items-center justify-center text-xs font-bold text-sky-400">
                                      {index + 1}
                                    </span>
                                    <div>
                                      <p className="font-bold text-white text-base leading-tight">{c.fullName}</p>
                                      <p className="text-gray-400 text-xs mt-0.5">{c.companyName}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono font-bold text-sky-400 text-base">{formatTime(totalMs)}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">Raw: {formatTime(c.elapsedTime)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-gray-800/50 text-xs text-gray-450">
                                  <span>Course Penalties: <strong className="text-orange-400 font-mono font-bold">{c.penaltyPoints}</strong></span>
                                  <span className="text-[10px] font-mono text-gray-500">+{c.penaltyPoints * 5}s Added</span>
                                </div>
                              </div>

                              {/*-- Desktop items --*/}
                              <div className="hidden md:flex p-4 font-black font-mono text-lg justify-center items-center">
                                {index === 0 && '🥇'}
                                {index === 1 && '🥈'}
                                {index === 2 && '🥉'}
                                {index > 2 && `${index + 1}`}
                              </div>
                              <div className="hidden md:block p-4 font-bold text-gray-150">{c.fullName}</div>
                              <div className="hidden md:block p-4 text-gray-400 text-sm font-medium">{c.companyName}</div>
                              <div className="hidden md:block p-4 font-mono text-center">
                                <span className="font-bold text-orange-400">{c.penaltyPoints}</span>
                                <span className="text-[10px] text-gray-500 block">+{c.penaltyPoints * 5}s</span>
                              </div>
                              <div className="hidden md:block p-4 font-mono text-right text-base font-extrabold text-sky-400">
                                {formatTime(totalMs)}
                                <span className="text-[10px] text-gray-505 block font-medium">Raw: {formatTime(c.elapsedTime)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-gray-850/30 p-4 border border-gray-800/80 rounded-xl space-y-4">
                      <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                        <TrendingUp className="h-4 w-4 text-sky-450" /> Performance Delta Graph
                      </h3>
                      <ResultsChart data={finishedCompetitors} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 font-medium">
                    No competitors have completed a timed course run yet.
                  </div>
                )}

                {hasDisqualified && (
                  <div className="mt-8 border-t border-gray-800/85 pt-6 space-y-4">
                    <h3 className="text-md font-bold text-red-500 flex items-center gap-1.5 leading-none">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" /> Disqualified Competitors
                    </h3>
                    <div className="bg-gray-800/70 border border-red-500/10 rounded-xl overflow-hidden shadow-lg p-1">
                      <ul className="divide-y divide-gray-750/50">
                        {disqualifiedCompetitors.map(c => (
                          <li key={c.id} className="p-3.5 flex justify-between items-center bg-gray-850/20 hover:bg-gray-800/40 transition">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="font-bold text-gray-200 text-sm">{c.fullName}</span>
                            </div>
                            <span className="text-xs text-gray-450 font-mono">{c.companyName}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/*-- Right column: Past Events Archive Browser --*/}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800/90 border border-gray-750 rounded-xl shadow-xl p-5 md:p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-sky-400" /> Past Events
                </h2>
                
                {isAppwriteConfigured() && (
                  <button
                    onClick={fetchPastEvents}
                    disabled={loadingPast}
                    className="p-1 px-2.5 bg-gray-700 hover:bg-gray-650 rounded text-xs text-gray-300 font-semibold flex items-center gap-1.5 transition"
                    title="Reload Archives"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingPast ? 'animate-spin' : ''}`} /> Reload
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Query stored competition leaderboards inside active Appwrite configurations. Click any row to inspect historical winner stats and export reports.
              </p>
            </div>

            {pastError && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-lg text-xs text-red-200 flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span>{pastError}</span>
              </div>
            )}

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {loadingPast ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500 text-xs text-center font-mono">
                  <Loader2 className="h-6 w-6 animate-spin text-sky-450" />
                  <span>FETCHING ARCHIVES...</span>
                </div>
              ) : !isAppwriteConfigured() ? (
                <div className="text-center py-6 text-gray-550 space-y-2">
                  <Database className="h-8 w-8 text-gray-650 mx-auto" />
                  <p className="text-xs font-semibold font-mono text-gray-400">DATABASE UNCONFIGURED</p>
                  <p className="text-[11px] text-gray-500 leading-normal max-w-[200px] mx-auto">
                    Configure your Appwrite variables inside the homepage drawer to load historic lists.
                  </p>
                </div>
              ) : pastEvents.length === 0 ? (
                <div className="text-center py-10 text-gray-500 space-y-2">
                  <Database className="h-8 w-8 text-gray-650 mx-auto" />
                  <p className="text-xs font-semibold">No Stored Challenges</p>
                  <p className="text-[10px] text-gray-400">Create rows on the home screen to build dynamic archives.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pastEvents.map((doc) => {
                    let competitorCount = 0;
                    for (let i = 1; i <= 20; i++) {
                      if (doc[`competitor${i}`] && doc[`competitor${i}`].trim()) {
                        competitorCount++;
                      }
                    }

                    const isSelected = selectedEventId === doc.$id;

                    const isAdmin = role === 'admin';

                    return (
                      <div 
                        key={doc.$id} 
                        className="flex items-center gap-2 w-full"
                      >
                        <button
                          onClick={() => handleLoadPastEvent(doc)}
                          className={`flex-1 text-left p-3 rounded-lg border flex items-center justify-between group transition duration-150 ${
                            isSelected 
                              ? 'bg-sky-955/30 border-sky-505/60 ring-1 ring-sky-500/20 shadow-md' 
                              : 'bg-gray-750/30 hover:bg-gray-700/60 border-gray-700/50'
                          }`}
                        >
                          <div className="truncate pr-3">
                            <p className={`font-bold transition text-xs truncate ${isSelected ? 'text-sky-300' : 'text-gray-200 group-hover:text-white'}`}>
                              {doc.eventName}
                            </p>
                          </div>

                          <span className={`flex-shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-sky-950/60 text-sky-400' : 'bg-gray-800 text-gray-400'}`}>
                            {competitorCount} Registered
                          </span>
                        </button>

                        {isAdmin && (
                          eventToDelete === doc.$id ? (
                            <div className="flex items-center gap-1.5 bg-red-955/40 p-1 border border-red-500/25 rounded-lg shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePastEvent(doc.$id);
                                  setEventToDelete(null);
                                }}
                                className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-bold rounded transition cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventToDelete(null);
                                }}
                                className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] font-bold rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToDelete(doc.$id);
                              }}
                              title="Delete Past Event"
                              aria-label={`Delete event ${doc.eventName}`}
                              className="p-3 text-gray-400 hover:text-red-400 bg-gray-750/30 hover:bg-red-955/20 border border-gray-700/50 hover:border-red-500/30 rounded-lg transition shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Offline historical check fallback */}
            <div className="pt-2 border-t border-gray-750/60">
              <button
                onClick={handleLoadOfflinePastEvent}
                className="w-full py-2 bg-gray-750 hover:bg-gray-700 border border-gray-650 text-[11px] font-mono font-bold uppercase tracking-wider text-gray-300 rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Cloud className="h-3.5 w-3.5 text-gray-400" /> Browse Local Offline Run
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResultsPage;
