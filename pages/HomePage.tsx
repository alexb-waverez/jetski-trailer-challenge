import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Competitor, Bid, CompetitorStatus } from '../types';
import { 
  databases, 
  ID, 
  isAppwriteConfigured, 
  getFullDbConfig, 
  saveFullDbConfig,
  query
} from '../lib/appwrite';
import { 
  Database, 
  Plus, 
  RefreshCw, 
  Settings, 
  Trash2, 
  Cloud, 
  CheckCircle2, 
  Loader2, 
  FolderOpen, 
  AlertCircle, 
  Lock, 
  Check,
  Coins,
  History,
  Edit2,
  X,
  Play
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

interface HomePageProps {
  addCompetitor: (fullName: string, companyName: string) => void;
  deleteCompetitor: (id: string) => void;
  competitors: Competitor[];
  resetCompetition: () => void;
  currentEventId: string | null;
  currentEventName: string | null;
  syncStatus: 'synced' | 'saving' | 'error' | 'local' | null;
  selectEvent: (eventId: string, eventName: string, competitors: Competitor[]) => void;
  closeEvent: () => void;
  renameActiveEvent?: (newName: string) => Promise<void>;
}

const HomePage: React.FC<HomePageProps> = ({ 
  addCompetitor, 
  deleteCompetitor,
  competitors, 
  resetCompetition,
  currentEventId,
  currentEventName,
  syncStatus,
  selectEvent,
  closeEvent,
  renameActiveEvent
}) => {
  const { user, role, dbRolesConfigured, toggleSimulatedRole } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [showCancelEventPrompt, setShowCancelEventPrompt] = useState(false);
  const [competitorToDelete, setCompetitorToDelete] = useState<string | null>(null);
  const [pledgeToDelete, setPledgeToDelete] = useState<string | null>(null);

  const [isEditingActiveName, setIsEditingActiveName] = useState(false);
  const [activeNameInput, setActiveNameInput] = useState(currentEventName || '');

  useEffect(() => {
    setActiveNameInput(currentEventName || '');
  }, [currentEventName]);

  const handleSaveActiveName = async () => {
    if (activeNameInput.trim() && renameActiveEvent) {
      await renameActiveEvent(activeNameInput.trim());
      setIsEditingActiveName(false);
    }
  };

  const handleCancelEvent = () => {
    closeEvent();
    setShowCancelEventPrompt(false);
  };
  
  // Appwrite Management State
  const [existingEvents, setExistingEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventInput, setEventInput] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);

  // Bidding Support state
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [selectedCompForBid, setSelectedCompForBid] = useState('');
  const [bidValueInput, setBidValueInput] = useState('');
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [pledgesTab, setPledgesTab] = useState<'all' | 'pending'>('all');

  const config = getFullDbConfig();

  // Fetch list of active competitions
  const fetchEvents = async () => {
    if (!isAppwriteConfigured()) return;
    setLoadingEvents(true);
    setDbError(null);
    try {
      const activeConfig = getFullDbConfig();
      const response = await databases.listDocuments(
        activeConfig.databaseId,
        activeConfig.collectionId
      );
      setExistingEvents(response.documents);
    } catch (err: any) {
      console.error("Appwrite fetch error:", err);
      setDbError(err.message || "Failed to load events. Database or Collection may not be configured.");
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch bids for active event
  const fetchBids = async () => {
    if (!currentEventId) return;
    setLoadingBids(true);
    setBidsError(null);
    
    if (currentEventId === 'local' || !isAppwriteConfigured()) {
      const localBids = localStorage.getItem(`bids_${currentEventId}`);
      if (localBids) {
        try {
          setBids(JSON.parse(localBids));
        } catch (e) {
          console.error(e);
        }
      } else {
        setBids([]);
      }
      setLoadingBids(false);
      return;
    }

    try {
      const activeConfig = getFullDbConfig();
      const response = await databases.listDocuments(
        activeConfig.databaseId,
        activeConfig.bidsCollectionId,
        [query.equal('eventId', currentEventId)]
      );
      setBids(response.documents as any);
    } catch (err: any) {
      console.warn("Could not load real-time database bids. Loading cached elements:", err.message);
      const localBids = localStorage.getItem(`bids_${currentEventId}`);
      if (localBids) {
        try {
          setBids(JSON.parse(localBids));
        } catch (e) {}
      } else {
        setBids([]);
      }
    } finally {
      setLoadingBids(false);
    }
  };

  // Reload events on startup
  useEffect(() => {
    if (!currentEventId) {
      fetchEvents();
    }
  }, [currentEventId]);

  // Load active bids on active event selection
  useEffect(() => {
    if (currentEventId) {
      fetchBids();
    }
  }, [currentEventId, competitors]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Only administrators are permitted to start competition events.");
      return;
    }
    if (!eventInput.trim()) return;
    setCreatingEvent(true);
    setDbError(null);
    try {
      const activeConfig = getFullDbConfig();
      const eventName = eventInput.trim();
      
      const payload: Record<string, any> = {
        eventName,
      };

      // Populate empty values for registration slots competitor1..20
      for (let i = 1; i <= 20; i++) {
        payload[`competitor${i}`] = "";
      }

      const res = await databases.createDocument(
        activeConfig.databaseId,
        activeConfig.collectionId,
        ID.unique(),
        payload
      );

      selectEvent(res.$id, eventName, []);
    } catch (err: any) {
      console.error("Failed to create Appwrite Event:", err);
      setDbError(
        err.message || 
        "Failed to initialize. Check if attributes competitor1 to competitor20 exist as string types in your 'events' table."
      );
    } finally {
      setCreatingEvent(false);
    }
  };

  const loadDocumentItem = (doc: any) => {
    const compList: Competitor[] = [];
    for (let i = 1; i <= 20; i++) {
      const strVal = doc[`competitor${i}`];
      if (strVal && strVal.trim()) {
        try {
          compList.push(JSON.parse(strVal));
        } catch (e) {
          console.error(`Failed parsing custom column storage companion: competitor${i}`, e);
        }
      }
    }
    selectEvent(doc.$id, doc.eventName, compList);
  };


  const handleSubmitCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') {
      alert("Only admins can register competitors.");
      return;
    }
    const eventAlreadyTookPlace = competitors.some(c => c.status !== CompetitorStatus.Pending);
    if (eventAlreadyTookPlace) {
      alert("This event has already taken place or started. It is not possible to add competitors to started/past events.");
      return;
    }
    if (fullName.trim() && companyName.trim()) {
      addCompetitor(fullName, companyName);
      setFullName('');
      setCompanyName('');
    }
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEventId || !user) return;
    if (!selectedCompForBid || !bidValueInput) return;

    const amount = parseFloat(bidValueInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    const matchedComp = competitors.find(c => c.id === selectedCompForBid);
    if (!matchedComp) return;

    if (matchedComp.status !== CompetitorStatus.Pending) {
      alert(`Bids are closed for ${matchedComp.fullName} as their run has already started or finished.`);
      return;
    }

    setSubmittingBid(true);
    setBidsError(null);

    const newBid = {
      userId: user.$id || user.email,
      userName: user.name || user.email,
      competitorId: matchedComp.id,
      competitorName: matchedComp.fullName,
      bidAmount: amount,
      eventId: currentEventId,
      approvedByAdmin: false
    };

    if (currentEventId === 'local' || !isAppwriteConfigured()) {
      const updatedList = [...bids, { id: 'local_' + Date.now(), ...newBid }];
      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setBidValueInput('');
      setSelectedCompForBid('');
      setSubmittingBid(false);
      return;
    }

    try {
      const activeConfig = getFullDbConfig();
      const doc = await databases.createDocument(
        activeConfig.databaseId,
        activeConfig.bidsCollectionId,
        ID.unique(),
        newBid
      );
      const updatedList = [...bids, doc as any];
      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setBidValueInput('');
      setSelectedCompForBid('');
    } catch (err: any) {
      console.warn("Failed creating Document in Appwrite bids collection. Using simulated registry fallback:", err.message);
      setBidsError("Bids collection is not configured in Appwrite yet. Saving bid to simulation buffer.");
      const updatedList = [...bids, { id: 'fallback_' + Date.now(), ...newBid }];
      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setBidValueInput('');
      setSelectedCompForBid('');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleToggleApproveBid = async (bidId: string, currentApproved: boolean) => {
    if (role !== 'admin') {
      alert("Only course marshals can approve sponsor pledges.");
      return;
    }

    const nextApproved = !currentApproved;

    // Update state first
    const updatedList = bids.map(b => (b.id === bidId || b.$id === bidId) ? { ...b, approvedByAdmin: nextApproved } : b);
    setBids(updatedList);
    localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));

    if (currentEventId !== 'local' && isAppwriteConfigured()) {
      try {
        const activeConfig = getFullDbConfig();
        const actualBidId = bids.find(b => b.id === bidId || b.$id === bidId)?.$id || bidId;
        await databases.updateDocument(
          activeConfig.databaseId,
          activeConfig.bidsCollectionId,
          actualBidId,
          { approvedByAdmin: nextApproved }
        );
      } catch (err: any) {
        console.error("Failed to update bid approval state in Appwrite:", err);
        alert("Database error: " + (err.message || err));
        fetchBids();
      }
    }
  };

  const handleDeleteBid = async (bidId: string) => {
    if (role !== 'admin') return;

    const updatedList = bids.filter(b => b.id !== bidId && b.$id !== bidId);
    setBids(updatedList);
    localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));

    if (currentEventId !== 'local' && isAppwriteConfigured()) {
      try {
        const activeConfig = getFullDbConfig();
        const actualBidId = bids.find(b => b.id === bidId || b.$id === bidId)?.$id || bidId;
        await databases.deleteDocument(
          activeConfig.databaseId,
          activeConfig.bidsCollectionId,
          actualBidId
        );
      } catch (err: any) {
        console.error("Failed to delete bid in Appwrite:", err);
        alert("Database error: " + (err.message || err));
        fetchBids();
      }
    }
  };

  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" /> CLOUD SYNCED
          </span>
        );
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-950/60 text-sky-450 border border-sky-500/30 text-xs font-mono font-semibold rounded-full">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> SAVING RUN...
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 text-red-400 border border-red-500/30 text-xs font-mono font-semibold rounded-full">
            <AlertCircle className="h-3.5 w-3.5" /> SYNC ERROR
          </span>
        );
      case 'local':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-950/60 text-orange-450 border border-orange-500/30 text-xs font-mono font-semibold rounded-full">
            <Database className="h-3.5 w-3.5" /> LOCAL STORAGE
          </span>
        );
      default:
        return null;
    }
  };

  const isAdmin = role === 'admin';

  // Render registration card once active event is locked/selected
  if (currentEventId) {
    // Calculate bids summaries
    const totalPledged = bids.reduce((sum, b) => sum + b.bidAmount, 0);
    const totalApprovedPledged = bids.filter(b => b.approvedByAdmin === true).reduce((sum, b) => sum + b.bidAmount, 0);
    const totalPendingPledged = bids.filter(b => b.approvedByAdmin !== true).reduce((sum, b) => sum + b.bidAmount, 0);
    
    const getBidsForCompetitor = (compId: string) => {
      return bids.filter(b => b.competitorId === compId);
    };

    const getBidSumForCompetitor = (compId: string) => {
      return getBidsForCompetitor(compId).filter(b => b.approvedByAdmin === true).reduce((sum, b) => sum + b.bidAmount, 0);
    };

    const getPendingBidSumForCompetitor = (compId: string) => {
      return getBidsForCompetitor(compId).filter(b => b.approvedByAdmin !== true).reduce((sum, b) => sum + b.bidAmount, 0);
    };

    const eventAlreadyTookPlace = competitors.some(c => c.status !== CompetitorStatus.Pending);

    return (
      <div className="space-y-8 animate-fade-in" id="registered-competitor-board">
        {/* Active Header card */}
        <div className="bg-gray-800/90 border border-gray-750 p-6 md:p-8 rounded-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-sky-400 font-mono uppercase bg-sky-950/50 px-2.5 py-1 rounded">
                ACTIVE CHALLENGE
              </span>
              {getSyncBadge()}
              
              <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded uppercase ${
                isAdmin ? 'bg-red-955/40 text-red-400 border border-red-500/20' : 'bg-sky-955/40 text-sky-400 border border-sky-500/20'
              }`}>
                ROLE: {role}
              </span>
            </div>
            {isEditingActiveName && isAdmin ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={activeNameInput}
                  onChange={(e) => setActiveNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveActiveName();
                    if (e.key === 'Escape') setIsEditingActiveName(false);
                  }}
                  className="bg-gray-900 border border-sky-500/50 text-white font-bold text-lg md:text-xl rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-sm sm:max-w-md w-full"
                  placeholder="Enter challenge event title..."
                  autoFocus
                />
                <button
                  onClick={handleSaveActiveName}
                  className="p-2 bg-sky-600 hover:bg-sky-500 rounded text-white font-bold transition cursor-pointer shrink-0"
                  title="Save Name"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingActiveName(false);
                    setActiveNameInput(currentEventName || '');
                  }}
                  className="p-2 bg-gray-750 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition cursor-pointer shrink-0"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none flex items-center gap-3 group">
                <span>{currentEventName}</span>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingActiveName(true)}
                    className="p-1 text-gray-400 hover:text-sky-400 hover:bg-sky-950/40 rounded transition opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title="Rename challenge event"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </h1>
            )}

          </div>

          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/competition')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold transition rounded-md border border-sky-500 font-semibold text-sm cursor-pointer flex items-center gap-1.5 shadow-md shadow-sky-500/10"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Competition</span>
              </button>
            )}
            <button
              onClick={closeEvent}
              className="px-4 py-2 bg-gray-700/80 hover:bg-gray-700 text-gray-200 hover:text-white transition rounded-md border border-gray-650 font-semibold text-sm cursor-pointer"
            >
              Switch Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-8">
          
          {/*-- Left side card: Depending on role, show Registration (Admin) or Bidding (User) --*/}
          {isAdmin ? (
            <div className="bg-gray-800/80 rounded-xl shadow-xl p-6 md:p-8 border border-gray-750 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-sky-400" /> Competitor Details
                </h2>
                <span className="text-xs font-mono text-gray-400">
                  Slots: <strong className="text-sky-400">{competitors.length}</strong> / 20
                </span>
              </div>

              {eventAlreadyTookPlace ? (
                <div className="bg-amber-950/20 border border-amber-500/20 p-5 rounded-lg space-y-3 font-sans">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                    <Lock className="h-4 w-4" />
                    <span>Roster Registration Locked</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    This adventure event has already started or taken place. Competitors have active runs recorded, so adding new registrants at this stage is disabled to ensure competition records integrity.
                  </p>
                </div>
              ) : (
                <>
                  {competitors.length >= 20 ? (
                    <div className="p-4 bg-amber-950/40 border border-amber-500/35 text-amber-250 rounded-lg text-xs leading-normal">
                      <strong>Slots filled:</strong> The events database column map allows up to 20 structured competitor lines. Clear active runs or create a new registry file.
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmitCompetitor} className="space-y-5">
                    <div>
                      <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Competitor's Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. John Doe"
                        disabled={competitors.length >= 20}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-sky-505 focus:border-transparent transition text-white placeholder-gray-500 text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="companyName" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Affiliated Company / Marina
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Waverez Jetski Marina"
                        disabled={competitors.length >= 20}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-sky-505 focus:border-transparent transition text-white placeholder-gray-500 text-sm"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={competitors.length >= 20}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md text-sm"
                    >
                      Add Competitor Position
                    </button>
                  </form>
                </>
              )}

              <div className="p-4 bg-gray-850/40 border border-gray-750 rounded-lg text-xs text-center text-gray-400 font-sans leading-relaxed">
                🛡️ You are currently operating under the <strong>admin</strong> role. Clicking this role allows edit operations on competitor registry definitions and timing.
              </div>
            </div>
          ) : (
            /*-- Spectator Bidding Board (instead of add competitor) --*/
            <div className="bg-gray-800/80 rounded-xl shadow-xl p-6 md:p-8 border border-gray-750 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-sky-400" /> Sponsor Support Pool
                </h2>
                <p className="text-xs text-gray-400">
                  Spectate active pilots! Choose a registered competitor and place support backing on their run.
                </p>
              </div>

              {bidsError && (
                <div className="p-3 bg-amber-955/35 border border-amber-500/20 text-amber-200 rounded-lg text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>{bidsError}</span>
                </div>
              )}

              {competitors.length === 0 ? (
                <div className="p-5 bg-gray-850 border border-gray-750 rounded-lg text-center text-gray-450 text-sm">
                  Waiting for an admin user to build the competitor roster first. Check back shortly.
                </div>
              ) : competitors.filter(c => c.status === CompetitorStatus.Pending).length === 0 ? (
                <div className="p-5 bg-amber-950/20 border border-amber-500/20 text-amber-200 rounded-lg text-center text-sm font-medium">
                  ⏳ Bidding is closed because all registered competitors have already started or finished their runs.
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Choose Competitor to Back
                    </label>
                    <select
                      value={selectedCompForBid}
                      onChange={(e) => setSelectedCompForBid(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-white text-sm cursor-pointer"
                      required
                    >
                      <option value="">-- Choose a competitor --</option>
                      {competitors
                        .filter(c => c.status === CompetitorStatus.Pending)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.fullName} ({c.companyName})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Pledge Bid Amount ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-bold text-gray-500 font-mono">$</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 50"
                        value={bidValueInput}
                        onChange={(e) => setBidValueInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-white font-mono text-sm"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingBid || !selectedCompForBid}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold rounded-lg transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md text-sm"
                  >
                    {submittingBid ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Inserting Support Bid...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> Place Support Bid ($)
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/*-- Roster Grid Column --*/}
          <div className="bg-gray-800/80 rounded-xl shadow-xl p-6 md:p-8 border border-gray-750 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-100">Registered Roster</h2>
                  <p className="text-xs text-gray-450 mt-1 font-mono">List of competition candidates</p>
                </div>
                
                {competitors.length > 0 && isAdmin && (
                  showCancelEventPrompt ? (
                    <div className="flex items-center gap-1.5 bg-red-950/40 p-1 border border-red-500/20 rounded-md">
                      <span className="text-[10px] font-bold text-red-200 uppercase font-mono px-1">Cancel Event?</span>
                      <button 
                        onClick={handleCancelEvent}
                        className="py-1 px-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded transition cursor-pointer"
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setShowCancelEventPrompt(false)}
                        className="py-1 px-2 bg-gray-750 hover:bg-gray-650 text-gray-200 text-xs font-bold rounded transition cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowCancelEventPrompt(true)}
                      className="py-1.5 px-3 bg-red-955/40 hover:bg-red-900 border border-red-500/30 hover:border-red-550 text-red-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Cancel Event
                    </button>
                  )
                )}
              </div>

              {competitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-700 rounded-xl bg-gray-850/30">
                  <Plus className="h-12 w-12 text-gray-600 mb-3 animate-pulse" />
                  <p className="text-gray-400 font-medium text-center">No competitors registered yet</p>
                  <p className="text-gray-500 text-xs mt-1">Admins can fill active slots to run timers.</p>
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {competitors.map((c, idx) => {
                      const compBackingSum = getBidSumForCompetitor(c.id);
                      return (
                        <li 
                          key={c.id} 
                          className="bg-gray-750/70 p-4 rounded-lg flex justify-between items-center border border-gray-700/50 hover:bg-gray-700 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-450 text-xs font-mono font-bold flex items-center justify-center border border-sky-500/20">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-white text-base leading-tight">{c.fullName}</p>
                              <p className="text-gray-400 text-xs mt-0.5">{c.companyName}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3.5 text-right">
                            <div className="space-y-1">
                              <span className="text-xs font-mono px-2.5 py-1 bg-gray-900 text-gray-400 border border-gray-750 rounded uppercase font-semibold block w-fit ml-auto">
                                {c.status}
                              </span>
                              {compBackingSum > 0 && (
                                <p className="text-[10px] font-mono font-bold text-emerald-450 block pt-1">
                                  Backed: ${compBackingSum}
                                </p>
                              )}
                            </div>

                            {isAdmin && (
                              competitorToDelete === c.id ? (
                                <div className="flex items-center gap-1 bg-red-955/40 p-1 border border-red-500/20 rounded">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteCompetitor(c.id);
                                      setCompetitorToDelete(null);
                                    }}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase rounded transition cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCompetitorToDelete(null)}
                                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] font-bold rounded transition cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCompetitorToDelete(c.id)}
                                  className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-200 rounded transition cursor-pointer"
                                  title="Remove Competitor"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-750 flex justify-between text-xs text-gray-450 font-mono">
                    <span>Capacity Counter</span>
                    <span>{competitors.length} / 20 competitors filled</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/*-- Bidding Dashboard statistics ledger --*/}
        {competitors.length > 0 && (
          <div className="bg-gray-850/75 border border-gray-800 rounded-xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-sky-400" /> Backing &amp; Sponsorship Statistics
                </h3>
                <p className="text-xs text-gray-400">
                  Real-time live support pooling statistics derived from active database registers.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3 items-center">
                <div className="bg-emerald-950/60 border border-emerald-500/25 px-4 py-2 rounded-lg text-right font-mono">
                  <span className="text-[9px] text-emerald-400 block font-bold tracking-widest uppercase">Approved Pool</span>
                  <span className="text-emerald-300 text-lg font-bold">${totalApprovedPledged}</span>
                </div>
                {totalPendingPledged > 0 && (
                  <div className="bg-amber-955/40 border border-amber-500/20 px-4 py-2 rounded-lg text-right font-mono">
                    <span className="text-[9px] text-amber-500 block font-bold tracking-widest uppercase">Pending Approval</span>
                    <span className="text-amber-300 text-lg font-bold">${totalPendingPledged}</span>
                  </div>
                )}
                <div className="bg-gray-850/80 border border-gray-750/50 px-4 py-2 rounded-lg text-right font-mono">
                  <span className="text-[9px] text-gray-400 block font-bold tracking-widest uppercase">Total Pledged</span>
                  <span className="text-gray-300 text-lg lg:text-xl font-bold">${totalPledged}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Leaderboard of backed pilots */}
              <div className="space-y-3 bg-gray-800/40 p-4 rounded-xl border border-gray-750/50">
                <h4 className="text-xs font-bold font-mono text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                  🏆 Backed Pilots Ranking
                </h4>
                <div className="divide-y divide-gray-750/60 max-h-[220px] overflow-y-auto pr-1">
                  {competitors
                    .map(c => ({ 
                      ...c, 
                      bidSum: getBidSumForCompetitor(c.id),
                      pendingSum: getPendingBidSumForCompetitor(c.id)
                    }))
                    .sort((a, b) => b.bidSum - a.bidSum)
                    .map((pilot, idx) => (
                      <div key={pilot.id} className="py-2.5 flex justify-between items-center text-xs">
                        <span className="truncate max-w-[180px] font-semibold text-gray-200">
                          {idx + 1}. {pilot.fullName}
                        </span>
                        <div className="text-right font-mono text-xs flex flex-col">
                          <span className={pilot.bidSum > 0 ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                            ${pilot.bidSum} Supported
                          </span>
                          {pilot.pendingSum > 0 && (
                            <span className="text-[10px] text-amber-500 font-medium">
                              +${pilot.pendingSum} pending approval
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Placed Bids Ledger history */}
              <div className="space-y-3 bg-gray-800/40 p-4 rounded-xl border border-gray-750/50">
                <div className="flex items-center justify-between gap-2 border-b border-gray-750/60 pb-2 mb-1">
                  <h4 className="text-xs font-bold font-mono text-gray-300 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <History className="h-4 w-4 text-sky-400 font-mono" /> Pledges ledger
                  </h4>
                  <div className="flex bg-gray-950 rounded border border-gray-750 p-0.5">
                    <button
                      type="button"
                      onClick={() => setPledgesTab('all')}
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-colors ${
                        pledgesTab === 'all' 
                          ? 'bg-sky-600 text-white shadow-sm' 
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      All ({bids.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPledgesTab('pending')}
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-colors ${
                        pledgesTab === 'pending' 
                          ? 'bg-amber-600/90 text-white shadow-sm' 
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Pending ({bids.filter(b => b.approvedByAdmin !== true).length})
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-750/60 max-h-[300px] overflow-y-auto pr-1">
                  {([...bids].reverse().filter(bid => {
                    if (pledgesTab === 'all') return true;
                    return bid.approvedByAdmin !== true;
                  })).length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500 font-mono">
                      No matching support pledges.
                    </div>
                  ) : (
                    ([...bids].reverse().filter(bid => {
                      if (pledgesTab === 'all') return true;
                      return bid.approvedByAdmin !== true;
                    })).map((bid) => {
                      const isApproved = bid.approvedByAdmin === true;
                      return (
                        <div key={bid.id || bid.$id} className="py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="truncate text-gray-300 space-y-1">
                            <div>
                              <strong className="text-sky-400 font-semibold">{bid.userName}</strong> backed <span className="font-semibold text-white">{bid.competitorName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-emerald-400 text-xs">
                                +${bid.bidAmount}
                              </span>
                              {isApproved ? (
                                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded">
                                  Approved
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-955/40 text-amber-500 border border-amber-500/20 rounded">
                                  Pending Approval
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Render actions only for Course Marshal (Admin) */}
                          {role === 'admin' && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              {!isApproved ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleApproveBid(bid.id || bid.$id || '', false)}
                                  className="px-2.5 py-1 bg-emerald-900 border border-emerald-500/30 text-white font-bold text-[10px] rounded hover:bg-emerald-800 transition cursor-pointer"
                                >
                                  Approve
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleApproveBid(bid.id || bid.$id || '', true)}
                                  className="px-2.5 py-1 bg-red-955/40 hover:bg-red-950 border border-red-500/20 text-red-300 font-bold text-[10px] rounded transition cursor-pointer"
                                  title="Revoke approval"
                                >
                                  Revoke
                                </button>
                              )}
                              {pledgeToDelete === (bid.id || bid.$id) ? (
                                <div className="flex items-center gap-1 bg-red-955/40 p-1 border border-red-500/20 rounded">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteBid(bid.id || bid.$id || '');
                                      setPledgeToDelete(null);
                                    }}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded transition cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPledgeToDelete(null)}
                                    className="px-2 py-1 bg-gray-750 hover:bg-gray-700 text-gray-300 text-[10px] font-bold rounded transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPledgeToDelete(bid.id || bid.$id || '')}
                                  className="p-1.5 bg-gray-750 text-gray-400 hover:text-red-400 hover:bg-red-955/20 border border-gray-700 hover:border-red-500/20 rounded transition cursor-pointer"
                                  title="Delete Pledge"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    );
  }

  // Render startup page with Appwrite event selector/setup logic
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold text-sky-400 tracking-tight">
          Jetski Trailer Challenge
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
          Manage competitors, coordinate backing support pools, and track timed skill maneuvers.
        </p>
      </div>

      {dbError && (
        <div className="bg-red-950/80 border border-red-500/50 rounded-xl p-6 text-red-200">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-4 w-full text-left">
              <div>
                <h3 className="font-bold text-lg text-white">Database Integration Notice</h3>
                <p className="text-sm text-red-300 mt-1">{dbError}</p>
              </div>

              <div className="bg-gray-900/60 p-4 rounded-lg border border-red-500/20 space-y-3 text-xs leading-relaxed text-gray-300">
                <h4 className="font-bold text-red-250 uppercase tracking-widest font-mono">
                  🔧 Appwrite Database Creation Blueprint Guide:
                </h4>
                <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                  Your project requires three simple collections to enable user roles and competitor backing pools. Create them inside your Appwrite console:
                </p>
                <div className="space-y-4 font-sans text-sm">
                  
                  {/* Step 1 */}
                  <div className="bg-gray-950/30 p-3 rounded border border-gray-750">
                    <h5 className="font-bold text-sky-300 font-mono text-xs">EVENT REGISTRATION COLLECTION: '{config.collectionId}'</h5>
                    <ul className="list-disc pl-5 mt-1 text-xs text-gray-400 space-y-1 font-mono">
                      <li>eventName: String (Required)</li>
                      <li>competitor1 to competitor20: String, Length: 5000 (Optional)</li>
                    </ul>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-gray-950/30 p-3 rounded border border-gray-750">
                    <h5 className="font-bold text-sky-305 font-mono text-xs">USER ROLES REGISTRY COLLECTION: '{config.usersCollectionId}'</h5>
                    <p className="text-xs text-gray-450 mt-0.5">Determines attendee permissions (admin vs viewer).</p>
                    <ul className="list-disc pl-5 mt-1 text-xs text-gray-400 space-y-1 font-mono">
                      <li>$id (document ID): Matches the user\'s Appwrite user ID (Automatic)</li>
                      <li>email: String, Length: 255 (Required)</li>
                      <li>role: String, Length: 50 (Required)</li>
                    </ul>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-gray-950/30 p-3 rounded border border-gray-750">
                    <h5 className="font-bold text-sky-305 font-mono text-xs">SPONSOR SUPPORT POOL COLLECTION: '{config.bidsCollectionId}'</h5>
                    <p className="text-xs text-gray-450 mt-0.5">Records pilot bid pledges from user supporters.</p>
                    <ul className="list-disc pl-5 mt-1 text-xs text-gray-400 space-y-1 font-mono">
                      <li>userId: String, Length: 255 (Required)</li>
                      <li>userName: String, Length: 255 (Required)</li>
                      <li>competitorId: String, Length: 255 (Required)</li>
                      <li>competitorName: String, Length: 255 (Required)</li>
                      <li>bidAmount: Float/Integer (Required)</li>
                      <li>eventId: String, Length: 255 (Required)</li>
                      <li>approvedByAdmin: Boolean (Default: false / Optional)</li>
                    </ul>
                  </div>

                  <p className="text-xs text-amber-400/90 leading-normal italic">
                    ⚠️ Settings Checklist: Remember to edit Security Permissions for all three collections inside Appwrite and add a permission rule allowing 'Role: Any' with 'Document: Create, Read, Update, Delete' enabled!
                  </p>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={isAdmin ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "max-w-2xl mx-auto"}>
        
        {/*-- Create active event card --*/}
        {isAdmin && (
          <div className="bg-gray-800/95 rounded-xl shadow-xl p-6 md:p-8 border border-gray-750 flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-2">
                <Plus className="h-6 w-6 text-sky-400" /> Start Competition Event
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Create a fresh competition registry line. You'll specify the title first, then you can instantly populate individual competitor names.
              </p>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label htmlFor="eventName" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Challenge Event Name
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={eventInput}
                  onChange={(e) => setEventInput(e.target.value)}
                  placeholder="e.g. Summer Marine Masters 2026"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition placeholder-gray-500 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creatingEvent || !eventInput.trim()}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-505 text-white font-bold rounded-lg transition duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {creatingEvent ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Spinning Up Registry...
                  </>
                ) : (
                  "Initialize Event Fields"
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-gray-750 text-center">
              <span className="text-xs text-gray-500">
                Database rows contain customized competitor values automatically as you add them.
              </span>
            </div>
          </div>
        )}

        {/*-- Open active event card --*/}
        <div className="bg-gray-800/95 rounded-xl shadow-xl p-6 md:p-8 border border-gray-750 flex flex-col justify-between space-y-6 text-left w-full">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderOpen className="h-5.5 w-5.5 text-sky-400" /> Saved Competitions
              </h2>
              <button
                onClick={fetchEvents}
                disabled={loadingEvents}
                className="p-1 px-2.5 bg-gray-700 hover:bg-gray-650 rounded text-xs text-gray-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Refresh Events"
              >
                <RefreshCw className={`h-3 w-3 ${loadingEvents ? 'animate-spin' : ''}`} /> Reload list
              </button>
            </div>
            <p className="text-sm text-gray-300/85">
              Select any existing challenges saved in your Appwrite server collection to continue registration, time runs, and print results.
            </p>
          </div>

          <div className="space-y-3 min-h-[160px] max-h-[220px] overflow-y-auto pr-2">
            {loadingEvents ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-450 text-sm">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                <span>Reading Appwrite documents...</span>
              </div>
            ) : existingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                <Database className="h-10 w-10 text-gray-600 mb-2" />
                <p className="text-sm font-semibold">No synced events found</p>
                <p className="text-xs text-gray-500 mt-0.5">Use the "Start Competition" card to add one.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {existingEvents.map((doc) => {
                  // count filled slots
                  let slotsFilled = 0;
                  for (let i = 1; i <= 20; i++) {
                    if (doc[`competitor${i}`]) slotsFilled++;
                  }
                  
                  return (
                    <button
                      key={doc.$id}
                      onClick={() => loadDocumentItem(doc)}
                      className="w-full text-left p-3.5 bg-gray-750/50 hover:bg-gray-700 border border-gray-700 rounded-lg flex items-center justify-between group transition duration-200 cursor-pointer"
                    >
                      <div className="truncate pr-4">
                        <p className="font-semibold text-white group-hover:text-sky-300 transition truncate text-sm animate-fade-in">
                          {doc.eventName}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs bg-sky-950 text-sky-400/90 font-mono font-bold px-2 py-1 rounded">
                        {slotsFilled}/20 Registered
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => selectEvent('local', 'Local Offline Play', [])}
              className="w-full py-2 bg-gray-750 hover:bg-gray-650 text-gray-200 text-xs font-bold font-mono rounded-lg border border-gray-600 tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              RUN OFFLINE fallbacks (No Server Sync)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
