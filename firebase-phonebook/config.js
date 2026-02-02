// TODO: 파이어베이스 콘솔(https://console.firebase.google.com/)에서 프로젝트 생성 후
// 프로젝트 설정 -> 내 앱 -> 웹 앱(</>) 추가를 통해 아래의 config 정보를 붙여넣으세요.

const firebaseConfig = {
    apiKey: "AIzaSyCA78i8N08lGlPSNJX0cXW_ecx-rvIzd2A",
    authDomain: "ys-study0202.firebaseapp.com",
    projectId: "ys-study0202",
    storageBucket: "ys-study0202.firebasestorage.app",
    messagingSenderId: "64618911969",
    appId: "1:64618911969:web:b7f03dcac96a1700d57fa0",
    measurementId: "G-3N6V9XPQTH"
};

// 파이어베이스 초기화 (Compat 버전 사용)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
