import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiIRdcZnzYQx7oGYmHsbOPU8wlnxlm6TY",
  authDomain: "rs-studio-c152d.firebaseapp.com",
  projectId: "rs-studio-c152d",
  storageBucket: "rs-studio-c152d.firebasestorage.app",
  messagingSenderId: "319185394502",
  appId: "1:319185394502:web:e8bd4c6ab196f486c06347"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
