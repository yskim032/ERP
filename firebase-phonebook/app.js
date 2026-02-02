// DOM Elements
const saveBtn = document.getElementById('btn-save');
const searchBtn = document.getElementById('btn-search');
const saveNameInput = document.getElementById('save-name');
const savePhoneInput = document.getElementById('save-phone');
const searchNameInput = document.getElementById('search-name');
const resultBox = document.getElementById('search-result');
const resultName = document.getElementById('result-name');
const resultPhone = document.getElementById('result-phone');
const toast = document.getElementById('toast');

// --- Functions ---

/**
 * Show a simple toast message
 */
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

/**
 * Save contact to Firestore
 */
async function saveContact() {
    const name = saveNameInput.value.trim();
    const phone = savePhoneInput.value.trim();

    if (!name || !phone) {
        showToast("Please enter both name and phone number.");
        return;
    }

    try {
        // 'contacts' 컬렉션에 데이터 저장 (문서 ID를 이름으로 설정하여 단순화)
        await db.collection("contacts").doc(name).set({
            name: name,
            phone: phone,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast("✅ Contact saved successfully!");
        saveNameInput.value = "";
        savePhoneInput.value = "";
    } catch (error) {
        console.error("Error saving contact: ", error);
        // 에러 메시지를 더 구체적으로 표시하여 디버깅을 돕습니다.
        let msg = "❌ Failed to save.";
        if (error.code === 'permission-denied') {
            msg += " Please check Firestore Rules (Test Mode).";
        } else {
            msg += " Error: " + error.message;
        }
        showToast(msg);
    }
}

/**
 * Search contact from Firestore
 */
async function searchContact() {
    const name = searchNameInput.value.trim();

    if (!name) {
        showToast("Please enter a name to search.");
        return;
    }

    try {
        const doc = await db.collection("contacts").doc(name).get();

        if (doc.exists) {
            const data = doc.data();
            resultName.textContent = data.name;
            resultPhone.textContent = data.phone;
            resultBox.classList.remove('hidden');
            showToast("🔍 Contact found!");
        } else {
            resultBox.classList.add('hidden');
            showToast("⚠️ Contact not found.");
        }
    } catch (error) {
        console.error("Error searching contact: ", error);
        showToast("❌ Error occurred during search.");
    }
}

// --- Event Listeners ---

saveBtn.addEventListener('click', saveContact);
searchBtn.addEventListener('click', searchContact);

// Allow pressing 'Enter' to trigger actions
savePhoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveContact();
});

searchNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchContact();
});
