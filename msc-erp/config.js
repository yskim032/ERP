/**
 * Firebase Config - Dynamic Loader
 * Hides private keys from source code (GitHub)
 */
function getFirebaseConfig() {
    const saved = localStorage.getItem('msc_erp_firebase_config');
    if (!saved) return null;
    try {
        return JSON.parse(saved);
    } catch (e) {
        return null;
    }
}

// Initialize only if config exists
const firebaseConfig = getFirebaseConfig();
let db = null;

if (firebaseConfig) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("✅ Firebase initialized from local storage.");
    } catch (e) {
        console.error("❌ Firebase init error:", e);
    }
} else {
    console.warn("⚠️ No Firebase configuration found. Please run setup.");
}
