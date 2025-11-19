import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBTG6NxjMm7zAvZU6I4kesX5cpK2NvSc-4",
  authDomain: "pacematch-a73c1.firebaseapp.com",
  projectId: "pacematch-a73c1",
  storageBucket: "pacematch-a73c1.firebasestorage.app",
  messagingSenderId: "816539131376",
  appId: "1:816539131376:web:aa169c16104c3f97d6d135"
};

const app = initializeApp(firebaseConfig);

// 🔥 AQUI ESTÁ O QUE FALTAVA
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();  // 👈 ESSA LINHA PRECISA EXISTIR
export const db = getFirestore(app);
