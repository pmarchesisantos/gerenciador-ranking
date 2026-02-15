
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAor3mP4MDb7l_rxEL18UaKQL5xTb94TRM",
  authDomain: "gerenciamento-ranking-poker.firebaseapp.com",
  projectId: "gerenciamento-ranking-poker",
  storageBucket: "gerenciamento-ranking-poker.firebasestorage.app",
  messagingSenderId: "213659844213",
  appId: "1:213659844213:web:d8cb56118ee4a87265023c",
  measurementId: "G-FZJVVYFSFD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
};
