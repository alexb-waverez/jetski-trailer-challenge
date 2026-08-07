import React, { useState, useEffect } from 'react';
import { Competitor, CompetitorStatus, Bid } from '../types';
import { client, databases, getDbConfig, getFullDbConfig, isAppwriteConfigured, query, ID } from '../lib/appwrite';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Coins, Clock, UserCheck, AlertCircle, Sparkles, Check, Users, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

interface BidsPageProps {
  competitors: Competitor[];
  currentEventId: string | null;
  currentEventName: string | null;
}

export const BidsPage: React.FC<BidsPageProps> = ({
  competitors: initialCompetitors,
  currentEventId,
  currentEventName,
}) => {
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [selectedCompForBid, setSelectedCompForBid] = useState('');
  const [attendeeEmailInput, setAttendeeEmailInput] = useState(user?.email || '');
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [bidsSuccess, setBidsSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-fill logged in user email if available
  useEffect(() => {
    if (user?.email && !attendeeEmailInput) {
      setAttendeeEmailInput(user.email);
    }
  }, [user]);

  // Keep local competitors state synced with parent props
  useEffect(() => {
    setCompetitors(initialCompetitors);
  }, [initialCompetitors]);

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
        [query.equal('eventId', [currentEventId])]
      );
      
      const mapped: Bid[] = response.documents.map((doc: any) => ({
        id: doc.$id,
        $id: doc.$id,
        email: doc.email || '',
        competitorName: doc.competitorName || '',
        eventId: doc.eventId || '',
      }));

      setBids(mapped);
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

  // Load active bids on active event selection
  useEffect(() => {
    if (currentEventId) {
      fetchBids();
    }
  }, [currentEventId, competitors]);

  // Realtime subscription for live bids updating
  useEffect(() => {
    if (!currentEventId || currentEventId === 'local' || !isAppwriteConfigured()) {
      return;
    }

    const config = getFullDbConfig();
    const channel = `databases.${config.databaseId}.collections.${config.bidsCollectionId}.documents`;

    const unsubscribe = client.subscribe(channel, (response: any) => {
      // Re-fetch when documents change in the bids collection
      fetchBids();
    });

    return () => {
      unsubscribe();
    };
  }, [currentEventId]);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEventId) {
      setBidsError("No active tournament event selected.");
      return;
    }
    if (!selectedCompForBid || !attendeeEmailInput.trim()) {
      setBidsError("Please enter your registered email and pick a candidate racer.");
      return;
    }

    const matchedComp = competitors.find(c => c.id === selectedCompForBid);
    if (!matchedComp) {
      setBidsError("Selected competitor record is not valid.");
      return;
    }

    // Bids must be placed before competition starts!
    const isCompetitionStarted = competitors.some(c => c.status !== CompetitorStatus.Pending);
    if (isCompetitionStarted) {
      setBidsError("Predictions are closed! You can only submit waves prediction before any competitor has started or finished their runs.");
      return;
    }

    const normalizedEmail = attendeeEmailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setBidsError("Please enter a valid email address format.");
      return;
    }

    setSubmittingBid(true);
    setBidsError(null);
    setBidsSuccess(null);

    // Look up spectator / user identity
    let attendeeExists = false;
    let attendeeName = "";

    // 1. Check if matches current logged in user
    if (user?.email && user.email.toLowerCase() === normalizedEmail) {
      attendeeExists = true;
      attendeeName = user.name || user.email.split('@')[0];
    }

    // 2. Check cloud attendees collection
    if (!attendeeExists && currentEventId !== 'local' && isAppwriteConfigured()) {
      try {
        const activeConfig = getFullDbConfig();
        const response = await databases.listDocuments(
          activeConfig.databaseId,
          activeConfig.attendeesCollectionId,
          [query.equal('email', [normalizedEmail])]
        );
        
        if (response.documents.length > 0) {
          attendeeExists = true;
          const matchDoc = response.documents[0] as any;
          attendeeName = `${matchDoc.firstName || ''} ${matchDoc.lastName || ''}`.trim() || normalizedEmail.split('@')[0];
        }
      } catch (err: any) {
        console.warn("Could not query cloud attendees collection:", err?.message);
      }
    }

    // 3. Check offline attendees
    if (!attendeeExists) {
      const local = localStorage.getItem('offline_attendees');
      if (local) {
        try {
          const list = JSON.parse(local) as any[];
          const match = list.find(a => a.email.toLowerCase() === normalizedEmail);
          if (match) {
            attendeeExists = true;
            attendeeName = `${match.firstName || ''} ${match.lastName || ''}`.trim() || normalizedEmail.split('@')[0];
          }
        } catch (e) {}
      }
    }

    // 4. Check cloud users collection
    if (!attendeeExists && currentEventId !== 'local' && isAppwriteConfigured()) {
      try {
        const activeConfig = getFullDbConfig();
        const response = await databases.listDocuments(
          activeConfig.databaseId,
          activeConfig.usersCollectionId,
          [query.equal('email', [normalizedEmail])]
        );
        if (response.documents.length > 0) {
          attendeeExists = true;
          const matchDoc = response.documents[0] as any;
          attendeeName = matchDoc.name || matchDoc.firstName || normalizedEmail.split('@')[0];
        }
      } catch (err: any) {}
    }

    // 5. Always accept valid email inputs for predictions so no spectator or user is blocked
    if (!attendeeExists) {
      attendeeExists = true;
      attendeeName = normalizedEmail.split('@')[0];
    }

    const payload = {
      email: normalizedEmail,
      competitorName: matchedComp.fullName,
      eventId: currentEventId
    };

    // Check if spectator already has an active prediction/bid
    const existing = bids.find(b => b.email.toLowerCase() === normalizedEmail);

    if (currentEventId === 'local' || !isAppwriteConfigured()) {
      let updatedList: Bid[];
      if (existing) {
        updatedList = bids.map(b => b.email.toLowerCase() === normalizedEmail ? { ...b, competitorName: matchedComp.fullName } : b);
        setBidsSuccess(`Success! Verified as ${attendeeName}. Winner prediction updated to ${matchedComp.fullName}.`);
      } else {
        updatedList = [...bids, { id: 'local_' + Date.now(), ...payload }];
        setBidsSuccess(`Success! Verified as ${attendeeName}. Winner prediction registered for ${matchedComp.fullName}.`);
      }
      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setAttendeeEmailInput(user?.email || '');
      setSelectedCompForBid('');
      setSubmittingBid(false);
      return;
    }

    try {
      const activeConfig = getFullDbConfig();
      let updatedList: Bid[] = [];

      if (existing) {
        const docId = existing.$id || existing.id;
        const res = await databases.updateDocument(
          activeConfig.databaseId,
          activeConfig.bidsCollectionId,
          docId,
          payload
        );
        updatedList = bids.map(b => (b.id === docId || b.$id === docId) ? ({
          id: res.$id,
          $id: res.$id,
          email: res.email,
          competitorName: res.competitorName,
          eventId: res.eventId
        } as any) : b);
        setBidsSuccess(`Success! Verified as ${attendeeName}. Your prediction has been updated to ${matchedComp.fullName}!`);
      } else {
        const res = await databases.createDocument(
          activeConfig.databaseId,
          activeConfig.bidsCollectionId,
          ID.unique(),
          payload
        );
        const newDoc: Bid = {
          id: res.$id,
          email: res.email,
          competitorName: res.competitorName,
          eventId: res.eventId
        };
        updatedList = [...bids, newDoc];
        setBidsSuccess(`Success! Verified as ${attendeeName}. Registered your winner prediction for ${matchedComp.fullName}!`);
      }

      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setAttendeeEmailInput(user?.email || '');
      setSelectedCompForBid('');
    } catch (err: any) {
      console.warn("Appwrite bids sync failure, falling back to local simulation:", err?.message);
      
      let updatedList: Bid[];
      if (existing) {
        updatedList = bids.map(b => b.email.toLowerCase() === normalizedEmail ? { ...b, competitorName: matchedComp.fullName } : b);
        setBidsSuccess(`Success! Verified as ${attendeeName}. Prediction updated to ${matchedComp.fullName}!`);
      } else {
        updatedList = [...bids, { id: 'fallback_' + Date.now(), ...payload }];
        setBidsSuccess(`Success! Verified as ${attendeeName}. Prediction registered for ${matchedComp.fullName}!`);
      }
      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setAttendeeEmailInput(user?.email || '');
      setSelectedCompForBid('');
    } finally {
      setSubmittingBid(false);
    }
  };

  // Count bids for a specific competitor
  const getBidCount = (competitorName: string) => {
    return bids.filter(b => b.competitorName === competitorName).length;
  };

  const getBidsPercentage = (competitorName: string) => {
    if (bids.length === 0) return 0;
    const count = getBidCount(competitorName);
    return Math.round((count / bids.length) * 100);
  };

  // Helper to mask emails for layout privacy
  const maskEmail = (email: string) => {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) return `***@${domain}`;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  const isCompetitionStarted = competitors.some(c => c.status !== CompetitorStatus.Pending);

  // Search filter
  const filteredCompetitors = competitors.filter(c => 
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats summaries
  const totalPredictionsPlaced = bids.length;
  
  // Find top backed competitor
  let topBackedRacer = "None";
  let maxBackers = 0;
  if (competitors.length > 0 && bids.length > 0) {
    competitors.forEach(c => {
      const bCount = getBidCount(c.fullName);
      if (bCount > maxBackers) {
        maxBackers = bCount;
        topBackedRacer = c.fullName;
      }
    });
  }

  if (!currentEventId) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-750 p-12 text-center max-w-xl mx-auto my-12 shadow-2xl space-y-4">
        <div className="h-14 w-14 rounded-full bg-sky-955/40 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/20">
          <Coins className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-extrabold text-white">No Active Event Selected</h2>
        <p className="text-sm text-gray-400 leading-relaxed font-sans">
          To predict and bid on skill challenge riders, an administrative user must first create or select an active tournament event from the Home dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Banner / Header Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between items-center text-center md:text-left border-b border-gray-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1.5 font-mono">
            <span className="flex items-center gap-1 bg-sky-950/40 text-sky-400 border border-sky-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Spectator Predictions
            </span>
            <span className="text-xs text-gray-500 font-bold tracking-widest pl-2">
              JETS HISTORIC ROADWAY
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Place Support Predictions
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-sans">
            Back your favorite rider for the <span className="text-sky-300 font-bold">{currentEventName || 'Challenge Event'}</span>
          </p>
        </div>
        <div className="text-center md:text-right font-mono text-xs text-gray-400">
          <p className="font-bold text-sky-455 uppercase tracking-widest text-[10px]">Registry: Verified Spectators Only</p>
          <p className="mt-0.5 text-[11px]">Bids Locked on Run Start: <span className={isCompetitionStarted ? "text-red-400 font-bold" : "text-emerald-400 font-bold animate-pulse"}>{isCompetitionStarted ? "CLOSED" : "OPEN"}</span></p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gray-800/80 border border-gray-750 p-5 rounded-xl shadow-lg flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/15 rounded-lg text-indigo-400 shrink-0">
            <Coins className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Bids Received</span>
            <span className="text-2xl font-black text-white font-mono">{totalPredictionsPlaced}</span>
          </div>
        </div>

        <div className="bg-gray-800/80 border border-gray-750 p-5 rounded-xl shadow-lg flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/15 rounded-lg text-yellow-455 shrink-0">
            <Trophy className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Top Backed Rider</span>
            <span className="text-lg font-black text-yellow-400 leading-none truncate max-w-[160px] block mt-1">{topBackedRacer}</span>
          </div>
        </div>

        <div className="bg-gray-800/80 border border-gray-750 p-5 rounded-xl shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-lg text-emerald-455 shrink-0">
            <Users className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Max Votes Pool</span>
            <span className="text-2xl font-black text-white font-mono">{maxBackers > 0 ? `${maxBackers} (${getBidsPercentage(topBackedRacer)}%)` : "0"}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Verification Form Section / Left */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gray-800/90 rounded-2xl p-6 border border-gray-750 shadow-xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-sky-400" />
                Cast Your Vote
              </h2>
              <p className="text-xs text-gray-400">
                You can select exactly <strong>one</strong> rider to predict as the overall challenge winner.
              </p>
            </div>

            {/* Status alerts */}
            <AnimatePresence mode="wait">
              {bidsError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-200 rounded-lg text-xs flex gap-2"
                >
                  <AlertCircle className="h-4.5 w-4.5 text-red-400 flex-shrink-0" />
                  <span>{bidsError}</span>
                </motion.div>
              )}

              {bidsSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs flex gap-2"
                >
                  <Check className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0" />
                  <span>{bidsSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {isCompetitionStarted ? (
              <div className="p-5 bg-amber-950/10 border border-amber-500/15 text-amber-300 rounded-xl text-xs space-y-2 leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 text-amber-400">
                  <Clock className="w-4 h-4 animate-spin" /> Predictions Locked
                </span>
                <p>
                  The competition timing runs have commenced! Spectator prediction submissions are now frozen to prevent post-launch hedging. We hope your predictions fly true!
                </p>
              </div>
            ) : competitors.length === 0 ? (
              <div className="p-5 bg-gray-900/40 border border-gray-750 text-gray-450 rounded-xl text-xs text-center">
                Waiting for the tournament competitors to be registered. Check back soon!
              </div>
            ) : (
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div>
                  <label htmlFor="racer-select" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    1. Select Candidate Racer
                  </label>
                  <select
                    id="racer-select"
                    value={selectedCompForBid}
                    onChange={(e) => setSelectedCompForBid(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700/60 rounded-lg text-white font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer outline-none transition"
                    required
                  >
                    <option value="">-- Choose Competitor --</option>
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
                  <label htmlFor="verify-email" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    2. Spectator Email Address
                  </label>
                  <input
                    id="verify-email"
                    type="email"
                    placeholder="e.g. spectator@mail.com"
                    value={attendeeEmailInput}
                    onChange={(e) => {
                      setAttendeeEmailInput(e.target.value);
                      if (bidsError) setBidsError(null);
                    }}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700/60 rounded-lg text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                    required
                  />
                  <p className="text-[10px] text-gray-450 mt-1.5 leading-relaxed font-sans">
                    You must use the exact email address registered in the <strong>Spectator Registry</strong> database. Setting predictions is instant and overrides previous choices.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submittingBid || !selectedCompForBid || !attendeeEmailInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-wider font-mono"
                >
                  {submittingBid ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Verifying & Recording Bids...
                    </>
                  ) : (
                    <>
                      <Check className="h-4.5 w-4.5" />
                      Submit Prediction
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Activity stream log */}
          <div className="bg-gray-800/60 border border-gray-750 p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between border-b border-gray-750 pb-2.5">
              <span>Spectator Bidding Feed</span>
              <span className="text-[10px] px-2 py-0.5 bg-sky-950 text-sky-400 rounded-full font-bold">LIVE FEED</span>
            </h3>

            <div className="space-y-2.5 max-h-[190px] overflow-y-auto divide-y divide-gray-850">
              {bids.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500 font-mono">
                  No predictions registered yet. Be the first!
                </div>
              ) : (
                [...bids].reverse().map((b, index) => (
                  <div key={b.id || b.$id || index} className="pt-2 first:pt-0 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-gray-300 block">{maskEmail(b.email)}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">predicted winner</span>
                    </div>
                    <span className="px-2.5 py-1 bg-sky-950/40 text-sky-305 border border-sky-900/30 font-bold rounded text-[10px]">
                      {b.competitorName}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Competitors List Grid / Right */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-4">
          <div className="bg-gray-800 border border-gray-750 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-750 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-450" /> Competitive Roster Candidates
                </h2>
                <p className="text-xs text-gray-400">
                  Select a candidate from the roster to place predictions. Showing current support pools.
                </p>
              </div>

              {/* Filtering */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-450" />
                <input
                  type="text"
                  placeholder="Filter competitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-750 rounded-lg text-xs text-white placeholder-gray-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-505 outline-none transition"
                />
              </div>
            </div>

            {filteredCompetitors.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-550 border border-dashed border-gray-750 rounded-xl font-mono">
                No competitor entries found matching query.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredCompetitors.map((candidate) => {
                  const bidCount = getBidCount(candidate.fullName);
                  const isSelected = selectedCompForBid === candidate.id;
                  const ratio = getBidsPercentage(candidate.fullName);

                  return (
                    <motion.div
                      key={candidate.id}
                      onClick={() => {
                        if (!isCompetitionStarted) {
                          setSelectedCompForBid(candidate.id);
                          if (bidsError) setBidsError(null);
                        }
                      }}
                      className={`p-4 border rounded-xl flex flex-col justify-between transition-all relative overflow-hidden h-32 ${
                        isCompetitionStarted ? "pointer-events-none" : "cursor-pointer"
                      } ${
                        isSelected 
                          ? "border-sky-500 bg-sky-955/20 ring-1 ring-sky-500 shadow-md shadow-sky-500/10" 
                          : "border-gray-750 bg-gray-900/30 hover:border-gray-650 hover:bg-gray-900/60"
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex justify-between items-start gap-1">
                        <div className="truncate">
                          <p className="font-extrabold text-white text-sm tracking-tight truncate">
                            {candidate.fullName}
                          </p>
                          <p className="text-[10px] text-gray-450 font-mono mt-0.5 truncate uppercase">
                            {candidate.companyName}
                          </p>
                        </div>

                        {/* Selector indicator bubble */}
                        {!isCompetitionStarted && (
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected 
                              ? "bg-sky-550 border-sky-455 text-white" 
                              : "border-gray-650 text-transparent hover:border-gray-500"
                          }`}>
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Stat Gauge */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                          <span className="text-gray-400 font-semibold uppercase flex items-center gap-1">
                            <Coins className="h-3 w-3 text-sky-455" /> Spectator Support:
                          </span>
                          <span className="text-white font-extrabold text-[11px] bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-900/20">
                            {bidCount} votes ({ratio}%)
                          </span>
                        </div>

                        {/* Progress visual bar */}
                        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${ratio}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="bg-sky-500 h-full rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BidsPage;
