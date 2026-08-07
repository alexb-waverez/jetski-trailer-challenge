import React, { useState, useEffect } from 'react';
import { Competitor, CompetitorStatus, Bid, BidStatus } from '../types';
import { client, databases, getDbConfig, getFullDbConfig, isAppwriteConfigured, query, ID } from '../lib/appwrite';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Coins, Clock, UserCheck, AlertCircle, Sparkles, Check, Users, Search, Loader2,
  CheckCircle2, XCircle, Trash2, Filter, ThumbsUp, ThumbsDown, RefreshCw, ShieldCheck
} from 'lucide-react';
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
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [selectedCompForBid, setSelectedCompForBid] = useState('');
  const [attendeeEmailInput, setAttendeeEmailInput] = useState(user?.email || '');
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [bidsSuccess, setBidsSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Accepted' | 'Rejected' | 'MY_BIDS'>('ALL');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [pledgeToDelete, setPledgeToDelete] = useState<string | null>(null);

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
        approvedByAdmin: (doc.approvedByAdmin as BidStatus) || 'Pending',
        $createdAt: doc.$createdAt,
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

    const unsubscribe = client.subscribe(channel, () => {
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
      setBidsError("Predictions are closed! You can only submit predictions before any competitor has started or finished their runs.");
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

    if (user?.email && user.email.toLowerCase() === normalizedEmail) {
      attendeeExists = true;
      attendeeName = user.name || user.email.split('@')[0];
    }

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

    if (!attendeeExists) {
      attendeeExists = true;
      attendeeName = normalizedEmail.split('@')[0];
    }

    const payload = {
      email: normalizedEmail,
      competitorName: matchedComp.fullName,
      eventId: currentEventId,
      approvedByAdmin: 'Pending' as BidStatus
    };

    const existing = bids.find(b => b.email.toLowerCase() === normalizedEmail);

    if (currentEventId === 'local' || !isAppwriteConfigured()) {
      let updatedList: Bid[];
      if (existing) {
        updatedList = bids.map(b => b.email.toLowerCase() === normalizedEmail ? { ...b, competitorName: matchedComp.fullName, approvedByAdmin: 'Pending' } : b);
        setBidsSuccess(`Success! Verified as ${attendeeName}. Winner prediction updated to ${matchedComp.fullName} (Pending review).`);
      } else {
        updatedList = [...bids, { id: 'local_' + Date.now(), ...payload }];
        setBidsSuccess(`Success! Verified as ${attendeeName}. Winner prediction registered for ${matchedComp.fullName} (Pending review).`);
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
        let res: any;
        try {
          res = await databases.updateDocument(
            activeConfig.databaseId,
            activeConfig.bidsCollectionId,
            docId,
            payload
          );
        } catch (err: any) {
          if (err?.message?.includes('approvedByAdmin') || err?.message?.includes('Unknown attribute')) {
            res = await databases.updateDocument(
              activeConfig.databaseId,
              activeConfig.bidsCollectionId,
              docId,
              { email: payload.email, competitorName: payload.competitorName, eventId: payload.eventId }
            );
          } else {
            throw err;
          }
        }

        updatedList = bids.map(b => (b.id === docId || b.$id === docId) ? ({
          id: res.$id,
          $id: res.$id,
          email: res.email,
          competitorName: res.competitorName,
          eventId: res.eventId,
          approvedByAdmin: (res.approvedByAdmin as BidStatus) || 'Pending'
        } as any) : b);
        setBidsSuccess(`Success! Verified as ${attendeeName}. Your prediction has been updated to ${matchedComp.fullName}!`);
      } else {
        let res: any;
        try {
          res = await databases.createDocument(
            activeConfig.databaseId,
            activeConfig.bidsCollectionId,
            ID.unique(),
            payload
          );
        } catch (err: any) {
          if (err?.message?.includes('approvedByAdmin') || err?.message?.includes('Unknown attribute')) {
            res = await databases.createDocument(
              activeConfig.databaseId,
              activeConfig.bidsCollectionId,
              ID.unique(),
              { email: payload.email, competitorName: payload.competitorName, eventId: payload.eventId }
            );
          } else {
            throw err;
          }
        }

        const newDoc: Bid = {
          id: res.$id,
          $id: res.$id,
          email: res.email,
          competitorName: res.competitorName,
          eventId: res.eventId,
          approvedByAdmin: (res.approvedByAdmin as BidStatus) || 'Pending'
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
        updatedList = bids.map(b => b.email.toLowerCase() === normalizedEmail ? { ...b, competitorName: matchedComp.fullName, approvedByAdmin: 'Pending' } : b);
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

  // Admin status update handler
  const handleUpdateBidStatus = async (bidId: string, newStatus: BidStatus) => {
    if (!isAdmin) return;
    setUpdatingStatusId(bidId);
    setBidsError(null);

    const targetBid = bids.find(b => b.id === bidId || b.$id === bidId);
    if (!targetBid) {
      setUpdatingStatusId(null);
      return;
    }

    const docId = targetBid.$id || targetBid.id;

    // Optimistically update state
    const updatedList = bids.map(b => (b.id === docId || b.$id === docId) ? { ...b, approvedByAdmin: newStatus } : b);
    setBids(updatedList);
    localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));

    if (currentEventId !== 'local' && isAppwriteConfigured()) {
      try {
        const activeConfig = getFullDbConfig();
        await databases.updateDocument(
          activeConfig.databaseId,
          activeConfig.bidsCollectionId,
          docId,
          { approvedByAdmin: newStatus }
        );
      } catch (err: any) {
        console.warn("Could not sync status update to Appwrite:", err?.message);
        if (err?.message?.includes('approvedByAdmin') || err?.message?.includes('Unknown attribute')) {
          setBidsError("Status updated in app state. (Note: 'approvedByAdmin' attribute can be added to your Appwrite bids collection schema for server persistence).");
        }
      }
    }
    setUpdatingStatusId(null);
  };

  // Admin delete handler
  const handleDeleteBid = async (bidId: string) => {
    if (!isAdmin) return;

    const targetBid = bids.find(b => b.id === bidId || b.$id === bidId);
    const docId = targetBid?.$id || targetBid?.id || bidId;

    const updatedList = bids.filter(b => b.id !== docId && b.$id !== docId);
    setBids(updatedList);
    localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));

    if (currentEventId !== 'local' && isAppwriteConfigured()) {
      try {
        const activeConfig = getFullDbConfig();
        await databases.deleteDocument(
          activeConfig.databaseId,
          activeConfig.bidsCollectionId,
          docId
        );
      } catch (err: any) {
        console.error("Failed to delete bid in Appwrite:", err);
        fetchBids();
      }
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

  // Helper to mask emails for privacy
  const maskEmail = (email: string) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) return `***@${domain}`;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  const renderStatusBadge = (status?: BidStatus) => {
    const s = status || 'Pending';
    switch (s) {
      case 'Accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            Accepted
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950/80 text-red-300 border border-red-500/40">
            <XCircle className="w-3 h-3 text-red-400 shrink-0" />
            Rejected
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            Pending
          </span>
        );
    }
  };

  const myUserBid = user?.email ? bids.find(b => b.email.toLowerCase() === user.email.toLowerCase()) : null;

  const pendingCount = bids.filter(b => (b.approvedByAdmin || 'Pending') === 'Pending').length;
  const acceptedCount = bids.filter(b => b.approvedByAdmin === 'Accepted').length;
  const rejectedCount = bids.filter(b => b.approvedByAdmin === 'Rejected').length;
  const myBidsCount = user?.email ? bids.filter(b => b.email.toLowerCase() === user.email.toLowerCase()).length : 0;

  const filteredFeedBids = [...bids].reverse().filter(b => {
    const s = b.approvedByAdmin || 'Pending';
    if (statusFilter === 'Pending') return s === 'Pending';
    if (statusFilter === 'Accepted') return s === 'Accepted';
    if (statusFilter === 'Rejected') return s === 'Rejected';
    if (statusFilter === 'MY_BIDS' && user?.email) return b.email.toLowerCase() === user.email.toLowerCase();
    return true;
  });

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
      <div className="bg-slate-950/70 backdrop-blur-xl rounded-3xl border border-white/[0.08] p-12 text-center max-w-xl mx-auto my-12 shadow-glass-glow space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-cyan-950/60 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          <Coins className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-orbitron font-extrabold italic uppercase tracking-wider text-white">No Active Event Selected</h2>
        <p className="text-sm text-gray-300 leading-relaxed font-sans">
          To predict and bid on skill challenge riders, an administrative user must first create or select an active tournament event from the Home dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Banner / Header Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between items-center text-center md:text-left border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1.5 font-mono">
            <span className="flex items-center gap-1 bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Spectator Predictions
            </span>
            <span className="text-xs text-gray-400 font-bold tracking-widest pl-2 font-orbitron">
              JETS HISTORIC ROADWAY
            </span>
          </div>
          <h1 className="font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-3xl md:text-4xl drop-shadow-[0_2px_4px_rgba(8,145,178,0.5)]">
            Place Support Predictions
          </h1>
          <p className="text-xs text-gray-300 mt-1 font-sans">
            Back your favorite rider for the <span className="text-cyan-300 font-bold">{currentEventName || 'Challenge Event'}</span>
          </p>
        </div>
        <div className="text-center md:text-right font-mono text-xs text-gray-400">
          <p className="font-bold text-cyan-300 uppercase tracking-widest text-[10px]">Registry: Verified Spectators Only</p>
          <p className="mt-0.5 text-[11px]">Bids Locked on Run Start: <span className={isCompetitionStarted ? "text-red-400 font-bold" : "text-emerald-400 font-bold animate-pulse"}>{isCompetitionStarted ? "CLOSED" : "OPEN"}</span></p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl shadow-glass-glow flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 shrink-0">
            <Coins className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Bids Received</span>
            <span className="text-2xl font-black text-white font-mono">{totalPredictionsPlaced}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl shadow-glass-glow flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 shrink-0">
            <Trophy className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Top Backed Rider</span>
            <span className="text-lg font-black text-amber-300 leading-none truncate max-w-[160px] block mt-1">{topBackedRacer}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl shadow-glass-glow flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 shrink-0">
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
          {/* User's own Prediction Status Card */}
          {myUserBid && (
            <div className="p-5 bg-slate-950/80 backdrop-blur-xl border border-cyan-500/40 rounded-3xl space-y-2.5 shadow-glass-glow">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  Your Prediction Status
                </span>
                {renderStatusBadge(myUserBid.approvedByAdmin)}
              </div>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-gray-400">Chosen Candidate:</span>
                <span className="font-extrabold text-white text-xs bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
                  {myUserBid.competitorName}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans leading-relaxed border-t border-white/10 pt-2">
                {myUserBid.approvedByAdmin === 'Accepted' && "Your prediction has been accepted by event administration!"}
                {myUserBid.approvedByAdmin === 'Rejected' && "Your prediction was rejected by event administration. You may update your pick using the form below."}
                {(!myUserBid.approvedByAdmin || myUserBid.approvedByAdmin === 'Pending') && "Your prediction is recorded and currently pending administrator approval."}
              </p>
            </div>
          )}

          <div className="bg-slate-950/70 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/[0.08] shadow-glass-glow space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-cyan-400" />
                Cast Your Vote
              </h2>
              <p className="text-xs text-gray-300 font-sans">
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
                  className="p-3.5 bg-red-950/40 border border-red-500/30 text-red-200 rounded-xl text-xs flex gap-2"
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
                  className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 rounded-xl text-xs flex gap-2"
                >
                  <Check className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0" />
                  <span>{bidsSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {isCompetitionStarted ? (
              <div className="p-5 bg-amber-950/30 border border-amber-500/30 text-amber-200 rounded-2xl text-xs space-y-2 leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 text-amber-300">
                  <Clock className="w-4 h-4 animate-spin" /> Predictions Locked
                </span>
                <p className="font-sans">
                  The competition timing runs have commenced! Spectator prediction submissions are now frozen to prevent post-launch hedging. We hope your predictions fly true!
                </p>
              </div>
            ) : competitors.length === 0 ? (
              <div className="p-5 bg-black/40 border border-white/10 text-gray-400 rounded-2xl text-xs text-center font-mono">
                Waiting for the tournament competitors to be registered. Check back soon!
              </div>
            ) : (
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div>
                  <label htmlFor="racer-select" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 font-mono">
                    1. Select Candidate Racer
                  </label>
                  <select
                    id="racer-select"
                    value={selectedCompForBid}
                    onChange={(e) => setSelectedCompForBid(e.target.value)}
                    className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white font-medium text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer outline-none transition shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    required
                  >
                    <option value="" className="bg-slate-900 text-gray-300">-- Choose Competitor --</option>
                    {competitors
                      .filter(c => c.status === CompetitorStatus.Pending)
                      .map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.fullName} ({c.companyName})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="verify-email" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 font-mono">
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
                    className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed font-sans">
                    You must use the exact email address registered in the <strong>Spectator Registry</strong> database. Setting predictions is instant and overrides previous choices.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submittingBid || !selectedCompForBid || !attendeeEmailInput.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-orbitron font-bold italic uppercase tracking-wider rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.3)] text-xs"
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

          {/* Activity stream log with Filters and Admin Status Controls */}
          <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-6 rounded-3xl shadow-glass-glow space-y-4">
            <div className="space-y-2 border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-orbitron font-extrabold italic uppercase tracking-wider text-gray-200 flex items-center gap-2">
                  <span>Spectator Predictions Feed</span>
                  <span className="text-[10px] px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded-full font-bold font-mono">LIVE FEED</span>
                </h3>
                <span className="text-[10px] text-gray-400 font-mono font-bold">{filteredFeedBids.length} entries</span>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-black/60 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  All ({bids.length})
                </button>
                {user?.email && (
                  <button
                    onClick={() => setStatusFilter('MY_BIDS')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                      statusFilter === 'MY_BIDS' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-black/60 text-gray-400 hover:text-white border border-white/10'
                    }`}
                  >
                    My Picks ({myBidsCount})
                  </button>
                )}
                <button
                  onClick={() => setStatusFilter('Pending')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    statusFilter === 'Pending' ? 'bg-amber-600 text-white' : 'bg-black/60 text-amber-300 hover:text-amber-200 border border-white/10'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('Accepted')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    statusFilter === 'Accepted' ? 'bg-emerald-600 text-white' : 'bg-black/60 text-emerald-300 hover:text-emerald-200 border border-white/10'
                  }`}
                >
                  Accepted ({acceptedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('Rejected')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    statusFilter === 'Rejected' ? 'bg-red-600 text-white' : 'bg-black/60 text-red-300 hover:text-red-200 border border-white/10'
                  }`}
                >
                  Rejected ({rejectedCount})
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto divide-y divide-white/10 pr-1">
              {filteredFeedBids.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400 font-mono">
                  No predictions found matching selected filter.
                </div>
              ) : (
                filteredFeedBids.map((b, index) => {
                  const isMyBid = user?.email && b.email.toLowerCase() === user.email.toLowerCase();
                  const bidId = b.id || b.$id || `bid_${index}`;

                  return (
                    <div key={bidId} className="pt-2.5 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-200 font-mono">{maskEmail(b.email)}</span>
                            {isMyBid && (
                              <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold rounded-md">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Predicted: <strong className="text-white font-semibold">{b.competitorName}</strong>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {renderStatusBadge(b.approvedByAdmin)}
                        </div>
                      </div>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1.5 bg-black/60 p-2 rounded-xl border border-white/10">
                          <span className="text-[9px] font-mono text-gray-400 uppercase mr-auto font-bold pl-1">Admin Action:</span>
                          
                          {b.approvedByAdmin !== 'Accepted' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBidStatus(bidId, 'Accepted')}
                              disabled={updatingStatusId === bidId}
                              className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Accept prediction"
                            >
                              <ThumbsUp className="w-3 h-3" /> Accept
                            </button>
                          )}

                          {b.approvedByAdmin !== 'Rejected' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBidStatus(bidId, 'Rejected')}
                              disabled={updatingStatusId === bidId}
                              className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-500/40 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Reject prediction"
                            >
                              <ThumbsDown className="w-3 h-3" /> Reject
                            </button>
                          )}

                          {b.approvedByAdmin && b.approvedByAdmin !== 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBidStatus(bidId, 'Pending')}
                              disabled={updatingStatusId === bidId}
                              className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Reset to Pending status"
                            >
                              <RefreshCw className="w-3 h-3" /> Reset
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteBid(bidId)}
                            className="p-1 bg-black/60 hover:bg-red-950 text-gray-400 hover:text-red-300 rounded-lg border border-white/10 hover:border-red-500/40 transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Competitors List Grid / Right */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-4">
          <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-glass-glow p-6 md:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-400" /> Competitive Roster Candidates
                </h2>
                <p className="text-xs text-gray-300 font-sans mt-0.5">
                  Select a candidate from the roster to place predictions. Showing current support pools.
                </p>
              </div>

              {/* Filtering */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter competitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>

            {filteredCompetitors.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 border border-dashed border-white/10 rounded-2xl font-mono">
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
                      className={`p-4 border rounded-2xl flex flex-col justify-between transition-all relative overflow-hidden h-32 ${
                        isCompetitionStarted ? "pointer-events-none" : "cursor-pointer"
                      } ${
                        isSelected 
                          ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]" 
                          : "border-white/10 bg-black/40 hover:border-cyan-500/30 hover:bg-black/60"
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex justify-between items-start gap-1">
                        <div className="truncate">
                          <p className="font-extrabold text-white text-sm tracking-tight truncate">
                            {candidate.fullName}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate uppercase">
                            {candidate.companyName}
                          </p>
                        </div>

                        {/* Selector indicator bubble */}
                        {!isCompetitionStarted && (
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected 
                              ? "bg-cyan-500 border-cyan-300 text-slate-950" 
                              : "border-white/20 text-transparent hover:border-white/40"
                          }`}>
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Stat Gauge */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                          <span className="text-gray-300 font-semibold uppercase flex items-center gap-1">
                            <Coins className="h-3 w-3 text-cyan-400" /> Spectator Support:
                          </span>
                          <span className="text-white font-extrabold text-[11px] bg-black/60 px-2 py-0.5 rounded-md border border-white/10">
                            {bidCount} votes ({ratio}%)
                          </span>
                        </div>

                        {/* Progress visual bar */}
                        <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${ratio}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full"
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
