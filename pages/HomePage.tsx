import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Competitor, Bid, CompetitorStatus, BidStatus } from '../types';
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
  XCircle,
  Loader2, 
  FolderOpen, 
  AlertCircle, 
  Lock, 
  Check,
  Coins,
  Sparkles,
  History,
  Edit2,
  X,
  Play,
  Clock,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Shuffle,
  GripVertical,
  ArrowUpDown,
  Trophy
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

interface HomePageProps {
  addCompetitor: (fullName: string, companyName: string) => void;
  deleteCompetitor: (id: string) => void;
  updateCompetitor?: (id: string, updates: Partial<Competitor>) => void;
  reorderCompetitors?: (reorderedList: Competitor[]) => void;
  competitors: Competitor[];
  resetCompetition: () => void;
  currentEventId: string | null;
  currentEventName: string | null;
  syncStatus: 'synced' | 'saving' | 'error' | 'local' | null;
  retrySync?: () => Promise<void>;
  selectEvent: (eventId: string, eventName: string, competitors: Competitor[]) => void;
  closeEvent: () => void;
  renameActiveEvent?: (newName: string) => Promise<void>;
}

const HomePage: React.FC<HomePageProps> = ({ 
  addCompetitor, 
  deleteCompetitor,
  updateCompetitor,
  reorderCompetitors,
  competitors, 
  resetCompetition,
  currentEventId,
  currentEventName,
  syncStatus,
  retrySync,
  selectEvent,
  closeEvent,
  renameActiveEvent
}) => {
  const { user, role, dbRolesConfigured, toggleSimulatedRole } = useAuth();
  const isAdmin = role === 'admin';
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [showCancelEventPrompt, setShowCancelEventPrompt] = useState(false);
  const [cancelingEvent, setCancelingEvent] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [competitorToDelete, setCompetitorToDelete] = useState<string | null>(null);
  const [pledgeToDelete, setPledgeToDelete] = useState<string | null>(null);

  // Competitor editing state
  const [editingCompetitorId, setEditingCompetitorId] = useState<string | null>(null);
  const [editingFullName, setEditingFullName] = useState('');
  const [editingCompanyName, setEditingCompanyName] = useState('');
  const [savingCompetitorEdit, setSavingCompetitorEdit] = useState(false);

  // Competitor sorting and dragging state
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  const startEditingCompetitor = (competitor: Competitor) => {
    if (!isAdmin) return;
    setEditingCompetitorId(competitor.id);
    setEditingFullName(competitor.fullName);
    setEditingCompanyName(competitor.companyName);
    setCompetitorToDelete(null);
  };

  const cancelEditingCompetitor = () => {
    setEditingCompetitorId(null);
    setEditingFullName('');
    setEditingCompanyName('');
  };

  const handleSaveCompetitorEdit = async (competitorId: string, originalName: string) => {
    if (!isAdmin) return;
    const trimmedName = editingFullName.trim();
    const trimmedCompany = editingCompanyName.trim();
    
    if (!trimmedName || !trimmedCompany) {
      alert("Please provide both competitor full name and affiliated company.");
      return;
    }

    setSavingCompetitorEdit(true);
    try {
      if (updateCompetitor) {
        updateCompetitor(competitorId, {
          fullName: trimmedName,
          companyName: trimmedCompany,
        });
      }

      // If competitor name changed, synchronize existing bids/predictions
      if (trimmedName !== originalName) {
        const updatedBids = bids.map(b => 
          b.competitorName.toLowerCase() === originalName.toLowerCase() 
            ? { ...b, competitorName: trimmedName } 
            : b
        );
        setBids(updatedBids);

        if (currentEventId) {
          localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedBids));

          if (currentEventId !== 'local' && isAppwriteConfigured()) {
            try {
              const activeConfig = getFullDbConfig();
              const bidsToUpdate = bids.filter(
                b => b.competitorName.toLowerCase() === originalName.toLowerCase()
              );
              for (const bid of bidsToUpdate) {
                const docId = bid.$id || bid.id;
                if (docId) {
                  await databases.updateDocument(
                    activeConfig.databaseId,
                    activeConfig.bidsCollectionId,
                    docId,
                    { competitorName: trimmedName }
                  ).catch((err: any) => console.warn("Failed to update prediction in Appwrite:", err));
                }
              }
            } catch (err) {
              console.warn("Could not sync predictions update for renamed competitor:", err);
            }
          }
        }
      }

      cancelEditingCompetitor();
    } catch (err: any) {
      console.error("Failed to update competitor details:", err);
      alert("Failed to update competitor: " + (err.message || err));
    } finally {
      setSavingCompetitorEdit(false);
    }
  };

  // Alphabetical sort handler (A-Z / Z-A)
  const handleSortAlphabetical = (forcedDirection?: 'asc' | 'desc') => {
    if (!isAdmin || competitors.length < 2) return;
    const nextDir = forcedDirection || (sortDirection === 'asc' ? 'desc' : 'asc');
    const sorted = [...competitors].sort((a, b) => {
      const cmp = a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      return nextDir === 'asc' ? cmp : -cmp;
    });
    setSortDirection(nextDir);
    if (reorderCompetitors) {
      reorderCompetitors(sorted);
    }
  };

  // Random shuffle sort handler
  const handleRandomShuffle = () => {
    if (!isAdmin || competitors.length < 2) return;
    const shuffled = [...competitors];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSortDirection(null);
    if (reorderCompetitors) {
      reorderCompetitors(shuffled);
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isAdmin || editingCompetitorId) return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isAdmin || draggedIdx === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isAdmin || draggedIdx === null) return;
    e.preventDefault();
    if (draggedIdx !== targetIndex) {
      const updated = [...competitors];
      const [movedItem] = updated.splice(draggedIdx, 1);
      updated.splice(targetIndex, 0, movedItem);
      setSortDirection(null);
      if (reorderCompetitors) {
        reorderCompetitors(updated);
      }
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleCancelEvent = async () => {
    if (!isAdmin) {
      alert("Only administrators are permitted to cancel or delete competition events.");
      return;
    }

    setCancelingEvent(true);
    try {
      if (currentEventId && currentEventId !== 'local' && isAppwriteConfigured()) {
        const activeConfig = getFullDbConfig();
        // Delete event document from Appwrite collection
        await databases.deleteDocument(
          activeConfig.databaseId,
          activeConfig.collectionId,
          currentEventId
        );

        // Delete associated bids for this event if any exist
        try {
          const bidsResponse = await databases.listDocuments(
            activeConfig.databaseId,
            activeConfig.bidsCollectionId,
            [query.equal('eventId', [currentEventId])]
          );
          for (const bidDoc of bidsResponse.documents) {
            await databases.deleteDocument(
              activeConfig.databaseId,
              activeConfig.bidsCollectionId,
              bidDoc.$id
            ).catch(() => {});
          }
        } catch (bidErr) {
          console.warn("Notice: Bid cleanup skipped or not needed:", bidErr);
        }
      } else if (currentEventId === 'local') {
        localStorage.removeItem('offline_competitors');
        localStorage.removeItem(`bids_${currentEventId}`);
      }

      closeEvent();
      setShowCancelEventPrompt(false);
      fetchEvents();
    } catch (err: any) {
      console.error("Failed to delete event document:", err);
      alert("Failed to delete event from database: " + (err.message || err));
    } finally {
      setCancelingEvent(false);
    }
  };

  const handleDeleteSavedEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;

    try {
      if (isAppwriteConfigured()) {
        const activeConfig = getFullDbConfig();
        await databases.deleteDocument(
          activeConfig.databaseId,
          activeConfig.collectionId,
          eventId
        );

        // Try deleting associated bids
        try {
          const bidsResponse = await databases.listDocuments(
            activeConfig.databaseId,
            activeConfig.bidsCollectionId,
            [query.equal('eventId', [eventId])]
          );
          for (const bidDoc of bidsResponse.documents) {
            await databases.deleteDocument(
              activeConfig.databaseId,
              activeConfig.bidsCollectionId,
              bidDoc.$id
            ).catch(() => {});
          }
        } catch (bidErr) {}
      }

      setExistingEvents(prev => prev.filter(doc => doc.$id !== eventId));
      setEventToDeleteId(null);
    } catch (err: any) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event from database: " + (err.message || err));
    }
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
  const [attendeeEmailInput, setAttendeeEmailInput] = useState('');
  const [bidsError, setBidsError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !attendeeEmailInput) {
      setAttendeeEmailInput(user.email);
    }
  }, [user]);

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

  const handleUpdateBidStatus = async (bidId: string, newStatus: BidStatus) => {
    if (role !== 'admin' || !currentEventId) return;

    const targetBid = bids.find(b => b.id === bidId || b.$id === bidId);
    const docId = targetBid?.$id || targetBid?.id || bidId;

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
        console.warn("Could not sync status update in Appwrite:", err?.message);
      }
    }
  };

  const formatEventCreatedDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return null;
    }
  };

  // Reload events on startup
  useEffect(() => {
    fetchEvents();
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
    if (!currentEventId) return;
    if (!selectedCompForBid || !attendeeEmailInput.trim()) {
      alert("Please enter your email and select a competitor to predict!");
      return;
    }

    const matchedComp = competitors.find(c => c.id === selectedCompForBid);
    if (!matchedComp) return;

    // Bids must be placed before competition starts!
    const isCompetitionStarted = competitors.some(c => c.status !== CompetitorStatus.Pending);
    if (isCompetitionStarted) {
      alert("Predictions are closed! You can only place or update your prediction before any competitor has started or finished their runs.");
      return;
    }

    const normalizedEmail = attendeeEmailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      alert("Please enter a valid email address.");
      return;
    }

    setSubmittingBid(true);
    setBidsError(null);

    // Look up email in attendees
    let attendeeExists = false;
    let attendeeName = "";

    if (currentEventId !== 'local' && isAppwriteConfigured()) {
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
          attendeeName = `${matchDoc.firstName} ${matchDoc.lastName}`.trim();
        } else {
          // Check local storage fallback
          const local = localStorage.getItem('offline_attendees');
          if (local) {
            const list = JSON.parse(local) as any[];
            const match = list.find(a => a.email.toLowerCase() === normalizedEmail);
            if (match) {
              attendeeExists = true;
              attendeeName = `${match.firstName} ${match.lastName}`.trim();
            }
          }
        }
      } catch (err: any) {
        console.warn("Could not query cloud attendees collection, checking local cache:", err.message);
        const local = localStorage.getItem('offline_attendees');
        if (local) {
          try {
            const list = JSON.parse(local) as any[];
            const match = list.find(a => a.email.toLowerCase() === normalizedEmail);
            if (match) {
              attendeeExists = true;
              attendeeName = `${match.firstName} ${match.lastName}`.trim();
            }
          } catch (e) {}
        }
      }
    } else {
      // Local check
      const local = localStorage.getItem('offline_attendees');
      if (local) {
        try {
          const list = JSON.parse(local) as any[];
          const match = list.find(a => a.email.toLowerCase() === normalizedEmail);
          if (match) {
            attendeeExists = true;
            attendeeName = `${match.firstName} ${match.lastName}`.trim();
          }
        } catch (e) {}
      }
    }

    if (!attendeeExists) {
      const errMsg = "Email verification failed. Your address does not match any registered attendee in our registry database. Please ask an administrator to add you under the 'Attendees' tab first.";
      setBidsError(errMsg);
      alert(errMsg);
      setSubmittingBid(false);
      return;
    }

    const payload = {
      email: normalizedEmail,
      competitorName: matchedComp.fullName,
      eventId: currentEventId
    };

    // Check if spectator already placed a prediction
    const existing = bids.find(b => b.email.toLowerCase() === normalizedEmail);

    if (currentEventId === 'local' || !isAppwriteConfigured()) {
      let updatedList: Bid[];
      if (existing) {
        updatedList = bids.map(b => b.email.toLowerCase() === normalizedEmail ? { ...b, competitorName: matchedComp.fullName } : b);
        alert(`Success! Verified as ${attendeeName}. Winner prediction updated to ${matchedComp.fullName}.`);
      } else {
        updatedList = [...bids, { id: 'local_' + Date.now(), ...payload }];
        alert(`Success! Verified as ${attendeeName}. Winner prediction registered for ${matchedComp.fullName}.`);
      }
      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setAttendeeEmailInput('');
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
        alert(`Success! Verified as ${attendeeName}. Prediction updated to: ${matchedComp.fullName}.`);
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
        alert(`Success! Verified as ${attendeeName}. Prediction registered for ${matchedComp.fullName}!`);
      }

      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setAttendeeEmailInput('');
      setSelectedCompForBid('');
    } catch (err: any) {
      console.warn("Appwrite bids sync failure, falling back to local simulation:", err.message);
      setBidsError(`Database error: ${err.message}. Prediction saved in offline cache.`);
      
      let updatedList: Bid[];
      if (existing) {
        updatedList = bids.map(b => b.email.toLowerCase() === normalizedEmail ? { ...b, competitorName: matchedComp.fullName } : b);
      } else {
        updatedList = [...bids, { id: 'fallback_' + Date.now(), ...payload }];
      }
      setBids(updatedList);
      localStorage.setItem(`bids_${currentEventId}`, JSON.stringify(updatedList));
      setAttendeeEmailInput('');
      setSelectedCompForBid('');
    } finally {
      setSubmittingBid(false);
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
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold rounded-full shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> CLOUD SYNCED
          </span>
        );
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-950/60 text-sky-400 border border-sky-500/30 text-xs font-mono font-semibold rounded-full shadow-[0_0_10px_rgba(56,189,248,0.15)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" /> SAVING RUN...
          </span>
        );
      case 'error':
        return (
          <button
            type="button"
            onClick={() => retrySync && retrySync()}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-950/80 hover:bg-red-900/90 text-red-300 hover:text-white border border-red-500/40 text-xs font-mono font-bold rounded-full transition cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)] group"
            title="Database sync issue. Click to retry connecting to Appwrite."
          >
            <RefreshCw className="h-3.5 w-3.5 text-red-400 group-hover:rotate-180 transition-transform duration-500" />
            <span>SYNC ERROR (CLICK TO RETRY)</span>
          </button>
        );
      case 'local':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-950/60 text-orange-400 border border-orange-500/30 text-xs font-mono font-semibold rounded-full">
            <Database className="h-3.5 w-3.5" /> LOCAL STORAGE
          </span>
        );
      default:
        return null;
    }
  };

  // Render registration card once active event is locked/selected
  if (currentEventId) {
    const activeDoc = existingEvents.find(doc => doc.$id === currentEventId);
    // Calculate prediction counts
    const totalPredictionsPlaced = bids.length;
    
    const getPicksForCompetitor = (competitorName: string) => {
      return bids.filter(b => b.competitorName === competitorName).length;
    };

    const eventAlreadyTookPlace = competitors.some(c => c.status !== CompetitorStatus.Pending);

    return (
      <div className="space-y-8 animate-fade-in" id="registered-competitor-board">
        {/* Active Header card */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] p-6 md:p-8 rounded-3xl shadow-glass-glow flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-300 uppercase bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-lg shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                ACTIVE CHALLENGE
              </span>
              {getSyncBadge()}
              
              <span className={`text-[11px] font-bold font-mono px-3 py-1 rounded-lg uppercase tracking-wider ${
                isAdmin ? 'bg-red-950/80 text-red-300 border border-red-500/40' : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
              }`}>
                ROLE: {role}
              </span>
            </div>
            {isEditingActiveName && isAdmin ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={activeNameInput}
                  onChange={(e) => setActiveNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveActiveName();
                    if (e.key === 'Escape') setIsEditingActiveName(false);
                  }}
                  className="bg-black/60 border border-cyan-400 text-white font-bold text-lg md:text-xl rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-400 max-w-sm sm:max-w-md w-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  placeholder="Enter challenge event title..."
                  autoFocus
                />
                <button
                  onClick={handleSaveActiveName}
                  className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-bold transition cursor-pointer shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                  title="Save Name"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingActiveName(false);
                    setActiveNameInput(currentEventName || '');
                  }}
                  className="p-2.5 bg-black/60 hover:bg-white/10 rounded-xl text-gray-300 border border-white/10 transition cursor-pointer shrink-0"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <h1 className="font-orbitron font-extrabold italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-2xl sm:text-3xl md:text-4xl drop-shadow-[0_2px_4px_rgba(8,145,178,0.5)] flex items-center gap-3 group mt-1">
                  <span>{currentEventName}</span>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditingActiveName(true)}
                      className="p-1.5 text-gray-400 hover:text-cyan-300 hover:bg-cyan-950/60 rounded-xl transition opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Rename challenge event"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </h1>
                {activeDoc?.$createdAt && (
                  <p className="text-xs text-cyan-300/80 flex items-center gap-1.5 font-mono mt-2">
                    <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>Added: {formatEventCreatedDate(activeDoc.$createdAt)}</span>
                  </p>
                )}
              </div>
            )}

          </div>

          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/competition')}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black font-orbitron italic uppercase tracking-wider transition rounded-2xl border border-red-400/40 text-xs sm:text-sm cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.35)]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Competition</span>
              </button>
            )}
            <button
              onClick={closeEvent}
              className="px-4 py-2.5 bg-black/60 hover:bg-white/10 text-gray-200 hover:text-white transition rounded-2xl border border-white/10 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Switch Event
            </button>
          </div>
        </div>

        {/* Sync Error Advisory Banner */}
        {syncStatus === 'error' && (
          <div className="bg-red-950/60 border border-red-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-200 animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 animate-pulse" />
              <div>
                <strong className="text-white font-bold block">Cloud Database Synchronization Issue</strong>
                <span className="text-red-300/90 font-sans">
                  Changes are currently saved safely in your local browser cache. Click retry or verify your collection IDs in DB Settings.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => retrySync && retrySync()}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.3)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Cloud Sync</span>
              </button>
              <button
                type="button"
                onClick={closeEvent}
                className="px-3 py-1.5 bg-black/60 hover:bg-white/10 text-gray-300 font-mono text-xs rounded-xl border border-white/10 transition cursor-pointer"
              >
                Switch Event
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-8">
          
          {/*-- Left side card: Depending on role, show Registration (Admin) or Bidding (User) --*/}
          {isAdmin ? (
            <div className="bg-slate-950/70 backdrop-blur-xl rounded-3xl shadow-glass-glow p-6 md:p-8 border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-cyan-400" /> Competitor Details
                </h2>
                <span className="text-xs font-mono text-gray-400">
                  Slots: <strong className="text-cyan-300 font-bold">{competitors.length}</strong> / 20
                </span>
              </div>

              {eventAlreadyTookPlace ? (
                <div className="bg-amber-950/40 border border-amber-500/30 p-5 rounded-2xl space-y-3 font-sans">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
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
                    <div className="p-4 bg-amber-950/40 border border-amber-500/35 text-amber-250 rounded-2xl text-xs leading-normal">
                      <strong>Slots filled:</strong> The events database column map allows up to 20 structured competitor lines. Clear active runs or create a new registry file.
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmitCompetitor} className="space-y-5">
                    <div>
                      <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2 font-mono">
                        Competitor's Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. John Doe"
                        disabled={competitors.length >= 20}
                        className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition text-white placeholder-gray-500 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="companyName" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2 font-mono">
                        Affiliated Company / Marina
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Waverez Jetski Marina"
                        disabled={competitors.length >= 20}
                        className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition text-white placeholder-gray-500 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={competitors.length >= 20}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-orbitron font-bold italic uppercase tracking-wider rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.3)] text-xs"
                    >
                      Add Competitor Position
                    </button>
                  </form>
                </>
              )}

              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl text-xs text-center text-gray-300 font-sans leading-relaxed">
                🛡️ You are currently operating under the <strong className="text-cyan-300">admin</strong> role. Clicking this role allows edit operations on competitor registry definitions and timing.
              </div>
            </div>
          ) : (
            /*-- Public Bids Portal Navigation Panel --*/
            <div className="bg-slate-950/70 backdrop-blur-xl rounded-3xl shadow-glass-glow p-6 md:p-8 border border-white/[0.08] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <Coins className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-1.5 text-left">
                  <h2 className="text-xl font-orbitron font-extrabold italic uppercase tracking-wider text-white">Active Prediction Pool</h2>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    Support your favorite competitive racer, check overall spectator backing metrics, and place your verified winner prediction securely in the designated Bids room before active runs commence!
                  </p>
                </div>

                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-[10px] text-cyan-300 font-mono flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 animate-pulse" />
                  <span>Real-time spectator support pools are open and sync instantly!</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/bids')}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-orbitron font-bold italic uppercase tracking-wider rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.3)] text-xs"
              >
                <span>Enter Public Bids Page</span>
                <span>🚀</span>
              </button>
            </div>
          )}

          {/*-- Roster Grid Column --*/}
          <div className="bg-slate-950/70 backdrop-blur-xl rounded-3xl shadow-glass-glow p-6 md:p-8 border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-cyan-400" />
                    <span>Competitive Roster Candidates</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">Registered lineup & starting order positions</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && competitors.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSortAlphabetical()}
                        className="py-1.5 px-2.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.15)]"
                        title={sortDirection === 'asc' ? "Sort Alphabetically (Z-A)" : "Sort Alphabetically (A-Z)"}
                      >
                        {sortDirection === 'desc' ? (
                          <ArrowUpAZ className="h-3.5 w-3.5 text-cyan-400" />
                        ) : (
                          <ArrowDownAZ className="h-3.5 w-3.5 text-cyan-400" />
                        )}
                        <span>{sortDirection === 'desc' ? 'Sort Z-A' : 'Sort A-Z'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRandomShuffle}
                        className="py-1.5 px-2.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 hover:border-purple-400 text-purple-300 text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                        title="Randomize Competitor Starting Positions"
                      >
                        <Shuffle className="h-3.5 w-3.5 text-purple-400" />
                        <span>Shuffle</span>
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    showCancelEventPrompt ? (
                      <div className="flex items-center gap-1.5 bg-red-950/80 p-1.5 border border-red-500/40 rounded-xl">
                        <span className="text-[10px] font-bold text-red-200 uppercase font-mono px-1">Delete Event?</span>
                        <button 
                          onClick={handleCancelEvent}
                          disabled={cancelingEvent}
                          className="py-1 px-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          {cancelingEvent ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                        </button>
                        <button 
                          onClick={() => setShowCancelEventPrompt(false)}
                          disabled={cancelingEvent}
                          className="py-1 px-2 bg-black/60 hover:bg-black/90 text-gray-200 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowCancelEventPrompt(true)}
                        className="py-1.5 px-3 bg-red-950/60 hover:bg-red-900 border border-red-500/40 hover:border-red-400 text-red-300 text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Cancel Event
                      </button>
                    )
                  )}
                </div>
              </div>

              {isAdmin && competitors.length > 1 && (
                <div className="mb-3 px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span className="flex items-center gap-1.5 text-cyan-300/80">
                    <GripVertical className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Drag cards to customize / randomize order</span>
                  </span>
                  {sortDirection && (
                    <span className="text-cyan-400 font-bold uppercase text-[10px]">
                      Sorted: {sortDirection.toUpperCase()}
                    </span>
                  )}
                </div>
              )}

              {competitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-black/30">
                  <Plus className="h-12 w-12 text-cyan-400/50 mb-3 animate-pulse" />
                  <p className="text-gray-300 font-medium text-center font-orbitron">No competitors registered yet</p>
                  <p className="text-gray-500 text-xs mt-1 font-mono">Admins can fill active slots to run timers.</p>
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {competitors.map((c, idx) => {
                      const picksCount = getPicksForCompetitor(c.fullName);
                      const isEditingThisCompetitor = editingCompetitorId === c.id;
                      const isBeingDragged = draggedIdx === idx;
                      const isDragTarget = dragOverIdx === idx && draggedIdx !== idx;

                      if (isEditingThisCompetitor) {
                        return (
                          <li 
                            key={c.id} 
                            className="bg-cyan-950/40 p-4 sm:p-5 rounded-2xl border border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition duration-300 space-y-3.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-cyan-900/80 text-cyan-300 text-xs font-mono font-extrabold flex items-center justify-center border border-cyan-400/40">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Edit2 className="h-3.5 w-3.5 text-cyan-400" /> Edit Competitor Roster Entry
                                </span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 bg-black/70 text-cyan-300 border border-white/10 rounded-md uppercase font-bold">
                                {c.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-mono font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                  Competitor Full Name
                                </label>
                                <input
                                  type="text"
                                  value={editingFullName}
                                  onChange={(e) => setEditingFullName(e.target.value)}
                                  placeholder="e.g. John Doe"
                                  autoFocus
                                  disabled={savingCompetitorEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveCompetitorEdit(c.id, c.fullName);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      cancelEditingCompetitor();
                                    }
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-black/80 border border-cyan-400/60 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-mono font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                                  Affiliated Company / Marina
                                </label>
                                <input
                                  type="text"
                                  value={editingCompanyName}
                                  onChange={(e) => setEditingCompanyName(e.target.value)}
                                  placeholder="e.g. Waverez Marina"
                                  disabled={savingCompetitorEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveCompetitorEdit(c.id, c.fullName);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      cancelEditingCompetitor();
                                    }
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-black/80 border border-cyan-400/60 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={cancelEditingCompetitor}
                                disabled={savingCompetitorEdit}
                                className="px-3.5 py-1.5 bg-black/60 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-1.5"
                              >
                                <X className="h-3.5 w-3.5" /> Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveCompetitorEdit(c.id, c.fullName)}
                                disabled={savingCompetitorEdit}
                                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                              >
                                {savingCompetitorEdit ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3.5 w-3.5" /> Save Changes
                                  </>
                                )}
                              </button>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li 
                          key={c.id} 
                          draggable={isAdmin && !editingCompetitorId}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border transition-all duration-200 ${
                            isBeingDragged 
                              ? 'opacity-30 border-cyan-400 border-dashed bg-cyan-950/20 scale-[0.98]' 
                              : isDragTarget 
                                ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-cyan-950/60 shadow-[0_0_18px_rgba(34,211,238,0.25)] scale-[1.01]' 
                                : 'bg-black/40 border-white/10 hover:border-cyan-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isAdmin && (
                              <div 
                                className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-cyan-300 transition p-1 shrink-0 -ml-1 rounded-lg hover:bg-white/5"
                                title="Click and drag to reorder / randomize position"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                            )}
                            <span className="w-7 h-7 shrink-0 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono font-extrabold flex items-center justify-center border border-cyan-400/30 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-white text-base leading-tight truncate">{c.fullName}</p>
                              <p className="text-gray-400 text-xs mt-0.5 truncate">{c.companyName}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono px-2.5 py-1 bg-black/60 text-cyan-300 border border-white/10 rounded-lg uppercase font-bold block w-fit ml-auto">
                                {c.status}
                              </span>
                              {picksCount > 0 && (
                                <p className="text-[10px] font-mono font-bold text-cyan-400 block pt-1">
                                  Picks: {picksCount} {picksCount === 1 ? 'attendee' : 'attendees'}
                                </p>
                              )}
                            </div>

                            {isAdmin && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditingCompetitor(c)}
                                  className="p-1.5 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 rounded-xl transition cursor-pointer"
                                  title="Edit Competitor Name and Company"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                {competitorToDelete === c.id ? (
                                  <div className="flex items-center gap-1 bg-red-950/80 p-1 border border-red-500/40 rounded-xl">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteCompetitor(c.id);
                                        setCompetitorToDelete(null);
                                      }}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase rounded-lg transition cursor-pointer"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCompetitorToDelete(null)}
                                      className="px-2 py-1 bg-black/60 hover:bg-black/90 text-gray-200 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setCompetitorToDelete(c.id)}
                                    className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 hover:text-red-200 rounded-xl transition cursor-pointer"
                                    title="Remove Competitor"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-gray-400 font-mono">
                    <span>Capacity Counter</span>
                    <span className="text-cyan-300 font-bold">{competitors.length} / 20 competitors filled</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/*-- Bidding Dashboard statistics ledger --*/}
        {competitors.length > 0 && (
          <div className="bg-slate-950/70 backdrop-blur-xl border border-white/[0.08] shadow-glass-glow rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-cyan-400" /> Attendee Winner Predictions
                </h3>
                <p className="text-xs text-gray-300 font-sans">
                  Real-time spectator distribution stats showing who attendees predict will win.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3 items-center">
                <div className="bg-black/40 border border-white/10 px-4 py-2 rounded-2xl text-right font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                  <span className="text-[9px] text-cyan-300 block font-bold tracking-widest uppercase">Total Predictions Cast</span>
                  <span className="text-cyan-300 text-lg lg:text-xl font-bold">{totalPredictionsPlaced} Picks</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Leaderboard of backed pilots */}
              <div className="space-y-3 bg-black/40 p-5 rounded-2xl border border-white/10">
                <h4 className="text-xs font-orbitron font-extrabold italic uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  🏆 Fan Favorite Standings
                </h4>
                <div className="divide-y divide-white/10 max-h-[220px] overflow-y-auto pr-1">
                  {competitors
                    .map(c => ({ 
                      ...c, 
                      picksCount: getPicksForCompetitor(c.fullName)
                    }))
                    .sort((a, b) => b.picksCount - a.picksCount)
                    .map((pilot, idx) => (
                      <div key={pilot.id} className="py-2.5 flex justify-between items-center text-xs">
                        <span className="truncate max-w-[180px] font-semibold text-gray-200">
                          {idx + 1}. {pilot.fullName}
                        </span>
                        <div className="text-right font-mono text-xs flex flex-col">
                          <span className={pilot.picksCount > 0 ? 'text-cyan-300 font-bold' : 'text-gray-500'}>
                            {pilot.picksCount} prediction{pilot.picksCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Placed Bids Ledger history */}
              <div className="space-y-3 bg-black/40 p-5 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-1">
                  <h4 className="text-xs font-orbitron font-extrabold italic uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-cyan-400 font-mono" /> Attendee Log ({bids.length})
                  </h4>
                </div>

                <div className="divide-y divide-white/10 max-h-[300px] overflow-y-auto pr-1">
                  {[...bids].reverse().length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500 font-mono">
                      No predictions placed yet.
                    </div>
                  ) : (
                    ([...bids].reverse()).map((bid) => {
                      const status = bid.approvedByAdmin || 'Pending';
                      const bidId = bid.id || bid.$id || '';

                      return (
                        <div key={bidId} className="py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in">
                          <div className="truncate text-gray-300 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-cyan-300 font-mono text-[11px] truncate leading-none">{bid.email}</strong>
                              <span className="text-gray-400 text-[10px]">predicted:</span> 
                              <span className="font-bold text-white text-xs bg-black/60 px-2 py-0.5 rounded-lg border border-white/10">{bid.competitorName}</span>
                              
                              {/* Status Badge */}
                              {status === 'Pending' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                                  <Clock className="w-2.5 h-2.5 text-amber-400" /> Pending
                                </span>
                              )}
                              {status === 'Accepted' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Accepted
                                </span>
                              )}
                              {status === 'Rejected' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-950/80 text-red-300 border border-red-500/30">
                                  <XCircle className="w-2.5 h-2.5 text-red-400" /> Rejected
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Render actions only for Course Marshal (Admin) */}
                          {role === 'admin' && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              {status !== 'Accepted' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBidStatus(bidId, 'Accepted')}
                                  className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                  title="Accept prediction"
                                >
                                  <ThumbsUp className="w-3 h-3" /> Accept
                                </button>
                              )}
                              {status !== 'Rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBidStatus(bidId, 'Rejected')}
                                  className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-500/40 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                  title="Reject prediction"
                                >
                                  <ThumbsDown className="w-3 h-3" /> Reject
                                </button>
                              )}
                              {status !== 'Pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBidStatus(bidId, 'Pending')}
                                  className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                  title="Reset to Pending"
                                >
                                  <RefreshCw className="w-3 h-3" /> Reset
                                </button>
                              )}

                              {pledgeToDelete === bidId ? (
                                <div className="flex items-center gap-1 bg-red-950/80 p-1 border border-red-500/40 rounded-xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteBid(bidId);
                                      setPledgeToDelete(null);
                                    }}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPledgeToDelete(null)}
                                    className="px-2 py-1 bg-black/60 hover:bg-black/90 text-gray-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPledgeToDelete(bidId)}
                                  className="p-1.5 bg-black/60 text-gray-400 hover:text-red-300 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 rounded-lg transition cursor-pointer"
                                  title="Remove Prediction Record"
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
      <div className="text-center space-y-3">
        <h1 className="font-orbitron font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-3xl sm:text-4xl md:text-5xl drop-shadow-[0_4px_12px_rgba(8,145,178,0.5)]">
          Jetski Trailer Challenge
        </h1>
        <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto font-sans leading-relaxed">
          Manage competitors, coordinate backing support pools, and track timed skill maneuvers.
        </p>
      </div>

      {dbError && (
        <div className="bg-red-950/80 backdrop-blur-md border border-red-500/50 rounded-3xl p-6 text-red-200 shadow-glass-glow">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-4 w-full text-left">
              <div>
                <h3 className="font-orbitron font-extrabold italic uppercase tracking-wider text-lg text-white">Database Integration Notice</h3>
                <p className="text-sm text-red-300 mt-1">{dbError}</p>
              </div>

              <div className="bg-black/60 p-4 rounded-2xl border border-red-500/20 space-y-3 text-xs leading-relaxed text-gray-300">
                <h4 className="font-bold text-red-300 uppercase tracking-widest font-mono">
                  🔧 Appwrite Database Creation Blueprint Guide:
                </h4>
                <p className="text-xs text-gray-300 mb-2 leading-relaxed">
                  Your project requires three simple collections to enable user roles and competitor backing pools. Create them inside your Appwrite console:
                </p>
                <div className="space-y-4 font-sans text-sm">
                  
                  {/* Step 1 */}
                  <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                    <h5 className="font-bold text-cyan-300 font-mono text-xs">EVENT REGISTRATION COLLECTION: '{config.collectionId}'</h5>
                    <ul className="list-disc pl-5 mt-1 text-xs text-gray-300 space-y-1 font-mono">
                      <li>eventName: String (Required)</li>
                      <li>competitor1 to competitor20: String, Length: 5000 (Optional)</li>
                    </ul>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                    <h5 className="font-bold text-cyan-300 font-mono text-xs">USER ROLES REGISTRY COLLECTION: '{config.usersCollectionId}'</h5>
                    <p className="text-xs text-gray-400 mt-0.5">Determines attendee permissions (admin vs viewer).</p>
                    <ul className="list-disc pl-5 mt-1 text-xs text-gray-300 space-y-1 font-mono">
                      <li>$id (document ID): Matches the user\'s Appwrite user ID (Automatic)</li>
                      <li>email: String, Length: 255 (Required)</li>
                      <li>role: String, Length: 50 (Required)</li>
                    </ul>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-black/40 p-3.5 rounded-xl border border-white/10">
                    <h5 className="font-bold text-cyan-300 font-mono text-xs">EVENT PREDICTIONS COLLECTION: '{config.bidsCollectionId}'</h5>
                    <p className="text-xs text-gray-400 mt-0.5">Records predictions placed by verified event attendees.</p>
                    <ul className="list-disc pl-5 mt-1 text-xs text-gray-300 space-y-1 font-mono">
                      <li>email: String, Length: 255 (Required)</li>
                      <li>competitorName: String, Length: 255 (Required)</li>
                      <li>eventId: String, Length: 255 (Required)</li>
                    </ul>
                  </div>

                  <p className="text-xs text-amber-300 leading-normal italic">
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
          <div className="bg-slate-950/70 backdrop-blur-xl rounded-3xl shadow-glass-glow p-6 md:p-8 border border-white/[0.08] flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-2">
              <h2 className="text-xl font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                <Plus className="h-6 w-6 text-cyan-400" /> Start Competition Event
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                Create a fresh competition registry line. You'll specify the title first, then you can instantly populate individual competitor names.
              </p>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label htmlFor="eventName" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2 font-mono">
                  Challenge Event Name
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={eventInput}
                  onChange={(e) => setEventInput(e.target.value)}
                  placeholder="e.g. Summer Marine Masters 2026"
                  className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition placeholder-gray-500 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creatingEvent || !eventInput.trim()}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-orbitron font-black italic uppercase tracking-wider rounded-xl transition duration-200 shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-xs"
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

            <div className="pt-4 border-t border-white/10 text-center">
              <span className="text-xs text-gray-400 font-mono">
                Database rows contain customized competitor values automatically as you add them.
              </span>
            </div>
          </div>
        )}

        {/*-- Open active event card --*/}
        <div className="bg-slate-950/70 backdrop-blur-xl rounded-3xl shadow-glass-glow p-6 md:p-8 border border-white/[0.08] flex flex-col justify-between space-y-6 text-left w-full">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-orbitron font-extrabold italic uppercase tracking-wider text-white flex items-center gap-2">
                <FolderOpen className="h-5.5 w-5.5 text-cyan-400" /> Saved Competitions
              </h2>
              <button
                onClick={fetchEvents}
                disabled={loadingEvents}
                className="p-1 px-2.5 bg-black/60 hover:bg-white/10 rounded-lg text-xs text-cyan-300 font-semibold flex items-center gap-1 transition cursor-pointer border border-white/10"
                title="Refresh Events"
              >
                <RefreshCw className={`h-3 w-3 ${loadingEvents ? 'animate-spin' : ''}`} /> Reload list
              </button>
            </div>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              Select any existing challenges saved in your Appwrite server collection to continue registration, time runs, and print results.
            </p>
          </div>

          <div className="space-y-3 min-h-[160px] max-h-[220px] overflow-y-auto pr-2">
            {loadingEvents ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 text-sm font-mono">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <span>Reading Appwrite documents...</span>
              </div>
            ) : existingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <Database className="h-10 w-10 text-gray-500 mb-2" />
                <p className="text-sm font-orbitron font-bold text-gray-300">No synced events found</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">Use the "Start Competition" card to add one.</p>
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
                    <div
                      key={doc.$id}
                      className="w-full p-3.5 bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-500/30 rounded-2xl flex items-center justify-between group transition duration-200"
                    >
                      <div 
                        onClick={() => loadDocumentItem(doc)}
                        className="truncate pr-4 flex-1 cursor-pointer"
                      >
                        <p className="font-bold text-white group-hover:text-cyan-300 transition truncate text-sm">
                          {doc.eventName}
                        </p>
                        {doc.$createdAt && (
                          <p className="text-[11px] text-cyan-300/80 flex items-center gap-1 font-mono mt-0.5">
                            <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
                            <span>Added {formatEventCreatedDate(doc.$createdAt)}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs bg-cyan-950 text-cyan-300 font-mono font-bold px-2.5 py-1 rounded-lg border border-cyan-500/30">
                          {slotsFilled}/20 Registered
                        </span>

                        {isAdmin && (
                          eventToDeleteId === doc.$id ? (
                            <div className="flex items-center gap-1 bg-red-950/80 p-0.5 border border-red-500/40 rounded-lg" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] font-bold text-red-200 font-mono px-1">Delete?</span>
                              <button
                                onClick={(e) => handleDeleteSavedEvent(doc.$id, e)}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventToDeleteId(null);
                                }}
                                className="px-2 py-0.5 bg-black/60 hover:bg-black/90 text-gray-300 text-[10px] font-bold rounded cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToDeleteId(doc.$id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                              title="Delete event from collection"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => selectEvent('local', 'Local Offline Play', [])}
              className="w-full py-2.5 bg-black/60 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold font-mono rounded-xl border border-white/10 tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
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
