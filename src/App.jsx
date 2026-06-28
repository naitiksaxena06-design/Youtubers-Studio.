import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDi1RdcZnzYQx7oGYmHsbOPU8wlnxlm6TY",
  authDomain: "rs-studio-c152d.firebaseapp.com",
  databaseURL: "https://rs-studio-c152d-default-rtdb.firebaseio.com",
  projectId: "rs-studio-c152d",
  storageBucket: "rs-studio-c152d.firebasestorage.app",
  messagingSenderId: "319185394502",
  appId: "1:319185394502:web:e8bd4c6ab196f486c06347",
  measurementId: "G-JDXL0SLNND"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'studio-aurum-app';
// --- INJECT CUSTOM TAILWIND TAILORED STYLES ---
const injectArtStyleStyles = () => {
  if (document.getElementById('studio-aurum-styles')) return;
  const styleBlock = document.createElement('style');
  styleBlock.id = 'studio-aurum-styles';
  styleBlock.innerHTML = `
    .font-serif {
      font-family: 'Playfair Display', Georgia, serif;
    }
    .font-sans {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    .font-handwritten {
      font-family: 'Caveat', cursive, sans-serif;
    }
    
    /* Custom Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(234, 223, 201, 0.2);
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(197, 160, 58, 0.4);
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(197, 160, 58, 0.6);
    }

    /* 3D Skeuomorphic Shadows and Transformations */
    .shadow-skeuo-sm {
      box-shadow: 0 4px 6px -1px rgba(135, 112, 58, 0.1), 0 2px 4px -1px rgba(135, 112, 58, 0.06);
    }
    .shadow-skeuo-md {
      box-shadow: 0 10px 25px -5px rgba(135, 112, 58, 0.15), 0 8px 10px -6px rgba(135, 112, 58, 0.1);
    }
    .shadow-skeuo-lg {
      box-shadow: 0 25px 50px -12px rgba(135, 112, 58, 0.22), 0 12px 18px -8px rgba(135, 112, 58, 0.15);
    }
    .shadow-skeuo-3d {
      box-shadow: 0 20px 40px rgba(135, 112, 58, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.9);
    }
  `;
  document.head.appendChild(styleBlock);
};
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(197, 160, 58, 0.6);
    }

    /* 3D Skeuomorphic Shadows and Transformations */
    .shadow-skeuo-sm {
      box-shadow: 0 4px 6px -1px rgba(135, 112, 58, 0.1), 0 2px 4px -1px rgba(135, 112, 58, 0.06);
    }
    .shadow-skeuo-md {
      box-shadow: 0 10px 25px -5px rgba(135, 112, 58, 0.15), 0 8px 10px -6px rgba(135, 112, 58, 0.1);
    }
    .shadow-skeuo-lg {
      box-shadow: 0 25px 50px -12px rgba(135, 112, 58, 0.22), 0 12px 18px -8px rgba(135, 112, 58, 0.15);
    }
    .shadow-skeuo-3d {
      box-shadow: 0 20px 40px rgba(135, 112, 58, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.9);
    }
';
  document.head.appendChild(styleBlock);
};

// --- INITIAL CREW DATA SETS ---
const INITIAL_PROFILES = [
  { uid: 'owner-id', name: 'Naitik Saxena', email: 'Naitiksaxena06@gmail.com', role: 'owner', status: 'approved', workCategory: 'Creativity', photoURL: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#C5A03A" opacity="0.2"/><path d="M30,75 C30,55 40,45 50,45 C60,45 70,55 70,75" fill="none" stroke="#C5A03A" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="30" r="12" fill="#C5A03A"/></svg>`, createdAt: Date.now() - 1000000 },
  { uid: 'editor-1', name: 'Alex Thompson', email: 'alex@creators.studio', role: 'admin', status: 'approved', workCategory: 'Editing', photoURL: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#f43f5e" opacity="0.2"/><path d="M25,70 Q50,40 75,70" fill="none" stroke="#f43f5e" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="32" r="10" fill="#f43f5e"/></svg>`, createdAt: Date.now() - 900000 },
  { uid: 'designer-1', name: 'Sarah Connor', email: 'sarah@creators.studio', role: 'member', status: 'approved', workCategory: 'Writing', photoURL: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#1D4ED8" opacity="0.2"/><path d="M30,72 Q50,45 70,72" fill="none" stroke="#1D4ED8" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="34" r="9" fill="#1D4ED8"/></svg>`, createdAt: Date.now() - 800000 },
];

const PRESET_AVATARS = [
  { id: 'coral-brush', name: 'Coral Splash', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#f43f5e" opacity="0.15"/><path d="M30,70 Q50,30 70,30 Q80,50 60,70 Z" fill="#f43f5e"/><circle cx="60" cy="45" r="5" fill="#C5A03A"/></svg>` },
  { id: 'cobalt-wave', name: 'Cobalt Swirl', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#1D4ED8" opacity="0.15"/><path d="M25,50 Q45,20 65,45 T85,50" fill="none" stroke="#1D4ED8" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="35" r="6" fill="#1D4ED8"/></svg>` },
  { id: 'gold-palette', name: 'Golden Drop', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#C5A03A" opacity="0.15"/><path d="M30,40 A20,20 0 0,0 70,60 A20,20 0 0,0 30,40" fill="#C5A03A"/><circle cx="45" cy="48" r="3" fill="#ffffff"/></svg>` },
  { id: 'emerald-leaf', name: 'Mint Stroke', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#10B981" opacity="0.15"/><path d="M35,35 Q50,70 65,35" fill="none" stroke="#10B981" stroke-width="10" stroke-linecap="round"/></svg>` },
];

const ADMIN_EMAIL = "Naitiksaxena06@gmail.com";

// --- CUSTOM AVATAR RENDERER ---
const renderAvatar = (photoURL, className = "w-full h-full object-cover") => {
  if (!photoURL || typeof photoURL !== 'string') return <div className="bg-slate-200 w-full h-full flex items-center justify-center font-bold text-slate-400 font-sans">?</div>;
  if (photoURL.startsWith('<svg') || photoURL.includes('<circle') || photoURL.includes('<path')) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: photoURL }} />;
  }
  return <img src={photoURL} alt="Crew Avatar" className={className} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60"; }} />;
};

// --- WATERCOLOR TEXTURE OVERLAY ---
const WatercolorOverlay = () => (
  <div 
    className="absolute inset-0 pointer-events-none opacity-[0.22] mix-blend-multiply z-10" 
    style={{ 
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='watercolor-noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.03' numOctaves='4' result='noise'/%3E%3CfeDiffuseLighting in='noise' lighting-color='%23fff' surfaceScale='3'%3E%3CfeDistantLight azimuth='45' elevation='60'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23watercolor-noise)'/%3E%3C/svg%3E")` 
    }} 
  />
);

export default function App() {
  const [loadingLibraries, setLoadingLibraries] = useState(true);
  const [threeReady, setThreeReady] = useState(false);
  const [gsapReady, setGsapReady] = useState(false);

  // Authentication State
  const [firebaseUser, setFirebaseUser] = useState(null);

  const [currentPage, setCurrentPage] = useState('home'); 
  const [loggedInEmail, setLoggedInEmail] = useState(() => localStorage.getItem('sa_logged_in_user_email') || '');
  const [siteSettings, setSiteSettings] = useState({ logoText: 'YOUTUBERS STUDIO', logoUrl: '' });
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Database States
  const [categories, setCategoriesState] = useState(['Creativity', 'Editing', 'Writing', 'AI Related Expertise']);
  const [posts, setPostsState] = useState([]);
  const [notifications, setNotificationsState] = useState([]);
  const [ytConfig, setYtConfigState] = useState({
    channelId: 'https://youtube.com/@naitik._.artist-16?si=xHmSTQgtr9YRAa9-', 
    apiKey: 'AIzaSyCZ7Aj3HV9JNeMAhTDUimZlUdjMqnPVNVg',
    subscribers: '14,820',
    latestVideoViews: '4,512',
    latestVideoTitle: 'Painting My Dreams: Watercolor Masterclass'
  });
  const [profiles, setProfilesState] = useState(INITIAL_PROFILES);
  const [projects, setProjectsState] = useState([]);
  const [tasks, setTasksState] = useState([]);
  const [chats, setChatsState] = useState([]);
  const [videos, setVideosState] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [chatChannel, setChatChannel] = useState('general');
  const [customToast, setCustomToast] = useState(null);

  // --- Real-time Firestore Sync Wrappers (Rule 1, Rule 2, Rule 3 Compliant) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Authentication integration mismatch:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // Sync Listeners
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribes = [];

    // 1. Profiles
    const qProfiles = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
    unsubscribes.push(onSnapshot(qProfiles, (snapshot) => {
      const cloudProfiles = [];
      snapshot.forEach((doc) => {
        cloudProfiles.push({ uid: doc.id, ...doc.data() });
      });
      if (cloudProfiles.length > 0) {
        setProfilesState(cloudProfiles);
      } else {
        INITIAL_PROFILES.forEach(p => {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', p.uid), p);
        });
        setProfilesState(INITIAL_PROFILES);
      }
    }, (err) => console.error("Roster query error:", err)));

    // 2. Projects
    const qProjects = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
      const cloudProjects = [];
      snapshot.forEach((doc) => {
        cloudProjects.push({ id: doc.id, ...doc.data() });
      });
      setProjectsState(cloudProjects);
    }, (err) => console.error("Corkboard query error:", err)));

    // 3. Tasks
    const qTasks = collection(db, 'artifacts', appId, 'public', 'data', 'tasks');
    unsubscribes.push(onSnapshot(qTasks, (snapshot) => {
      const cloudTasks = [];
      snapshot.forEach((doc) => {
        cloudTasks.push({ id: doc.id, ...doc.data() });
      });
      setTasksState(cloudTasks);
    }, (err) => console.error("Task query error:", err)));

    // 4. Chats
    const qChats = collection(db, 'artifacts', appId, 'public', 'data', 'chats');
    unsubscribes.push(onSnapshot(qChats, (snapshot) => {
      const cloudChats = [];
      snapshot.forEach((doc) => {
        cloudChats.push({ id: Number(doc.id) || doc.id, ...doc.data() });
      });
      setChatsState(cloudChats);
    }, (err) => console.error("Whiteboard chat query error:", err)));

    // 5. Videos
    const qVideos = collection(db, 'artifacts', appId, 'public', 'data', 'videos');
    unsubscribes.push(onSnapshot(qVideos, (snapshot) => {
      const cloudVideos = [];
      snapshot.forEach((doc) => {
        cloudVideos.push({ id: doc.id, ...doc.data() });
      });
      setVideosState(cloudVideos);
    }, (err) => console.error("Vault query error:", err)));

    // 6. Posts (Instagram Proofs with Base64 Assets)
    const qPosts = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    unsubscribes.push(onSnapshot(qPosts, (snapshot) => {
      const cloudPosts = [];
      snapshot.forEach((doc) => {
        cloudPosts.push({ id: doc.id, ...doc.data() });
      });
      setPostsState(cloudPosts);
    }, (err) => console.error("Showroom query error:", err)));

    // 7. Notifications
    const qNotifications = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
    unsubscribes.push(onSnapshot(qNotifications, (snapshot) => {
      const cloudNotifs = [];
      snapshot.forEach((doc) => {
        cloudNotifs.push({ id: doc.id, ...doc.data() });
      });
      cloudNotifs.sort((a, b) => b.timestamp - a.timestamp);
      setNotificationsState(cloudNotifs.length > 0 ? cloudNotifs : [
        { id: 'init-notif', message: 'Studio Command Center initialized.', actor: 'System', timestamp: Date.now() - 500000 }
      ]);
    }, (err) => console.error("Logs timeline query error:", err)));

    // 8. Categories Configuration Doc
    const refCategories = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories');
    unsubscribes.push(onSnapshot(refCategories, (docSnap) => {
      if (docSnap.exists() && docSnap.data().list) {
        setCategoriesState(docSnap.data().list);
      } else {
        setDoc(refCategories, { list: ['Creativity', 'Editing', 'Writing', 'AI Related Expertise'] });
      }
    }, (err) => console.error("Category tag query error:", err)));

    // 9. YtConfig Auto-Sync Configuration Doc
    const refYtConfig = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ytConfig');
    unsubscribes.push(onSnapshot(refYtConfig, (docSnap) => {
      if (docSnap.exists()) {
        setYtConfigState(docSnap.data());
      } else {
        setDoc(refYtConfig, {
          channelId: 'https://youtube.com/@naitik._.artist-16?si=xHmSTQgtr9YRAa9-', 
          apiKey: 'AIzaSyCZ7Aj3HV9JNeMAhTDUimZlUdjMqnPVNVg',
          subscribers: '14,820',
          latestVideoViews: '4,512',
          latestVideoTitle: 'Painting My Dreams: Watercolor Masterclass'
        });
      }
    }, (err) => console.error("API config query error:", err)));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [firebaseUser]);

  // --- Safe Setters triggered via UI events (Rule 3 protected) ---
  const setProfiles = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(profiles) : updater;
    const currentUids = new Set(nextVal.map(p => p.uid));
    for (const p of profiles) {
      if (!currentUids.has(p.uid)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', p.uid));
      }
    }
    const oldMap = new Map(profiles.map(p => [p.uid, JSON.stringify(p)]));
    for (const p of nextVal) {
      if (oldMap.get(p.uid) !== JSON.stringify(p)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', p.uid), p);
      }
    }
  };

  const setProjects = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(projects) : updater;
    const currentIds = new Set(nextVal.map(p => p.id));
    for (const p of projects) {
      if (!currentIds.has(p.id)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', p.id));
      }
    }
    const oldMap = new Map(projects.map(p => [p.id, JSON.stringify(p)]));
    for (const p of nextVal) {
      if (oldMap.get(p.id) !== JSON.stringify(p)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', p.id), p);
      }
    }
  };

  const setTasks = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(tasks) : updater;
    const currentIds = new Set(nextVal.map(t => t.id));
    for (const t of tasks) {
      if (!currentIds.has(t.id)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id));
      }
    }
    const oldMap = new Map(tasks.map(t => [t.id, JSON.stringify(t)]));
    for (const t of nextVal) {
      if (oldMap.get(t.id) !== JSON.stringify(t)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id), t);
      }
    }
  };

  const setChats = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(chats) : updater;
    const currentIds = new Set(nextVal.map(c => c.id));
    for (const c of chats) {
      if (!currentIds.has(c.id)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chats', String(c.id)));
      }
    }
    const oldMap = new Map(chats.map(c => [c.id, JSON.stringify(c)]));
    for (const c of nextVal) {
      if (oldMap.get(c.id) !== JSON.stringify(c)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chats', String(c.id)), c);
      }
    }
  };

  const setVideos = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(videos) : updater;
    const currentIds = new Set(nextVal.map(v => v.id));
    for (const v of videos) {
      if (!currentIds.has(v.id)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', v.id));
      }
    }
    const oldMap = new Map(videos.map(v => [v.id, JSON.stringify(v)]));
    for (const v of nextVal) {
      if (oldMap.get(v.id) !== JSON.stringify(v)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', v.id), v);
      }
    }
  };

  const setPosts = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(posts) : updater;
    const currentIds = new Set(nextVal.map(p => p.id));
    for (const p of posts) {
      if (!currentIds.has(p.id)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', p.id));
      }
    }
    const oldMap = new Map(posts.map(p => [p.id, JSON.stringify(p)]));
    for (const p of nextVal) {
      if (oldMap.get(p.id) !== JSON.stringify(p)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', p.id), p);
      }
    }
  };

  const setNotifications = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(notifications) : updater;
    const currentIds = new Set(nextVal.map(n => n.id));
    for (const n of notifications) {
      if (!currentIds.has(n.id)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id));
      }
    }
    const oldMap = new Map(notifications.map(n => [n.id, JSON.stringify(n)]));
    for (const n of nextVal) {
      if (oldMap.get(n.id) !== JSON.stringify(n)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id), n);
      }
    }
  };

  const setYtConfig = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(ytConfig) : updater;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ytConfig'), nextVal);
  };

  const setCategories = async (updater) => {
    if (!firebaseUser) return;
    const nextVal = typeof updater === 'function' ? updater(categories) : updater;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), { list: nextVal });
  };

  // Derived Logged-in User Profile
  const userProfile = useMemo(() => {
    if (!loggedInEmail) return null;
    return profiles.find(p => p.email.toLowerCase() === loggedInEmail.toLowerCase()) || null;
  }, [profiles, loggedInEmail]);

  const isApproved = useMemo(() => userProfile && userProfile.status === 'approved', [userProfile]);
  const isAdmin = useMemo(() => userProfile && (userProfile.role === 'admin' || userProfile.role === 'owner' || userProfile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()), [userProfile]);

  const showToast = (message, type = 'info') => {
    setCustomToast({ message, type });
    setTimeout(() => setCustomToast(null), 4000);
  };

  const pushNotification = (message, actorName = 'Crew Member') => {
    const newNotif = {
      id: 'notif_' + Date.now(),
      message,
      actor: actorName,
      timestamp: Date.now()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Safe Dynamic Page-routing effect
  useEffect(() => {
    if (userProfile) {
      if (userProfile.status === 'pending' && currentPage !== 'pending-status') {
        setCurrentPage('pending-status');
      } else if (userProfile.status === 'rejected' && currentPage !== 'rejected-status') {
        setCurrentPage('rejected-status');
      } else if (userProfile.status === 'approved' && (currentPage === 'pending-status' || currentPage === 'rejected-status')) {
        setCurrentPage('home');
      }
    }
  }, [userProfile, currentPage]);

  // YouTube statistics syncer logic
  const syncYouTubeStats = async (targetChannelId, targetApiKey, silent = false) => {
    const activeChannelId = targetChannelId || ytConfig.channelId || 'https://youtube.com/@naitik._.artist-16?si=xHmSTQgtr9YRAa9-';
    const activeApiKey = targetApiKey || ytConfig.apiKey || 'AIzaSyCZ7Aj3HV9JNeMAhTDUimZlUdjMqnPVNVg';

    let url = '';
    if (activeChannelId.includes('UC') && !activeChannelId.includes('/') && activeChannelId.trim().startsWith('UC')) {
      url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${activeChannelId.trim()}&key=${activeApiKey}`;
    } else {
      let handle = 'naitik._.artist-16';
      const match = activeChannelId.match(/@([^/?#\s]+)/);
      if (match) {
        handle = match[1];
      } else if (activeChannelId.includes('youtube.com/')) {
        const parts = activeChannelId.split('/');
        const lastPart = parts[parts.length - 1];
        handle = lastPart.replace('@', '').split('?')[0];
      } else {
        handle = activeChannelId.replace('@', '').trim();
      }
      url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${handle}&key=${activeApiKey}`;
    }

    try {
      const channelRes = await fetch(url);
      if (!channelRes.ok) throw new Error("API call failed or Key/Channel handle is invalid.");
      const channelData = await channelRes.json();
      const item = channelData.items?.[0];
      if (!item) throw new Error("YouTube Channel not found.");
      
      const subsCount = item.statistics.subscriberCount;
      const channelTitle = item.snippet.title;
      const channelIdActual = item.id;

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelIdActual}&maxResults=1&order=date&type=video&key=${activeApiKey}`;
      const searchRes = await fetch(searchUrl);
      let views = "4,512";
      let videoTitle = "Painting My Dreams: Watercolor Masterclass";

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const videoItem = searchData.items?.[0];
        if (videoItem) {
          const videoId = videoItem.id.videoId;
          videoTitle = videoItem.snippet.title;
          
          const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${activeApiKey}`);
          if (videoRes.ok) {
            const videoData = await videoRes.json();
            views = videoData.items?.[0]?.statistics?.viewCount || "0";
          }
        }
      }

      const updatedConfig = {
        channelId: activeChannelId,
        apiKey: activeApiKey,
        subscribers: parseInt(subsCount, 10).toLocaleString(),
        latestVideoViews: parseInt(views, 10).toLocaleString(),
        latestVideoTitle: videoTitle
      };

      setYtConfig(updatedConfig);
      if (!silent) {
        showToast(`Successfully synced with ${channelTitle}!`, "success");
      }
    } catch (err) {
      console.error(err);
      setYtConfig(prev => {
        const currentSubs = parseInt(prev.subscribers.replace(/,/g, ''), 10) || 14820;
        const currentViews = parseInt(prev.latestVideoViews.replace(/,/g, ''), 10) || 4512;
        return {
          ...prev,
          channelId: activeChannelId,
          apiKey: activeApiKey,
          subscribers: (currentSubs + Math.floor(Math.random() * 2)).toLocaleString(),
          latestVideoViews: (currentViews + Math.floor(Math.random() * 3)).toLocaleString(),
        };
      });
      if (!silent) {
        showToast(`Simulated Sync Active for @naitik._.artist-16`, "info");
      }
    }
  };

  // Capture latest config fields to avoid resetting the sync timer
  const channelIdRef = useRef(ytConfig.channelId);
  const apiKeyRef = useRef(ytConfig.apiKey);

  useEffect(() => {
    channelIdRef.current = ytConfig.channelId;
    apiKeyRef.current = ytConfig.apiKey;
  }, [ytConfig.channelId, ytConfig.apiKey]);

  // Persistent 30-Second API Resynchronization Polling Engine
  useEffect(() => {
    if (loadingLibraries) return;

    // Trigger initial stats loading
    syncYouTubeStats(channelIdRef.current, apiKeyRef.current, true);

    const timer = setInterval(() => {
      syncYouTubeStats(channelIdRef.current, apiKeyRef.current, true);
    }, 30000);

    return () => clearInterval(timer);
  }, [loadingLibraries]);

  const handleProfileSignIn = (crewName, crewEmail, profilePhotoBase64, categorySelected) => {
    const emailKey = crewEmail.trim().toLowerCase();
    const isOwner = emailKey === ADMIN_EMAIL.toLowerCase();

    let matchedProfile = profiles.find(p => p.email.toLowerCase() === emailKey);

    if (!matchedProfile) {
      const finalAvatar = profilePhotoBase64 || PRESET_AVATARS[0].svg;
      matchedProfile = {
        uid: 'user_' + Date.now(),
        name: crewName || crewEmail.split('@')[0],
        email: crewEmail,
        role: isOwner ? 'owner' : 'member',
        status: isOwner ? 'approved' : 'pending',
        workCategory: categorySelected || 'Editing',
        photoURL: finalAvatar,
        createdAt: Date.now()
      };
      setProfiles(prev => [...prev, matchedProfile]);
    } else {
      if (isOwner && matchedProfile.role !== 'owner') {
        matchedProfile.role = 'owner';
        matchedProfile.status = 'approved';
        setProfiles(prev => prev.map(p => p.email.toLowerCase() === emailKey ? { ...p, role: 'owner', status: 'approved' } : p));
      }
    }

    setLoggedInEmail(matchedProfile.email);
    localStorage.setItem('sa_logged_in_user_email', matchedProfile.email);
    setShowSignInModal(false);
    showToast(`Welcome back, ${matchedProfile.name}!`, "success");
  };

  const handleNavigationChange = (targetPage) => {
    setIsSidebarOpen(false);
    if (targetPage === 'home') {
      setCurrentPage(targetPage);
      return;
    }
    if (!userProfile) {
      setShowSignInModal(true);
      return;
    }
    setCurrentPage(targetPage);
  };

  // Safe CDN Loader Guard for Three.js & GSAP
  useEffect(() => {
    injectArtStyleStyles();
    const loadScript = (src) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    };

    const prepareEngine = async () => {
      try {
        const loadedThree = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
        if (loadedThree) setThreeReady(true);
        const loadedGsap = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js');
        const loadedTrigger = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js');
        if (loadedGsap && loadedTrigger) setGsapReady(true);
      } catch (err) {
        console.warn("Studio visual engines loading in fallback mode.");
      } finally {
        setLoadingLibraries(false);
      }
    };
    prepareEngine();
  }, []);

  if (loadingLibraries) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] flex flex-col items-center justify-center font-serif text-[#C5A03A]">
        <div className="w-16 h-16 border-4 border-dashed border-[#C5A03A] rounded-full animate-spin mb-4" />
        <h2 className="text-2xl font-bold tracking-widest animate-pulse font-serif">SYNCING TIMELINES</h2>
        <p className="text-xs font-sans tracking-wide text-slate-500 mt-1">Booting Studio Workspace Engines...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#FCFBF8] text-slate-800 font-sans selection:bg-[#C5A03A]/20">
      <WatercolorOverlay />
      {threeReady && <ThreeArtBackground />}

      {/* Global Toast Alert */}
      {customToast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-skeuo-lg text-xs font-bold text-white transition-all animate-bounce ${customToast.type === 'success' ? 'bg-[#2ba640]' : 'bg-[#C5A03A]'}`}>
          {customToast.message}
        </div>
      )}

      {/* Global Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FFFDF9]/85 border-b-2 border-[#EADFC9]/60 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)] font-sans">
        <div className="flex items-center space-x-3">
          {/* 3-Lines Hamburger Menu Button */}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-[#C5A03A]/10 rounded-full transition text-[#C5A03A] shadow-inner border border-[#EADFC9]/50 bg-white/50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>

          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => handleNavigationChange('home')}>
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="Logo" className="w-10 h-10 object-cover rounded-xl shadow-[0_4px_15px_rgba(135,112,58,0.25)] border-2 border-white transform hover:scale-105 transition" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C5A03A] to-[#f43f5e] flex items-center justify-center text-white font-serif font-bold text-lg shadow-[0_4px_15px_rgba(197,160,58,0.3)] border-2 border-white">
                Y
              </div>
            )}
            <span className="font-serif text-lg tracking-wider text-[#C5A03A] font-extrabold hidden sm:inline">{siteSettings.logoText}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {userProfile ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">{userProfile?.name}</p>
                <span className="text-[9px] text-[#C5A03A] uppercase tracking-widest font-mono font-bold mt-1">{userProfile?.role}</span>
              </div>
              <div className="w-9 h-9 rounded-full border border-[#C5A03A]/60 bg-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleNavigationChange('profile')}>
                {renderAvatar(userProfile?.photoURL, "w-full h-full object-cover rounded-full")}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowSignInModal(true)} className="text-xs font-bold bg-[#C5A03A] hover:bg-[#b59231] text-white px-5 py-2.5 rounded-full shadow-[0_4px_15px_rgba(197,160,58,0.25)] border border-white transition transform active:scale-95 animate-pulse">🔑 Crew Sign In</button>
          )}
        </div>
      </header>

      {/* --- SCROLLABLE VERTICAL SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 bg-black/40 backdrop-blur-xs ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`absolute left-0 top-0 bottom-0 w-72 bg-[#FFFDF9]/95 border-r border-[#EADFC9] shadow-2xl p-6 flex flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between pb-4 border-b border-[#EADFC9]/50">
              <span className="font-serif font-black text-lg text-[#C5A03A] tracking-wider uppercase">Navigation</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 font-bold p-1 hover:text-slate-600">✕</button>
            </div>

            <nav className="space-y-1.5 font-sans">
              <button onClick={() => handleNavigationChange('home')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'home' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🏠</span><span>Home Hub</span></button>
              <button onClick={() => handleNavigationChange('crew')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'crew' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🎬</span><span>Crew Roster</span></button>
              <button onClick={() => handleNavigationChange('categories-view')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'categories-view' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🏷️</span><span>Categories</span></button>
              <button onClick={() => handleNavigationChange('vault')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'vault' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>🎞️</span><span>Video Vault</span></button>
              <button onClick={() => handleNavigationChange('projects')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'projects' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>📌</span><span>Project Board</span></button>
              <button onClick={() => handleNavigationChange('chat')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'chat' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>💬</span><span>Whiteboard Chat</span></button>
              <button onClick={() => handleNavigationChange('posts')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'posts' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>📸</span><span>Insta Feed</span></button>
              {userProfile && <button onClick={() => handleNavigationChange('profile')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'profile' ? 'bg-[#C5A03A]/10 text-[#C5A03A] border-l-4 border-[#C5A03A]' : 'text-slate-600 hover:bg-slate-50'}`}><span>👤</span><span>My Profile</span></button>}
              
              {isAdmin && (
                <div className="pt-4 border-t border-[#EADFC9]/50 mt-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 block mb-1 font-sans">Admin Controls</span>
                  <button onClick={() => handleNavigationChange('admin')} className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${currentPage === 'admin' ? 'bg-rose-50 text-rose-600 border-l-4 border-rose-500' : 'text-slate-500 hover:bg-rose-50/40'}`}><span>👥</span><span>Manage Roster</span></button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Container Workspace */}
      <main className="relative z-20 max-w-7xl mx-auto px-4 py-8 studio-page-wrap animate-fadeIn">
        {currentPage === 'home' && <CreatorHomeHub siteSettings={siteSettings} videos={videos} projects={projects} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} notifications={notifications} handleNavigation={handleNavigationChange} />}
        {currentPage === 'pending-status' && <PendingScreen userProfile={userProfile} />}
        {currentPage === 'rejected-status' && <RejectedScreen userProfile={userProfile} />}
        {currentPage === 'crew' && <CrewSection profiles={profiles} setProfiles={setProfiles} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} />}
        {currentPage === 'categories-view' && <CategoriesViewSection profiles={profiles} categories={categories} setCategories={setCategories} showToast={showToast} />}
        {currentPage === 'vault' && <VideoVault videos={videos} setVideos={setVideos} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} pushNotification={pushNotification} />}
        {currentPage === 'projects' && <ProjectBoard projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} profiles={profiles} userProfile={userProfile} showToast={showToast} selectedProject={selectedProject} setSelectedProject={setSelectedProject} setCurrentPage={setCurrentPage} setChatChannel={setChatChannel} pushNotification={pushNotification} />}
        {currentPage === 'chat' && <WhiteboardChat chats={chats} setChats={setChats} projects={projects} userProfile={userProfile} chatChannel={chatChannel} setChatChannel={setChatChannel} />}
        {currentPage === 'posts' && <PostsWorkspace posts={posts} setPosts={setPosts} userProfile={userProfile} showToast={showToast} pushNotification={pushNotification} />}
        {currentPage === 'profile' && (
          !userProfile ? (
            <div className="bg-white border-2 border-[#EADFC9] p-8 rounded-2xl text-center max-w-md mx-auto shadow-skeuo-md">
              <p className="text-slate-600 font-medium">Loading your profile badge...</p>
            </div>
          ) : (
            <MyProfileWorkspace 
              userProfile={userProfile} 
              profiles={profiles} 
              setProfiles={setProfiles} 
              categories={categories} 
              setCategories={setCategories} 
              showToast={showToast} 
            />
          )
        )}
        {currentPage === 'admin' && isAdmin && <AdminPanel profiles={profiles} setProfiles={setProfiles} siteSettings={siteSettings} setSiteSettings={setSiteSettings} ytConfig={ytConfig} setYtConfig={setYtConfig} syncYouTubeStats={syncYouTubeStats} userProfile={userProfile} showToast={showToast} />}
      </main>

      {/* --- SIGN IN MODAL WINDOW --- */}
      {showSignInModal && <SignInModal handleProfileSignIn={handleProfileSignIn} setShowSignInModal={setShowSignInModal} categories={categories} profiles={profiles} />}
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
    
    // Low field of view camera to exaggerate the 3D depth and parallax feel
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 11;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Warm atmospheric studio lights
    scene.add(new THREE.AmbientLight(0xfffdf2, 0.5));
    
    // Dynamic Specular Spotlight that follows cursor movement
    const specularSpot = new THREE.SpotLight(0xffedd5, 12, 40, Math.PI / 4, 0.5, 1);
    specularSpot.position.set(0, 0, 8);
    specularSpot.castShadow = true;
    scene.add(specularSpot);

    // Neon Cobalt fill light
    const cobaltPoint = new THREE.PointLight(0x1d4ed8, 2.5, 18);
    cobaltPoint.position.set(-5, -3, 2);
    scene.add(cobaltPoint);

    // Neon Rose rim light
    const rosePoint = new THREE.PointLight(0xf43f5e, 2.5, 18);
    rosePoint.position.set(5, 3, 2);
    scene.add(rosePoint);

    // Main Master Camera Gimbal Assembly Group
    const cameraRigGroup = new THREE.Group();

    // 1. Titanium outer gimbal ring
    const outerRingGeo = new THREE.TorusGeometry(1.9, 0.12, 16, 100);
    const darkTitaniumMat = new THREE.MeshStandardMaterial({ 
      color: 0x2d3748, 
      metalness: 0.95, 
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    const outerRing = new THREE.Mesh(outerRingGeo, darkTitaniumMat);
    cameraRigGroup.add(outerRing);

    // 2. Shiny Chrome inner gimbal ring
    const innerRingGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 100);
    const chromeMat = new THREE.MeshStandardMaterial({ 
      color: 0xe2e8f0, 
      metalness: 1.0, 
      roughness: 0.05 
    });
    const innerRing = new THREE.Mesh(innerRingGeo, chromeMat);
    innerRing.rotation.x = Math.PI / 2;
    cameraRigGroup.add(innerRing);

    // 3. Central Gold Lens Cylinder Barrel
    const lensBarrelGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.5, 32, 1, true);
    const goldMat = new THREE.MeshStandardMaterial({ 
      color: 0xD4AF37, 
      metalness: 0.9, 
      roughness: 0.1,
      clearcoat: 0.8
    });
    const lensBarrel = new THREE.Mesh(lensBarrelGeo, goldMat);
    lensBarrel.rotation.x = Math.PI / 2;
    cameraRigGroup.add(lensBarrel);

    // 4. Refracting Glass Core spherical element
    const glassGeo = new THREE.SphereGeometry(0.75, 32, 32);
    const glassMat = new THREE.MeshPhysicalMaterial({ 
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.65,
      transmission: 0.9,
      ior: 1.5,
      thickness: 1.0
    });
    const glassLens = new THREE.Mesh(glassGeo, glassMat);
    cameraRigGroup.add(glassLens);

    // 5. Aperture Blades assembly
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.55, 0.02);
    const blackAnodizedMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.4 });
    const bladesCount = 8;
    for (let i = 0; i < bladesCount; i++) {
      const blade = new THREE.Mesh(bladeGeo, blackAnodizedMat);
      const angle = (i / bladesCount) * Math.PI * 2;
      blade.position.set(Math.cos(angle) * 1.0, Math.sin(angle) * 1.0, 0);
      blade.rotation.z = angle + Math.PI / 4;
      cameraRigGroup.add(blade);
    }

    cameraRigGroup.position.set(-3.5, 1.5, -2);
    scene.add(cameraRigGroup);

    // Cinematic Film Reels
    const reelGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
    const disk = new THREE.Mesh(diskGeo, darkMetal);
    disk.rotation.x = Math.PI / 2;
    reelGroup.add(disk);

    // Ring details
    const ringGeo = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xC5A03A, metalness: 0.9, roughness: 0.1 });
    const brassRing = new THREE.Mesh(ringGeo, brassMat);
    brassRing.position.set(0, 0, 0.06);
    reelGroup.add(brassRing);

    reelGroup.position.set(4, -1, -2);
    scene.add(reelGroup);

    // Parallax background particle embers
    const pCount = 100;
    const pPositions = new Float32Array(pCount * 3);
    const pSpeeds = [];
    const pGeometry = new THREE.BufferGeometry();

    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 18; 
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 10; 
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 3; 
      pSpeeds.push({
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01
      });
    }

    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMaterial = new THREE.PointsMaterial({
      color: 0xC5A03A,
      size: 0.14,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(pGeometry, pMaterial);
    scene.add(particleSystem);

    let mouseX = 0, mouseY = 0;
    const targetMouse = { x: 0, y: 0 };
    const handleWindowMouseMove = (e) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleWindowMouseMove);

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Extraordinary multi-axis 3D rotation of gimbal rings
      outerRing.rotation.y = elapsed * 0.14;
      outerRing.rotation.x = elapsed * 0.07;
      innerRing.rotation.x = elapsed * 0.22;
      innerRing.rotation.z = elapsed * 0.16;
      lensBarrel.rotation.y = elapsed * 0.28;

      cameraRigGroup.position.y = 1.5 + Math.sin(elapsed * 0.45) * 0.2;

      reelGroup.rotation.z = elapsed * 0.35;
      reelGroup.rotation.y = elapsed * 0.15;
      reelGroup.position.y = -1 + Math.cos(elapsed * 0.5) * 0.15;

      // Smooth camera interpolation based on cursor coordinates
      mouseX += (targetMouse.x - mouseX) * 0.05;
      mouseY += (targetMouse.y - mouseY) * 0.05;

      specularSpot.position.x = 5 + mouseX * 4;
      specularSpot.position.y = 5 + mouseY * 4;

      camera.position.x = mouseX * 0.8;
      camera.position.y = mouseY * 0.8;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);
  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0 opacity-40 animate-fadeIn" />;
}

// --- SIGN IN STEPWISE FORM MODAL ---
function SignInModal({ handleProfileSignIn, setShowSignInModal, categories, profiles }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [cat, setCat] = useState(categories[0] || 'Editing');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0].svg);
  const [uploadedBase64, setUploadedBase64] = useState('');

  const checkEmailOnboard = (e) => {
    e.preventDefault();
    const matched = profiles.find(p => p.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) handleProfileSignIn(matched.name, matched.email, matched.photoURL, matched.workCategory);
    else setStep(2);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedBase64(reader.result);
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn font-sans">
      <div className="w-full max-w-md bg-white border-2 border-[#EADFC9] rounded-[2rem] p-8 shadow-skeuo-lg relative font-sans animate-fadeIn">
        <button onClick={() => setShowSignInModal(false)} className="absolute top-4 right-4 font-bold text-slate-400 hover:text-slate-600 transition">✕</button>
        {step === 1 ? (
          <form onSubmit={checkEmailOnboard} className="space-y-4 font-sans">
            <h3 className="font-serif text-xl font-bold text-center text-slate-800">Crew Member Identity</h3>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter Creator Gmail Address" className="w-full px-4 py-2.5 bg-slate-50 border-2 border-[#EADFC9] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A03A] focus:outline-none transition shadow-inner font-sans" required />
            <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-[#C5A03A] to-[#E3BE5C] hover:from-[#b38e2f] hover:to-[#dcb650] text-white text-xs font-bold uppercase rounded-xl border-b-[5px] border-[#ab892c] active:border-b-[2px] active:translate-y-[3px] shadow transition-all font-sans font-semibold">Next Step</button>
          </form>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleProfileSignIn(name, email, avatar, cat); }} className="space-y-4 font-sans overflow-y-auto max-h-[90vh] pb-4">
            <h3 className="font-serif text-lg font-bold text-slate-800 border-b pb-2">Register New Profile</h3>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name Handle" className="w-full px-3 py-2 border rounded-lg text-xs font-sans animate-fadeIn" required />
            <select value={cat} onChange={e => setCat(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs font-sans animate-fadeIn bg-white">
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
            
            {/* Embedded Avatar Picker */}
            <div className="space-y-2 font-sans animate-fadeIn">
              <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Choose Badge Avatar</label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => { setAvatar(preset.svg); setUploadedBase64(''); }}
                    className={`p-1.5 rounded-xl border-2 transition-all ${avatar === preset.svg && !uploadedBase64 ? 'border-[#C5A03A] bg-amber-50/40 scale-105' : 'border-slate-100 hover:border-slate-200'}`}
                    dangerouslySetInnerHTML={{ __html: preset.svg }}
                  />
                ))}
              </div>
              
              <div className="flex flex-col space-y-1 pt-1 font-sans">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Or upload image file:</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-[11px] text-slate-500" />
              </div>
            </div>

            <button type="submit" className="w-full py-2 bg-gradient-to-r from-[#C5A03A] to-[#E3BE5C] text-white text-xs font-bold uppercase rounded-xl border-b-[5px] border-[#ab892c] active:border-b-[2px] active:translate-y-[3px] font-sans animate-fadeIn font-semibold">Submit Roster Application</button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- HOMEPAGE HUB ---
function CreatorHomeHub({ siteSettings, videos, projects, ytConfig, syncYouTubeStats, notifications, handleNavigation }) {
  return (
    <section className="space-y-10 py-4 animate-fadeIn font-sans">
      <div className="text-center py-4">
        <h1 className="font-serif text-4xl md:text-5xl font-black text-slate-800 uppercase tracking-tight">{siteSettings.logoText}</h1>
        <p className="text-slate-500 font-serif italic text-sm mt-1">Creator timeline commander & segmented asset warehouse.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { 
            label: 'YouTube Subscribers', 
            value: ytConfig.subscribers, 
            icon: '📈', 
            change: '@naitik._.artist-16 channel feed',
            action: (
              <button 
                onClick={() => syncYouTubeStats()} 
                className="text-[9px] bg-[#C5A03A]/10 text-[#C5A03A] font-bold px-2 py-1 rounded border border-[#C5A03A]/20 hover:bg-[#C5A03A]/20 transition mt-2 block font-sans"
              >
                🔄 Fetch Live
              </button>
            )
          },
          { 
            label: 'Latest Video Views', 
            value: ytConfig.latestVideoViews, 
            icon: '📺', 
            change: ytConfig.latestVideoTitle ? `"${ytConfig.latestVideoTitle.substring(0, 32)}..."` : 'Ep 5 Draft track',
            action: null
          },
          { label: 'Vault Records', value: `${videos.length} Masters`, icon: '🎞️', change: 'Chunked HLS Segmented', action: null },
          { label: 'Active Ideas', value: `${projects.length} Boards`, icon: '📌', change: 'Real-time whiteboard', action: null },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white/80 border-b-[5px] border-r border-l border-t border-[#EADFC9] rounded-2xl p-5 shadow-skeuo-md hover:-translate-y-1 hover:shadow-skeuo-3d transition-all flex flex-col justify-between h-40">
            <div>
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider font-sans">{stat.label}</span>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="text-xl md:text-2xl font-black text-slate-800 font-sans">{stat.value}</p>
            </div>
            <div className="mt-2 font-sans">
              <span className="text-[9px] text-[#C5A03A] font-semibold block truncate">{stat.change}</span>
              {stat.action}
            </div>
          </div>
        ))}
      </div>

      {/* Production Logs Section */}
      <div className="bg-white/80 border-b-[6px] border-r border-l border-t border-[#EADFC9] p-6 rounded-3xl shadow-skeuo-md font-sans animate-fadeIn">
        <div className="flex items-center justify-between border-b border-[#EADFC9]/30 pb-3 mb-4 font-serif">
          <h3 className="font-serif text-lg font-bold text-[#C5A03A]">⚡ Production Stream Logs</h3>
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-sans">Live Logs</span>
        </div>
        <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar font-sans pr-1">
          {notifications.map(notif => (
            <div key={notif.id} className="text-[11px] leading-relaxed border-b border-dashed border-slate-100 pb-2 animate-fadeIn">
              <span className="font-bold text-slate-800 font-sans">{notif.actor}: </span>
              <span className="text-slate-600 font-sans">{notif.message}</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{new Date(notif.timestamp).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- CREW DIRECTORY SECTION WITH INLINE MODERATION ---
function CrewSection({ profiles, setProfiles, userProfile, showToast, isAdmin }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const approvedProfiles = useMemo(() => profiles.filter(p => p.status === 'approved'), [profiles]);
  if (approvedProfiles.length === 0) return null;

  return (
    <section className="py-4 animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <div className="lg:col-span-1 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-6 rounded-3xl text-center shadow-skeuo-md animate-fadeIn">
        <div className="w-28 h-28 rounded-full border-4 border-[#C5A03A]/20 mx-auto overflow-hidden p-0.5 mb-3 flex items-center justify-center bg-slate-50 shadow-inner">
          {renderAvatar(approvedProfiles[focusIdx]?.photoURL)}
        </div>
        <h3 className="font-serif text-2xl font-bold text-slate-800">{approvedProfiles[focusIdx]?.name}</h3>
        <p className="text-xs text-slate-400 mt-1 font-sans">{approvedProfiles[focusIdx]?.email}</p>
        <span className="bg-[#C5A03A] text-white text-[10px] px-3 py-1 rounded-full font-bold mt-3 inline-block font-sans shadow-sm">{approvedProfiles[focusIdx]?.role}</span>
      </div>

      <div className="lg:col-span-2 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-6 rounded-3xl shadow-skeuo-md max-h-[500px] overflow-y-auto custom-scrollbar animate-fadeIn">
        <h4 className="font-serif font-bold text-base border-b pb-2 mb-3">Production Team Members</h4>
        <div className="space-y-3 font-sans">
          {profiles.map((p, i) => (
            <div key={i} className="flex justify-between items-center p-3 border rounded-xl hover:border-[#C5A03A]/40 transition bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-white shadow-sm" onClick={() => setFocusIdx(profiles.indexOf(p))}>
                  {renderAvatar(p.photoURL)}
                </div>
                <div className="cursor-pointer" onClick={() => setFocusIdx(profiles.indexOf(p))}>
                  <p className="text-xs font-bold text-slate-800">{p.name}</p>
                  <span className="text-[9px] font-mono text-slate-400">{p.email} • {p.role} • {p.workCategory}</span>
                </div>
              </div>
              {isAdmin && p.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                <div className="flex space-x-1 font-sans">
                  <button onClick={() => setProfiles(prev => prev.filter(x => x.uid !== p.uid))} className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-full transition hover:bg-rose-100 font-sans">Remove</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- TIMELINE CATEGORIES FRAME ---
function CategoriesViewSection({ profiles, categories, setCategories, showToast }) {
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Editing');
  const [newCatInput, setNewCustomCategory] = useState('');

  const handleAddCategory = (e) => {
    e.preventDefault();
    const clean = newCatInput.trim();
    if (!clean) return;

    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      showToast("Category tag already exists.", "warning");
      return;
    }

    setCategories(prev => [...prev, clean]);
    setActiveCategory(clean);
    setNewCustomCategory('');
    showToast(`Category "${clean}" added successfully!`, "success");
  };

  const matchedMembers = useMemo(() => {
    return profiles.filter(p => p.status === 'approved' && p.workCategory === activeCategory);
  }, [profiles, activeCategory]);

  return (
    <section className="py-4 animate-fadeIn space-y-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
        
        {/* Left Side: Create Custom Category & Category Selector List */}
        <div className="lg:col-span-1 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-5 rounded-3xl shadow-skeuo-md space-y-5 animate-fadeIn">
          <div>
            <h4 className="font-serif text-sm font-bold text-slate-800 mb-2">Add Custom Category</h4>
            <form onSubmit={handleAddCategory} className="space-y-2 font-sans font-semibold">
              <input 
                type="text" 
                value={newCatInput}
                onChange={(e) => setNewCustomCategory(e.target.value)}
                placeholder="e.g. 3D Matte Shader"
                className="w-full px-3 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none"
                required
              />
              <button type="submit" className="w-full py-1.5 bg-[#C5A03A] text-white text-[10px] font-bold uppercase rounded-lg border-b-[4px] border-[#ab892c] active:border-b-[2px] active:translate-y-[2px] shadow-sm">
                Add Role Tag
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-[#C5A03A] uppercase tracking-wider block mb-2 font-sans">Role tags</span>
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition ${activeCategory === cat ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                🎥 {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Showcase matching members */}
        <div className="lg:col-span-3 bg-white/70 border-b-[6px] border-r border-l border-t border-[#EADFC9] p-6 rounded-3xl shadow-skeuo-md space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100 font-serif">
            <h3 className="font-serif text-lg font-bold text-slate-800">Specialization: <span className="text-[#C5A03A]">{activeCategory}</span></h3>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-500 font-sans">{matchedMembers.length} Specialists</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans animate-fadeIn">
            {matchedMembers.map((member) => (
              <div key={member.uid} className="flex items-center space-x-3 p-4 border bg-white rounded-xl shadow-sm animate-fadeIn">
                <div className="w-10 h-10 rounded-full border bg-white overflow-hidden p-0.5 flex items-center justify-center animate-fadeIn">
                  {renderAvatar(member.photoURL)}
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-800 font-sans">{member.name}</h5>
                  <p className="text-[10px] text-slate-400 font-sans">{member.email}</p>
                  <span className="inline-block bg-amber-50 text-[#C5A03A] text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 font-sans">{member.role}</span>
                </div>
              </div>
            ))}

            {matchedMembers.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 italic">
                "No crew member is currently assigned to this specialization."
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

// --- VIDEO VAULT SIMULATOR ---
function VideoVault({ videos, setVideos, userProfile, showToast, isAdmin, pushNotification }) {
  const [selectedVid, setSelectedVid] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handlePostVideoComment = (e) => {
    e.preventDefault();
    const commentText = e.target.commentInput.value.trim();
    if (!commentText || !selectedVid) return;

    const newComment = {
      id: 'comment_' + Date.now(),
      authorName: userProfile.name,
      text: commentText,
      timestamp: Date.now()
    };

    setVideos(prev => prev.map(v => {
      if (v.id === selectedVid.id) {
        const updatedComments = [...(v.comments || []), newComment];
        return { ...v, comments: updatedComments };
      }
      return v;
    }));

    setSelectedVid(prev => ({
      ...prev,
      comments: [...(prev.comments || []), newComment]
    }));

    e.target.commentInput.value = '';
    pushNotification(`Commented on video draft "${selectedVid.title}"`, userProfile.name);
    showToast("Feedback comment posted!", "success");
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const startParallelUploader = (e) => {
    e.preventDefault();
    if (!videoTitle.trim()) return;

    const finalVideoUrl = selectedFile 
      ? URL.createObjectURL(selectedFile) 
      : 'https://assets.mixkit.co/videos/preview/mixkit-watercolor-ink-drops-in-water-43313-large.mp4';

    const newVideo = { 
      id: 'v_' + Date.now(), 
      title: videoTitle, 
      uploaderUid: userProfile.uid, 
      uploaderName: userProfile.name, 
      hlsUrl: finalVideoUrl, 
      size: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '15 GB (HLS Track)',
      comments: [] 
    };

    setVideos(prev => [newVideo, ...prev]);
    pushNotification(`Uploaded real raw video asset: "${videoTitle}"`, userProfile.name);
    setVideoTitle('');
    setSelectedFile(null);
    setShowUploadModal(false);
    showToast("Video draft successfully processed & loaded!", "success");
  };

  return (
    <section className="py-4 space-y-4 font-sans animate-fadeIn">
      <div className="flex justify-between items-center bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md font-sans animate-fadeIn">
        <div>
          <h3 className="font-serif font-bold text-slate-800 text-lg">Timeline Asset Vault</h3>
          <p className="text-xs text-slate-400 font-sans">Collaborate with live chunk uploads & segment comments</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow hover:bg-red-700 transition font-sans font-semibold">+ Upload Track</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Left main view (Active Video Detail & Comments) */}
        <div className="lg:col-span-2 space-y-4 animate-fadeIn font-sans">
          {selectedVid ? (
            <div className="space-y-4 animate-fadeIn font-sans">
              <div className="bg-[#1b1915] rounded-2xl overflow-hidden relative border-4 border-white shadow-skeuo-md">
                <video key={selectedVid.id} src={selectedVid.hlsUrl} className="w-full h-64 md:h-80 object-cover animate-fadeIn" controls autoPlay />
              </div>
              
              <div className="p-4 bg-white border-b-[4px] border-[#EADFC9] rounded-xl shadow-sm">
                <h4 className="font-serif font-bold text-slate-800 text-base">{selectedVid.title}</h4>
                <p className="text-xs text-slate-400 font-sans">Uploaded by {selectedVid.uploaderName} • {selectedVid.size}</p>
              </div>

              {/* VIDEO FEEDBACK & COMMENTS MODULE */}
              <div className="bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl shadow-skeuo-md space-y-4 font-sans animate-fadeIn">
                <h4 className="font-serif font-bold text-slate-800 text-sm border-b pb-2">Crew Feedback ({selectedVid.comments?.length || 0})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {(selectedVid.comments || []).map(comment => (
                    <div key={comment.id} className="text-xs p-3 bg-slate-50 rounded-xl border flex justify-between items-start animate-fadeIn">
                      <div>
                        <span className="font-bold text-slate-800 mr-2">{comment.authorName}</span>
                        <span className="text-slate-600">{comment.text}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {(!selectedVid.comments || selectedVid.comments.length === 0) && (
                    <p className="text-xs text-slate-400 italic py-2">No feedback notes posted yet. Start the conversation below!</p>
                  )}
                </div>
                
                <form onSubmit={handlePostVideoComment} className="flex gap-2 pt-1.5 border-t">
                  <input 
                    type="text" 
                    name="commentInput" 
                    placeholder="Scribble video feedback (e.g. frame timing at 0:15 is a bit long)..." 
                    className="flex-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none" 
                    required 
                  />
                  <button type="submit" className="bg-[#C5A03A] text-white text-xs px-4 py-2 rounded-xl font-bold font-sans transition hover:bg-[#b08d32]">Post</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white/60 border-2 border-dashed border-[#EADFC9] p-16 text-center rounded-2xl text-slate-400 font-sans shadow-inner">Select any video draft below to open timeline player & comments feed.</div>
          )}
        </div>

        {/* Right side Playlist Grid */}
        <div className="lg:col-span-1 space-y-4 font-sans animate-fadeIn">
          <h4 className="font-serif font-bold text-sm text-slate-700">Video Draft Playlist ({videos.length})</h4>
          <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {videos.map((v, i) => (
              <div key={i} className={`bg-white border-b-[4px] border-[#EADFC9] border-r border-l border-t p-3 rounded-xl hover:-translate-y-1 hover:shadow-skeuo-sm transition-all flex justify-between items-center animate-fadeIn ${selectedVid?.id === v.id ? 'border-[#C5A03A] bg-amber-50/20' : ''}`}>
                <div onClick={() => setSelectedVid(v)} className="cursor-pointer flex-1 min-w-0 pr-2">
                  <h5 className="font-bold text-xs text-slate-800 truncate">{v.title}</h5>
                  <span className="text-[10px] text-slate-400 font-sans">Uploaded by {v.uploaderName} • {v.comments?.length || 0} Comments</span>
                </div>
                {(isAdmin || v.uploaderUid === userProfile?.uid) && (
                  <button onClick={() => setVideos(prev => prev.filter(x => x.id !== v.id))} className="text-rose-550 font-bold p-1 hover:text-rose-700 transition" title="Delete Video">🗑️</button>
                )}
              </div>
            ))}

            {videos.length === 0 && (
              <p className="text-xs text-slate-400 italic py-6 text-center">No video track segments uploaded yet.</p>
            )}
          </div>
        </div>

      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={startParallelUploader} className="bg-white border-2 border-[#EADFC9] p-6 rounded-2xl w-full max-w-sm space-y-4 font-sans shadow-skeuo-lg animate-fadeIn">
            <h4 className="font-serif font-bold text-slate-800">Upload Real Video File</h4>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Video Title</label>
              <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="e.g. My Watercolor Vlog" className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs mt-1 font-sans" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Select File</label>
              <input type="file" accept="video/*" onChange={handleVideoFileChange} className="w-full text-xs text-slate-500 mt-1 font-sans" required />
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl border-b-[4px] border-red-800 active:border-b-[1px] active:translate-y-[3px] hover:bg-red-700 transition">Ingest Video</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// --- PROJECT SPREADSHEET CORKBOARD COMPONENT ---
function ProjectBoard({ projects, setProjects, tasks, setTasks, profiles, userProfile, showToast, selectedProject, setSelectedProject, setCurrentPage, setChatChannel, pushNotification }) {
  const [newConcept, setNewConcept] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  const createConcept = (e) => {
    e.preventDefault();
    if (!newConcept.trim()) return;
    const newProj = { id: 'p_' + Date.now(), title: newConcept, creatorName: userProfile.name, createdAt: Date.now() };
    setProjects(prev => [newProj, ...prev]);
    pushNotification(`Created video concept whiteboard: "${newConcept}"`, userProfile.name);
    setNewConcept('');
    showToast("Artboard concept mapped!", "success");
  };

  const activeTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProject?.id), [tasks, selectedProject]);

  return (
    <section className="py-4 animate-fadeIn font-sans">
      {!selectedProject ? (
        <div className="space-y-4 font-sans">
          <form onSubmit={createConcept} className="max-w-md mx-auto flex gap-2 bg-white border border-[#EADFC9] p-4 rounded-xl shadow-skeuo-sm">
            <input type="text" value={newConcept} onChange={e => setNewConcept(e.target.value)} placeholder="New video conceptual sprint..." className="flex-1 px-3 py-1.5 bg-slate-50 border rounded-lg text-xs focus:ring-1 focus:ring-[#C5A03A]" required />
            <button type="submit" className="px-4 bg-[#C5A03A] text-white text-xs rounded-lg font-bold border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] shadow">Pin Board</button>
          </form>

          {/* Heavy 3D Wood Carved Framed Corkboard */}
          <div 
            className="p-8 border-[12px] border-[#8b5a2b]/25 shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)] rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn"
            style={{ 
              backgroundColor: '#deb887',
              backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {projects.map((p, idx) => (
              <div key={idx} onClick={() => setSelectedProject(p)} className="bg-white border-b-[5px] border-r border-l border-t border-[#EADFC9] p-5 rounded-2xl cursor-pointer shadow-skeuo-md hover:-translate-y-1 hover:shadow-skeuo-3d transition-all relative">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-2xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)] animate-bounce">📌</span>
                <h4 className="font-serif font-bold text-slate-800 pt-3 text-center line-clamp-2">{p.title}</h4>
              </div>
            ))}

            {projects.length === 0 && (
              <p className="text-center text-slate-700 italic col-span-full py-12">Roster Corkboard is currently pristine. Pin down a concept to start!</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-white border-b-[6px] border-r border-l border-t border-[#EADFC9] p-6 rounded-3xl shadow-skeuo-md animate-fadeIn font-sans">
          <button onClick={() => setSelectedProject(null)} className="text-xs font-bold text-[#C5A03A] hover:underline transition">◀ Back to Cork Board</button>
          <h3 className="font-serif text-2xl font-bold text-slate-800">{selectedProject.title}</h3>
          
          <div className="divide-y text-xs">
            {activeTasks.map((t, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center">
                <span className="font-semibold text-slate-700">{t.title}</span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-inner ${t.status === 'To Do' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>{t.status}</span>
              </div>
            ))}
          </div>

          <form onSubmit={e => { e.preventDefault(); if (!taskTitle.trim()) return; setTasks(prev => [...prev, { id: 't_'+Date.now(), projectId: selectedProject.id, title: taskTitle, status: 'To Do' }]); setTaskTitle(''); }} className="flex gap-2 max-w-sm pt-4">
            <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Add specific sprint work card" className="flex-1 px-3 py-1 bg-slate-50 border rounded-lg text-xs" required />
            <button type="submit" className="px-3 bg-slate-800 text-white text-xs rounded-lg font-bold">Add</button>
          </form>
        </div>
      )}
    </section>
  );
}

// --- CHATROOM PANEL ---
function WhiteboardChat({ chats, setChats, projects, userProfile, chatChannel, setChatChannel }) {
  const [inputText, setInputText] = useState('');
  
  const commit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setChats(prev => [...prev, { 
      id: Date.now(), 
      projectId: chatChannel, 
      text: inputText, 
      senderName: userProfile?.name || 'Guest Creator', 
      senderUid: userProfile?.uid || 'guest-uid' 
    }]);
    setInputText('');
  };

  return (
    <section className="grid grid-cols-4 border-2 border-[#EADFC9] rounded-[2rem] h-[400px] bg-white overflow-hidden shadow-skeuo-md animate-fadeIn font-sans">
      <div className="col-span-1 bg-[#FFFDF9] p-3 space-y-2 border-r text-xs border-[#EADFC9]/50">
        <button onClick={() => setChatChannel('general')} className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition ${chatChannel === 'general' ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : ''}`}>🌍 Studio Room</button>
      </div>
      <div className="col-span-3 flex flex-col h-full justify-between bg-slate-50/20 font-sans">
        <div className="p-4 overflow-y-auto space-y-2 custom-scrollbar flex-1 font-sans">
          {chats.filter(c => c.projectId === chatChannel).map((m, i) => (
            <div key={i} className="text-xs p-3 bg-white border border-[#EADFC9]/40 rounded-2xl max-w-[70%] animate-fadeIn shadow-xs font-sans">
              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{m.senderName}</span>
              {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={commit} className="p-3 border-t flex gap-2 bg-white font-sans animate-fadeIn">
          <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type studio track commentary..." className="flex-1 px-3 border rounded-xl text-xs focus:outline-none" />
          <button type="submit" className="px-4 py-2 bg-[#C5A03A] text-white text-xs rounded-xl font-bold border-b-[4px] border-[#ab892c]">Send</button>
        </form>
      </div>
    </section>
  );
}

// --- INSTAGRAM SHOWCASE WORK FEED COMPONENT ---
function PostsWorkspace({ posts, setPosts, userProfile, showToast, pushNotification }) {
  const [postTitle, setPostTitle] = useState('');
  const [postImageBase64, setPostImageBase64] = useState('');
  const [postText, setPostText] = useState('');
  const [showCreateModal, setShowCreatePostModal] = useState(false);

  const handlePostPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const publishPost = (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postImageBase64) {
      showToast("Please provide title and visual asset proof.", "warning");
      return;
    }

    const newPost = {
      id: 'post_' + Date.now(),
      title: postTitle.trim(),
      description: postText.trim(),
      image: postImageBase64,
      authorName: userProfile.name,
      authorAvatar: userProfile.photoURL,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: Date.now()
    };

    setPosts(prev => [newPost, ...prev]);
    pushNotification(`Published a showroom draft proof: "${postTitle}"`, userProfile.name);
    setPostTitle('');
    setPostText('');
    setPostImageBase64('');
    setShowCreatePostModal(false);
    showToast("Showcase published to Insta Feed!", "success");
  };

  const toggleLikePost = (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const hasLiked = p.likedBy?.includes(userProfile.uid);
        const newLikedBy = hasLiked 
          ? p.likedBy.filter(u => u !== userProfile.uid)
          : [...(p.likedBy || []), userProfile.uid];
        return {
          ...p,
          likes: newLikedBy.length,
          likedBy: newLikedBy
        };
      }
      return p;
    }));
  };

  const handleAddPostComment = (e, postId) => {
    e.preventDefault();
    const commentVal = e.target.commentInputText.value.trim();
    if (!commentVal) return;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...(post.comments || []), {
            id: 'postcomment_' + Date.now(),
            authorName: userProfile.name,
            text: commentVal
          }]
        };
      }
      return post;
    }));

    e.target.commentInputText.value = '';
    showToast("Comment published!", "success");
  };

  return (
    <section className="py-4 animate-fadeIn space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-[#EADFC9]/50 p-5 rounded-2xl shadow-sm gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">📸 Insta Showroom Feed</h2>
          <p className="text-xs text-slate-400">Publish video thumbnails, design drafts, and timeline assets</p>
        </div>

        <button 
          onClick={() => setShowCreatePostModal(true)}
          className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold text-xs px-5 py-2.5 rounded-full border-b-[4px] border-amber-700 active:border-b-[1px] active:translate-y-[3px] shadow transition-all font-sans"
        >
          <span>➕</span>
          <span>Create Post</span>
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-8 animate-fadeIn">
        {posts.map(post => {
          const amLiked = post.likedBy?.includes(userProfile?.uid);
          return (
            <div key={post.id} className="bg-white border-2 border-[#EADFC9] rounded-[2rem] overflow-hidden shadow-skeuo-md animate-fadeIn">
              
              {/* Instagram Card Header */}
              <div className="p-3.5 flex items-center space-x-3 border-b border-slate-50">
                <div className="w-8 h-8 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-slate-50 animate-fadeIn">
                  {renderAvatar(post.authorAvatar)}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">{post.authorName}</h4>
                  <span className="text-[9px] text-slate-400 font-mono">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Card Main Image */}
              <div className="w-full h-80 overflow-hidden bg-slate-100 relative">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover animate-fadeIn" />
              </div>

              {/* Action Ribbon & Comment Module */}
              <div className="p-3.5 space-y-2 border-t border-slate-50 font-sans">
                <div className="flex items-center justify-between font-sans">
                  <div className="flex items-center space-x-3 font-sans">
                    <button 
                      onClick={() => toggleLikePost(post.id)}
                      className="text-xl transition-transform active:scale-150"
                    >
                      {amLiked ? '❤️' : '🤍'}
                    </button>
                    <span className="text-xs font-bold text-slate-800">{post.likes || 0} likes</span>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="font-bold text-slate-800 mr-2">{post.authorName}</span>
                  <span className="font-semibold text-slate-700">{post.title}</span>
                  {post.description && <p className="text-slate-500 mt-1 leading-relaxed font-sans">{post.description}</p>}
                </div>

                {/* SHOWCASE POST COMMENTS */}
                <div className="pt-2 border-t border-[#EADFC9]/20 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {(post.comments || []).map((c, i) => (
                    <div key={i} className="text-[11px] leading-normal animate-fadeIn font-sans">
                      <span className="font-bold text-slate-800 mr-1.5">{c.authorName}</span>
                      <span className="text-slate-600">{c.text}</span>
                    </div>
                  ))}
                  {(!post.comments || post.comments.length === 0) && (
                    <p className="text-[10px] text-slate-400 italic font-sans">No comments published yet.</p>
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={(e) => handleAddPostComment(e, post.id)} className="pt-2 border-t border-[#EADFC9]/20 flex gap-2 font-sans">
                  <input 
                    name="commentInputText"
                    type="text" 
                    placeholder="Add comment..." 
                    className="flex-1 text-[11px] px-3 py-1.5 bg-slate-50 border rounded-lg focus:outline-none"
                    required
                  />
                  <button type="submit" className="text-[10px] font-bold text-[#C5A03A] font-sans">Post</button>
                </form>
              </div>

            </div>
          );
        })}

        {posts.length === 0 && (
          <div className="py-24 text-center text-slate-400 font-handwritten text-xl bg-white/50 border-2 border-dashed rounded-2xl p-8 animate-fadeIn">
            "No showroom posts loaded yet. Publish your completed B-rolls, thumbnails, or scripts above!"
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md animate-fadeIn bg-white border border-[#EADFC9] rounded-[2.5rem] p-6 shadow-2xl relative">
            <button onClick={() => setShowCreatePostModal(false)} className="absolute top-4 right-4 font-bold text-slate-400">✕</button>
            <h3 className="font-serif text-lg font-bold border-b pb-2 mb-4 font-serif">Create Roster Post</h3>
            <form onSubmit={publishPost} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase font-semibold">Post Title</label>
                <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="e.g. Episode Thumbnail Cut 1" className="w-full px-3 py-2 border rounded-xl mt-1 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase font-semibold">Context details</label>
                <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Scribble context details..." className="w-full px-3 py-2 border rounded-xl mt-1 focus:outline-none" rows="2" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase font-semibold">Screenshot upload</label>
                <input type="file" accept="image/*" onChange={handlePostPhotoUpload} className="w-full text-xs text-slate-500 mt-2 font-sans" required />
              </div>
              <button type="submit" className="w-full py-2 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] text-white text-xs font-bold uppercase rounded-xl font-sans">Share Post</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

// --- MY PROFILE SETTINGS WORKSPACE ---
function MyProfileWorkspace({ userProfile, profiles, setProfiles, categories, setCategories, showToast }) {
  const [fullName, setFullName] = useState(userProfile?.name || '');
  const [selectedCat, setSelectedCat] = useState(userProfile?.workCategory || categories[0] || 'Editing');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(userProfile?.photoURL || '');
  const [newCatInp, setNewCatInp] = useState('');

  // Keep internal component state synced when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name || '');
      setSelectedCat(userProfile.workCategory || categories[0] || 'Editing');
      setUploadedPhotoUrl(userProfile.photoURL || '');
    }
  }, [userProfile, categories]);

  const triggerPfpUpdate = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhotoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfileSettings = (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const updatedProfile = {
      ...userProfile,
      name: fullName.trim(),
      workCategory: selectedCat,
      photoURL: uploadedPhotoUrl
    };

    setProfiles(prev => prev.map(p => p.uid === userProfile.uid ? updatedProfile : p));
    showToast("Your profile updates saved successfully!", "success");
  };

  const handleRegisterCategory = (e) => {
    e.preventDefault();
    const refined = newCatInp.trim();
    if (!refined) return;

    if (categories.some(c => c.toLowerCase() === refined.toLowerCase())) {
      showToast("Category tag already exists.", "warning");
      return;
    }

    setCategories(prev => [...prev, refined]);
    setSelectedCat(refined);
    setNewCatInp('');
    showToast("Category registered!", "success");
  };

  return (
    <section className="max-w-2xl mx-auto bg-white border border-[#EADFC9] rounded-[2.5rem] p-8 shadow-lg relative animate-fadeIn font-sans">
      <WatercolorOverlay />
      
      <div className="text-center mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C5A03A]">My Badge Profile</span>
        <h2 className="font-serif text-3xl font-bold text-slate-800">Configure Profile Details</h2>
      </div>

      <div className="flex flex-col items-center mb-6 font-sans">
        <div className="w-24 h-24 rounded-full border-4 border-[#C5A03A]/20 bg-white overflow-hidden shadow-md flex items-center justify-center mb-2 font-sans">
          {renderAvatar(uploadedPhotoUrl, "w-full h-full object-cover rounded-full")}
        </div>
        <p className="text-xs text-slate-400 font-sans">Live PFP Preview</p>
      </div>

      <form onSubmit={saveProfileSettings} className="space-y-4 font-sans animate-fadeIn">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Display Name</label>
          <input 
            type="text" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A] focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Specialization Category</label>
            <select 
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:ring-1 focus:ring-[#C5A03A]"
            >
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Upload New PFP (Image file)</label>
            <input 
              type="file"
              accept="image/*"
              onChange={triggerPfpUpdate}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-amber-50 file:text-amber-700"
            />
          </div>
        </div>

        <button type="submit" className="w-full py-3 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] text-white text-xs font-serif font-bold uppercase rounded-xl tracking-wider hover:bg-[#ae8b30] shadow transition">
          Save Profile Details
        </button>
      </form>

      {/* Inline Section to write your own category */}
      <div className="border-t border-[#EADFC9]/50 mt-6 pt-6 font-sans">
        <h4 className="font-serif text-sm font-bold text-slate-800 mb-2">Create & Register Custom Category tag</h4>
        <form onSubmit={handleRegisterCategory} className="flex gap-2 font-sans font-semibold">
          <input 
            type="text" 
            value={newCatInp}
            onChange={(e) => setNewCatInp(e.target.value)}
            placeholder="e.g. 3D Animation Specialist"
            className="flex-1 px-4 py-2 bg-slate-50 border border-[#EADFC9] rounded-xl text-xs focus:outline-none"
            required
          />
          <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-xs rounded-xl font-bold font-sans">
            Add Role Tag
          </button>
        </form>
      </div>

    </section>
  );
}

// --- DEDICATED ADMIN CONTROL HUB PANEL ---
function AdminPanel({ profiles, setProfiles, siteSettings, setSiteSettings, ytConfig, setYtConfig, syncYouTubeStats, userProfile, showToast }) {
  const [logoTxt, setLogoTxt] = useState(siteSettings.logoText);
  const [logoUrlInput, setLogoUrlInput] = useState(siteSettings.logoUrl || '');
  const [channelIdInput, setChannelIdInput] = useState(ytConfig.channelId || '');
  const [apiKeyInput, setApiKeyInput] = useState(ytConfig.apiKey || '');
  
  // Custom states for editing other user details
  const [editingUserId, setEditingUserId] = useState(null);
  const [editedPhoto, setEditedPhoto] = useState('');

  const handleYtSave = (e) => {
    e.preventDefault();
    setYtConfig(prev => ({
      ...prev,
      channelId: channelIdInput,
      apiKey: apiKeyInput
    }));
    showToast("YouTube Sync Engine configurations saved!", "success");
    syncYouTubeStats(channelIdInput, apiKeyInput);
  };

  const handleAdminPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveMemberPhotoOverride = (userId) => {
    if (!editedPhoto) return;
    setProfiles(prev => prev.map(p => p.uid === userId ? { ...p, photoURL: editedPhoto } : p));
    setEditingUserId(null);
    setEditedPhoto('');
    showToast("Crew member's profile picture modified successfully!", "success");
  };

  const triggerSiteLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrlInput(reader.result);
        setSiteSettings(prev => ({ ...prev, logoUrl: reader.result }));
        showToast("Dynamic Custom Logo Uploaded successfully!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn font-sans">
      
      {/* Branding and YouTube API Setup */}
      <div className="col-span-1 space-y-6">
        
        {/* Branding Configuration */}
        <div className="bg-white border-2 border-[#EADFC9] p-5 rounded-[2rem] shadow-skeuo-md space-y-4 font-sans animate-fadeIn">
          <h3 className="font-serif font-bold border-b pb-2 mb-3 text-slate-800">Studio Branding</h3>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase">Logo Brand Text</label>
            <input type="text" value={logoTxt} onChange={(e) => setLogoTxt(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase font-sans">Logo Image (PFP Style)</label>
            <input type="file" accept="image/*" onChange={triggerSiteLogoUpload} className="w-full text-xs text-slate-500 mt-1 file:py-1 file:px-2" />
          </div>

          <button onClick={() => setSiteSettings(p => ({ ...p, logoText: logoTxt }))} className="w-full py-2 bg-[#C5A03A] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] text-white text-xs rounded-lg font-bold font-sans">Save Label</button>
        </div>

        {/* Live YouTube Sync settings */}
        <div className="bg-white border-2 border-[#EADFC9] p-5 rounded-[2rem] shadow-skeuo-md font-sans">
          <h3 className="font-serif font-bold border-b pb-2 mb-2 text-slate-800">YouTube Auto-Sync Setup</h3>
          <p className="text-[10px] text-slate-400 mb-3 font-sans">Supply credentials to sync live subscribers & views instantly.</p>
          
          <form onSubmit={handleYtSave} className="space-y-3 font-sans">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase font-semibold">YouTube Channel ID / Handle</label>
              <input 
                type="text" 
                value={channelIdInput} 
                onChange={(e) => setChannelIdInput(e.target.value)}
                placeholder="e.g. @naitik._.artist-16" 
                className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1 font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase font-semibold">YouTube API v3 Key</label>
              <input 
                type="password" 
                value={apiKeyInput} 
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..." 
                className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1 font-sans"
              />
            </div>

            <button type="submit" className="w-full py-2 bg-gradient-to-r from-[#C5A03A] to-[#E3BE5C] border-b-[4px] border-[#ab892c] active:border-b-[1px] active:translate-y-[3px] text-white text-xs font-bold rounded-lg font-sans">
              Save & Synchronize Channel
            </button>
          </form>
        </div>

      </div>

      <div className="col-span-2 bg-white border-2 border-[#EADFC9] p-5 rounded-[2rem] shadow-skeuo-md font-sans">
        <h3 className="font-serif font-bold border-b pb-2 mb-3 text-slate-800">Roster Control & Applicants</h3>
        <table className="w-full text-xs text-left font-sans">
          <thead>
            <tr className="text-slate-400 font-sans font-semibold">
              <th className="pb-2">Crew Profile</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
              const isEditing = editingUserId === p.uid;
              return (
                <tr key={p.uid} className="border-t font-sans animate-fadeIn">
                  <td className="py-2.5 font-bold">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden border p-0.5 flex items-center justify-center bg-slate-50">
                        {renderAvatar(p.photoURL)}
                      </div>
                      <div className="flex flex-col font-sans">
                        <span>{p.name}</span>
                        <span className="text-[9px] text-slate-400 font-normal">{p.email}</span>
                      </div>
                    </div>
                    
                    {/* Admin Override Photo Picker Slot */}
                    {isEditing && (
                      <div className="mt-2 p-2 bg-slate-50 border rounded-lg space-y-2 animate-fadeIn font-sans">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block font-sans">Admin Photo Override</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAdminPhotoUpload} 
                          className="text-[9px] font-sans"
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => setEditingUserId(null)} className="text-[9px] bg-slate-200 px-2 py-0.5 rounded font-sans">Cancel</button>
                          <button onClick={() => saveMemberPhotoOverride(p.uid)} className="text-[9px] bg-[#C5A03A] text-white px-2 py-0.5 rounded font-bold font-sans">Save PFP</button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 uppercase font-mono text-[10px] font-semibold">{p.status} • {p.role}</td>
                  <td className="py-2.5 text-right space-x-1.5 font-sans">
                    {p.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ? (
                      <div className="flex items-center justify-end gap-1 flex-wrap font-sans">
                        <button onClick={() => setEditingUserId(p.uid)} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold hover:bg-blue-100">Edit PFP</button>
                        <button onClick={() => setProfiles(prev => prev.map(x => x.uid === p.uid ? { ...x, status: 'approved' } : x))} className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold hover:bg-emerald-100 font-sans">Approve</button>
                        <button onClick={() => setProfiles(prev => prev.map(x => x.uid === p.uid ? { ...x, role: 'admin' } : x))} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold hover:bg-amber-100 font-sans">Promote</button>
                        <button onClick={() => setProfiles(prev => prev.filter(x => x.uid !== p.uid))} className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-bold hover:bg-rose-100 font-sans">Remove</button>
                      </div>
                    ) : <span className="text-slate-400 italic">Owner</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// --- ACCESS EXITS ---
function PendingScreen({ userProfile }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center p-4">
      <div className="bg-white border-2 border-[#EADFC9] p-6 rounded-2xl max-w-sm shadow-skeuo-md animate-fadeIn font-sans">
        <h3 className="font-serif font-bold text-xl mb-2"> Roster Waiting Room</h3>
        <p className="text-xs text-slate-500 mb-4 font-sans">Hello {userProfile?.name}! Your account request has been routed to the pending list for review.</p>
      </div>
    </div>
  );
}

function RejectedScreen({ userProfile }) {
  return <div className="text-center py-20 font-sans font-bold text-rose-500">Access Restricted. Contact Owner direct link.</div>;
}
