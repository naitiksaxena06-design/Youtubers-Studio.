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
  arrayUnion, where, getDocs
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

// --- GLOBAL TIME FORMATTERS ---
const formatTimeAMPM = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formatDateTimeAMPM = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US') + ' • ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// --- NEXT-LEVEL STYLING INJECTION (DARK CINEMATIC STUDIO) ---
const injectArtStyleStyles = () => {
  if (document.getElementById('studio-aurum-styles')) return;
  const styleBlock = document.createElement('style');
  styleBlock.id = 'studio-aurum-styles';
  styleBlock.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:ital,wght@0,700;0,900;1,700&family=Outfit:wght@300;400;600;800&family=Space+Mono:wght@400;700&display=swap');

    .font-serif { font-family: 'Cinzel', serif; }
    .font-sans { font-family: 'Outfit', sans-serif; }
    .font-mono { font-family: 'Space Mono', monospace; }

    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 38, 38, 0.5); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(220, 38, 38, 0.8); }
    
    /* NEXT LEVEL IMMERSIVE DARK GLASSMORPHISM */
    .studio-glass {
      background: rgba(15, 15, 20, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 40px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .studio-header {
      background: linear-gradient(to bottom, rgba(5, 5, 8, 0.9) 0%, rgba(5, 5, 8, 0.4) 100%);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .studio-input {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .studio-input:focus {
      border-color: #dc2626;
      box-shadow: 0 0 15px rgba(220, 38, 38, 0.3);
      outline: none;
    }
    
    .glow-text-red { text-shadow: 0 0 20px rgba(220,38,38,0.6); }
    .glow-text-cyan { text-shadow: 0 0 20px rgba(6,182,212,0.6); }
    
    .btn-cinematic {
      background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%);
      box-shadow: 0 4px 15px rgba(185, 28, 28, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
      border: 1px solid rgba(255,100,100,0.3);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .btn-cinematic:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 25px rgba(220, 38, 38, 0.6), inset 0 1px 0 rgba(255,255,255,0.3);
    }
    .btn-cinematic:active { transform: translateY(1px) scale(0.98); }

    video::-webkit-media-controls { display: none !important; }
    video::-webkit-media-controls-enclosure { display: none !important; }

    @keyframes rec-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    .animate-rec { animation: rec-blink 1.5s infinite; }
    
    @keyframes sweepUp {
      0% { transform: translateY(100vh); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .animate-sweepUp { animation: sweepUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `;
  document.head.appendChild(styleBlock);
};

// --- CINEMATIC INTRO LOADER ---
function CinematicLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const duration = 2500; 
    const interval = 30;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const nextProg = Math.min((currentStep / steps) * 100, 100);
      setProgress(nextProg);

      if (currentStep >= steps) {
        clearInterval(timer);
        setIsFading(true);
        setTimeout(() => onComplete(), 800); // Wait for fade out
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[999999] bg-[#050508] text-white flex flex-col items-center justify-center transition-transform duration-700 ease-in-out ${isFading ? '-translate-y-full' : 'translate-y-0'}`}>
      {/* Viewfinder Overlay */}
      <div className="absolute inset-8 border-2 border-white/10 pointer-events-none flex flex-col justify-between p-4">
        <div className="flex justify-between w-full">
          <div className="w-8 h-8 border-t-2 border-l-2 border-white/40"></div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-rec shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
            <span className="font-mono text-sm tracking-widest font-bold text-red-500">REC</span>
          </div>
          <div className="w-8 h-8 border-t-2 border-r-2 border-white/40"></div>
        </div>
        <div className="flex justify-center items-center h-full absolute inset-0 pointer-events-none">
          <div className="w-[1px] h-10 bg-white/20"></div>
          <div className="h-[1px] w-10 bg-white/20 absolute"></div>
        </div>
        <div className="flex justify-between w-full">
          <div className="w-8 h-8 border-b-2 border-l-2 border-white/40"></div>
          <div className="w-8 h-8 border-b-2 border-r-2 border-white/40"></div>
        </div>
      </div>

      <div className="text-center z-10 space-y-6 w-full max-w-md px-8">
        <h1 className="font-serif text-4xl md:text-6xl font-black tracking-widest glow-text-red uppercase">Studio<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-700">Init</span></h1>
        
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-xs text-slate-400 font-bold uppercase tracking-widest">
            <span>Loading Assets</span>
            <span>{Math.floor(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}></div>
          </div>
        </div>
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest animate-pulse">Initializing Rendering Engine...</p>
      </div>
    </div>
  );
}

// --- ADVANCED 3D SCROLL REVEAL ANIMATION ---
function ScrollReveal({ children, className = "", delay = 0 }) {
  const domRef = useRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(entry.target); 
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={domRef}
      className={`${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'perspective(1000px) rotateX(0deg) translateY(0) scale(1)' : 'perspective(1000px) rotateX(15deg) translateY(60px) scale(0.95)',
        transition: 'opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'opacity, transform',
        transformOrigin: 'top center'
      }}
    >
      {children}
    </div>
  );
}

// --- PRESET AVATARS ---
const PRESET_AVATARS = [
  { id: 'coral-brush', name: 'Coral Splash', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#e11d48" opacity="0.2"/><path d="M30,70 Q50,30 70,30 Q80,50 60,70 Z" fill="#e11d48"/><circle cx="60" cy="45" r="5" fill="#facc15"/></svg>` },
  { id: 'cobalt-wave', name: 'Cobalt Swirl', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#0284c7" opacity="0.2"/><path d="M25,50 Q45,20 65,45 T85,50" fill="none" stroke="#0284c7" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="35" r="6" fill="#0284c7"/></svg>` },
  { id: 'gold-palette', name: 'Golden Drop', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#d97706" opacity="0.2"/><path d="M30,40 A20,20 0 0,0 70,60 A20,20 0 0,0 30,40" fill="#d97706"/><circle cx="45" cy="48" r="3" fill="#ffffff"/></svg>` },
  { id: 'emerald-leaf', name: 'Mint Stroke', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#059669" opacity="0.2"/><path d="M35,35 Q50,70 65,35" fill="none" stroke="#059669" stroke-width="10" stroke-linecap="round"/></svg>` },
];

const ADMIN_EMAIL = "naitiksaxena06@gmail.com";
const DEFAULT_CATEGORIES = ['Creativity', 'Editing', 'Writing', 'AI Related Expertise'];
const DEFAULT_YT_CONFIG = { channelId: '@naitik._.artist-16', apiKey: 'AIzaSyCZ7Aj3HV9JNeMAhTDUimZlUdjMqnPVNVg', subscribers: '—', latestVideoViews: '—', latestVideoTitle: 'Not synced yet', lastError: null, lastSyncedAt: null };

// --- VISUAL EXPIRY TIMERS ---
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

// --- CUSTOM TOUCH & HOLD HELPER COMPONENT ---
const LongPressable = ({ onLongPress, children, className, onClick, style }) => {
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const start = () => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, 600);
  };

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClick = (e) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

  return (
    <div
      className={className}
      style={{ ...style, WebkitTouchCallout: 'none', userSelect: 'none' }}
      onClick={handleClick}
      onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}
      onTouchStart={start} onTouchEnd={stop}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {children}
    </div>
  );
};

// --- GENERIC CONFIRMATION MODAL FOR LONG PRESS ACTIONS ---
function LongPressMenu({ title, onConfirm, onCancel, confirmText = "Delete" }) {
  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" onClick={onCancel}>
      <div className="studio-glass p-6 rounded-[2rem] w-full max-w-xs shadow-2xl text-center border-t border-white/20" onClick={e => e.stopPropagation()}>
        <p className="font-serif text-lg font-bold text-white mb-5">{title}</p>
        <button onClick={onConfirm} className="w-full py-3 btn-cinematic text-white font-bold rounded-xl mb-3 tracking-widest text-xs uppercase">{confirmText}</button>
        <button onClick={onCancel} className="w-full py-3 studio-input hover:bg-white/10 text-white font-bold rounded-xl transition-colors tracking-widest text-xs uppercase">Cancel</button>
      </div>
    </div>
  );
}

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
    return <div onClick={onClick} className="studio-glass w-full h-full flex items-center justify-center font-bold text-slate-400 font-sans cursor-pointer">?</div>;
  }
  if (photoURL.startsWith('<svg') || photoURL.includes('<circle') || photoURL.includes('<path')) {
    return <div onClick={onClick} className={`${className} cursor-pointer drop-shadow-lg`} dangerouslySetInnerHTML={{ __html: photoURL }} />;
  }
  return <img onClick={onClick} src={photoURL} alt="Crew Avatar" className={`${className} cursor-pointer`} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60"; }} />;
};

function useFirestoreCollection(name, orderField = null, limitN = null, enabled = false) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !db) { setItems([]); setLoaded(false); return; }
    try {
      const q = collection(db, name); 
      const unsub = onSnapshot(q, (snap) => {
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (orderField) {
          docs.sort((a, b) => (b[orderField] || 0) - (a[orderField] || 0));
        }
        if (limitN) {
          docs = docs.slice(0, limitN);
        }
        setItems(docs);
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
  const [showIntroLoader, setShowIntroLoader] = useState(true);
  const [threeReady, setThreeReady] = useState(false);
  
  const [currentPage, setCurrentPage] = useState('home');
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customToast, setCustomToast] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [chatChannel, setChatChannel] = useState('general');
  const [chatViewMode, setChatViewMode] = useState('list');
  const [activeVideo, setActiveVideo] = useState(null);
  const [inspectUser, setInspectUser] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setCustomToast({ message, type });
    setTimeout(() => setCustomToast(null), 2500); 
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

  // Safely memoize the user inspector profile based on ID
  const targetInspectProfile = useMemo(() => {
    return (profiles || []).find(p => p.id === inspectUser) || null;
  }, [profiles, inspectUser]);

  const isAdmin = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.role === 'admin' || userProfile.role === 'owner' || (userProfile.email || '').toLowerCase() === ADMIN_EMAIL;
  }, [userProfile]);

  const isRoastingWaiter = useMemo(() => {
    if (!userProfile) return false;
    const roleLower = (userProfile.role || '').toLowerCase();
    return roleLower === 'roasting waiter' || roleLower === 'waiter';
  }, [userProfile]);

  useEffect(() => {
    if (currentPage === 'notifications' && db && userProfile) {
      try { updateDoc(doc(db, 'profiles', userProfile.id), { lastSeenNotifAt: Date.now() }); } catch (e) {}
    }
  }, [currentPage, userProfile]);

  useEffect(() => {
    const pruneOldNotifications = async () => {
      try {
        if (!db || !db.app || !isAdmin) return;
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const notificationsRef = fbCollection(db, 'artifacts', appId, 'public', 'data', 'notifications');
        const snapshot = await getDocs(notificationsRef);
        const batchPromises = snapshot.docs
           .filter(docSnap => (docSnap.data().timestamp || 0) < oneWeekAgo)
           .map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(batchPromises);
      } catch (err) {}
    };
    pruneOldNotifications();
  }, [db, isAdmin]);

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

  // --- BACKGROUND AUTO-SWEEPER ---
  useEffect(() => {
    if (!isAuthReady || !userProfile || !db || !db.app) return;
    const runSweep = async () => {
      const now = Date.now();
      const sweepSeven = 7 * 24 * 60 * 60 * 1000;
      const sweepThirty = 30 * 24 * 60 * 60 * 1000;
      const sweepOne = 24 * 60 * 60 * 1000;

      const isOlder = (timestamp, maxAgeMs) => {
        if (!timestamp || typeof timestamp !== 'number' || timestamp > now) return false;
        return (now - timestamp) > maxAgeMs;
      };

      chats.forEach(async (item) => { if (isOlder(item.createdAt, sweepSeven)) { try { await deleteDoc(doc(db, 'chats', item.id)); } catch (e) {} } });
      posts.forEach(async (item) => { if (isOlder(item.createdAt, sweepSeven)) { try { await deleteDoc(doc(db, 'posts', item.id)); } catch (e) {} } });
      videos.forEach(async (item) => { if (isOlder(item.createdAt, sweepSeven)) { try { await deleteDoc(doc(db, 'videos', item.id)); } catch (e) {} } });
      projects.forEach(async (item) => { if (isOlder(item.createdAt, sweepThirty)) { try { await deleteDoc(doc(db, 'projects', item.id)); } catch (e) {} } });
      scripts.forEach(async (item) => { if (isOlder(item.createdAt, sweepThirty)) { try { await deleteDoc(doc(db, 'scripts', item.id)); } catch (e) {} } });
      notifications.forEach(async (item) => { if (isOlder(item.timestamp, sweepOne)) { try { await deleteDoc(doc(db, 'notifications', item.id)); } catch (e) {} } });
    };
    
    const delayTimer = setTimeout(() => { runSweep(); }, 15000);
    return () => clearTimeout(delayTimer);
  }, [isAuthReady, userProfile, chats, posts, notifications, videos, scripts, projects]);

  useEffect(() => { if (notifsError && isAuthReady && !isRoastingWaiter) { showToast(`Notifications temporarily on standby.`, 'info'); } }, [notifsError, isAuthReady, isRoastingWaiter]);

  const visibleNotifications = useMemo(() => (notifications || []).filter(n => {
    if (!n || n.actor === 'System' || n.actor === userProfile?.name) return false; 
    const audience = n.audience || 'all';
    return audience === 'all' || (audience === 'admin' && isAdmin);
  }), [notifications, isAdmin, userProfile]);

  const unreadMap = useMemo(() => {
    if (isRoastingWaiter) return { vault: false, projects: false, scripts: false, posts: false, overall: 0 };
    const lastSeen = userProfile?.lastSeenNotifAt || 0;
    const unread = visibleNotifications.filter(n => n.timestamp > lastSeen);
    return {
      vault: unread.some(n => n.type === 'video'),
      projects: unread.some(n => n.type === 'project'),
      scripts: unread.some(n => n.type === 'script'),
      posts: unread.some(n => n.type === 'post'),
      overall: unread.length
    };
  }, [visibleNotifications, userProfile, isRoastingWaiter]);

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
      if (!n || !n.message || seenNotifIdsRef.current.has(n.id)) return;
      seenNotifIdsRef.current.add(n.id);
      
      if (n.actor === userProfile.name) return;
      if (currentPage === 'vault' && n.type === 'video') return;
      if (currentPage === 'projects' && n.type === 'project') return;
      if (currentPage === 'scripts' && n.type === 'script') return;
      if (currentPage === 'posts' && n.type === 'post') return;
      if (currentPage === 'admin' && n.type === 'system') return;
      if (currentPage === 'chat' && n.type === 'chat' && n.meta?.channelId === chatChannel && chatViewMode === 'chat') return;

      const audience = n.audience || 'all';
      const relevant = audience === 'all' || (audience === 'admin' && isAdmin);
      
      if (relevant && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { 
          const options = {
            body: n.message,
            icon: siteSettings.logoUrl || undefined,
            badge: siteSettings.logoUrl || undefined,
            tag: n.id,
            renotify: true,
            requireInteraction: true 
          };
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
              if (reg && reg.showNotification) {
                reg.showNotification('Youtubers Studio', options);
              } else {
                new Notification('Youtubers Studio', options);
              }
            }).catch(() => {
              new Notification('Youtubers Studio', options);
            });
          } else {
            new Notification('Youtubers Studio', options);
          }
        } catch (e) { console.error("Native push dispatch failure", e); }
      }
    });
  }, [notifications, userProfile, isAdmin, siteSettings.logoUrl, currentPage, chatChannel, chatViewMode, isRoastingWaiter]);

  const pushNotification = useCallback(async (message, type = 'system', meta = {}, actorName = 'Crew Member', audience = 'all') => {
    if (isRoastingWaiter || !db || !db.app || userProfile?.status !== 'approved') return;
    try { await addDoc(collection(db, 'notifications'), { message, type, meta, actor: actorName, timestamp: Date.now(), audience }); } catch (err) {}
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
      if (!isOwner) {
        await addDoc(collection(db, 'notifications'), { 
          message: `New crew application from ${newProfile.name}. Awaiting approval on roster list.`, 
          type: 'system', actor: 'System', timestamp: Date.now(), audience: "admin" 
        });
      }
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
    if (showIntroLoader || !isAdmin) return;
    syncYouTubeStats(ytConfigRef.current.channelId, ytConfigRef.current.apiKey, true);
    const timer = setInterval(() => { syncYouTubeStats(ytConfigRef.current.channelId, ytConfigRef.current.apiKey, true); }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [showIntroLoader, isAdmin]);

  useEffect(() => {
    injectArtStyleStyles();
    const loadScript = (src) => new Promise((resolve) => { const script = document.createElement('script'); script.src = src; script.onload = () => resolve(true); script.onerror = () => resolve(false); document.head.appendChild(script); });
    (async () => {
      try { const loadedThree = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); if (loadedThree) setThreeReady(true); } catch (e) {}
    })();
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden text-white font-sans selection:bg-red-600/30 bg-[#050508]">
      {showIntroLoader && <CinematicLoader onComplete={() => setShowIntroLoader(false)} />}
      
      {threeReady && !showIntroLoader && <ThreeArtBackground />}

      {customToast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[99999] px-8 py-3 rounded-full shadow-2xl text-xs font-bold text-white transition-all animate-sweepUp border border-white/20 backdrop-blur-md ${customToast.type === 'success' ? 'bg-emerald-600/80' : 'bg-rose-600/80'}`}>{customToast.message}</div>
      )}

      {/* --- HEADER (GLASSMORPHISM) --- */}
      <header className={`sticky top-0 z-40 studio-header px-4 sm:px-6 py-4 flex items-center justify-between shadow-2xl font-sans transition-opacity duration-1000 ${showIntroLoader ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center space-x-4 min-w-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/10 rounded-full transition text-white shadow-inner border border-white/10 shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
          <div className="flex items-center space-x-3 cursor-pointer min-w-0" onClick={() => handleNavigationChange('home')}>
            {siteSettings.logoUrl ? <img src={siteSettings.logoUrl} alt="Logo" className="w-10 h-10 object-cover rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500/50 shrink-0" /> : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-900 flex items-center justify-center text-white font-serif font-black text-lg shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500/50 shrink-0">Y</div>}
            <span className="font-serif text-lg sm:text-xl tracking-widest text-white font-black truncate max-w-[150px] sm:max-w-xs leading-none glow-text-red uppercase">{siteSettings.logoText || 'STUDIO'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
          {userProfile && userProfile.status === 'approved' && !isRoastingWaiter && (
            <button onClick={() => handleNavigationChange('notifications')} className="relative p-3 hover:bg-white/10 rounded-full transition text-white shadow-inner border border-white/10 backdrop-blur">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadMap.overall > 0 && <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-black shadow-[0_0_10px_rgba(220,38,38,0.8)]">{unreadMap.overall > 9 ? '9+' : unreadMap.overall}</span>}
            </button>
          )}
          {userProfile ? (
            <div className="flex items-center space-x-3 bg-white/5 pr-2 pl-3 py-1.5 rounded-full border border-white/10">
              <div className="hidden sm:flex flex-col text-right"><p className="text-sm font-bold text-white leading-none tracking-wide">{userProfile?.name}</p><span className="text-[9px] text-rose-400 uppercase tracking-widest font-mono font-bold mt-1">{userProfile?.role}</span></div>
              <div className="w-9 h-9 rounded-full border-2 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.4)] overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleNavigationChange('profile')}>{renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}</div>
            </div>
          ) : <button onClick={() => setShowSignInModal(true)} className="text-[11px] sm:text-sm font-black btn-cinematic text-white px-5 py-2.5 rounded-full uppercase tracking-wider whitespace-nowrap">Initialize</button>}
        </div>
      </header>

      {/* --- SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-500 bg-black/60 backdrop-blur-md ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`absolute left-0 top-0 bottom-0 w-72 studio-glass border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.8)] p-6 flex flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between pb-4 border-b border-white/10"><span className="font-serif font-black text-lg text-white tracking-widest uppercase glow-text-red">Menu</span><button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 font-bold p-1 hover:text-white bg-white/5 rounded-full px-2 transition-colors">✕</button></div>
            <nav className="space-y-2 relative font-sans">
              {(!userProfile || (userProfile.status === 'approved' && !isRoastingWaiter && !isProfileIncomplete)) && (
                <>
                  <button onClick={() => handleNavigationChange('home')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'home' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>🪐</span><span>Dashboard</span></button>
                  <button onClick={() => handleNavigationChange('notifications')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all relative ${currentPage === 'notifications' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>📡</span><span>Radar Log</span>{unreadMap.overall > 0 && <span className="absolute right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>}</button>
                  <button onClick={() => handleNavigationChange('crew')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'crew' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>👥</span><span>Production Crew</span></button>
                  <button onClick={() => handleNavigationChange('categories-view')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'categories-view' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>🏷️</span><span>Roles Map</span></button>
                  <button onClick={() => handleNavigationChange('vault')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all relative ${currentPage === 'vault' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>🎬</span><span>Video Vault</span>{unreadMap.vault && <span className="absolute right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>}</button>
                  <button onClick={() => handleNavigationChange('projects')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all relative ${currentPage === 'projects' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>📌</span><span>Active Boards</span>{unreadMap.projects && <span className="absolute right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>}</button>
                  <button onClick={() => handleNavigationChange('scripts')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all relative ${currentPage === 'scripts' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>📝</span><span>Script Writer</span>{unreadMap.scripts && <span className="absolute right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>}</button>
                  <button onClick={() => handleNavigationChange('chat')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'chat' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>💬</span><span>Comms Link</span></button>
                  <button onClick={() => handleNavigationChange('posts')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all relative ${currentPage === 'posts' ? 'bg-gradient-to-r from-red-600/20 to-transparent border-l-4 border-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>📸</span><span>Showroom Feed</span>{unreadMap.posts && <span className="absolute right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>}</button>
                </>
              )}
              {userProfile && <button onClick={() => handleNavigationChange('profile')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'profile' ? 'bg-gradient-to-r from-cyan-600/20 to-transparent border-l-4 border-cyan-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><span>🪪</span><span>ID Profile {isProfileIncomplete && '⚠️'}</span></button>}
              {isAdmin && !isRoastingWaiter && !isProfileIncomplete && (
                <div className="pt-6 border-t border-white/10 mt-6 space-y-2"><span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-5 block mb-2 font-mono">Terminal Override</span><button onClick={() => handleNavigationChange('admin')} className={`w-full flex items-center space-x-4 px-5 py-3 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'admin' ? 'bg-rose-900/40 border-l-4 border-rose-500 text-rose-300' : 'text-rose-500/70 hover:text-rose-400 hover:bg-rose-900/20'}`}><span>⚙️</span><span>Admin Console</span></button></div>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className={`relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-8 studio-page-wrap transition-opacity duration-1000 ${showIntroLoader ? 'opacity-0' : 'opacity-100'}`}>
        {currentPage === 'home' && <CreatorHomeHub siteSettings={siteSettings} videos={videos} projects={projects} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} isAdmin={isAdmin} notifications={notifications} onNavigate={setCurrentPage} onInspectUser={setInspectUser} userProfile={userProfile} setSelectedProject={setSelectedProject} />}
        {currentPage === 'notifications' && <NotificationsFeed notifications={visibleNotifications} onNavigate={setCurrentPage} setActiveVideo={setActiveVideo} videos={videos} onInspectUser={setInspectUser} />}
        {currentPage === 'pending-status' && <PendingScreen userProfile={userProfile} handleNavigationChange={handleNavigationChange} handleSignOut={handleSignOut} />}
        {currentPage === 'rejected-status' && <RejectedScreen handleSignOut={handleSignOut} />}
        {currentPage === 'crew' && <CrewSection profiles={profiles} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} onInspectUser={setInspectUser} />}
        {currentPage === 'categories-view' && <CategoriesViewSection profiles={profiles} categories={categories} showToast={showToast} onInspectUser={setInspectUser} />}
        
        {currentPage === 'vault' && <VideoVault videos={videos} projects={projects} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} pushNotification={pushNotification} activeVideo={activeVideo} setActiveVideo={setActiveVideo} onInspectUser={setInspectUser} />}
        {currentPage === 'projects' && <ProjectBoard projects={projects} tasks={tasks} videos={videos} scripts={scripts} posts={posts} userProfile={userProfile} showToast={showToast} selectedProject={selectedProject} setSelectedProject={setSelectedProject} pushNotification={pushNotification} isAdmin={isAdmin} />}
        {currentPage === 'scripts' && <ScriptsWorkspace scripts={scripts} projects={projects} userProfile={userProfile} isAdmin={isAdmin} showToast={showToast} pushNotification={pushNotification} />}
        {currentPage === 'chat' && <WhiteboardChat chats={chats} userProfile={userProfile} chatChannel={chatChannel} setChatChannel={setChatChannel} pushNotification={pushNotification} siteSettings={siteSettings} isAdmin={isAdmin} showToast={showToast} onInspectUser={setInspectUser} viewMode={chatViewMode} setViewMode={setChatViewMode} />}
        {currentPage === 'posts' && <PostsWorkspace posts={posts} projects={projects} userProfile={userProfile} showToast={showToast} pushNotification={pushNotification} isAdmin={isAdmin} onInspectUser={setInspectUser} />}
        
        {currentPage === 'profile' && (
          !userProfile ? <div className="studio-glass p-10 rounded-[3rem] text-center max-w-md mx-auto shadow-2xl"><p className="text-slate-400 font-bold tracking-widest animate-pulse">Fetching Hologram ID...</p></div> : 
          <MyProfileWorkspace userProfile={userProfile} categories={categories} showToast={showToast} handleSignOut={handleSignOut} isOnboarding={isProfileIncomplete} onNavigate={handleNavigationChange} />
        )}
        {currentPage === 'admin' && isAdmin && <AdminPanel profiles={profiles} siteSettings={siteSettings} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} userProfile={userProfile} showToast={showToast} />}
      </main>

      {/* --- GLOBAL USER INSPECTOR MODAL --- */}
      {targetInspectProfile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fadeIn" onClick={() => setInspectUser(null)}>
          <div className="w-full max-w-sm studio-glass border border-white/20 rounded-[3rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setInspectUser(null)} className="absolute top-5 right-5 font-bold text-slate-400 hover:text-white transition">✕</button>
            <div className="w-24 h-24 rounded-full border-4 border-cyan-500/40 mx-auto overflow-hidden p-1 mb-4 flex items-center justify-center bg-black/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]">{renderAvatar(targetInspectProfile.photoURL)}</div>
            <div className="font-serif text-2xl font-black text-white glow-text-cyan">{targetInspectProfile.name}</div>
            <span className="bg-cyan-900/30 text-cyan-400 border border-cyan-500/40 text-[10px] px-4 py-1.5 rounded-full font-bold mt-3 inline-block uppercase tracking-widest font-mono shadow-sm">{targetInspectProfile.workCategory} • {targetInspectProfile.role}</span>
            <div className="my-6 text-slate-300 font-sans font-semibold text-sm px-4 leading-relaxed bg-black/40 py-4 rounded-2xl border border-white/5 shadow-inner">{targetInspectProfile.bio || "No bio parameters defined."}</div>
            <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">ID Mapped • {new Date(targetInspectProfile.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {showSignInModal && <SignInModal handleGoogleSignIn={handleGoogleSignIn} setShowSignInModal={setShowSignInModal} showToast={showToast} />}
    </div>
  );
}

// --- NEXT LEVEL 3D BACKGROUND (DARK CINEMATIC) ---
function ThreeArtBackground() {
  const mountRef = useRef(null);
  
  useEffect(() => {
    if (!window.THREE) return;
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.02);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 15;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    
    // Cinematic Lighting Setup (Red/Cyan classic Studio look)
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    const redLight = new THREE.PointLight(0xff0033, 4, 30);
    redLight.position.set(5, 2, 5);
    scene.add(redLight);
    
    const cyanLight = new THREE.PointLight(0x00e5ff, 3, 30);
    cyanLight.position.set(-5, -2, 5);
    scene.add(cyanLight);

    const backLight = new THREE.SpotLight(0xffffff, 1);
    backLight.position.set(0, 10, -10);
    scene.add(backLight);

    // Group for objects
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);

    // 1. Giant Abstract Play Button
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.5);
    shape.lineTo(1.5, -0.75);
    shape.lineTo(-1.5, -0.75);
    shape.lineTo(0, 1.5);
    const extrudeSettings = { depth: 0.4, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 0.1, bevelThickness: 0.1 };
    const playGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center geometry
    playGeo.computeBoundingBox();
    const offset = playGeo.boundingBox.getCenter(new THREE.Vector3());
    playGeo.translate(-offset.x, -offset.y, -offset.z);
    
    const glassMat = new THREE.MeshPhysicalMaterial({ 
      color: 0xffffff, metalness: 0.2, roughness: 0.1, transmission: 0.9, ior: 1.5, thickness: 2.0, transparent: true, opacity: 0.8
    });
    const playMesh = new THREE.Mesh(playGeo, glassMat);
    playMesh.rotation.z = -Math.PI / 2; // Point right
    playMesh.position.set(2, 0, 0);
    playMesh.scale.set(1.5, 1.5, 1.5);
    objectsGroup.add(playMesh);

    // 2. Floating Torus Knots (Abstract Art/Film reels)
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
    const knot1 = new THREE.Mesh(new THREE.TorusKnotGeometry(2, 0.4, 100, 16), darkMetal);
    knot1.position.set(-4, 2, -3);
    objectsGroup.add(knot1);

    const knot2 = new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, 0.2, 100, 16), glassMat);
    knot2.position.set(4, -3, -5);
    objectsGroup.add(knot2);

    // 3. Cinematic Dust Particles
    const pCount = 300; 
    const pPositions = new Float32Array(pCount * 3); 
    const pGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < pCount; i++) { 
      pPositions[i * 3] = (Math.random() - 0.5) * 30; 
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 30; 
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 15; 
    }
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    const particleSystem = new THREE.Points(pGeometry, pMaterial);
    scene.add(particleSystem);

    let mouseX = 0, mouseY = 0; const targetMouse = { x: 0, y: 0 };
    const handleWindowMouseMove = (e) => { targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1; targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1; };
    window.addEventListener('mousemove', handleWindowMouseMove);

    // PARALLAX SCROLL LOGIC
    let targetScrollY = 0;
    let currentScrollY = 0;
    const handleScroll = () => { targetScrollY = window.scrollY; };
    window.addEventListener('scroll', handleScroll);

    const clock = new THREE.Clock(); let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate); 
      const elapsed = clock.getElapsedTime();
      
      // Smooth scroll interpolation
      currentScrollY += (targetScrollY - currentScrollY) * 0.05;

      // Floating animations
      playMesh.rotation.y = Math.sin(elapsed * 0.5) * 0.3;
      playMesh.rotation.x = Math.cos(elapsed * 0.3) * 0.2;
      playMesh.position.y = Math.sin(elapsed * 0.8) * 0.5;

      knot1.rotation.x = elapsed * 0.2;
      knot1.rotation.y = elapsed * 0.3;
      
      knot2.rotation.x = -elapsed * 0.1;
      knot2.rotation.z = elapsed * 0.2;

      particleSystem.rotation.y = elapsed * 0.02;

      // Mouse Parallax
      mouseX += (targetMouse.x - mouseX) * 0.05; 
      mouseY += (targetMouse.y - mouseY) * 0.05;
      
      // Advanced Scroll Camera Dive
      // As you scroll down, camera moves FORWARD and looks slightly DOWN
      camera.position.x = mouseX * 2; 
      camera.position.y = (mouseY * 2) - (currentScrollY * 0.005); 
      camera.position.z = 15 - (currentScrollY * 0.003);
      
      // Shift the whole group based on scroll for a deeper parallax feel
      objectsGroup.position.y = currentScrollY * 0.002;
      objectsGroup.rotation.y = currentScrollY * 0.0002;

      camera.lookAt(scene.position); 
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', resize);
    return () => { 
      cancelAnimationFrame(frameId); 
      window.removeEventListener('resize', resize); 
      window.removeEventListener('mousemove', handleWindowMouseMove); 
      window.removeEventListener('scroll', handleScroll);
      if (mountRef.current) mountRef.current.innerHTML = ''; 
    };
  }, []);
  
  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0" />;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn font-sans">
      <div className="w-full max-w-md studio-glass rounded-[3rem] p-10 shadow-[0_0_50px_rgba(220,38,38,0.2)] relative animate-fadeIn border-t border-white/20">
        <button onClick={() => setShowSignInModal(false)} className="absolute top-6 right-6 font-bold text-slate-500 bg-white/10 rounded-full px-3 py-1 hover:bg-white/20 hover:text-white transition">✕</button>
        <div className="font-serif text-2xl font-black text-white text-center mb-2 tracking-widest uppercase glow-text-red">Identify</div>
        <p className="text-xs text-slate-400 text-center mb-8 font-mono uppercase tracking-wide">Establish credentials to link to studio mainframe.</p>
        
        {!emailMode ? (
          <div className="space-y-4">
            <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-4 py-4 studio-input hover:bg-white/10 rounded-2xl text-sm font-bold text-white transition shadow-lg border border-white/20">
              <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.2 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.3C40.9 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
              Google Override
            </button>
            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-white/10"></div><span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">or</span><div className="flex-grow border-t border-white/10"></div></div>
            <button onClick={() => setEmailMode(true)} className="w-full py-4 bg-slate-900 text-white text-xs font-bold rounded-2xl hover:bg-black shadow-lg transition border border-white/10 uppercase tracking-widest">✉️ Email Protocol</button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuthSubmit} className="space-y-4 animate-fadeIn">
            <div><label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" className="w-full px-4 py-3 studio-input rounded-xl text-sm transition-all" required /></div>
            <div><label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Secret Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 studio-input rounded-xl text-sm transition-all" required /></div>
            <button type="submit" disabled={loading} className="w-full py-4 btn-cinematic text-white text-sm font-bold uppercase tracking-widest rounded-xl mt-4">{loading ? "Authorizing..." : (isSignUp ? "Register Node" : "Access Node")}</button>
            <div className="flex justify-between items-center pt-4 text-[10px] font-bold font-mono">
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-slate-400 hover:text-red-400 uppercase tracking-wider">{isSignUp ? "Already Registered?" : "Need Access?"}</button>
              <button type="button" onClick={() => setEmailMode(false)} className="text-slate-500 hover:text-white uppercase tracking-wider">◀ Abort</button>
            </div>
          </form>
        )}
        <p className="text-[9px] text-slate-600 font-mono text-center mt-8 uppercase tracking-widest">Unrecognized signatures held for manual review.</p>
      </div>
    </div>
  );
}

// --- HOMEPAGE HUB ---
function CreatorHomeHub({ siteSettings, videos, projects, ytConfig, syncYouTubeStats, isAdmin, notifications, onNavigate, onInspectUser, userProfile, setSelectedProject }) {
  const studioUpdates = useMemo(() => {
    return (notifications || []).filter(n => n && n.message && !String(n.message).startsWith('"') && n.actor !== 'System' && n.actor !== userProfile?.name);
  }, [notifications, userProfile]);

  return (
    <section className="space-y-12 py-4 animate-fadeIn font-sans">
      <ScrollReveal className="text-center py-10" delay={200}>
        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-black text-white uppercase tracking-widest leading-none glow-text-red drop-shadow-2xl">{siteSettings?.logoText || 'STUDIO'}</h1>
        <p className="text-slate-400 font-mono uppercase tracking-widest text-xs sm:text-sm mt-6 bg-black/40 inline-block px-4 py-2 rounded-full border border-white/10 shadow-inner">Command Center & Asset Master</p>
      </ScrollReveal>

      <ScrollReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" delay={400}>
        {[
          { label: 'YouTube Subscribers', value: ytConfig?.subscribers || '—', icon: '📈', change: ytConfig?.lastError ? `⚠ ${ytConfig.lastError}` : (ytConfig?.lastSyncedAt ? `Synced ${formatTimeAMPM(ytConfig.lastSyncedAt)}` : 'Not synced yet'), action: isAdmin ? (<button onClick={() => syncYouTubeStats()} className="text-[9px] bg-red-600/20 text-red-400 font-black px-3 py-1.5 rounded border border-red-500/30 hover:bg-red-600/40 transition mt-3 uppercase tracking-widest font-mono">🔄 Ping API</button>) : null },
          { label: 'Latest Video Views', value: ytConfig?.latestVideoViews || '—', icon: '📺', change: ytConfig?.latestVideoTitle ? `"${ytConfig.latestVideoTitle.substring(0, 24)}..."` : '—', action: null },
          { label: 'Vault Records', value: `${videos?.length || 0} Masters`, icon: '🎬', change: 'Cloud storage linked', action: null },
          { label: 'Active Boards', value: `${projects?.length || 0} Open`, icon: '📌', change: 'Live collaboration sync', action: null },
        ].map((stat, idx) => (
          <div key={idx} className="studio-glass rounded-3xl p-6 shadow-2xl hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(220,38,38,0.15)] transition-all duration-500 flex flex-col justify-between h-48 border-t border-white/20 group">
            <div><div className="flex justify-between items-start text-slate-400 mb-2"><span className="text-[10px] uppercase font-black tracking-widest font-mono">{stat.label}</span><span className="text-2xl group-hover:scale-110 transition-transform">{stat.icon}</span></div><p className="text-3xl font-black text-white font-serif leading-none mt-2">{stat.value}</p></div>
            <div className="mt-2"><span className="text-[10px] text-red-400 font-bold block truncate font-mono uppercase tracking-wider">{stat.change}</span>{stat.action}</div>
          </div>
        ))}
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ScrollReveal className="studio-glass p-8 rounded-[2.5rem] shadow-2xl border-t border-white/20" delay={600}>
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <h3 className="font-serif text-xl font-black text-white glow-text-red">📢 Broadcast Log</h3>
            <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded shadow-sm">Live Feed</span>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-3">
            {studioUpdates.map(notif => (
              <div key={notif.id} className="text-sm leading-relaxed border-l-2 border-red-600/50 pl-4 py-1 animate-fadeIn bg-white/5 rounded-r-lg pr-3">
                <span className="font-bold text-white cursor-pointer hover:text-red-400 transition-colors" onClick={() => onInspectUser(notif.authorUid)}>{notif.actor}:{' '}</span>
                <span className="text-slate-300 font-semibold">{notif.message}</span>
                <p className="text-[10px] text-slate-500 mt-1.5 font-mono font-bold tracking-widest uppercase">{formatTimeAMPM(notif.timestamp)}</p>
              </div>
            ))}
            {studioUpdates.length === 0 && <p className="text-xs text-slate-500 font-mono uppercase tracking-widest text-center py-10">System log empty.</p>}
          </div>
        </ScrollReveal>

        <ScrollReveal className="studio-glass p-8 rounded-[2.5rem] shadow-2xl border-t border-white/20" delay={700}>
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <h3 className="font-serif text-xl font-black text-white glow-text-cyan">📌 Pinned Timelines</h3>
            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded shadow-sm">Active</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {projects.slice(0, 6).map(p => (
              <div key={p.id} onClick={() => { setSelectedProject(p); onNavigate('projects'); }} className="studio-input p-5 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-300 shadow-sm group">
                <p className="text-sm font-black text-white truncate group-hover:text-cyan-400">{p.title}</p>
                <p className="text-[10px] text-slate-500 font-mono font-bold mt-2 tracking-widest uppercase">Expires: {getExpiry30(p.createdAt)}</p>
              </div>
            ))}
            {projects.length === 0 && <p className="text-xs text-slate-500 font-mono uppercase tracking-widest text-center py-10 col-span-2">No boards established.</p>}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// --- NOTIFICATIONS PAGE ---
function NotificationsFeed({ notifications, onNavigate, setActiveVideo, videos, onInspectUser }) {
  const handleNotificationClick = (notif) => {
    const msg = (notif.message || '').toLowerCase();
    
    if (msg.includes('video asset') || msg.includes('commented on video')) {
      onNavigate('vault');
      const match = videos.find(v => msg.includes(v.title.toLowerCase()));
      if (match) setActiveVideo(match);
    } else if (msg.includes('concept whiteboard') || msg.includes('task') || msg.includes('project')) {
      onNavigate('projects');
    } else if (msg.includes('script topic')) {
      onNavigate('scripts');
    } else if (msg.includes('showroom draft') || msg.includes('showroom feed') || msg.includes('instagram')) {
      onNavigate('posts');
    } else if (msg.startsWith('"')) {
      onNavigate('chat');
    } else {
      onNavigate('home');
    }
  };

  const sortedNotifs = useMemo(() => {
    return [...notifications].sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications]);

  return (
    <ScrollReveal className="studio-glass p-6 sm:p-10 rounded-[3rem] shadow-2xl max-w-4xl mx-auto min-h-[75vh] flex flex-col border-t border-white/20">
      <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
        <h2 className="font-serif text-2xl font-black text-white flex items-center gap-3 glow-text-red">📡 Radar / Updates Log</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
        {sortedNotifs.map((n, idx) => (
          <ScrollReveal key={n.id} delay={idx * 50}>
            <div onClick={() => handleNotificationClick(n)} className="flex items-start gap-5 p-5 studio-input rounded-2xl hover:border-red-500/50 hover:bg-white/10 cursor-pointer transition-all duration-300 shadow-md">
               <div className="mt-1.5 w-3 h-3 bg-red-600 rounded-full shrink-0 shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
               <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white leading-snug">{n.message}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onInspectUser(n.authorUid); }}>{n.actor}</span>
                    <span className="text-slate-600 text-xs font-black">•</span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{formatDateTimeAMPM(n.timestamp)}</span>
                  </div>
               </div>
            </div>
          </ScrollReveal>
        ))}
        {sortedNotifs.length === 0 && (
          <div className="text-center py-32 text-slate-500 font-mono font-bold tracking-widest uppercase">
            Radar clear. No recent activity.
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

// --- CREW DIRECTORY SECTION ---
function CrewSection({ profiles, userProfile, showToast, isAdmin, onInspectUser }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const [memberToDelete, setMemberToDelete] = useState(null);
  
  const approvedProfiles = useMemo(() => (profiles || []).filter(p => p.status === 'approved'), [profiles]);

  const removeMember = async () => {
    if (!memberToDelete || !db || !db.app) return;
    try { await deleteDoc(doc(db, 'profiles', memberToDelete.id)); showToast('Crew member removed.', 'success'); } catch (err) { showToast('Failed to remove.', 'warning'); }
    setMemberToDelete(null);
  };

  if (approvedProfiles.length === 0) return <div className="text-center text-slate-500 font-mono tracking-widest py-32 uppercase">Database empty.</div>;

  return (
    <section className="py-4 animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-8">
      <ScrollReveal className="lg:col-span-1 studio-glass p-8 rounded-[3rem] text-center shadow-2xl h-fit border-t border-white/20">
        <div className="w-32 h-32 rounded-full border-4 border-cyan-500/50 mx-auto overflow-hidden p-1.5 mb-6 flex items-center justify-center bg-black/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]">{renderAvatar(approvedProfiles[focusIdx]?.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(approvedProfiles[focusIdx]?.id))}</div>
        <div className="font-serif text-3xl font-black text-white cursor-pointer hover:text-cyan-400 transition-colors glow-text-cyan" onClick={() => onInspectUser(approvedProfiles[focusIdx]?.id)}>{approvedProfiles[focusIdx]?.name}</div>
        <p className="text-xs font-mono text-slate-400 mt-2 tracking-widest uppercase">{approvedProfiles[focusIdx]?.email}</p>
        <span className="bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 text-[11px] px-5 py-2 rounded-lg font-black mt-5 inline-block shadow-md uppercase tracking-widest">{approvedProfiles[focusIdx]?.role}</span>
        {approvedProfiles[focusIdx]?.bio && <p className="text-sm text-slate-300 mt-6 bg-black/40 p-4 rounded-2xl border border-white/5 font-semibold leading-relaxed">"{approvedProfiles[focusIdx].bio}"</p>}
      </ScrollReveal>

      <ScrollReveal className="lg:col-span-2 studio-glass p-8 rounded-[3rem] shadow-2xl max-h-[600px] overflow-y-auto custom-scrollbar border-t border-white/20" delay={200}>
        <h4 className="font-serif font-black text-xl border-b border-white/10 pb-4 mb-6 text-white glow-text-cyan">Production Roster</h4>
        <div className="space-y-3 pr-2">
          {profiles.map((p, i) => (
            <LongPressable 
              key={p.id} 
              onLongPress={() => { if (isAdmin && (p.email || '').toLowerCase() !== ADMIN_EMAIL) setMemberToDelete(p); }}
              className="flex justify-between items-center p-4 studio-input rounded-2xl hover:bg-white/10 hover:border-cyan-500/40 transition-all shadow-sm cursor-pointer"
            >
              <div className="flex items-center space-x-5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 p-0.5 flex items-center justify-center bg-black shadow-inner shrink-0">{renderAvatar(p.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(p.id))}</div>
                <div className="cursor-pointer min-w-0 flex-1" onClick={() => setFocusIdx(approvedProfiles.indexOf(p) !== -1 ? approvedProfiles.indexOf(p) : 0)}>
                  <p className="text-base font-bold text-white truncate hover:text-cyan-400 transition-colors" onClick={() => onInspectUser(p.id)}>{p.name}</p>
                  <span className="text-[10px] font-mono font-bold text-slate-500 block truncate mt-1 tracking-widest uppercase">{p.email} • {p.role} • {p.workCategory}</span>
                </div>
              </div>
            </LongPressable>
          ))}
        </div>
      </ScrollReveal>
      
      {memberToDelete && (
        <LongPressMenu 
          title={`Expel ${memberToDelete.name} from roster?`} 
          onConfirm={removeMember} 
          onCancel={() => setMemberToDelete(null)} 
          confirmText="Confirm Expulsion" 
        />
      )}
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
    <section className="py-4 animate-fadeIn grid grid-cols-1 lg:grid-cols-4 gap-8">
      <ScrollReveal className="lg:col-span-1 studio-glass p-6 rounded-[2.5rem] shadow-2xl space-y-6 border-t border-white/20">
        <div>
          <h4 className="font-serif text-base font-black text-white mb-3">Define Sub-Routine</h4>
          <form onSubmit={handleAddCategory} className="space-y-3">
            <input type="text" value={newCatInput} onChange={(e) => setNewCustomCategory(e.target.value)} placeholder="e.g. CGI Artist" className="w-full px-4 py-3 studio-input rounded-xl text-xs font-bold uppercase tracking-wide" required />
            <button type="submit" className="w-full py-3 btn-cinematic text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Append Tag</button>
          </form>
        </div>
        <div className="pt-5 border-t border-white/10 space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Active Divisions</span>
          {categories.map((cat, idx) => (<button key={idx} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeCategory === cat ? 'bg-red-600/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'studio-input text-slate-400 hover:text-white hover:bg-white/10'}`}>🎬 {cat}</button>))}
        </div>
      </ScrollReveal>

      <ScrollReveal className="lg:col-span-3 studio-glass p-8 rounded-[2.5rem] shadow-2xl space-y-6 border-t border-white/20" delay={200}>
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h3 className="font-serif text-2xl font-black text-white glow-text-red">Division: <span className="text-red-500">{activeCategory}</span></h3>
          <span className="text-xs bg-white/10 border border-white/20 px-4 py-1.5 rounded-lg font-mono font-bold text-white uppercase tracking-widest">{matchedMembers.length} Operatives</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {matchedMembers.map((member, idx) => (
            <ScrollReveal key={member.id} delay={idx * 100} className="flex items-center space-x-4 p-5 studio-input rounded-2xl hover:border-red-500/40 hover:bg-white/5 transition-all cursor-pointer group">
              <div className="w-14 h-14 rounded-full border-2 border-white/20 bg-black overflow-hidden p-0.5 flex items-center justify-center shrink-0">{renderAvatar(member.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(member.id))}</div>
              <div className="min-w-0">
                <h5 className="font-bold text-base text-white truncate group-hover:text-red-400 transition-colors" onClick={() => onInspectUser(member.id)}>{member.name}</h5>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1 truncate">{member.email}</p>
                <span className="inline-block bg-red-900/30 text-red-400 border border-red-500/20 text-[9px] font-black px-2.5 py-1 rounded mt-2 uppercase tracking-widest shadow-sm">{member.role}</span>
              </div>
            </ScrollReveal>
          ))}
          {matchedMembers.length === 0 && <div className="col-span-full py-20 text-center text-slate-500 font-mono font-bold tracking-widest uppercase">No operatives found in this division.</div>}
        </div>
      </ScrollReveal>
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
    }, 2500);
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
      className="relative bg-black w-full max-w-5xl mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden group/player transition-all duration-300 h-auto rounded-2xl max-h-[75vh] border border-white/10"
    >
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          src={hlsUrl} 
          controls={false}
          style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
          className="w-full h-full object-contain cursor-pointer" 
          onLoadedMetadata={handleLoadedMetadata} 
          onTimeUpdate={e => setCurrentTime(e.target.currentTime)} 
          onClick={handleVideoSurfaceClickTracker} 
          playsInline 
        />
      </div>

      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-black/20 to-black/60 transition-opacity duration-500 flex flex-col justify-between p-4 sm:p-6 z-40 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full flex items-center justify-between text-white drop-shadow-2xl select-none">
          <span className="font-serif font-black tracking-widest truncate max-w-[60%] text-sm sm:text-base uppercase">{videoTitle || 'RAW ASSET'}</span>
          <span className="font-mono text-red-400 font-bold bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/30 text-[10px] tracking-widest">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>

        <div className="w-full flex items-center justify-center">
          <button onClick={togglePlay} className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/80 hover:bg-red-500 border-2 border-white/30 flex items-center justify-center text-white text-3xl backdrop-blur-xl transition-all transform active:scale-90 shadow-[0_0_30px_rgba(220,38,38,0.6)]">
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        <div className="w-full flex flex-col gap-4 pointer-events-auto bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative w-full group/scrub h-6 flex items-center" ref={progressBarRef}>
            {hoverTime !== null && (
              <div 
                style={{ left: `${Math.min(Math.max(hoverX, 40), window.innerWidth - 40)}px` }} 
                className="absolute bottom-8 transform -translate-x-1/2 bg-slate-900 border border-red-500 text-white rounded p-1.5 flex flex-col items-center shadow-[0_0_15px_rgba(220,38,38,0.5)] pointer-events-none z-50 w-16 text-center"
              >
                <span className="font-mono text-[10px] text-red-400 font-black">{formatTime(hoverTime)}</span>
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
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-red-600 hover:h-2.5 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between text-white font-mono tracking-widest uppercase">
            <div className="flex items-center gap-3">
              <button onClick={() => skip10(-10)} className="active:text-red-400 text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded transition">⏪ 10s</button>
              <button onClick={() => skip10(10)} className="active:text-red-400 text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded transition">⏩ 10s</button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={cycleZoomScale} className="text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded text-cyan-400 hover:bg-cyan-500/20 transition">
                🔍 {zoomScale === 1 ? 'FIT' : `${zoomScale}X`}
              </button>
              <div className="flex items-center bg-black/80 rounded px-1.5 py-1 gap-1 border border-white/10 text-[9px] font-bold">
                {[1, 1.5, 2].map(speed => (
                  <button key={speed} onClick={() => changeSpeed(speed)} className={`px-2.5 py-1 rounded transition ${playbackSpeed === speed ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}>{speed}x</button>
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
function VideoVault({ videos, projects, userProfile, showToast, isAdmin, pushNotification, activeVideo, setActiveVideo, onInspectUser }) {
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [relatedProjectId, setRelatedProjectId] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [videoToDelete, setVideoToDelete] = useState(null);

  const startUpload = async (e) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrlInput.trim() || !db || !db.app) return;
    
    try {
      await addDoc(collection(db, 'videos'), {
        title: videoTitle.trim(),
        hlsUrl: videoUrlInput.trim(),
        relatedProjectId: relatedProjectId,
        uploaderUid: userProfile.id,
        uploaderName: userProfile.name,
        uploaderAvatar: userProfile.photoURL || '',
        size: "External Managed Stream URL Link",
        comments: [],
        createdAt: Date.now(),
      });
      pushNotification(`Added video link: "${videoTitle}"`, 'video', {}, userProfile.name);
      setVideoTitle(''); setVideoUrlInput(''); setRelatedProjectId(''); setShowUploadModal(false);
      showToast('Video link registered successfully!', 'success');
    } catch (err) { showToast('Upload authorization failure.', 'warning'); }
  };

  const removeVideo = async () => {
    if (!videoToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'videos', videoToDelete));
    if (activeVideo?.id === videoToDelete) setActiveVideo(null);
    setVideoToDelete(null);
    showToast('Video removed from Vault.', 'info');
  };

  const handlePostVideoComment = async (e, videoId) => {
    e.preventDefault();
    if (!db || !db.app) return;
    const commentText = e.target.commentInput.value.trim();
    if (!commentText) return;
    const newComment = { id: 'c_' + Date.now(), authorUid: userProfile.id, authorName: userProfile.name, text: commentText, timestamp: Date.now() };
    await updateDoc(doc(db, 'videos', videoId), { comments: arrayUnion(newComment) });
    pushNotification(`${userProfile.name} commented on video: "${activeVideo.title}"`, 'video', {}, userProfile.name, 'admin');

    e.target.commentInput.value = '';
    const freshDoc = await getDoc(doc(db, 'videos', videoId));
    if (freshDoc.exists()) setActiveVideo({ id: freshDoc.id, ...freshDoc.data() });
    showToast('Feedback published!', 'success');
  };

  const deleteVideoComment = async () => {
    if (!commentToDelete || !db || !db.app) return;
    const { videoId, commentId, currentComments } = commentToDelete;
    const updatedComments = currentComments.filter(c => c.id !== commentId);
    await updateDoc(doc(db, 'videos', videoId), { comments: updatedComments });
    const freshDoc = await getDoc(doc(db, 'videos', videoId));
    if (freshDoc.exists()) setActiveVideo({ id: freshDoc.id, ...freshDoc.data() });
    setCommentToDelete(null);
    showToast('Comment deleted.', 'info');
  };

  if (activeVideo) {
    const embed = resolvePlayableVideo(activeVideo.hlsUrl);
    const timeLeft = getExpiry7(activeVideo.createdAt);
    
    return (
      <ScrollReveal className="studio-glass min-h-[85vh] sm:rounded-[3rem] border-t border-white/20 shadow-2xl flex flex-col font-sans relative z-30 overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <button onClick={() => setActiveVideo(null)} className="p-3 hover:bg-white/10 bg-black/40 rounded-full transition shadow-sm border border-white/10 text-slate-300 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <span className="font-serif font-black text-white text-xl tracking-widest uppercase glow-text-red">Archive Storage</span>
        </div>

        {embed.type === 'iframe-stream' && (
          <div className="px-6 py-4 bg-red-900/30 backdrop-blur border-b border-red-500/20 flex items-center justify-between gap-4 shadow-inner">
            <span className="text-red-400 font-mono font-bold tracking-widest text-[10px] uppercase">⚠ Format Mismatch Detected</span>
            <button 
              type="button"
              onClick={() => {
                const wrapper = document.getElementById('iframe-aspect-container');
                if (wrapper) {
                  if (wrapper.classList.contains('aspect-video')) {
                    wrapper.classList.remove('aspect-video', 'max-h-[75vh]');
                    wrapper.classList.add('aspect-[9/16]', 'max-w-md', 'mx-auto');
                  } else {
                    wrapper.classList.remove('aspect-[9/16]', 'max-w-md', 'mx-auto');
                    wrapper.classList.add('aspect-video', 'max-h-[75vh]');
                  }
                }
              }}
              className="bg-black/50 text-white font-bold px-5 py-2 rounded border border-white/20 text-[10px] tracking-widest uppercase transition hover:bg-white/10"
            >
              Force Layout Shift
            </button>
          </div>
        )}

        <div className="w-full bg-black/80 shadow-[0_10px_50px_rgba(0,0,0,0.9)] relative p-2 sm:p-8 backdrop-blur-3xl border-b border-white/5">
          {embed.type === 'youtube' ? (
             <div className="w-full relative aspect-video max-h-[75vh] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10">
               <iframe src={embed.src} className="absolute top-0 left-0 w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
             </div>
          ) : embed.type === 'direct' ? (
             <CustomVideoPlayer hlsUrl={embed.src} videoTitle={activeVideo.title} />
          ) : embed.type === 'iframe-stream' ? (
             <div id="iframe-aspect-container" className="w-full relative aspect-video max-h-[75vh] transition-all duration-700 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10">
               <iframe src={embed.src} className="absolute top-0 left-0 w-full h-full border-none bg-[#050508]" allow="autoplay; encrypted-media" allowFullScreen />
             </div>
          ) : (
             <CustomVideoPlayer hlsUrl={activeVideo.hlsUrl} videoTitle={activeVideo.title} />
          )}
        </div>

        <div className="p-8 border-b border-white/10">
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4 font-serif uppercase tracking-wider">{activeVideo.title}</h1>
          <div className="flex justify-between items-center text-sm">
            <span className="font-mono text-slate-500 font-bold tracking-widest">{formatDateTimeAMPM(activeVideo.createdAt)}</span>
            <span className="bg-red-500/20 text-red-500 font-mono font-black px-4 py-1.5 rounded border border-red-500/30 uppercase tracking-widest">TTL: {timeLeft}</span>
          </div>
          
          <div className="flex items-center gap-5 mt-6 pt-6 border-t border-white/10">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 p-0.5 bg-black shrink-0">{renderAvatar(activeVideo.uploaderAvatar || PRESET_AVATARS[0].svg, "w-full h-full object-cover rounded-full", () => onInspectUser(activeVideo.uploaderUid))}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-white text-lg hover:text-red-400 transition-colors cursor-pointer" onClick={() => onInspectUser(activeVideo.uploaderUid)}>{activeVideo.uploaderName}</h4>
              <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-1">{activeVideo.size}</p>
            </div>
            {(isAdmin || activeVideo.uploaderUid === userProfile?.id) && (
              <button onClick={() => setVideoToDelete(activeVideo.id)} className="studio-input text-rose-500 hover:text-white hover:bg-rose-600 text-xs font-black px-5 py-2.5 rounded uppercase tracking-widest transition border border-rose-500/30 shadow-md">Purge File</button>
            )}
          </div>
        </div>

        <div className="p-8 flex-1 bg-white/5 rounded-b-[3rem]">
          <h3 className="font-mono font-bold text-xs text-slate-400 mb-6 uppercase tracking-[0.2em]">Attached Notes ({activeVideo.comments?.length || 0})</h3>
          <form onSubmit={(e) => handlePostVideoComment(e, activeVideo.id)} className="flex gap-4 mb-10">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 p-0.5 bg-black shrink-0 hidden sm:block">{renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}</div>
            <input type="text" name="commentInput" placeholder="Enter feedback string..." className="flex-1 px-5 py-3 studio-input rounded-xl text-sm font-bold text-white focus:outline-none placeholder-slate-600" required />
            <button type="submit" className="btn-cinematic text-white text-xs px-8 rounded-xl font-black uppercase tracking-widest">Append</button>
          </form>

          <div className="space-y-4 pb-10">
            {(activeVideo.comments || []).map((comment, idx) => (
              <ScrollReveal key={comment.id} delay={idx * 50}>
                <LongPressable
                  onLongPress={() => { if (isAdmin || comment.authorName === userProfile?.name) setCommentToDelete({ videoId: activeVideo.id, currentComments: activeVideo.comments, commentId: comment.id }); }}
                  className="text-sm flex items-start gap-4 studio-input p-5 rounded-2xl hover:bg-white/10 cursor-pointer transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="font-black text-white hover:text-cyan-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); onInspectUser(comment.authorUid); }}>{comment.authorName}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest">{formatTimeAMPM(comment.timestamp)}</span>
                    </div>
                    <span className="text-slate-300 font-semibold break-words leading-relaxed">{comment.text}</span>
                  </div>
                </LongPressable>
              </ScrollReveal>
            ))}
            {(!activeVideo.comments || activeVideo.comments.length === 0) && <div className="text-xs text-slate-500 font-mono font-bold tracking-widest uppercase text-center py-16 italic studio-input rounded-2xl border-dashed">No notation logs found for this master.</div>}
          </div>
        </div>
        
        {commentToDelete && (
          <LongPressMenu title="Purge this note?" onConfirm={deleteVideoComment} onCancel={() => setCommentToDelete(null)} confirmText="Purge" />
        )}
        {videoToDelete && (
          <LongPressMenu title={`Purge master file "${activeVideo.title}"?`} onConfirm={removeVideo} onCancel={() => setVideoToDelete(null)} confirmText="Purge File" />
        )}
      </ScrollReveal>
    );
  }

  return (
    <section className="py-4 animate-fadeIn space-y-8 font-sans px-4 sm:px-0">
      <ScrollReveal className="flex justify-between items-center studio-glass p-6 sm:p-8 rounded-[2rem] shadow-2xl border-t border-white/20 gap-4">
        <h2 className="font-serif text-2xl font-black text-white glow-text-red uppercase tracking-wider">🎬 Cloud Video Vault</h2>
        <button onClick={() => setShowUploadModal(true)} className="btn-cinematic text-white font-black text-[10px] sm:text-xs px-6 py-3 rounded-xl shadow-lg transition font-mono tracking-widest uppercase">Link Target Asset</button>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {videos.map((vid, idx) => {
          const embed = resolvePlayableVideo(vid.hlsUrl);
          const timeLeft = getExpiry7(vid.createdAt);
          
          const templateBgStyle = vid.title.toLowerCase().includes('edit') 
            ? 'from-cyan-900/80 to-blue-900/90' 
            : 'from-red-900/80 to-rose-900/90';

          return (
            <ScrollReveal key={vid.id} delay={idx * 100}>
              <div onClick={() => setActiveVideo(vid)} className="studio-glass border-t border-white/20 rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-[0_20px_50px_rgba(220,38,38,0.2)] hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex flex-col h-full">
                <div className="w-full aspect-video bg-black relative flex items-center justify-center overflow-hidden border-b border-white/10">
                  {embed.thumbnail ? (
                    <img src={embed.thumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-60 group-hover:opacity-90" />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${templateBgStyle} group-hover:scale-105 transition-transform duration-1000 flex flex-col items-center justify-center p-5 text-center select-none`}>
                      <span className="text-5xl mb-3 filter drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">📼</span>
                      <span className="text-base font-serif font-black tracking-widest text-white uppercase line-clamp-2 px-3">{vid.title}</span>
                      <div className="mt-4 flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-1.5 rounded border border-white/10 shadow-inner">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                        <span className="text-[9px] font-mono tracking-widest text-slate-300 font-bold uppercase">Format OK</span>
                      </div>
                    </div>
                  )}
                  <div className="relative z-10 w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-red-600 group-hover:scale-110 group-hover:border-red-400 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]"><div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1"></div></div>
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-red-400 border border-red-500/30 text-[9px] font-bold font-mono tracking-widest uppercase px-3 py-1 rounded shadow-lg">TTL: {timeLeft}</div>
                </div>

                <div className="p-6 flex flex-col justify-between flex-1">
                  <h3 className="font-serif font-black text-white text-lg leading-tight line-clamp-2 group-hover:text-red-400 transition-colors mb-4">{vid.title}</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-black border border-white/20 shadow-inner">{renderAvatar(vid.uploaderAvatar || PRESET_AVATARS[0].svg, "w-full h-full object-cover", (e) => { e.stopPropagation(); onInspectUser(vid.uploaderUid); })}</div>
                    <div className="text-slate-400 text-[10px] font-mono font-bold uppercase tracking-widest truncate flex-1">{vid.uploaderName} <br/> {vid.comments?.length || 0} Annotations</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
      {videos.length === 0 && <ScrollReveal><div className="text-center text-slate-500 font-mono tracking-widest py-24 uppercase studio-input rounded-[3rem] border-dashed border-white/20">The database is currently empty.</div></ScrollReveal>}

      {showUploadModal && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <form onSubmit={startUpload} className="studio-glass border-t border-white/20 p-8 rounded-[3rem] w-full max-w-md space-y-6 font-sans shadow-2xl animate-sweepUp">
            <div className="border-b border-white/10 pb-4 mb-4">
              <h4 className="font-serif font-black text-white text-xl uppercase tracking-widest glow-text-red">Establish Link</h4>
              <p className="text-[10px] font-mono text-slate-400 mt-2 uppercase tracking-wide">Input raw media URL for pipeline integration.</p>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Asset Designation</label>
              <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="w-full px-4 py-3 studio-input rounded-xl text-sm font-bold text-white placeholder-slate-600 transition-all" placeholder="e.g. Master Edit V3" required />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">External Target URL</label>
              <input type="url" value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} className="w-full px-4 py-3 studio-input rounded-xl text-sm font-bold text-white placeholder-slate-600 transition-all" placeholder="https://..." required />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Attach to Board (Opt)</label>
              <select value={relatedProjectId} onChange={e => setRelatedProjectId(e.target.value)} className="w-full px-4 py-3 studio-input rounded-xl text-sm font-bold text-slate-300 transition-all">
                <option value="">-- Standalone Asset --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="flex gap-4 justify-end pt-4 border-t border-white/10">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-6 py-2.5 studio-input hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition">Abort</button>
              <button type="submit" className="px-6 py-2.5 btn-cinematic text-white font-bold text-xs rounded-xl uppercase tracking-widest transition">Initialize Link</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// --- PROJECT BOARD ---
function ProjectBoard({ projects, tasks, videos, scripts, posts, userProfile, showToast, selectedProject, setSelectedProject, pushNotification, isAdmin }) {
  const [newConcept, setNewConcept] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [boardTab, setBoardTab] = useState('progress');
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const createConcept = async (e) => {
    e.preventDefault();
    if (!newConcept.trim() || !db || !db.app) return;
    try {
      await addDoc(collection(db, 'projects'), { title: newConcept, creatorName: userProfile.name, createdAt: Date.now() });
      pushNotification(`Initiated new operation: "${newConcept}"`, 'project', {}, userProfile.name);
      setNewConcept(''); showToast('Operation board established!', 'success');
    } catch(err) {}
  };

  const activeTasks = useMemo(() => (tasks || []).filter(t => t.projectId === selectedProject?.id), [tasks, selectedProject]);
  
  const projectVideos = useMemo(() => (videos || []).filter(v => v.relatedProjectId === selectedProject?.id), [videos, selectedProject]);
  const projectScripts = useMemo(() => (scripts || []).filter(s => s.relatedProjectId === selectedProject?.id), [scripts, selectedProject]);
  const projectPosts = useMemo(() => (posts || []).filter(p => p.relatedProjectId === selectedProject?.id), [posts, selectedProject]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !db || !db.app) return;
    try {
      await addDoc(collection(db, 'tasks'), { projectId: selectedProject.id, title: taskTitle, status: 'Pending' });
      setTaskTitle('');
    } catch(err) {}
  };

  const removeProject = async () => {
    if (!projectToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'projects', projectToDelete));
    if (selectedProject?.id === projectToDelete) setSelectedProject(null); 
    setProjectToDelete(null);
    showToast('Operation board purged.', 'info');
  };

  const removeTask = async () => { 
    if (!taskToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'tasks', taskToDelete)); 
    setTaskToDelete(null);
    showToast('Task removed from queue.', 'info');
  };

  const toggleTaskStatus = async (task) => {
    if (!db || !db.app) return;
    const nextStatus = task.status === 'Pending' ? 'Resolved' : 'Pending';
    await updateDoc(doc(db, 'tasks', task.id), { status: nextStatus });
    showToast(`Task status: ${nextStatus}`, 'success');
  };

  return (
    <section className="py-4 animate-fadeIn font-sans">
      {!selectedProject ? (
        <div className="space-y-10 font-sans">
          <ScrollReveal>
            <form onSubmit={createConcept} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4 studio-glass p-6 rounded-[2rem] shadow-2xl border-t border-white/20">
              <input type="text" value={newConcept} onChange={e => setNewConcept(e.target.value)} placeholder="Establish new operation vector..." className="flex-1 px-5 py-3 studio-input rounded-xl text-sm font-bold text-white placeholder-slate-500 transition-all" required />
              <button type="submit" className="px-8 py-3 btn-cinematic text-white text-xs rounded-xl font-black uppercase tracking-widest shadow-lg transition">Deploy</button>
            </form>
          </ScrollReveal>
          
          <ScrollReveal className="p-8 sm:p-12 border border-white/10 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] rounded-[3rem] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 animate-fadeIn backdrop-blur-sm" style={{ background: 'rgba(5,5,8,0.6)', backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            {projects.map((p, idx) => (
              <ScrollReveal key={p.id} delay={idx * 50}>
                <LongPressable 
                  onClick={() => setSelectedProject(p)} 
                  onLongPress={() => { if (isAdmin) setProjectToDelete(p.id); }}
                  className="studio-input p-6 rounded-[2rem] cursor-pointer shadow-xl hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(6,182,212,0.15)] hover:border-cyan-500/40 transition-all duration-500 relative border border-white/10 h-full flex flex-col justify-between group"
                >
                  <span className="text-3xl drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] mb-4 block group-hover:scale-110 transition-transform">📂</span>
                  <div className="font-serif font-black text-white text-lg line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors">{p.title}</div>
                  <div className="text-[9px] text-slate-500 font-bold mt-5 font-mono tracking-widest uppercase border-t border-white/10 pt-3">TTL: {getExpiry30(p.createdAt)}</div>
                </LongPressable>
              </ScrollReveal>
            ))}
            {projects.length === 0 && <div className="col-span-full text-center py-20 font-mono tracking-widest uppercase text-slate-500 text-sm">No operations currently active in database.</div>}
          </ScrollReveal>
        </div>
      ) : (
        <ScrollReveal className="space-y-6 studio-glass p-6 sm:p-10 rounded-[3rem] shadow-2xl animate-fadeIn border-t border-white/20">
          <div className="flex justify-between items-center border-b border-white/10 pb-5">
            <button onClick={() => setSelectedProject(null)} className="text-[10px] font-black text-white hover:text-cyan-400 uppercase tracking-widest transition bg-white/5 hover:bg-white/10 px-4 py-2 rounded shadow-sm border border-white/10">◀ Exit Terminal</button>
          </div>
          
          <div>
            <h3 className="font-serif text-3xl sm:text-5xl font-black text-white drop-shadow-lg uppercase tracking-wider">{selectedProject.title}</h3>
            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase mt-3 bg-cyan-900/20 inline-block px-3 py-1 rounded border border-cyan-500/30">Auto-Purge: {getExpiry30(selectedProject.createdAt)}</p>
          </div>
          
          <div className="flex gap-8 border-b border-white/10 mt-8 pt-4">
            <button onClick={() => setBoardTab('progress')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors ${boardTab === 'progress' ? 'border-b-[3px] border-cyan-500 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>Execution Queue</button>
            <button onClick={() => setBoardTab('resources')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-colors flex gap-2 items-center ${boardTab === 'resources' ? 'border-b-[3px] border-cyan-500 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
              Linked Assets
              {(projectVideos.length + projectScripts.length + projectPosts.length) > 0 && (
                <span className="bg-cyan-500 text-black text-[9px] px-2 py-0.5 rounded shadow-[0_0_10px_rgba(6,182,212,0.5)]">{projectVideos.length + projectScripts.length + projectPosts.length}</span>
              )}
            </button>
          </div>

          {boardTab === 'progress' ? (
            <div className="pt-4">
              <div className="space-y-3 mt-2">
                {activeTasks.map((t) => (
                  <LongPressable 
                    key={t.id} 
                    onLongPress={() => { if (isAdmin) setTaskToDelete(t.id); }}
                    className="py-4 px-5 flex justify-between items-center group cursor-pointer hover:bg-white/10 studio-input rounded-2xl transition-all shadow-sm border border-white/5 hover:border-cyan-500/30"
                  >
                    <span className={`text-sm font-semibold tracking-wide ${t.status === 'Resolved' ? 'line-through text-slate-600' : 'text-slate-200'} transition-all`}>{t.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(t); }} className={`text-[9px] px-4 py-1.5 rounded uppercase tracking-widest font-black shadow transition-all active:scale-95 ${t.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'}`}>{t.status}</button>
                  </LongPressable>
                ))}
                {activeTasks.length === 0 && <p className="text-slate-500 font-mono tracking-widest uppercase text-center py-10 text-xs border border-dashed border-white/10 rounded-2xl">No vectors added to queue.</p>}
              </div>
              
              <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-3 pt-8 mt-6 border-t border-white/10">
                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Define new execution parameter..." className="flex-1 px-5 py-3 studio-input rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all" required />
                <button type="submit" className="px-8 py-3 bg-white text-black text-xs rounded-xl font-black uppercase tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-slate-200 transition">Append</button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              {projectVideos.map((v, i) => (
                <ScrollReveal key={v.id} delay={i*50} className="flex items-center p-5 studio-input rounded-2xl border border-white/10 hover:border-cyan-500/40 hover:bg-white/5 transition-all shadow-md cursor-pointer">
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1.5 rounded font-black mr-4 uppercase tracking-widest shrink-0 border border-red-500/30">📼 Video</span>
                  <span className="font-bold text-sm text-slate-200 flex-1 truncate">{v.title}</span>
                </ScrollReveal>
              ))}
              {projectScripts.map((s, i) => (
                <ScrollReveal key={s.id} delay={i*50} className="flex items-center p-5 studio-input rounded-2xl border border-white/10 hover:border-cyan-500/40 hover:bg-white/5 transition-all shadow-md cursor-pointer">
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded font-black mr-4 uppercase tracking-widest shrink-0 border border-blue-500/30">📝 Script</span>
                  <span className="font-bold text-sm text-slate-200 flex-1 truncate">{s.title}</span>
                </ScrollReveal>
              ))}
              {projectPosts.map((p, i) => (
                <ScrollReveal key={p.id} delay={i*50} className="flex items-center p-5 studio-input rounded-2xl border border-white/10 hover:border-cyan-500/40 hover:bg-white/5 transition-all shadow-md cursor-pointer">
                  <span className="text-[10px] bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded font-black mr-4 uppercase tracking-widest shrink-0 border border-purple-500/30">📸 Image</span>
                  <span className="font-bold text-sm text-slate-200 flex-1 truncate">{p.title}</span>
                </ScrollReveal>
              ))}
              {(!projectVideos.length && !projectScripts.length && !projectPosts.length) && (
                <div className="col-span-full text-center text-slate-500 font-mono tracking-widest uppercase py-20 text-xs border border-dashed border-white/10 rounded-2xl">No assets currently linked to this node.</div>
              )}
            </div>
          )}
        </ScrollReveal>
      )}
      
      {projectToDelete && (
        <LongPressMenu title="Purge this Operational Board entirely?" onConfirm={removeProject} onCancel={() => setProjectToDelete(null)} confirmText="Purge Board" />
      )}
      {taskToDelete && (
        <LongPressMenu title="Purge this queue parameter?" onConfirm={removeTask} onCancel={() => setTaskToDelete(null)} confirmText="Purge Task" />
      )}
    </section>
  );
}

// --- SCRIPTS WORKSPACE ---
function ScriptsWorkspace({ scripts, projects, userProfile, isAdmin, showToast, pushNotification }) {
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [relatedProjectId, setRelatedProjectId] = useState('');
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);

  const selectedScript = useMemo(() => (scripts || []).find(s => s.id === selectedScriptId) || null, [scripts, selectedScriptId]);

  useEffect(() => {
    if (selectedScript && !isEditingBody) {
      setDraftText(selectedScript.content || '');
    }
  }, [selectedScript, isEditingBody]);

  const canEditSelected = selectedScript && userProfile;

  useEffect(() => {
    if (!isEditingBody || !selectedScript || !canEditSelected || !db || !db.app) return;
    if (draftText === selectedScript.content) return; 

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await updateDoc(doc(db, 'scripts', selectedScript.id), {
          content: draftText,
          updatedAt: Date.now(),
          lastEditedBy: userProfile.name
        });
      } catch (err) {
        console.error("Auto-save error", err);
      } finally {
        setSaving(false);
      }
    }, 800); 

    return () => clearTimeout(timer);
  }, [draftText, isEditingBody, selectedScript, canEditSelected, userProfile]);

  const createTopic = async (e) => {
    e.preventDefault();
    const clean = newTopicTitle.trim();
    if (!clean || !db || !db.app) return;
    try {
      const ref = await addDoc(collection(db, 'scripts'), { 
        title: clean, 
        content: '', 
        relatedProjectId: relatedProjectId,
        authorUid: userProfile.id, 
        authorName: userProfile.name, 
        createdAt: Date.now(), 
        updatedAt: Date.now() 
      });
      pushNotification(`Drafted manuscript: "${clean}"`, 'script', {}, userProfile.name);
      setNewTopicTitle(''); setRelatedProjectId(''); setShowNewTopicModal(false);
      setSelectedScriptId(ref.id); setIsEditingBody(true); setDraftText('');
      showToast('Manuscript initialized!', 'success');
    } catch(err) {
      showToast('Failed to initialize manuscript.', 'warning');
    }
  };

  const removeTopic = async () => {
    if (!topicToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'scripts', topicToDelete));
    if (selectedScriptId === topicToDelete) { setSelectedScriptId(null); setIsEditingBody(false); }
    setTopicToDelete(null);
    showToast('Manuscript purged.', 'info');
  };

  return (
    <section className="py-4 animate-fadeIn font-sans space-y-8">
      <ScrollReveal className="flex justify-between items-center studio-glass p-6 sm:p-8 rounded-[2rem] shadow-2xl border-t border-white/20">
        <h3 className="font-serif font-black text-white text-xl sm:text-2xl uppercase tracking-widest glow-text-cyan">📝 Manuscript Database</h3>
        <button onClick={() => setShowNewTopicModal(true)} className="bg-cyan-600/20 text-cyan-400 font-black text-[10px] sm:text-xs px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-600/40 transition border border-cyan-500/50 uppercase tracking-widest">Create Entry</button>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ScrollReveal className="lg:col-span-1 studio-glass p-6 rounded-[2.5rem] shadow-2xl space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar border-t border-white/20" delay={200}>
          {scripts.map(s => (
            <LongPressable 
              key={s.id} 
              onClick={() => { setSelectedScriptId(s.id); setIsEditingBody(false); }} 
              onLongPress={() => { if (isAdmin || s.authorUid === userProfile?.id) setTopicToDelete(s.id); }}
              className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex justify-between items-start gap-4 shadow-md ${selectedScriptId === s.id ? 'border-cyan-500 bg-cyan-900/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-white/10 studio-input hover:border-cyan-500/50 hover:bg-white/10'}`}
            >
              <div className="min-w-0">
                <p className={`text-base font-black truncate ${selectedScriptId === s.id ? 'text-white' : 'text-slate-300'}`}>{s.title}</p>
                <span className={`text-[9px] font-mono font-bold block mt-2 uppercase tracking-widest ${selectedScriptId === s.id ? 'text-cyan-400' : 'text-slate-500'}`}>By {s.authorName} • TTL: {getExpiry30(s.createdAt)}</span>
              </div>
            </LongPressable>
          ))}
          {scripts.length === 0 && <div className="text-center text-slate-500 font-mono tracking-widest py-20 text-xs border border-dashed border-white/10 rounded-2xl uppercase">Database Empty.</div>}
        </ScrollReveal>

        <ScrollReveal className="lg:col-span-2 studio-glass p-8 sm:p-10 rounded-[3rem] shadow-2xl border-t border-white/20 h-[600px] flex flex-col" delay={400}>
          {!selectedScript ? (
            <div className="text-center text-slate-500 font-mono tracking-widest uppercase m-auto text-sm">Select an entry to begin readout.</div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-6 shrink-0">
                <div>
                  <h3 className="font-serif text-3xl font-black text-white glow-text-cyan drop-shadow-md">{selectedScript.title}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    {selectedScript.lastEditedBy && <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Override by {selectedScript.lastEditedBy}</p>}
                    <span className="bg-red-500/20 text-red-400 text-[9px] px-3 py-1 rounded border border-red-500/40 font-black tracking-widest uppercase">TTL: {getExpiry30(selectedScript.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  {canEditSelected && !isEditingBody && <button onClick={() => setIsEditingBody(true)} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-5 py-2 hover:bg-cyan-500/20 transition shadow-sm">✎ Input Mode</button>}
                  {isEditingBody && (
                    <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                      <span className="text-[10px] font-mono text-slate-400 font-black uppercase tracking-widest">{saving ? '⏳ Syncing...' : '✅ Synced'}</span>
                      <button onClick={() => setIsEditingBody(false)} className="text-[10px] font-black uppercase tracking-widest text-white bg-white/10 border border-white/20 rounded px-4 py-1 hover:bg-white/20 transition">Lock</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isEditingBody ? (
                  <div className="animate-fadeIn h-full">
                    <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Begin text input... (Auto-syncs via secure channel)" className="w-full h-full min-h-[300px] px-6 py-5 studio-input border border-white/10 rounded-2xl text-base text-slate-200 font-semibold focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none font-sans leading-relaxed custom-scrollbar shadow-inner resize-none placeholder-slate-600" autoFocus />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-lg text-slate-300 font-medium leading-loose font-sans p-6 rounded-2xl border border-white/5 bg-white/5 shadow-inner min-h-[300px]">
                    {selectedScript.content ? selectedScript.content : <span className="italic text-slate-600 font-mono text-sm tracking-widest uppercase">End of file. Awaiting input.</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollReveal>
      </div>

      {showNewTopicModal && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <form onSubmit={createTopic} className="studio-glass p-8 rounded-[3rem] border-t border-white/20 w-full max-w-md space-y-6 font-sans shadow-2xl animate-sweepUp">
            <h4 className="font-serif font-black text-white text-xl uppercase tracking-widest border-b border-white/10 pb-4 glow-text-cyan">New Manuscript</h4>
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Designation</label>
              <input type="text" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} placeholder="e.g. Operation Alpha Script" className="w-full px-5 py-3 studio-input rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-white placeholder-slate-600 shadow-inner transition-all" required autoFocus />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Attach to Board (Opt)</label>
              <select value={relatedProjectId} onChange={e => setRelatedProjectId(e.target.value)} className="w-full px-5 py-3 studio-input rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-slate-300 shadow-inner transition-all">
                <option value="">-- Unlinked --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="flex gap-4 justify-end pt-4 border-t border-white/10">
              <button type="button" onClick={() => setShowNewTopicModal(false)} className="px-6 py-2.5 studio-input text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition shadow-sm">Abort</button>
              <button type="submit" className="px-6 py-2.5 bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-500/40 text-cyan-400 font-black text-xs uppercase tracking-widest rounded-xl transition shadow-[0_0_15px_rgba(6,182,212,0.3)]">Initialize</button>
            </div>
          </form>
        </div>
      )}
      
      {topicToDelete && (
        <LongPressMenu title="Purge this manuscript?" onConfirm={removeTopic} onCancel={() => setTopicToDelete(null)} confirmText="Purge File" />
      )}
    </section>
  );
}

// --- CHATROOM ---
function WhiteboardChat({ chats, userProfile, chatChannel, setChatChannel, pushNotification, siteSettings, isAdmin, showToast, onInspectUser, viewMode, setViewMode }) {
  const [inputText, setInputText] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [channelToDelete, setChannelToDelete] = useState(null);

  const messagesEndRef = useRef(null);
  const channels = siteSettings.chatChannels || [{ id: 'general', name: '🌍 Studio Room' }];

  const openChannel = (id) => { setChatChannel(id); setViewMode('chat'); };

  const channelChats = useMemo(() => {
    return (chats || [])
      .filter(c => c.projectId === chatChannel)
      .sort((a, b) => a.createdAt - b.createdAt); 
  }, [chats, chatChannel]);

  useEffect(() => {
    if (viewMode === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [channelChats, viewMode]);

  const channelPreviews = useMemo(() => {
    return channels.map(ch => {
      const allThisChannel = (chats || []).filter(c => c.projectId === ch.id).sort((a, b) => b.createdAt - a.createdAt);
      const last = allThisChannel[0];
      return { ...ch, lastMessage: last?.text || 'No messages yet', lastSender: last?.senderName || '', lastTime: last?.createdAt || null };
    }).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
  }, [channels, chats]);

  const groupedChats = useMemo(() => {
    const groups = [];
    let currentGroup = [];
    
    channelChats.forEach((msg) => {
      if (currentGroup.length === 0) {
        currentGroup.push(msg);
      } else {
        const lastMsg = currentGroup[currentGroup.length - 1];
        const isSameSender = msg.senderUid === lastMsg.senderUid;
        const isCloseTime = (msg.createdAt - lastMsg.createdAt) < (5 * 60 * 1000); 

        if (isSameSender && isCloseTime) {
          currentGroup.push(msg);
        } else {
          groups.push([...currentGroup]);
          currentGroup = [msg];
        }
      }
    });
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  }, [channelChats]);

  const commit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !db || !db.app) return;
    const text = inputText.trim();
    
    setInputText(''); 
    
    try {
      const chatDocRef = await addDoc(collection(db, 'chats'), {
        projectId: chatChannel, text, senderName: userProfile?.name || 'Guest Creator', senderUid: userProfile?.id || 'guest-uid', createdAt: Date.now(),
      });
      pushNotification(`"${text.length > 50 ? text.slice(0, 50) + '…' : text}"`, 'chat', { channelId: chatChannel, chatId: chatDocRef.id }, userProfile?.name || 'Guest Creator', 'all');
    } catch (err) {}
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const clean = newChannelName.trim();
    if (!clean || !db || !db.app) return;
    try {
      const newId = 'ch_' + Date.now();
      await setDoc(doc(db, 'meta/settings'), { chatChannels: [...channels, { id: newId, name: clean }] }, { merge: true });
      setNewChannelName(''); setShowNewGroupModal(false); showToast("Link established!", "success");
      openChannel(newId);
    } catch (err) {}
  };

  const removeChannel = async () => {
    if (!channelToDelete || !db || !db.app) return;
    try {
      await setDoc(doc(db, 'meta/settings'), { chatChannels: channels.filter(c => c.id !== channelToDelete) }, { merge: true });
      if (chatChannel === channelToDelete) { setChatChannel('general'); setViewMode('list'); }
      setChannelToDelete(null);
      showToast("Link severed!", "info");
    } catch (err) {}
  };

  const deleteMessage = async (msgId) => {
    if (!db || !db.app) return;
    
    const msgToDelete = chats.find(c => c.id === msgId);
    await deleteDoc(doc(db, 'chats', msgId));
    setActiveMessageMenu(null);
    
    try {
      const notifsRef = collection(db, 'notifications');
      const q = query(notifsRef, where('type', '==', 'chat'));
      const snap = await getDocs(q);
      
      const toDelete = snap.docs.filter(d => {
        const data = d.data();
        if (data.meta && data.meta.chatId === msgId) return true;
        if (msgToDelete && data.actor === msgToDelete.senderName) {
          const truncated = msgToDelete.text.length > 50 ? msgToDelete.text.slice(0, 50) + '…' : msgToDelete.text;
          if (data.message === `"${truncated}"`) return true;
        }
        return false;
      });
      await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
    } catch (err) { console.error("Cleanup error:", err); }
    showToast("Transmission redacted.", "info");
  };

  const saveEditedMessage = async () => {
    if (!editingMessageText.trim() || !editingMessageId || !db || !db.app) return;
    try {
      await updateDoc(doc(db, 'chats', editingMessageId), { text: editingMessageText.trim() });
      setEditingMessageId(null); setEditingMessageText(''); setActiveMessageMenu(null); showToast("Transmission altered!", "success");
    } catch (e) { showToast("Access restricted.", "warning"); }
  };

  const copyMessageText = (txt) => {
    try {
      const container = document.createElement('textarea');
      container.value = txt; container.style.position = 'fixed'; document.body.appendChild(container); container.select(); document.execCommand('copy'); document.body.removeChild(container);
      showToast("Decrypted to clipboard!", "success");
    } catch (e) { showToast("Clipboard offline.", "warning"); }
    setActiveMessageMenu(null);
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const initialOf = (name) => (name || '#').replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase() || '#';
  const activeChannelObj = channels.find(c => c.id === chatChannel);

  return (
    <ScrollReveal className="studio-glass border-t border-white/20 rounded-[3rem] h-[80vh] overflow-hidden shadow-2xl animate-fadeIn font-sans flex flex-col">
      {viewMode === 'list' ? (
        <>
          <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40">
            <h3 className="font-serif font-black text-white text-xl uppercase tracking-widest glow-text-cyan">💬 Comms Link</h3>
            <button onClick={() => setShowNewGroupModal(true)} className="btn-cinematic text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-lg transition">Create Node</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {channelPreviews.map(ch => (
              <LongPressable 
                key={ch.id} 
                onClick={() => openChannel(ch.id)} 
                onLongPress={() => { if (isAdmin && ch.id !== 'general') setChannelToDelete(ch.id); }}
                className="flex items-center gap-5 p-5 mb-3 studio-input border border-white/5 hover:border-white/20 rounded-2xl hover:bg-white/5 cursor-pointer transition shadow-md group"
              >
                <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white font-serif font-black text-xl shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-white/20 transition-all">
                  {initialOf(ch.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-lg text-white truncate group-hover:text-cyan-400 transition-colors uppercase tracking-wider">{ch.name}</span>
                    {ch.lastTime && <span className="text-[10px] text-slate-500 font-mono font-bold shrink-0 ml-3 uppercase tracking-widest">{timeAgo(ch.lastTime)}</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-400 truncate mt-1">{ch.lastSender ? `${ch.lastSender}: ` : ''}{ch.lastMessage}</p>
                </div>
              </LongPressable>
            ))}
            {channelPreviews.length === 0 && <div className="text-center text-slate-500 font-mono uppercase tracking-widest py-20 text-xs border border-dashed border-white/10 rounded-3xl m-4">No active links.</div>}
          </div>
        </>
      ) : (
        <>
          <div className="p-5 border-b border-white/10 flex items-center gap-5 shrink-0 bg-black/60 backdrop-blur-xl z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <button onClick={() => setViewMode('list')} className="p-2 hover:bg-white/10 bg-white/5 rounded-full transition shadow-sm border border-white/10 text-slate-300 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-cyan-400 font-serif font-black text-lg shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-500/30">
              {initialOf(activeChannelObj?.name)}
            </div>
            <span className="font-serif font-black text-white text-xl truncate uppercase tracking-widest glow-text-cyan">{activeChannelObj?.name}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-0 bg-[#020203]/50">
            {groupedChats.map((group, gIdx) => {
               const isMe = group[0].senderUid === userProfile?.id;
               const senderName = group[0].senderName;

               return (
                 <div key={gIdx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                   {!isMe && <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-bold mb-2 ml-3">{senderName}</span>}

                   <div className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%]`}>
                      {group.map((m, i) => {
                         const isFirst = i === 0;
                         const isLast = i === group.length - 1;
                         
                         let corners = 'rounded-2xl';
                         if (isMe) {
                            if (group.length > 1) {
                               if (isFirst) corners = 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm';
                               else if (isLast) corners = 'rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl';
                               else corners = 'rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-sm';
                            } else {
                                corners = 'rounded-2xl rounded-br-sm';
                            }
                         } else {
                             if (group.length > 1) {
                               if (isFirst) corners = 'rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-sm';
                               else if (isLast) corners = 'rounded-tr-2xl rounded-tl-sm rounded-br-2xl rounded-bl-2xl';
                               else corners = 'rounded-tr-2xl rounded-tl-sm rounded-br-2xl rounded-bl-sm';
                            } else {
                                corners = 'rounded-2xl rounded-bl-sm';
                            }
                         }

                         return (
                            <LongPressable
                              key={m.id}
                              onLongPress={() => setActiveMessageMenu(m)}
                              className={`relative px-5 py-3 text-sm font-semibold ${corners} shadow-lg cursor-pointer backdrop-blur-md transition-all ${isMe ? 'bg-gradient-to-br from-red-700 to-rose-900 text-white border border-red-500/50 shadow-[0_5px_15px_rgba(220,38,38,0.2)]' : 'studio-input border-white/20 text-slate-200'}`}
                            >
                               <p className="break-words leading-relaxed">{m.text}</p>
                            </LongPressable>
                         );
                      })}
                   </div>
                   <span className="text-[9px] text-slate-600 font-bold mt-2 mx-3 font-mono tracking-widest uppercase">{formatTimeAMPM(group[group.length - 1].createdAt)}</span>
                 </div>
               );
            })}
            <div ref={messagesEndRef} className="h-1" />
          </div>
          
          <form
            onSubmit={commit}
            className="p-5 bg-black/60 border-t border-white/10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] z-10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 studio-input rounded-full pl-6 pr-2 py-2 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/30 transition-all shadow-inner border border-white/20">
              <input 
                type="text" 
                placeholder="Transmit message..." 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                className="flex-1 bg-transparent text-sm font-bold text-white placeholder-slate-500 focus:outline-none tracking-wide" 
                required 
              />
              <button 
                type="submit" 
                className="bg-white text-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full transition hover:bg-slate-300 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              >
                Send
              </button>
            </div>
          </form>
        </>
      )}

      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowNewGroupModal(false)}>
          <form onSubmit={handleCreateGroup} onClick={(e) => e.stopPropagation()} className="studio-glass border-t border-white/20 p-8 rounded-[3rem] w-full max-w-md space-y-6 font-sans shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-sweepUp">
            <h4 className="font-serif font-black text-white text-xl border-b border-white/10 pb-3 uppercase tracking-widest glow-text-cyan">Establish Comms Node</h4>
            <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="Node Designation..." className="w-full px-5 py-3 studio-input rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-cyan-500 outline-none shadow-inner placeholder-slate-500 transition-all" required autoFocus />
            <div className="flex gap-4 justify-end pt-3">
              <button type="button" onClick={() => setShowNewGroupModal(false)} className="px-6 py-2.5 studio-input hover:bg-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition shadow-sm border border-white/10">Abort</button>
              <button type="submit" className="px-6 py-2.5 bg-cyan-600/30 border border-cyan-500/50 text-cyan-400 font-black text-xs rounded-xl uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-500/40 transition">Establish</button>
            </div>
          </form>
        </div>
      )}

      {channelToDelete && (
        <LongPressMenu title="Sever this comms link completely?" onConfirm={removeChannel} onCancel={() => setChannelToDelete(null)} confirmText="Sever Link" />
      )}

      {activeMessageMenu && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => { setActiveMessageMenu(null); setEditingMessageId(null); }}>
          <div className="w-full max-w-xs studio-glass border-t border-white/20 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(0,0,0,0.6)] text-white space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <h5 className="font-serif font-black text-xs text-slate-400 pb-3 border-b border-white/10 uppercase tracking-widest drop-shadow-sm">Transmission Options</h5>
            {editingMessageId !== activeMessageMenu.id ? (
              <div className="flex flex-col gap-3 pt-2">
                <button onClick={() => copyMessageText(activeMessageMenu.text)} className="w-full py-3 studio-input hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest rounded-xl text-xs transition-colors shadow-sm">📋 Decrypt</button>
                <button onClick={(e) => { e.stopPropagation(); onInspectUser(activeMessageMenu.senderUid); setActiveMessageMenu(null); }} className="w-full py-3 studio-input hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest rounded-xl text-xs transition-colors shadow-sm">👤 Trace Source</button>
                {(isAdmin || activeMessageMenu.senderUid === userProfile?.id) && (
                  <>
                    <button onClick={() => { setEditingMessageId(activeMessageMenu.id); setEditingMessageText(activeMessageMenu.text); }} className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold uppercase tracking-widest rounded-xl text-xs transition-colors shadow-sm backdrop-blur">✎ Alter</button>
                    <button onClick={() => deleteMessage(activeMessageMenu.id)} className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest rounded-xl text-xs transition-colors shadow-sm backdrop-blur">🗑 Redact</button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <textarea value={editingMessageText} onChange={e => setEditingMessageText(e.target.value)} className="w-full p-4 studio-input border border-white/20 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" rows={4} />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setEditingMessageId(null); setEditingMessageText(''); }} className="px-5 py-2 studio-input border border-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Abort</button>
                  <button onClick={saveEditedMessage} className="px-5 py-2 bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-500/40 text-cyan-400 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)]">Confirm</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ScrollReveal>
  );
}

// --- INSTA FEED ---
function PostsWorkspace({ posts, projects, userProfile, showToast, pushNotification, isAdmin, onInspectUser }) {
  const [postTitle, setPostTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [relatedProjectId, setRelatedProjectId] = useState('');
  const [showCreateModal, setShowCreatePostModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
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
        relatedProjectId: relatedProjectId,
        authorName: userProfile.name, authorAvatar: userProfile.photoURL, authorUid: userProfile.id,
        likes: 0, likedBy: [], comments: [], createdAt: Date.now(),
      });
      pushNotification(`Pushed to gallery: "${postTitle}"`, 'post', {}, userProfile.name);
      setPostTitle(''); setPostText(''); setRelatedProjectId(''); setShowCreatePostModal(false); showToast('Asset injected to gallery.', 'success');
    } catch (err) { showToast('Injection failed — check parameters.', 'warning'); } finally { setPublishing(false); }
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
    pushNotification(`${userProfile?.name || 'Operative'} analyzed gallery asset 📸`, 'post', {}, userProfile?.name || 'System', 'admin');

    e.target.commentInputText.value = ''; showToast('Analysis appended.', 'success');
    if (expandedPost?.id === postId) { setExpandedPost({ ...expandedPost, comments: [...(expandedPost.comments || []), newComment] }); }
  };

  const removePost = async () => { 
    if (!postToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'posts', postToDelete)); 
    if (expandedPost?.id === postToDelete) setExpandedPost(null);
    setPostToDelete(null);
    showToast("Asset purged from gallery.", "info"); 
  };

  const removePostComment = async () => {
    if (!commentToDelete || !db || !db.app) return;
    const { postId, postComments, commentId } = commentToDelete;
    const updatedComments = postComments.filter(x => x.id !== commentId);
    await updateDoc(doc(db, 'posts', postId), { comments: updatedComments });
    if (expandedPost?.id === postId) { setExpandedPost({ ...expandedPost, comments: updatedComments }); }
    setCommentToDelete(null);
    showToast("Analysis redacted.", "info");
  };

  if (expandedPost) {
    return (
      <ScrollReveal className="studio-glass min-h-[85vh] sm:rounded-[3rem] border-t border-white/20 shadow-2xl flex flex-col font-sans relative z-30 overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center gap-4 shrink-0 bg-black/20">
          <button onClick={() => setExpandedPost(null)} className="p-3 hover:bg-white/10 bg-white/5 rounded-full transition shadow-sm border border-white/10 text-white"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <span className="font-serif font-black text-white text-xl tracking-widest uppercase glow-text-red">Return to Gallery</span>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-transparent backdrop-blur-md">
          <div className="md:w-3/5 bg-black/80 flex items-center justify-center p-8 border-r border-white/10 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]">
            <img src={expandedPost.image} alt={expandedPost.title} className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.6)] border border-white/5" />
          </div>

          <div className="md:w-2/5 flex flex-col bg-white/5 shrink-0 backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-white/20 p-0.5 bg-black shadow-inner">{renderAvatar(expandedPost.authorAvatar, "w-full h-full object-cover rounded-full", () => { setExpandedPost(null); onInspectUser(expandedPost.authorUid); })}</div>
                <div>
                  <p className="font-black text-lg text-white cursor-pointer hover:text-red-400 transition-colors drop-shadow-sm" onClick={() => { setExpandedPost(null); onInspectUser(expandedPost.authorUid); }}>{expandedPost.authorName}</p>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 drop-shadow-sm">{formatDateTimeAMPM(expandedPost.createdAt)}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 border-b border-white/10">
              <LongPressable
                onLongPress={() => { if (isAdmin || expandedPost.authorUid === userProfile?.id) setPostToDelete(expandedPost.id); }}
                className="cursor-pointer hover:bg-white/5 p-5 -mx-2 rounded-[2rem] transition border border-transparent hover:border-white/10 shadow-sm mb-4"
              >
                <h3 className="font-black text-2xl text-white mb-4 font-serif drop-shadow-md tracking-wide uppercase">{expandedPost.title}</h3>
                {expandedPost.description && <p className="text-sm font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap drop-shadow-sm">{expandedPost.description}</p>}
              </LongPressable>
              
              <div className="space-y-4 mt-6 pt-6 border-t border-dashed border-white/20">
                <h4 className="font-black text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-5 border-b border-white/10 pb-3 drop-shadow-sm">Analysis Logs</h4>
                {(expandedPost.comments || []).map((c, i) => (
                  <LongPressable 
                    key={i} 
                    onLongPress={() => { if (isAdmin || c.authorName === userProfile.name) setCommentToDelete({ postId: expandedPost.id, postComments: expandedPost.comments, commentId: c.id }); }}
                    className="flex justify-between items-start group text-sm p-5 studio-input rounded-2xl hover:border-red-500/50 hover:bg-white/10 cursor-pointer transition shadow-sm"
                  >
                    <div className="flex flex-col gap-2 min-w-0 pr-2">
                      <span className="font-black text-white cursor-pointer hover:text-red-400 text-sm drop-shadow-sm transition-colors" onClick={(e) => { e.stopPropagation(); setExpandedPost(null); onInspectUser(c.authorUid); }}>{c.authorName}</span>
                      <span className="text-slate-300 font-semibold leading-relaxed text-sm drop-shadow-sm">{c.text}</span>
                    </div>
                  </LongPressable>
                ))}
                {(!expandedPost.comments || expandedPost.comments.length === 0) && <p className="text-xs text-slate-500 font-mono tracking-widest uppercase text-center py-10 italic drop-shadow-sm border border-dashed border-white/10 rounded-2xl m-2">No data appended.</p>}
              </div>
            </div>

            <div className="p-6 bg-black/40 shrink-0 rounded-br-[3rem]">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => toggleLikePost(expandedPost)} className="text-4xl transition-transform active:scale-125 filter drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">{expandedPost.likedBy?.includes(userProfile?.id) ? '❤️' : '🤍'}</button>
                <span className="font-black text-lg text-white drop-shadow-sm uppercase tracking-wider">{expandedPost.likes || 0} Approvals</span>
              </div>
              <form onSubmit={(e) => handleAddPostComment(e, expandedPost.id)} className="flex gap-4">
                <div className="w-12 h-12 rounded-full border border-white/20 p-0.5 bg-black hidden sm:block shrink-0 shadow-inner">{renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}</div>
                <input name="commentInputText" type="text" placeholder="Append analysis..." className="flex-1 px-5 py-3 studio-input shadow-inner rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" required />
                <button type="submit" className="btn-cinematic text-white rounded-xl font-black px-6 text-xs uppercase tracking-widest shadow-lg">Append</button>
              </form>
            </div>
          </div>
        </div>

        {postToDelete && (
          <LongPressMenu title="Purge this entire asset?" onConfirm={removePost} onCancel={() => setPostToDelete(null)} confirmText="Purge Asset" />
        )}
        {commentToDelete && (
          <LongPressMenu title="Redact this analysis?" onConfirm={removePostComment} onCancel={() => setCommentToDelete(null)} confirmText="Redact" />
        )}
      </ScrollReveal>
    );
  }

  return (
    <section className="py-4 animate-fadeIn space-y-8 font-sans">
      <ScrollReveal className="flex justify-between items-center studio-glass p-6 sm:p-8 rounded-[2rem] shadow-2xl border-t border-white/20 gap-4">
        <h2 className="font-serif text-2xl font-black text-white glow-text-red uppercase tracking-widest">📸 Digital Gallery Feed</h2>
        <button onClick={() => setShowCreatePostModal(true)} className="btn-cinematic text-white font-black text-[10px] sm:text-xs px-6 py-3 rounded-xl shadow-lg transition-all font-mono uppercase tracking-widest whitespace-nowrap">Inject Media</button>
      </ScrollReveal>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 max-w-7xl mx-auto animate-fadeIn space-y-8">
        {posts.map((post, idx) => {
          const amLiked = post.likedBy?.includes(userProfile?.id);
          return (
            <ScrollReveal key={post.id} delay={idx * 50}>
              <LongPressable 
                onLongPress={() => { if (isAdmin || post.authorUid === userProfile?.id) setPostToDelete(post.id); }}
                className="break-inside-avoid studio-glass border border-white/20 rounded-[2.5rem] overflow-hidden shadow-2xl hover:shadow-[0_20px_50px_rgba(220,38,38,0.2)] transition-all duration-500 mb-8 cursor-pointer group"
              >
                <div className="p-5 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 p-0.5 flex items-center justify-center bg-black shrink-0 shadow-inner">{renderAvatar(post.authorAvatar, "w-full h-full object-cover", (e) => { e.stopPropagation(); onInspectUser(post.authorUid); })}</div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate hover:text-red-400 transition-colors uppercase tracking-wider" onClick={(e) => { e.stopPropagation(); onInspectUser(post.authorUid); }}>{post.authorName}</h4>
                      <span className="text-[9px] font-bold text-slate-500 font-mono block mt-1 tracking-widest uppercase">{formatDateTimeAMPM(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-black relative" onClick={() => setExpandedPost(post)}>
                  <img src={post.image} alt={post.title} className="w-full h-auto object-contain group-hover:opacity-60 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-red-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-sm"><span className="bg-black/80 backdrop-blur text-white font-black uppercase tracking-widest px-8 py-3 rounded border border-red-500/50 text-xs shadow-[0_0_30px_rgba(220,38,38,0.8)]">Access Record</span></div>
                </div>
                
                <div className="p-6 space-y-4 font-sans bg-black/20" onClick={() => setExpandedPost(post)}>
                  <div className="flex items-center justify-between font-sans">
                    <div className="flex items-center space-x-3 font-sans">
                      <button onClick={(e) => { e.stopPropagation(); toggleLikePost(post); }} className="text-3xl transition-transform active:scale-150 filter drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">{amLiked ? '❤️' : '🤍'}</button>
                      <span className="text-sm font-black text-white uppercase tracking-wider">{post.likes || 0} APV</span>
                    </div>
                    <span className="bg-white/10 text-white text-[9px] font-black px-3 py-1.5 rounded uppercase tracking-widest border border-white/20">TTL: {getExpiry7(post.createdAt)}</span>
                  </div>
                  
                  <div className="text-sm pt-2">
                    <span className="font-black text-white mr-3 hover:text-red-400 cursor-pointer uppercase tracking-wider transition-colors" onClick={(e) => { e.stopPropagation(); onInspectUser(post.authorUid); }}>{post.authorName}</span>
                    <span className="font-bold text-slate-300 tracking-wide">{post.title}</span>
                    {post.description && <p className="text-slate-500 font-medium mt-2 leading-relaxed font-sans line-clamp-2">{post.description}</p>}
                  </div>
                  
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    {(post.comments || []).slice(0, 2).map((c, i) => (
                      <div key={i} className="text-xs leading-relaxed font-sans flex justify-between py-1">
                        <div className="min-w-0 pr-2 truncate"><span className="font-black text-white mr-2 hover:text-cyan-400 cursor-pointer uppercase tracking-wider transition-colors" onClick={(e) => { e.stopPropagation(); onInspectUser(c.authorUid); }}>{c.authorName}</span><span className="text-slate-400 font-semibold">{c.text}</span></div>
                      </div>
                    ))}
                    {post.comments && post.comments.length > 2 && <p className="text-[10px] font-mono font-bold text-slate-600 cursor-pointer hover:text-white pt-2 uppercase tracking-widest transition-colors">Access {post.comments.length} Data Logs...</p>}
                  </div>
                </div>
              </LongPressable>
            </ScrollReveal>
          );
        })}
      </div>
      {posts.length === 0 && <ScrollReveal><div className="text-center text-slate-500 font-mono tracking-widest uppercase py-24 text-sm studio-input rounded-[3rem] border-dashed border-white/20 m-4">Gallery currently empty.</div></ScrollReveal>}

      {showCreateModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <form onSubmit={publishPost} className="studio-glass border-t border-white/20 p-8 rounded-[3rem] w-full max-w-md space-y-6 font-sans shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-sweepUp">
            <h4 className="font-serif font-black border-b border-white/10 pb-4 text-white text-xl uppercase tracking-widest glow-text-red">Inject Media</h4>
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Asset Designation</label>
              <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="Title..." className="w-full px-5 py-3 studio-input shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold text-white placeholder-slate-600 transition-all" required />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Context Data</label>
              <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Enter details..." className="w-full px-5 py-3 studio-input shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold text-white placeholder-slate-600 transition-all" rows="3" />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Attach to Board (Opt)</label>
              <select value={relatedProjectId} onChange={e => setRelatedProjectId(e.target.value)} className="w-full px-5 py-3 studio-input shadow-inner rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-300 transition-all">
                <option value="">-- Standalone Asset --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="pt-2">
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Target File</label>
              <input type="file" ref={fileInputRef} accept="image/*" className="w-full text-xs font-bold text-slate-400 font-sans file:mr-5 file:py-2.5 file:px-5 file:rounded file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-black file:bg-white/10 file:text-white hover:file:bg-white/20 file:transition-colors file:shadow-md" required />
            </div>
            <div className="flex gap-4 justify-end pt-5 border-t border-white/10">
              <button type="button" onClick={() => setShowCreatePostModal(false)} className="px-6 py-2.5 studio-input border border-white/20 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition shadow-sm">Abort</button>
              <button type="submit" disabled={publishing} className="px-8 py-2.5 btn-cinematic text-white font-black text-xs uppercase tracking-widest rounded-xl disabled:opacity-50 transition shadow-[0_0_20px_rgba(220,38,38,0.4)]">{publishing ? 'Uplinking…' : 'Execute'}</button>
            </div>
          </form>
        </div>
      )}

      {postToDelete && (
        <LongPressMenu title="Purge this entire asset record?" onConfirm={removePost} onCancel={() => setPostToDelete(null)} confirmText="Purge Asset" />
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
      showToast('Identity parameters synced!', 'success');
      
      if (userProfile.status === 'pending') { onNavigate('pending-status'); } else { onNavigate('home'); }
    } catch (err) { showToast('Sync failed.', 'warning'); } finally { setSaving(false); }
  };

  const handleRegisterCategory = async (e) => {
    e.preventDefault(); 
    const refined = newCatInp.trim(); 
    if (!refined || !db || !db.app) return;
    if (categories.some(c => c.toLowerCase() === refined.toLowerCase())) { showToast('Tag already in database.', 'warning'); return; }
    await setDoc(doc(db, 'meta/categories'), { list: arrayUnion(refined) }, { merge: true });
    setSelectedCat(refined); setNewCatInp(''); showToast('Tag appended!', 'success');
  };

  return (
    <section className="max-w-2xl mx-auto studio-glass border-t border-white/20 rounded-[3.5rem] p-10 sm:p-14 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative animate-fadeIn font-sans mt-8">
      <div className="text-center mb-10 border-b border-white/10 pb-6">
        <h2 className="font-serif text-3xl sm:text-4xl font-black text-white drop-shadow-md uppercase tracking-widest glow-text-cyan">{isOnboarding ? "Identity Initialization 🚀" : "Identity Parameters"}</h2>
        {isOnboarding && <p className="text-[10px] text-cyan-400 font-mono tracking-widest font-bold mt-4 drop-shadow-sm uppercase">Input designation and specs to bypass firewall.</p>}
      </div>
      <div className="flex flex-col items-center mb-10 font-sans relative">
        <div className="w-32 h-32 rounded-full border-[4px] border-cyan-500/40 bg-black backdrop-blur-xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.3)] flex items-center justify-center mb-3 font-sans relative z-10">
          {renderAvatar(uploadedPhotoUrl, "w-full h-full object-cover rounded-full")}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/5 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-cyan-500/10 rounded-full animate-[spin_7s_linear_infinite_reverse] pointer-events-none"></div>
      </div>
      <form onSubmit={saveProfileSettings} className="space-y-6 font-sans animate-fadeIn relative z-20">
        <div>
          <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest drop-shadow-sm mb-2">Designation (Display Name)</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-5 py-4 studio-input rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none shadow-inner transition-all" required />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest font-sans drop-shadow-sm mb-2">Primary Spec</label>
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} className="w-full px-5 py-4 studio-input rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none shadow-inner transition-all">
              {categories.map((cat, idx) => <option key={idx} value={cat} className="bg-slate-900 text-white">{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest font-sans drop-shadow-sm mb-2">Visual ID Override (PFP)</label>
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                try {
                  const b64 = await compressAndConvertImage(file, 150);
                  setUploadedPhotoUrl(b64);
                } catch (err) { showToast('Image compression failed.', 'warning'); }
              }
            }} className="w-full text-[10px] font-bold text-slate-400 mt-2 file:py-2.5 file:px-5 file:border-0 file:rounded file:bg-white/10 file:shadow-sm hover:file:bg-white/20 file:transition-colors file:font-black file:text-white file:uppercase file:tracking-widest cursor-pointer" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest drop-shadow-sm mb-2">Bio-Data (Specs / Details)</label>
          <textarea value={bioInput} onChange={e => setBioInput(e.target.value)} placeholder="Input parameters..." className="w-full px-5 py-4 studio-input rounded-xl text-sm font-bold text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none font-sans leading-relaxed shadow-inner transition-all" rows={4} maxLength={250} />
          <p className="text-[10px] font-bold text-right text-cyan-500 mt-2 font-mono drop-shadow-sm">{bioInput.length}/250 BYTE LIMIT</p>
        </div>

        <button type="submit" disabled={saving} className="w-full py-4 bg-cyan-600/30 border-b-[4px] border-cyan-500/50 hover:bg-cyan-500/40 text-cyan-400 text-sm font-black uppercase rounded-xl tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 mt-4">
          {saving ? 'Syncing Data...' : 'Confirm Identity & Execute'}
        </button>
      </form>
      
      {!isOnboarding && (
        <div className="border-t border-white/10 mt-10 pt-8 font-sans">
          <h4 className="font-serif text-sm font-black text-white mb-4 drop-shadow-sm tracking-wide">Register Custom Tag</h4>
          <form onSubmit={handleRegisterCategory} className="flex flex-col sm:flex-row gap-4 font-sans">
            <input type="text" value={newCatInp} onChange={(e) => setNewCatInp(e.target.value)} placeholder="e.g. SFX Supervisor" className="flex-1 px-5 py-3 studio-input rounded-xl text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-white shadow-inner transition-all" required />
            <button type="submit" className="px-8 py-3 bg-white/10 text-white text-xs rounded-xl font-black font-sans shadow-md hover:bg-white/20 border border-white/20 transition-all uppercase tracking-widest">Append</button>
          </form>
        </div>
      )}

      <div className="border-t border-white/10 mt-10 pt-8 text-center">
        <button onClick={handleSignOut} className="text-xs font-black text-rose-500 hover:text-rose-400 hover:bg-rose-900/30 transition-all studio-input border border-rose-900/50 px-8 py-3 rounded uppercase tracking-widest shadow-sm">Sever Connection (Sign Out)</button>
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
    showToast('YouTube parameters locked!', 'success');
    syncYouTubeStats(channelIdInput, apiKeyInput);
  };

  const saveMemberPhotoOverride = async (userId) => {
    if (!editedFile || !db || !db.app) return;
    try {
      const compressedBase64 = await compressAndConvertImage(editedFile, 150);
      await updateDoc(doc(db, 'profiles', userId), { photoURL: compressedBase64 });
      setEditingUserId(null); setEditedFile(null); showToast("Visual ID overridden!", 'success');
    } catch (err) { showToast("Data compression failed.", "warning"); }
  };

  const triggerSiteLogoUpload = async (e) => {
    const file = e.target.files[0]; 
    if (!file || !db || !db.app) return;
    try {
      const compressedBase64 = await compressAndConvertImage(file, 200);
      await setDoc(doc(db, 'meta/settings'), { logoUrl: compressedBase64 }, { merge: true }); 
      showToast('Global branding updated!', 'success');
    } catch (err) { showToast('File parsing error.', 'warning'); }
  };

  const saveLogoText = async () => {
    if (!db || !db.app) return;
    try { await setDoc(doc(db, 'meta/settings'), { logoText: logoTxt }, { merge: true }); showToast('Designation updated!', 'success'); } catch (err) { showToast('Save failed.', 'warning'); }
  };

  const approve = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { status: 'approved' }); };
  const promote = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'admin', status: 'approved' }); };
  const makeWaiter = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'roasting waiter', status: 'approved' }); };
  const demote = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'member' }); };
  const remove = (uid) => { if (db && db.app) deleteDoc(doc(db, 'profiles', uid)); };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn font-sans py-4">
      <div className="col-span-1 space-y-8">
        <ScrollReveal className="studio-glass border-t border-white/20 p-8 rounded-[2.5rem] shadow-2xl space-y-6 font-sans">
          <h3 className="font-serif font-black border-b border-white/10 pb-4 text-white text-xl drop-shadow-sm uppercase tracking-widest glow-text-red">Global Branding</h3>
          <div><label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest drop-shadow-sm mb-2">Master Terminal Designation</label><input type="text" value={logoTxt} onChange={(e) => setLogoTxt(e.target.value)} className="w-full px-5 py-3 studio-input rounded-xl text-sm font-bold text-white focus:ring-2 focus:outline-none transition-all shadow-inner" /></div>
          <div><label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest font-sans drop-shadow-sm mb-2">Global Icon</label><input type="file" accept="image/*" onChange={triggerSiteLogoUpload} className="w-full text-[10px] font-bold text-slate-400 mt-2 file:py-2.5 file:px-5 file:border-0 file:rounded file:bg-white/10 file:shadow-sm file:text-white file:font-black file:uppercase file:tracking-widest hover:file:bg-white/20 transition-colors cursor-pointer" /></div>
          <button onClick={saveLogoText} className="w-full py-3 btn-cinematic text-white text-xs rounded-xl font-black font-sans shadow-lg transition uppercase tracking-widest mt-2">Lock In</button>
        </ScrollReveal>

        <ScrollReveal className="studio-glass border-t border-white/20 p-8 rounded-[2.5rem] shadow-2xl font-sans space-y-6" delay={150}>
          <h3 className="font-serif font-black border-b border-white/10 pb-4 text-white text-xl drop-shadow-sm uppercase tracking-widest glow-text-red">API Integration</h3>
          {ytConfig.lastError && <p className="text-[10px] text-rose-300 bg-rose-900/40 border border-rose-500/50 px-4 py-3 rounded-lg font-mono uppercase tracking-widest shadow-inner">⚠ Error: {ytConfig.lastError}</p>}
          <form onSubmit={handleYtSave} className="space-y-5 font-sans">
            <div><label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest drop-shadow-sm mb-2">YT Source Handle</label><input type="text" value={channelIdInput} onChange={(e) => setChannelIdInput(e.target.value)} placeholder="@username" className="w-full px-5 py-3 studio-input rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 transition-all shadow-inner placeholder-slate-600" required /></div>
            <div><label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest drop-shadow-sm mb-2">API Security Key</label><input type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="AIzaSy..." className="w-full px-5 py-3 studio-input rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 transition-all shadow-inner placeholder-slate-600" /></div>
            <button type="submit" className="w-full py-3 btn-cinematic text-white text-xs font-black uppercase tracking-widest rounded-xl font-sans shadow-lg transition mt-2">Sync Nodes</button>
          </form>
        </ScrollReveal>
      </div>

      <ScrollReveal className="col-span-2 studio-glass border-t border-white/20 p-8 sm:p-10 rounded-[3rem] shadow-2xl font-sans" delay={300}>
        <h3 className="font-serif font-black border-b border-white/10 pb-5 text-white text-xl flex items-center justify-between drop-shadow-sm uppercase tracking-widest glow-text-cyan">
          <span>Operative Roster</span>
          {pendingCount > 0 && <span className="bg-red-600 text-white text-[10px] px-3 py-1 rounded shadow-[0_0_10px_rgba(220,38,38,0.8)] font-black uppercase tracking-widest animate-pulse">{pendingCount} Pending</span>}
        </h3>
        <p className="text-[10px] font-mono text-slate-500 mb-6 italic mt-4 uppercase tracking-widest">SysAdmin Tip: Long-press rows to initiate expulsion protocols.</p>
        <div className="overflow-x-auto custom-scrollbar pr-2">
          <table className="w-full text-sm text-left font-sans min-w-[600px]">
            <thead>
              <tr className="text-slate-400 font-mono text-[10px] uppercase tracking-widest border-b border-white/10"><th className="pb-4 pl-3">Designation</th><th className="pb-4">Clearance</th><th className="pb-4 text-right pr-3">Overrides</th></tr>
            </thead>
            <tbody>
              {profiles.map(p => {
                const isEditing = editingUserId === p.id;
                const isOwner = (p.email || '').toLowerCase() === ADMIN_EMAIL;
                return (
                  <tr key={p.id} className="border-b border-white/5 font-sans animate-fadeIn hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-3">
                      <LongPressable onLongPress={() => { if (!isOwner) remove(p.id); }} className="flex items-center space-x-4 cursor-pointer group">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 p-0.5 flex items-center justify-center bg-black shrink-0 group-hover:border-rose-500 transition-colors shadow-inner">{renderAvatar(p.photoURL)}</div>
                        <div className="flex flex-col font-sans group-hover:text-rose-400 transition-colors"><span className="font-black text-white text-base drop-shadow-sm tracking-wide">{p.name}</span><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 group-hover:text-rose-500 mt-1">{p.email}</span></div>
                      </LongPressable>
                      {isEditing && (
                        <div className="mt-4 p-5 studio-input border border-white/20 rounded-2xl space-y-4 animate-fadeIn font-sans shadow-lg">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white block font-mono">Force Identity Update</span>
                          <input type="file" accept="image/*" onChange={(e) => setEditedFile(e.target.files[0])} className="text-[10px] font-bold text-slate-400 font-sans w-full file:bg-white/10 file:text-white file:border-0 file:rounded file:px-3 file:py-1.5 file:font-black file:uppercase file:tracking-widest hover:file:bg-white/20 transition-colors" />
                          <div className="flex gap-3 justify-end pt-2 border-t border-white/10"><button onClick={() => setEditingUserId(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition px-4 py-2">Abort</button><button onClick={() => saveMemberPhotoOverride(p.id)} className="text-[10px] bg-cyan-600/30 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/40 px-5 py-2 rounded font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] transition uppercase tracking-widest">Execute</button></div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 uppercase font-mono text-[10px] font-black tracking-widest"><span className={p.status === 'pending' ? 'text-amber-500 bg-amber-500/10 px-2 py-1 rounded' : p.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded' : 'text-rose-500 bg-rose-500/10 px-2 py-1 rounded'}>{p.status}</span><br/><span className="text-slate-400 block mt-2">{p.role}</span></td>
                    <td className="py-4 text-right pr-3">
                      {!isOwner ? (
                        <div className="flex items-center justify-end gap-2 flex-wrap max-w-[200px] ml-auto">
                          <button onClick={() => setEditingUserId(p.id)} className="studio-input text-white px-3 py-1.5 border border-white/20 rounded hover:bg-white/10 transition text-[9px] font-black uppercase tracking-widest">PFP</button>
                          {p.status !== 'approved' && <button onClick={() => approve(p.id)} className="bg-emerald-600/20 text-emerald-400 px-3 py-1.5 border border-emerald-500/40 rounded hover:bg-emerald-600/40 transition text-[9px] font-black uppercase tracking-widest">Approve</button>}
                          {p.role !== 'admin' && p.role !== 'owner' ? <button onClick={() => promote(p.id)} className="bg-cyan-600/20 text-cyan-400 px-3 py-1.5 border border-cyan-500/40 rounded hover:bg-cyan-600/40 transition text-[9px] font-black uppercase tracking-widest">Promote</button> : p.role !== 'owner' && <button onClick={() => demote(p.id)} className="bg-rose-600/20 text-rose-400 px-3 py-1.5 border border-rose-500/40 rounded hover:bg-rose-600/40 transition text-[9px] font-black uppercase tracking-widest">Demote</button>}
                          {p.role !== 'roasting waiter' && p.role !== 'owner' && <button onClick={() => makeWaiter(p.id)} className="bg-purple-600/20 text-purple-400 px-3 py-1.5 border border-purple-500/40 rounded hover:bg-purple-600/40 transition text-[9px] font-black uppercase tracking-widest">Restrict</button>}
                        </div>
                      ) : <span className="text-rose-600 font-bold font-mono text-[10px] tracking-widest uppercase">Sys Admin</span>}
                    </td>
                  </tr>
                );
              })}
              {profiles.length === 0 && <tr><td colSpan={3} className="py-16 text-center text-slate-500 font-mono font-bold tracking-widest uppercase italic border-2 border-dashed border-white/10 rounded-2xl m-4 block">No operatives in database.</td></tr>}
            </tbody>
          </table>
        </div>
      </ScrollReveal>
    </section>
  );
}

function PendingScreen({ userProfile, handleNavigationChange, handleSignOut }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center text-center p-4 relative z-30">
      <div className="studio-glass border-t border-white/20 p-12 rounded-[3rem] max-w-md shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-sweepUp font-sans flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-amber-500/50 border-t-amber-500 rounded-full animate-spin mb-6"></div>
        <h3 className="font-serif font-black text-3xl mb-4 text-white glow-text-red uppercase tracking-widest">Verification Pending</h3>
        <p className="text-sm text-slate-400 font-bold mb-8 font-sans leading-relaxed">Designation <span className="text-white">{userProfile?.name}</span> is awaiting clearance from the SysAdmin.</p>
        <div className="flex gap-4 mt-2 w-full">
          <button onClick={() => handleNavigationChange('profile')} className="flex-1 text-[11px] font-black uppercase tracking-widest text-slate-300 studio-input hover:text-white border border-white/10 shadow-sm py-3 px-4 hover:bg-white/10 rounded-xl transition-colors">Edit File</button>
          <button onClick={handleSignOut} className="flex-1 text-[11px] font-black uppercase tracking-widest text-rose-400 bg-rose-900/30 border border-rose-500/30 shadow-sm py-3 px-4 hover:bg-rose-900/50 rounded-xl transition-colors">Abort</button>
        </div>
      </div>
    </div>
  );
}

function RejectedScreen({ handleSignOut }) {
  return (
    <div className="text-center py-32 font-sans flex flex-col items-center justify-center gap-6 relative z-30">
      <div className="studio-glass p-12 rounded-[3rem] border border-rose-500/50 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-sweepUp">
        <h1 className="text-6xl mb-4">🚫</h1>
        <p className="font-black text-2xl text-rose-500 drop-shadow-sm mb-2 uppercase tracking-widest font-serif">Clearance Denied</p>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-8">Access to mainframe restricted by SysAdmin.</p>
        <button onClick={handleSignOut} className="w-full text-xs font-black uppercase tracking-widest text-white btn-cinematic px-6 py-4 rounded-xl transition-colors shadow-lg">Sever Connection</button>
      </div>
    </div>
  );
}
