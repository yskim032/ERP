const firebaseConfig = {
    apiKey: "AIzaSyAA80QnVq8NHkIVo-Xe3VGNaQ7NhKhqp7w",
    authDomain: "ys-hb-epr.firebaseapp.com",
    projectId: "ys-hb-epr",
    storageBucket: "ys-hb-epr.firebasestorage.app",
    messagingSenderId: "208094301061",
    appId: "1:208094301061:web:f0db6046b582ce916552ec",
    measurementId: "G-FF0F04R35K"
};

// Initialize Firebase (Compat Version)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log("✅ Firebase initialized with hardcoded config.");

/**
 * Helper to allow manual overrides via UI if needed
 */
function getFirebaseConfig() {
    const saved = localStorage.getItem('msc_erp_firebase_config');
    return saved ? JSON.parse(saved) : firebaseConfig;
}
