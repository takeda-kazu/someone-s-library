import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBs8q4LIEnYpqk_PzaJwZO7I7C9gWu6MIk",
  authDomain: "library-6632c.firebaseapp.com",
  projectId: "library-6632c",
  storageBucket: "library-6632c.firebasestorage.app",
  messagingSenderId: "475019124517",
  appId: "1:475019124517:web:69e3e6d5d81467a61944cc",
  measurementId: "G-8GWPSS67D1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
