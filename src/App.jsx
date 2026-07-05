import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
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

    :root {
      --void-black: #030308;
      --deep-indigo: #0b0820;
      --cosmic-purple: #6a3fd8;
      --plasma-orange: #ff8a3d;
      --silver: #eef1f6;
    }

    body {
      background-color: var(--void-black);
      overflow-x: hidden;
      color: var(--silver);
      margin: 0;
      padding: 0;
      font-family: "Outfit", "Helvetica Neue", Arial, sans-serif;
    }

    .font-serif { font-family: 'Cinzel', serif; }
    .font-sans { font-family: 'Outfit', sans-serif; }
    .font-mono { font-family: 'Space Mono', monospace; }

    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 38, 38, 0.5); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(220, 38, 38, 0.8); }
    
    .three-art-background { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }
    .three-art-background canvas { display: block; width: 100% !important; height: 100% !important; }

    /* NEXT LEVEL IMMERSIVE DARK GLASSMORPHISM */
    .studio-glass {
      background: rgba(15, 15, 20, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 40px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1);
      transform-style: preserve-3d;
    }
    .studio-header {
      background: linear-gradient(to bottom, rgba(5, 5, 8, 0.95) 0%, rgba(5, 5, 8, 0.4) 100%);
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
    
    @keyframes deepDiveIn { 0% { transform: perspective(2500px) translateZ(-2000px) rotateX(60deg) rotateY(30deg); opacity: 0; filter: blur(60px); } 100% { transform: perspective(2500px) translateZ(0) rotateX(0deg) rotateY(0deg); opacity: 1; filter: blur(0px); } }
    .animate-deepDiveIn { animation: deepDiveIn 2s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-style: preserve-3d; }
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
        setTimeout(() => onComplete(), 800);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[999999] bg-[#050508] text-white flex flex-col items-center justify-center transition-transform duration-700 ease-in-out ${isFading ? '-translate-y-full' : 'translate-y-0'}`}>
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

/* ============================================================================
   ThreeArtBackground
   A cinematic, "Interstellar"-grade WebGL background.
   Every texture below is generated procedurally (canvas or GLSL) — zero
   external image assets are loaded. Scrolling drives a physical dolly down
   the Z axis, flying the camera through a cosmic-web tunnel at warp speed.
   ============================================================================ */

const DEPTH = {
  LOGO: 0,
  HAND_OF_GOD: -2000,
  JUPITER: -4500,
  BLACK_HOLE: -7500,
  END: -8600,
};

function makeRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createSoftDiscTexture(size = 256, innerColor = "255,255,255", hardness = 0.15) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${innerColor},1)`);
  g.addColorStop(hardness, `rgba(${innerColor},0.9)`);
  g.addColorStop(0.55, `rgba(${innerColor},0.25)`);
  g.addColorStop(1, `rgba(${innerColor},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createCloudPuffTexture(seed = 1, tint = [140, 150, 210]) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rng = makeRng(seed * 9973 + 17);
  ctx.clearRect(0, 0, size, size);

  const blobs = 14 + Math.floor(rng() * 10);
  for (let i = 0; i < blobs; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = rng() * size * 0.28;
    const cx = size / 2 + Math.cos(ang) * dist;
    const cy = size / 2 + Math.sin(ang) * dist * 0.7;
    const r = size * (0.18 + rng() * 0.28);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const alpha = 0.10 + rng() * 0.16;
    g.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha})`);
    g.addColorStop(0.4, `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha * 0.5})`);
    g.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createJupiterTexture() {
  const w = 2048, h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const rng = makeRng(42);

  const bands = [
    "#8a5a34", "#c98a52", "#e0b27e", "#a8663c", "#7a4526",
    "#d19a5f", "#b6733f", "#efd2a8", "#8f5730", "#c17a44",
    "#9c6339", "#e3bb84", "#6f3f22", "#caa06a",
  ];

  const bandCount = 46;
  const bandHeight = h / bandCount;
  for (let i = 0; i < bandCount; i++) {
    const base = bands[i % bands.length];
    ctx.fillStyle = base;
    ctx.fillRect(0, i * bandHeight, w, bandHeight + 1);
  }

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const rowCache = [];
  for (let y = 0; y < h; y++) {
    const t = y / h;
    let n = 0;
    n += Math.sin(t * 90 + Math.sin(t * 13) * 6) * 0.5;
    n += Math.sin(t * 210 + 4.1) * 0.25;
    n += Math.sin(t * 37 + 1.7) * 0.35;
    rowCache.push(n);
  }
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const shift = Math.round(rowCache[y] * 26 + Math.sin(y * 0.07) * 40);
    for (let x = 0; x < w; x++) {
      const sx = ((x + shift) % w + w) % w;
      const si = (y * w + sx) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = data[si];
      out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);

  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < 900; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 6 + rng() * 60;
    const shade = 150 + rng() * 90;
    ctx.fillStyle = `rgba(${shade},${shade * 0.8},${shade * 0.6},${0.05 + rng() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1.6 + rng()), r * 0.35, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  const grsX = w * 0.32, grsY = h * 0.62, grsRX = w * 0.09, grsRY = h * 0.06;
  const grs = ctx.createRadialGradient(grsX, grsY, 0, grsX, grsY, grsRX);
  grs.addColorStop(0, "#c1502f");
  grs.addColorStop(0.4, "#a83f28");
  grs.addColorStop(0.75, "#8a3320");
  grs.addColorStop(1, "rgba(138,51,32,0)");
  ctx.save();
  ctx.translate(grsX, grsY);
  ctx.scale(1, grsRY / grsRX);
  ctx.translate(-grsX, -grsY);
  ctx.fillStyle = grs;
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, grsRX, grsRX, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(60,20,12,${0.15 + i * 0.03})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(grsX, grsY, grsRX * (0.9 - i * 0.15), grsRX * (0.5 - i * 0.08), 0.3 * i, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function createJupiterEmissiveTexture(baseCanvasTex) {
  const src = baseCanvasTex.image;
  const canvas = document.createElement("canvas");
  canvas.width = src.width; canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255,150,80,0.12)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createRingTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const rng = makeRng(7);
  for (let x = 0; x < size; x++) {
    const t = x / size;
    const n = Math.sin(t * 80) * 0.5 + Math.sin(t * 240 + 2) * 0.3 + rng() * 0.4;
    const alpha = Math.max(0, 0.5 + n * 0.4) * (1 - Math.abs(t - 0.5) * 1.7);
    ctx.fillStyle = `rgba(226,196,160,${Math.min(0.85, Math.max(0, alpha))})`;
    ctx.fillRect(x, 0, 1, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createSilverTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#f5f7fa");
  g.addColorStop(0.4, "#c9d2db");
  g.addColorStop(0.55, "#e8edf2");
  g.addColorStop(0.75, "#9aa5b1");
  g.addColorStop(1, "#f0f3f6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, 0);
    ctx.lineTo(Math.random() * size, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const GLSL_NOISE = `
  vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0,0.5,1.0,2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  float fbm(vec3 p){
    float total = 0.0;
    float amp = 0.5;
    for(int i=0;i<5;i++){
      total += snoise(p) * amp;
      p *= 2.02;
      amp *= 0.52;
    }
    return total;
  }
`;

const nebulaSkyVert = `
  varying vec3 vWorldPos;
  void main(){
    vWorldPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const nebulaSkyFrag = `
  uniform float uTime;
  varying vec3 vWorldPos;
  ${GLSL_NOISE}
  void main(){
    vec3 dir = normalize(vWorldPos);
    float n1 = fbm(dir * 2.2 + vec3(0.0, 0.0, uTime * 0.004));
    float n2 = fbm(dir * 5.0 - vec3(0.0, uTime * 0.003, 0.0));
    float density = smoothstep(0.05, 0.85, n1 * 0.6 + n2 * 0.4);

    vec3 deepIndigo = vec3(0.03, 0.02, 0.09);
    vec3 voidBlack  = vec3(0.005, 0.004, 0.012);
    vec3 purple     = vec3(0.28, 0.08, 0.42);
    vec3 magenta    = vec3(0.42, 0.10, 0.35);
    vec3 blueGlow   = vec3(0.10, 0.14, 0.55);

    vec3 col = mix(voidBlack, deepIndigo, density);
    col = mix(col, purple, smoothstep(0.4, 0.95, n1) * 0.6);
    col = mix(col, blueGlow, smoothstep(0.5, 1.0, n2) * 0.35);
    col += magenta * pow(max(n1 * n2, 0.0), 3.0) * 0.5;

    float vign = smoothstep(-1.0, 0.2, dir.y) * 0.15;
    col += vign * vec3(0.05, 0.03, 0.1);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const starVert = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTwinkle;
  varying float vSeed;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aPhase * 6.2831);
    vTwinkle = twinkle;
    vSeed = aSeed;
    gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z) * (0.6 + twinkle * 0.7);
    gl_Position = projectionMatrix * mv;
  }
`;
const starFrag = `
  uniform vec2 uScreenDir;
  uniform float uWarp;
  varying float vTwinkle;
  varying float vSeed;
  void main(){
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float stretch = 1.0 + uWarp * 7.0;
    uv.y /= stretch;
    float d = length(uv);
    float core = smoothstep(0.55, 0.0, d);
    float halo = smoothstep(1.0, 0.0, d) * 0.5;
    float intensity = (core + halo) * vTwinkle;
    vec3 hue = mix(vec3(0.75,0.82,1.0), vec3(1.0,0.95,0.85), vSeed);
    vec3 col = hue * intensity * (1.0 + uWarp * 1.8);
    gl_FragColor = vec4(col, intensity);
  }
`;

const eventHorizonVert = `
  varying vec3 vNormal;
  void main(){
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const eventHorizonFrag = `
  varying vec3 vNormal;
  void main(){
    float rim = pow(1.0 - abs(vNormal.z), 6.0) * 0.06;
    gl_FragColor = vec4(vec3(rim), 1.0);
  }
`;

const accretionDiskVert = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main(){
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const accretionDiskFrag = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPos;
  ${GLSL_NOISE}
  void main(){
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float ang = atan(c.y, c.x);

    float swirl = fbm(vec3(cos(ang)*2.0, sin(ang)*2.0, r*3.0 - uTime*0.6)) * 0.5 + 0.5;
    float bands = sin(ang * 6.0 + r * 14.0 - uTime * 2.0) * 0.5 + 0.5;
    float plasma = mix(swirl, bands, 0.4);

    float beam = 0.55 + 0.45 * cos(ang - 1.4);
    beam = pow(beam, 2.2);

    float edgeFade = smoothstep(0.0, 0.12, r) * smoothstep(1.0, 0.72, r);

    vec3 hot = vec3(1.0, 0.98, 0.85);
    vec3 mid = vec3(1.0, 0.55, 0.12);
    vec3 cool = vec3(0.65, 0.08, 0.02);
    vec3 col = mix(cool, mid, plasma);
    col = mix(col, hot, pow(plasma, 4.0) * beam);
    col *= (0.4 + beam * 1.6);

    float alpha = edgeFade * (0.6 + plasma * 0.6);
    gl_FragColor = vec4(col * 2.2, alpha);
  }
`;

const lensArcVert = `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const lensArcFrag = `
  uniform float uTime;
  varying vec2 vUv;
  void main(){
    float d = abs(vUv.y - 0.5) * 2.0;
    float line = smoothstep(1.0, 0.0, d) * smoothstep(0.0, 0.15, d);
    float shimmer = 0.7 + 0.3 * sin(vUv.x * 40.0 + uTime * 3.0);
    vec3 col = vec3(1.0, 0.85, 0.65) * line * shimmer;
    gl_FragColor = vec4(col * 2.0, line * 0.8);
  }
`;

function ThreeArtBackground({ introDone }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    scrollProgress: 0,
    targetScrollProgress: 0,
    warp: 0,
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isMobile = width < 768;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 20000);
    camera.position.set(0, 0, 900);

    scene.add(new THREE.AmbientLight(0x223355, 0.6));
    const keyLight = new THREE.PointLight(0xfff2e0, 3.5, 6000, 2);
    keyLight.position.set(500, 400, 600);
    scene.add(keyLight);

    const skyGeo = new THREE.SphereGeometry(15000, 48, 48);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: nebulaSkyVert,
      fragmentShader: nebulaSkyFrag,
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    const nebulaGroup = new THREE.Group();
    const nebulaPalettes = [[90, 70, 180], [130, 60, 160], [60, 90, 200], [150, 80, 140]];
    const nebCount = isMobile ? 30 : 60;
    for (let i = 0; i < nebCount; i++) {
      const tint = nebulaPalettes[i % nebulaPalettes.length];
      const tex = createCloudPuffTexture(i + 1, tint);
      const mat = new THREE.SpriteMaterial({
        map: tex, color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = 900 + Math.random() * 2200;
      sprite.scale.set(scale, scale, 1);
      sprite.position.set((Math.random() - 0.5) * 9000, (Math.random() - 0.5) * 5000, -Math.random() * Math.abs(DEPTH.END) * 1.05);
      nebulaGroup.add(sprite);
    }
    scene.add(nebulaGroup);

    const STAR_COUNT = isMobile ? 4000 : 9000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starSize = new Float32Array(STAR_COUNT);
    const starPhase = new Float32Array(STAR_COUNT);
    const starSeed = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 6000;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 6000;
      starPos[i * 3 + 2] = Math.random() * (DEPTH.END - 1200) - 1200;
      starSize[i] = 4 + Math.random() * 9;
      starPhase[i] = Math.random();
      starSeed[i] = Math.random();
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
    starGeo.setAttribute("aPhase", new THREE.BufferAttribute(starPhase, 1));
    starGeo.setAttribute("aSeed", new THREE.BufferAttribute(starSeed, 1));
    const starMat = new THREE.ShaderMaterial({
      vertexShader: starVert, fragmentShader: starFrag,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }, uWarp: { value: 0 }, uScreenDir: { value: new THREE.Vector2(0, 1) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const logoGroup = new THREE.Group();
    logoGroup.position.set(0, 0, DEPTH.LOGO);

    function roundedRectShape(w, h, r) {
      const shape = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r); shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h); shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r); shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
      return shape;
    }
    const rectShape = roundedRectShape(340, 240, 46);
    const extrudeSettings = { depth: 60, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelSegments: 8, curveSegments: 24 };
    const logoGeo = new THREE.ExtrudeGeometry(rectShape, extrudeSettings);
    logoGeo.center();

    const posAttr = logoGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const colorTop = new THREE.Color(0x2b6bff);
    const colorBottom = new THREE.Color(0xff2f4f);
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    for (let i = 0; i < posAttr.count; i++) {
      const t = (posAttr.getY(i) - minY) / (maxY - minY);
      const c = colorTop.clone().lerp(colorBottom, t);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    logoGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const logoMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.65, roughness: 0.12, clearcoat: 1.0, clearcoatRoughness: 0.08, reflectivity: 1.0, emissive: new THREE.Color(0x220044), emissiveIntensity: 0.35 });
    const logoMesh = new THREE.Mesh(logoGeo, logoMat);
    logoGroup.add(logoMesh);

    const silverTex = createSilverTexture();
    const playShape = new THREE.Shape();
    playShape.moveTo(-38, 55); playShape.lineTo(-38, -55); playShape.lineTo(58, 0); playShape.closePath();
    const playGeo = new THREE.ExtrudeGeometry(playShape, { depth: 26, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 6, curveSegments: 12 });
    playGeo.center();
    
    // --- BRIGHT PLAY BUTTON FIX APPLIED ---
    const playMat = new THREE.MeshPhysicalMaterial({ 
      map: silverTex, 
      color: 0xffffff,
      metalness: 0.1, 
      roughness: 0.05, 
      clearcoat: 1.0, 
      emissive: 0xffffff, 
      emissiveIntensity: 0.8 
    });
    const playMesh = new THREE.Mesh(playGeo, playMat);
    playMesh.position.z = 46;
    logoGroup.add(playMesh);
    
    const playLight = new THREE.PointLight(0xffffff, 40, 600);
    playLight.position.set(0, 50, 200);
    logoGroup.add(playLight);
    // --- END BRIGHT PLAY BUTTON FIX ---

    const auraTex = createSoftDiscTexture(512, "150,120,255", 0.08);
    const auraMat = new THREE.SpriteMaterial({ map: auraTex, color: 0x8866ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const aura = new THREE.Sprite(auraMat);
    aura.scale.set(1400, 1400, 1);
    aura.position.z = -80;
    logoGroup.add(aura);

    const logoLight = new THREE.PointLight(0x6a7bff, 6, 2000, 2);
    logoLight.position.set(0, 0, 200);
    logoGroup.add(logoLight);
    scene.add(logoGroup);

    /* ---------------- 4. "Hand of God" nebula (Z: -2000) ---------------- */
    const handGroup = new THREE.Group();
    handGroup.position.set(650, 900, DEPTH.HAND_OF_GOD);

    const HAND_PARTICLES = isMobile ? 2500 : 5200;
    const handGeo = new THREE.BufferGeometry();
    const hp = new Float32Array(HAND_PARTICLES * 3);
    const hSize = new Float32Array(HAND_PARTICLES);
    const hColor = new Float32Array(HAND_PARTICLES * 3);
    const silverC = new THREE.Color(0xf3f2ff);
    const darkC = new THREE.Color(0x1c1b26);
    for (let i = 0; i < HAND_PARTICLES; i++) {
      const t = Math.random(); 
      const funnelAngle = -0.55; 
      const radius = (1 - t) * 520 + 40 + (Math.random() - 0.5) * 90;
      const theta = Math.random() * Math.PI * 2;
      const twist = t * 6.0;
      const bx = Math.cos(theta + twist) * radius;
      const by = -t * 1500;
      const bz = Math.sin(theta + twist) * radius * 0.6;
      const shearX = Math.sin(funnelAngle) * t * 700;
      hp[i * 3 + 0] = bx + shearX;
      hp[i * 3 + 1] = by;
      hp[i * 3 + 2] = bz;
      hSize[i] = 260 + Math.random() * 420 * (1 - t * 0.4);
      const c = silverC.clone().lerp(darkC, Math.pow(t, 1.4));
      hColor[i * 3] = c.r; hColor[i * 3 + 1] = c.g; hColor[i * 3 + 2] = c.b;
    }
    handGeo.setAttribute("position", new THREE.BufferAttribute(hp, 3));
    handGeo.setAttribute("aSize", new THREE.BufferAttribute(hSize, 1));
    handGeo.setAttribute("aColor", new THREE.BufferAttribute(hColor, 3));

    const cloudTex = createCloudPuffTexture(99, [200, 200, 220]);
    const handMat = new THREE.PointsMaterial({
      size: 1, map: cloudTex, transparent: true, opacity: 0.85, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    handMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("uniform float size;", "uniform float size;\nattribute float aSize;")
        .replace("gl_PointSize = size;", "gl_PointSize = aSize;");
    };
    const handCloud = new THREE.Points(handGeo, handMat);
    handGroup.add(handCloud);

    const handRimLight = new THREE.PointLight(0xffffff, 4, 3000, 2);
    handRimLight.position.set(0, 200, 300);
    handGroup.add(handRimLight);
    scene.add(handGroup);

    /* ---------------- 5. Hyper-realistic Jupiter (Z: -4500) ---------------- */
    const jupiterGroup = new THREE.Group();
    jupiterGroup.position.set(-900, -300, DEPTH.JUPITER);

    const jupiterTex = createJupiterTexture();
    const jupiterEmissiveTex = createJupiterEmissiveTexture(jupiterTex);
    const jupiterGeo = new THREE.SphereGeometry(620, 64, 64);
    const jupiterMat = new THREE.MeshStandardMaterial({
      map: jupiterTex, emissiveMap: jupiterEmissiveTex, emissive: new THREE.Color(0xffb066), emissiveIntensity: 0.55, roughness: 0.85, metalness: 0.05,
    });
    const jupiterMesh = new THREE.Mesh(jupiterGeo, jupiterMat);
    jupiterMesh.rotation.z = 0.2;
    jupiterGroup.add(jupiterMesh);

    const ringTex = createRingTexture();
    const ringGeo = new THREE.RingGeometry(820, 1450, 64);
    const ringPos = ringGeo.attributes.position;
    const ringUv = ringGeo.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < ringPos.count; i++) {
      v3.fromBufferAttribute(ringPos, i);
      const rr = (v3.length() - 820) / (1450 - 820);
      ringUv.setXY(i, rr, 0.5);
    }
    const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.4;
    ringMesh.rotation.z = 0.4;
    jupiterGroup.add(ringMesh);

    const jupiterGlow = new THREE.PointLight(0xffb066, 5, 4000, 2);
    jupiterGlow.position.set(0, 0, 300);
    jupiterGroup.add(jupiterGlow);
    scene.add(jupiterGroup);

    /* ---------------- 6. Gargantua black hole (Z: -7500) ---------------- */
    const holeGroup = new THREE.Group();
    holeGroup.position.set(0, 0, DEPTH.BLACK_HOLE);

    const horizonGeo = new THREE.SphereGeometry(360, 64, 64);
    const horizonMat = new THREE.ShaderMaterial({ vertexShader: eventHorizonVert, fragmentShader: eventHorizonFrag });
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    holeGroup.add(horizonMesh);

    const diskGeo = new THREE.RingGeometry(420, 1350, 100, 4);
    const diskMat = new THREE.ShaderMaterial({
      vertexShader: accretionDiskVert, fragmentShader: accretionDiskFrag, uniforms: { uTime: { value: 0 } }, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const diskMesh = new THREE.Mesh(diskGeo, diskMat);
    diskMesh.rotation.x = Math.PI / 2.15;
    holeGroup.add(diskMesh);

    const diskMesh2 = diskMesh.clone();
    diskMesh2.rotation.x = -Math.PI / 2.15;
    diskMesh2.scale.setScalar(0.62);
    holeGroup.add(diskMesh2);

    const arcGeo = new THREE.PlaneGeometry(1500, 90, 1, 1);
    const arcMat = new THREE.ShaderMaterial({
      vertexShader: lensArcVert, fragmentShader: lensArcFrag, uniforms: { uTime: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const arcTop = new THREE.Mesh(arcGeo, arcMat);
    arcTop.position.y = 470; arcTop.rotation.z = 0.02;
    holeGroup.add(arcTop);
    const arcBottom = new THREE.Mesh(arcGeo.clone(), arcMat.clone());
    arcBottom.position.y = -470; arcBottom.scale.set(0.8, 0.7, 1);
    holeGroup.add(arcBottom);

    const holeUplight = new THREE.PointLight(0xffb060, 8, 5000, 2);
    holeUplight.position.set(0, 0, 500);
    holeGroup.add(holeUplight);
    scene.add(holeGroup);

    /* ---------------- postprocessing ---------------- */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.35, 0.85, 0.15);
    composer.addPass(bloomPass);

    /* ---------------- scroll -> Z-axis dolly ---------------- */
    const totalDepth = Math.abs(DEPTH.END) + 1200;
    function getScrollProgress() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const scrollHeight = (doc.scrollHeight - doc.clientHeight) || 1;
      return Math.min(1, Math.max(0, scrollTop / scrollHeight));
    }
    function onScroll() { stateRef.current.targetScrollProgress = getScrollProgress(); }
    window.addEventListener("scroll", onScroll, { passive: true });

    function onResize() {
      width = window.innerWidth; height = window.innerHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height); composer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    /* ---------------- animation loop ---------------- */
    const clock = new THREE.Clock();
    let rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const st = stateRef.current;

      const prev = st.scrollProgress;
      st.scrollProgress += (st.targetScrollProgress - st.scrollProgress) * Math.min(1, dt * 6);
      const velocity = Math.abs(st.scrollProgress - prev) / Math.max(dt, 0.0001);
      st.warp += (Math.min(velocity * 9, 1) - st.warp) * 0.1;

      const targetZ = 900 - st.scrollProgress * (totalDepth + 900);
      camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 4);

      camera.position.x = Math.sin(t * 0.05) * 25;
      camera.position.y = Math.cos(t * 0.07) * 15;
      camera.lookAt(0, 0, camera.position.z - 500);

      skyMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;
      starMat.uniforms.uWarp.value = st.warp;
      diskMat.uniforms.uTime.value = t;
      arcMat.uniforms.uTime.value = t;

      logoGroup.rotation.y = Math.sin(t * 0.15) * 0.08;
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.6);
      aura.material.opacity = 0.35 + pulse * 0.5;
      aura.scale.setScalar(1300 + pulse * 220);
      logoLight.intensity = 4 + pulse * 5;

      jupiterMesh.rotation.y += dt * 0.06;
      ringMesh.rotation.z += dt * 0.01;
      handGroup.rotation.z = Math.sin(t * 0.03) * 0.05;
      holeGroup.rotation.y += dt * 0.02;
      diskMesh.rotation.z += dt * 0.05;
      diskMesh2.rotation.z -= dt * 0.03;

      bloomPass.strength = 1.1 + st.warp * 0.9 + pulse * 0.15;
      composer.render();
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose(); composer.dispose?.();
      mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
    };
  }, [introDone]);

  return <div ref={mountRef} className="three-art-background" />;
}

export default function App() {
  const [showIntroLoader, setShowIntroLoader] = useState(true);
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
      url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${trimmed}&key=${activeApiKey}`;
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

  useEffect(() => { injectArtStyleStyles(); }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden text-white font-sans selection:bg-red-600/30 bg-[#030308]">
      {showIntroLoader && <CinematicLoader onComplete={() => setShowIntroLoader(false)} />}
      
      {!showIntroLoader && <ThreeArtBackground introDone={!showIntroLoader} />}

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
        {currentPage === 'projects' && <ProjectBoard projects={projects} tasks={tasks} videos={videos} scripts={scripts} posts={posts} userProfile={userProfile} showToast={showToast} selectedProject={selectedProject} setSelectedProject={setSelectedProject} pushNotification={pushNotification} isAdmin={isAdmin} setActiveVideo={setActiveVideo} setSelectedScriptId={setSelectedScriptId} setExpandedPost={setExpandedPost} onNavigate={setCurrentPage} />}
        {currentPage === 'scripts' && <ScriptsWorkspace scripts={scripts} projects={projects} userProfile={userProfile} isAdmin={isAdmin} showToast={showToast} pushNotification={pushNotification} selectedScriptId={selectedScriptId} setSelectedScriptId={setSelectedScriptId} />}
        {currentPage === 'chat' && <WhiteboardChat chats={chats} userProfile={userProfile} chatChannel={chatChannel} setChatChannel={setChatChannel} pushNotification={pushNotification} siteSettings={siteSettings} isAdmin={isAdmin} showToast={showToast} onInspectUser={setInspectUser} viewMode={chatViewMode} setViewMode={setChatViewMode} />}
        {currentPage === 'posts' && <PostsWorkspace posts={posts} projects={projects} userProfile={userProfile} showToast={showToast} pushNotification={pushNotification} isAdmin={isAdmin} onInspectUser={setInspectUser} expandedPost={expandedPost} setExpandedPost={setExpandedPost} />}
        
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

// --- MY PROFILE WORKSPACE ---
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

export { CinematicLoader, ScrollReveal, PRESET_AVATARS, LongPressable, LongPressMenu, compressAndConvertImage, resolvePlayableVideo, renderAvatar };
