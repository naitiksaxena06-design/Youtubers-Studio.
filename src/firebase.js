  // src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as fbSignOut 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, setDoc, updateDoc, deleteDoc, getDoc, 
  collection, addDoc, onSnapshot, query, orderBy, limit as fbLimit, 
  arrayUnion 
} from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDi1RdcZnzYQx7oGYmHsbOPU8wlnxlm6TY",
  authDomain: "rs-studio-c152d.firebaseapp.com",
  databaseURL: "https://rs-studio-c152d-default-rtdb.firebaseio.com",
  projectId: "rs-studio-c152d",
  storageBucket: "rs-studio-c152d.firebasestorage.app",
  messagingSenderId: "319185394502",
  appId: "1:319185394502:web:fb4c3d619ed2c40dc06347",
  measurementId: "G-18PE8WD0SV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export {
  auth, db, googleProvider,
  doc, setDoc, updateDoc, deleteDoc, getDoc,
  collection, addDoc, onSnapshot, query, orderBy, fbLimit,
  arrayUnion, onAuthStateChanged, signInWithPopup, fbSignOut
};
