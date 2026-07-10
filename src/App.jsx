import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

let app, auth, db, messaging;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  try { messaging = getMessaging(app); } catch (e) { messaging = null; }
} catch (e) {
  console.error("Firebase critical initialization failed.", e);
  app = {}; auth = { currentUser: null }; db = {}; messaging = null;
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

// --- PRESET AVATARS ---
const PRESET_AVATARS = [
  { id: 'coral', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#e11d48" opacity="0.3"/><path d="M30,70 Q50,30 70,30 Q80,50 60,70 Z" fill="#e11d48"/><circle cx="60" cy="45" r="5" fill="#fbbf24"/></svg>` },
  { id: 'gold', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#d97706" opacity="0.3"/><path d="M25,50 Q45,20 65,45 T85,50" fill="none" stroke="#d97706" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="35" r="6" fill="#d97706"/></svg>` }
];

const ADMIN_EMAIL = "naitiksaxena06@gmail.com";
const DEFAULT_CATEGORIES = ['Director', 'VFX Artist', 'Cinematographer', 'Editor'];
const DEFAULT_YT_CONFIG = { channelId: '@naitik._.artist-16', apiKey: 'AIzaSyCZ7Aj3HV9JNeMAhTDUimZlUdjMqnPVNVg', subscribers: '—', latestVideoViews: '—', latestVideoTitle: 'Not synced', lastError: null, lastSyncedAt: null };

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
const svgToPngIcon = (svgString) => {
  return new Promise((resolve) => {
    try {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 96, 96);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
      img.src = url;
    } catch (e) { resolve(''); }
  });
};

const resolveNotificationIcon = async (photoURL) => {
  if (!photoURL) return '';
  if (photoURL.startsWith('<svg')) return await svgToPngIcon(photoURL);
  return photoURL.length < 2500 ? photoURL : '';
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
    return <div onClick={onClick} className="bg-slate-900 w-full h-full flex items-center justify-center font-bold text-slate-500 font-sans cursor-pointer shadow-inner backdrop-blur-md">?</div>;
  }
  if (photoURL.startsWith('<svg') || photoURL.includes('<circle') || photoURL.includes('<path')) {
    return <div onClick={onClick} className={`${className} cursor-pointer drop-shadow-md`} dangerouslySetInnerHTML={{ __html: photoURL }} />;
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

// --- LUXURIOUS 3D STYLING INJECTION ---
function injectArtStyleStyles() {
  if (document.getElementById('studio-lux-styles')) return;
  const styleBlock = document.createElement('style');
  styleBlock.id = 'studio-lux-styles';
  styleBlock.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Space+Mono:wght@400;700&display=swap');
    
    :root {
      --void-black: #030308;
      --deep-indigo: #0b0820;
      --cosmic-purple: #6a3fd8;
      --plasma-orange: #ff8a3d;
      --silver: #eef1f6;
      --glass-border: rgba(255, 255, 255, 0.14);
      --glass-highlight: rgba(255, 255, 255, 0.35);
    }

    body { background-color: var(--void-black); overflow-x: hidden; color: var(--silver); margin: 0; padding: 0; font-family: "Inter", "Helvetica Neue", Arial, sans-serif; }
    .font-serif { font-family: 'Playfair Display', serif; } .font-sans { font-family: 'Outfit', sans-serif; } .font-mono { font-family: 'Space Mono', monospace; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.5); border-radius: 6px; }
    
    .three-art-background { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }
    .three-art-background canvas { display: block; width: 100% !important; height: 100% !important; }
    
    /* DEEP LUXURY GLASSMORPHISM */
    .studio-glass { 
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(2, 6, 23, 0.8) 100%);
      backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); 
      border: 1px solid rgba(125, 211, 252, 0.1); 
      border-top: 1px solid rgba(224, 242, 254, 0.2);
      border-left: 1px solid rgba(186, 230, 253, 0.1);
      box-shadow: 0 50px 100px -20px rgba(0,0,0,0.95), inset 0 2px 20px rgba(56,189,248,0.05); 
      transform-style: preserve-3d; 
    }
    
    .studio-header { 
      background: linear-gradient(180deg, rgba(2, 6, 23, 0.95) 0%, rgba(0, 0, 0, 0.2) 100%);
      backdrop-filter: blur(40px); border-bottom: 1px solid rgba(56,189,248,0.15); box-shadow: 0 20px 60px rgba(0,0,0,0.9); 
    }

    .studio-input { 
      background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(186,230,253,0.15); color: #f0f9ff; 
      box-shadow: inset 0 4px 20px rgba(0,0,0,0.6), 0 4px 15px rgba(56,189,248,0.05); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
    }
    .studio-input:focus { 
      border-color: #38bdf8; background: rgba(15, 23, 42, 0.8); 
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2), inset 0 2px 10px rgba(0,0,0,0.6); outline: none; transform: translateY(-3px) translateZ(15px) scale(1.02); 
    }
    
    .glow-text-gold { background: linear-gradient(135deg, #fde047 0%, #f59e0b 50%, #b45309 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 10px 25px rgba(245,158,11,0.5)); }
    .glow-text-cyan { background: linear-gradient(135deg, #7dd3fc 0%, #0ea5e9 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 10px 20px rgba(14,165,233,0.6)); }
    .glow-text-ruby { background: linear-gradient(135deg, #fca5a5 0%, #e11d48 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 10px 20px rgba(225,29,72,0.6)); }
    
    .btn-cinematic { 
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); 
      box-shadow: 0 20px 40px -10px rgba(2,132,199,0.6), inset 0 2px 0 rgba(186,230,253,0.4); 
      color: white; border: 1px solid rgba(125,211,252,0.2); font-weight: 900;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d;
    }
    .btn-cinematic:hover { transform: translateY(-6px) translateZ(40px) scale(1.05); box-shadow: 0 30px 60px -10px rgba(2,132,199,0.8), inset 0 2px 0 rgba(186,230,253,0.6); }
    .btn-cinematic:active { transform: translateY(2px) translateZ(0) scale(0.95); }
    
    video::-webkit-media-controls, video::-webkit-media-controls-enclosure { display: none !important; }

    @keyframes deepDiveIn { 0% { transform: perspective(2500px) translateZ(-2000px) rotateX(60deg) rotateY(30deg); opacity: 0; filter: blur(60px); } 100% { transform: perspective(2500px) translateZ(0) rotateX(0deg) rotateY(0deg); opacity: 1; filter: blur(0px); } }
    .animate-deepDiveIn { animation: deepDiveIn 2s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-style: preserve-3d; }
    
    @keyframes hyperFadeOut { 0% { transform: perspective(2500px) translateZ(0) scale(1); opacity: 1; } 100% { transform: perspective(2500px) translateZ(1500px) scale(3); opacity: 0; filter: blur(50px); visibility: hidden; } }
    .animate-hyperFadeOut { animation: hyperFadeOut 1.5s cubic-bezier(0.7, 0, 0.3, 1) forwards; pointer-events: none; }
  `;
  document.head.appendChild(styleBlock);
}

// --- CINEMATIC INTRO LOADER ---
function CinematicLoader({ onComplete }) {
  const [progress, setProgress] = useState(0); 
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    let currentStep = 0;
    const timer = setInterval(() => { 
      currentStep++; 
      setProgress(Math.min((currentStep / 50) * 100, 100)); 
      if (currentStep >= 50) { 
        clearInterval(timer); 
        setIsFading(true); 
        setTimeout(() => onComplete(), 1500); 
      } 
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[999999] bg-[#020204] flex items-center justify-center perspective-[2500px] overflow-hidden ${isFading ? 'animate-hyperFadeOut' : ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-950/40 via-transparent to-[#020204] pointer-events-none opacity-90"></div>
      <div className="text-center z-10 flex flex-col items-center animate-deepDiveIn">
        <div className="relative w-48 h-48 mb-16 flex items-center justify-center transform-style-3d animate-[spin_15s_linear_infinite]">
          <div className="absolute inset-0 border-t-[6px] border-b-[6px] border-sky-500 rounded-full animate-[spin_2s_ease-in-out_infinite] shadow-[0_0_40px_rgba(14,165,233,0.8)]"></div>
          <div className="absolute inset-6 border-l-[6px] border-r-[6px] border-indigo-500 rounded-full animate-[spin_3s_linear_infinite_reverse] shadow-[0_0_30px_rgba(99,102,241,0.6)]"></div>
          <svg className="w-16 h-16 text-white drop-shadow-[0_0_20px_rgba(255,255,255,1)]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <h1 className="font-serif text-7xl md:text-[10rem] font-black tracking-tighter text-white uppercase glow-text-gold mb-12 drop-shadow-2xl translate-z-[200px]">Creator<span className="text-sky-400">.</span></h1>
        <div className="w-[30rem] max-w-[80vw] space-y-4 translate-z-[80px]">
          <div className="flex justify-between font-mono text-xs text-sky-300 font-black uppercase tracking-widest drop-shadow-md"><span>Hyperspace Initialization</span><span className="text-amber-400">{Math.floor(progress)}%</span></div>
          <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden shadow-inner border border-sky-500/30"><div className="h-full bg-gradient-to-r from-sky-700 via-indigo-500 to-amber-400" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}></div></div>
        </div>
      </div>
    </div>
  );
}

// --- ADVANCED 3D SCROLL REVEAL & HOVER ANIMATION ---
function Hover3DCard({ children, className = "" }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ transform: 'perspective(2000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' });
  const handleMouseMove = (e) => {
    if (!ref.current) return; 
    const rect = ref.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width - 0.5) * 20; 
    const yPct = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    setStyle({ transform: `perspective(2000px) rotateX(${yPct}deg) rotateY(${xPct}deg) scale3d(1.02, 1.02, 1.02)`, transition: 'transform 0.1s ease-out' });
  };
  const handleMouseLeave = () => setStyle({ transform: 'perspective(2000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)', transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1)' });
  return (
    <div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={className} style={{ ...style, transformStyle: 'preserve-3d', willChange: 'transform' }}>
      <div style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }} className="w-full h-full">{children}</div>
    </div>
  );
}

function ScrollReveal({ children, className = "", delay = 0 }) {
  const domRef = useRef(); 
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { 
      entries.forEach(e => { 
        if (e.isIntersecting) { 
          setTimeout(() => setIsVisible(true), delay); 
          observer.unobserve(e.target); 
        }
      }); 
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    if (domRef.current) observer.observe(domRef.current); 
    return () => observer.disconnect();
  }, [delay]);
  return (
    <div ref={domRef} className={className} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'perspective(2500px) rotateX(0deg) translateY(0) translateZ(0) scale(1)' : 'perspective(2500px) rotateX(15deg) translateY(60px) translateZ(-100px) scale(0.95)', transition: 'all 1.0s cubic-bezier(0.16, 1, 0.3, 1)', willChange: 'opacity, transform', transformOrigin: 'top center', transformStyle: 'preserve-3d' }}>
      {children}
    </div>
  );
}

// --- CUSTOM TOUCH & HOLD HELPER COMPONENT ---
function LongPressable({ onLongPress, children, className, onClick, style }) {
  const timerRef = useRef(null); 
  const isLongPressRef = useRef(false);
  
  const start = () => { 
    isLongPressRef.current = false; 
    timerRef.current = setTimeout(() => { 
      isLongPressRef.current = true; 
      if(onLongPress) onLongPress(); 
    }, 600); 
  };
  const stop = () => clearTimeout(timerRef.current);
  const handleClick = (e) => { 
    if (isLongPressRef.current) { e.preventDefault(); e.stopPropagation(); return; } 
    if (onClick) onClick(e); 
  };

  return (
    <div 
      className={className} 
      style={{ ...style, WebkitTouchCallout: 'none', userSelect: 'none', transformStyle: 'preserve-3d' }} 
      onClick={handleClick} 
      onMouseDown={start} onMouseUp={stop} onMouseLeave={stop} 
      onTouchStart={start} onTouchEnd={stop} 
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      {children}
    </div>
  );
}

function LongPressMenu({ title, onConfirm, onCancel, confirmText = "Delete" }) {
  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-fadeIn perspective-[2500px]" onClick={onCancel}>
      <div className="studio-glass p-8 sm:p-12 rounded-[3rem] w-full max-w-sm shadow-[0_50px_100px_rgba(0,0,0,0.9)] text-center border-t border-cyan-500 animate-deepDiveIn" onClick={e => e.stopPropagation()}>
        <p className="font-serif text-2xl sm:text-3xl font-black text-rose-100 mb-10 drop-shadow-lg tracking-tight">{title}</p>
        <button onClick={onConfirm} className="w-full py-4 btn-cinematic text-white font-black rounded-2xl mb-4 tracking-widest text-xs uppercase shadow-2xl">⚠️ {confirmText}</button>
        <button onClick={onCancel} className="w-full py-4 studio-input text-cyan-300 hover:text-white font-black rounded-2xl transition-colors tracking-widest text-xs uppercase shadow-sm border border-cyan-500/20">Abort Operation</button>
      </div>
    </div>
  );
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
  const stateRef = useRef({ scrollProgress: 0, targetScrollProgress: 0, warp: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const isMobile = window.innerWidth < 768;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
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
    const nebulaPalettes = [ [90, 70, 180], [130, 60, 160], [60, 90, 200], [150, 80, 140] ];
    for (let i = 0; i < 60; i++) {
      const tint = nebulaPalettes[i % nebulaPalettes.length];
      const tex = createCloudPuffTexture(i + 1, tint);
      const mat = new THREE.SpriteMaterial({
        map: tex, color: 0xffffff, transparent: true,
        opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = 900 + Math.random() * 2200;
      sprite.scale.set(scale, scale, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 9000,
        (Math.random() - 0.5) * 5000,
        -Math.random() * Math.abs(DEPTH.END) * 1.05
      );
      nebulaGroup.add(sprite);
    }
    scene.add(nebulaGroup);

    const STAR_COUNT = isMobile ? 3000 : 9000;
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
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uWarp: { value: 0 },
        uScreenDir: { value: new THREE.Vector2(0, 1) },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const logoGroup = new THREE.Group();
    logoGroup.position.set(0, 0, DEPTH.LOGO);

    function roundedRectShape(w, h, r) {
      const shape = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
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

    const logoMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, metalness: 0.65, roughness: 0.12, clearcoat: 1.0,
      clearcoatRoughness: 0.08, reflectivity: 1.0, emissive: new THREE.Color(0x220044), emissiveIntensity: 0.35,
    });
    const logoMesh = new THREE.Mesh(logoGeo, logoMat);
    logoGroup.add(logoMesh);

    const silverTex = createSilverTexture();
    const playShape = new THREE.Shape();
    playShape.moveTo(-38, 55); playShape.lineTo(-38, -55); playShape.lineTo(58, 0); playShape.closePath();
    const playGeo = new THREE.ExtrudeGeometry(playShape, { depth: 26, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 6, curveSegments: 12 });
    playGeo.center();
    const playMat = new THREE.MeshPhysicalMaterial({ map: silverTex, metalness: 1.0, roughness: 0.18, clearcoat: 1.0, envMapIntensity: 1.4 });
    const playMesh = new THREE.Mesh(playGeo, playMat);
    playMesh.position.z = 46;
    logoGroup.add(playMesh);

    const auraTex = createSoftDiscTexture(512, "150,120,255", 0.08);
    const auraMat = new THREE.SpriteMaterial({ map: auraTex, color: 0x8866ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const aura = new THREE.Sprite(auraMat);
    aura.scale.set(1400, 1400, 1); aura.position.z = -80;
    logoGroup.add(aura);

    const logoLight = new THREE.PointLight(0x6a7bff, 6, 2000, 2);
    logoLight.position.set(0, 0, 200);
    logoGroup.add(logoLight);
    scene.add(logoGroup);

    const handGroup = new THREE.Group();
    handGroup.position.set(650, 900, DEPTH.HAND_OF_GOD);

    const HAND_PARTICLES = isMobile ? 2000 : 5200;
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
      hp[i * 3 + 0] = bx + shearX; hp[i * 3 + 1] = by; hp[i * 3 + 2] = bz;
      hSize[i] = 260 + Math.random() * 420 * (1 - t * 0.4);
      const c = silverC.clone().lerp(darkC, Math.pow(t, 1.4));
      hColor[i * 3] = c.r; hColor[i * 3 + 1] = c.g; hColor[i * 3 + 2] = c.b;
    }
    handGeo.setAttribute("position", new THREE.BufferAttribute(hp, 3));
    handGeo.setAttribute("aSize", new THREE.BufferAttribute(hSize, 1));
    handGeo.setAttribute("aColor", new THREE.BufferAttribute(hColor, 3));

    const cloudTex = createCloudPuffTexture(99, [200, 200, 220]);
    const handMat = new THREE.PointsMaterial({
      size: 1, map: cloudTex, transparent: true, opacity: 0.85, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
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

    const jupiterGroup = new THREE.Group();
    jupiterGroup.position.set(-900, -300, DEPTH.JUPITER);

    const jupiterTex = createJupiterTexture();
    const jupiterEmissiveTex = createJupiterEmissiveTexture(jupiterTex);
    const jupiterGeo = new THREE.SphereGeometry(620, 128, 128);
    const jupiterMat = new THREE.MeshStandardMaterial({
      map: jupiterTex, emissiveMap: jupiterEmissiveTex, emissive: new THREE.Color(0xffb066),
      emissiveIntensity: 0.55, roughness: 0.85, metalness: 0.05,
    });
    const jupiterMesh = new THREE.Mesh(jupiterGeo, jupiterMat);
    jupiterMesh.rotation.z = 0.2;
    jupiterGroup.add(jupiterMesh);

    const ringTex = createRingTexture();
    const ringGeo = new THREE.RingGeometry(820, 1450, 128);
    const ringPos = ringGeo.attributes.position;
    const ringUv = ringGeo.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < ringPos.count; i++) {
      v3.fromBufferAttribute(ringPos, i);
      const rr = (v3.length() - 820) / (1450 - 820);
      ringUv.setXY(i, rr, 0.5);
    }
    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTex, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.4; ringMesh.rotation.z = 0.4;
    jupiterGroup.add(ringMesh);

    const jupiterGlow = new THREE.PointLight(0xffb066, 5, 4000, 2);
    jupiterGlow.position.set(0, 0, 300);
    jupiterGroup.add(jupiterGlow);
    scene.add(jupiterGroup);

    const holeGroup = new THREE.Group();
    holeGroup.position.set(0, 0, DEPTH.BLACK_HOLE);

    const horizonGeo = new THREE.SphereGeometry(360, 96, 96);
    const horizonMat = new THREE.ShaderMaterial({ vertexShader: eventHorizonVert, fragmentShader: eventHorizonFrag });
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    holeGroup.add(horizonMesh);

    const diskGeo = new THREE.RingGeometry(420, 1350, 200, 4);
    const diskMat = new THREE.ShaderMaterial({
      vertexShader: accretionDiskVert, fragmentShader: accretionDiskFrag,
      uniforms: { uTime: { value: 0 } }, transparent: true, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const diskMesh = new THREE.Mesh(diskGeo, diskMat);
    diskMesh.rotation.x = Math.PI / 2.15;
    holeGroup.add(diskMesh);

    const diskMesh2 = diskMesh.clone();
    diskMesh2.rotation.x = -Math.PI / 2.15; diskMesh2.scale.setScalar(0.62);
    holeGroup.add(diskMesh2);

    const arcGeo = new THREE.PlaneGeometry(1500, 90, 1, 1);
    const arcMat = new THREE.ShaderMaterial({
      vertexShader: lensArcVert, fragmentShader: lensArcFrag,
      uniforms: { uTime: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
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

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.35, 0.85, 0.15);
    composer.addPass(bloomPass);

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

    const clock = new THREE.Clock(); let rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime;
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
      renderer.dispose();
      composer.dispose?.();
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
      <section className="bg-white min-h-[85vh] sm:rounded-2xl border-t border-[#EADFC9] sm:border shadow-sm flex flex-col font-sans animate-fadeIn relative z-30">
        <div className="p-3 border-b border-[#EADFC9]/50 flex items-center gap-3">
          <button onClick={() => setActiveVideo(null)} className="p-2 hover:bg-slate-100 rounded-full transition"><svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <span className="font-serif font-bold text-slate-800">Return to Vault</span>
        </div>

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
            <span className="font-mono">{formatDateTimeAMPM(activeVideo.createdAt)}</span>
            <span className="bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1 shadow-sm">⏳ {timeLeft}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="w-10 h-10 rounded-full overflow-hidden border p-0.5 bg-slate-50 shrink-0 shadow-sm">{renderAvatar(activeVideo.uploaderAvatar || PRESET_AVATARS[0].svg, "w-full h-full object-cover rounded-full", () => onInspectUser(activeVideo.uploaderUid))}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-sm hover:text-[#C5A03A] cursor-pointer" onClick={() => onInspectUser(activeVideo.uploaderUid)}>{activeVideo.uploaderName}</h4>
              <p className="text-[10px] text-slate-400 font-mono">{activeVideo.size}</p>
            </div>
            {(isAdmin || activeVideo.uploaderUid === userProfile?.id) && (
              <button onClick={() => setVideoToDelete(activeVideo.id)} className="bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-rose-100 transition shadow-sm">🗑️ Delete Record</button>
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
              <LongPressable
                key={comment.id}
                onLongPress={() => { if (isAdmin || comment.authorName === userProfile?.name) setCommentToDelete({ videoId: activeVideo.id, currentComments: activeVideo.comments, commentId: comment.id }); }}
                className="text-xs flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm transition hover:shadow-md cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-slate-800 hover:text-[#C5A03A] cursor-pointer" onClick={(e) => { e.stopPropagation(); onInspectUser(comment.authorUid); }}>{comment.authorName}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{formatTimeAMPM(comment.timestamp)}</span>
                  </div>
                  <span className="text-slate-600 break-words leading-relaxed">{comment.text}</span>
                </div>
              </LongPressable>
            ))}
            {(!activeVideo.comments || activeVideo.comments.length === 0) && <div className="text-xs text-slate-400 text-center py-10 italic border-2 border-dashed border-[#EADFC9] rounded-xl bg-white/50">Be the first to leave a feedback note on this video.</div>}
          </div>
        </div>
        
        {commentToDelete && (
          <LongPressMenu 
            title="Delete this comment?" 
            onConfirm={deleteVideoComment} 
            onCancel={() => setCommentToDelete(null)} 
            confirmText="Delete Comment" 
          />
        )}
        {videoToDelete && (
          <LongPressMenu 
            title={`Delete "${activeVideo.title}"?`} 
            onConfirm={removeVideo} 
            onCancel={() => setVideoToDelete(null)} 
            confirmText="Delete Video" 
          />
        )}
      </section>
    );
  }

  return (
    <section className="py-2 animate-fadeIn space-y-6 font-sans px-4 sm:px-0">
      <div className="flex justify-between items-center bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl shadow-sm gap-4">
        <h2 className="font-serif text-lg font-bold text-slate-800">🎞️ Premium Video Vault Feed</h2>
        <button onClick={() => setShowUploadModal(true)} className="bg-red-600 text-white font-bold text-[10px] sm:text-xs px-4 py-2 rounded-full shadow hover:bg-red-700 transition font-sans whitespace-nowrap border-b-[3px] border-red-800 active:translate-y-[2px] active:border-b-0">➕ Link Dual Asset</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((vid) => {
          const embed = resolvePlayableVideo(vid.hlsUrl);
          const timeLeft = getExpiry7(vid.createdAt);
          
          const templateBgStyle = vid.title.toLowerCase().includes('edit') 
            ? 'from-blue-900 via-indigo-950 to-slate-950' 
            : 'from-amber-900 via-zinc-900 to-stone-950';

          return (
            <div key={vid.id} onClick={() => setActiveVideo(vid)} className="bg-white border-b-[4px] border border-[#EADFC9] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group flex flex-col">
              <div className="w-full aspect-video bg-slate-900 relative flex items-center justify-center overflow-hidden">
                {embed.thumbnail ? (
                  <img src={embed.thumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                ) : (
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
              <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-[#EADFC9] rounded-xl text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" placeholder="e.g. Director Cut Segment V2" required />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">External Asset URL</label>
              <input type="url" value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-[#EADFC9] rounded-xl text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" placeholder="https://..." required />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">Related Project Board (Optional)</label>
              <select value={relatedProjectId} onChange={e => setRelatedProjectId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-[#EADFC9] rounded-xl text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-[#C5A03A]">
                <option value="">-- Standalone Video --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
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
      const projectRef = await addDoc(collection(db, 'projects'), { title: newConcept, creatorName: userProfile.name, createdAt: Date.now() });
      const defaultItems = ['Script', 'Video shoot', 'Title', 'Planning done', 'Editing', 'Thumbnail', 'Upload'];
      await Promise.all(defaultItems.map(itemTitle => addDoc(collection(db, 'tasks'), { projectId: projectRef.id, title: itemTitle, status: 'To Do' })));
      pushNotification(`Created whiteboard: "${newConcept}"`, 'project', {}, userProfile.name);
      setNewConcept(''); showToast('Artboard concept mapped!', 'success');
    } catch(err) {}
  };
  const activeTasks = useMemo(() => (tasks || []).filter(t => t.projectId === selectedProject?.id), [tasks, selectedProject]);
  
  // Resolve related assets explicitly
  const projectVideos = useMemo(() => (videos || []).filter(v => v.relatedProjectId === selectedProject?.id), [videos, selectedProject]);
  const projectScripts = useMemo(() => (scripts || []).filter(s => s.relatedProjectId === selectedProject?.id), [scripts, selectedProject]);
  const projectPosts = useMemo(() => (posts || []).filter(p => p.relatedProjectId === selectedProject?.id), [posts, selectedProject]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !db || !db.app) return;
    try {
      await addDoc(collection(db, 'tasks'), { projectId: selectedProject.id, title: taskTitle, status: 'To Do' });
      setTaskTitle('');
    } catch(err) {}
  };

  const removeProject = async () => {
    if (!projectToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'projects', projectToDelete));
    if (selectedProject?.id === projectToDelete) setSelectedProject(null); 
    setProjectToDelete(null);
    showToast('Project deleted', 'info');
  };

  const removeTask = async () => { 
    if (!taskToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'tasks', taskToDelete)); 
    setTaskToDelete(null);
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
              <LongPressable 
                key={p.id} 
                onClick={() => setSelectedProject(p)} 
                onLongPress={() => { if (isAdmin) setProjectToDelete(p.id); }}
                className="bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl cursor-pointer shadow-skeuo-md hover:-translate-y-0.5 hover:shadow-skeuo-3d transition-all relative"
              >
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)] animate-bounce">📌</span>
                <div className="font-serif font-bold text-slate-800 pt-2 text-center line-clamp-2 text-xs">{p.title}</div>
                <div className="text-[9px] text-slate-400 text-center mt-2 font-mono">⏳ {getExpiry30(p.createdAt)}</div>
              </LongPressable>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md animate-fadeIn font-sans">
          <div className="flex justify-between items-center border-b pb-2">
            <button onClick={() => setSelectedProject(null)} className="text-[11px] font-bold text-[#C5A03A] hover:underline transition">◀ Back to Cork Board</button>
          </div>
          
          <h3 className="font-serif text-lg font-bold text-slate-800">{selectedProject.title}</h3>
          <p className="text-[9px] text-rose-500 font-bold">⏳ {getExpiry30(selectedProject.createdAt)}</p>
          
          <div className="flex gap-4 border-b mt-4">
            <button onClick={() => setBoardTab('progress')} className={`pb-2 text-xs font-bold transition-colors ${boardTab === 'progress' ? 'border-b-[3px] border-[#C5A03A] text-[#C5A03A]' : 'text-slate-400 hover:text-slate-600'}`}>Checklist / Progress</button>
            <button onClick={() => setBoardTab('resources')} className={`pb-2 text-xs font-bold transition-colors flex gap-1 items-center ${boardTab === 'resources' ? 'border-b-[3px] border-[#C5A03A] text-[#C5A03A]' : 'text-slate-400 hover:text-slate-600'}`}>
              Resources
              {(projectVideos.length + projectScripts.length + projectPosts.length) > 0 && (
                <span className="bg-[#C5A03A]/20 text-[#C5A03A] text-[9px] px-1.5 py-0.5 rounded-full">{projectVideos.length + projectScripts.length + projectPosts.length}</span>
              )}
            </button>
          </div>

          {boardTab === 'progress' ? (
            <>
              <div className="divide-y text-xs border-t mt-2">
                {activeTasks.map((t) => (
                  <LongPressable 
                    key={t.id} 
                    onLongPress={() => { if (isAdmin) setTaskToDelete(t.id); }}
                    className="py-2.5 flex justify-between items-center group cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition"
                  >
                    <span className="font-semibold text-slate-700">{t.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(t); }} className={`text-[9px] px-2 py-0.5 rounded-full font-bold shadow-inner ${t.status === 'To Do' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>{t.status}</button>
                  </LongPressable>
                ))}
              </div>
              
              <form onSubmit={addTask} className="flex gap-2 max-w-sm pt-3">
                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Add specific work item..." className="flex-1 px-3 py-1.5 border border-[#EADFC9] rounded-xl text-xs" required />
                <button type="submit" className="px-3.5 bg-slate-800 text-white text-xs rounded-xl font-bold font-sans">Add Item</button>
              </form>
            </>
          ) : (
            <div className="space-y-3 pt-2">
              {projectVideos.map(v => (
                <div key={v.id} className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#C5A03A]/30 transition shadow-sm">
                  <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-1 rounded font-bold mr-3 uppercase tracking-wider shrink-0">🎞️ Video</span>
                  <span className="font-bold text-sm text-slate-700 flex-1 truncate">{v.title}</span>
                </div>
              ))}
              {projectScripts.map(s => (
                <div key={s.id} className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#C5A03A]/30 transition shadow-sm">
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold mr-3 uppercase tracking-wider shrink-0">📝 Script</span>
                  <span className="font-bold text-sm text-slate-700 flex-1 truncate">{s.title}</span>
                </div>
              ))}
              {projectPosts.map(p => (
                <div key={p.id} className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#C5A03A]/30 transition shadow-sm">
                  <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-1 rounded font-bold mr-3 uppercase tracking-wider shrink-0">📸 Post</span>
                  <span className="font-bold text-sm text-slate-700 flex-1 truncate">{p.title}</span>
                </div>
              ))}
              {(!projectVideos.length && !projectScripts.length && !projectPosts.length) && (
                <div className="text-center text-slate-400 py-10 italic text-xs">No resources linked to this board yet.</div>
              )}
            </div>
          )}
        </div>
      )}
      
      {projectToDelete && (
        <LongPressMenu title="Delete this Project Board entirely?" onConfirm={removeProject} onCancel={() => setProjectToDelete(null)} confirmText="Delete Board" />
      )}
      {taskToDelete && (
        <LongPressMenu title="Delete this Task card?" onConfirm={removeTask} onCancel={() => setTaskToDelete(null)} confirmText="Delete Task" />
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

  const canEditSelected = selectedScript && userProfile; // Everyone can edit!

  // Real-time auto-save effect
  useEffect(() => {
    if (!isEditingBody || !selectedScript || !canEditSelected || !db || !db.app) return;
    if (draftText === selectedScript.content) return; // Only save if changed

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
      pushNotification(`Started script: "${clean}"`, 'script', {}, userProfile.name);
      setNewTopicTitle(''); setRelatedProjectId(''); setShowNewTopicModal(false);
      setSelectedScriptId(ref.id); setIsEditingBody(true); setDraftText('');
      showToast('Topic created!', 'success');
    } catch(err) {
      showToast('Failed to create topic.', 'warning');
    }
  };

  const removeTopic = async () => {
    if (!topicToDelete || !db || !db.app) return;
    await deleteDoc(doc(db, 'scripts', topicToDelete));
    if (selectedScriptId === topicToDelete) { setSelectedScriptId(null); setIsEditingBody(false); }
    setTopicToDelete(null);
    showToast('Script topic deleted.', 'info');
  };

  return (
    <section className="py-2 animate-fadeIn font-sans space-y-4">
      <div className="flex justify-between items-center bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl shadow-skeuo-md font-sans animate-fadeIn">
        <h3 className="font-serif font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">📝 Script Topics</h3>
        <button onClick={() => setShowNewTopicModal(true)} className="bg-[#C5A03A] text-white font-bold text-[10px] sm:text-xs px-4 py-1.5 rounded-full shadow hover:bg-[#b08d32] transition font-sans border-b-[3px] border-[#9c7d2c] active:border-b-0 active:translate-y-[2px]">+ New Topic</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        <div className="lg:col-span-1 bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-3 rounded-xl shadow-skeuo-md space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar animate-fadeIn">
          {scripts.map(s => (
            <LongPressable 
              key={s.id} 
              onClick={() => { setSelectedScriptId(s.id); setIsEditingBody(false); }} 
              onLongPress={() => { if (isAdmin || s.authorUid === userProfile?.id) setTopicToDelete(s.id); }}
              className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-start gap-2 ${selectedScriptId === s.id ? 'border-[#C5A03A] bg-amber-50/30 shadow-sm' : 'border-slate-100 hover:border-[#C5A03A]/40 hover:bg-slate-50'}`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">By {s.authorName} • ⏳ {getExpiry30(s.createdAt)}</span>
              </div>
            </LongPressable>
          ))}
          {scripts.length === 0 && <div className="text-center text-slate-400 italic text-xs py-10">No script topics available.</div>}
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
                  {canEditSelected && !isEditingBody && <button onClick={() => setIsEditingBody(true)} className="text-[9px] font-bold text-[#C5A03A] bg-amber-50 border border-[#C5A03A]/30 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition shadow-sm">✎ Write Script</button>}
                  {isEditingBody && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-400">{saving ? '⏳ Saving...' : '✅ Saved'}</span>
                      <button onClick={() => setIsEditingBody(false)} className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-200 transition shadow-sm">Done</button>
                    </div>
                  )}
                </div>
              </div>
              
              {isEditingBody ? (
                <div className="space-y-3 animate-fadeIn">
               <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={14} placeholder="Write the script here... (Auto-saves as you type)" className="w-full px-4 py-3 bg-white border border-[#EADFC9] rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-[#C5A03A]/50 focus:border-[#C5A03A] focus:outline-none font-sans leading-relaxed custom-scrollbar shadow-inner resize-y" autoFocus />                
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed min-h-[150px] font-sans">
                  {selectedScript.content ? selectedScript.content : <span className="italic text-slate-400">No script written yet. Click "Write Script" to begin!</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showNewTopicModal && (
        <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={createTopic} className="bg-white border-2 border-[#EADFC9] p-5 rounded-xl w-full max-w-sm space-y-4 font-sans shadow-skeuo-lg animate-fadeIn">
            <h4 className="font-serif font-bold text-slate-800 text-sm">New Script Topic</h4>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">Topic Title</label>
              <input type="text" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} placeholder="e.g. Episode 12 Intro Hook" className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#C5A03A]/50" required autoFocus />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">Related Project Board (Optional)</label>
              <select value={relatedProjectId} onChange={e => setRelatedProjectId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#C5A03A]/50">
                <option value="">-- Standalone Script --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowNewTopicModal(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-[#C5A03A] text-white font-bold text-xs rounded-xl border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[2px] transition shadow">Create Topic</button>
            </div>
          </form>
        </div>
      )}
      
      {topicToDelete && (
        <LongPressMenu title="Delete this Script Topic?" onConfirm={removeTopic} onCancel={() => setTopicToDelete(null)} confirmText="Delete Script" />
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
      setNewChannelName(''); setShowNewGroupModal(false); showToast("Group created!", "success");
      openChannel(newId);
    } catch (err) {}
  };

  const removeChannel = async () => {
    if (!channelToDelete || !db || !db.app) return;
    try {
      await setDoc(doc(db, 'meta/settings'), { chatChannels: channels.filter(c => c.id !== channelToDelete) }, { merge: true });
      if (chatChannel === channelToDelete) { setChatChannel('general'); setViewMode('list'); }
      setChannelToDelete(null);
      showToast("Channel removed!", "info");
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
    <section className="border-2 border-[#EADFC9] rounded-2xl h-[75vh] bg-white overflow-hidden shadow-skeuo-md animate-fadeIn font-sans flex flex-col">
      {viewMode === 'list' ? (
        <>
          <div className="p-4 border-b border-[#EADFC9]/50 flex items-center justify-between shrink-0">
            <h3 className="font-serif font-bold text-slate-800 text-sm">💬 Messages</h3>
            <button onClick={() => setShowNewGroupModal(true)} className="bg-[#C5A03A] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow hover:bg-[#b08d32] transition border-b-[3px] border-[#9c7d2c] active:border-b-0 active:translate-y-[2px]">+ New Group</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {channelPreviews.map(ch => (
              <LongPressable 
                key={ch.id} 
                onClick={() => openChannel(ch.id)} 
                onLongPress={() => { if (isAdmin && ch.id !== 'general') setChannelToDelete(ch.id); }}
                className="flex items-center gap-3 p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C5A03A] to-[#f43f5e] flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
                  {initialOf(ch.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-800 truncate">{ch.name}</span>
                    {ch.lastTime && <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{timeAgo(ch.lastTime)}</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{ch.lastSender ? `${ch.lastSender}: ` : ''}{ch.lastMessage}</p>
                </div>
              </LongPressable>
            ))}
            {channelPreviews.length === 0 && <div className="text-center text-slate-400 py-16 text-xs italic">No conversations yet.</div>}
          </div>
        </>
      ) : (
        <>
          <div className="p-3 border-b border-[#EADFC9]/50 flex items-center gap-3 shrink-0 bg-white z-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <button onClick={() => setViewMode('list')} className="p-1.5 hover:bg-slate-100 rounded-full transition">
              <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C5A03A] to-[#f43f5e] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {initialOf(activeChannelObj?.name)}
            </div>
            <span className="font-serif font-bold text-slate-800 text-sm truncate">{activeChannelObj?.name}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar bg-[#FCFBF8]">
            {groupedChats.map((group, gIdx) => {
               const isMe = group[0].senderUid === userProfile?.id;
               const senderName = group[0].senderName;

               return (
                 <div key={gIdx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                   {!isMe && <span className="text-[10px] text-slate-500 font-bold mb-1 ml-1">{senderName}</span>}

                   <div className={`flex flex-col gap-0.5 max-w-[75%]`}>
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
                              className={`relative px-3 py-1.5 text-xs sm:text-sm ${corners} shadow-sm cursor-pointer ${isMe ? 'bg-gradient-to-br from-[#d4b04c] to-[#bb9632] text-white border border-[#ab892c]' : 'bg-white text-slate-800 border border-slate-200'}`}
                            >
                               <p className="break-words leading-snug">{m.text}</p>
                            </LongPressable>
                         );
                      })}
                   </div>
                   <span className="text-[9px] text-slate-400 mt-1 mx-1 font-mono tracking-wide">{formatTimeAMPM(group[group.length - 1].createdAt)}</span>
                 </div>
               );
            })}
            <div ref={messagesEndRef} className="h-1" />
          </div>
          
          <form
            onSubmit={commit}
            className="p-3 bg-white border-t border-slate-100 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] z-10"
          >
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-1 py-1 focus-within:border-[#C5A03A] focus-within:ring-1 focus-within:ring-[#C5A03A]/20 transition-all">
              <input 
                type="text" 
                placeholder="Message..." 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none" 
                required 
              />
              <button 
                type="submit" 
                className="bg-[#C5A03A] text-white text-xs font-bold px-4 py-2 rounded-full transition hover:bg-[#b08d32] active:scale-95 shadow-sm"
              >
                Send
              </button>
            </div>
          </form>
        </>
      )}

      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewGroupModal(false)}>
          <form onSubmit={handleCreateGroup} onClick={(e) => e.stopPropagation()} className="bg-white border-2 border-[#EADFC9] p-5 rounded-xl w-full max-w-sm space-y-4 font-sans shadow-skeuo-lg animate-fadeIn">
            <h4 className="font-serif font-bold text-slate-800 text-sm">Create New Group</h4>
            <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="Group name..." className="w-full px-3 py-2 border rounded-lg text-xs" required autoFocus />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewGroupModal(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-[#C5A03A] text-white font-bold text-xs rounded-xl border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[2px]">Create</button>
            </div>
          </form>
        </div>
      )}

      {channelToDelete && (
        <LongPressMenu title="Delete this Chat Channel?" onConfirm={removeChannel} onCancel={() => setChannelToDelete(null)} confirmText="Delete Channel" />
      )}

      {activeMessageMenu && (
        <div className="absolute inset-0 z-50 bg-black/35 flex items-center justify-center p-4 animate-fadeIn" onClick={() => { setActiveMessageMenu(null); setEditingMessageId(null); }}>
          <div className="w-full max-w-xs bg-white border-2 border-[#EADFC9] rounded-[1.5rem] p-4 shadow-skeuo-lg text-slate-800 space-y-2 text-center" onClick={(e) => e.stopPropagation()}>
            <h5 className="font-serif font-bold text-xs text-slate-400 pb-1.5 border-b uppercase">Message Options</h5>
            {editingMessageId !== activeMessageMenu.id ? (
              <div className="flex flex-col gap-1.5">
                <button onClick={() => copyMessageText(activeMessageMenu.text)} className="w-full py-2 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors">📋 Copy Commentary</button>
                <button onClick={(e) => { e.stopPropagation(); onInspectUser(activeMessageMenu.senderUid); setActiveMessageMenu(null); }} className="w-full py-2 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors">👤 Inspect Sender Profile</button>
                {(isAdmin || activeMessageMenu.senderUid === userProfile?.id) && (
                  <>
                    <button onClick={() => { setEditingMessageId(activeMessageMenu.id); setEditingMessageText(activeMessageMenu.text); }} className="w-full py-2 hover:bg-amber-50 text-amber-600 font-bold rounded-xl text-xs transition-colors">✎ Edit Message</button>
                    <button onClick={() => deleteMessage(activeMessageMenu.id)} className="w-full py-2 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-xs transition-colors">🗑 Un-send / Delete</button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <textarea value={editingMessageText} onChange={e => setEditingMessageText(e.target.value)} className="w-full p-2 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" rows={3} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditingMessageId(null); setEditingMessageText(''); }} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Cancel</button>
                  <button onClick={saveEditedMessage} className="px-3 py-1 bg-[#C5A03A] text-white font-bold rounded-lg text-xs border-b-[3px] border-[#9c7d2c] active:border-b-0 active:translate-y-[2px]">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// --- MAIN APP COMPONENT ---
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

  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [expandedPost, setExpandedPost] = useState(null);

  const showToast = useCallback((message, type = 'info') => { 
    setCustomToast({ message, type }); 
    setTimeout(() => setCustomToast(null), 3500); 
  }, []);
  const ensureProfileDocRef = useRef(() => {});

  useEffect(() => { 
  if (!auth || !auth.app) { setAuthLoading(false); return; }

  let hasCheckedInitialState = false;

  const unsub = onAuthStateChanged(auth, async (user) => {
    if (!hasCheckedInitialState) {
      hasCheckedInitialState = true;
      if (!user) {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (e) {}
        return;
      }
    }

    setAuthUser(user);
    if (user && !user.isAnonymous) {
      try { await ensureProfileDocRef.current(user); } catch (e) {}
    }
    setAuthLoading(false);
  }, () => setAuthLoading(false));

  return () => unsub();
}, []);
    
  const isAuthReady = !!authUser;
  const [profiles] = useFirestoreCollection('profiles', null, null, isAuthReady);
  const [categoriesDoc] = useFirestoreDoc('meta/categories', { list: DEFAULT_CATEGORIES }, isAuthReady);
  const categories = categoriesDoc.list || DEFAULT_CATEGORIES;
  const [posts] = useFirestoreCollection('posts', 'createdAt', null, isAuthReady);
  const [notifications, notifsLoaded, notifsError] = useFirestoreCollection('notifications', 'timestamp', 50, isAuthReady);
  const [ytConfig] = useFirestoreDoc('meta/ytConfig', DEFAULT_YT_CONFIG, isAuthReady);
  const [siteSettings] = useFirestoreDoc('meta/settings', { logoText: 'YOUTUBERS STUDIO', logoUrl: '', chatChannels: [{id: 'general', name: '🌍 Global Node'}] }, isAuthReady);
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

  const isProfileIncomplete = useMemo(() => {
    if (!authUser || !userProfile) return false;
    return !userProfile.name || userProfile.name.trim() === '' || !userProfile.workCategory || userProfile.isProfileComplete === false;
  }, [authUser, userProfile]);

  useEffect(() => { 
    if (currentPage === 'notifications' && db && userProfile) {
      try { updateDoc(doc(db, 'profiles', userProfile.id), { lastSeenNotifAt: Date.now() }); } catch (e) {} 
    }
  }, [currentPage, userProfile]);

  useEffect(() => { 
    if (!db || !db.app || !isAdmin) return; 
    const pruneOldNotifications = async () => {
      try {
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

  useEffect(() => { 
    if (!authLoading && !authUser && currentPage !== 'home') { setCurrentPage('home'); } 
  }, [authUser, authLoading, currentPage]);

  useEffect(() => {
    if (!authUser || !userProfile) return;
    if (isProfileIncomplete && currentPage !== 'profile') { setCurrentPage('profile'); showToast("Complete specs first.", "info"); return; }
    if (!isProfileIncomplete) {
      if (userProfile.status === 'pending' && currentPage !== 'pending-status') setCurrentPage('pending-status');
      else if (userProfile.status === 'rejected' && !['rejected-status', 'profile'].includes(currentPage)) setCurrentPage('rejected-status');
      else if (userProfile.status === 'approved' && isRoastingWaiter && currentPage !== 'profile') setCurrentPage('profile');
      else if (userProfile.status === 'approved' && !isRoastingWaiter && ['pending-status', 'rejected-status'].includes(currentPage)) setCurrentPage('home');
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

  useEffect(() => { 
    if (notifsError && isAuthReady && !isRoastingWaiter) { showToast(`Notifications temporarily on standby.`, 'info'); } 
  }, [notifsError, isAuthReady, isRoastingWaiter]);

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
    try {
      await addDoc(collection(db, 'notifications'), { message, type, meta, actor: actorName, timestamp: Date.now(), audience });

      const targets = profiles.filter(p => {
        if (p.id === userProfile.id) return false;
        if (!p.fcmToken) return false;
        if (audience === 'admin') return p.role === 'admin' || p.role === 'owner';
        return true;
      });
      const seenTokens = new Set();
      const uniqueTargets = targets.filter(p => {
        if (seenTokens.has(p.fcmToken)) return false;
        seenTokens.add(p.fcmToken);
        return true;
      });
      const iconForPush = await resolveNotificationIcon(userProfile?.photoURL);

      await Promise.all(uniqueTargets.map(async (p) => {
        try {
          const res = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: p.fcmToken, title: actorName, body: message, icon: iconForPush }),
          });
          if (res.status === 410 && db && db.app) {
            await updateDoc(doc(db, 'profiles', p.id), { fcmToken: null });
          }
        } catch (e) {}
      }));
    } catch (err) {}
  }, [isRoastingWaiter, userProfile, profiles]);

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
        try {
          const adminSnap = await getDocs(collection(db, 'profiles'));
          const admins = adminSnap.docs.map(d => d.data()).filter(p => (p.role === 'admin' || p.role === 'owner') && p.fcmToken);
          const applicantIcon = await resolveNotificationIcon(newProfile.photoURL);
          await Promise.all(admins.map(async (p) => {
            try {
              const res = await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: p.fcmToken, title: newProfile.name, body: 'Applied to join the crew — awaiting approval', icon: applicantIcon }),
              });
              if (res.status === 410 && db && db.app) {
                await updateDoc(doc(db, 'profiles', p.id), { fcmToken: null });
              }
            } catch (e) {}
          }));
        } catch (e) {}
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
    const autoFetchToken = async () => {
      if (!messaging || !userProfile || !db || !db.app) return;
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if (userProfile.fcmToken) return;
      try {
        const swReg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey: 'BNXy2GAYsoxX--4Rgt4Rs-CxEXNmdog91HvY7y6M5__9boxr9tVFJzlBW9N9Y11RLltkDSjHoXw_ctX8OIGL_A4', serviceWorkerRegistration: swReg });
        if (token) { await updateDoc(doc(db, 'profiles', userProfile.id), { fcmToken: token }); }
      } catch (e) {}
    };
    autoFetchToken();
  }, [userProfile]);

  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      if (document.visibilityState !== 'visible') return;
      const { title, body, icon } = payload.data || {};
      const tag = payload.messageId || title;
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title || 'Youtubers Studio', { body: body || '', icon: icon || undefined, tag });
          });
        } else {
          new Notification(title || 'Youtubers Studio', { body: body || '', icon: icon || undefined, tag });
        }
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [messaging]);

  useEffect(() => {
    injectArtStyleStyles();
  }, []);

  const navLinks = [
    { id: 'home', icon: '🪐', label: 'Command Hub' }, 
    { id: 'notifications', icon: '📡', label: 'Live Radar', badge: unreadMap.overall > 0 },
    { id: 'crew', icon: '👥', label: 'Crew Network' }, 
    { id: 'categories-view', icon: '🏷️', label: 'Division Map' },
    { id: 'vault', icon: '🎬', label: 'Video Vault', badge: unreadMap.vault }, 
    { id: 'projects', icon: '📌', label: 'Active Timelines', badge: unreadMap.projects },
    { id: 'scripts', icon: '📝', label: 'Manuscripts', badge: unreadMap.scripts }, 
    { id: 'chat', icon: '💬', label: 'Comms Link' },
    { id: 'posts', icon: '📸', label: 'Digital Gallery', badge: unreadMap.posts }
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden text-slate-200 font-sans selection:bg-rose-500/30 bg-[#030308]">
      <ThreeArtBackground introDone={!showIntroLoader} />
{showIntroLoader && <CinematicLoader onComplete={() => setShowIntroLoader(false)} />}
      {customToast && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[99999] px-6 sm:px-10 py-3 sm:py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-[10px] sm:text-xs font-black text-white transition-all animate-deepDiveIn border border-white/20 backdrop-blur-2xl uppercase tracking-widest ${customToast.type === 'success' ? 'bg-emerald-600/90 shadow-[0_0_20px_rgba(5,150,105,0.5)]' : 'bg-red-700/90 shadow-[0_0_20px_rgba(220,38,38,0.8)]'}`}>
          {customToast.message}
        </div>
      )}

      {/* --- HEADER (GLASSMORPHISM) --- */}
      <header className={`sticky top-0 z-40 studio-header px-4 sm:px-10 py-4 sm:py-5 flex items-center justify-between font-sans transition-opacity duration-[1500ms] ease-in-out ${showIntroLoader ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center space-x-4 sm:space-x-6 min-w-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 sm:p-3.5 hover:bg-cyan-900/30 rounded-full transition text-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-cyan-500/30 shrink-0 bg-black/40 backdrop-blur-md">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div className="flex items-center space-x-3 sm:space-x-5 cursor-pointer min-w-0 group" onClick={() => handleNavigationChange('home')}>
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-cover rounded-[1rem] sm:rounded-[1.2rem] shadow-[0_10px_20px_rgba(6,182,212,0.5)] border border-cyan-500/50 shrink-0 group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-[1rem] sm:rounded-[1.2rem] bg-gradient-to-br from-cyan-600 to-rose-500 flex items-center justify-center text-white font-serif font-black text-xl sm:text-2xl shadow-[0_10px_25px_rgba(6,182,212,0.6)] border border-cyan-500/50 shrink-0 group-hover:scale-105 transition-transform transform-style-3d translate-z-[20px]">Y</div>
            )}
            <span className="font-serif text-xl sm:text-3xl tracking-tighter text-white font-black truncate max-w-[120px] sm:max-w-xs leading-none uppercase glow-text-cyan">{siteSettings.logoText || 'STUDIO'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-6 shrink-0">
          {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
            <button
              onClick={async () => {
                const permission = await Notification.requestPermission();
                if (permission === "granted" && messaging) {
                  try {
                    const swReg = await navigator.serviceWorker.ready;
                    const token = await getToken(messaging, { vapidKey: 'BNXy2GAYsoxX--4Rgt4Rs-CxEXNmdog91HvY7y6M5__9boxr9tVFJzlBW9N9Y11RLltkDSjHoXw_ctX8OIGL_A4', serviceWorkerRegistration: swReg });
                    if (token && userProfile && db && db.app) {
                      await updateDoc(doc(db, 'profiles', userProfile.id), { fcmToken: token });
                      showToast('Alerts synced! 🎉', 'success');
                    } else {
                      showToast('Could not get device token.', 'warning');
                    }
                  } catch (err) { showToast('Token setup failed.', 'warning'); }
                }
              }}
              className="text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold uppercase tracking-widest"
            >
              🔔 Enable Alerts
            </button>
          )}
          {userProfile && userProfile.status === 'approved' && !isRoastingWaiter && (
            <button onClick={() => currentPage === 'notifications' ? handleNavigationChange('home') : handleNavigationChange('notifications')} className="relative p-3 sm:p-4 hover:bg-cyan-900/40 bg-black/50 rounded-full transition text-white shadow-inner border border-cyan-500/30 backdrop-blur-md">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadMap.overall > 0 && <span className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] sm:text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border border-black shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse">{unreadMap.overall > 9 ? '9+' : unreadMap.overall}</span>}
            </button>
          )}
          {userProfile ? (
            <div className="flex items-center space-x-3 sm:space-x-5 bg-black/40 pr-2 sm:pr-3 pl-4 sm:pl-6 py-1.5 sm:py-2.5 rounded-full border border-cyan-500/30 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)] backdrop-blur-xl cursor-pointer hover:bg-cyan-950/50 transition" onClick={() => handleNavigationChange('profile')}>
              <div className="hidden sm:flex flex-col text-right">
                <p className="text-sm font-black text-white leading-none tracking-wide">{userProfile?.name}</p>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-mono font-bold mt-2">{userProfile?.role}</span>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)] overflow-hidden flex items-center justify-center bg-black">
                {renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}
              </div>
            </div>
          ) : <button onClick={() => setShowSignInModal(true)} className="text-[10px] sm:text-sm font-black btn-cinematic text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full uppercase tracking-widest whitespace-nowrap shadow-[0_10px_20px_rgba(6,182,212,0.6)]">Access Mainframe</button>}
        </div>
      </header>

      {/* --- SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-700 bg-black/90 backdrop-blur-xl ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`absolute left-0 top-0 bottom-0 w-72 sm:w-80 studio-glass border-r border-cyan-500/30 shadow-[30px_0_100px_rgba(0,0,0,0.9)] p-8 sm:p-10 flex flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-[800ms] cubic-bezier(0.16, 1, 0.3, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-10 pb-20">
            <div className="flex items-center justify-between pb-6 border-b border-cyan-500/30">
              <span className="font-serif font-black text-xl sm:text-2xl text-white tracking-wider uppercase glow-text-gold">Menu</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-cyan-300 font-bold p-3 hover:text-white bg-cyan-950/50 rounded-xl transition-colors border border-cyan-500/30">✕</button>
            </div>
            <nav className="space-y-4 relative font-sans">
              {(!userProfile || (userProfile.status === 'approved' && !isRoastingWaiter && !isProfileIncomplete)) && navLinks.map(l => (
                <button key={l.id} onClick={() => handleNavigationChange(l.id)} className={`w-full flex items-center space-x-4 sm:space-x-5 px-5 sm:px-6 py-4 rounded-2xl text-left text-[11px] sm:text-sm font-black uppercase tracking-wider transition-all duration-300 relative ${currentPage === l.id ? 'bg-gradient-to-r from-cyan-600/30 to-transparent shadow-[inset_4px_0_0_#06b6d4] text-white transform scale-105 translate-x-2 border border-cyan-500/20' : 'text-cyan-200/70 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <span className="text-xl sm:text-2xl filter drop-shadow-md">{l.icon}</span>
                  <span className="tracking-widest">{l.label}</span>
                  {l.badge ? <span className="absolute right-6 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span> : null}
                </button>
              ))}
              {userProfile && (
                <button onClick={() => handleNavigationChange('profile')} className={`w-full flex items-center space-x-4 sm:space-x-5 px-5 sm:px-6 py-4 rounded-2xl text-left text-[11px] sm:text-sm font-black uppercase tracking-wider transition-all duration-300 ${currentPage === 'profile' ? 'bg-gradient-to-r from-amber-500/30 to-transparent shadow-[inset_4px_0_0_#fbbf24] text-white transform scale-105 translate-x-2 border border-amber-500/20' : 'text-cyan-200/70 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <span className="text-xl sm:text-2xl filter drop-shadow-md">🪪</span>
                  <span className="tracking-widest">ID Profile {isProfileIncomplete && '⚠️'}</span>
                </button>
              )}
              {isAdmin && !isRoastingWaiter && !isProfileIncomplete && (
                <div className="pt-8 sm:pt-10 border-t border-cyan-500/30 mt-8 sm:mt-10 space-y-4">
                  <span className="text-[9px] sm:text-[10px] font-black text-rose-500 uppercase tracking-widest px-6 block mb-4 font-mono">System Override</span>
                  <button onClick={() => handleNavigationChange('admin')} className={`w-full flex items-center space-x-4 sm:space-x-5 px-5 sm:px-6 py-4 rounded-2xl text-left text-[11px] sm:text-sm font-black uppercase tracking-wider transition-all duration-300 ${currentPage === 'admin' ? 'bg-gradient-to-r from-rose-800/50 to-transparent shadow-[inset_4px_0_0_#e11d48] text-white transform scale-105 translate-x-2 border border-rose-500/20' : 'text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-900/20 border border-transparent'}`}>
                    <span className="text-xl sm:text-2xl filter drop-shadow-md">⚙️</span>
                    <span className="tracking-widest">Admin Console</span>
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className={`relative z-20 max-w-[100rem] mx-auto px-4 sm:px-8 py-8 sm:py-12 studio-page-wrap transition-opacity duration-[1500ms] ease-out ${showIntroLoader ? 'opacity-0' : 'opacity-100'}`}>
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
          !userProfile ? <div className="studio-glass p-16 rounded-[4rem] text-center max-w-lg mx-auto shadow-2xl"><p className="text-cyan-400 font-bold tracking-widest animate-pulse uppercase font-mono text-sm">Fetching ID Protocol...</p></div> : 
          <MyProfileWorkspace userProfile={userProfile} categories={categories} showToast={showToast} handleSignOut={handleSignOut} isOnboarding={isProfileIncomplete} onNavigate={handleNavigationChange} />
        )}
        {currentPage === 'admin' && isAdmin && <AdminPanel profiles={profiles} siteSettings={siteSettings} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} userProfile={userProfile} showToast={showToast} />}
      </main>

      {/* --- GLOBAL USER INSPECTOR MODAL --- */}
      {targetInspectProfile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fadeIn perspective-[2500px]" onClick={() => setInspectUser(null)}>
          <div className="w-full max-w-md studio-glass border-t border-cyan-500/40 rounded-[3rem] sm:rounded-[4rem] p-8 sm:p-12 shadow-[0_50px_100px_rgba(0,0,0,0.9)] relative text-center animate-deepDiveIn" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setInspectUser(null)} className="absolute top-6 sm:top-8 right-6 sm:right-8 font-bold text-cyan-300 hover:text-white transition bg-cyan-950/50 border border-cyan-500/30 rounded-full w-10 h-10 sm:w-12 sm:h-12 shadow-sm flex items-center justify-center hover:scale-110">✕</button>
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] sm:rounded-[2.5rem] border-[6px] border-cyan-500/30 mx-auto overflow-hidden p-1.5 mb-6 sm:mb-8 flex items-center justify-center bg-black/80 shadow-[0_0_30px_rgba(6,182,212,0.5)]">
              {renderAvatar(targetInspectProfile.photoURL, "w-full h-full object-cover rounded-[1.5rem] sm:rounded-[2rem]")}
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-black text-white drop-shadow-xl mb-3 glow-text-gold">{targetInspectProfile.name}</div>
            <span className="bg-cyan-900/40 text-cyan-300 border border-cyan-500/40 text-[9px] sm:text-[10px] px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black mt-2 sm:mt-3 inline-block uppercase tracking-widest font-mono shadow-md">{targetInspectProfile.workCategory} • {targetInspectProfile.role}</span>
            <div className="my-8 sm:my-10 text-cyan-100 font-sans font-semibold text-xs sm:text-sm px-4 sm:px-6 leading-relaxed studio-input py-6 sm:py-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-inner border border-cyan-500/20">{targetInspectProfile.bio || "No bio parameters defined in database."}</div>
            <p className="text-[9px] sm:text-[10px] text-rose-500 font-mono tracking-widest uppercase font-black">ID Registered • {new Date(targetInspectProfile.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {showSignInModal && <SignInModal handleGoogleSignIn={handleGoogleSignIn} setShowSignInModal={setShowSignInModal} showToast={showToast} />}
    </div>
  );
}

function SignInModal({ handleGoogleSignIn, setShowSignInModal, showToast }) {
  const [emailMode, setEmailMode] = useState(false); const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);

  const handleEmailAuthSubmit = async (e) => {
    e.preventDefault(); const cE = email.trim(), cP = password.trim(); if (!cE || !cP) return; if (!auth || !auth.app) { showToast('Offline state.', 'info'); setShowSignInModal(false); return; } setLoading(true);
    try { if (isSignUp) { await createUserWithEmailAndPassword(auth, cE, cP); showToast('Created!', 'success'); } else { await signInWithEmailAndPassword(auth, cE, cP); showToast('Logged in!', 'success'); } setShowSignInModal(false); } catch (err) { showToast('Auth failed.', 'warning'); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fadeIn font-sans perspective-[2000px]">
      <div className="w-full max-w-md studio-glass rounded-[3rem] p-8 sm:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.9)] relative animate-deepDiveIn border-t border-cyan-500/50">
        <button onClick={() => setShowSignInModal(false)} className="absolute top-5 sm:top-6 right-5 sm:right-6 font-bold text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-cyan-900 transition shadow-sm">✕</button>
        <div className="font-serif text-3xl sm:text-4xl font-black text-white text-center mb-2 tracking-wide uppercase drop-shadow-sm glow-text-gold">Join Crew</div><p className="text-[10px] sm:text-xs text-cyan-300 text-center mb-8 sm:mb-10 font-sans font-bold uppercase tracking-widest">Establish credentials to link to studio canvas.</p>
        {!emailMode ? ( 
          <div className="space-y-4">
            <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 sm:gap-4 py-3 sm:py-4 studio-input hover:bg-white/20 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-md transition border border-cyan-500/20"><svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.2 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.3C40.9 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>Google Override</button>
            <div className="relative flex py-3 sm:py-4 items-center"><div className="flex-grow border-t border-cyan-500/30"></div><span className="flex-shrink mx-4 text-cyan-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">or</span><div className="flex-grow border-t border-cyan-500/30"></div></div>
            <button onClick={() => setEmailMode(true)} className="w-full py-3 sm:py-4 bg-cyan-950/80 text-white text-[10px] sm:text-xs font-black rounded-2xl hover:bg-cyan-900 shadow-xl transition border border-cyan-500/30 uppercase tracking-widest">✉️ Email Protocol</button>
          </div> 
        ) : ( 
          <form onSubmit={handleEmailAuthSubmit} className="space-y-4 animate-fadeIn">
            <div><label className="block text-[8px] sm:text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-widest mb-2">Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" className="w-full px-4 sm:px-5 py-3 sm:py-4 studio-input border-cyan-500/30 shadow-inner rounded-xl text-xs sm:text-sm font-bold text-white transition-all focus:ring-2 focus:ring-cyan-500" required /></div>
            <div><label className="block text-[8px] sm:text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-widest mb-2">Secret Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 sm:px-5 py-3 sm:py-4 studio-input border-cyan-500/30 shadow-inner rounded-xl text-xs sm:text-sm font-bold text-white transition-all focus:ring-2 focus:ring-cyan-500" required /></div>
            <button type="submit" disabled={loading} className="w-full py-3 sm:py-4 btn-cinematic border border-cyan-500/50 text-white text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl mt-4 shadow-xl">{loading ? "Authorizing..." : (isSignUp ? "Register Node" : "Access Node")}</button>
            <div className="flex justify-between items-center pt-4 sm:pt-5 text-[9px] sm:text-[10px] font-bold font-mono"><button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors">{isSignUp ? "Already Registered?" : "Need Access?"}</button><button type="button" onClick={() => setEmailMode(false)} className="text-slate-400 hover:text-white uppercase tracking-wider transition-colors">◀ Abort</button></div>
          </form> 
        )}
      </div>
    </div>
  );
}

function CreatorHomeHub({ siteSettings, videos, projects, ytConfig, syncYouTubeStats, isAdmin, notifications, onNavigate, onInspectUser, userProfile, setSelectedProject }) {
  const studioUpdates = useMemo(() => notifications.filter(n => n && n.message && !String(n.message).startsWith('"') && n.actor !== 'System' && n.actor !== userProfile?.name), [notifications, userProfile]);
  const stats = [ 
    { label: 'YouTube Subs', value: ytConfig?.subscribers || '—', icon: '📈', change: ytConfig?.lastError ? `⚠ ${ytConfig.lastError}` : (ytConfig?.lastSyncedAt ? `Synced ${formatTimeAMPM(ytConfig.lastSyncedAt)}` : 'Not synced yet'), action: isAdmin ? (<button onClick={() => syncYouTubeStats()} className="text-[8px] sm:text-[9px] bg-cyan-950/50 text-cyan-300 font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-900 transition mt-3 sm:mt-4 uppercase tracking-widest font-mono shadow-sm backdrop-blur">🔄 Ping API</button>) : null }, 
    { label: 'Latest Video Views', value: ytConfig?.latestVideoViews || '—', icon: '📺', change: ytConfig?.latestVideoTitle ? `"${ytConfig.latestVideoTitle.substring(0, 24)}..."` : '—', action: null }, 
    { label: 'Vault Records', value: `${videos?.length || 0} Masters`, icon: '🎬', change: 'Cloud storage linked', action: null }, 
    { label: 'Active Boards', value: `${projects?.length || 0} Open`, icon: '📌', change: 'Live collaboration sync', action: null } 
  ];
  return (
    <section className="space-y-12 sm:space-y-20 py-6 sm:py-10 font-sans">
      <ScrollReveal className="text-center py-10 sm:py-16" delay={200}>
        <h1 className="font-serif text-4xl sm:text-6xl md:text-[8rem] font-black text-white uppercase tracking-tighter leading-none glow-text-cyan drop-shadow-2xl translate-z-[100px]">{siteSettings?.logoText || 'YOUTUBERS'}</h1>
        <p className="text-cyan-200 font-sans uppercase tracking-widest text-[10px] sm:text-xs md:text-sm mt-6 sm:mt-10 bg-black/50 backdrop-blur-2xl inline-block px-6 sm:px-10 py-3 sm:py-4 rounded-full border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.5)] font-bold">Creative Pipeline Canvas</p>
      </ScrollReveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
        {stats.map((s, idx) => ( 
          <ScrollReveal key={idx} delay={idx * 100}>
            <Hover3DCard className="h-56 sm:h-64 w-full cursor-pointer">
              <div className="w-full h-full studio-glass rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-2xl hover:shadow-[0_40px_100px_rgba(6,182,212,0.4)] flex flex-col justify-between group border-t border-cyan-500/40 bg-black/40">
                <div>
                  <div className="flex justify-between items-start text-cyan-300 mb-3 sm:mb-4"><span className="text-[9px] sm:text-[11px] uppercase font-black tracking-widest font-mono drop-shadow-sm">{s.label}</span><span className="text-3xl sm:text-5xl group-hover:scale-125 transition-transform filter drop-shadow-lg group-hover:-translate-y-2">{s.icon}</span></div>
                  <p className="text-3xl sm:text-5xl font-black text-white font-serif leading-none mt-2 drop-shadow-lg group-hover:text-amber-400 transition-colors">{s.value}</p>
                </div>
                <div className="mt-2"><span className="text-[9px] sm:text-[11px] text-rose-500 font-black block truncate font-mono uppercase tracking-widest">{s.change}</span>{s.action}</div>
              </div>
            </Hover3DCard>
          </ScrollReveal> 
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
        <ScrollReveal delay={400}>
          <Hover3DCard className="h-full w-full">
            <div className="studio-glass p-8 sm:p-14 rounded-[3rem] sm:rounded-[4rem] shadow-2xl border-t border-cyan-500/40 h-full bg-black/40">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 sm:pb-6 mb-6 sm:mb-8"><h3 className="font-serif text-2xl sm:text-3xl font-black text-white drop-shadow-md glow-text-cyan">📢 Broadcast Log</h3><span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md">Live Feed</span></div>
              <div className="space-y-4 sm:space-y-6 max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar pr-3 sm:pr-4">
                {studioUpdates.map(n => (
                  <div key={n.id} className="text-sm sm:text-base leading-relaxed border-l-[3px] sm:border-l-[4px] border-amber-500 pl-4 sm:pl-6 py-3 sm:py-4 animate-fadeIn bg-black/40 rounded-r-[1.5rem] sm:rounded-r-3xl pr-4 sm:pr-5 shadow-sm backdrop-blur">
                    <span className="font-black text-white cursor-pointer hover:text-amber-400 transition-colors drop-shadow-sm" onClick={() => onInspectUser(n.authorUid)}>{n.actor}: </span>
                    <span className="text-cyan-100 font-semibold">{n.message}</span>
                    <p className="text-[8px] sm:text-[10px] text-cyan-400 mt-2 sm:mt-2.5 font-mono font-bold tracking-widest uppercase">{formatTimeAMPM(n.timestamp)}</p>
                  </div>
                ))}
                {studioUpdates.length === 0 && <p className="text-xs sm:text-sm text-slate-500 font-mono font-bold uppercase tracking-widest text-center py-10 sm:py-16">System log empty.</p>}
              </div>
            </div>
          </Hover3DCard>
        </ScrollReveal>
        <ScrollReveal delay={500}>
          <Hover3DCard className="h-full w-full">
            <div className="studio-glass p-8 sm:p-14 rounded-[3rem] sm:rounded-[4rem] shadow-2xl border-t border-cyan-500/40 h-full bg-black/40">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 sm:pb-6 mb-6 sm:mb-8"><h3 className="font-serif text-2xl sm:text-3xl font-black text-white drop-shadow-md glow-text-gold">📌 Pinned Timelines</h3><span className="bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md">Active</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar pr-2 sm:pr-3">
                {projects.slice(0, 6).map(p => (
                  <div key={p.id} onClick={() => { setSelectedProject(p); onNavigate('projects'); }} className="w-full h-full studio-input p-6 sm:p-8 rounded-[1.5rem] sm:rounded-3xl cursor-pointer hover:bg-black/60 hover:border-amber-400/50 transition-all duration-300 shadow-lg group border-cyan-500/20 hover:scale-105">
                    <p className="text-base sm:text-lg font-black text-white truncate group-hover:text-amber-400 drop-shadow-sm">{p.title}</p>
                    <p className="text-[8px] sm:text-[10px] text-cyan-500 font-mono font-bold mt-3 sm:mt-4 tracking-widest uppercase">Expires: {getExpiry30(p.createdAt)}</p>
                  </div>
                ))}
                {projects.length === 0 && <p className="text-xs sm:text-sm text-slate-500 font-mono font-bold uppercase tracking-widest text-center py-10 sm:py-16 col-span-1 sm:col-span-2">No boards established.</p>}
              </div>
            </div>
          </Hover3DCard>
        </ScrollReveal>
      </div>
    </section>
  );
}

function NotificationsFeed({ notifications, onNavigate, setActiveVideo, videos, onInspectUser }) {
  const handleNotificationClick = (notif) => {
    const msg = (notif.message || '').toLowerCase();
    if (msg.includes('video asset') || msg.includes('commented on video')) { onNavigate('vault'); const match = videos.find(v => msg.includes(v.title.toLowerCase())); if (match) setActiveVideo(match); } else if (msg.includes('concept whiteboard') || msg.includes('task') || msg.includes('project')) { onNavigate('projects'); } else if (msg.includes('script topic')) { onNavigate('scripts'); } else if (msg.includes('showroom draft') || msg.includes('showroom feed') || msg.includes('instagram')) { onNavigate('posts'); } else if (msg.startsWith('"')) { onNavigate('chat'); } else { onNavigate('home'); }
  };
  const sortedNotifs = useMemo(() => [...notifications].sort((a, b) => b.timestamp - a.timestamp), [notifications]);
  return (
    <ScrollReveal className="studio-glass p-8 sm:p-16 rounded-[3rem] sm:rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] max-w-5xl mx-auto min-h-[75vh] flex flex-col border-t border-cyan-500/50 bg-black/60 mt-6 sm:mt-10">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-6 sm:pb-8 mb-8 sm:mb-10"><h2 className="font-serif text-3xl sm:text-4xl font-black text-white flex items-center gap-4 sm:gap-5 glow-text-cyan">📡 Radar / Updates Log</h2></div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 sm:pr-4 space-y-4 sm:space-y-6">
        {sortedNotifs.map((n, idx) => (
          <ScrollReveal key={n.id} delay={idx * 50}>
            <div onClick={() => handleNotificationClick(n)} className="flex items-start gap-4 sm:gap-6 p-6 sm:p-8 studio-input rounded-[1.5rem] sm:rounded-3xl hover:border-amber-400/50 hover:bg-black/80 cursor-pointer transition-all duration-300 shadow-lg border-cyan-500/20 group">
              <div className="mt-1.5 sm:mt-2 w-3 h-3 sm:w-4 sm:h-4 bg-amber-500 rounded-full shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.8)] group-hover:scale-150 transition-transform" />
              <div className="flex-1 min-w-0">
                <p className="text-base sm:text-xl font-black text-white leading-snug drop-shadow-md">{n.message}</p>
                <div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-5">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-cyan-300 hover:text-amber-400 transition-colors" onClick={(e) => { e.stopPropagation(); onInspectUser(n.authorUid); }}>{n.actor}</span>
                  <span className="text-slate-600 text-[10px] sm:text-xs font-black">•</span>
                  <span className="text-[8px] sm:text-[10px] font-mono text-rose-500 font-bold tracking-widest uppercase">{formatDateTimeAMPM(n.timestamp)}</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
        {sortedNotifs.length === 0 && <div className="text-center py-32 sm:py-40 text-slate-500 font-mono font-bold tracking-widest uppercase text-sm sm:text-base">Radar clear. No recent activity.</div>}
      </div>
    </ScrollReveal>
  );
}

function CrewSection({ profiles, userProfile, showToast, isAdmin, onInspectUser }) {
  const [focusIdx, setFocusIdx] = useState(0); const [memberToDelete, setMemberToDelete] = useState(null);
  const approvedProfiles = useMemo(() => profiles.filter(p => p.status === 'approved'), [profiles]);
  const removeMember = async () => { if (!memberToDelete || !db || !db.app) return; try { await deleteDoc(doc(db, 'profiles', memberToDelete.id)); showToast('Crew member removed.', 'success'); } catch (err) { showToast('Failed to remove.', 'warning'); } setMemberToDelete(null); };

  if (approvedProfiles.length === 0) return <div className="text-center text-slate-500 font-mono font-bold tracking-widest py-40 uppercase text-base">Database empty.</div>;
  return (
    <section className="py-8 sm:py-10 animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
      <ScrollReveal className="lg:col-span-1 studio-glass p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] text-center shadow-2xl h-fit border-t border-cyan-500/50 bg-black/60">
        <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border-[4px] sm:border-[6px] border-cyan-500/20 mx-auto overflow-hidden p-1.5 sm:p-2 mb-8 sm:mb-10 flex items-center justify-center bg-black/50 shadow-[0_0_50px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform cursor-pointer">{renderAvatar(approvedProfiles[focusIdx]?.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(approvedProfiles[focusIdx]?.id))}</div>
        <div className="font-serif text-4xl sm:text-5xl font-black text-white cursor-pointer hover:text-amber-400 transition-colors glow-text-gold" onClick={() => onInspectUser(approvedProfiles[focusIdx]?.id)}>{approvedProfiles[focusIdx]?.name}</div>
        <p className="text-xs sm:text-sm font-mono text-cyan-300 mt-3 sm:mt-4 tracking-widest uppercase font-bold">{approvedProfiles[focusIdx]?.email}</p>
        <span className="bg-cyan-950/50 text-cyan-400 border border-cyan-500/40 text-[10px] sm:text-xs px-6 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black mt-6 sm:mt-8 inline-block shadow-lg uppercase tracking-widest">{approvedProfiles[focusIdx]?.role}</span>
        {approvedProfiles[focusIdx]?.bio && <p className="text-sm sm:text-base text-cyan-100 mt-8 sm:mt-10 studio-input p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] font-semibold leading-relaxed shadow-inner border border-white/10 bg-black/40">"{approvedProfiles[focusIdx].bio}"</p>}
      </ScrollReveal>
      <ScrollReveal className="lg:col-span-2 studio-glass p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl max-h-[600px] sm:max-h-[800px] overflow-y-auto custom-scrollbar border-t border-cyan-500/50 bg-black/60" delay={200}>
        <h4 className="font-serif font-black text-3xl sm:text-4xl border-b border-cyan-500/20 pb-6 sm:pb-8 mb-8 sm:mb-10 text-white drop-shadow-md glow-text-cyan">Production Roster</h4>
        <div className="space-y-4 sm:space-y-6 pr-2 sm:pr-3">
          {profiles.map((p) => (
            <LongPressable key={p.id} onLongPress={() => { if (isAdmin && (p.email || '').toLowerCase() !== ADMIN_EMAIL) setMemberToDelete(p); }} className="flex justify-between items-center p-5 sm:p-6 studio-input rounded-[2rem] sm:rounded-[2.5rem] hover:bg-black/60 transition-all shadow-lg cursor-pointer border border-cyan-500/20 group hover:scale-[1.02] hover:border-amber-500/50">
              <div className="flex items-center space-x-4 sm:space-x-6 min-w-0 flex-1">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 sm:border-4 border-cyan-500/20 p-1 flex items-center justify-center bg-black shadow-md shrink-0 group-hover:border-amber-400 transition-colors">{renderAvatar(p.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(p.id))}</div>
                <div className="cursor-pointer min-w-0 flex-1" onClick={() => setFocusIdx(approvedProfiles.indexOf(p) !== -1 ? approvedProfiles.indexOf(p) : 0)}>
                  <p className="text-xl sm:text-2xl font-black text-white truncate group-hover:text-amber-400 transition-colors drop-shadow-sm" onClick={() => onInspectUser(p.id)}>{p.name}</p>
                  <span className="text-[9px] sm:text-[11px] font-mono font-bold text-slate-400 block truncate mt-2 sm:mt-3 tracking-widest uppercase">{p.email} • {p.role} • {p.workCategory}</span>
                </div>
              </div>
            </LongPressable>
          ))}
        </div>
      </ScrollReveal>
      {memberToDelete && <LongPressMenu title={`Expel ${memberToDelete.name}?`} onConfirm={removeMember} onCancel={() => setMemberToDelete(null)} confirmText="Confirm Expulsion" />}
    </section>
  );
}

function CategoriesViewSection({ profiles, categories, showToast, onInspectUser }) {
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Editing'); const [newCatInput, setNewCustomCategory] = useState('');
  const handleAddCategory = async (e) => { e.preventDefault(); const clean = newCatInput.trim(); if (!clean || !db || !db.app) return; if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) { showToast('Category exists.', 'warning'); return; } await setDoc(doc(db, 'meta/categories'), { list: arrayUnion(clean) }, { merge: true }); setActiveCategory(clean); setNewCustomCategory(''); showToast(`Category added.`, 'success'); };
  const matchedMembers = useMemo(() => profiles.filter(p => p.status === 'approved' && p.workCategory === activeCategory), [profiles, activeCategory]);

  return (
    <section className="py-6 sm:py-8 animate-fadeIn grid grid-cols-1 lg:grid-cols-4 gap-8 sm:gap-12">
      <ScrollReveal className="lg:col-span-1 studio-glass p-8 sm:p-10 rounded-[3rem] shadow-2xl space-y-8 sm:space-y-10 border-t border-cyan-500/50 bg-black/60">
        <div><h4 className="font-serif text-xl sm:text-2xl font-black text-white mb-5 sm:mb-6 drop-shadow-sm glow-text-cyan">Define Sub-Routine</h4><form onSubmit={handleAddCategory} className="space-y-4 sm:space-y-5"><input type="text" value={newCatInput} onChange={(e) => setNewCustomCategory(e.target.value)} placeholder="e.g. CGI Artist" className="w-full px-5 sm:px-6 py-4 sm:py-5 studio-input rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-bold uppercase tracking-widest border border-cyan-500/20 shadow-inner focus:ring-4 focus:ring-amber-500/30" required /><button type="submit" className="w-full py-4 sm:py-5 btn-cinematic text-white text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-lg border border-white/20">Append Tag</button></form></div>
        <div className="pt-6 sm:pt-8 border-t border-cyan-500/20 space-y-3 sm:space-y-4"><span className="text-[9px] sm:text-[11px] font-black text-rose-500 uppercase tracking-widest block mb-4 sm:mb-6 drop-shadow-sm font-mono">Active Divisions</span>{categories.map((cat, idx) => (<button key={idx} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-5 sm:px-6 py-4 sm:py-5 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-md border ${activeCategory === cat ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500/50 transform scale-105' : 'studio-input text-cyan-200 hover:text-white hover:bg-black/40 border-cyan-500/20'}`}>🎬 {cat}</button>))}</div>
      </ScrollReveal>
      <ScrollReveal className="lg:col-span-3 studio-glass p-8 sm:p-14 rounded-[3rem] sm:rounded-[4rem] shadow-2xl space-y-8 sm:space-y-10 border-t border-cyan-500/50 bg-black/60" delay={200}>
        <div className="flex justify-between items-center border-b border-cyan-500/20 pb-6 sm:pb-8"><h3 className="font-serif text-3xl sm:text-5xl font-black text-white drop-shadow-md glow-text-gold">Division: <span className="text-cyan-500">{activeCategory}</span></h3><span className="text-[10px] sm:text-sm bg-black/40 border border-cyan-500/30 px-5 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-mono font-black text-white uppercase tracking-widest shadow-lg backdrop-blur-md">{matchedMembers.length} Operatives</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4 sm:pt-6">
          {matchedMembers.map((member, idx) => (
            <ScrollReveal key={member.id} delay={idx * 100} className="flex items-center space-x-4 sm:space-x-6 p-5 sm:p-6 studio-input rounded-[2rem] sm:rounded-[2.5rem] hover:border-amber-500/40 hover:bg-black/60 transition-all cursor-pointer group shadow-lg border border-cyan-500/20 hover:scale-[1.03]">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 sm:border-4 border-white/10 bg-black overflow-hidden p-0.5 sm:p-1 flex items-center justify-center shrink-0 shadow-md group-hover:border-rose-400 transition-colors">{renderAvatar(member.photoURL, "w-full h-full object-cover rounded-full", () => onInspectUser(member.id))}</div>
              <div className="min-w-0"><h5 className="font-black text-lg sm:text-2xl text-white truncate group-hover:text-amber-400 transition-colors drop-shadow-sm" onClick={() => onInspectUser(member.id)}>{member.name}</h5><p className="text-[9px] sm:text-[11px] text-slate-400 font-mono tracking-widest uppercase mt-1.5 sm:mt-2 truncate font-bold">{member.email}</p><span className="inline-block bg-cyan-900/30 text-cyan-400 border border-cyan-500/40 text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl mt-3 sm:mt-4 uppercase tracking-widest shadow-sm">{member.role}</span></div>
            </ScrollReveal>
          ))}
          {matchedMembers.length === 0 && <div className="col-span-full py-32 sm:py-40 text-center text-slate-500 font-mono font-bold tracking-widest uppercase text-sm sm:text-base">No operatives found in this division.</div>}
        </div>
      </ScrollReveal>
    </section>
  );
}

function PostsWorkspace({ posts, projects, userProfile, showToast, pushNotification, isAdmin, onInspectUser, expandedPost, setExpandedPost }) {
  const [postTitle, setPostTitle] = useState(''); const [postText, setPostText] = useState(''); const [relatedProjectId, setRelatedProjectId] = useState(''); const [showCreateModal, setShowCreatePostModal] = useState(false); const [publishing, setPublishing] = useState(false); const [postToDelete, setPostToDelete] = useState(null); const [commentToDelete, setCommentToDelete] = useState(null);
  const fileInputRef = useRef(null);

  const publishPost = async (e) => { e.preventDefault(); const file = fileInputRef.current?.files[0]; if (!postTitle.trim() || !file || !db || !db.app) return; setPublishing(true); try { const compressedString = await compressAndConvertImage(file, 500); await addDoc(collection(db, 'posts'), { title: postTitle.trim(), description: postText.trim(), image: compressedString, relatedProjectId: relatedProjectId, authorName: userProfile.name, authorAvatar: userProfile.photoURL, authorUid: userProfile.id, likes: 0, likedBy: [], comments: [], createdAt: Date.now() }); pushNotification(`Pushed to gallery: "${postTitle}"`, 'post', {}, userProfile.name); setPostTitle(''); setPostText(''); setRelatedProjectId(''); setShowCreatePostModal(false); showToast('Asset injected to gallery.', 'success'); } catch (err) { showToast('Injection failed.', 'warning'); } finally { setPublishing(false); } };
  const toggleLikePost = async (post) => { if (!db || !db.app) return; const hasLiked = post.likedBy?.includes(userProfile.id); const newLikedBy = hasLiked ? post.likedBy.filter(u => u !== userProfile.id) : [...(post.likedBy || []), userProfile.id]; await updateDoc(doc(db, 'posts', post.id), { likedBy: newLikedBy, likes: newLikedBy.length }); if (expandedPost?.id === post.id) { setExpandedPost({ ...expandedPost, likedBy: newLikedBy, likes: newLikedBy.length }); } };
  const handleAddPostComment = async (e, postId) => { e.preventDefault(); if (!db || !db.app) return; const commentVal = e.target.commentInputText.value.trim(); if (!commentVal) return; const newComment = { id: 'pc_' + Date.now(), authorUid: userProfile.id, authorName: userProfile.name, text: commentVal, timestamp: Date.now() }; await updateDoc(doc(db, 'posts', postId), { comments: arrayUnion(newComment) }); pushNotification(`Analyzed gallery asset 📸`, 'post', {}, userProfile?.name, 'admin'); e.target.commentInputText.value = ''; showToast('Analysis appended.', 'success'); if (expandedPost?.id === postId) { setExpandedPost({ ...expandedPost, comments: [...(expandedPost.comments || []), newComment] }); } };
  const removePost = async () => { if (!postToDelete || !db || !db.app) return; await deleteDoc(doc(db, 'posts', postToDelete)); if (expandedPost?.id === postToDelete) setExpandedPost(null); setPostToDelete(null); showToast("Asset purged.", "info"); };
  const removePostComment = async () => { if (!commentToDelete || !db || !db.app) return; const { postId, postComments, commentId } = commentToDelete; const updatedComments = postComments.filter(x => x.id !== commentId); await updateDoc(doc(db, 'posts', postId), { comments: updatedComments }); if (expandedPost?.id === postId) { setExpandedPost({ ...expandedPost, comments: updatedComments }); } setCommentToDelete(null); showToast("Analysis redacted.", "info"); };

  if (expandedPost) {
    return (
      <ScrollReveal className="studio-glass min-h-[85vh] sm:rounded-[4rem] border-t border-cyan-500/50 shadow-[0_50px_100px_rgba(0,0,0,0.9)] flex flex-col font-sans relative z-30 overflow-hidden bg-black/60 mt-10">
        <div className="p-8 border-b border-white/10 flex items-center gap-5 shrink-0 bg-white/5 backdrop-blur-2xl">
          <button onClick={() => setExpandedPost(null)} className="p-4 hover:bg-white/20 bg-white/10 rounded-full transition shadow-md border border-white/20 text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <span className="font-serif font-black text-white text-2xl tracking-widest uppercase drop-shadow-sm glow-text-cyan">Return to Gallery</span>
        </div>
        <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-transparent backdrop-blur-xl">
          <div className="md:w-3/5 bg-black/90 flex items-center justify-center p-12 border-r border-white/10 shadow-[inset_0_0_100px_rgba(0,0,0,1)]">
            <img src={expandedPost.image} alt={expandedPost.title} className="max-w-full max-h-[70vh] object-contain rounded-[2rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/10" />
          </div>
          <div className="md:w-2/5 flex flex-col bg-black/40 shrink-0 backdrop-blur-3xl">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full border-2 border-white/20 p-1 bg-black shadow-lg">{renderAvatar(expandedPost.authorAvatar, "w-full h-full object-cover rounded-full", () => { setExpandedPost(null); onInspectUser(expandedPost.authorUid); })}</div>
                <div>
                  <p className="font-black text-2xl text-white cursor-pointer hover:text-cyan-400 transition-colors drop-shadow-md" onClick={() => { setExpandedPost(null); onInspectUser(expandedPost.authorUid); }}>{expandedPost.authorName}</p>
                  <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 drop-shadow-sm mt-1">{formatDateTimeAMPM(expandedPost.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 border-b border-white/10">
              <LongPressable onLongPress={() => { if (isAdmin || expandedPost.authorUid === userProfile?.id) setPostToDelete(expandedPost.id); }} className="cursor-pointer hover:bg-white/5 p-6 -mx-2 rounded-[2.5rem] transition border border-transparent hover:border-white/10 shadow-lg mb-6 bg-black/20">
                <h3 className="font-black text-3xl text-white mb-5 font-serif drop-shadow-lg tracking-wide uppercase">{expandedPost.title}</h3>
                {expandedPost.description && <p className="text-base font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap drop-shadow-sm">{expandedPost.description}</p>}
              </LongPressable>
              <div className="space-y-5 mt-8 pt-8 border-t border-dashed border-white/20">
                <h4 className="font-black text-[11px] text-slate-500 uppercase tracking-[0.2em] mb-6 border-b border-white/10 pb-4 drop-shadow-sm">Analysis Logs</h4>
                {(expandedPost.comments || []).map((c, i) => (
                  <LongPressable key={i} onLongPress={() => { if (isAdmin || c.authorName === userProfile.name) setCommentToDelete({ postId: expandedPost.id, postComments: expandedPost.comments, commentId: c.id }); }} className="flex justify-between items-start group text-base p-6 studio-input rounded-3xl hover:border-cyan-500/50 hover:bg-white/10 cursor-pointer transition shadow-lg border border-white/10 bg-black/40">
                    <div className="flex flex-col gap-2 min-w-0 pr-2">
                      <span className="font-black text-white cursor-pointer hover:text-cyan-400 transition-colors drop-shadow-sm" onClick={(e) => { e.stopPropagation(); setExpandedPost(null); onInspectUser(c.authorUid); }}>{c.authorName}</span>
                      <span className="text-slate-300 font-semibold leading-relaxed drop-shadow-sm">{c.text}</span>
                    </div>
                  </LongPressable>
                ))}
                {(!expandedPost.comments || expandedPost.comments.length === 0) && <p className="text-sm text-slate-500 font-mono tracking-widest uppercase text-center py-16 italic drop-shadow-sm border border-dashed border-white/10 rounded-[2rem] m-2 bg-black/20">No data appended.</p>}
              </div>
            </div>
            <div className="p-8 bg-white/5 shrink-0 rounded-br-[4rem]">
              <div className="flex items-center gap-5 mb-8">
                <button onClick={() => toggleLikePost(expandedPost)} className="text-5xl transition-transform active:scale-125 filter drop-shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-110">{expandedPost.likedBy?.includes(userProfile?.id) ? '❤️' : '🤍'}</button>
                <span className="font-black text-2xl text-white drop-shadow-md uppercase tracking-wider">{expandedPost.likes || 0} Approvals</span>
              </div>
              <form onSubmit={(e) => handleAddPostComment(e, expandedPost.id)} className="flex gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-white/20 p-1 bg-black hidden sm:block shrink-0 shadow-lg">{renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}</div>
                <input name="commentInputText" type="text" placeholder="Append analysis..." className="flex-1 px-6 py-4 studio-input border border-white/10 shadow-inner rounded-2xl text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/40 transition-all bg-black/40" required />
                <button type="submit" className="btn-cinematic text-white rounded-2xl font-black px-8 text-sm uppercase tracking-widest shadow-xl border border-cyan-500/50">Append</button>
              </form>
            </div>
          </div>
        </div>
        {postToDelete && <LongPressMenu title="Purge this entire asset record?" onConfirm={removePost} onCancel={() => setPostToDelete(null)} confirmText="Purge Asset" />}
        {commentToDelete && <LongPressMenu title="Redact this analysis?" onConfirm={removePostComment} onCancel={() => setCommentToDelete(null)} confirmText="Redact" />}
      </ScrollReveal>
    );
  }

  return (
    <section className="py-6 animate-fadeIn space-y-12 font-sans px-4 sm:px-0">
      <ScrollReveal className="flex justify-between items-center studio-glass p-8 sm:p-12 rounded-[3rem] shadow-2xl border-t border-cyan-500/50 gap-6 bg-black/40">
        <h2 className="font-serif text-3xl sm:text-5xl font-black text-white uppercase tracking-widest glow-text-cyan">📸 Digital Gallery Feed</h2>
        <button onClick={() => setShowCreatePostModal(true)} className="btn-cinematic text-white font-black text-xs sm:text-sm px-10 py-5 rounded-2xl shadow-xl transition-all font-mono uppercase tracking-widest whitespace-nowrap border border-white/30 hover:scale-105">Inject Media</button>
      </ScrollReveal>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-10 max-w-7xl mx-auto animate-fadeIn space-y-10">
        {posts.map((post, idx) => {
          const amLiked = post.likedBy?.includes(userProfile?.id);
          return (
            <ScrollReveal key={post.id} delay={idx * 100}>
              <Hover3DCard className="w-full h-full cursor-pointer">
                <LongPressable onLongPress={() => { if (isAdmin || post.authorUid === userProfile?.id) setPostToDelete(post.id); }} className="break-inside-avoid studio-glass border-t border-cyan-500/30 rounded-[3rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] hover:shadow-[0_40px_80px_rgba(6,182,212,0.3)] transition-all duration-700 cursor-pointer group flex flex-col h-full bg-black/50">
                  <div className="w-full aspect-video bg-black relative flex items-center justify-center overflow-hidden border-b border-white/10">
                    {post.image ? <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms] opacity-60 group-hover:opacity-100" /> : <div className={`absolute inset-0 bg-gradient-to-br from-cyan-900/60 to-blue-900/80 group-hover:scale-110 transition-transform duration-[1500ms] flex flex-col items-center justify-center p-8 text-center select-none backdrop-blur-xl`}><span className="text-6xl mb-6 filter drop-shadow-2xl">📸</span><span className="text-xl font-serif font-black tracking-widest text-white uppercase line-clamp-2 px-4 drop-shadow-md">{post.title}</span></div>}
                    <div className="absolute top-5 right-5 bg-black/80 backdrop-blur-xl text-cyan-400 border border-cyan-500/30 text-[10px] font-bold font-mono tracking-widest uppercase px-4 py-2 rounded-xl shadow-lg">TTL: {getExpiry7(post.createdAt)}</div>
                  </div>
                  <div className="p-8 flex flex-col justify-between flex-1 bg-white/5" onClick={() => setExpandedPost(post)}>
                    <h3 className="font-serif font-black text-white text-2xl leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors mb-6 drop-shadow-sm">{post.title}</h3>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-black border-2 border-white/20 shadow-lg">{renderAvatar(post.authorAvatar || PRESET_AVATARS[0].svg, "w-full h-full object-cover", (e) => { e.stopPropagation(); onInspectUser(post.authorUid); })}</div>
                      <div className="text-slate-400 text-[11px] font-mono font-bold uppercase tracking-widest truncate flex-1 leading-relaxed">{post.authorName}</div>
                    </div>
                  </div>
                </LongPressable>
              </Hover3DCard>
            </ScrollReveal>
          );
        })}
      </div>
      {posts.length === 0 && <ScrollReveal><div className="text-center text-slate-500 font-mono tracking-widest py-40 uppercase studio-input rounded-[4rem] border-dashed border-white/10 m-6 shadow-inner font-bold text-base bg-black/40">Gallery currently empty.</div></ScrollReveal>}
      {showCreateModal && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
          <form onSubmit={publishPost} className="studio-glass border-t border-cyan-500/50 p-12 rounded-[4rem] w-full max-w-xl space-y-8 font-sans shadow-[0_50px_100px_rgba(0,0,0,0.9)] animate-deepDiveIn bg-black/80">
            <div className="border-b border-white/10 pb-6 mb-6"><h4 className="font-serif font-black text-white text-3xl uppercase tracking-widest glow-text-cyan">Inject Media</h4></div>
            <div><label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest mb-3">Asset Designation</label><input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} className="w-full px-6 py-5 studio-input rounded-2xl text-base font-bold text-white transition-all border border-white/10 shadow-inner focus:ring-4 focus:ring-cyan-500/40 outline-none placeholder-slate-600 bg-black/40" placeholder="e.g. Master Edit V3" required /></div>
            <div><label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest mb-3">Context Data</label><input type="text" value={postText} onChange={e => setPostText(e.target.value)} className="w-full px-6 py-5 studio-input rounded-2xl text-base font-bold text-white transition-all border border-white/10 shadow-inner focus:ring-4 focus:ring-cyan-500/40 outline-none placeholder-slate-600 bg-black/40" placeholder="..." required /></div>
            <div><label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest mb-3">Attach to Board (Opt)</label><select value={relatedProjectId} onChange={e => setRelatedProjectId(e.target.value)} className="w-full px-6 py-5 studio-input rounded-2xl text-base font-bold text-slate-400 transition-all border border-white/10 shadow-inner focus:ring-4 focus:ring-cyan-500/40 outline-none bg-black/40"><option value="">-- Standalone Asset --</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
            <div className="pt-2"><label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-3">Target File</label><input type="file" ref={fileInputRef} accept="image/*" className="w-full text-sm font-bold text-slate-500 font-sans file:mr-6 file:py-3.5 file:px-6 file:rounded-xl file:border-0 file:text-[11px] file:uppercase file:tracking-widest file:font-black file:bg-white/10 file:text-white hover:file:bg-white/20 file:transition-colors file:shadow-md cursor-pointer" required /></div>
            <div className="flex gap-5 justify-end pt-8 border-t border-white/10"><button type="button" onClick={() => setShowCreatePostModal(false)} className="px-10 py-4 studio-input hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-sm font-black uppercase tracking-widest transition shadow-sm border border-white/10">Abort</button><button type="submit" disabled={publishing} className="px-10 py-4 btn-cinematic text-white font-black text-sm rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(225,29,72,0.4)] transition">{publishing ? 'Uplinking...' : 'Execute'}</button></div>
          </form>
        </div>
      )}
      {postToDelete && <LongPressMenu title="Purge this entire asset record?" onConfirm={removePost} onCancel={() => setPostToDelete(null)} confirmText="Purge Asset" />}
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
    <section className="max-w-3xl mx-auto studio-glass border-t border-cyan-500/50 rounded-[4rem] p-10 sm:p-16 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative animate-fadeIn font-sans mt-10 bg-black/60">
      <div className="text-center mb-12 border-b border-white/10 pb-8">
        <h2 className="font-serif text-4xl sm:text-5xl font-black text-white drop-shadow-lg uppercase tracking-widest glow-text-cyan">{isOnboarding ? "Identity Initialization 🚀" : "Identity Parameters"}</h2>
        {isOnboarding && <p className="text-[11px] text-amber-400 font-mono tracking-widest font-bold mt-5 drop-shadow-sm uppercase">Input designation and specs to bypass firewall.</p>}
      </div>
      <div className="flex flex-col items-center mb-12 font-sans relative">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[2rem] border-[6px] border-cyan-500/40 bg-black backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center justify-center mb-4 font-sans relative z-10 hover:scale-105 transition-transform">
          {renderAvatar(uploadedPhotoUrl, "w-full h-full object-cover rounded-[1.5rem]")}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 sm:w-64 sm:h-64 border border-white/10 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-56 sm:h-56 border border-cyan-500/20 rounded-full animate-[spin_7s_linear_infinite_reverse] pointer-events-none"></div>
      </div>
      <form onSubmit={saveProfileSettings} className="space-y-8 font-sans animate-fadeIn relative z-20">
        <div>
          <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest drop-shadow-sm mb-3">Designation (Display Name)</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-6 py-5 studio-input rounded-2xl text-base font-bold text-white focus:ring-4 focus:ring-cyan-500/40 outline-none shadow-inner transition-all border border-white/10 bg-black/40" required />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest font-sans drop-shadow-sm mb-3">Primary Spec</label>
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} className="w-full px-6 py-5 studio-input rounded-2xl text-base font-bold text-white focus:ring-4 focus:ring-cyan-500/40 outline-none shadow-inner transition-all border border-white/10 bg-black/40">
              {categories.map((cat, idx) => <option key={idx} value={cat} className="bg-slate-900 text-white">{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest font-sans drop-shadow-sm mb-3">Visual ID Override (PFP)</label>
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                try {
                  const b64 = await compressAndConvertImage(file, 250);
                  setUploadedPhotoUrl(b64);
                } catch (err) { showToast('Image compression failed.', 'warning'); }
              }
            }} className="w-full text-[11px] font-bold text-slate-400 mt-1 file:py-3.5 file:px-6 file:border-0 file:rounded-xl file:bg-white/10 file:shadow-sm hover:file:bg-white/20 file:transition-colors file:font-black file:text-white file:uppercase file:tracking-widest cursor-pointer" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest drop-shadow-sm mb-3">Bio-Data (Specs / Details)</label>
          <textarea value={bioInput} onChange={e => setBioInput(e.target.value)} placeholder="Input parameters..." className="w-full px-6 py-5 studio-input rounded-2xl text-base font-bold text-white placeholder-slate-600 focus:ring-4 focus:ring-cyan-500/40 outline-none font-sans leading-relaxed shadow-inner transition-all border border-white/10 bg-black/40" rows={4} maxLength={250} />
          <p className="text-[10px] font-black text-right text-cyan-500 mt-3 font-mono drop-shadow-sm">{bioInput.length}/250 BYTE LIMIT</p>
        </div>

        <button type="submit" disabled={saving} className="w-full py-5 btn-cinematic text-white text-base font-black uppercase rounded-2xl tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 mt-6 border border-white/30">
          {saving ? 'Syncing Data...' : 'Confirm Identity & Execute'}
        </button>
      </form>
      
      {!isOnboarding && (
        <div className="border-t border-white/10 mt-12 pt-10 font-sans">
          <h4 className="font-serif text-lg font-black text-white mb-6 drop-shadow-sm tracking-wide">Register Custom Tag</h4>
          <form onSubmit={handleRegisterCategory} className="flex flex-col sm:flex-row gap-5 font-sans">
            <input type="text" value={newCatInp} onChange={(e) => setNewCatInp(e.target.value)} placeholder="e.g. SFX Supervisor" className="flex-1 px-6 py-4 studio-input rounded-2xl text-base font-bold text-white placeholder-slate-600 outline-none focus:ring-4 focus:ring-cyan-500/40 shadow-inner transition-all border border-white/10 bg-black/40" required />
            <button type="submit" className="px-10 py-4 btn-cinematic text-white text-sm rounded-2xl font-black font-sans shadow-lg border border-white/30 transition-all uppercase tracking-widest">Append</button>
          </form>
        </div>
      )}

      <div className="border-t border-white/10 mt-12 pt-10 text-center">
        <button onClick={handleSignOut} className="text-sm font-black text-rose-500 hover:text-white hover:bg-rose-600 transition-all studio-input border border-rose-500/30 px-10 py-4 rounded-2xl uppercase tracking-widest shadow-lg">Sever Connection (Sign Out)</button>
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

const approve = async (uid) => {
    if (!db || !db.app) return;
    await updateDoc(doc(db, 'profiles', uid), { status: 'approved' });
    try {
      const targetSnap = await getDoc(doc(db, 'profiles', uid));
      const target = targetSnap.data();
      if (target?.fcmToken) {
        try {
          const res = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: target.fcmToken, title: 'Youtubers Studio', body: `Welcome aboard, ${target.name}! Your crew application has been approved 🎉` }),
          });
          if (res.status === 410) { await updateDoc(doc(db, 'profiles', uid), { fcmToken: null }); }
        } catch (e) {}
      }
    } catch (e) {}
  };
  const promote = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'admin', status: 'approved' }); };
  const makeWaiter = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'roasting waiter', status: 'approved' }); };
  const demote = (uid) => { if (db && db.app) updateDoc(doc(db, 'profiles', uid), { role: 'member' }); };
  const remove = (uid) => { if (db && db.app) deleteDoc(doc(db, 'profiles', uid)); };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 animate-fadeIn font-sans py-6 sm:py-8">
      <div className="col-span-1 space-y-8 sm:space-y-12">
        <ScrollReveal className="studio-glass border-t border-cyan-500/50 p-8 sm:p-12 rounded-[3rem] shadow-2xl space-y-6 sm:space-y-8 font-sans bg-black/60">
          <h3 className="font-serif font-black border-b border-white/10 pb-5 text-white text-2xl drop-shadow-md uppercase tracking-widest glow-text-red">Global Branding</h3>
          <div><label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest drop-shadow-sm mb-3">Master Terminal Designation</label><input type="text" value={logoTxt} onChange={(e) => setLogoTxt(e.target.value)} className="w-full px-6 py-4 studio-input rounded-2xl text-base font-bold text-white outline-none focus:ring-4 focus:ring-cyan-500/40 transition-all shadow-inner border border-white/10 bg-black/40" /></div>
          <div><label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest font-sans drop-shadow-sm mb-3">Global Icon</label><input type="file" accept="image/*" onChange={triggerSiteLogoUpload} className="w-full text-[11px] font-bold text-slate-400 mt-2 file:py-3 file:px-6 file:border-0 file:rounded-xl file:bg-white/10 file:shadow-md file:text-white file:font-black file:uppercase file:tracking-widest hover:file:bg-white/20 transition-colors cursor-pointer" /></div>
          <button onClick={saveLogoText} className="w-full py-4 btn-cinematic text-white text-sm rounded-2xl font-black font-sans shadow-[0_0_20px_rgba(6,182,212,0.4)] transition uppercase tracking-widest mt-4">Lock In</button>
        </ScrollReveal>

        <ScrollReveal className="studio-glass border-t border-cyan-500/50 p-8 sm:p-12 rounded-[3rem] shadow-2xl font-sans space-y-6 sm:space-y-8 bg-black/60" delay={150}>
          <h3 className="font-serif font-black border-b border-white/10 pb-5 text-white text-2xl drop-shadow-md uppercase tracking-widest glow-text-red">API Integration</h3>
          {ytConfig.lastError && <p className="text-[10px] text-rose-300 bg-rose-900/40 border border-rose-500/50 px-5 py-4 rounded-xl font-mono uppercase tracking-widest shadow-inner">⚠ Error: {ytConfig.lastError}</p>}
          <form onSubmit={handleYtSave} className="space-y-6 font-sans">
            <div><label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest drop-shadow-sm mb-3">YT Source Handle</label><input type="text" value={channelIdInput} onChange={(e) => setChannelIdInput(e.target.value)} placeholder="@username" className="w-full px-6 py-4 studio-input rounded-2xl text-base font-bold text-white outline-none focus:ring-4 focus:ring-cyan-500/40 transition-all shadow-inner placeholder-slate-600 border border-white/10 bg-black/40" required /></div>
            <div><label className="block text-[11px] font-mono font-black text-slate-500 uppercase tracking-widest drop-shadow-sm mb-3">API Security Key</label><input type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="AIzaSy..." className="w-full px-6 py-4 studio-input rounded-2xl text-base font-bold text-white outline-none focus:ring-4 focus:ring-cyan-500/40 transition-all shadow-inner placeholder-slate-600 border border-white/10 bg-black/40" /></div>
            <button type="submit" className="w-full py-4 btn-cinematic text-white text-sm font-black uppercase tracking-widest rounded-2xl font-sans shadow-[0_0_20px_rgba(6,182,212,0.4)] transition mt-4">Sync Nodes</button>
          </form>
        </ScrollReveal>
      </div>

      <ScrollReveal className="col-span-2 studio-glass border-t border-cyan-500/50 p-8 sm:p-14 rounded-[4rem] shadow-2xl font-sans bg-black/60" delay={300}>
        <h3 className="font-serif font-black border-b border-white/10 pb-6 text-white text-2xl sm:text-3xl flex items-center justify-between drop-shadow-md uppercase tracking-widest glow-text-cyan">
          <span>Operative Roster</span>
          {pendingCount > 0 && <span className="bg-rose-600 text-white text-[11px] px-4 py-1.5 rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.8)] font-black uppercase tracking-widest animate-pulse">{pendingCount} Pending</span>}
        </h3>
        <p className="text-[11px] font-mono text-slate-500 mb-8 italic mt-5 uppercase tracking-widest font-bold">SysAdmin Tip: Long-press rows to initiate expulsion protocols.</p>
        <div className="overflow-x-auto custom-scrollbar pr-2">
          <table className="w-full text-base text-left font-sans min-w-[700px]">
            <thead>
              <tr className="text-slate-400 font-mono text-[11px] font-black uppercase tracking-widest border-b border-white/10"><th className="pb-5 pl-4">Designation</th><th className="pb-5">Clearance</th><th className="pb-5 text-right pr-4">Overrides</th></tr>
            </thead>
            <tbody>
              {profiles.map(p => {
                const isEditing = editingUserId === p.id;
                const isOwner = (p.email || '').toLowerCase() === ADMIN_EMAIL;
                return (
                  <tr key={p.id} className="border-b border-white/5 font-sans animate-fadeIn hover:bg-white/5 transition-colors">
                    <td className="py-5 pl-4">
                      <LongPressable onLongPress={() => { if (!isOwner) remove(p.id); }} className="flex items-center space-x-5 cursor-pointer group">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 p-1 flex items-center justify-center bg-black shrink-0 group-hover:border-rose-500 transition-colors shadow-inner">{renderAvatar(p.photoURL)}</div>
                        <div className="flex flex-col font-sans group-hover:text-rose-400 transition-colors"><span className="font-black text-white text-lg drop-shadow-sm tracking-wide">{p.name}</span><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 group-hover:text-rose-500 mt-2">{p.email}</span></div>
                      </LongPressable>
                      {isEditing && (
                        <div className="mt-5 p-6 studio-input border border-cyan-500/30 rounded-3xl space-y-5 animate-fadeIn font-sans shadow-xl bg-black/40">
                          <span className="text-[11px] font-black uppercase tracking-widest text-white block font-mono">Force Identity Update</span>
                          <input type="file" accept="image/*" onChange={(e) => setEditedFile(e.target.files[0])} className="text-[11px] font-bold text-slate-400 font-sans w-full file:bg-white/10 file:text-white file:border-0 file:rounded-xl file:px-4 file:py-2 file:font-black file:uppercase file:tracking-widest hover:file:bg-white/20 transition-colors cursor-pointer" />
                          <div className="flex gap-4 justify-end pt-3 border-t border-white/10"><button onClick={() => setEditingUserId(null)} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition px-5 py-2.5 studio-input rounded-xl border border-white/10 shadow-sm">Abort</button><button onClick={() => saveMemberPhotoOverride(p.id)} className="text-[11px] btn-cinematic border border-cyan-500/30 text-white px-6 py-2.5 rounded-xl font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] transition uppercase tracking-widest">Execute</button></div>
                        </div>
                      )}
                    </td>
                    <td className="py-5 uppercase font-mono text-[10px] font-black tracking-widest"><span className={p.status === 'pending' ? 'text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30' : p.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30' : 'text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/30'}>{p.status}</span><br/><span className="text-slate-400 block mt-3">{p.role}</span></td>
                    <td className="py-5 text-right pr-4">
                      {!isOwner ? (
                        <div className="flex items-center justify-end gap-3 flex-wrap max-w-[250px] ml-auto">
                          <button onClick={() => setEditingUserId(p.id)} className="studio-input text-white px-4 py-2 border border-white/20 rounded-xl hover:bg-white/10 transition text-[10px] font-black uppercase tracking-widest shadow-sm">PFP</button>
                          {p.status !== 'approved' && <button onClick={() => approve(p.id)} className="bg-emerald-600/20 text-emerald-400 px-4 py-2 border border-emerald-500/40 rounded-xl hover:bg-emerald-600/40 transition text-[10px] font-black uppercase tracking-widest shadow-sm">Approve</button>}
                          {p.role !== 'admin' && p.role !== 'owner' ? <button onClick={() => promote(p.id)} className="bg-cyan-600/20 text-cyan-400 px-4 py-2 border border-cyan-500/40 rounded-xl hover:bg-cyan-600/40 transition text-[10px] font-black uppercase tracking-widest shadow-sm">Promote</button> : p.role !== 'owner' && <button onClick={() => demote(p.id)} className="bg-rose-600/20 text-rose-400 px-4 py-2 border border-rose-500/40 rounded-xl hover:bg-rose-600/40 transition text-[10px] font-black uppercase tracking-widest shadow-sm">Demote</button>}
                          {p.role !== 'roasting waiter' && p.role !== 'owner' && <button onClick={() => makeWaiter(p.id)} className="bg-purple-600/20 text-purple-400 px-4 py-2 border border-purple-500/40 rounded-xl hover:bg-purple-600/40 transition text-[10px] font-black uppercase tracking-widest shadow-sm">Restrict</button>}
                        </div>
                      ) : <span className="text-rose-500 font-black font-mono text-[11px] tracking-widest uppercase bg-rose-900/20 border border-rose-500/30 px-4 py-2 rounded-xl">Sys Admin</span>}
                    </td>
                  </tr>
                );
              })}
              {profiles.length === 0 && <tr><td colSpan={3} className="py-20 text-center text-slate-500 font-mono font-bold tracking-widest uppercase italic border-2 border-dashed border-white/10 rounded-3xl m-6 block bg-black/20">No operatives in database.</td></tr>}
            </tbody>
          </table>
        </div>
      </ScrollReveal>
    </section>
  );
}

function PendingScreen({ userProfile, handleNavigationChange, handleSignOut }) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center text-center p-4 relative z-30">
      <div className="studio-glass border-t border-cyan-500/50 p-16 rounded-[4rem] max-w-lg shadow-[0_50px_100px_rgba(0,0,0,0.9)] animate-deepDiveIn font-sans flex flex-col items-center bg-black/80">
        <div className="w-24 h-24 border-[6px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(245,158,11,0.5)]"></div>
        <h3 className="font-serif font-black text-4xl mb-5 text-white glow-text-gold uppercase tracking-widest drop-shadow-md">Verification Pending</h3>
        <p className="text-base text-slate-300 font-semibold mb-10 font-sans leading-relaxed">Designation <span className="text-amber-400 font-black">{userProfile?.name}</span> is awaiting clearance from the SysAdmin.</p>
        <div className="flex gap-5 mt-2 w-full">
          <button onClick={() => handleNavigationChange('profile')} className="flex-1 text-xs font-black uppercase tracking-widest text-white btn-cinematic py-4 px-6 rounded-2xl transition-all shadow-lg hover:scale-105 border border-cyan-500/30">Edit File</button>
          <button onClick={handleSignOut} className="flex-1 text-xs font-black uppercase tracking-widest text-slate-400 studio-input hover:text-white border border-white/10 shadow-sm py-4 px-6 hover:bg-white/10 rounded-2xl transition-all">Abort</button>
        </div>
      </div>
    </div>
  );
}

function RejectedScreen({ handleSignOut }) {
  return (
    <div className="text-center py-40 font-sans flex flex-col items-center justify-center gap-8 relative z-30">
      <div className="studio-glass p-16 rounded-[4rem] border-t border-rose-500/50 shadow-[0_50px_100px_rgba(225,29,72,0.4)] animate-deepDiveIn bg-black/80 max-w-lg w-full">
        <h1 className="text-8xl mb-8 filter drop-shadow-[0_0_20px_rgba(225,29,72,0.6)]">🚫</h1>
        <p className="font-black text-3xl text-white drop-shadow-md mb-4 uppercase tracking-widest font-serif glow-text-ruby">Clearance Denied</p>
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-10 font-bold">Access to mainframe restricted by SysAdmin.</p>
        <button onClick={handleSignOut} className="w-full text-sm font-black uppercase tracking-widest text-white bg-rose-600/80 hover:bg-rose-600 border border-rose-400 px-8 py-5 rounded-2xl transition-all shadow-[0_0_30px_rgba(225,29,72,0.5)] hover:scale-105">Sever Connection</button>
      </div>
    </div>
  );
}
