import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDii1RdcZnzYQx7oGYmHsb0PU8wlnxlm6TY",
  authDomain: "rs-studio-c152d.firebaseapp.com",
  databaseURL: "https://rs-studio-c152d-default-rtdb.firebaseio.com",
  projectId: "rs-studio-c152d",
  storageBucket: "rs-studio-c152d.firebasestorage.app",
  messagingSenderId: "319185394502",
  appId: "1:319185394502:web:e8bd4c6ab196f486c06347"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
