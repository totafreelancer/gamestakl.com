import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'

// Firebase configuration — HubZone Gaming Platform
const firebaseConfig = {
  apiKey: "AIzaSyD6Q5QgLJhiHVvFPBEyipGl5u1J-6OBCls",
  authDomain: "hubzone-gaming.firebaseapp.com",
  projectId: "hubzone-gaming",
  storageBucket: "hubzone-gaming.firebasestorage.app",
  messagingSenderId: "750855228084",
  appId: "1:750855228084:web:ab6e03b95aecd7713465e1",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// Add scopes for additional profile info
googleProvider.addScope('profile')
googleProvider.addScope('email')

export { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult }
export default app
