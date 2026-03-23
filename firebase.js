import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDve8V01b_E4FiyfNfOZbZdgMxhwKVu0iA",
  authDomain: "pockethyenax1.firebaseapp.com",
  projectId: "pockethyenax1",
  storageBucket: "pockethyenax1.firebasestorage.app",
  messagingSenderId: "675225652147",
  appId: "1:675225652147:web:462372361f11f6392599c6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
