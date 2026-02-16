import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAck-5UbGQwTRl2uj4AAD2zR45whijina0",
  authDomain: "seat-reservation-system-5751d.firebaseapp.com",
  projectId: "seat-reservation-system-5751d",
  storageBucket: "seat-reservation-system-5751d.appspot.com",
  messagingSenderId: "320041930586",
  appId: "1:320041930586:web:c97d44cec328c2a6db6d63",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
