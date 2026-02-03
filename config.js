const firebaseConfig = {
    apiKey: "AIzaSyAA80QnVq8NHkIVo-Xe3VGNaQ7NhKhqp7w",
    authDomain: "ys-hb-epr.firebaseapp.com",
    projectId: "ys-hb-epr",
    storageBucket: "ys-hb-epr.firebasestorage.app",
    messagingSenderId: "208094301061",
    appId: "1:208094301061:web:f0db6046b582ce916552ec",
    measurementId: "G-FF0F04R35K"
};

// Firebase Configuration helper
function getFirebaseConfig() {
    const saved = localStorage.getItem('msc_erp_firebase_config');
    return saved ? JSON.parse(saved) : firebaseConfig;
}

const activeConfig = getFirebaseConfig();

// Initialize Firebase (Compat Version)
firebase.initializeApp(activeConfig);
const db = firebase.firestore();
const storage = firebase.storage();
console.log("🚀 Firebase & Storage initialized with " + (localStorage.getItem('msc_erp_firebase_config') ? "Manual" : "Default") + " Config.");
console.log("📂 Storage Bucket:", activeConfig.storageBucket);

/**
 * Helper to allow manual overrides via UI if needed
 */
function getFirebaseConfig() {
    const saved = localStorage.getItem('msc_erp_firebase_config');
    return saved ? JSON.parse(saved) : firebaseConfig;
}
