import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, 
  onAuthStateChanged, signInAnonymously, signInWithCustomToken,
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, doc as fbDoc, setDoc, updateDoc, deleteDoc, getDoc,
  collection as fbCollection, addDoc, onSnapshot, query, orderBy, limit as fbLimit,
  arrayUnion 
} from 'firebase/firestore';

// --- SAFE FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBsFo07T-8_CA6EWzaLfeWLJ3ShuGx5KIM",
  authDomain: "rs-b5cf5.firebaseapp.com",
  databaseURL: "https://rs-b5cf5-default-rtdb.firebaseio.com",
  projectId: "rs-b5cf5",
  storageBucket: "rs-b5cf5.firebasestorage.app",
  messagingSenderId: "414676912966",
  appId: "1:414676912966:web:f4b40db19d4326ba3db347",
  measurementId: "G-8P1NK42WJW"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase critical initialization failed.", e);
  app = {}; auth = { currentUser: null }; db = {};
}

const googleProvider = new GoogleAuthProvider();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const collection = (dbRef, path, ...segments) => {
  if (dbRef && dbRef === db && typeof path === 'string' && !path.startsWith('artifacts')) {
    return fbCollection(dbRef, 'artifacts', appId, 'public', 'data', path, ...segments);
  }
  return fbCollection(dbRef, path, ...segments);
};

const doc = (dbRefOrCol, path, ...segments) => {
  if (dbRefOrCol && dbRefOrCol === db && typeof path === 'string' && !path.startsWith('artifacts')) {
    const parts = path.split('/');
    return fbDoc(dbRefOrCol, 'artifacts', appId, 'public', 'data', ...parts, ...segments);
  }
  return fbDoc(dbRefOrCol, path, ...segments);
};

// --- STYLING INJECTION ---
const injectArtStyleStyles = () => {
  if (document.getElementById('studio-aurum-styles')) return;
  const styleBlock = document.createElement('style');
  styleBlock.id = 'studio-aurum-styles';
  styleBlock.innerHTML = `
    .font-serif { font-family: 'Playfair Display', Georgia, serif; }
    .font-sans { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    .font-handwritten { font-family: 'Oranienbaum', Georgia, serif; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(234, 223, 201, 0.2); border-radius: 8px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 58, 0.4); border-radius: 8px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(197, 160, 58, 0.6); }
    .shadow-skeuo-sm { box-shadow: 0 4px 6px -1px rgba(135, 112, 58, 0.1), 0 2px 4px -1px rgba(135, 112, 58, 0.06); }
    .shadow-skeuo-md { box-shadow: 0 10px 25px -5px rgba(135, 112, 58, 0.15), 0 8px 10px -6px rgba(135, 112, 58, 0.1); }
    .shadow-skeuo-lg { box-shadow: 0 25px 50px -12px rgba(135, 112, 58, 0.22), 0 12px 18px -8px rgba(135, 112, 58, 0.15); }
    .shadow-skeuo-3d { box-shadow: 0 20px 40px rgba(135, 112, 58, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.9); }
    @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .animate-pulse-slow { animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  `;
  document.head.appendChild(styleBlock);
};

// --- PRESET AVATARS ---
const PRESET_AVATARS = [
  { id: 'coral-brush', name: 'Coral Splash', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#f43f5e" opacity="0.15"/><path d="M30,70 Q50,30 70,30 Q80,50 60,70 Z" fill="#f43f5e"/><circle cx="60" cy="45" r="5" fill="#C5A03A"/></svg>` },
  { id: 'cobalt-wave', name: 'Cobalt Swirl', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#1D4ED8" opacity="0.15"/><path d="M25,50 Q45,20 65,45 T85,50" fill="none" stroke="#1D4ED8" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="35" r="6" fill="#1D4ED8"/></svg>` },
  { id: 'gold-palette', name: 'Golden Drop', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#C5A03A" opacity="0.15"/><path d="M30,40 A20,20 0 0,0 70,60 A20,20 0 0,0 30,40" fill="#C5A03A"/><circle cx="45" cy="48" r="3" fill="#ffffff"/></svg>` },
  { id: 'emerald-leaf', name: 'Mint Stroke', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#10B981" opacity="0.15"/><path d="M35,35 Q50,70 65,35" fill="none" stroke="#10B981" stroke-width="10" stroke-linecap="round"/></svg>` },
];

const ADMIN_EMAIL = "naitiksaxena06@gmail.com";
const DEFAULT_CATEGORIES = ['Creativity', 'Editing', 'Writing', 'AI Related Expertise'];
const DEFAULT_YT_CONFIG = { channelId: '@naitik._.artist-16', apiKey: 'AIzaSyCZ7Aj3HV9JNeMAhTDUimZlUdjMqnPVNVg', subscribers: '—', latestVideoViews: '—', latestVideoTitle: 'Not synced yet', lastError: null, lastSyncedAt: null };

// --- 7-DAY EXPIRATION VISUAL TIMER ---
const getExpiry7 = (createdAt) => {
  if (!createdAt) return 'Unknown';
  const expiryTime = createdAt + (7 * 24 * 60 * 60 * 1000); 
  const diff = expiryTime - Date.now();
  if (diff <= 0) return 'Deleting soon...';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${Math.floor((diff / (1000 * 60)) % 60)}m`;
};

// --- 30-DAY EXPIRATION VISUAL TIMER ---
const getExpiry30 = (createdAt) => {
  if (!createdAt) return 'Unknown';
  const expiryTime = createdAt + (30 * 24 * 60 * 60 * 1000); 
  const diff = expiryTime - Date.now();
  if (diff <= 0) return 'Deleting soon...';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${Math.floor((diff / (1000 * 60)) % 60)}m`;
};

const compressAndConvertImage = (file, maxDim = 150) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > maxDim) { height *= maxDim / width; width = maxDim; } } 
        else { if (height > maxDim) { width *= maxDim / height; height = maxDim; } }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.70));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const resolvePlayableVideo = (url) => {
  if (!url) return { type: 'none', src: '', thumbnail: null };
  const cleaned = url.trim();
  
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = cleaned.match(ytRegex);
  if (ytMatch) {
    return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1`, thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` };
  }
  
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/;
  const driveMatch = cleaned.match(driveRegex);
  if (driveMatch) {
    return { 
      type: 'iframe-stream', 
      src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, 
      // This grabs the exact first second/thumbnail frame from Google's servers
      thumbnail: `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w600` 
    };
  }

  const photosRegex = /photos\.app\.goo\.gl|photos\.google\.com/i;
  if (photosRegex.test(cleaned)) {
    return { type: 'iframe-stream', src: cleaned, thumbnail: null };
  }

  const isDirect = /\.(mp4|webm|mov|ogv|m4v)(?:\?|$)/i.test(cleaned) || cleaned.startsWith('data:video/') || cleaned.includes('firebasestorage.googleapis.com');
  if (isDirect) {
    return { type: 'direct', src: cleaned, thumbnail: null };
  }
  return { type: 'iframe-stream', src: cleaned, thumbnail: null };
};

const renderAvatar = (photoURL, className = "w-full h-full object-cover", onClick = null) => {
  if (!photoURL || typeof photoURL !== 'string') {
    return <div onClick={onClick} className="bg-slate-200 w-full h-full flex items-center justify-center font-bold text-slate-400 font-sans cursor-pointer">?</div>;
  }
  if (photoURL.startsWith('<svg') || photoURL.includes('<circle') || photoURL.includes('<path')) {
    return <div onClick={onClick} className={`${className} cursor-pointer`} dangerouslySetInnerHTML={{ __html: photoURL }} />;
  }
  return <img onClick={onClick} src={photoURL} alt="Crew Avatar" className={`${className} cursor-pointer`} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60"; }} />;
};

const WatercolorOverlay = () => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-multiply z-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='watercolor-noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.03' numOctaves='4' result='noise'/%3E%3CfeDiffuseLighting in='noise' lighting-color='%23fff' surfaceScale='3'%3E%3CfeDistantLight azimuth='45' elevation='60'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23watercolor-noise)'/%3E%3C/svg%3E")` }} />
);

function NotificationBell({ notifications, userProfile, isAdmin, onNavigate, onSetActiveVideo, videos }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const visible = useMemo(() => (notifications || []).filter(n => {
    if (!n || n.actor === 'System' || n.actor === userProfile?.name) return false; 
    const audience = n.audience || 'all';
    return audience === 'all' || (audience === 'admin' && isAdmin);
  }), [notifications, isAdmin, userProfile]);

  const lastSeen = userProfile?.lastSeenNotifAt || 0;
  const unreadCount = useMemo(() => visible.filter(n => n.timestamp > lastSeen).length, [visible, lastSeen]);

  const openPanel = async (e) => {
    e.stopPropagation();
    setOpen(o => !o);
    if (!open && db && userProfile) {
      try { await updateDoc(doc(db, 'profiles', userProfile.id), { lastSeenNotifAt: Date.now() }); } catch (e) {}
    }
  };

  useEffect(() => {
    const handleClose = () => setOpen(false);
    if (open) {
      document.addEventListener('click', handleClose);
      document.addEventListener('touchstart', handleClose);
      return () => {
        document.removeEventListener('click', handleClose);
        document.removeEventListener('touchstart', handleClose);
      };
    }
  }, [open]);

  const handleNotificationClick = (notif) => {
    setOpen(false);
    const msg = (notif.message || '').toLowerCase();
    
    if (msg.includes('video asset') || msg.includes('commented on video')) {
      onNavigate('vault');
      const match = videos.find(v => msg.includes(v.title.toLowerCase()));
      if (match) onSetActiveVideo(match);
    } else if (msg.includes('concept whiteboard') || msg.includes('task')) {
      onNavigate('projects');
    } else if (msg.includes('script topic')) {
      onNavigate('scripts');
    } else if (msg.includes('showroom draft') || msg.includes('showroom feed')) {
      onNavigate('posts');
    } else if (msg.startsWith('"')) {
      onNavigate('chat');
    } else {
      onNavigate('home');
    }
  };

  return (
    <div className="relative font-sans" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button onClick={openPanel} className="relative p-2.5 hover:bg-[#C5A03A]/10 rounded-full transition text-[#C5A03A] shadow-inner border border-[#EADFC9]/50 bg-white/50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 sm:w-80 bg-white border-2 border-[#EADFC9] rounded-2xl shadow-skeuo-lg z-[9999] overflow-hidden max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-3 border-b border-[#EADFC9]/50 flex items-center justify-between shrink-0">
            <span className="font-serif font-bold text-sm text-slate-800">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 text-xs font-bold p-1 hover:text-slate-600">✕</button>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[300px]">
            {visible.slice(0, 30).map(n => (
              <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 border-b border-slate-50 text-[11px] cursor-pointer hover:bg-[#C5A03A]/5 transition ${n.timestamp > lastSeen ? 'bg-amber-50/40' : ''}`}>
                <span className="font-bold text-slate-800">{n.actor}: </span><span className="text-slate-600">{n.message}</span>
                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{new Date(n.timestamp).toLocaleString()}</p>
              </div>
            ))}
            {visible.length === 0 && <p className="text-xs text-slate-400 italic p-4 text-center">No notifications yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function useFirestoreCollection(name, orderField = null, limitN = null, enabled = false) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !db) { setItems([]); setLoaded(false); return; }
    try {
      let q = collection(db, name);
      if (orderField) q = query(collection(db, name), orderBy(orderField, 'desc'), ...(limitN ? [fbLimit(limitN)] : []));
      const unsub = onSnapshot(q, (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoaded(true); setError(null);
      }, (err) => { setLoaded(true); setError(err.message); });
      return () => unsub();
    } catch (e) { setError(e.message); setLoaded(true); }
  }, [name, orderField, limitN, enabled]);
  return [items, loaded, error];
}

function useFirestoreDoc(path, fallback, enabled = false) {
  const [data, setData] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !db) { setData(fallback); setLoaded(false); return; }
    try {
      const ref = doc(db, path);
      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) setData({ ...fallback, ...snap.data() }); else setData(fallback);
        setLoaded(true);
      }, () => setLoaded(true));
      return () => unsub();
    } catch (e) { setLoaded(true); }
  }, [path, enabled]);
  return [data, loaded];
}

export default function App() {
  const [loadingLibraries, setLoadingLibraries] = useState(true);
  const [threeReady, setThreeReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customToast, setCustomToast] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [chatChannel, setChatChannel] = useState('general');
  const [activeVideo, setActiveVideo] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setCustomToast({ message, type });
    setTimeout(() => setCustomToast(null), 1000); 
  }, []);

  const ensureProfileDocRef = useRef(() => {});

  useEffect(() => {
    if (!auth || !auth.app) { setAuthLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user && !user.isAnonymous) { try { await ensureProfileDocRef.current(user); } catch (e) {} }
      setAuthLoading(false);
    }, () => { setAuthLoading(false); });
    return () => unsub();
  }, []);

  const isAuthReady = !!authUser;
  const [profiles] = useFirestoreCollection('profiles', null, null, isAuthReady);
  const [categoriesDoc] = useFirestoreDoc('meta/categories', { list: DEFAULT_CATEGORIES }, isAuthReady);
  const categories = categoriesDoc.list || DEFAULT_CATEGORIES;
  const [posts] = useFirestoreCollection('posts', 'createdAt', null, isAuthReady);
  const [notifications, notifsLoaded, notifsError] = useFirestoreCollection('notifications', 'timestamp', 50, isAuthReady);
  const [ytConfig] = useFirestoreDoc('meta/ytConfig', DEFAULT_YT_CONFIG, isAuthReady);
  const [siteSettings] = useFirestoreDoc('meta/settings', { logoText: 'YOUTUBERS STUDIO', logoUrl: '', chatChannels: [{id: 'general', name: '🌍 Studio Room'}] }, isAuthReady);
  const [projects] = useFirestoreCollection('projects', 'createdAt', null, isAuthReady);
  const [tasks] = useFirestoreCollection('tasks', null, null, isAuthReady);
  const [chats] = useFirestoreCollection('chats', 'createdAt', 200, isAuthReady);
  const [videos] = useFirestoreCollection('videos', 'createdAt', null, isAuthReady);
  const [scripts] = useFirestoreCollection('scripts', 'createdAt', null, isAuthReady);

  const userProfile = useMemo(() => {
    if (!authUser) return null;
    return profiles.find(p => p.id === authUser.uid) || null;
  }, [profiles, authUser]);

  const isAdmin = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.role === 'admin' || userProfile.role === 'owner' || (userProfile.email || '').toLowerCase() === ADMIN_EMAIL;
  }, [userProfile]);

  const isRoastingWaiter = useMemo(() => {
    if (!userProfile) return false;
    const roleLower = (userProfile.role || '').toLowerCase();
    return roleLower === 'roasting waiter' || roleLower === 'waiter';
  }, [userProfile]);

  const isProfileIncomplete = useMemo(() => {
    if (!authUser || !userProfile) return false;
    return !userProfile.name || userProfile.name.trim() === '' || !userProfile.workCategory || userProfile.isProfileComplete === false;
  }, [authUser, userProfile]);

  useEffect(() => {
    if (!authLoading && !authUser && currentPage !== 'home') { setCurrentPage('home'); }
  }, [authUser, authLoading, currentPage]);

  useEffect(() => {
    if (!authUser || !userProfile) return;
    if (isProfileIncomplete && currentPage !== 'profile') {
      setCurrentPage('profile');
      showToast("Let's personalize your credentials before accessing the main board!", "info");
      return;
    }
    if (!isProfileIncomplete) {
      if (userProfile.status === 'pending' && currentPage !== 'pending-status') {
        setCurrentPage('pending-status');
      } else if (userProfile.status === 'rejected' && !['rejected-status', 'profile'].includes(currentPage)) {
        setCurrentPage('rejected-status');
      } else if (userProfile.status === 'approved' && isRoastingWaiter && currentPage !== 'profile') {
        setCurrentPage('profile');
      } else if (userProfile.status === 'approved' && !isRoastingWaiter && ['pending-status', 'rejected-status'].includes(currentPage)) {
        setCurrentPage('home');
      }
    }
  }, [userProfile, authUser, currentPage, isProfileIncomplete, isRoastingWaiter, showToast]);

  // --- BACKGROUND TIME-BASED AUTO-SWEEPER (Safe & Calibrated Active Firestore Deletion) ---
  useEffect(() => {
    if (!isAuthReady || !userProfile || !db || !db.app) return;
    const runSweep = async () => {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const safetyBaseline = 1735689600000; // Hardened timestamp fallback to prevent premature deletion of items on loading refresh loops

      const isDataOlderThan = (timestamp, threshold) => {
        if (!timestamp || typeof timestamp !== 'number' || timestamp < safetyBaseline) return false;
        return timestamp < threshold;
      };

      chats.forEach(async (item) => { if (isDataOlderThan(item.createdAt, sevenDaysAgo)) { try { await deleteDoc(doc(db, 'chats', item.id)); } catch (e) {} } });
      posts.forEach(async (item) => { if (isDataOlderThan(item.createdAt, sevenDaysAgo)) { try { await deleteDoc(doc(db, 'posts', item.id)); } catch (e) {} } });
      videos.forEach(async (item) => { if (isDataOlderThan(item.createdAt, sevenDaysAgo)) { try { await deleteDoc(doc(db, 'videos', item.id)); } catch (e) {} } });
      projects.forEach(async (item) => { if (isDataOlderThan(item.createdAt, thirtyDaysAgo)) { try { await deleteDoc(doc(db, 'projects', item.id)); } catch (e) {} } });
      scripts.forEach(async (item) => { if (isDataOlderThan(item.createdAt, thirtyDaysAgo)) { try { await deleteDoc(doc(db, 'scripts', item.id)); } catch (e) {} } });
      notifications.forEach(async (item) => { if (isDataOlderThan(item.timestamp, oneDayAgo)) { try { await deleteDoc(doc(db, 'notifications', item.id)); } catch (e) {} } });
    };
    const delayTimer = setTimeout(() => { runSweep(); }, 15000);
    return () => clearTimeout(delayTimer);
  }, [isAuthReady, userProfile, chats, posts, notifications, videos, scripts, projects]);

  useEffect(() => { if (notifsError && isAuthReady && !isRoastingWaiter) { showToast(`Notifications temporarily on standby.`, 'info'); } }, [notifsError, isAuthReady, isRoastingWaiter]);

  const unreadMap = useMemo(() => {
    if (isRoastingWaiter) return { vault: false, projects: false, scripts: false, posts: false };
    const lastSeen = userProfile?.lastSeenNotifAt || 0;
    const unread = (notifications || []).filter(n => n && n.message && n.timestamp > lastSeen && n.actor !== 'System');
    return {
      vault: unread.some(n => { const msg = String(n.message).toLowerCase(); return msg.includes('video asset') || msg.includes('commented on video'); }),
      projects: unread.some(n => String(n.message).toLowerCase().includes('concept whiteboard')),
      scripts: unread.some(n => String(n.message).toLowerCase().includes('script topic')),
      posts: unread.some(n => String(n.message).toLowerCase().includes('showroom draft')),
    };
  }, [notifications, userProfile, isRoastingWaiter]);

  const seenNotifIdsRef = useRef(new Set());
  const firstNotifLoadRef = useRef(true);
  
  useEffect(() => {
    if (!userProfile || isRoastingWaiter || userProfile.status !== 'approved') return;
    if (firstNotifLoadRef.current) {
      (notifications || []).forEach(n => n && seenNotifIdsRef.current.add(n.id));
      firstNotifLoadRef.current = false;
      return;
    }
    (notifications || []).forEach(n => {
      if (!n || !n.message || seenNotifIdsRef.current.has(n.id) || n.actor === 'System') return;
      seenNotifIdsRef.current.add(n.id);
      if (n.actor === userProfile.name) return;
      
      const msg = String(n.message).toLowerCase();
      if (currentPage === 'vault' && (msg.includes('video asset') || msg.includes('commented on video'))) return;
      if (currentPage === 'projects' && msg.includes('concept whiteboard')) return;
      if (currentPage === 'scripts' && msg.includes('script topic')) return;
      if (currentPage === 'posts' && msg.includes('showroom draft')) return;
      if (currentPage === 'chat' && !msg.startsWith('"')) return;

      const audience = n.audience || 'all';
const relevant = audience === 'all' || (audience === 'admin' && isAdmin);
if (relevant && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
  try { 
    // Forces phone browsers to display high-priority banner popups instantly
    const options = {
      body: n.message,
      icon: siteSettings.logoUrl || undefined,
      badge: siteSettings.logoUrl || undefined,
      tag: n.id,
      renotify: true,
      requireInteraction: true // Keeps the banner up until dismissed on mobile screens
    };
    new Notification('Youtubers Studio', options); 
  } catch (e) {
    console.error("Native push dispatch failure", e);
  }
}
    });
  }, [notifications, userProfile, isAdmin, siteSettings.logoUrl, currentPage, isRoastingWaiter]);

  const pushNotification = useCallback(async (message, actorName = 'Crew Member', audience = 'all') => {
    if (isRoastingWaiter || !db || !db.app || userProfile?.status !== 'approved') return;
    try { await addDoc(collection(db, 'notifications'), { message, actor: actorName, timestamp: Date.now(), audience }); } catch (err) {}
  }, [isRoastingWaiter, userProfile]);

  const ensureProfileDoc = useCallback(async (user) => {
    if (!db || !db.app) return null;
    const ref = doc(db, 'profiles', user.uid);
    const snap = await getDoc(ref);
    const emailLower = (user.email || '').toLowerCase();
    const isOwner = emailLower === ADMIN_EMAIL;
    if (!snap.exists()) {
      const newProfile = {
        id: user.uid, name: user.displayName || user.email.split('@')[0], email: user.email, role: isOwner ? 'owner' : 'member',
        status: isOwner ? 'approved' : 'pending', workCategory: categories[0] || 'Editing',
        photoURL: user.photoURL || PRESET_AVATARS[0].svg, createdAt: Date.now(), bio: '', isProfileComplete: false
      };
      await setDoc(ref, newProfile);
      return newProfile;
    } else if (isOwner && snap.data().role !== 'owner') { await updateDoc(ref, { role: 'owner', status: 'approved' }); }
    return snap.data();
  }, [categories]);
  ensureProfileDocRef.current = ensureProfileDoc;

  const handleGoogleSignIn = async () => {
    if (!auth || !auth.app) { showToast('Authentication unavailable.', 'warning'); return; }
    try { 
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) { showToast('Successfully authenticated!', 'success'); setShowSignInModal(false); }
    } catch (err) { showToast('Sign-in failed.', 'warning'); }
  };

  const handleSignOut = async () => {
    if (!auth || !auth.app) return;
    try { await fbSignOut(auth); setCurrentPage('home'); setActiveVideo(null); showToast('Signed out successfully.', 'info'); } catch (err) { showToast('Sign out failed.', 'warning'); }
  };

  const handleNavigationChange = (targetPage) => {
    setIsSidebarOpen(false);
    if (!authUser || !userProfile) { if (targetPage === 'home') { setCurrentPage('home'); return; } setShowSignInModal(true); return; }
    if (isProfileIncomplete) { showToast("Please save your onboarding profile options first!", "warning"); setCurrentPage('profile'); return; }
    if (userProfile.status === 'pending' || userProfile.status === 'rejected') {
      if (targetPage !== 'profile') { showToast("Your account is pending approval.", "warning"); setCurrentPage(userProfile.status === 'pending' ? 'pending-status' : 'rejected-status'); return; }
    }
    if (isRoastingWaiter) {
      if (targetPage !== 'profile') { showToast("Waiters are restricted to Profile access only.", "warning"); setCurrentPage('profile'); return; }
    }
    setCurrentPage(targetPage);
  };

  const syncYouTubeStats = async (targetChannelId, targetApiKey, silent = false) => {
    const activeChannelId = targetChannelId || ytConfig.channelId || DEFAULT_YT_CONFIG.channelId;
    const activeApiKey = targetApiKey || ytConfig.apiKey || DEFAULT_YT_CONFIG.apiKey;
    let url = '';
    const trimmed = activeChannelId.trim();
    if (trimmed.startsWith('UC') && !trimmed.includes('/') && !trimmed.includes('@')) {
      url = `https://www.googleapis.com/official/youtube/v3/channels?part=statistics,snippet&id=${trimmed}&key=${activeApiKey}`;
    } else {
      let handle = trimmed;
      const match = trimmed.match(/@([^/?#\s]+)/);
      if (match) handle = match[1]; else if (trimmed.includes('youtube.com/')) { const parts = trimmed.split('/'); handle = parts[parts.length - 1].replace('@', '').split('?')[0]; } else { handle = trimmed.replace('@', ''); }
      url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(handle)}&key=${activeApiKey}`;
    }

    try {
      const channelRes = await fetch(url); const channelData = await channelRes.json();
      if (!channelRes.ok) throw new Error(channelData?.error?.message || `YouTube API error ${channelRes.status}`);
      const item = channelData.items?.[0];
      if (!item) throw new Error('Channel not found — check the handle/ID.');

      const subsCount = item.statistics.subscriberCount; const channelIdActual = item.id; const channelTitle = item.snippet.title;
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelIdActual}&maxResults=5&order=date&type=video&key=${activeApiKey}`;
      const searchRes = await fetch(searchUrl); const searchData = await searchRes.json();
      let views = ytConfig.latestVideoViews; let videoTitle = ytConfig.latestVideoTitle;

      if (searchRes.ok && searchData.items?.length) {
        const videoItem = searchData.items[0]; const videoId = videoItem.id.videoId; videoTitle = videoItem.snippet.title;
        const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${activeApiKey}`);
        const videoData = await videoRes.json();
        if (videoRes.ok) views = videoData.items?.[0]?.statistics?.viewCount ?? views;
      }

      if (db && db.app) {
        await setDoc(doc(db, 'meta/ytConfig'), { channelId: activeChannelId, apiKey: activeApiKey, subscribers: parseInt(subsCount, 10).toLocaleString(), latestVideoViews: typeof views === 'string' && views.includes(',') ? views : parseInt(views, 10).toLocaleString(), latestVideoTitle: videoTitle, lastError: null, lastSyncedAt: Date.now() }, { merge: true });
      }
      if (!silent) showToast(`Synced with ${channelTitle}.`, 'success');
    } catch (err) {
      if (db && db.app) { await setDoc(doc(db, 'meta/ytConfig'), { lastError: err.message, lastSyncedAt: Date.now() }, { merge: true }).catch(() => {}); }
      if (!silent) showToast(`Sync failed: ${err.message}`, 'warning');
    }
  };

  const ytConfigRef = useRef(ytConfig);
  useEffect(() => { ytConfigRef.current = ytConfig; }, [ytConfig]);

  useEffect(() => {
    if (loadingLibraries || !isAdmin) return;
    syncYouTubeStats(ytConfigRef.current.channelId, ytConfigRef.current.apiKey, true);
    const timer = setInterval(() => { syncYouTubeStats(ytConfigRef.current.channelId, ytConfigRef.current.apiKey, true); }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadingLibraries, isAdmin]);

  useEffect(() => {
    injectArtStyleStyles();
    const loadScript = (src) => new Promise((resolve) => { const script = document.createElement('script'); script.src = src; script.onload = () => resolve(true); script.onerror = () => resolve(false); document.head.appendChild(script); });
    (async () => {
      try { const loadedThree = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); if (loadedThree) setThreeReady(true); } catch (e) {} finally { setLoadingLibraries(false); }
    })();
  }, []);

  if (loadingLibraries || authLoading) {
    return <div className="min-h-screen bg-[#FCFAF2] flex flex-col items-center justify-center font-serif text-[#C5A03A]"><div className="w-16 h-16 border-4 border-dashed border-[#C5A03A] rounded-full animate-spin mb-4" /><h2 className="text-2xl font-bold tracking-widest animate-pulse font-serif uppercase">SYNCING TIMELINES</h2></div>;
  }

  const targetInspectProfile = profiles.find(p => p.id === inspectUser);

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#FCFBF8] text-slate-800 font-sans selection:bg-[#C5A03A]/20">
      <WatercolorOverlay />
      {threeReady && <ThreeArtBackground />}

      {customToast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[99999] px-6 py-3 rounded-full shadow-skeuo-lg text-xs font-bold text-white transition-all animate-bounce ${customToast.type === 'success' ? 'bg-[#2ba640]' : 'bg-[#C5A03A]'}`}>{customToast.message}</div>
      )}

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FFFDF9]/85 border-b-2 border-[#EADFC9]/60 px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)] font-sans">
        <div className="flex items-center space-x-3 min-w-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#C5A03A]/10 rounded-full transition text-[#C5A03A] shadow-inner border border-[#EADFC9]/50 bg-white/50 shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
          <div className="flex items-center space-x-2 cursor-pointer min-w-0" onClick={() => handleNavigationChange('home')}>
            {siteSettings.logoUrl ? <img src={siteSettings.logoUrl} alt="Logo" className="w-8 h-8 object-cover rounded-lg shadow-[0_4px_15px_rgba(135,112,58,0.25)] border border-white shrink-0" /> : <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C5A03A] to-[#f43f5e] flex items-center justify-center text-white font-serif font-bold text-sm shadow-[0_4px_15px_rgba(197,160,58,0.3)] border border-white shrink-0">Y</div>}
            <span className="font-serif text-sm sm:text-base tracking-wide text-[#C5A03A] font-extrabold truncate max-w-[130px] sm:max-w-xs leading-none">{siteSettings.logoText || 'YOUTUBERS STUDIO'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
            <button 
              onClick={async () => {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                  new Notification("Youtubers Studio", { body: "Alerts synced! 🎉" });
                }
              }}
              className="text-[10px] bg-amber-500/20 text-amber-700 px-2.5 py-1 rounded-md font-bold"
            >
              🔔 Enable Phone Alerts
            </button>
          )}
          {userProfile && userProfile.status === 'approved' && !isRoastingWaiter && <NotificationBell notifications={notifications} userProfile={userProfile} isAdmin={isAdmin} onNavigate={setCurrentPage} onSetActiveVideo={setActiveVideo} videos={videos} />}
          {userProfile ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex flex-col text-right"><p className="text-xs font-bold text-slate-800 leading-none">{userProfile?.name}</p><span className="text-[8px] text-[#C5A03A] uppercase tracking-widest font-mono font-bold mt-1">{userProfile?.role}</span></div>
              <div className="w-8 h-8 rounded-full border border-[#C5A03A]/60 bg-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleNavigationChange('profile')}>{renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}</div>
            </div>
          ) : <button onClick={() => setShowSignInModal(true)} className="text-[10px] sm:text-xs font-bold bg-[#C5A03A] hover:bg-[#b59231] text-white px-3 py-2 rounded-full shadow-[0_4px_15px_rgba(197,160,58,0.25)] border border-white transition transform active:scale-95 whitespace-nowrap">🔑 Crew Sign In</button>}
        </div>
      </header>

      {/* --- SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 bg-black/40 backdrop-blur-xs ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`absolute left-0 top-0 bottom-0 w-72 bg-[#FFFDF9]/95 border-r border-[#EADFC9] shadow-2xl p-6 flex flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between pb-4 border-b border-[#EADFC9]/50"><span className="font-serif font-black text-base text-[#C5A03A] tracking-wider uppercase">Navigation</span><button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 font-bold p-1 hover:text-slate-600">✕</button></div>
            <nav className="space-y-1 relative">
              {(!userProfile || (userProfile.status === 'approved' && !isRoastingWaiter && !isProfileIncomplete)) && (
                <>
                  <button onClick={() => handleNavigationChange('home')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'home' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🏠</span><span>Home Hub</span></button>
                  <button onClick={() => handleNavigationChange('crew')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'crew' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🎬</span><span>Crew Roster</span></button>
                  <button onClick={() => handleNavigationChange('categories-view')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'categories-view' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🏷️</span><span>Categories</span></button>
                  <button onClick={() => handleNavigationChange('vault')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'vault' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🎞️</span><span>Video Vault</span>{unreadMap.vault && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}</button>
                  <button onClick={() => handleNavigationChange('projects')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'projects' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>📌</span><span>Project Board</span>{unreadMap.projects && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}</button>
                  <button onClick={() => handleNavigationChange('scripts')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'scripts' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>📝</span><span>Scripts</span>{unreadMap.scripts && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}</button>
                  <button onClick={() => handleNavigationChange('chat')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'chat' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>💬</span><span>Whiteboard Chat</span></button>
                  <button onClick={() => handleNavigationChange('posts')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'posts' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>📸</span><span>Insta Feed</span>{unreadMap.posts && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}</button>
                </>
              )}
              {userProfile && <button onClick={() => handleNavigationChange('profile')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'profile' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>👤</span><span>My Profile {isProfileIncomplete && '⚠️'}</span></button>}
              {isAdmin && !isRoastingWaiter && !isProfileIncomplete && (
                <div className="pt-4 border-t border-[#EADFC9]/50 mt-4 space-y-1"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 block mb-1 font-sans">Admin Controls</span><button onClick={() => handleNavigationChange('admin')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'admin' ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-rose-50/40'}`}><span>👥</span><span>Manage Roster</span></button></div>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="relative z-20 max-w-7xl mx-auto px-0 sm:px-4 py-6 studio-page-wrap animate-fadeIn">
        {currentPage === 'home' && <CreatorHomeHub siteSettings={siteSettings} videos={videos} projects={projects} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} isAdmin={isAdmin} notifications={notifications} onNavigate={setCurrentPage} onInspectUser={setInspectUser} userProfile={userProfile} />}
        {currentPage === 'pending-status' && <PendingScreen userProfile={userProfile} handleNavigationChange={handleNavigationChange} handleSignOut={handleSignOut} />}
        {currentPage === 'rejected-status' && <RejectedScreen handleSignOut={handleSignOut} />}
        {currentPage === 'crew' && <div className="px-4 sm:px-0"><CrewSection profiles={profiles} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} onInspectUser={setInspectUser} /></div>}
        {currentPage === 'categories-view' && <div className="px-4 sm:px-0"><CategoriesViewSection profiles={profiles} categories={categories} showToast={showToast} onInspectUser={setInspectUser} /></div>}
        
        {currentPage === 'vault' && <VideoVault videos={videos} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} pushNotification={pushNotification} activeVideo={activeVideo} setActiveVideo={setActiveVideo} onInspectUser={setInspectUser} />}
        {currentPage === 'projects' && <div className="px-4 sm:px-0"><ProjectBoard projects={projects} tasks={tasks} userProfile={userProfile} showToast={showToast} selectedProject={selectedProject} setSelectedProject={setSelectedProject} pushNotification={pushNotification} isAdmin={isAdmin} /></div>}
        {currentPage === 'scripts' && <div className="px-4 sm:px-0"><ScriptsWorkspace scripts={scripts} userProfile={userProfile} isAdmin={isAdmin} showToast={showToast} pushNotification={pushNotification} /></div>}
        {currentPage === 'chat' && <div className="px-4 sm:px-0"><WhiteboardChat chats={chats} userProfile={userProfile} chatChannel={chatChannel} setChatChannel={setChatChannel} pushNotification={pushNotification} siteSettings={siteSettings} isAdmin={isAdmin} showToast={showToast} onInspectUser={setInspectUser} /></div>}
        {currentPage === 'posts' && <div className="px-4 sm:px-0"><PostsWorkspace posts={posts} userProfile={userProfile} showToast={showToast} pushNotification={pushNotification} isAdmin={isAdmin} onInspectUser={setInspectUser} /></div>}
        
        {currentPage === 'profile' && (
          !userProfile ? <div className="bg-white border-2 border-[#EADFC9] p-8 rounded-2xl text-center max-w-md mx-auto shadow-skeuo-md"><p className="text-slate-600 font-medium">Preparing sandbox profile card...</p></div> : 
          <div className="px-4 sm:px-0"><MyProfileWorkspace userProfile={userProfile} categories={categories} showToast={showToast} handleSignOut={handleSignOut} isOnboarding={isProfileIncomplete} onNavigate={handleNavigationChange} /></div>
        )}
        {currentPage === 'admin' && isAdmin && <div className="px-4 sm:px-0"><AdminPanel profiles={profiles} siteSettings={siteSettings} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} userProfile={userProfile} showToast={showToast} /></div>}
      </main>

      {/* --- GLOBAL USER INSPECTOR MODAL --- */}
      {targetInspectProfile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setInspectUser(null)}>
          <div className="w-full max-w-sm bg-white border-2 border-[#EADFC9] rounded-[2rem] p-6 shadow-skeuo-lg relative text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setInspectUser(null)} className="absolute top-4 right-4 font-bold text-slate-400 hover:text-slate-600 transition">✕</button>
            <div className="w-20 h-20 rounded-full border-4 border-[#C5A03A]/20 mx-auto overflow-hidden p-0.5 mb-3 flex items-center justify-center bg-slate-50 shadow-inner">{renderAvatar(targetInspectProfile.photoURL)}</div>
            <div className="font-serif text-xl font-bold text-slate-800">{targetInspectProfile.name}</div>
            <span className="bg-[#C5A03A]/10 text-[#C5A03A] border border-[#C5A03A]/20 text-[9px] px-3 py-1 rounded-full font-bold mt-1.5 inline-block uppercase tracking-wider font-mono">{targetInspectProfile.workCategory} • {targetInspectProfile.role}</span>
            <div className="my-4 text-slate-500 font-serif italic text-xs px-2 leading-relaxed bg-amber-50/40 py-3 rounded-xl border border-[#EADFC9]/30">{targetInspectProfile.bio || "No custom bio configured yet."}</div>
            <p className="text-[10px] text-slate-400">Production Crew Member • Verified {new Date(targetInspectProfile.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {showSignInModal && <SignInModal handleGoogleSignIn={handleGoogleSignIn} setShowSignInModal={setShowSignInModal} showToast={showToast} />}
    </div>
  );
}

// --- THREEJS BACKGROUND GRAPHICS ---
function ThreeArtBackground() {
  const mountRef = useRef(null);
  useEffect(() => {
    if (!window.THREE) return;
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 11;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xfffdf2, 0.5));
    const specularSpot = new THREE.SpotLight(0xffedd5, 12, 40, Math.PI / 4, 0.5, 1);
    specularSpot.position.set(0, 0, 8); scene.add(specularSpot);
    const cobaltPoint = new THREE.PointLight(0x1d4ed8, 2.5, 18); cobaltPoint.position.set(-5, -3, 2); scene.add(cobaltPoint);
    const rosePoint = new THREE.PointLight(0xf43f5e, 2.5, 18); rosePoint.position.set(5, 3, 2); scene.add(rosePoint);

    const cameraRigGroup = new THREE.Group();
    const outerRingGeo = new THREE.TorusGeometry(1.9, 0.12, 16, 100); const darkTitaniumMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.95, roughness: 0.15 });
    const outerRing = new THREE.Mesh(outerRingGeo, darkTitaniumMat); cameraRigGroup.add(outerRing);
    const innerRingGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 100); const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 1.0, roughness: 0.05 });
    const innerRing = new THREE.Mesh(innerRingGeo, chromeMat); innerRing.rotation.x = Math.PI / 2; cameraRigGroup.add(innerRing);
    const lensBarrelGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.5, 32, 1, true); const goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.9, roughness: 0.1 });
    const lensBarrel = new THREE.Mesh(lensBarrelGeo, goldMat); lensBarrel.rotation.x = Math.PI / 2; cameraRigGroup.add(lensBarrel);
    const glassGeo = new THREE.SphereGeometry(0.75, 32, 32); const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.65, transmission: 0.9, ior: 1.5, thickness: 1.0 });
    const glassLens = new THREE.Mesh(glassGeo, glassMat); cameraRigGroup.add(glassLens);
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.55, 0.02); const blackAnodizedMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.4 });
    for (let i = 0; i < 8; i++) { const blade = new THREE.Mesh(bladeGeo, blackAnodizedMat); const angle = (i / 8) * Math.PI * 2; blade.position.set(Math.cos(angle) * 1.0, Math.sin(angle) * 1.0, 0); blade.rotation.z = angle + Math.PI / 4; cameraRigGroup.add(blade); }
    cameraRigGroup.position.set(-3.5, 1.5, -2); scene.add(cameraRigGroup);

    const reelGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32); const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
    const disk = new THREE.Mesh(diskGeo, darkMetal); disk.rotation.x = Math.PI / 2; reelGroup.add(disk);
    const ringGeo = new THREE.TorusGeometry(0.5, 0.1, 16, 100); const brassMat = new THREE.MeshStandardMaterial({ color: 0xC5A03A, metalness: 0.9, roughness: 0.1 });
    const brassRing = new THREE.Mesh(ringGeo, brassMat); brassRing.position.set(0, 0, 0.06); reelGroup.add(brassRing);
    reelGroup.position.set(4, -1, -2); scene.add(reelGroup);

    const pCount = 100; const pPositions = new Float32Array(pCount * 3); const pGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < pCount; i++) { pPositions[i * 3] = (Math.random() - 0.5) * 18; pPositions[i * 3 + 1] = (Math.random() - 0.5) * 10; pPositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 3; }
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMaterial = new THREE.PointsMaterial({ color: 0xC5A03A, size: 0.14, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Points(pGeometry, pMaterial));

    let mouseX = 0, mouseY = 0; const targetMouse = { x: 0, y: 0 };
    const handleWindowMouseMove = (e) => { targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1; targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1; };
    window.addEventListener('mousemove', handleWindowMouseMove);

    const clock = new THREE.Clock(); let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate); const elapsed = clock.getElapsedTime();
      outerRing.rotation.y = elapsed * 0.14; outerRing.rotation.x = elapsed * 0.07;
      innerRing.rotation.x = elapsed * 0.22; innerRing.rotation.z = elapsed * 0.16;
      lensBarrel.rotation.y = elapsed * 0.28; cameraRigGroup.position.y = 1.5 + Math.sin(elapsed * 0.45) * 0.2;
      reelGroup.rotation.z = elapsed * 0.35; reelGroup.rotation.y = elapsed * 0.15; reelGroup.position.y = -1 + Math.cos(elapsed * 0.5) * 0.15;
      mouseX += (targetMouse.x - mouseX) * 0.05; mouseY += (targetMouse.y - mouseY) * 0.05;
      specularSpot.position.x = 5 + mouseX * 4; specularSpot.position.y = 5 + mouseY * 4;
      camera.position.x = mouseX * 0.8; camera.position.y = mouseY * 0.8; camera.lookAt(scene.position); renderer.render(scene, camera);
    };
    animate();

    const resize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frameId); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', handleWindowMouseMove); if (mountRef.current) mountRef.current.innerHTML = ''; };
  }, []);
  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0 opacity-40 animate-fadeIn" />;
}

// --- SIGN IN MODAL ---
function SignInModal({ handleGoogleSignIn, setShowSignInModal, showToast }) {
  const [emailMode, setEmailMode] = useState(false); const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);

  const handleEmailAuthSubmit = async (e) => {
    e.preventDefault(); const cleanEmail = email.trim(); const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) return; if (!auth || !auth.app) { showToast('Authentication mock active in offline state.', 'info'); setShowSignInModal(false); return; }
    setLoading(true);
    try {
      if (isSignUp) { await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword); showToast('Created credentials!', 'success'); } 
      else { await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword); showToast('Successfully logged in!', 'success'); }
      setShowSignInModal(false);
    } catch (err) { showToast(err.message.includes('auth/') ? err.message.split('auth/')[1].replace('-', ' ') : 'Authentication failed.', 'warning'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn font-sans">
      <div className="w-full max-w-md bg-white border-2 border-[#EADFC9] rounded-[2rem] p-8 shadow-skeuo-lg relative font-sans animate-fadeIn">
        <button onClick={() => setShowSignInModal(false)} className="absolute top-4 right-4 font-bold text-slate-400 hover:text-slate-600 transition">✕</button>
        <div className="font-serif text-xl font-bold text-slate-800 text-center mb-1">Crew Member Sign In</div>
        <p className="text-xs text-slate-400 text-center mb-6">Gain credentials and establish customized role specializations on the storyboard.</p>
        
        {!emailMode ? (
          <div className="space-y-3">
            <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-[#EADFC9] hover:border-[#C5A03A] rounded-xl text-sm font-bold text-slate-700 shadow-sm transition">
              <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.2 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.3C40.9 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
              Continue with Google
            </button>
            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase">or</span><div className="flex-grow border-t border-slate-200"></div></div>
            <button onClick={() => setEmailMode(true)} className="w-full py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition">✉️ Continue with Email / Pass</button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5 animate-fadeIn">
            <div><label className="block text-[9px] font-bold text-slate-400 uppercase">Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1 focus:ring-1 focus:ring-[#C5A03A] focus:outline-none" required /></div>
            <div><label className="block text-[9px] font-bold text-slate-400 uppercase">Secret Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1 focus:ring-1 focus:ring-[#C5A03A] focus:outline-none" required /></div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-0 text-white text-xs font-bold rounded-xl transition">{loading ? "Authorizing credentials..." : (isSignUp ? "Sign Up as Crew" : "Authorize Crew Account")}</button>
            <div className="flex justify-between items-center pt-2 text-[10px]">
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-slate-500 hover:text-[#C5A03A] font-bold">{isSignUp ? "Already have an account? Sign In" : "Need credentials? Register here"}</button>
              <button type="button" onClick={() => setEmailMode(false)} className="text-slate-400 hover:underline">◀ Go Back</button>
            </div>
          </form>
        )}
        <p className="text-[10px] text-slate-400 text-center mt-6">New accounts are put on pending review. Please communicate with the owner for expedited access.</p>
      </div>
    </div>
  );
}

// --- HOMEPAGE HUB ---
function CreatorHomeHub({ siteSettings, videos, projects, ytConfig, syncYouTubeStats, isAdmin, notifications, onNavigate, onInspectUser, userProfile }) {
  const studioUpdates = useMemo(() => {
    return (notifications || []).filter(n => n && n.message && !String(n.message).startsWith('"') && n.actor !== 'System' && n.actor !== userProfile?.name);
  }, [notifications, userProfile]);

  return (
    <section className="space-y-8 py-2 animate-fadeIn font-sans px-4 sm:px-0">
      <div className="text-center py-2">
        <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl font-black text-slate-800 uppercase tracking-tight leading-tight">{siteSettings?.logoText || 'YOUTUBERS STUDIO'}</h1>
        <p className="text-slate-500 font-serif italic text-xs sm:text-sm mt-1">Creator timeline commander & segmented asset warehouse.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'YouTube Subscribers', value: ytConfig?.subscribers || '—', icon: '📈', change: ytConfig?.lastError ? `⚠ ${ytConfig.lastError}` : (ytConfig?.lastSyncedAt ? `Synced ${new Date(ytConfig.lastSyncedAt).toLocaleTimeString()}` : 'Not synced yet'), action: isAdmin ? (<button onClick={() => syncYouTubeStats()} className="text-[9px] bg-[#C5A03A]/10 text-[#C5A03A] font-bold px-2 py-1 rounded border border-[#C5A03A]/20 hover:bg-[#C5A03A]/20 transition mt-2 block font-sans">🔄 Fetch Live</button>) : null },
          { label: 'Latest Video Views', value: ytConfig?.latestVideoViews || '—', icon: '📺', change: ytConfig?.latestVideoTitle ? `"${ytConfig.latestVideoTitle.substring(0, 24)}..."` : '—', action: null },
          { label: 'Vault Records', value: `${videos?.length || 0} Masters`, icon: '🎞️', change: 'Shared studio storage', action: null },
          { label: 'Active Ideas', value: `${projects?.length || 0} Boards`, icon: '📌', change: 'Real-time whiteboard', action: null },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/80 border-b-[5px] border-r border-l border-t border-[#EADFC9] rounded-2xl p-4 shadow-skeuo-md hover:-translate-y-0.5 hover:shadow-skeuo-3d transition-all flex flex-col justify-between h-36">
            <div><div className="flex justify-between items-center text-slate-400 mb-1"><span className="text-[9px] uppercase font-bold tracking-wider font-sans">{stat.label}</span><span className="text-base">{stat.icon}</span></div><p className="text-lg md:text-xl font-black text-slate-800 font-sans leading-none">{stat.value}</p></div>
            <div className="mt-1 font-sans"><span className="text-[9px] text-[#C5A03A] font-semibold block truncate leading-tight">{stat.change}</span>{stat.action}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/80 border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md font-sans">
        <div className="flex items-center justify-between border-b border-[#EADFC9]/30 pb-2 mb-3 font-serif"><h3 className="font-serif text-sm font-bold text-[#C5A03A]">📢 Studio Updates</h3><span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-sans border border-emerald-200">Recent Activity</span></div>
        <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar font-sans pr-1">
          {studioUpdates.map(notif => (
            <div key={notif.id} className="text-[11px] leading-relaxed border-b border-dashed border-slate-100 pb-1.5 animate-fadeIn">
              <span className="font-bold text-slate-800 font-sans cursor-pointer hover:underline" onClick={() => onInspectUser(notif.authorUid)}>{notif.actor}:{' '}</span>
              <span className="text-slate-600 font-sans">{notif.message}</span>
              <p className="text-[8px] text-slate-400 mt-0.5 font-mono">{new Date(notif.timestamp).toLocaleTimeString()}</p>
            </div>
          ))}
          {studioUpdates.length === 0 && <p className="text-xs text-slate-400 italic">No updates mapped to log yet.</p>}
        </div>
      </div>
    </section>
  );
}

// --- CREW DIRECTORY SECTION ---
function CrewSection({ profiles, userProfile, showToast, isAdmin, onInspectUser }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const approvedProfiles = useMemo(() => (profiles || []).filter(p => p.status === 'approved'), [profiles]);

  const removeMember = async (uid) => {
    if (!db || !db.app) return;
    try { await deleteDoc(doc(db, 'profiles', uid)); showToast('Crew member removed.', 'success'); } catch (err) { showToast('Failed to remove.', 'warning'); }
  };

  if (approvedProfiles.length === 0) return <div className="text-center text-slate-400 py-20">No approved crew members yet.</div>;

  return (
    <section className="py-2 animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <div className="lg:col-span-1 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl text-center shadow-skeuo-md animate-fadeIn h-fit">
        <div className="w-24 h-24 rounded-full border-4 border-[#C5A03A]/20 mx-auto overflow-hidden p-0.5 mb-3 flex items-center justify-center bg-slate-50 shadow-inner">{renderAvatar(approvedProfiles[focusIdx]?.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(approvedProfiles[focusIdx]?.id))}</div>
        <div className="font-serif text-xl font-bold text-slate-800 cursor-pointer hover:text-[#C5A03A]" onClick={() => onInspectUser(approvedProfiles[focusIdx]?.id)}>{approvedProfiles[focusIdx]?.name}</div>
        <p className="text-xs text-slate-400 mt-1 font-sans">{approvedProfiles[focusIdx]?.email}</p>
        <span className="bg-[#C5A03A] text-white text-[9px] px-3 py-1 rounded-full font-bold mt-2 inline-block font-sans shadow-sm uppercase">{approvedProfiles[focusIdx]?.role}</span>
        {approvedProfiles[focusIdx]?.bio && <p className="text-xs text-slate-500 mt-4 border-t pt-3 italic font-serif">"{approvedProfiles[focusIdx].bio}"</p>}
      </div>

      <div className="lg:col-span-2 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md max-h-[450px] overflow-y-auto custom-scrollbar animate-fadeIn">
        <h4 className="font-serif font-bold text-sm border-b pb-2 mb-3 text-slate-700">Production Team Members</h4>
        <div className="space-y-2 font-sans">
          {profiles.map((p, i) => (
            <div key={p.id} className="flex justify-between items-center p-2.5 border rounded-xl hover:border-[#C5A03A]/40 transition bg-slate-50/50">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-white shadow-sm cursor-pointer shrink-0">{renderAvatar(p.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(p.id))}</div>
                <div className="cursor-pointer min-w-0" onClick={() => setFocusIdx(approvedProfiles.indexOf(p) !== -1 ? approvedProfiles.indexOf(p) : 0)}>
                  <p className="text-xs font-bold text-slate-800 truncate hover:text-[#C5A03A]" onClick={() => onInspectUser(p.id)}>{p.name}</p>
                  <span className="text-[9px] font-mono text-slate-400 block truncate">{p.email} • {p.role} • {p.workCategory}</span>
                </div>
              </div>
              {isAdmin && (p.email || '').toLowerCase() !== ADMIN_EMAIL && <button onClick={() => removeMember(p.id)} className="bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold px-2.5 py-1 rounded-full hover:bg-rose-100 font-sans whitespace-nowrap">Remove</button>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- CATEGORIES VIEW ---
function CategoriesViewSection({ profiles, categories, showToast, onInspectUser }) {
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Editing');
  const [newCatInput, setNewCustomCategory] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault(); const clean = newCatInput.trim(); if (!clean || !db || !db.app) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) { showToast('Category exists.', 'warning'); return; }
    await setDoc(doc(db, 'meta/categories'), { list: arrayUnion(clean) }, { merge: true });
    setActiveCategory(clean); setNewCustomCategory(''); showToast(`Category added.`, 'success');
  };

  const matchedMembers = useMemo(() => (profiles || []).filter(p => p.status === 'approved' && p.workCategory === activeCategory), [profiles, activeCategory]);

  return (
    <section className="py-2 animate-fadeIn grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
      <div className="lg:col-span-1 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-4 rounded-2xl shadow-skeuo-md space-y-4 animate-fadeIn">
        <div>
          <h4 className="font-serif text-xs font-bold text-slate-800 mb-1.5">Add Custom Category</h4>
          <form onSubmit={handleAddCategory} className="space-y-1.5 font-sans font-semibold">
            <input type="text" value={newCatInput} onChange={(e) => setNewCustomCategory(e.target.value)} placeholder="e.g. 3D Matte Shader" className="w-full px-3 py-1.5 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none" required />
            <button type="submit" className="w-full py-1 bg-[#C5A03A] text-white text-[9px] font-bold uppercase rounded-lg border-b-[3px] border-[#ab892c] active:border-b-[1px] active:translate-y-[1px] shadow-sm">Add Role Tag</button>
          </form>
        </div>
        <div className="pt-3 border-t border-slate-100 space-y-1">
          <span className="text-[9px] font-bold text-[#C5A03A] uppercase tracking-wider block mb-1.5 font-sans">Role tags</span>
          {categories.map((cat, idx) => (<button key={idx} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeCategory === cat ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-500 hover:bg-slate-50'}`}>🎥 {cat}</button>))}
        </div>
      </div>

      <div className="lg:col-span-3 bg-white/70 border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md space-y-3 animate-fadeIn">
        <div className="flex justify-between items-center border-b pb-2 border-slate-100 font-serif">
          <h3 className="font-serif text-base font-bold text-slate-800">Specialization: <span className="text-[#C5A03A]">{activeCategory}</span></h3>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 font-sans">{matchedMembers.length} Specialists</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans animate-fadeIn">
          {matchedMembers.map((member) => (
            <div key={member.id} className="flex items-center space-x-2.5 p-3 border bg-white rounded-xl shadow-sm animate-fadeIn">
              <div className="w-9 h-9 rounded-full border bg-white overflow-hidden p-0.5 flex items-center justify-center shrink-0">{renderAvatar(member.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(member.id))}</div>
              <div className="min-w-0">
                <h5 className="font-bold text-xs text-slate-800 font-sans truncate hover:text-[#C5A03A] cursor-pointer" onClick={() => onInspectUser(member.id)}>{member.name}</h5>
                <p className="text-[9px] text-slate-400 font-sans truncate">{member.email}</p>
                <span className="inline-block bg-amber-50 text-[#C5A03A] text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5 font-sans uppercase">{member.role}</span>
              </div>
            </div>
          ))}
          {matchedMembers.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">"No crew member is currently assigned to this specialization."</div>}
        </div>
      </div>
    </section>
  );
}

function CustomVideoPlayer({ hlsUrl, videoTitle }) {
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const playerWrapperRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoRatio, setVideoRatio] = useState(16 / 9);
  const [zoomScale, setZoomScale] = useState(1); 
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration || 0);
    if (e.target.videoWidth && e.target.videoHeight) {
      setVideoRatio(e.target.videoWidth / e.target.videoHeight);
    }
  };

  const hideControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setIsPlaying((p) => { if (p) setShowControls(false); return p; });
    }, 1500);
  }, []);

  const awakeControlsOverlay = () => {
    setShowControls(true);
    if (isPlaying) hideControlsTimeout();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const skip10 = (secs) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + secs, 0), duration);
    awakeControlsOverlay();
  };

  const changeSpeed = (speed) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    awakeControlsOverlay();
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
    awakeControlsOverlay();
  };

  const handleTimelinePosition = (clientX) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const posX = clientX - rect.left;
    const pct = Math.min(Math.max(posX / rect.width, 0), 1);
    setHoverTime(pct * duration);
    setHoverX(clientX - rect.left);
  };

  const handleVideoSurfaceClickTracker = (e) => {
    if (e.detail === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        setShowControls((prev) => {
          const ns = !prev;
          if (ns && isPlaying) hideControlsTimeout();
          return ns;
        });
      }, 220);
    } else if (e.detail === 2) {
      clearTimeout(clickTimeoutRef.current);
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX < rect.width / 2) skip10(-10); else skip10(10);
    }
  };

  const cycleZoomScale = () => {
    setZoomScale((z) => {
      if (z === 1) return 1.25;
      if (z === 1.25) return 1.50;
      return 1;
    });
    awakeControlsOverlay();
  };

  const formatTime = (timeSecs) => {
    const min = Math.floor(timeSecs / 60);
    const sec = Math.floor(timeSecs % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div 
      ref={playerWrapperRef} 
      onMouseMove={awakeControlsOverlay}
      onTouchStart={awakeControlsOverlay}
      style={{ aspectRatio: videoRatio }}
      className="relative bg-black w-full max-w-4xl mx-auto shadow-skeuo-lg overflow-hidden group/player transition-all duration-300 h-auto rounded-xl max-h-[75vh]"
    >
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          src={hlsUrl} 
          style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          className="w-full h-full object-contain cursor-pointer" 
          onLoadedMetadata={handleLoadedMetadata} 
          onTimeUpdate={e => setCurrentTime(e.target.currentTime)} 
          onClick={handleVideoSurfaceClickTracker} 
          playsInline 
        />
      </div>

      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-black/10 to-black/40 transition-opacity duration-300 flex flex-col justify-between p-2.5 sm:p-4 z-40 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full flex items-center justify-between text-white drop-shadow-md select-none font-sans text-[10px] sm:text-xs">
          <span className="font-serif font-bold tracking-wide truncate max-w-[60%]">{videoTitle || 'Playing Asset'}</span>
          <span className="font-mono text-slate-300 text-[9px] bg-black/40 px-1.5 py-0.5 rounded">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>

        <div className="w-full flex items-center justify-center">
          <button onClick={togglePlay} className="pointer-events-auto w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center text-white text-base sm:text-xl backdrop-blur-xs transition transform active:scale-90 shadow-2xl">
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        <div className="w-full flex flex-col gap-2 pointer-events-auto bg-black/70 backdrop-blur-xs p-2 rounded-xl border border-white/5">
          <div className="relative w-full group/scrub h-4 flex items-center">
            {hoverTime !== null && (
              <div 
                style={{ left: `${Math.min(Math.max(hoverX, 40), window.innerWidth - 40)}px` }} 
                className="absolute bottom-5 transform -translate-x-1/2 bg-slate-900 border border-[#C5A03A]/50 text-white rounded-md p-1 flex flex-col items-center shadow-lg pointer-events-none z-50 w-16 text-center"
              >
                <span className="font-mono text-[9px] text-amber-400 font-bold">{formatTime(hoverTime)}</span>
              </div>
            )}
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={currentTime} 
              onChange={handleSeek} 
              onMouseMove={(e) => handleTimelinePosition(e.clientX)}
              onTouchMove={(e) => e.touches[0] && handleTimelinePosition(e.touches[0].clientX)}
              onMouseLeave={() => setHoverTime(null)}
              onTouchEnd={() => setHoverTime(null)}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#C5A03A] hover:h-1.5 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-white text-[10px] sm:text-xs font-bold font-sans">
            <div className="flex items-center gap-2">
              <button onClick={() => skip10(-10)} className="active:text-amber-400 text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded">⏪ 10s</button>
              <button onClick={() => skip10(10)} className="active:text-amber-400 text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded">⏩ 10s</button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={cycleZoomScale} className="text-[9px] font-mono bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-amber-400 hover:bg-amber-500/20 transition">
                🔍 {zoomScale === 1 ? 'Fit' : `${zoomScale}x`}
              </button>
              <div className="flex items-center bg-black/40 rounded px-1.5 py-0.5 gap-1 border border-white/5 text-[8px]">
                {[1, 1.5, 2].map(speed => (
                  <button key={speed} onClick={() => changeSpeed(speed)} className={`px-1 rounded font-mono ${playbackSpeed === speed ? 'bg-[#C5A03A] text-white' : 'text-slate-300'}`}>{speed}x</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VIDEO VAULT FEED & INTEGRATION ---
function VideoVault({ videos, userProfile, showToast, isAdmin, pushNotification, activeVideo, setActiveVideo, onInspectUser }) {
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const startUpload = async (e) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrlInput.trim() || !db || !db.app) return;
    
    try {
      await addDoc(collection(db, 'videos'), {
        title: videoTitle.trim(),
        hlsUrl: videoUrlInput.trim(),
        uploaderUid: userProfile.id,
        uploaderName: userProfile.name,
        uploaderAvatar: userProfile.photoURL || '',
        size: "External Managed Stream URL Link",
        comments: [],
        createdAt: Date.now(),
      });
      pushNotification(`Added video link: "${videoTitle}"`, userProfile.name);
      setVideoTitle(''); setVideoUrlInput(''); setShowUploadModal(false);
      showToast('Video link registered successfully!', 'success');
    } catch (err) { showToast('Upload authorization failure.', 'warning'); }
  };

  const removeVideo = async (id) => {
    if (!db || !db.app) return;
    await deleteDoc(doc(db, 'videos', id));
    setActiveVideo(null);
    showToast('Video removed from Vault.', 'info');
  };

  const handlePostVideoComment = async (e, videoId) => {
    e.preventDefault();
    if (!db || !db.app) return;
    const commentText = e.target.commentInput.value.trim();
    if (!commentText) return;
    const newComment = { id: 'c_' + Date.now(), authorUid: userProfile.id, authorName: userProfile.name, text: commentText, timestamp: Date.now() };
    await updateDoc(doc(db, 'videos', videoId), { comments: arrayUnion(newComment) });
    await addDoc(fbCollection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { 
  message: `${userProfile.name} commented on video: "${activeVideo.title}"`, 
  actor: userProfile.name, 
  timestamp: Date.now(), 
  audience: "admin" 
});

    e.target.commentInput.value = '';
    const freshDoc = await getDoc(doc(db, 'videos', videoId));
    if (freshDoc.exists()) setActiveVideo({ id: freshDoc.id, ...freshDoc.data() });
    showToast('Feedback published!', 'success');
  };

  const deleteVideoComment = async (videoId, currentComments, commentId) => {
    if (!db || !db.app) return;
    const updatedComments = currentComments.filter(c => c.id !== commentId);
    await updateDoc(doc(db, 'videos', videoId), { comments: updatedComments });
    const freshDoc = await getDoc(doc(db, 'videos', videoId));
    if (freshDoc.exists()) setActiveVideo({ id: freshDoc.id, ...freshDoc.data() });
    showToast('Comment deleted.', 'info');
  };

  if (activeVideo) {
    const embed = resolvePlayableVideo(activeVideo.hlsUrl);
    const timeLeft = getExpiry7(activeVideo.createdAt);
    
    return (
      <section className="bg-white min-h-[85vh] sm:rounded-2xl border-t border-[#EADFC9] sm:border shadow-sm flex flex-col font-sans animate-fadeIn relative z-30">
        <div className="p-3 border-b border-[#EADFC9]/50 flex items-center gap-3">
          <button onClick={() => setActiveVideo(null)} className="p-2 hover:bg-slate-100 rounded-full transition"><svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <span className="font-serif font-bold text-slate-800">Return to Vault</span>
        </div>

                {/* NEW: Dynamic Context Control Bar for External Links */}
        {embed.type === 'iframe-stream' && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-[#EADFC9]/60 flex items-center justify-between text-xs gap-2">
            <span className="text-amber-800 font-semibold font-sans">🔄 External Stream Grid Layout Optimization</span>
            <button 
              type="button"
              onClick={() => {
                const wrapper = document.getElementById('iframe-aspect-container');
                if (wrapper) {
                  if (wrapper.classList.contains('aspect-video')) {
                    wrapper.classList.remove('aspect-video', 'max-h-[75vh]');
                    wrapper.classList.add('aspect-[9/16]', 'max-w-sm', 'mx-auto');
                  } else {
                    wrapper.classList.remove('aspect-[9/16]', 'max-w-sm', 'mx-auto');
                    wrapper.classList.add('aspect-video', 'max-h-[75vh]');
                  }
                }
              }}
              className="bg-[#C5A03A] text-white font-bold px-3 py-1 rounded-md text-[10px] uppercase tracking-wide transition shadow active:translate-y-0.5"
            >
              📐 Switch Layout (Vertical / Widescreen)
            </button>
          </div>
        )}

        <div className="w-full bg-slate-50 shadow-md relative rounded-t-xl overflow-hidden p-2 sm:p-4">
          {embed.type === 'youtube' ? (
             <div className="w-full relative aspect-video max-h-[75vh]">
               <iframe src={embed.src} className="absolute top-0 left-0 w-full h-full border-none rounded-xl shadow-inner" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
             </div>
          ) : embed.type === 'direct' ? (
             <CustomVideoPlayer hlsUrl={embed.src} videoTitle={activeVideo.title} />
          ) : embed.type === 'iframe-stream' ? (
             <div id="iframe-aspect-container" className="w-full relative aspect-video max-h-[75vh] transition-all duration-300">
               <iframe src={embed.src} className="absolute top-0 left-0 w-full h-full border-none rounded-xl shadow-inner bg-black" allow="autoplay; encrypted-media" allowFullScreen />
             </div>
          ) : (
             <CustomVideoPlayer hlsUrl={activeVideo.hlsUrl} videoTitle={activeVideo.title} />
          )}
        </div>

        <div className="p-5 border-b border-slate-100">
          <h1 className="text-xl font-black text-slate-900 leading-tight mb-2 font-serif">{activeVideo.title}</h1>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-mono">{new Date(activeVideo.createdAt).toLocaleDateString()}</span>
            <span className="bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1 shadow-sm">⏳ {timeLeft}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="w-10 h-10 rounded-full overflow-hidden border p-0.5 bg-slate-50 shrink-0 shadow-sm">{renderAvatar(activeVideo.uploaderAvatar || PRESET_AVATARS[0].svg, "w-full h-full object-cover rounded-full", () => onInspectUser(activeVideo.uploaderUid))}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-sm hover:text-[#C5A03A] cursor-pointer" onClick={() => onInspectUser(activeVideo.uploaderUid)}>{activeVideo.uploaderName}</h4>
              <p className="text-[10px] text-slate-400 font-mono">{activeVideo.size}</p>
            </div>
            {(isAdmin || activeVideo.uploaderUid === userProfile?.id) && (
              <button onClick={() => removeVideo(activeVideo.id)} className="bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-rose-100 transition shadow-sm">🗑️ Delete Record</button>
            )}
          </div>
        </div>

        <div className="p-5 flex-1 bg-slate-50/50 rounded-b-2xl">
          <h3 className="font-black text-sm text-slate-800 mb-4 uppercase tracking-wider">Feedback Notes ({activeVideo.comments?.length || 0})</h3>
          <form onSubmit={(e) => handlePostVideoComment(e, activeVideo.id)} className="flex gap-2 mb-6">
            <div className="w-9 h-9 rounded-full overflow-hidden border p-0.5 bg-white shrink-0 hidden sm:block shadow-sm">{renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}</div>
            <input type="text" name="commentInput" placeholder="Add a feedback note..." className="flex-1 px-4 py-2 bg-white border border border-[#EADFC9] shadow-inner rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" required />
            <button type="submit" className="bg-[#C5A03A] hover:bg-[#b08d32] text-white text-xs px-5 rounded-xl font-bold transition shadow-md border-b-[3px] border-[#9c7d2c] active:border-b-0 active:translate-y-[2px]">Post</button>
          </form>

          <div className="space-y-3 pb-8">
            {(activeVideo.comments || []).map((comment) => (
              <div key={comment.id} className="text-xs flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm transition hover:shadow-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-slate-800 hover:text-[#C5A03A] cursor-pointer" onClick={() => onInspectUser(comment.authorUid)}>{comment.authorName}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <span className="text-slate-600 break-words leading-relaxed">{comment.text}</span>
                </div>
                {(isAdmin || comment.authorName === userProfile?.name) && (
                  <button onClick={() => deleteVideoComment(activeVideo.id, activeVideo.comments, comment.id)} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded p-1 text-sm leading-none shrink-0 transition">✕</button>
                )}
              </div>
            ))}
            {(!activeVideo.comments || activeVideo.comments.length === 0) && <div className="text-xs text-slate-400 text-center py-10 italic border-2 border-dashed border-[#EADFC9] rounded-xl bg-white/50">Be the first to leave a feedback note on this video.</div>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-2 space-y-6 font-sans animate-fadeIn px-4 sm:px-0">
      <div className="flex justify-between items-center bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl shadow-sm gap-4">
        <h2 className="font-serif text-lg font-bold text-slate-800">🎞️ Premium Video Vault Feed</h2>
        <button onClick={() => setShowUploadModal(true)} className="bg-red-600 text-white font-bold text-[10px] sm:text-xs px-4 py-2 rounded-full shadow hover:bg-red-700 transition font-sans whitespace-nowrap">➕ Link Dual Asset</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((vid) => {
  const embed = resolvePlayableVideo(vid.hlsUrl);
  const timeLeft = getExpiry7(vid.createdAt);
  
  // Create an automated dynamic thumbnail background preview matching asset attributes
  const templateBgStyle = vid.title.toLowerCase().includes('edit') 
    ? 'from-blue-900 via-indigo-950 to-slate-950' 
    : 'from-amber-900 via-zinc-900 to-stone-950';

  return (
    <div key={vid.id} onClick={() => setActiveVideo(vid)} className="bg-white border-b-[4px] border border-[#EADFC9] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group flex flex-col">
      <div className="w-full aspect-video bg-slate-900 relative flex items-center justify-center overflow-hidden">
        {embed.thumbnail ? (
          <img src={embed.thumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
        ) : (
          /* Enforce structural automated visible template block layout layout */
          <div className={`absolute inset-0 bg-gradient-to-br ${templateBgStyle} group-hover:scale-105 transition-transform duration-500 flex flex-col items-center justify-center p-4 text-center select-none border-b border-white/5`}>
            <span className="text-3xl mb-1.5 filter drop-shadow animate-pulse-slow">🎞️</span>
            <span className="text-xs font-serif font-black tracking-wide text-amber-400 uppercase line-clamp-2 px-2 max-w-full drop-shadow-md">{vid.title}</span>
            <div className="mt-2 flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-[8px] font-mono tracking-widest text-slate-300 font-bold uppercase">Ready to Stream</span>
            </div>
          </div>
        )}
        <div className="relative z-10 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:bg-[#C5A03A]/90 group-hover:scale-110 transition-all duration-300 shadow-lg"><div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div></div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] font-bold px-2 py-1 rounded backdrop-blur-md">⏳ {timeLeft}</div>
      </div>

              <div className="p-3 flex gap-3 bg-white flex-1">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-100 border border-slate-200 mt-0.5">{renderAvatar(vid.uploaderAvatar || PRESET_AVATARS[0].svg, "w-full h-full object-cover", (e) => { e.stopPropagation(); onInspectUser(vid.uploaderUid); })}</div>
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="font-sans font-bold text-slate-900 text-sm leading-tight line-clamp-2 group-hover:text-[#C5A03A] transition-colors">{vid.title}</h3>
                  <div className="text-slate-500 text-[10px] mt-1 font-sans truncate">{vid.uploaderName} • {vid.comments?.length || 0} Notes</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {videos.length === 0 && <div className="text-center text-slate-400 py-16 italic text-xs border-2 border-dashed border-[#EADFC9] rounded-2xl bg-white/50 shadow-sm">The Video Vault showcase is currently empty.</div>}

      {showUploadModal && (
        <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={startUpload} className="bg-white border-2 border-[#EADFC9] p-6 rounded-2xl w-full max-w-sm space-y-4 font-sans shadow-skeuo-lg animate-fadeIn">
            <div className="border-b pb-2 mb-2">
              <h4 className="font-serif font-black text-slate-800 text-base">Link External Video Asset</h4>
              <p className="text-[10px] text-slate-500 mt-1">Direct gallery uploads are rerouted. Paste a URL to Google Drive, Google Photos, YouTube, or direct MP4 streams to play live on screen.</p>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">Video Showcase Label</label>
              <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" placeholder="e.g. Director Cut Segment V2" required />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">External Asset URL</label>
              <input type="url" value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" placeholder="https://..." required />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-red-600 text-white font-bold text-xs rounded-xl border-b-[4px] border-red-800 hover:bg-red-500 active:border-b-0 active:translate-y-[4px] transition shadow">Track Asset Link</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// --- PROJECT BOARD ---
function ProjectBoard({ projects, tasks, userProfile, showToast, selectedProject, setSelectedProject, pushNotification, isAdmin }) {
  const [newConcept, setNewConcept] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  const createConcept = async (e) => {
    e.preventDefault();
    if (!newConcept.trim()) return;
    if (!db || !db.app) return;
    try {
      await addDoc(collection(db, 'projects'), { title: newConcept, creatorName: userProfile.name, createdAt: Date.now() });
      pushNotification(`Created whiteboard: "${newConcept}"`, userProfile.name);
      setNewConcept(''); showToast('Artboard concept mapped!', 'success');
    } catch(err) {}
  };

  const activeTasks = useMemo(() => (tasks || []).filter(t => t.projectId === selectedProject?.id), [tasks, selectedProject]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !db || !db.app) return;
    try {
      await addDoc(collection(db, 'tasks'), { projectId: selectedProject.id, title: taskTitle, status: 'To Do' });
      setTaskTitle('');
    } catch(err) {}
  };

  const removeProject = async (pId, e) => {
    if (e) e.stopPropagation(); 
    if (!db || !db.app) return;
    await deleteDoc(doc(db, 'projects', pId));
    if (selectedProject?.id === pId) setSelectedProject(null); 
    showToast('Project deleted', 'info');
  };

  const removeTask = async (tId) => { 
    if (!db || !db.app) return;
    await deleteDoc(doc(db, 'tasks', tId)); 
    showToast('Task card removed.', 'info');
  };

  const toggleTaskStatus = async (task) => {
    if (!db || !db.app) return;
    const nextStatus = task.status === 'To Do' ? 'Completed' : 'To Do';
    await updateDoc(doc(db, 'tasks', task.id), { status: nextStatus });
    showToast(`Task status updated to ${nextStatus}`, 'success');
  };

  return (
    <section className="py-2 animate-fadeIn font-sans">
      {!selectedProject ? (
        <div className="space-y-4 font-sans">
          <form onSubmit={createConcept} className="max-w-md mx-auto flex gap-2 bg-white border border-[#EADFC9] p-3 rounded-xl shadow-skeuo-sm">
            <input type="text" value={newConcept} onChange={e => setNewConcept(e.target.value)} placeholder="New whiteboard sprint..." className="flex-1 px-3 py-1 bg-slate-50 border rounded-lg text-xs focus:ring-1 focus:ring-[#C5A03A]" required />
            <button type="submit" className="px-4 bg-[#C5A03A] text-white text-[11px] rounded-lg font-bold border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] shadow">Pin Board</button>
          </form>
          
          <div className="p-6 border-[12px] border-[#8b5a2b]/25 shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)] rounded-[2rem] grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn" style={{ backgroundColor: '#deb887', backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            {projects.map((p) => (
              <div key={p.id} onClick={() => setSelectedProject(p)} className="bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl cursor-pointer shadow-skeuo-md hover:-translate-y-0.5 hover:shadow-skeuo-3d transition-all relative">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)] animate-bounce">📌</span>
                {isAdmin && <button onClick={(e) => removeProject(p.id, e)} className="absolute top-1.5 right-1.5 text-rose-500 font-bold bg-rose-50 border border-rose-150 rounded-full w-5 h-5 flex items-center justify-center text-[9px] hover:bg-rose-200 transition z-10">✕</button>}
                <div className="font-serif font-bold text-slate-800 pt-2 text-center line-clamp-2 text-xs">{p.title}</div>
                <div className="text-[9px] text-slate-400 text-center mt-2 font-mono">⏳ {getExpiry30(p.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md animate-fadeIn font-sans">
          <div className="flex justify-between items-center border-b pb-2">
            <button onClick={() => setSelectedProject(null)} className="text-[11px] font-bold text-[#C5A03A] hover:underline transition">◀ Back to Cork Board</button>
            {isAdmin && <button onClick={(e) => removeProject(selectedProject.id, e)} className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-bold hover:bg-rose-100 transition">🗑 Delete Entire Whiteboard</button>}
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-800">{selectedProject.title}</h3>
          <p className="text-[9px] text-rose-500 font-bold">⏳ {getExpiry30(selectedProject.createdAt)}</p>
          
          <div className="divide-y text-xs border-t mt-2">
            {activeTasks.map((t) => (
              <div key={t.id} className="py-2.5 flex justify-between items-center group">
                <span className="font-semibold text-slate-700">{t.title}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleTaskStatus(t)} className={`text-[9px] px-2 py-0.5 rounded-full font-bold shadow-inner ${t.status === 'To Do' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>{t.status}</button>
                  {isAdmin && <button onClick={() => removeTask(t.id)} className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1.5 border rounded" title="Delete Task card">✕</button>}
                </div>
              </div>
            ))}
          </div>
          
          <form onSubmit={addTask} className="flex gap-2 max-w-sm pt-3">
            <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Add specific work item..." className="flex-1 px-3 py-1.5 border border-[#EADFC9] rounded-xl text-xs" required />
            <button type="submit" className="px-3.5 bg-slate-800 text-white text-xs rounded-xl font-bold font-sans">Add Item</button>
          </form>
        </div>
      )}
    </section>
  );
}

// --- SCRIPTS WORKSPACE ---
function ScriptsWorkspace({ scripts, userProfile, isAdmin, showToast, pushNotification }) {
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);

  const selectedScript = useMemo(() => (scripts || []).find(s => s.id === selectedScriptId) || null, [scripts, selectedScriptId]);
  useEffect(() => { if (selectedScript) setDraftText(selectedScript.content || ''); }, [selectedScriptId, selectedScript?.content]);
  
  const canEditSelected = selectedScript && userProfile && (isAdmin || selectedScript.authorUid === userProfile.id);

  const createTopic = async (e) => {
    e.preventDefault();
    const clean = newTopicTitle.trim();
    if (!clean || !db || !db.app) return;
    try {
      const ref = await addDoc(collection(db, 'scripts'), { title: clean, content: '', authorUid: userProfile.id, authorName: userProfile.name, createdAt: Date.now(), updatedAt: Date.now() });
      pushNotification(`Started script: "${clean}"`, userProfile.name);
      setNewTopicTitle(''); setShowNewTopicModal(false); setSelectedScriptId(ref.id); showToast('Topic created!', 'success');
    } catch(err) {}
  };

  const saveScriptBody = async () => {
    if (!selectedScript || !canEditSelected || !db || !db.app) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'scripts', selectedScript.id), { content: draftText, updatedAt: Date.now(), lastEditedBy: userProfile.name });
      setIsEditingBody(false); showToast('Script saved!', 'success');
    } catch (err) { showToast('Save failed.', 'warning'); } finally { setSaving(false); }
  };

  const removeTopic = async (id, e) => {
    if (e) e.stopPropagation();
    if (!db || !db.app) return;
    await deleteDoc(doc(db, 'scripts', id));
    if (selectedScriptId === id) setSelectedScriptId(null);
    showToast('Script topic deleted.', 'info');
  };

  return (
    <section className="py-2 animate-fadeIn font-sans space-y-4">
      <div className="flex justify-between items-center bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl shadow-skeuo-md font-sans animate-fadeIn">
        <h3 className="font-serif font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">📝 Script Topics</h3>
        <button onClick={() => setShowNewTopicModal(true)} className="bg-[#C5A03A] text-white font-bold text-[10px] sm:text-xs px-4 py-1.5 rounded-full shadow hover:bg-[#b08d32] transition font-sans">+ New Topic</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        <div className="lg:col-span-1 bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-3 rounded-xl shadow-skeuo-md space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar animate-fadeIn">
          {scripts.map(s => (
            <div key={s.id} onClick={() => { setSelectedScriptId(s.id); setIsEditingBody(false); }} className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-start gap-2 ${selectedScriptId === s.id ? 'border-[#C5A03A] bg-amber-50/30' : 'border-slate-100 hover:border-[#C5A03A]/40'}`}>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
                <span className="text-[9px] text-slate-400 font-mono block">By {s.authorName} • ⏳ {getExpiry30(s.createdAt)}</span>
              </div>
              {(isAdmin || s.authorUid === userProfile?.id) && <button onClick={(e) => removeTopic(s.id, e)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-bold shrink-0 p-1 rounded transition">✕</button>}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md animate-fadeIn">
          {!selectedScript ? (
            <div className="text-center text-slate-400 py-20 italic text-xs">Select a topic on the left to read or write its script.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b pb-2">
                <div>
                  <h3 className="font-serif text-base font-bold text-slate-800">{selectedScript.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedScript.lastEditedBy && <p className="text-[8px] text-slate-400">Last updated by {selectedScript.lastEditedBy}</p>}
                    <span className="bg-rose-50 text-rose-600 text-[8px] px-1.5 py-0.5 rounded border border-rose-100 font-bold">⏳ {getExpiry30(selectedScript.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canEditSelected && !isEditingBody && <button onClick={() => setIsEditingBody(true)} className="text-[9px] font-bold text-[#C5A03A] bg-amber-50 border border-[#C5A03A]/30 rounded-lg px-2.5 py-1.5">✎ Edit Script</button>}
                  {isAdmin && <button onClick={(e) => removeTopic(selectedScript.id, e)} className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 hover:bg-rose-100">🗑 Delete</button>}
                </div>
              </div>
              
              {isEditingBody ? (
                <div className="space-y-3">
                  <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={12} placeholder="Write the script here..." className="w-full px-4 py-2.5 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none font-sans leading-relaxed" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setIsEditingBody(false); setDraftText(selectedScript.content || ''); }} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">Cancel</button>
                    <button onClick={saveScriptBody} disabled={saving} className="px-4 py-1.5 bg-[#C5A03A] text-white font-bold text-xs rounded-xl border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[1px] disabled:opacity-50">{saving ? 'Saving…' : 'Save Script'}</button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-xs text-slate-700 leading-relaxed min-h-[150px] font-sans">
                  {selectedScript.content ? selectedScript.content : <span className="italic text-slate-400">No script written yet.</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showNewTopicModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={createTopic} className="bg-white border-2 border-[#EADFC9] p-5 rounded-xl w-full max-w-sm space-y-4 font-sans shadow-skeuo-lg animate-fadeIn">
            <h4 className="font-serif font-bold text-slate-800 text-xs">New Script Topic</h4>
            <input type="text" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} placeholder="e.g. Episode 12 Intro Hook" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs mt-1 font-sans" required />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewTopicModal(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-[#C5A03A] text-white font-bold text-xs rounded-xl border-b-[4px] border-[#ab892c]">Create Topic</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// --- CHATROOM ---
function WhiteboardChat({ chats, userProfile, chatChannel, setChatChannel, pushNotification, siteSettings, isAdmin, showToast, onInspectUser }) {
  const [inputText, setInputText] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [activeMessageMenu, setActiveMessageMenu] = useState(null); 
  const [editingMessageText, setEditingMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);

  const longPressTimerRef = useRef(null);
  const channels = siteSettings.chatChannels || [{id: 'general', name: '🌍 Studio Room'}];

  const commit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !db || !db.app) return;
    const text = inputText;
    try {
      await addDoc(collection(db, 'chats'), {
        projectId: chatChannel, text, senderName: userProfile?.name || 'Guest Creator', senderUid: userProfile?.id || 'guest-uid', createdAt: Date.now(),
      });
      pushNotification(`"${text.length > 50 ? text.slice(0, 50) + '…' : text}"`, userProfile?.name || 'Guest Creator', 'all');
      setInputText('');
    } catch(err) {}
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if(!newChannelName.trim() || !db || !db.app) return;
    try {
      await setDoc(doc(db, 'meta/settings'), { chatChannels: [...channels, {id: 'ch_' + Date.now(), name: newChannelName.trim()}] }, {merge: true});
      setNewChannelName(''); showToast("Whiteboard channel added!", "success");
    } catch(err) {}
  };

  const removeChannel = async (id, e) => {
    e.stopPropagation();
    if (!db || !db.app) return;
    try {
      await setDoc(doc(db, 'meta/settings'), { chatChannels: channels.filter(c => c.id !== id) }, {merge: true});
      if(chatChannel === id) setChatChannel('general');
      showToast("Channel removed!", "info");
    } catch(err) {}
  };

  const deleteMessage = async (msgId) => { 
    if (!db || !db.app) return;
    await deleteDoc(doc(db, 'chats', msgId)); 
    setActiveMessageMenu(null);
    showToast("Message deleted.", "info");
  };

  const saveEditedMessage = async () => {
    if (!editingMessageText.trim() || !editingMessageId || !db || !db.app) return;
    try {
      await updateDoc(doc(db, 'chats', editingMessageId), { text: editingMessageText.trim() });
      setEditingMessageId(null); setEditingMessageText(''); setActiveMessageMenu(null); showToast("Commentary updated!", "success");
    } catch (e) { showToast("Access restricted.", "warning"); }
  };

  const copyMessageText = (txt) => {
    try {
      const container = document.createElement('textarea');
      container.value = txt; container.style.position = 'fixed'; document.body.appendChild(container); container.select(); document.execCommand('copy'); document.body.removeChild(container);
      showToast("Text copied to clipboard!", "success");
    } catch (e) { showToast("Unable to access clipboard.", "warning"); }
    setActiveMessageMenu(null);
  };

  const handleTouchStart = (msg) => { longPressTimerRef.current = setTimeout(() => { setActiveMessageMenu(msg); }, 500); };
  const handleTouchEnd = () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };

  return (
    <section className="flex flex-col sm:grid sm:grid-cols-4 border-2 border-[#EADFC9] rounded-2xl h-[70vh] sm:h-[450px] bg-white overflow-hidden shadow-skeuo-md animate-fadeIn font-sans">
      <div className="sm:col-span-1 bg-[#FFFDF9] p-2.5 border-b sm:border-b-0 sm:border-r text-xs border-[#EADFC9]/50 flex flex-col min-h-0 shrink-0">
        <div className="overflow-x-auto sm:overflow-y-auto custom-scrollbar flex sm:block whitespace-nowrap sm:whitespace-normal gap-1.5 sm:gap-2 flex-1">
          {channels.map(ch => (
            <div key={ch.id} className="relative group inline-block sm:block w-auto sm:w-full">
              <button onClick={() => setChatChannel(ch.id)} className={`w-full text-left px-3 sm:px-2.5 py-2 rounded-xl text-[11px] font-bold transition border sm:border-0 ${chatChannel === ch.id ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'border-slate-100 hover:bg-slate-50'}`}>{ch.name}</button>
              {isAdmin && ch.id !== 'general' && <button onClick={(e) => removeChannel(ch.id, e)} className="absolute right-1 top-1/2 -translate-y-1/2 sm:opacity-0 sm:group-hover:opacity-100 text-rose-500 font-bold bg-white rounded-full px-1 py-0.5 border shadow-sm text-[8px]">✕</button>}
            </div>
          ))}
        </div>
        {isAdmin && (
          <form onSubmit={handleAddChannel} className="mt-2 pt-2 border-t border-[#EADFC9]/50 flex gap-1.5 sm:mt-auto shrink-0">
            <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="New Channel" className="flex-1 px-2 py-1 border rounded-lg text-[10px]" required />
            <button type="submit" className="bg-slate-800 text-white px-2 py-1 rounded-lg font-bold text-xs">+</button>
          </form>
        )}
      </div>
      
      <div className="sm:col-span-3 flex flex-col h-full bg-slate-50/20 font-sans min-h-0 flex-1 relative">
        <div className="p-3.5 overflow-y-auto space-y-2.5 custom-scrollbar flex-1 font-sans min-h-0 select-none">
          {chats.filter(c => c.projectId === chatChannel).slice().reverse().map((m) => (
            <div key={m.id} onMouseDown={() => handleTouchStart(m)} onMouseUp={handleTouchEnd} onTouchStart={() => handleTouchStart(m)} onTouchEnd={handleTouchEnd} onContextMenu={(e) => { e.preventDefault(); setActiveMessageMenu(m); }} className={`text-xs p-3 border border-[#EADFC9]/40 rounded-2xl max-w-[85%] sm:max-w-[75%] animate-fadeIn shadow-xs font-sans relative cursor-pointer select-none transition-transform active:scale-[0.98] ${m.senderUid === userProfile?.id ? 'bg-[#C5A03A]/5 ml-auto border-[#C5A03A]/20' : 'bg-white'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] text-[#C5A03A] font-bold block hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); onInspectUser(m.senderUid); }}>{m.senderName}</span>
                <span className="text-[8px] text-slate-300 font-mono">⏳ {getExpiry7(m.createdAt)}</span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed font-sans break-words">{m.text}</p>
            </div>
          ))}
          {chats.filter(c => c.projectId === chatChannel).length === 0 && <p className="text-slate-400 text-xs text-center py-6">Hold/Right-Click any sent commentary to Edit, Copy, or delete.</p>}
        </div>
        <form onSubmit={commit} className="p-2.5 border-t flex gap-2 bg-white font-sans shrink-0">
          <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type commentary..." className="flex-1 px-3 py-1.5 border rounded-xl text-xs focus:outline-none" />
          <button type="submit" className="px-4 py-1.5 bg-[#C5A03A] text-white text-xs rounded-xl font-bold border-b-[4px] border-[#ab892c]">Send</button>
        </form>

        {activeMessageMenu && (
          <div className="absolute inset-0 z-50 bg-black/35 flex items-center justify-center p-4 animate-fadeIn" onClick={() => { setActiveMessageMenu(null); setEditingMessageId(null); }}>
            <div className="w-full max-w-xs bg-white border-2 border-[#EADFC9] rounded-[1.5rem] p-4 shadow-skeuo-lg text-slate-800 space-y-2 text-center" onClick={(e) => e.stopPropagation()}>
              <h5 className="font-serif font-bold text-xs text-slate-400 pb-1.5 border-b uppercase">Message Options</h5>
              {editingMessageId !== activeMessageMenu.id ? (
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => copyMessageText(activeMessageMenu.text)} className="w-full py-2 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs">📋 Copy Commentary</button>
                  <button onClick={(e) => { e.stopPropagation(); onInspectUser(activeMessageMenu.senderUid); setActiveMessageMenu(null); }} className="w-full py-2 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs">👤 Inspect Sender Profile</button>
                  {(isAdmin || activeMessageMenu.senderUid === userProfile?.id) && (
                    <>
                      <button onClick={() => { setEditingMessageId(activeMessageMenu.id); setEditingMessageText(activeMessageMenu.text); }} className="w-full py-2 hover:bg-amber-50 text-amber-600 font-bold rounded-xl text-xs">✎ Edit Message</button>
                      <button onClick={() => deleteMessage(activeMessageMenu.id)} className="w-full py-2 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-xs">🗑 Un-send / Delete</button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <textarea value={editingMessageText} onChange={e => setEditingMessageText(e.target.value)} className="w-full p-2 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" rows={3} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditingMessageId(null); setActiveMessageMenu(null); }} className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px]">Cancel</button>
                    <button onClick={saveEditedMessage} className="px-3 py-1 bg-[#C5A03A] text-white rounded-lg text-[10px] font-bold">Save</button>
                  </div>
                </div>
              )}
              <button onClick={() => { setActiveMessageMenu(null); setEditingMessageId(null); }} className="w-full text-slate-400 text-[10px] font-bold pt-1.5 border-t">Close Panel</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// --- INSTA FEED ---
function PostsWorkspace({ posts, userProfile, showToast, pushNotification, isAdmin, onInspectUser }) {
  const [postTitle, setPostTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [showCreateModal, setShowCreatePostModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef(null);
  
  const [expandedPost, setExpandedPost] = useState(null);

  const publishPost = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!postTitle.trim() || !file || !db || !db.app) return;
    setPublishing(true);
    try {
      const compressedString = await compressAndConvertImage(file, 500);
      await addDoc(collection(db, 'posts'), {
        title: postTitle.trim(), description: postText.trim(), image: compressedString,
        authorName: userProfile.name, authorAvatar: userProfile.photoURL, authorUid: userProfile.id,
        likes: 0, likedBy: [], comments: [], createdAt: Date.now(),
      });
      pushNotification(`Shared showroom post: "${postTitle}"`, userProfile.name);
      setPostTitle(''); setPostText(''); setShowCreatePostModal(false); showToast('Showcase uploaded to feed!', 'success');
    } catch (err) { showToast('Upload failed — check size.', 'warning'); } finally { setPublishing(false); }
  };

  const toggleLikePost = async (post) => {
    if (!db || !db.app) return;
    const hasLiked = post.likedBy?.includes(userProfile.id);
    const newLikedBy = hasLiked ? post.likedBy.filter(u => u !== userProfile.id) : [...(post.likedBy || []), userProfile.id];
    await updateDoc(doc(db, 'posts', post.id), { likedBy: newLikedBy, likes: newLikedBy.length });
    if (expandedPost?.id === post.id) { setExpandedPost({ ...expandedPost, likedBy: newLikedBy, likes: newLikedBy.length }); }
  };

const handleAddPostComment = async (e, postId) => {
    e.preventDefault();
    if (!db || !db.app) return;
    const commentVal = e.target.commentInputText.value.trim();
    if (!commentVal) return;
    const newComment = { id: 'pc_' + Date.now(), authorUid: userProfile.id, authorName: userProfile.name, text: commentVal, timestamp: Date.now() };
    await updateDoc(doc(db, 'posts', postId), { comments: arrayUnion(newComment) });
       await addDoc(fbCollection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { 
      message: `${userProfile?.name || 'Someone'} commented on Instagram draft post! 📸`, 
      actor: userProfile?.name || 'System', 
      timestamp: Date.now(), 
      audience: "admin" 
    });

    e.target.commentInputText.value = ''; showToast('Comment published!', 'success');
    if (expandedPost?.id === postId) { setExpandedPost({ ...expandedPost, comments: [...(expandedPost.comments || []), newComment] }); }
  };

  const removePost = async (postId) => { 
    if (!db || !db.app) return;
    await deleteDoc(doc(db, 'posts', postId)); 
    if (expandedPost?.id === postId) setExpandedPost(null);
    showToast("Post removed from feed.", "info"); 
  };

  const removePostComment = async (postId, postComments, commentId) => {
    if (!db || !db.app) return;
    const updatedComments = postComments.filter(x => x.id !== commentId);
    await updateDoc(doc(db, 'posts', postId), { comments: updatedComments });
    if (expandedPost?.id === postId) { setExpandedPost({ ...expandedPost, comments: updatedComments }); }
    showToast("Comment removed.", "info");
  };

  if (expandedPost) {
    return (
      <section className="bg-white min-h-[85vh] sm:rounded-2xl border-t border-[#EADFC9] sm:border shadow-sm flex flex-col font-sans animate-fadeIn relative z-30">
        <div className="p-3 border-b border-[#EADFC9]/50 flex items-center gap-3 shrink-0">
          <button onClick={() => setExpandedPost(null)} className="p-2 hover:bg-slate-100 rounded-full transition"><svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <span className="font-serif font-bold text-slate-800">Return to Feed</span>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-slate-50">
          <div className="md:w-3/5 bg-slate-900 flex items-center justify-center p-4">
            <img src={expandedPost.image} alt={expandedPost.title} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl" />
          </div>

          <div className="md:w-2/5 flex flex-col bg-white border-l border-slate-200 shrink-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border p-0.5">{renderAvatar(expandedPost.authorAvatar, "w-full h-full object-cover rounded-full", () => { setExpandedPost(null); onInspectUser(expandedPost.authorUid); })}</div>
                <div>
                  <p className="font-bold text-sm text-slate-800 cursor-pointer hover:underline" onClick={() => { setExpandedPost(null); onInspectUser(expandedPost.authorUid); }}>{expandedPost.authorName}</p>
                  <p className="text-[10px] text-slate-400">{new Date(expandedPost.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {isAdmin && <button onClick={() => { removePost(expandedPost.id); setExpandedPost(null); }} className="text-rose-500 hover:bg-rose-50 px-2 py-1 rounded text-xs font-bold transition border border-rose-100">Delete</button>}
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 mb-2 font-serif">{expandedPost.title}</h3>
              {expandedPost.description && <p className="text-sm text-slate-600 mb-6 whitespace-pre-wrap">{expandedPost.description}</p>}
              
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Discussion</h4>
                {(expandedPost.comments || []).map((c, i) => (
                  <div key={i} className="flex justify-between items-start group text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col gap-1 min-w-0 pr-2">
                      <span className="font-bold text-slate-800 cursor-pointer hover:underline text-xs" onClick={() => { setExpandedPost(null); onInspectUser(c.authorUid); }}>{c.authorName}</span>
                      <span className="text-slate-600 leading-relaxed text-xs">{c.text}</span>
                    </div>
                    {(isAdmin || c.authorName === userProfile.name) && <button onClick={() => removePostComment(expandedPost.id, expandedPost.comments, c.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded font-bold text-[10px]">✕</button>}
                  </div>
                ))}
                {(!expandedPost.comments || expandedPost.comments.length === 0) && <p className="text-xs text-slate-400 text-center py-4">No comments yet.</p>}
              </div>
            </div>

            <div className="p-4 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => toggleLikePost(expandedPost)} className="text-2xl transition-transform active:scale-125">{expandedPost.likedBy?.includes(userProfile?.id) ? '❤️' : '🤍'}</button>
                <span className="font-bold text-sm text-slate-800">{expandedPost.likes || 0} likes</span>
              </div>
              <form onSubmit={(e) => handleAddPostComment(e, expandedPost.id)} className="flex gap-2">
                <div className="w-8 h-8 rounded-full border p-0.5 bg-white hidden sm:block shrink-0">{renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}</div>
                <input name="commentInputText" type="text" placeholder="Add a comment..." className="flex-1 px-3 py-2 bg-white border border-[#EADFC9] shadow-inner rounded-xl text-xs focus:outline-none focus:border-[#C5A03A]" required />
                <button type="submit" className="bg-[#C5A03A] text-white rounded-xl font-bold px-4 text-xs shadow-sm">Post</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-2 animate-fadeIn space-y-6 font-sans">
      <div className="flex justify-between items-center bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl shadow-sm gap-4">
        <h2 className="font-serif text-lg font-bold text-slate-800">📸 Insta Showroom Feed</h2>
        <button onClick={() => setShowCreatePostModal(true)} className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold text-[10px] sm:text-xs px-4 py-2 rounded-full border-b-[3px] border-amber-700 active:translate-y-[1px] active:border-b-0 shadow transition-all font-sans whitespace-nowrap">➕ Create Post</button>
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 max-w-7xl mx-auto animate-fadeIn space-y-6">
        {posts.map(post => {
          const amLiked = post.likedBy?.includes(userProfile?.id);
          return (
            <div key={post.id} className="break-inside-avoid bg-white border-2 border-[#EADFC9] rounded-2xl overflow-hidden shadow-skeuo-md animate-fadeIn mb-6">
              <div className="p-3.5 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-slate-50 shrink-0">{renderAvatar(post.authorAvatar, "w-full h-full object-cover", () => onInspectUser(post.authorUid))}</div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 truncate hover:text-[#C5A03A] cursor-pointer" onClick={() => onInspectUser(post.authorUid)}>{post.authorName}</h4>
                    <span className="text-[8px] text-slate-400 font-mono block">{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {isAdmin && <button onClick={() => removePost(post.id)} className="text-rose-500 hover:text-rose-700 text-[10px] font-bold bg-rose-50 border rounded px-2.5 py-1">Delete</button>}
              </div>
              
              <div className="w-full bg-slate-100 relative cursor-pointer group" onClick={() => setExpandedPost(post)}>
                <img src={post.image} alt={post.title} className="w-full h-auto object-contain animate-fadeIn" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"><span className="bg-white/90 text-slate-900 font-bold px-4 py-2 rounded-full text-xs shadow-lg">View Full Thread</span></div>
              </div>
              
              <div className="p-3.5 space-y-2.5 border-t border-slate-50 font-sans">
                <div className="flex items-center justify-between font-sans">
                  <div className="flex items-center space-x-2 font-sans">
                    <button onClick={() => toggleLikePost(post)} className="text-lg transition-transform active:scale-150">{amLiked ? '❤️' : '🤍'}</button>
                    <span className="text-xs font-bold text-slate-800">{post.likes || 0} likes</span>
                  </div>
                  <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-1 rounded">⏳ {getExpiry7(post.createdAt)}</span>
                </div>
                
                <div className="text-xs">
                  <span className="font-bold text-slate-800 mr-2 hover:underline cursor-pointer" onClick={() => onInspectUser(post.authorUid)}>{post.authorName}</span>
                  <span className="font-semibold text-slate-700">{post.title}</span>
                  {post.description && <p className="text-slate-500 mt-1 leading-relaxed font-sans line-clamp-2">{post.description}</p>}
                </div>
                
                <div className="pt-2 border-t border-[#EADFC9]/20 space-y-1">
                  {(post.comments || []).slice(0, 2).map((c, i) => (
                    <div key={i} className="text-[11px] leading-normal animate-fadeIn font-sans flex justify-between group py-0.5">
                      <div className="min-w-0 pr-2 truncate"><span className="font-bold text-slate-800 mr-1.5 hover:underline cursor-pointer" onClick={() => onInspectUser(c.authorUid)}>{c.authorName}</span><span className="text-slate-600">{c.text}</span></div>
                    </div>
                  ))}
                  {post.comments && post.comments.length > 2 && <p className="text-[10px] text-slate-400 cursor-pointer hover:underline" onClick={() => setExpandedPost(post)}>View all {post.comments.length} comments...</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <form onSubmit={publishPost} className="bg-white border-2 border-[#EADFC9] p-5 rounded-xl w-full max-w-sm space-y-3 font-sans shadow-skeuo-lg animate-fadeIn">
            <h4 className="font-serif font-bold text-slate-800 text-xs sm:text-sm">Create Showroom Post</h4>
            <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 border rounded-xl focus:outline-none text-xs font-sans" required />
            <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Context description..." className="w-full px-3 py-2 border rounded-xl focus:outline-none text-xs font-sans" rows="2" />
            <input type="file" ref={fileInputRef} accept="image/*" className="w-full text-xs text-slate-500 font-sans" required />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreatePostModal(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs">Cancel</button>
              <button type="submit" disabled={publishing} className="px-4 py-1.5 bg-[#C5A03A] text-white font-bold text-xs rounded-xl border-b-[4px] border-[#ab892c] disabled:opacity-50">{publishing ? 'Publishing…' : 'Share Post'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// --- MY PROFILE ---
function MyProfileWorkspace({ userProfile, categories, showToast, handleSignOut, isOnboarding, onNavigate }) {
  const [fullName, setFullName] = useState(userProfile?.name || '');
  const [selectedCat, setSelectedCat] = useState(userProfile?.workCategory || categories[0] || 'Editing');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(userProfile?.photoURL || '');
  const [bioInput, setBioInput] = useState(userProfile?.bio || '');
  const [newCatInp, setNewCatInp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name || ''); setSelectedCat(userProfile.workCategory || categories[0] || 'Editing'); 
      setUploadedPhotoUrl(userProfile.photoURL || ''); setBioInput(userProfile.bio || '');
    }
  }, [userProfile, categories]);

  const saveProfileSettings = async (e) => {
    e.preventDefault(); 
    if (!fullName.trim() || !db || !db.app) return; 
    setSaving(true);
    try {
      await updateDoc(doc(db, 'profiles', userProfile.id), { 
        name: fullName.trim(), workCategory: selectedCat, 
        photoURL: uploadedPhotoUrl, bio: bioInput.trim(), isProfileComplete: true 
      });
      showToast('Profile credentials mapped successfully!', 'success');
      
      if (userProfile.status === 'pending') { onNavigate('pending-status'); } else { onNavigate('home'); }
    } catch (err) { showToast('Save failed.', 'warning'); } finally { setSaving(false); }
  };

  const handleRegisterCategory = async (e) => {
    e.preventDefault(); 
    const refined = newCatInp.trim(); 
    if (!refined || !db || !db.app) return;
    if (categories.some(c => c.toLowerCase() === refined.toLowerCase())) { showToast('Category tag already exists.', 'warning'); return; }
    await setDoc(doc(db, 'meta/categories'), { list: arrayUnion(refined) }, { merge: true });
    setSelectedCat(refined); setNewCatInp(''); showToast('Category registered!', 'success');
  };

  return (
    <section className="max-w-xl mx-auto bg-white border border-[#EADFC9] rounded-[2rem] p-6 shadow-lg relative animate-fadeIn font-sans">
      <WatercolorOverlay />
      <div className="text-center mb-4">
        <h2 className="font-serif text-2xl font-bold text-slate-800">{isOnboarding ? "Complete Onboarding Setup 🚀" : "Profile Details"}</h2>
        {isOnboarding && <p className="text-xs text-rose-500 font-bold mt-1">Provide your name, specialized skills, and an intro bio to access the main board.</p>}
      </div>
      <div className="flex flex-col items-center mb-5 font-sans">
        <div className="w-20 h-20 rounded-full border-4 border-[#C5A03A]/20 bg-white overflow-hidden shadow-md flex items-center justify-center mb-1 font-sans">
          {renderAvatar(uploadedPhotoUrl, "w-full h-full object-cover rounded-full")}
        </div>
      </div>
      <form onSubmit={saveProfileSettings} className="space-y-4 font-sans animate-fadeIn">
        <div>
          <label className="block text-[9px] font-bold text-slate-500 uppercase">Display Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none" required />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase font-sans">Role Specialization</label>
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none">
              {categories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase font-sans">Upload New PFP</label>
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                try {
                  const b64 = await compressAndConvertImage(file, 150);
                  setUploadedPhotoUrl(b64);
                } catch (err) { showToast('Image compression failed.', 'warning'); }
              }
            }} className="w-full text-[10px] text-slate-500 mt-1 file:py-1.5 file:px-2.5 file:border file:rounded-lg file:bg-amber-50" />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-slate-500 uppercase">Creator Bio (Intro / Specialization Notes)</label>
          <textarea value={bioInput} onChange={e => setBioInput(e.target.value)} placeholder="Tell other crew members about your editing specializations, creativity styles, etc..." className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none font-sans leading-relaxed" rows={3} maxLength={250} />
          <p className="text-[9px] text-right text-slate-400 mt-0.5">{bioInput.length}/250 characters</p>
        </div>

        <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] text-white text-xs font-bold uppercase rounded-xl tracking-wider hover:bg-[#ae8b30] shadow transition disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Details & Launch Studio'}
        </button>
      </form>
      
      {!isOnboarding && (
        <div className="border-t border-[#EADFC9]/50 mt-5 pt-5 font-sans">
          <h4 className="font-serif text-xs font-bold text-slate-800 mb-1.5">Register Custom Specialization Tag</h4>
          <form onSubmit={handleRegisterCategory} className="flex gap-2 font-sans">
            <input type="text" value={newCatInp} onChange={(e) => setNewCatInp(e.target.value)} placeholder="e.g. 3D Animator" className="flex-1 px-3 py-1.5 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:outline-none" required />
            <button type="submit" className="px-3.5 py-1.5 bg-slate-800 text-white text-xs rounded-xl font-bold font-sans">Add Tag</button>
          </form>
        </div>
      )}

      <div className="border-t border-[#EADFC9]/50 mt-5 pt-5 text-center">
        <button onClick={handleSignOut} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition bg-rose-50 hover:bg-rose-100 px-5 py-2 rounded-full border border-rose-200">🚪 Sign Out</button>
      </div>
    </section>
  );
}

// --- ADMIN PANEL ---
function AdminPanel({ profiles, siteSettings, ytConfig, syncYouTubeStats, userProfile, showToast }) {
  const [logoTxt, setLogoTxt] = useState(siteSettings.logoText || '');
  const [channelIdInput, setChannelIdInput] = useState(ytConfig.channelId || '');
  const [apiKeyInput, setApiKeyInput] = useState(ytConfig.apiKey || '');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editedFile, setEditedFile] = useState(null);

  useEffect(() => { if (siteSettings?.logoText) setLogoTxt(siteSettings.logoText); }, [siteSettings]);
  useEffect(() => { setChannelIdInput(ytConfig.channelId || ''); setApiKeyInput(ytConfig.apiKey || ''); }, [ytConfig.channelId, ytConfig.apiKey]);

  const pendingCount = profiles.filter(p => p.status === 'pending').length;

  const handleYtSave = async (e) => {
    e.preventDefault();
    if (!db || !db.app) return;
    await setDoc(doc(db, 'meta/ytConfig'), { channelId: channelIdInput, apiKey: apiKeyInput }, { merge: true });
    showToast('YouTube configurations saved!', 'success');
    syncYouTubeStats(channelIdInput, apiKeyInput);
  };

  const saveMemberPhotoOverride = async (userId) => {
    if (!editedFile || !db || !db.app) return;
    try {
      const compressedBase64 = await compressAndConvertImage(editedFile, 150);
      await updateDoc(doc(db, 'profiles', userId), { photoURL: compressedBase64 });
      setEditingUserId(null); setEditedFile(null); showToast("PFP modified successfully!", 'success');
    } catch (err) { showToast("Photo compression override failed.", "warning"); }
  };

  const triggerSiteLogoUpload = async (e) => {
    const file = e.target.files[0]; 
    if (!file || !db || !db.app) return;
    try {
      const compressedBase64 = await compressAndConvertImage(file, 200);
      await setDoc(doc(db, 'meta/settings'), { logoUrl: compressedBase64 }, { merge: true }); 
      showToast('Branding updated successfully!', 'success');
    } catch (err) { showToast('Logo processing failed.', 'warning'); }
  };

  const saveLogoText = async () => {
    if (!db || !db.app) return;
    try { await setDoc(doc(db, 'meta/settings'), { logoText: logoTxt }, { merge: true }); showToast('Logo text saved!', 'success'); } catch (err) { showToast('Error saving logo text.', 'warning'); }
  };

  const approve = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { status: 'approved' }); };
  const promote = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'admin' }); };
  const makeWaiter = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'roasting waiter' }); };
  const demote = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'member' }); };
  const remove = (uid) => { if (db && db.app) deleteDoc(doc(db, 'profiles', uid)); };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-sans">
      <div className="col-span-1 space-y-6">
        <div className="bg-white border-2 border-[#EADFC9] p-4 rounded-xl shadow-skeuo-md space-y-4 font-sans">
          <h3 className="font-serif font-bold border-b pb-1.5 text-slate-800 text-sm">Studio Branding</h3>
          <div><label className="block text-[9px] font-bold text-slate-400 uppercase">Logo Brand Text</label><input type="text" value={logoTxt} onChange={(e) => setLogoTxt(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1" /></div>
          <div><label className="block text-[9px] font-bold text-slate-400 uppercase font-sans">Logo Image</label><input type="file" accept="image/*" onChange={triggerSiteLogoUpload} className="w-full text-xs text-slate-500 mt-1 file:py-1 file:px-2" /></div>
          <button onClick={saveLogoText} className="w-full py-1.5 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[1px] text-white text-xs rounded-lg font-bold font-sans">Save Label</button>
        </div>

        <div className="bg-white border-2 border-[#EADFC9] p-4 rounded-xl shadow-skeuo-md font-sans">
          <h3 className="font-serif font-bold border-b pb-1.5 text-slate-800 text-sm">YouTube Auto-Sync Setup</h3>
          {ytConfig.lastError && <p className="text-[9px] text-rose-600 mb-1.5 font-bold">⚠ Sync issue: {ytConfig.lastError}</p>}
          <form onSubmit={handleYtSave} className="space-y-3 font-sans">
            <div><label className="block text-[9px] font-bold text-slate-400 uppercase">YouTube Channel ID / Handle</label><input type="text" value={channelIdInput} onChange={(e) => setChannelIdInput(e.target.value)} placeholder="@naitik._.artist-16" className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1 font-sans" required /></div>
            <div><label className="block text-[9px] font-bold text-slate-400 uppercase">YouTube API Key</label><input type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="AIzaSy..." className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1 font-sans" /></div>
            <button type="submit" className="w-full py-1.5 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[1px] text-white text-xs font-bold rounded-lg font-sans">Sync Channel</button>
          </form>
        </div>
      </div>

      <div className="col-span-2 bg-white border-2 border-[#EADFC9] p-4 rounded-xl shadow-skeuo-md font-sans">
        <h3 className="font-serif font-bold border-b pb-1.5 text-slate-800 text-sm flex items-center justify-between">
          <span>Roster Control & Applicants</span>
          {pendingCount > 0 && <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingCount} pending</span>}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-sans min-w-[400px]">
            <thead>
              <tr className="text-slate-400 font-semibold"><th className="pb-2">Crew Profile</th><th className="pb-2">Status & Role</th><th className="pb-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {profiles.map(p => {
                const isEditing = editingUserId === p.id;
                return (
                  <tr key={p.id} className="border-t font-sans animate-fadeIn">
                    <td className="py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-slate-50 shrink-0">{renderAvatar(p.photoURL)}</div>
                        <div className="flex flex-col font-sans"><span>{p.name}</span><span className="text-[9px] text-slate-400">{p.email}</span></div>
                      </div>
                      {isEditing && (
                        <div className="mt-2 p-2 bg-slate-50 border rounded-lg space-y-2 animate-fadeIn font-sans">
                          <span className="text-[8px] font-bold uppercase text-slate-400 block font-sans">Admin Photo Override</span>
                          <input type="file" accept="image/*" onChange={(e) => setEditedFile(e.target.files[0])} className="text-[9px] font-sans" />
                          <div className="flex gap-1.5 justify-end"><button onClick={() => setEditingUserId(null)} className="text-[9px] bg-slate-200 px-2 py-0.5 rounded font-sans">Cancel</button><button onClick={() => saveMemberPhotoOverride(p.id)} className="text-[9px] bg-[#C5A03A] text-white px-2 py-0.5 rounded font-bold font-sans">Save PFP</button></div>
                        </div>
                      )}
                    </td>
                    <td className="py-2 uppercase font-mono text-[9px] font-semibold"><span className={p.status === 'pending' ? 'text-amber-600' : p.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}>{p.status}</span> • {p.role}</td>
                    <td className="py-2 text-right">
                      {(p.email || '').toLowerCase() !== ADMIN_EMAIL ? (
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button onClick={() => setEditingUserId(p.id)} className="bg-blue-50 text-blue-700 px-2 py-0.5 border rounded hover:bg-blue-100 text-[9px]">Edit PFP</button>
                          {p.status !== 'approved' && <button onClick={() => approve(p.id)} className="bg-emerald-50 text-emerald-600 px-2 py-0.5 border rounded hover:bg-emerald-100 text-[9px]">Approve</button>}
                          {p.role !== 'admin' && p.role !== 'owner' ? <button onClick={() => promote(p.id)} className="bg-amber-50 text-amber-700 px-2 py-0.5 border rounded hover:bg-amber-100 text-[9px]">Promote</button> : p.role !== 'owner' && <button onClick={() => demote(p.id)} className="bg-purple-50 text-purple-700 px-2 py-0.5 border rounded hover:bg-purple-100 text-[9px]">Demote</button>}
                          {p.role !== 'roasting waiter' && p.role !== 'owner' && <button onClick={() => makeWaiter(p.id)} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 border rounded hover:bg-indigo-100 text-[9px]">Make Waiter</button>}
                          <button onClick={() => remove(p.id)} className="bg-rose-50 text-rose-600 px-2 py-0.5 border rounded hover:bg-rose-100 text-[9px]">Remove</button>
                        </div>
                      ) : <span className="text-slate-400 italic text-[10px]">Owner</span>}
                    </td>
                  </tr>
                );
              })}
              {profiles.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400 italic">No crew members yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PendingScreen({ userProfile, handleNavigationChange, handleSignOut }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center p-4">
      <div className="bg-white border-2 border-[#EADFC9] p-6 rounded-2xl max-w-sm shadow-skeuo-md animate-fadeIn font-sans flex flex-col items-center">
        <h3 className="font-serif font-bold text-base mb-1 text-slate-800">Roster Waiting Room</h3>
        <p className="text-xs text-slate-500 mb-4 font-sans">Hello {userProfile?.name}! Your request has been routed to the pending list for review. The studio owner will see it on the Admin panel.</p>
        <div className="flex gap-3 mt-1">
          <button onClick={() => handleNavigationChange('profile')} className="text-[10px] font-bold text-[#C5A03A] underline py-1 px-3 hover:bg-amber-50 rounded-lg transition-colors">Edit Profile</button>
          <button onClick={handleSignOut} className="text-[10px] font-bold text-rose-500 underline py-1 px-3 hover:bg-rose-50 rounded-lg transition-colors">Sign Out</button>
        </div>
      </div>
    </div>
  );
}

function RejectedScreen({ handleSignOut }) {
  return (
    <div className="text-center py-20 font-sans flex flex-col items-center justify-center gap-4">
      <p className="font-bold text-rose-500">Access Restricted. Contact the studio owner directly.</p>
      <button onClick={handleSignOut} className="text-xs font-bold text-rose-500 bg-rose-50 px-4 py-2 rounded-full border border-rose-200 hover:bg-rose-100 transition-colors">Sign Out</button>
    </div>
  );
  }
