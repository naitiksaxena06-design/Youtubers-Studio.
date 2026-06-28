import React, { useState, useEffect } from 'react';
import { db } from "./firebase";
import { doc, setDoc, deleteDoc, collection, onSnapshot } from "firebase/firestore";

// --- INITIAL CREW DATA SETS ---
const INITIAL_PROFILES = [
  { uid: 'owner-id', name: 'Naitik Saxena', email: 'Naitiksaxena06@gmail.com', role: 'admin', status: 'approved' },
  { uid: 'editor-1', name: 'Alex Thompson', email: 'alex@crew.com', role: 'editor', status: 'approved' },
  { uid: 'designer-1', name: 'Sarah Connor', email: 'sarah@crew.com', role: 'designer', status: 'approved' }
];

const PRESET_AVATARS = [
  { id: 'coral-brush', name: 'Coral Brush' },
  { id: 'cobalt-wave', name: 'Cobalt Wave' },
  { id: 'gold-palette', name: 'Golden Palette' },
  { id: 'emerald-leaf', name: 'Mint Leaf' }
];

const ADMIN_EMAIL = "Naitiksaxena06@gmail.com";

// --- CUSTOM AVATAR RENDERER ---
const renderAvatar = (photoURL) => {
  if (!photoURL) return <div className="w-12 h-12 rounded-full bg-gray-300" />;
  return <img src={photoURL} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />;
};

// --- WATERCOLOR TEXTURE OVERLAY ---
const WatercolorOverlay = () => (
  <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply bg-radial from-transparent to-amber-100" />
);

// --- CLOUD ADMIN PANEL FOR APPROVING USERS ---
function CloudAdminPanel({ profiles }) {
  const approveUser = async (user) => {
    const userRef = doc(db, "profiles", user.uid);
    await setDoc(userRef, { ...user, status: 'approved' }, { merge: true });
  };

  const promoteUser = async (user) => {
    const userRef = doc(db, "profiles", user.uid);
    await setDoc(userRef, { ...user, role: 'admin' }, { merge: true });
  };

  const removeUser = async (userId) => {
    await deleteDoc(doc(db, "profiles", userId));
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-4xl mx-auto my-6 border border-amber-200 relative">
      <WatercolorOverlay />
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Admin Panel (Cloud Sync)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {profiles.map((p) => (
              <tr key={p.uid}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {renderAvatar(p.photoURL)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-sm text-gray-500">{p.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{p.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                  {p.status !== 'approved' && (
                    <button onClick={() => approveUser(p)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded">Approve</button>
                  )}
                  {p.role !== 'admin' && (
                    <button onClick={() => promoteUser(p)} className="text-amber-600 hover:text-amber-900 bg-amber-50 px-3 py-1 rounded">Make Admin</button>
                  )}
                  <button onClick={() => removeUser(p.uid)} className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "profiles"), (snapshot) => {
      const cloudProfiles = [];
      snapshot.forEach((doc) => {
        cloudProfiles.push({ uid: doc.id, ...doc.data() });
      });
      if (cloudProfiles.length > 0) {
        setProfiles(cloudProfiles);
      } else {
        setProfiles(INITIAL_PROFILES);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    
    const existing = profiles.find(p => p.email.toLowerCase() === emailInput.toLowerCase());
    if (existing) {
      setUser(existing);
    } else {
      const newUser = {
        uid: "user_" + Date.now(),
        name: nameInput || emailInput.split('@')[0],
        email: emailInput,
        role: 'crew',
        status: 'pending'
      };
      setUser(newUser);
      setDoc(doc(db, "profiles", newUser.uid), newUser);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 text-slate-800 font-sans pb-12 relative selection:bg-amber-200">
      <WatercolorOverlay />
      
      <header className="py-12 text-center max-w-xl mx-auto px-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">YOUTUBERS STUDIO</h1>
        <p className="text-amber-800 text-sm italic font-medium">Cloud database linked successfully!</p>
      </header>

      {!user ? (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md border border-amber-100 mx-4">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Sign In / Register Request</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (New users only)</label>
              <input 
                type="text" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md shadow transition">
              Enter Workspace
            </button>
          </form>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-amber-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {renderAvatar(user.photoURL)}
              <div>
                <h3 className="font-bold text-slate-900">{user.name}</h3>
                <p className="text-xs text-gray-500 capitalize">{user.role} • Status: {user.status}</p>
              </div>
            </div>
            <button onClick={() => setUser(null)} className="text-sm text-gray-500 hover:text-gray-800 underline">Sign Out</button>
          </div>

          {user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? (
            <CloudAdminPanel profiles={profiles} />
          ) : (
            <div className="bg-white p-8 rounded-xl shadow-md border border-amber-100 text-center">
              <h2 className="text-2xl font-bold mb-2">Workspace Dashboard</h2>
              {user.status === 'approved' ? (
                <p className="text-green-600 font-medium">Welcome back to the studio production hub!</p>
              ) : (
                <p className="text-amber-600 font-medium">Your access request has been sent to the Admin database. Please wait for approval.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
