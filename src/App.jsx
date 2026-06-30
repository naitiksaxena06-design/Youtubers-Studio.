import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  auth, db, googleProvider,
  doc, setDoc, updateDoc, deleteDoc, getDoc,
  collection, addDoc, onSnapshot, query, orderBy, fbLimit,
  arrayUnion, onAuthStateChanged, signInWithPopup, fbSignOut,
} from './firebase';

// --- STYLING INJECTION (YOUR COMPLETE PREMIUM ART STYLE) ---
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

// --- FOOLPROOF LOCAL COMPRESSION UTILITY (Bypasses Storage constraints entirely) ---
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
        
        if (width > height) {
          if (width > maxDim) { height *= maxDim / width; width = maxDim; }
        } else {
          if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        }
        
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

// --- SMART EMBEDDABLE PLAYER RESOLVER (Plays Drive, YT, or direct MP4 inside the app) ---
const resolvePlayableVideo = (url) => {
  if (!url) return { type: 'none', src: '' };
  const cleaned = url.trim();

  // 1. YouTube Resolvers
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = cleaned.match(ytRegex);
  if (ytMatch) {
    return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` };
  }

  // 2. Google Drive Preview Embed
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/;
  const driveMatch = cleaned.match(driveRegex);
  if (driveMatch) {
    return { type: 'drive', src: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  }

  // 3. Direct video format files (MP4, WebM, etc.)
  const isDirect = /\.(mp4|webm|mov|ogv|m4v)(?:\?|$)/i.test(cleaned) || cleaned.startsWith('data:video/');
  if (isDirect) {
    return { type: 'direct', src: cleaned };
  }

  // 4. Fallback (Raw URLs)
  return { type: 'fallback', src: cleaned };
};

const renderAvatar = (photoURL, className = "w-full h-full object-cover") => {
  if (!photoURL || typeof photoURL !== 'string') return <div className="bg-slate-200 w-full h-full flex items-center justify-center font-bold text-slate-400 font-sans">?</div>;
  if (photoURL.startsWith('<svg') || photoURL.includes('<circle') || photoURL.includes('<path')) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: photoURL }} />;
  }
  return <img src={photoURL} alt="Crew Avatar" className={className} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60"; }} />;
};

const WatercolorOverlay = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-multiply z-10"
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='watercolor-noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.03' numOctaves='4' result='noise'/%3E%3CfeDiffuseLighting in='noise' lighting-color='%23fff' surfaceScale='3'%3E%3CfeDistantLight azimuth='45' elevation='60'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23watercolor-noise)'/%3E%3C/svg%3E")` }}
  />
);

// --- NOTIFICATION BELL WITH SCREEN-TAP DISMISSAL ---
function NotificationBell({ notifications, userProfile, isAdmin }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const visible = useMemo(() => notifications.filter(n => {
    if (n.actor === 'System') return false; 
    const audience = n.audience || 'all';
    return audience === 'all' || (audience === 'admin' && isAdmin);
  }), [notifications, isAdmin]);

  const lastSeen = userProfile.lastSeenNotifAt || 0;
  const unreadCount = useMemo(() => visible.filter(n => n.timestamp > lastSeen).length, [visible, lastSeen]);

  const openPanel = async () => {
    setOpen(o => !o);
    if (!open) {
      try { await updateDoc(doc(db, 'profiles', userProfile.id), { lastSeenNotifAt: Date.now() }); } catch (e) {}
    }
  };

  useEffect(() => {
    const handleClose = () => setOpen(false);
    if (open) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClose);
        document.addEventListener('touchstart', handleClose);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClose);
        document.removeEventListener('touchstart', handleClose);
      };
    }
  }, [open]);

  return (
    <div className="relative font-sans" ref={containerRef}>
      <button onClick={openPanel} className="relative p-2.5 hover:bg-[#C5A03A]/10 rounded-full transition text-[#C5A03A] shadow-inner border border-[#EADFC9]/50 bg-white/50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 sm:w-80 bg-white border-2 border-[#EADFC9] rounded-2xl shadow-skeuo-lg z-50 overflow-hidden max-h-[80vh] flex flex-col">
          <div className="p-3 border-b border-[#EADFC9]/50 flex items-center justify-between shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="font-serif font-bold text-sm text-slate-800">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 text-xs font-bold p-1">✕</button>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1" onClick={(e) => e.stopPropagation()}>
            {visible.slice(0, 30).map(n => (
              <div key={n.id} className={`p-3 border-b border-slate-50 text-[11px] ${n.timestamp > lastSeen ? 'bg-amber-50/40' : ''}`}>
                <span className="font-bold text-slate-800">{n.actor}: </span>
                <span className="text-slate-600">{n.message}</span>
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

// --- SECURE FIRESTORE HOOKS ---
function useFirestoreCollection(name, orderField = null, limitN = null, enabled = false) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) { setItems([]); setLoaded(false); return; }
    let q = collection(db, name);
    if (orderField) q = query(collection(db, name), orderBy(orderField, 'desc'), ...(limitN ? [fbLimit(limitN)] : []));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true); setError(null);
    }, (err) => { setLoaded(true); setError(err.message); });
    return () => unsub();
  }, [name, orderField, limitN, enabled]);

  return [items, loaded, error];
}

function useFirestoreDoc(path, fallback, enabled = false) {
  const [data, setData] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) { setData(fallback); setLoaded(false); return; }
    const ref = doc(db, path);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setData({ ...fallback, ...snap.data() });
      else setData(fallback);
      setLoaded(true);
    }, () => setLoaded(true));
    return () => unsub();
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

  const showToast = useCallback((message, type = 'info') => {
    setCustomToast({ message, type });
    setTimeout(() => setCustomToast(null), 4000);
  }, []);

  const ensureProfileDocRef = useRef(() => {});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        try { await ensureProfileDocRef.current(user); } catch (e) {}
      }
      setAuthLoading(false);
    });
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

  useEffect(() => {
    if (notifsError && isAuthReady) {
      showToast(`Notifications blocked: ${notifsError}.`, 'warning');
    }
  }, [notifsError, isAuthReady]);

  const unreadMap = useMemo(() => {
    const lastSeen = userProfile?.lastSeenNotifAt || 0;
    const unread = notifications.filter(n => n.timestamp > lastSeen && n.actor !== 'System');
    
    return {
      vault: unread.some(n => n.message.toLowerCase().includes('video asset') || n.message.toLowerCase().includes('commented on video')),
      projects: unread.some(n => n.message.toLowerCase().includes('concept whiteboard')),
      scripts: unread.some(n => n.message.toLowerCase().includes('script topic')),
      posts: unread.some(n => n.message.toLowerCase().includes('showroom draft')),
    };
  }, [notifications, userProfile]);

  const seenNotifIdsRef = useRef(new Set());
  const firstNotifLoadRef = useRef(true);
  useEffect(() => {
    if (!userProfile) return;
    if (firstNotifLoadRef.current) {
      notifications.forEach(n => seenNotifIdsRef.current.add(n.id));
      firstNotifLoadRef.current = false;
      return;
    }
    notifications.forEach(n => {
      if (seenNotifIdsRef.current.has(n.id) || n.actor === 'System') return;
      seenNotifIdsRef.current.add(n.id);
      const audience = n.audience || 'all';
      const relevant = audience === 'all' || (audience === 'admin' && isAdmin);
      if (relevant && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('Youtubers Studio', { body: n.message, icon: siteSettings.logoUrl || undefined }); } catch (e) {}
      }
    });
  }, [notifications, userProfile, isAdmin, siteSettings.logoUrl]);

  const pushNotification = useCallback(async (message, actorName = 'Crew Member', audience = 'all') => {
    try { await addDoc(collection(db, 'notifications'), { message, actor: actorName, timestamp: Date.now(), audience }); } catch (err) {}
  }, []);

  const ensureProfileDoc = useCallback(async (user) => {
    const ref = doc(db, 'profiles', user.uid);
    const snap = await getDoc(ref);
    const emailLower = (user.email || '').toLowerCase();
    const isOwner = emailLower === ADMIN_EMAIL;
    if (!snap.exists()) {
      const newProfile = {
        id: user.uid,
        name: user.displayName || user.email.split('@')[0], email: user.email, role: isOwner ? 'owner' : 'member',
        status: isOwner ? 'approved' : 'pending', workCategory: categories[0] || 'Editing',
        photoURL: user.photoURL || PRESET_AVATARS[0].svg, createdAt: Date.now(),
      };
      await setDoc(ref, newProfile);
      return newProfile;
    } else if (isOwner && snap.data().role !== 'owner') {
      await updateDoc(ref, { role: 'owner', status: 'approved' });
    }
    return snap.data();
  }, [categories]);
  ensureProfileDocRef.current = ensureProfileDoc;

  const handleGoogleSignIn = async () => {
    try { 
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        showToast('Successfully authenticated!', 'success');
        setShowSignInModal(false);
      }
    } 
    catch (err) { 
      showToast('Sign-in failed — check your connection.', 'warning'); 
    }
  };

  const handleSignOut = async () => {
    await fbSignOut(auth);
    setCurrentPage('home');
    showToast('Signed out.', 'info');
  };

  const handleNavigationChange = (targetPage) => {
    setIsSidebarOpen(false);
    if (targetPage === 'home') { setCurrentPage(targetPage); return; }
    if (!authUser) { setShowSignInModal(true); return; }
    setCurrentPage(targetPage);
  };

  useEffect(() => {
    if (!authUser || !userProfile) return;
    if (userProfile.status === 'pending' && currentPage !== 'pending-status') setCurrentPage('pending-status');
    else if (userProfile.status === 'rejected' && currentPage !== 'rejected-status') setCurrentPage('rejected-status');
    else if (userProfile.status === 'approved' && (currentPage === 'pending-status' || currentPage === 'rejected-status')) setCurrentPage('home');
  }, [userProfile, authUser, currentPage]);

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
      if (match) handle = match[1];
      else if (trimmed.includes('youtube.com/')) {
        const parts = trimmed.split('/');
        handle = parts[parts.length - 1].replace('@', '').split('?')[0];
      } else { handle = trimmed.replace('@', ''); }
      url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(handle)}&key=${activeApiKey}`;
    }

    try {
      const channelRes = await fetch(url);
      const channelData = await channelRes.json();
      if (!channelRes.ok) throw new Error(channelData?.error?.message || `YouTube API error ${channelRes.status}`);
      const item = channelData.items?.[0];
      if (!item) throw new Error('Channel not found — check the handle/ID.');

      const subsCount = item.statistics.subscriberCount;
      const channelIdActual = item.id;
      const channelTitle = item.snippet.title;

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelIdActual}&maxResults=5&order=date&type=video&key=${activeApiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      let views = ytConfig.latestVideoViews;
      let videoTitle = ytConfig.latestVideoTitle;

      if (searchRes.ok && searchData.items?.length) {
        const videoItem = searchData.items[0];
        const videoId = videoItem.id.videoId;
        videoTitle = videoItem.snippet.title;
        const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${activeApiKey}`);
        const videoData = await videoRes.json();
        if (videoRes.ok) views = videoData.items?.[0]?.statistics?.viewCount ?? views;
      }

      await setDoc(doc(db, 'meta/ytConfig'), {
        channelId: activeChannelId, apiKey: activeApiKey,
        subscribers: parseInt(subsCount, 10).toLocaleString(),
        latestVideoViews: typeof views === 'string' && views.includes(',') ? views : parseInt(views, 10).toLocaleString(),
        latestVideoTitle: videoTitle, lastError: null, lastSyncedAt: Date.now(),
      }, { merge: true });

      if (!silent) showToast(`Synced with ${channelTitle}.`, 'success');
    } catch (err) {
      await setDoc(doc(db, 'meta/ytConfig'), { lastError: err.message, lastSyncedAt: Date.now() }, { merge: true }).catch(() => {});
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
    const loadScript = (src) => new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src; script.onload = () => resolve(true); script.onerror = () => resolve(false); document.head.appendChild(script);
    });
    (async () => {
      try {
        const loadedThree = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
        if (loadedThree) setThreeReady(true);
      } catch (e) { console.warn('Studio visual engine fallback.'); } finally { setLoadingLibraries(false); }
    })();
  }, []);

  if (loadingLibraries || authLoading) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] flex flex-col items-center justify-center font-serif text-[#C5A03A]">
        <div className="w-16 h-16 border-4 border-dashed border-[#C5A03A] rounded-full animate-spin mb-4" />
        <h2 className="text-2xl font-bold tracking-widest animate-pulse font-serif">SYNCING TIMELINES</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#FCFBF8] text-slate-800 font-sans selection:bg-[#C5A03A]/20">
      <WatercolorOverlay />
      {threeReady && <ThreeArtBackground />}

      {customToast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-skeuo-lg text-xs font-bold text-white transition-all animate-bounce ${customToast.type === 'success' ? 'bg-[#2ba640]' : 'bg-[#C5A03A]'}`}>
          {customToast.message}
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FFFDF9]/85 border-b-2 border-[#EADFC9]/60 px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)] font-sans">
        <div className="flex items-center space-x-3 min-w-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#C5A03A]/10 rounded-full transition text-[#C5A03A] shadow-inner border border-[#EADFC9]/50 bg-white/50 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div className="flex items-center space-x-2 cursor-pointer min-w-0" onClick={() => handleNavigationChange('home')}>
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="Logo" className="w-8 h-8 object-cover rounded-lg shadow-[0_4px_15px_rgba(135,112,58,0.25)] border border-white shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C5A03A] to-[#f43f5e] flex items-center justify-center text-white font-serif font-bold text-sm shadow-[0_4px_15px_rgba(197,160,58,0.3)] border border-white shrink-0">Y</div>
            )}
            <span className="font-serif text-sm sm:text-base tracking-wide text-[#C5A03A] font-extrabold truncate max-w-[130px] sm:max-w-xs leading-none">
              {siteSettings.logoText || 'YOUTUBERS STUDIO'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
          {userProfile && <NotificationBell notifications={notifications} userProfile={userProfile} isAdmin={isAdmin} />}
          {userProfile ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex flex-col text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">{userProfile?.name}</p>
                <span className="text-[8px] text-[#C5A03A] uppercase tracking-widest font-mono font-bold mt-1">{userProfile?.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full border border-[#C5A03A]/60 bg-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleNavigationChange('profile')}>
                {renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowSignInModal(true)} className="text-[10px] sm:text-xs font-bold bg-[#C5A03A] hover:bg-[#b59231] text-white px-3 py-2 rounded-full shadow-[0_4px_15px_rgba(197,160,58,0.25)] border border-white transition transform active:scale-95 whitespace-nowrap">🔑 Crew Sign In</button>
          )}
        </div>
      </header>

      {/* --- SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 bg-black/40 backdrop-blur-xs ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`absolute left-0 top-0 bottom-0 w-72 bg-[#FFFDF9]/95 border-r border-[#EADFC9] shadow-2xl p-6 flex flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between pb-4 border-b border-[#EADFC9]/50">
              <span className="font-serif font-black text-base text-[#C5A03A] tracking-wider uppercase">Navigation</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 font-bold p-1 hover:text-slate-600">✕</button>
            </div>
            <nav className="space-y-1 relative">
              <button onClick={() => handleNavigationChange('home')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'home' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🏠</span><span>Home Hub</span></button>
              <button onClick={() => handleNavigationChange('crew')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'crew' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🎬</span><span>Crew Roster</span></button>
              <button onClick={() => handleNavigationChange('categories-view')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'categories-view' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🏷️</span><span>Categories</span></button>
              
              <button onClick={() => handleNavigationChange('vault')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'vault' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span>🎞️</span><span>Video Vault</span>
                {unreadMap.vault && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
              </button>
              
              <button onClick={() => handleNavigationChange('projects')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'projects' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span>📌</span><span>Project Board</span>
                {unreadMap.projects && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
              </button>
              
              <button onClick={() => handleNavigationChange('scripts')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'scripts' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span>📝</span><span>Scripts</span>
                {unreadMap.scripts && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
              </button>
              
              <button onClick={() => handleNavigationChange('chat')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'chat' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>💬</span><span>Whiteboard Chat</span></button>
              
              <button onClick={() => handleNavigationChange('posts')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all relative ${currentPage === 'posts' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span>📸</span><span>Insta Feed</span>
                {unreadMap.posts && <span className="absolute right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
              </button>
              
              {userProfile && <button onClick={() => handleNavigationChange('profile')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'profile' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>👤</span><span>My Profile</span></button>}
              
              {isAdmin && (
                <div className="pt-4 border-t border-[#EADFC9]/50 mt-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 block mb-1 font-sans">Admin Controls</span>
                  <button onClick={() => handleNavigationChange('admin')} className={`w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-left text-xs font-bold transition-all ${currentPage === 'admin' ? 'bg-rose-50 text-rose-600 border-l-4 border-rose-500' : 'text-slate-500 hover:bg-rose-50/40'}`}><span>👥</span><span>Manage Roster</span></button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="relative z-20 max-w-7xl mx-auto px-4 py-6 studio-page-wrap animate-fadeIn">
        {currentPage === 'home' && <CreatorHomeHub siteSettings={siteSettings} videos={videos} projects={projects} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} isAdmin={isAdmin} notifications={notifications} />}
        {currentPage === 'pending-status' && <PendingScreen userProfile={userProfile} />}
        {currentPage === 'rejected-status' && <RejectedScreen userProfile={userProfile} />}
        {currentPage === 'crew' && <CrewSection profiles={profiles} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} />}
        {currentPage === 'categories-view' && <CategoriesViewSection profiles={profiles} categories={categories} showToast={showToast} />}
        {currentPage === 'vault' && <VideoVault videos={videos} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} pushNotification={pushNotification} />}
        {currentPage === 'projects' && <ProjectBoard projects={projects} tasks={tasks} userProfile={userProfile} showToast={showToast} selectedProject={selectedProject} setSelectedProject={setSelectedProject} pushNotification={pushNotification} isAdmin={isAdmin} />}
        {currentPage === 'scripts' && <ScriptsWorkspace scripts={scripts} userProfile={userProfile} isAdmin={isAdmin} showToast={showToast} pushNotification={pushNotification} />}
        {currentPage === 'chat' && <WhiteboardChat chats={chats} userProfile={userProfile} chatChannel={chatChannel} setChatChannel={setChatChannel} pushNotification={pushNotification} siteSettings={siteSettings} isAdmin={isAdmin} showToast={showToast} />}
        {currentPage === 'posts' && <PostsWorkspace posts={posts} userProfile={userProfile} showToast={showToast} pushNotification={pushNotification} isAdmin={isAdmin} />}
        {currentPage === 'profile' && (
          !userProfile ? (
            <div className="bg-white border-2 border-[#EADFC9] p-8 rounded-2xl text-center max-w-md mx-auto shadow-skeuo-md"><p className="text-slate-600 font-medium">Loading profile badge...</p></div>
          ) : (
            <MyProfileWorkspace userProfile={userProfile} categories={categories} showToast={showToast} handleSignOut={handleSignOut} />
          )
        )}
        {currentPage === 'admin' && isAdmin && <AdminPanel profiles={profiles} siteSettings={siteSettings} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} userProfile={userProfile} showToast={showToast} />}
      </main>

      {showSignInModal && <SignInModal handleGoogleSignIn={handleGoogleSignIn} setShowSignInModal={setShowSignInModal} />}
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
    specularSpot.position.set(0, 0, 8);
    scene.add(specularSpot);
    const cobaltPoint = new THREE.PointLight(0x1d4ed8, 2.5, 18);
    cobaltPoint.position.set(-5, -3, 2);
    scene.add(cobaltPoint);
    const rosePoint = new THREE.PointLight(0xf43f5e, 2.5, 18);
    rosePoint.position.set(5, 3, 2);
    scene.add(rosePoint);

    const cameraRigGroup = new THREE.Group();
    const outerRingGeo = new THREE.TorusGeometry(1.9, 0.12, 16, 100);
    const darkTitaniumMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.95, roughness: 0.15 });
    const outerRing = new THREE.Mesh(outerRingGeo, darkTitaniumMat);
    cameraRigGroup.add(outerRing);
    const innerRingGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 100);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 1.0, roughness: 0.05 });
    const innerRing = new THREE.Mesh(innerRingGeo, chromeMat);
    innerRing.rotation.x = Math.PI / 2;
    cameraRigGroup.add(innerRing);
    const lensBarrelGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.5, 32, 1, true);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.9, roughness: 0.1 });
    const lensBarrel = new THREE.Mesh(lensBarrelGeo, goldMat);
    lensBarrel.rotation.x = Math.PI / 2;
    cameraRigGroup.add(lensBarrel);
    const glassGeo = new THREE.SphereGeometry(0.75, 32, 32);
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.65, transmission: 0.9, ior: 1.5, thickness: 1.0 });
    const glassLens = new THREE.Mesh(glassGeo, glassMat);
    cameraRigGroup.add(glassLens);
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.55, 0.02);
    const blackAnodizedMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.4 });
    for (let i = 0; i < 8; i++) {
      const blade = new THREE.Mesh(bladeGeo, blackAnodizedMat);
      const angle = (i / 8) * Math.PI * 2;
      blade.position.set(Math.cos(angle) * 1.0, Math.sin(angle) * 1.0, 0);
      blade.rotation.z = angle + Math.PI / 4;
      cameraRigGroup.add(blade);
    }
    cameraRigGroup.position.set(-3.5, 1.5, -2);
    scene.add(cameraRigGroup);

    const reelGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
    const disk = new THREE.Mesh(diskGeo, darkMetal);
    disk.rotation.x = Math.PI / 2;
    reelGroup.add(disk);
    const ringGeo = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xC5A03A, metalness: 0.9, roughness: 0.1 });
    const brassRing = new THREE.Mesh(ringGeo, brassMat);
    brassRing.position.set(0, 0, 0.06);
    reelGroup.add(brassRing);
    reelGroup.position.set(4, -1, -2);
    scene.add(reelGroup);

    const pCount = 100;
    const pPositions = new Float32Array(pCount * 3);
    const pGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 18;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 3;
    }
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMaterial = new THREE.PointsMaterial({ color: 0xC5A03A, size: 0.14, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Points(pGeometry, pMaterial));

    let mouseX = 0, mouseY = 0;
    const targetMouse = { x: 0, y: 0 };
    const handleWindowMouseMove = (e) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleWindowMouseMove);

    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      outerRing.rotation.y = elapsed * 0.14; outerRing.rotation.x = elapsed * 0.07;
      innerRing.rotation.x = elapsed * 0.22; innerRing.rotation.z = elapsed * 0.16;
      lensBarrel.rotation.y = elapsed * 0.28; cameraRigGroup.position.y = 1.5 + Math.sin(elapsed * 0.45) * 0.2;
      reelGroup.rotation.z = elapsed * 0.35; reelGroup.rotation.y = elapsed * 0.15; reelGroup.position.y = -1 + Math.cos(elapsed * 0.5) * 0.15;
      mouseX += (targetMouse.x - mouseX) * 0.05; mouseY += (targetMouse.y - mouseY) * 0.05;
      specularSpot.position.x = 5 + mouseX * 4; specularSpot.position.y = 5 + mouseY * 4;
      camera.position.x = mouseX * 0.8; camera.position.y = mouseY * 0.8;
      camera.lookAt(scene.position); renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);
  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0 opacity-40 animate-fadeIn" />;
}

// --- SIGN IN MODAL ---
function SignInModal({ handleGoogleSignIn, setShowSignInModal }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn font-sans">
      <div className="w-full max-w-md bg-white border-2 border-[#EADFC9] rounded-[2rem] p-8 shadow-skeuo-lg relative font-sans text-center animate-fadeIn">
        <button onClick={() => setShowSignInModal(false)} className="absolute top-4 right-4 font-bold text-slate-400 hover:text-slate-600 transition">✕</button>
        <h3 className="font-serif text-xl font-bold text-slate-800 mb-2">Crew Member Sign In</h3>
        <p className="text-xs text-slate-400 mb-6">Sign in with your Google account to verify your identity and get approved on the roster.</p>
        <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-[#EADFC9] hover:border-[#C5A03A] rounded-xl text-sm font-bold text-slate-700 shadow-sm transition">
          <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.2 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.3C40.9 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
          Continue with Google
        </button>
        <p className="text-[10px] text-slate-400 mt-4">New here? Your account will be routed to the pending roster for owner approval.</p>
      </div>
    </div>
  );
}

// --- HOMEPAGE HUB ---
function CreatorHomeHub({ siteSettings, videos, projects, ytConfig, syncYouTubeStats, isAdmin, notifications }) {
  const studioUpdates = useMemo(() => notifications.filter(n => !n.message.startsWith('"') && n.actor !== 'System'), [notifications]);

  return (
    <section className="space-y-8 py-2 animate-fadeIn font-sans">
      <div className="text-center py-2">
        <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl font-black text-slate-800 uppercase tracking-tight leading-tight">
          {siteSettings.logoText || 'YOUTUBERS STUDIO'}
        </h1>
        <p className="text-slate-500 font-serif italic text-xs sm:text-sm mt-1">Creator timeline commander & segmented asset warehouse.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'YouTube Subscribers', value: ytConfig.subscribers, icon: '📈', change: ytConfig.lastError ? `⚠ ${ytConfig.lastError}` : (ytConfig.lastSyncedAt ? `Synced ${new Date(ytConfig.lastSyncedAt).toLocaleTimeString()}` : 'Not synced yet'), action: isAdmin ? (<button onClick={() => syncYouTubeStats()} className="text-[9px] bg-[#C5A03A]/10 text-[#C5A03A] font-bold px-2 py-1 rounded border border-[#C5A03A]/20 hover:bg-[#C5A03A]/20 transition mt-2 block font-sans">🔄 Fetch Live</button>) : null },
          { label: 'Latest Video Views', value: ytConfig.latestVideoViews, icon: '📺', change: ytConfig.latestVideoTitle ? `"${ytConfig.latestVideoTitle.substring(0, 24)}..."` : '—', action: null },
          { label: 'Vault Records', value: `${videos.length} Masters`, icon: '🎞️', change: 'Shared studio storage', action: null },
          { label: 'Active Ideas', value: `${projects.length} Boards`, icon: '📌', change: 'Real-time whiteboard', action: null },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/80 border-b-[5px] border-r border-l border-t border-[#EADFC9] rounded-2xl p-4 shadow-skeuo-md hover:-translate-y-0.5 hover:shadow-skeuo-3d transition-all flex flex-col justify-between h-36">
            <div>
              <div className="flex justify-between items-center text-slate-400 mb-1">
                <span className="text-[9px] uppercase font-bold tracking-wider font-sans">{stat.label}</span>
                <span className="text-base">{stat.icon}</span>
              </div>
              <p className="text-lg md:text-xl font-black text-slate-800 font-sans leading-none">{stat.value}</p>
            </div>
            <div className="mt-1 font-sans">
              <span className="text-[9px] text-[#C5A03A] font-semibold block truncate leading-tight">{stat.change}</span>
              {stat.action}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/80 border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md font-sans">
        <div className="flex items-center justify-between border-b border-[#EADFC9]/30 pb-2 mb-3 font-serif">
          <h3 className="font-serif text-sm font-bold text-[#C5A03A]">📢 Studio Updates</h3>
          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-sans border border-emerald-200">Recent Activity</span>
        </div>
        <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar font-sans pr-1">
          {studioUpdates.map(notif => (
            <div key={notif.id} className="text-[11px] leading-relaxed border-b border-dashed border-slate-100 pb-1.5 animate-fadeIn">
              <span className="font-bold text-slate-800 font-sans">{notif.actor}: </span>
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
function CrewSection({ profiles, userProfile, showToast, isAdmin }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const approvedProfiles = useMemo(() => profiles.filter(p => p.status === 'approved'), [profiles]);

  const removeMember = async (uid) => {
    try { await deleteDoc(doc(db, 'profiles', uid)); showToast('Crew member removed.', 'success'); } catch (err) { showToast('Failed to remove.', 'warning'); }
  };

  if (approvedProfiles.length === 0) return <div className="text-center text-slate-400 py-20">No approved crew members yet.</div>;

  return (
    <section className="py-2 animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <div className="lg:col-span-1 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl text-center shadow-skeuo-md animate-fadeIn h-fit">
        <div className="w-24 h-24 rounded-full border-4 border-[#C5A03A]/20 mx-auto overflow-hidden p-0.5 mb-3 flex items-center justify-center bg-slate-50 shadow-inner">{renderAvatar(approvedProfiles[focusIdx]?.photoURL)}</div>
        <h3 className="font-serif text-xl font-bold text-slate-800">{approvedProfiles[focusIdx]?.name}</h3>
        <p className="text-xs text-slate-400 mt-1 font-sans">{approvedProfiles[focusIdx]?.email}</p>
        <span className="bg-[#C5A03A] text-white text-[9px] px-3 py-1 rounded-full font-bold mt-2 inline-block font-sans shadow-sm">{approvedProfiles[focusIdx]?.role}</span>
      </div>

      <div className="lg:col-span-2 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md max-h-[450px] overflow-y-auto custom-scrollbar animate-fadeIn">
        <h4 className="font-serif font-bold text-sm border-b pb-2 mb-3 text-slate-700">Production Team Members</h4>
        <div className="space-y-2 font-sans">
          {profiles.map((p, i) => (
            <div key={p.id} className="flex justify-between items-center p-2.5 border rounded-xl hover:border-[#C5A03A]/40 transition bg-slate-50/50">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-white shadow-sm cursor-pointer shrink-0" onClick={() => setFocusIdx(approvedProfiles.indexOf(p))}>{renderAvatar(p.photoURL)}</div>
                <div className="cursor-pointer min-w-0" onClick={() => setFocusIdx(approvedProfiles.indexOf(p))}>
                  <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                  <span className="text-[9px] font-mono text-slate-400 block truncate">{p.email} • {p.role} • {p.workCategory}</span>
                </div>
              </div>
              {isAdmin && (p.email || '').toLowerCase() !== ADMIN_EMAIL && (
                <button onClick={() => removeMember(p.id)} className="bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold px-2.5 py-1 rounded-full hover:bg-rose-100 font-sans whitespace-nowrap">Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- CATEGORIES VIEW ---
function CategoriesViewSection({ profiles, categories, showToast }) {
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Editing');
  const [newCatInput, setNewCustomCategory] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const clean = newCatInput.trim();
    if (!clean) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) { showToast('Category exists.', 'warning'); return; }
    await setDoc(doc(db, 'meta/categories'), { list: arrayUnion(clean) }, { merge: true });
    setActiveCategory(clean); setNewCustomCategory(''); showToast(`Category added.`, 'success');
  };

  const matchedMembers = useMemo(() => profiles.filter(p => p.status === 'approved' && p.workCategory === activeCategory), [profiles, activeCategory]);

  return (
    <section className="py-2 animate-fadeIn space-y-4 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
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
                <div className="w-9 h-9 rounded-full border bg-white overflow-hidden p-0.5 flex items-center justify-center shrink-0">{renderAvatar(member.photoURL)}</div>
                <div className="min-w-0">
                  <h5 className="font-bold text-xs text-slate-800 font-sans truncate">{member.name}</h5>
                  <p className="text-[9px] text-slate-400 font-sans truncate">{member.email}</p>
                  <span className="inline-block bg-amber-50 text-[#C5A03A] text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5 font-sans">{member.role}</span>
                </div>
              </div>
            ))}
            {matchedMembers.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">"No crew member is currently assigned to this specialization."</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

// --- VIDEO VAULT WITH DIRECT IN-APP PLAYBACK FOR ALL VIDEO LINKS ---
function VideoVault({ videos, userProfile, showToast, isAdmin, pushNotification }) {
  const [selectedVid, setSelectedVid] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (selectedVid) {
      const fresh = videos.find(v => v.id === selectedVid.id);
      if (fresh) setSelectedVid(fresh);
    }
  }, [videos]);

  const handlePostVideoComment = async (e) => {
    e.preventDefault();
    const commentText = e.target.commentInput.value.trim();
    if (!commentText || !selectedVid) return;
    const newComment = { id: 'c_' + Date.now(), authorName: userProfile.name, text: commentText, timestamp: Date.now() };
    await updateDoc(doc(db, 'videos', selectedVid.id), { comments: arrayUnion(newComment) });
    e.target.commentInput.value = '';
    pushNotification(`Commented on video draft "${selectedVid.title}"`, userProfile.name);
    showToast('Feedback comment posted!', 'success');
  };

  const deleteVideoComment = async (commentId) => {
    const updatedComments = selectedVid.comments.filter(c => c.id !== commentId);
    await updateDoc(doc(db, 'videos', selectedVid.id), { comments: updatedComments });
    showToast('Comment deleted.', 'info');
  };

  const startUpload = async (e) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrlInput.trim()) return;
    try {
      await addDoc(collection(db, 'videos'), {
        title: videoTitle.trim(),
        hlsUrl: videoUrlInput.trim(), // We use hlsUrl or direct fields to hold the video URL link!
        uploaderUid: userProfile.id,
        uploaderName: userProfile.name,
        size: "External URL Link",
        comments: [],
        createdAt: Date.now(),
      });
      pushNotification(`Added tracked video workspace: "${videoTitle}"`, userProfile.name);
      setVideoTitle(''); setVideoUrlInput(''); setShowUploadModal(false);
      showToast('Video added successfully! Ready to play.', 'success');
    } catch (err) { showToast('Upload failed — check your Firestore permissions.', 'warning'); }
  };

  const removeVideo = async (id, e) => {
    if (e) e.stopPropagation();
    await deleteDoc(doc(db, 'videos', id));
    if (selectedVid?.id === id) setSelectedVid(null);
    showToast('Video removed from Vault.', 'info');
  };

  // Resolve direct playbacks inside app
  const embedData = useMemo(() => {
    if (!selectedVid) return { type: 'none', src: '' };
    return resolvePlayableVideo(selectedVid.hlsUrl || selectedVid.videoUrl);
  }, [selectedVid]);

  return (
    <section className="py-2 space-y-4 font-sans animate-fadeIn">
      <div className="flex justify-between items-center bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl shadow-skeuo-md font-sans animate-fadeIn">
        <h3 className="font-serif font-bold text-slate-800 text-sm sm:text-base">Timeline Asset Vault</h3>
        <button onClick={() => setShowUploadModal(true)} className="bg-red-600 text-white font-bold text-[10px] sm:text-xs px-3.5 py-1.5 rounded-full shadow hover:bg-red-700 transition font-sans whitespace-nowrap">+ Add Video Link</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        <div className="lg:col-span-2 space-y-4 animate-fadeIn font-sans">
          {selectedVid ? (
            <div className="space-y-4 animate-fadeIn font-sans">
              <div className="bg-[#1b1915] rounded-2xl overflow-hidden relative border-4 border-white shadow-skeuo-md">
                
                {/* --- SMART DYNAMIC MULTI-SOURCE DIRECT PLAYER --- */}
                {embedData.type === 'youtube' || embedData.type === 'drive' ? (
                  <iframe 
                    key={selectedVid.id}
                    src={embedData.src} 
                    className="w-full h-64 md:h-80 rounded-xl border-none" 
                    allow="autoplay; encrypted-media; picture-in-picture" 
                    allowFullScreen 
                  />
                ) : embedData.type === 'direct' ? (
                  <video 
                    key={selectedVid.id}
                    src={embedData.src} 
                    className="w-full h-64 md:h-80 object-cover animate-fadeIn" 
                    controls 
                    autoPlay 
                  />
                ) : (
                  <div className="w-full h-64 md:h-80 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center font-mono">
                    <p className="text-amber-400 font-bold mb-2">🎞️ Video Link Blueprint Asset</p>
                    <a href={embedData.src} target="_blank" rel="noreferrer" className="underline break-all text-xs text-blue-300 block hover:text-blue-200">
                      {embedData.src}
                    </a>
                    <span className="text-[10px] text-slate-400 mt-4 block">Click the link above to view/stream asset in a secure tab</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-white border-b-[4px] border-[#EADFC9] rounded-xl shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-serif font-bold text-slate-800 text-sm sm:text-base">{selectedVid.title}</h4>
                  <p className="text-[10px] text-slate-400 font-sans">Tracked by {selectedVid.uploaderName} • {selectedVid.size || "External Link"}</p>
                </div>
                {(isAdmin || selectedVid.uploaderUid === userProfile?.id) && (
                  <button onClick={(e) => removeVideo(selectedVid.id, e)} className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-[10px] font-bold px-3 py-1.5 rounded-lg transition">
                    🗑 Delete Draft
                  </button>
                )}
              </div>

              <div className="bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl shadow-skeuo-md space-y-3 font-sans animate-fadeIn">
                <h4 className="font-serif font-bold text-slate-800 text-xs border-b pb-1.5">Crew Feedback ({selectedVid.comments?.length || 0})</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {(selectedVid.comments || []).map(comment => (
                    <div key={comment.id} className="text-[11px] p-2 bg-slate-50 rounded-xl border flex justify-between items-start animate-fadeIn">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-800 mr-2">{comment.authorName}</span>
                        <span className="text-slate-600 break-words">{comment.text}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[8px] text-slate-400 font-mono">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {(isAdmin || comment.authorName === userProfile?.name) && (
                          <button onClick={() => deleteVideoComment(comment.id)} className="text-rose-500 font-bold hover:text-rose-700 text-[10px] px-1 bg-white border rounded">✕ Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!selectedVid.comments || selectedVid.comments.length === 0) && <p className="text-[11px] text-slate-400 italic py-2">No feedback notes posted yet. Start the conversation below!</p>}
                </div>
                <form onSubmit={handlePostVideoComment} className="flex gap-2 pt-2 border-t">
                  <input type="text" name="commentInput" placeholder="Scribble video feedback..." className="flex-1 px-3 py-1.5 bg-slate-50 border rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none" required />
                  <button type="submit" className="bg-[#C5A03A] text-white text-xs px-3.5 py-1.5 rounded-xl font-bold font-sans transition hover:bg-[#b08d32]">Post</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white/60 border-2 border-dashed border-[#EADFC9] p-16 text-center rounded-xl text-slate-400 font-sans shadow-inner text-xs">
              Select any video draft below to open timeline player & comments feed.
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-3 font-sans animate-fadeIn">
          <h4 className="font-serif font-bold text-xs text-slate-700 uppercase tracking-wider">Video Draft Playlist ({videos.length})</h4>
          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {videos.map((v) => (
              <div key={v.id} className={`bg-white border-b-[4px] border-[#EADFC9] border-r border-l border-t p-2.5 rounded-xl hover:-translate-y-0.5 hover:shadow-skeuo-sm transition-all flex justify-between items-center animate-fadeIn ${selectedVid?.id === v.id ? 'border-[#C5A03A] bg-amber-50/20' : ''}`}>
                <div onClick={() => setSelectedVid(v)} className="cursor-pointer flex-1 min-w-0 pr-2">
                  <h5 className="font-bold text-xs text-slate-800 truncate">{v.title}</h5>
                  <span className="text-[9px] text-slate-400 font-sans">Uploaded by {v.uploaderName} • {v.comments?.length || 0} Comments</span>
                </div>
                {(isAdmin || v.uploaderUid === userProfile?.id) && (
                  <button onClick={(e) => removeVideo(v.id, e)} className="text-rose-500 font-bold p-1.5 hover:text-rose-700 hover:bg-rose-50 rounded transition shrink-0" title="Delete Video">🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={startUpload} className="bg-white border-2 border-[#EADFC9] p-5 rounded-xl w-full max-w-sm space-y-4 font-sans shadow-skeuo-lg animate-fadeIn">
            <h4 className="font-serif font-bold text-slate-800 text-sm">Track Video Link Asset</h4>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">Video Title</label>
              <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs mt-1 font-sans" placeholder="e.g. Episode 10 Final Cut" required />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase">Video Asset Link (Google Drive, YouTube, MP4 URL)</label>
              <input type="url" value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs mt-1 font-sans" placeholder="https://drive.google.com/file/d/..." required />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl border-b-[4px] border-red-800 active:border-b-[1px] active:translate-y-[3px]">
                Track Video Link
              </button>
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
    await addDoc(collection(db, 'projects'), { title: newConcept, creatorName: userProfile.name, createdAt: Date.now() });
    pushNotification(`Created video concept whiteboard: "${newConcept}"`, userProfile.name);
    setNewConcept(''); showToast('Artboard concept mapped!', 'success');
  };

  const activeTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProject?.id), [tasks, selectedProject]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await addDoc(collection(db, 'tasks'), { projectId: selectedProject.id, title: taskTitle, status: 'To Do' });
    setTaskTitle('');
  };

  const removeProject = async (pId, e) => {
    if (e) e.stopPropagation(); 
    await deleteDoc(doc(db, 'projects', pId));
    if (selectedProject?.id === pId) setSelectedProject(null); 
    showToast('Project deleted', 'info');
  };

  const removeTask = async (tId) => { 
    await deleteDoc(doc(db, 'tasks', tId)); 
    showToast('Task card removed.', 'info');
  };

  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'To Do' ? 'Completed' : 'To Do';
    await updateDoc(doc(db, 'tasks', task.id), { status: nextStatus });
    showToast(`Task status updated to ${nextStatus}`, 'success');
  };

  return (
    <section className="py-2 animate-fadeIn font-sans">
      {!selectedProject ? (
        <div className="space-y-4 font-sans">
          <form onSubmit={createConcept} className="max-w-md mx-auto flex gap-2 bg-white border border-[#EADFC9] p-3 rounded-xl shadow-skeuo-sm">
            <input type="text" value={newConcept} onChange={e => setNewConcept(e.target.value)} placeholder="New video conceptual whiteboard sprint..." className="flex-1 px-3 py-1 bg-slate-50 border rounded-lg text-xs focus:ring-1 focus:ring-[#C5A03A]" required />
            <button type="submit" className="px-4 bg-[#C5A03A] text-white text-[11px] rounded-lg font-bold border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] shadow">Pin Board</button>
          </form>
          
          <div className="p-6 border-[12px] border-[#8b5a2b]/25 shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)] rounded-[2rem] grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn" style={{ backgroundColor: '#deb887', backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            {projects.map((p) => (
              <div key={p.id} onClick={() => setSelectedProject(p)} className="bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-4 rounded-xl cursor-pointer shadow-skeuo-md hover:-translate-y-0.5 hover:shadow-skeuo-3d transition-all relative">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)] animate-bounce">📌</span>
                {isAdmin && (
                  <button onClick={(e) => removeProject(p.id, e)} className="absolute top-1.5 right-1.5 text-rose-500 font-bold bg-rose-50 border border-rose-150 rounded-full w-5 h-5 flex items-center justify-center text-[9px] hover:bg-rose-200 transition z-10">✕</button>
                )}
                <h4 className="font-serif font-bold text-slate-800 pt-2 text-center line-clamp-2 text-xs">{p.title}</h4>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md animate-fadeIn font-sans">
          <div className="flex justify-between items-center border-b pb-2">
            <button onClick={() => setSelectedProject(null)} className="text-[11px] font-bold text-[#C5A03A] hover:underline transition">◀ Back to Cork Board</button>
            {isAdmin && (
              <button onClick={(e) => removeProject(selectedProject.id, e)} className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-bold hover:bg-rose-100 transition">
                🗑 Delete Entire Whiteboard
              </button>
            )}
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-800">{selectedProject.title}</h3>
          
          <div className="divide-y text-xs">
            {activeTasks.map((t) => (
              <div key={t.id} className="py-2.5 flex justify-between items-center group">
                <span className="font-semibold text-slate-700">{t.title}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleTaskStatus(t)} className={`text-[9px] px-2 py-0.5 rounded-full font-bold shadow-inner ${t.status === 'To Do' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                    {t.status}
                  </button>
                  {isAdmin && (
                    <button onClick={() => removeTask(t.id)} className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1.5 border rounded" title="Delete Task card">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <form onSubmit={addTask} className="flex gap-2 max-w-sm pt-3">
            <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Add specific work item..." className="flex-1 px-3 py-1.5 border border-[#EADFC9] rounded-xl text-xs" required />
            <button type="submit" className="px-3.5 bg-slate-800 text-white text-xs rounded-xl font-bold">Add Item</button>
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

  const selectedScript = useMemo(() => scripts.find(s => s.id === selectedScriptId) || null, [scripts, selectedScriptId]);
  useEffect(() => { if (selectedScript) setDraftText(selectedScript.content || ''); }, [selectedScriptId, selectedScript?.content]);
  
  const canEditSelected = selectedScript && userProfile && (isAdmin || selectedScript.authorUid === userProfile.id);

  const createTopic = async (e) => {
    e.preventDefault();
    const clean = newTopicTitle.trim();
    if (!clean) return;
    const ref = await addDoc(collection(db, 'scripts'), { title: clean, content: '', authorUid: userProfile.id, authorName: userProfile.name, createdAt: Date.now(), updatedAt: Date.now() });
    pushNotification(`Started a new script topic: "${clean}"`, userProfile.name);
    setNewTopicTitle(''); setShowNewTopicModal(false); setSelectedScriptId(ref.id); showToast('Topic created!', 'success');
  };

  const saveScriptBody = async () => {
    if (!selectedScript || !canEditSelected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'scripts', selectedScript.id), { content: draftText, updatedAt: Date.now(), lastEditedBy: userProfile.name });
      setIsEditingBody(false); showToast('Script saved!', 'success');
    } catch (err) { showToast('Save failed.', 'warning'); } finally { setSaving(false); }
  };

  const removeTopic = async (id, e) => {
    if (e) e.stopPropagation();
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
                <span className="text-[9px] text-slate-400 font-mono block">By {s.authorName}</span>
              </div>
              {(isAdmin || s.authorUid === userProfile?.id) && (
                <button onClick={(e) => removeTopic(s.id, e)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-bold shrink-0 p-1 rounded transition">✕</button>
              )}
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
                  {selectedScript.lastEditedBy && <p className="text-[8px] text-slate-400">Last updated by {selectedScript.lastEditedBy}</p>}
                </div>
                <div className="flex gap-2">
                  {canEditSelected && !isEditingBody && (
                    <button onClick={() => setIsEditingBody(true)} className="text-[9px] font-bold text-[#C5A03A] bg-amber-50 border border-[#C5A03A]/30 rounded-lg px-2.5 py-1.5">✎ Edit Script</button>
                  )}
                  {isAdmin && (
                    <button onClick={(e) => removeTopic(selectedScript.id, e)} className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 hover:bg-rose-100">🗑 Delete</button>
                  )}
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
function WhiteboardChat({ chats, userProfile, chatChannel, setChatChannel, pushNotification, siteSettings, isAdmin, showToast }) {
  const [inputText, setInputText] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  
  const channels = siteSettings.chatChannels || [{id: 'general', name: '🌍 Studio Room'}];

  const commit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    await addDoc(collection(db, 'chats'), {
      projectId: chatChannel, text, senderName: userProfile?.name || 'Guest Creator', senderUid: userProfile?.id || 'guest-uid', createdAt: Date.now(),
    });
    pushNotification(`"${text.length > 50 ? text.slice(0, 50) + '…' : text}"`, userProfile?.name || 'Guest Creator', 'all');
    setInputText('');
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if(!newChannelName.trim()) return;
    await setDoc(doc(db, 'meta/settings'), { chatChannels: [...channels, {id: 'ch_' + Date.now(), name: newChannelName.trim()}] }, {merge: true});
    setNewChannelName(''); showToast("Whiteboard channel added!", "success");
  };

  const removeChannel = async (id, e) => {
    e.stopPropagation();
    await setDoc(doc(db, 'meta/settings'), { chatChannels: channels.filter(c => c.id !== id) }, {merge: true});
    if(chatChannel === id) setChatChannel('general');
    showToast("Channel removed!", "info");
  };

  const deleteMessage = async (msgId) => { 
    await deleteDoc(doc(db, 'chats', msgId)); 
    showToast("Message deleted.", "info");
  };

  return (
    <section className="flex flex-col sm:grid sm:grid-cols-4 border-2 border-[#EADFC9] rounded-2xl h-[70vh] sm:h-[450px] bg-white overflow-hidden shadow-skeuo-md animate-fadeIn font-sans">
      <div className="sm:col-span-1 bg-[#FFFDF9] p-2.5 border-b sm:border-b-0 sm:border-r text-xs border-[#EADFC9]/50 flex flex-col min-h-0 shrink-0">
        <div className="overflow-x-auto sm:overflow-y-auto custom-scrollbar flex sm:block whitespace-nowrap sm:whitespace-normal gap-1.5 sm:gap-2 flex-1">
          {channels.map(ch => (
            <div key={ch.id} className="relative group inline-block sm:block w-auto sm:w-full">
              <button onClick={() => setChatChannel(ch.id)} className={`w-full text-left px-3 sm:px-2.5 py-2 rounded-xl text-[11px] font-bold transition border sm:border-0 ${chatChannel === ch.id ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'border-slate-100 hover:bg-slate-50'}`}>{ch.name}</button>
              {isAdmin && ch.id !== 'general' && (
                <button onClick={(e) => removeChannel(ch.id, e)} className="absolute right-1 top-1/2 -translate-y-1/2 sm:opacity-0 sm:group-hover:opacity-100 text-rose-500 font-bold bg-white rounded-full px-1 py-0.5 border shadow-sm text-[8px]">✕</button>
              )}
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
      
      <div className="sm:col-span-3 flex flex-col h-full bg-slate-50/20 font-sans min-h-0 flex-1">
        <div className="p-3.5 overflow-y-auto space-y-1.5 custom-scrollbar flex-1 font-sans min-h-0">
          {chats.filter(c => c.projectId === chatChannel).slice().reverse().map((m) => (
            <div key={m.id} className="text-xs p-2.5 bg-white border border-[#EADFC9]/40 rounded-xl max-w-[85%] sm:max-w-[75%] animate-fadeIn shadow-xs font-sans group relative">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#C5A03A] font-bold block mb-0.5">{m.senderName}</span>
                {(isAdmin || m.senderUid === userProfile?.id) && (
                  <button onClick={() => deleteMessage(m.id)} className="text-rose-500 text-[9px] font-bold pl-3" title="Delete Message">✕ Delete</button>
                )}
              </div>
              <p className="text-slate-700 font-medium leading-relaxed font-sans">{m.text}</p>
            </div>
          ))}
          {chats.filter(c => c.projectId === chatChannel).length === 0 && <p className="text-slate-400 text-xs text-center py-6">This room is empty. Start the chat!</p>}
        </div>
        <form onSubmit={commit} className="p-2.5 border-t flex gap-2 bg-white font-sans shrink-0">
          <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type studio commentary..." className="flex-1 px-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A03A]" />
          <button type="submit" className="px-4 py-1.5 bg-[#C5A03A] text-white text-xs rounded-xl font-bold border-b-[4px] border-[#ab892c]">Send</button>
        </form>
      </div>
    </section>
  );
}

// --- INSTA FEED (UPGRADED BASE64 STORAGE BYPASS FALLBACK) ---
function PostsWorkspace({ posts, userProfile, showToast, pushNotification, isAdmin }) {
  const [postTitle, setPostTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [showCreateModal, setShowCreatePostModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef(null);

  const publishPost = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!postTitle.trim() || !file) return;
    setPublishing(true);
    try {
      // Local canvas optimization converts the post image directly to text. 0 Storage interaction!
      const compressedString = await compressAndConvertImage(file, 500);
      await addDoc(collection(db, 'posts'), {
        title: postTitle.trim(), description: postText.trim(), image: compressedString,
        authorName: userProfile.name, authorAvatar: userProfile.photoURL,
        likes: 0, likedBy: [], comments: [], createdAt: Date.now(),
      });
      pushNotification(`Shared showroom feed display card: "${postTitle}"`, userProfile.name);
      setPostTitle(''); setPostText(''); setShowCreatePostModal(false); showToast('Showcase uploaded to feed!', 'success');
    } catch (err) { showToast('Upload failed — check size.', 'warning'); } finally { setPublishing(false); }
  };

  const toggleLikePost = async (post) => {
    const hasLiked = post.likedBy?.includes(userProfile.id);
    const newLikedBy = hasLiked ? post.likedBy.filter(u => u !== userProfile.id) : [...(post.likedBy || []), userProfile.id];
    await updateDoc(doc(db, 'posts', post.id), { likedBy: newLikedBy, likes: newLikedBy.length });
  };

  const handleAddPostComment = async (e, postId) => {
    e.preventDefault();
    const commentVal = e.target.commentInputText.value.trim();
    if (!commentVal) return;
    await updateDoc(doc(db, 'posts', postId), { comments: arrayUnion({ id: 'pc_' + Date.now(), authorName: userProfile.name, text: commentVal }) });
    e.target.commentInputText.value = ''; showToast('Comment published!', 'success');
  };

  const removePost = async (postId) => { 
    await deleteDoc(doc(db, 'posts', postId)); 
    showToast("Post removed from feed.", "info"); 
  };

  const removePostComment = async (postId, postComments, commentId) => {
    const updatedComments = postComments.filter(x => x.id !== commentId);
    await updateDoc(doc(db, 'posts', postId), { comments: updatedComments });
    showToast("Comment removed.", "info");
  };

  return (
    <section className="py-2 animate-fadeIn space-y-6 font-sans">
      <div className="flex justify-between items-center bg-white border border-[#EADFC9]/50 p-4 rounded-xl shadow-sm gap-4">
        <h2 className="font-serif text-lg font-bold text-slate-800">📸 Insta Showroom Feed</h2>
        <button onClick={() => setShowCreatePostModal(true)} className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold text-[10px] sm:text-xs px-4 py-2 rounded-full border-b-[3px] border-amber-700 active:translate-y-[1px] active:border-b-0 shadow transition-all font-sans whitespace-nowrap">➕ Create Post</button>
      </div>

      <div className="max-w-md mx-auto space-y-6 animate-fadeIn">
        {posts.map(post => {
          const amLiked = post.likedBy?.includes(userProfile?.id);
          return (
            <div key={post.id} className="bg-white border-2 border-[#EADFC9] rounded-2xl overflow-hidden shadow-skeuo-md animate-fadeIn">
              <div className="p-3.5 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-slate-50 shrink-0">{renderAvatar(post.authorAvatar)}</div>
                  <div className="min-w-0"><h4 className="text-xs font-black text-slate-800 truncate">{post.authorName}</h4><span className="text-[8px] text-slate-400 font-mono block">{new Date(post.createdAt).toLocaleDateString()}</span></div>
                </div>
                {isAdmin && (
                  <button onClick={() => removePost(post.id)} className="text-rose-500 hover:text-rose-700 text-[10px] font-bold bg-rose-50 border rounded px-2.5 py-1">Delete Post</button>
                )}
              </div>
              <div className="w-full h-72 overflow-hidden bg-slate-100 relative"><img src={post.image} alt={post.title} className="w-full h-full object-cover animate-fadeIn" /></div>
              
              <div className="p-3.5 space-y-2.5 border-t border-slate-50 font-sans">
                <div className="flex items-center justify-between font-sans">
                  <div className="flex items-center space-x-2 font-sans">
                    <button onClick={() => toggleLikePost(post)} className="text-lg transition-transform active:scale-150">{amLiked ? '❤️' : '🤍'}</button>
                    <span className="text-xs font-bold text-slate-800">{post.likes || 0} likes</span>
                  </div>
                </div>
                
                <div className="text-xs">
                  <span className="font-bold text-slate-800 mr-2">{post.authorName}</span>
                  <span className="font-semibold text-slate-700">{post.title}</span>
                  {post.description && <p className="text-slate-500 mt-1 leading-relaxed font-sans">{post.description}</p>}
                </div>
                
                <div className="pt-2 border-t border-[#EADFC9]/20 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {(post.comments || []).map((c, i) => (
                    <div key={i} className="text-[11px] leading-normal animate-fadeIn font-sans flex justify-between group py-0.5">
                      <div className="min-w-0 pr-2"><span className="font-bold text-slate-800 mr-1.5">{c.authorName}</span><span className="text-slate-600 break-words">{c.text}</span></div>
                      {(isAdmin || c.authorName === userProfile.name) && (
                        <button onClick={() => removePostComment(post.id, post.comments, c.id)} className="text-rose-500 hover:text-rose-700 text-[9px] shrink-0 font-bold px-1.5">✕ Delete</button>
                      )}
                    </div>
                  ))}
                </div>
                
                <form onSubmit={(e) => handleAddPostComment(e, post.id)} className="pt-2 border-t border-[#EADFC9]/20 flex gap-2 font-sans">
                  <input name="commentInputText" type="text" placeholder="Add comment..." className="flex-1 text-[11px] px-3 py-1.5 bg-slate-50 border rounded-lg focus:outline-none" required />
                  <button type="submit" className="text-[10px] font-bold text-[#C5A03A] font-sans">Post</button>
                </form>
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
              <button type="submit" disabled={publishing} className="px-4 py-1.5 bg-[#C5A03A] text-white font-bold text-xs rounded-xl border-b-[4px] border-[#ab892c] disabled:opacity-50">
                {publishing ? 'Publishing…' : 'Share Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// --- MY PROFILE ---
function MyProfileWorkspace({ userProfile, categories, showToast, handleSignOut }) {
  const [fullName, setFullName] = useState(userProfile?.name || '');
  const [selectedCat, setSelectedCat] = useState(userProfile?.workCategory || categories[0] || 'Editing');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(userProfile?.photoURL || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name || ''); setSelectedCat(userProfile.workCategory || categories[0] || 'Editing'); setUploadedPhotoUrl(userProfile.photoURL || '');
    }
  }, [userProfile, categories]);

  const saveProfileSettings = async (e) => {
    e.preventDefault(); 
    if (!fullName.trim()) return; 
    setSaving(true);
    try {
      await updateDoc(doc(db, 'profiles', userProfile.id), { 
        name: fullName.trim(), 
        workCategory: selectedCat, 
        photoURL: uploadedPhotoUrl 
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err) { 
      showToast('Save failed.', 'warning'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleRegisterCategory = async (e) => {
    e.preventDefault(); const refined = newCatInp.trim(); if (!refined) return;
    if (categories.some(c => c.toLowerCase() === refined.toLowerCase())) { showToast('Category tag already exists.', 'warning'); return; }
    await setDoc(doc(db, 'meta/categories'), { list: arrayUnion(refined) }, { merge: true });
    setSelectedCat(refined); setNewCatInp(''); showToast('Category registered!', 'success');
  };

  return (
    <section className="max-w-xl mx-auto bg-white border border-[#EADFC9] rounded-[2rem] p-6 shadow-lg relative animate-fadeIn font-sans">
      <WatercolorOverlay />
      <div className="text-center mb-4">
        <h2 className="font-serif text-2xl font-bold text-slate-800">Profile Details</h2>
      </div>
      <div className="flex flex-col items-center mb-5 font-sans">
        <div className="w-20 h-20 rounded-full border-4 border-[#C5A03A]/20 bg-white overflow-hidden shadow-md flex items-center justify-center mb-1 font-sans">
          {renderAvatar(uploadedPhotoUrl, "w-full h-full object-cover rounded-full")}
        </div>
      </div>
      <form onSubmit={saveProfileSettings} className="space-y-4 font-sans animate-fadeIn">
        <div><label className="block text-[9px] font-bold text-slate-500 uppercase">Display Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A]" required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-[9px] font-bold text-slate-500 uppercase font-sans">Role Specialization</label><select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A]">{categories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}</select></div>
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
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] text-white text-xs font-bold uppercase rounded-xl tracking-wider hover:bg-[#ae8b30] shadow transition disabled:opacity-50">{saving ? 'Saving…' : 'Save Profile Details'}</button>
      </form>
      <div className="border-t border-[#EADFC9]/50 mt-5 pt-5 font-sans">
        <h4 className="font-serif text-xs font-bold text-slate-800 mb-1.5">Register Custom Specialization Tag</h4>
        <form onSubmit={handleRegisterCategory} className="flex gap-2 font-sans">
          <input type="text" value={newCatInp} onChange={(e) => setNewCatInp(e.target.value)} placeholder="e.g. 3D Animator" className="flex-1 px-3 py-1.5 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:outline-none" required />
          <button type="submit" className="px-3.5 py-1.5 bg-slate-800 text-white text-xs rounded-xl font-bold font-sans">Add Tag</button>
        </form>
      </div>
      <div className="border-t border-[#EADFC9]/50 mt-5 pt-5 text-center"><button onClick={handleSignOut} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition bg-rose-50 hover:bg-rose-100 px-5 py-2 rounded-full border border-rose-200">🚪 Sign Out</button></div>
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
    await setDoc(doc(db, 'meta/ytConfig'), { channelId: channelIdInput, apiKey: apiKeyInput }, { merge: true });
    showToast('YouTube configurations saved!', 'success');
    syncYouTubeStats(channelIdInput, apiKeyInput);
  };

  const saveMemberPhotoOverride = async (userId) => {
    if (!editedFile) return;
    try {
      const compressedBase64 = await compressAndConvertImage(editedFile, 150);
      await updateDoc(doc(db, 'profiles', userId), { photoURL: compressedBase64 });
      setEditingUserId(null); setEditedFile(null); 
      showToast("Crew member's profile picture modified successfully!", 'success');
    } catch (err) {
      showToast("Photo compression override failed.", "warning");
    }
  };

  const triggerSiteLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const compressedBase64 = await compressAndConvertImage(file, 200);
      await setDoc(doc(db, 'meta/settings'), { logoUrl: compressedBase64 }, { merge: true }); 
      showToast('Branding Custom Logo updated successfully!', 'success');
    } catch (err) {
      showToast('Logo processing failed.', 'warning');
    }
  };

  const saveLogoText = async () => {
    try { await setDoc(doc(db, 'meta/settings'), { logoText: logoTxt }, { merge: true }); showToast('Logo text saved!', 'success'); } 
    catch (err) { showToast('Error saving logo text. Check permissions.', 'warning'); }
  };

  const approve = (uid) => updateDoc(doc(db, 'profiles', uid), { status: 'approved' });
  const promote = (uid) => updateDoc(doc(db, 'profiles', uid), { role: 'admin' });
  const demote = (uid) => updateDoc(doc(db, 'profiles', uid), { role: 'member' });
  const remove = (uid) => deleteDoc(doc(db, 'profiles', uid));

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
                          
                          {p.role !== 'admin' && p.role !== 'owner' ? (
                            <button onClick={() => promote(p.id)} className="bg-amber-50 text-amber-700 px-2 py-0.5 border rounded hover:bg-amber-100 text-[9px]">Promote</button>
                          ) : (
                            p.role !== 'owner' && <button onClick={() => demote(p.id)} className="bg-purple-50 text-purple-700 px-2 py-0.5 border rounded hover:bg-purple-100 text-[9px]">Demote</button>
                          )}
                          
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

function PendingScreen({ userProfile }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center p-4">
      <div className="bg-white border-2 border-[#EADFC9] p-6 rounded-2xl max-w-sm shadow-skeuo-md animate-fadeIn font-sans">
        <h3 className="font-serif font-bold text-base mb-1 text-slate-800">Roster Waiting Room</h3>
        <p className="text-xs text-slate-500 mb-4 font-sans">Hello {userProfile?.name}! Your request has been routed to the pending list for review. The studio owner will see it on the Admin panel.</p>
      </div>
    </div>
  );
}

function RejectedScreen({ userProfile }) {
  return <div className="text-center py-20 font-sans font-bold text-rose-500">Access Restricted. Contact the studio owner directly.</div>;
}
