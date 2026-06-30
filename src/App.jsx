import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDoI1RdcZnYQx7oGymHsbOPU",
  authDomain: "rs-studio-c152d.firebaseapp.com",
  databaseURL: "https://rs-studio-c152d.firebaseio.com",
  projectId: "rs-studio-c152d",
  storageBucket: "rs-studio-c152d.firebasestorage.app",
  messagingSenderId: "319185394502",
  appId: "1:319185394502:web:e8bd4c6ab196f486c06347",
  measurementId: "G-JDXL0SLNND"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'youtubers-studio';

// --- INJECT CUSTOM TAILWIND TAILORED STYLES ---
const injectArtStyleStyles = () => {
  if (document.getElementById('studio-aurum-styles')) return;
  const styleBlock = document.createElement('style');
  styleBlock.id = 'studio-aurum-styles';
  styleBlock.innerHTML = `
    .font-serif { font-family: 'Playfair Display', Georgia, serif; }
    .font-sans { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    .font-handwritten { font-family: 'Caveat', cursive, sans-serif; }
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

const PRESET_AVATARS = [
  { id: 'coral-brush', name: 'Coral Splash', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#f43f5e" opacity="0.15"/><path d="M30,70 Q50,30 70,30 Q80,50 60,70 Z" fill="#f43f5e"/><circle cx="60" cy="45" r="5" fill="#C5A03A"/></svg>` },
  { id: 'cobalt-wave', name: 'Cobalt Swirl', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#1D4ED8" opacity="0.15"/><path d="M25,50 Q45,20 65,45 T85,50" fill="none" stroke="#1D4ED8" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="35" r="6" fill="#1D4ED8"/></svg>` },
  { id: 'gold-palette', name: 'Golden Drop', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#C5A03A" opacity="0.15"/><path d="M30,40 A20,20 0 0,0 70,60 A20,20 0 0,0 30,40" fill="#C5A03A"/><circle cx="45" cy="48" r="3" fill="#ffffff"/></svg>` },
  { id: 'emerald-leaf', name: 'Mint Stroke', svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#10B981" opacity="0.15"/><path d="M35,35 Q50,70 65,35" fill="none" stroke="#10B981" stroke-width="10" stroke-linecap="round"/></svg>` },
];

const ADMIN_EMAIL = "Naitiksaxena06@gmail.com";

const renderAvatar = (photoURL, className = "w-full h-full object-cover") => {
  if (!photoURL || typeof photoURL !== 'string') return <div className="bg-slate-200 w-full h-full flex items-center justify-center font-bold text-slate-400 font-sans">?</div>;
  if (photoURL.startsWith('<svg') || photoURL.includes('<circle') || photoURL.includes('<path')) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: photoURL }} />;
  }
  return <img src={photoURL} alt="Crew Avatar" className={className} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60"; }} />;
};

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
  const [firebaseUser, setFirebaseUser] = useState(null);

  const [currentPage, setCurrentPage] = useState('home'); 
  const [loggedInEmail, setLoggedInEmail] = useState(() => localStorage.getItem('sa_logged_in_user_email') || '');
  const [siteSettings, setSiteSettings] = useState({ logoText: 'YOUTUBERS STUDIO', logoUrl: '' });
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync state properties
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
  const [profiles, setProfilesState] = useState([]);
  const [projects, setProjectsState] = useState([]);
  const [tasks, setTasksState] = useState([]);
  const [chats, setChatsState] = useState([]);
  const [videos, setVideosState] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [chatChannel, setChatChannel] = useState('general');
  const [customToast, setCustomToast] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth init error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // Real-time Listeners
  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribes = [];

    unsubscribes.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'profiles'), (snapshot) => {
      const cloudProfiles = [];
      snapshot.forEach((doc) => { cloudProfiles.push({ uid: doc.id, ...doc.data() }); });
      setProfilesState(cloudProfiles);
    }));

    unsubscribes.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), (snapshot) => {
      const cloudProjects = [];
      snapshot.forEach((doc) => { cloudProjects.push({ id: doc.id, ...doc.data() }); });
      setProjectsState(cloudProjects);
    }));

    unsubscribes.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), (snapshot) => {
      const cloudTasks = [];
      snapshot.forEach((doc) => { cloudTasks.push({ id: doc.id, ...doc.data() }); });
      setTasksState(cloudTasks);
    }));

    unsubscribes.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'chats'), (snapshot) => {
      const cloudChats = [];
      snapshot.forEach((doc) => { cloudChats.push({ id: doc.id, ...doc.data() }); });
      cloudChats.sort((a, b) => b.timestamp - a.timestamp);
      setChatsState(cloudChats);
    }));

    unsubscribes.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'videos'), (snapshot) => {
      const cloudVideos = [];
      snapshot.forEach((doc) => { cloudVideos.push({ id: doc.id, ...doc.data() }); });
      setVideosState(cloudVideos);
    }));

    unsubscribes.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (snapshot) => {
      const cloudPosts = [];
      snapshot.forEach((doc) => { cloudPosts.push({ id: doc.id, ...doc.data() }); });
      setPostsState(cloudPosts);
    }));

    unsubscribes.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), (snapshot) => {
      const cloudNotifs = [];
      snapshot.forEach((doc) => { cloudNotifs.push({ id: doc.id, ...doc.data() }); });
      cloudNotifs.sort((a, b) => b.timestamp - a.timestamp);
      setNotificationsState(cloudNotifs.length > 0 ? cloudNotifs : [
        { id: 'init-notif', message: 'Studio Command Center initialized.', actor: 'System', timestamp: Date.now() - 500000 }
      ]);
    }));

    unsubscribes.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().list) setCategoriesState(docSnap.data().list);
    }));

    unsubscribes.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ytConfig'), (docSnap) => {
      if (docSnap.exists()) setYtConfigState(docSnap.data());
    }));

    unsubscribes.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'siteSettings'), (docSnap) => {
      if (docSnap.exists()) setSiteSettings(docSnap.data());
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [firebaseUser]);

  // Firestore Writers
  const handleCreateConcept = async (title) => {
    if (!firebaseUser) return;
    const id = 'p_' + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id), {
      title,
      creatorName: userProfile?.name || 'Creator',
      createdAt: Date.now()
    });
    pushNotification(`Created video concept whiteboard: "${title}"`, userProfile?.name);
  };

  const handleAddTask = async (projectId, title) => {
    if (!firebaseUser) return;
    const id = 't_' + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id), { projectId, title, status: 'To Do' });
  };

  const handleToggleTaskStatus = async (task) => {
    if (!firebaseUser) return;
    const nextStatus = task.status === 'To Do' ? 'Completed' : 'To Do';
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { ...task, status: nextStatus });
  };

  const handleAddChat = async (text, channel) => {
    if (!firebaseUser) return;
    const id = 'c_' + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'chats', id), {
      projectId: channel,
      text,
      senderName: userProfile?.name || loggedInEmail.split('@')[0],
      senderUid: firebaseUser.uid,
      timestamp: Date.now()
    });
  };

  const handleAddVideo = async (title, url, size) => {
    if (!firebaseUser) return;
    const id = 'v_' + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', id), {
      title,
      uploaderUid: firebaseUser.uid,
      uploaderName: userProfile?.name || 'Creator',
      hlsUrl: url,
      size: size || '15 MB',
      comments: []
    });
  };

  const handleAddVideoComment = async (video, text) => {
    if (!firebaseUser) return;
    const newComment = {
      id: 'comment_' + Date.now(),
      authorName: userProfile?.name || 'Creator',
      text,
      timestamp: Date.now()
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', video.id), {
      ...video,
      comments: [...(video.comments || []), newComment]
    });
  };

  const handleDeleteVideo = async (id) => {
    if (!firebaseUser) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', id));
  };

  const handleAddPost = async (title, description, imageBase64) => {
    if (!firebaseUser) return;
    const id = 'post_' + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', id), {
      title,
      description,
      image: imageBase64,
      authorName: userProfile?.name || 'Creator',
      authorAvatar: userProfile?.photoURL || '',
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: Date.now()
    });
  };

  const handleLikePost = async (post) => {
    if (!firebaseUser) return;
    const hasLiked = post.likedBy?.includes(firebaseUser.uid);
    const newLikedBy = hasLiked 
      ? post.likedBy.filter(uid => uid !== firebaseUser.uid)
      : [...(post.likedBy || []), firebaseUser.uid];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', post.id), { ...post, likes: newLikedBy.length, likedBy: newLikedBy });
  };

  const handleAddPostComment = async (post, text) => {
    if (!firebaseUser) return;
    const newComment = { id: 'p_comment_' + Date.now(), authorName: userProfile?.name || 'Creator', text };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', post.id), { ...post, comments: [...(post.comments || []), newComment] });
  };

  const pushNotification = async (message, actorName = 'Crew Member') => {
    if (!firebaseUser) return;
    const id = 'notif_' + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id), { message, actor: actorName, timestamp: Date.now() });
  };

  const handleAddCategory = async (newCat) => {
    if (!firebaseUser) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), { list: [...categories, newCat] });
  };

  const handleSaveBrandLabel = async (text) => {
    if (!firebaseUser) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'siteSettings'), { logoText: text, logoUrl: siteSettings.logoUrl || '' });
  };

  const handleToggleRole = async (targetProfile) => {
    if (!firebaseUser) return;
    const nextRole = targetProfile.role === 'admin' ? 'member' : 'admin';
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', targetProfile.uid), { ...targetProfile, role: nextRole });
  };

  const handleRemoveProfile = async (targetUid) => {
    if (!firebaseUser) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', targetUid));
  };

  const userProfile = useMemo(() => {
    if (!loggedInEmail) return null;
    return profiles.find(p => p.email.toLowerCase() === loggedInEmail.toLowerCase()) || null;
  }, [profiles, loggedInEmail]);

  const isAdmin = useMemo(() => {
    return loggedInEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() || (userProfile && userProfile.role === 'admin');
  }, [userProfile, loggedInEmail]);

  const showToast = (message, type = 'info') => {
    setCustomToast({ message, type });
    setTimeout(() => setCustomToast(null), 4000);
  };

  const syncYouTubeStats = async (targetChannelId, targetApiKey, silent = false) => {
    const activeApiKey = targetApiKey || ytConfig.apiKey || 'AIzaSyCZ7Aj3HV9JNeMAhTDUimZlUdjMqnPVNVg';
    let url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=naitik._.artist-16&key=${activeApiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("API configuration loop.");
      const data = await res.json();
      const item = data.items?.[0];
      if (item) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'ytConfig'), {
          ...ytConfig,
          subscribers: parseInt(item.statistics.subscriberCount, 10).toLocaleString()
        });
      }
    } catch (err) {
      console.warn("Falling back to fallback state parameters.");
    }
  };

  useEffect(() => {
    if (loadingLibraries) return;
    syncYouTubeStats(ytConfig.channelId, ytConfig.apiKey, true);
  }, [loadingLibraries]);

  const handleProfileSignIn = async (crewName, crewEmail, profilePhotoBase64, categorySelected) => {
    const emailKey = crewEmail.trim().toLowerCase();
    const isOwner = emailKey === ADMIN_EMAIL.toLowerCase();
    let matchedProfile = profiles.find(p => p.email.toLowerCase() === emailKey);

    if (!matchedProfile) {
      const id = 'user_' + Date.now();
      matchedProfile = {
        uid: id,
        name: crewName || crewEmail.split('@')[0],
        email: crewEmail,
        role: isOwner ? 'owner' : 'member',
        status: 'approved',
        workCategory: categorySelected || 'Editing',
        photoURL: profilePhotoBase64 || PRESET_AVATARS[0].svg,
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', id), matchedProfile);
    }

    setLoggedInEmail(matchedProfile.email);
    localStorage.setItem('sa_logged_in_user_email', matchedProfile.email);
    setShowSignInModal(false);
    showToast(`Welcome back, ${matchedProfile.name}!`, "success");
    setCurrentPage('home');
  };

  const handleNavigationChange = (targetPage) => {
    setIsSidebarOpen(false);
    if (targetPage === 'home') { setCurrentPage(targetPage); return; }
    if (!loggedInEmail) { setShowSignInModal(true); return; }
    setCurrentPage(targetPage);
  };

  useEffect(() => {
    injectArtStyleStyles();
    setLoadingLibraries(false);
    setThreeReady(true);
  }, []);

  if (loadingLibraries) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] flex flex-col items-center justify-center font-serif text-[#C5A03A]">
        <div className="w-16 h-16 border-4 border-dashed border-[#C5A03A] rounded-full animate-spin mb-4" />
        <h2 className="text-2xl font-bold tracking-widest font-serif">SYNCING TIMELINES</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#FCFBF8] text-slate-800 font-sans selection:bg-[#C5A03A]/20">
      <WatercolorOverlay />
      {threeReady && <ThreeArtBackground />}

      {customToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-skeuo-lg text-xs font-bold text-white bg-[#C5A03A] animate-bounce">
          {customToast.message}
        </div>
      )}

      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FFFDF9]/85 border-b-2 border-[#EADFC9]/60 px-6 py-4 flex items-center justify-between shadow-sm font-sans">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-[#C5A03A]/10 rounded-full transition text-[#C5A03A] shadow-inner border border-[#EADFC9]/50 bg-white/50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => handleNavigationChange('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C5A03A] to-[#f43f5e] flex items-center justify-center text-white font-serif font-bold text-lg shadow border-2 border-white">Y</div>
            <span className="font-serif text-lg tracking-wider text-[#C5A03A] font-extrabold hidden sm:inline">{siteSettings.logoText}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {loggedInEmail ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">{userProfile?.name || loggedInEmail.split('@')[0]}</p>
                <span className="text-[9px] text-[#C5A03A] uppercase tracking-widest font-mono font-bold mt-1">{isAdmin ? 'Admin/Owner' : 'Crew Member'}</span>
              </div>
              <div className="w-9 h-9 rounded-full border border-[#C5A03A]/60 bg-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => handleNavigationChange('profile')}>
                {renderAvatar(userProfile?.photoURL)}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowSignInModal(true)} className="text-xs font-bold bg-[#C5A03A] text-white px-5 py-2.5 rounded-full shadow border border-white transition transform active:scale-95">🔑 Crew Sign In</button>
          )}
        </div>
      </header>

      <div className={`fixed inset-0 z-50 transition-opacity duration-300 bg-black/40 backdrop-blur-xs ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}>
        <div className={`absolute left-0 top-0 bottom-0 w-72 bg-[#FFFDF9]/95 border-r border-[#EADFC9] shadow-2xl p-6 flex flex-col h-full overflow-y-auto custom-scrollbar transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-6 pb-20">
            <span className="font-serif font-black text-lg text-[#C5A03A] tracking-wider uppercase block border-b pb-2">Navigation</span>
            <nav className="space-y-1.5 font-sans">
              <button onClick={() => handleNavigationChange('home')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">🏠 Home Hub</button>
              <button onClick={() => handleNavigationChange('crew')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">🎬 Crew Roster</button>
              <button onClick={() => handleNavigationChange('categories-view')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">🏷️ Categories</button>
              <button onClick={() => handleNavigationChange('vault')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">🎞️ Video Vault</button>
              <button onClick={() => handleNavigationChange('projects')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">📌 Project Board</button>
              <button onClick={() => handleNavigationChange('chat')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">💬 Whiteboard Chat</button>
              <button onClick={() => handleNavigationChange('posts')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">📸 Insta Feed</button>
              {loggedInEmail && <button onClick={() => handleNavigationChange('profile')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50">👤 My Profile</button>}
              
              {isAdmin && (
                <div className="pt-4 border-t border-[#EADFC9]/50 mt-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 block mb-1">Admin Controls</span>
                  <button onClick={() => handleNavigationChange('admin')} className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-xl text-left text-sm font-bold text-rose-600 hover:bg-rose-50">👥 Manage Roster</button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      <main className="relative z-20 max-w-7xl mx-auto px-4 py-8 studio-page-wrap">
        {currentPage === 'home' && <CreatorHomeHub siteSettings={siteSettings} videos={videos} projects={projects} ytConfig={ytConfig} syncYouTubeStats={syncYouTubeStats} notifications={notifications} handleNavigation={handleNavigationChange} />}
        {currentPage === 'crew' && <CrewSection profiles={profiles} isAdmin={isAdmin} handleRemoveProfile={handleRemoveProfile} />}
        {currentPage === 'categories-view' && <CategoriesViewSection profiles={profiles} categories={categories} setCategories={setCategoriesState} showToast={showToast} />}
        {currentPage === 'vault' && <VideoVault videos={videos} handleAddVideo={handleAddVideo} handleAddVideoComment={handleAddVideoComment} handleDeleteVideo={handleDeleteVideo} userProfile={userProfile} showToast={showToast} isAdmin={isAdmin} pushNotification={pushNotification} />}
        {currentPage === 'projects' && <ProjectBoard projects={projects} tasks={tasks} handleCreateConcept={handleCreateConcept} handleAddTask={handleAddTask} handleToggleTaskStatus={handleToggleTaskStatus} showToast={showToast} selectedProject={selectedProject} setSelectedProject={setSelectedProject} />}
        {currentPage === 'chat' && <WhiteboardChat chats={chats} handleAddChat={handleAddChat} chatChannel={chatChannel} setChatChannel={setChatChannel} />}
        {currentPage === 'posts' && <PostsWorkspace posts={posts} handleAddPost={handleAddPost} handleLikePost={handleLikePost} handleAddPostComment={handleAddPostComment} userProfile={userProfile} showToast={showToast} pushNotification={pushNotification} firebaseUser={firebaseUser} />}
        {currentPage === 'profile' && <MyProfileWorkspace userProfile={userProfile} />}
        {currentPage === 'admin' && isAdmin && <AdminPanel profiles={profiles} handleToggleRole={handleToggleRole} handleRemoveProfile={handleRemoveProfile} handleSaveBrandLabel={handleSaveBrandLabel} siteSettings={siteSettings} showToast={showToast} />}
      </main>

      {showSignInModal && <SignInModal handleProfileSignIn={handleProfileSignIn} setShowSignInModal={setShowSignInModal} categories={categories} profiles={profiles} />}
    </div>
  );
}

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
    mountRef.current.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xfffdf2, 0.5));
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    return () => { if (mountRef.current) mountRef.current.innerHTML = ''; };
  }, []);
  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0 opacity-40" />;
}

function SignInModal({ handleProfileSignIn, setShowSignInModal, categories, profiles }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [cat, setCat] = useState(categories[0] || 'Editing');

  const checkEmailOnboard = (e) => {
    e.preventDefault();
    const matched = profiles.find(p => p.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) handleProfileSignIn(matched.name, matched.email, matched.photoURL, matched.workCategory);
    else setStep(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-md bg-white border-2 border-[#EADFC9] rounded-[2rem] p-8 shadow-skeuo-lg relative">
        <button onClick={() => setShowSignInModal(false)} className="absolute top-4 right-4 font-bold text-slate-400">✕</button>
        {step === 1 ? (
          <form onSubmit={checkEmailOnboard} className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-center text-slate-800">Crew Member Identity</h3>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter Creator Gmail Address" className="w-full px-4 py-2.5 bg-slate-50 border-2 border-[#EADFC9] rounded-xl text-xs" required />
            <button type="submit" className="w-full py-2.5 bg-[#C5A03A] text-white text-xs font-bold uppercase rounded-xl">Next Step</button>
          </form>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleProfileSignIn(name, email, null, cat); }} className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-800 border-b pb-2">Register New Profile</h3>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name Handle" className="w-full px-3 py-2 border rounded-lg text-xs" required />
            <select value={cat} onChange={e => setCat(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs bg-white">
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="w-full py-2 bg-[#C5A03A] text-white text-xs font-bold uppercase rounded-xl">Join Workspace</button>
          </form>
        )}
      </div>
    </div>
  );
}

function CreatorHomeHub({ siteSettings, videos, projects, ytConfig }) {
  return (
    <section className="space-y-10 py-4 font-sans">
      <div className="text-center py-4">
        <h1 className="font-serif text-4xl md:text-5xl font-black text-slate-800 uppercase tracking-tight">{siteSettings.logoText}</h1>
        <p className="text-slate-500 font-serif italic text-sm mt-1">Creator timeline commander & segmented asset warehouse.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white border p-5 rounded-2xl shadow-skeuo-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subscribers</span>
          <p className="text-xl md:text-2xl font-black text-slate-800">{ytConfig.subscribers}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-skeuo-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Latest Views</span>
          <p className="text-xl md:text-2xl font-black text-slate-800">{ytConfig.latestVideoViews}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-skeuo-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Vault Masters</span>
          <p className="text-xl md:text-2xl font-black text-slate-800">{videos.length} Files</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-skeuo-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Ideas</span>
          <p className="text-xl md:text-2xl font-black text-slate-800">{projects.length} Boards</p>
        </div>
      </div>
    </section>
  );
}

function CrewSection({ profiles, isAdmin, handleRemoveProfile }) {
  const [focusIdx, setFocusIdx] = useState(0);
  return (
    <section className="py-4 grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <div className="bg-white p-6 border rounded-3xl text-center shadow-skeuo-md">
        <div className="w-28 h-28 rounded-full border mx-auto overflow-hidden flex items-center justify-center bg-slate-50 mb-3">
          {profiles.length > 0 ? renderAvatar(profiles[focusIdx]?.photoURL) : renderAvatar('')}
        </div>
        <h3 className="font-serif text-2xl font-bold text-slate-800">{profiles[focusIdx]?.name || 'No Active Member'}</h3>
        <p className="text-xs text-slate-400 mt-1">{profiles[focusIdx]?.email || 'Empty roster'}</p>
        <span className="bg-[#C5A03A] text-white text-[10px] px-3 py-1 rounded-full font-bold mt-3 inline-block shadow-sm">{profiles[focusIdx]?.role || 'none'}</span>
      </div>
      <div className="lg:col-span-2 bg-white p-6 border rounded-3xl shadow-skeuo-md max-h-[500px] overflow-y-auto custom-scrollbar">
        <h4 className="font-serif font-bold text-base border-b pb-2 mb-3">Production Team Members</h4>
        <div className="space-y-3">
          {profiles.map((p, i) => (
            <div key={i} className="flex justify-between items-center p-3 border rounded-xl bg-slate-50/50">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setFocusIdx(i)}>
                <div className="w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center bg-white shadow-sm">{renderAvatar(p.photoURL)}</div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{p.name}</p>
                  <span className="text-[9px] font-mono text-slate-400">{p.email} • {p.role}</span>
                </div>
              </div>
              {isAdmin && p.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                <button onClick={() => handleRemoveProfile(p.uid)} className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-full transition hover:bg-rose-100">Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoriesViewSection({ profiles, categories, setCategories, showToast }) {
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Editing');
  const [newCatInput, setNewCustomCategory] = useState('');

  const handleAddCategory = (e) => {
    e.preventDefault();
    const clean = newCatInput.trim();
    if (!clean) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) { showToast("Category tag already exists.", "warning"); return; }
    setCategories(prev => [...prev, clean]);
    setActiveCategory(clean);
    setNewCustomCategory('');
    showToast(`Category "${clean}" added successfully!`, "success");
  };

  const matchedMembers = useMemo(() => profiles.filter(p => p.workCategory === activeCategory), [profiles, activeCategory]);

  return (
    <section className="py-4 space-y-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="bg-white border p-5 rounded-3xl shadow-skeuo-md space-y-5">
        <form onSubmit={handleAddCategory} className="space-y-2">
          <h4 className="font-serif text-sm font-bold text-slate-800">Add Category</h4>
          <input type="text" value={newCatInput} onChange={(e) => setNewCustomCategory(e.target.value)} placeholder="Role tag..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none" required />
          <button type="submit" className="w-full py-1.5 bg-[#C5A03A] text-white text-[10px] font-bold uppercase rounded-lg">Add Role Tag</button>
        </form>
        <div className="pt-4 border-t space-y-1">
          {categories.map((cat, idx) => (
            <button key={idx} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition ${activeCategory === cat ? 'bg-[#C5A03A]/10 text-[#C5A03A]' : 'text-slate-500 hover:bg-slate-50'}`}>🎥 {cat}</button>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3 bg-white p-6 border rounded-3xl shadow-skeuo-md space-y-4">
        <h3 className="font-serif text-lg font-bold border-b pb-2">Specialization: <span className="text-[#C5A03A]">{activeCategory}</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedMembers.map((member, index) => (
            <div key={index} className="flex items-center space-x-3 p-4 border bg-white rounded-xl shadow-sm">
              <div className="w-10 h-10 rounded-full border bg-white overflow-hidden flex items-center justify-center">{renderAvatar(member.photoURL)}</div>
              <div>
                <h5 className="font-bold text-xs text-slate-800">{member.name}</h5>
                <p className="text-[10px] text-slate-400">{member.email}</p>
              </div>
            </div>
          ))}
          {matchedMembers.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 italic">"No crew member assigned here."</div>}
        </div>
      </div>
    </section>
  );
}

function VideoVault({ videos, handleAddVideo, handleAddVideoComment, handleDeleteVideo, userProfile, showToast, isAdmin, pushNotification }) {
  const [selectedVid, setSelectedVid] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const startParallelUploader = (e) => {
    e.preventDefault();
    if (!videoTitle.trim()) return;
    handleAddVideo(videoTitle.trim(), 'https://assets.mixkit.co/videos/preview/mixkit-watercolor-ink-drops-in-water-43313-large.mp4', '15 MB');
    pushNotification(`Uploaded real raw video asset: "${videoTitle}"`, userProfile?.name || 'Creator');
    setVideoTitle('');
    setShowUploadModal(false);
    showToast("Video draft processed!", "success");
  };

  return (
    <section className="py-4 space-y-4">
      <div className="flex justify-between items-center bg-white border p-5 rounded-2xl shadow-skeuo-md">
        <div>
          <h3 className="font-serif font-bold text-slate-800 text-lg">Timeline Asset Vault</h3>
          <p className="text-xs text-slate-400">Collaborate with real-time video segment updates</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow hover:bg-red-700 transition">+ Upload Track</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {selectedVid ? (
            <div className="space-y-4">
              <div className="bg-black rounded-2xl overflow-hidden relative border shadow-skeuo-md">
                <video key={selectedVid.id} src={selectedVid.hlsUrl} className="w-full h-64 md:h-80 object-cover" controls autoPlay />
              </div>
              <div className="p-4 bg-white border rounded-xl shadow-sm">
                <h4 className="font-serif font-bold text-slate-800 text-base">{selectedVid.title}</h4>
                <p className="text-xs text-slate-400">Uploaded by {selectedVid.uploaderName} • {selectedVid.size}</p>
              </div>
              <div className="bg-white border p-5 rounded-2xl shadow-skeuo-md space-y-4">
                <h4 className="font-serif font-bold text-slate-800 text-sm border-b pb-2">Crew Feedback ({selectedVid.comments?.length || 0})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {(selectedVid.comments || []).map((comment, index) => (
                    <div key={index} className="text-xs p-3 bg-slate-50 rounded-xl border flex justify-between items-start">
                      <div><span className="font-bold text-slate-800 mr-2">{comment.authorName}:</span><span className="text-slate-600">{comment.text}</span></div>
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const val = e.target.commentInput.value.trim(); if (val) { handleAddVideoComment(selectedVid, val); e.target.commentInput.value = ''; } }} className="flex gap-2 pt-2 border-t">
                  <input type="text" name="commentInput" placeholder="Scribble video feedback..." className="flex-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none" required />
                  <button type="submit" className="bg-[#C5A03A] text-white text-xs px-4 py-2 rounded-xl font-bold">Post</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white/60 border-2 border-dashed p-16 text-center rounded-2xl text-slate-400 shadow-inner">Select any video draft below to open player & feedback loop.</div>
          )}
        </div>
        <div className="space-y-4">
          <h4 className="font-serif font-bold text-sm text-slate-700">Playlist ({videos.length})</h4>
          <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {videos.map((v, i) => (
              <div key={i} className={`bg-white border p-3 rounded-xl hover:shadow-skeuo-sm transition-all flex justify-between items-center ${selectedVid?.id === v.id ? 'border-[#C5A03A] bg-amber-50/20' : ''}`}>
                <div onClick={() => setSelectedVid(v)} className="cursor-pointer flex-1 truncate">
                  <h5 className="font-bold text-xs text-slate-800 truncate">{v.title}</h5>
                  <span className="text-[10px] text-slate-400">By {v.uploaderName} • {v.comments?.length || 0} Notes</span>
                </div>
                {isAdmin && <button onClick={() => handleDeleteVideo(v.id)} className="text-rose-500 font-bold p-1">🗑️</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={startParallelUploader} className="bg-white border-2 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-skeuo-lg">
            <h4 className="font-serif font-bold text-slate-800">Upload Video Asset</h4>
            <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="Video Track Title..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none" required />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs">Cancel</button>
              <button type="submit" className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl">Ingest Asset</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function ProjectBoard({ projects, tasks, handleCreateConcept, handleAddTask, handleToggleTaskStatus, showToast, selectedProject, setSelectedProject }) {
  const [newConcept, setNewConcept] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  return (
    <section className="py-4 font-sans">
      {!selectedProject ? (
        <div className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); if (newConcept.trim()) { handleCreateConcept(newConcept.trim()); setNewConcept(''); showToast("Artboard appended!", "success"); } }} className="max-w-md mx-auto flex gap-2 bg-white border p-4 rounded-xl shadow">
            <input type="text" value={newConcept} onChange={e => setNewConcept(e.target.value)} placeholder="New timeline concept sprint..." className="flex-1 px-3 py-1.5 bg-slate-50 border rounded-lg text-xs focus:outline-none" required />
            <button type="submit" className="px-4 bg-[#C5A03A] text-white text-xs rounded-lg font-bold">Pin Board</button>
          </form>
          <div className="p-8 border-[12px] border-[#8b5a2b]/25 shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)] rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#deb887]">
            {projects.map((p, idx) => (
              <div key={idx} onClick={() => setSelectedProject(p)} className="bg-white border p-5 rounded-2xl cursor-pointer shadow-skeuo-md hover:-translate-y-1 transition-all relative pt-6">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xl">📌</span>
                <h4 className="font-serif font-bold text-slate-800 text-center line-clamp-2">{p.title}</h4>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-white p-6 border rounded-3xl shadow-skeuo-md">
          <button onClick={() => setSelectedProject(null)} className="text-xs font-bold text-[#C5A03A] hover:underline">◀ Back to Corkboard</button>
          <h3 className="font-serif text-2xl font-bold text-slate-800">{selectedProject.title}</h3>
          <div className="divide-y text-xs">
            {tasks.filter(t => t.projectId === selectedProject.id).map((t, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => handleToggleTaskStatus(t)}>
                <span className={`font-semibold ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-inner ${t.status === 'To Do' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{t.status}</span>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (taskTitle.trim()) { handleAddTask(selectedProject.id, taskTitle.trim()); setTaskTitle(''); } }} className="flex gap-2 max-w-sm pt-4">
            <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Add sprint task description..." className="flex-1 px-3 py-1 bg-slate-50 border rounded-lg text-xs focus:outline-none" required />
            <button type="submit" className="px-3 bg-slate-800 text-white text-xs rounded-lg font-bold">Add</button>
          </form>
        </div>
      )}
    </section>
  );
}

function WhiteboardChat({ chats, handleAddChat, chatChannel }) {
  const [msg, setMsg] = useState('');
  return (
    <section className="border rounded-[2rem] h-[350px] bg-white overflow-hidden shadow-skeuo-md flex flex-col justify-between max-w-xl mx-auto font-sans">
      <div className="p-4 overflow-y-auto space-y-2 flex-1 bg-slate-50/50 custom-scrollbar flex flex-col-reverse">
        {chats.filter(c => c.projectId === chatChannel).map((m, i) => (
          <div key={i} className="text-xs p-3 bg-white border rounded-2xl max-w-[75%] shadow-sm self-start">
            <span className="text-[9px] text-slate-400 block font-bold mb-0.5">{m.senderName}</span>
            {m.text}
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2 bg-white">
        <input type="text" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type commentary..." className="flex-1 px-3 border rounded-xl text-xs focus:outline-none" />
        <button onClick={() => { if(msg.trim()) { handleAddChat(msg.trim(), chatChannel); setMsg(''); } }} className="px-4 py-2 bg-[#C5A03A] text-white text-xs rounded-xl font-bold">Send</button>
      </div>
    </section>
  );
}

function PostsWorkspace({ posts, handleAddPost, handleLikePost, handleAddPostComment, userProfile, showToast, pushNotification, firebaseUser }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <section className="max-w-md mx-auto space-y-4 font-sans">
      <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) { handleAddPost(title.trim(), desc.trim(), PRESET_AVATARS[1].svg); pushNotification(`Published showcase item: "${title}"`, userProfile?.name); setTitle(''); setDesc(''); showToast("Published!", "success"); } }} className="bg-white p-4 border rounded-2xl shadow space-y-2">
        <h3 className="font-serif text-sm font-bold text-slate-800">Create Showroom Post</h3>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Thumbnail Title..." className="w-full text-xs px-3 py-1.5 border rounded-lg focus:outline-none" required />
        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Asset logs context details..." className="w-full text-xs px-3 py-1.5 border rounded-lg focus:outline-none" />
        <button type="submit" className="w-full bg-[#C5A03A] text-white text-xs py-2 rounded-xl font-bold">Publish Showcase</button>
      </form>
      {posts.map((p, i) => {
        const hasLiked = p.likedBy?.includes(firebaseUser?.uid);
        return (
          <div key={i} className="bg-white border rounded-[2rem] overflow-hidden shadow-skeuo-md pb-3 space-y-2">
            <div className="p-3 border-b text-xs font-black flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: p.authorAvatar || PRESET_AVATARS[0].svg }} />
              <span>{p.authorName}</span>
            </div>
            <div className="w-full h-48 bg-slate-50 flex items-center justify-center p-4">
              <div className="w-20 h-24" dangerouslySetInnerHTML={{ __html: p.image }} />
            </div>
            <div className="p-3.5 space-y-2">
              <div className="flex items-center space-x-2">
                <button onClick={() => handleLikePost(p)} className="text-sm">{hasLiked ? '❤️' : '🤍'}</button>
                <span className="text-[10px] font-bold text-slate-500">{p.likes || 0} likes</span>
              </div>
              <div className="text-xs"><span className="font-bold mr-1">{p.authorName}</span>{p.title}</div>
              <div className="space-y-1 max-h-24 overflow-y-auto border-t pt-2">
                {(p.comments || []).map((c, idx) => (
                  <div key={idx} className="text-[10px]"><strong>{c.authorName}:</strong> {c.text}</div>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); const val = e.target.comment.value.trim(); if(val) { handleAddPostComment(p, val); e.target.comment.value = ''; } }} className="flex gap-2 border-t pt-2">
                <input type="text" name="comment" placeholder="Add comment..." className="flex-1 text-[10px] border px-2 py-1 rounded focus:outline-none" required />
                <button type="submit" className="text-[10px] font-bold text-[#C5A03A]">Post</button>
              </form>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function MyProfileWorkspace({ userProfile }) {
  return (
    <section className="max-w-md mx-auto bg-white border p-8 rounded-[2.5rem] shadow-lg text-center font-sans">
      <WatercolorOverlay />
      <h3 className="font-serif text-2xl font-bold mb-2">My Profile Badge</h3>
      <p className="text-xs text-slate-500 font-mono">Session Email: {userProfile?.email || 'Active Workspace Instance'}</p>
    </section>
  );
}

function AdminPanel({ profiles, handleToggleRole, handleRemoveProfile, handleSaveBrandLabel, siteSettings, showToast }) {
  const [logoTxt, setLogoTxt] = useState(siteSettings.logoText);

  return (
    <section className="space-y-6 max-w-2xl mx-auto font-sans">
      <form onSubmit={(e) => { e.preventDefault(); if (logoTxt.trim()) { handleSaveBrandLabel(logoTxt.trim()); showToast("Label synchronized!", "success"); } }} className="bg-white border p-5 rounded-[2rem] shadow-skeuo-md space-y-3">
        <h3 className="font-serif font-bold text-slate-800">Studio Branding</h3>
        <input type="text" value={logoTxt} onChange={(e) => setLogoTxt(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none" required />
        <button type="submit" className="w-full py-2 bg-[#C5A03A] text-white text-xs rounded-lg font-bold">Save Label</button>
      </form>
      <div className="bg-white border p-6 rounded-[2rem] shadow-skeuo-md">
        <h3 className="font-serif font-bold border-b pb-2 mb-4 text-slate-800">Roster Access Level Control</h3>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-slate-400">
              <th className="pb-2">Profile Handle</th>
              <th className="pb-2">Current Role</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, index) => (
              <tr key={index} className="border-t">
                <td className="py-3 font-bold">{p.name}<br/><span className="text-[9px] font-normal text-slate-400">{p.email}</span></td>
                <td className="py-3 uppercase font-mono text-[10px] font-semibold">{p.role}</td>
                <td className="py-3 text-right">
                  {p.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ? (
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => handleToggleRole(p)} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-md font-bold border border-amber-200">{p.role === 'admin' ? 'Demote' : 'Promote'}</button>
                      <button onClick={() => handleRemoveProfile(p.uid)} className="bg-rose-50 text-rose-600 px-3 py-1 rounded-md font-bold border border-rose-200">Remove</button>
                    </div>
                  ) : <span className="text-slate-400 italic">Owner</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PendingScreen({ userProfile }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center p-4 font-sans">
      <div className="bg-white p-6 border rounded-2xl max-w-sm shadow-skeuo-md">
        <h3 className="font-serif font-bold text-xl mb-2"> Roster Waiting Room</h3>
        <p className="text-xs text-slate-500 mb-4">Hello {userProfile?.name}! Your request has been logged and queued.</p>
      </div>
    </div>
  );
}

function RejectedScreen() {
  return <div className="text-center py-20 font-sans font-bold text-rose-500">Access Restricted. Contact workspace manager.</div>;
}
