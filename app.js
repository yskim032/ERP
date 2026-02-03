// --- ERP App Version: 1.0.2-final ---
// --- DOM Elements ---
const entryTbody = document.getElementById('entry-tbody');
const btnAddRow = document.getElementById('btn-add-row');
const btnBulkSave = document.getElementById('btn-bulk-save');
const excelUpload = document.getElementById('excel-upload');

const globalSearch = document.getElementById('global-search');
const btnSearch = document.getElementById('btn-search');
const polSearch = document.getElementById('pol-search');
const btnPolSearch = document.getElementById('btn-pol-search');
const podSearch = document.getElementById('pod-search');
const btnPodSearch = document.getElementById('btn-pod-search');
const searchResults = document.getElementById('search-results');

const dbCount = document.getElementById('db-count');
const dbCountE = document.getElementById('db-count-e');
const dbCountI = document.getElementById('db-count-i');
const dbCountT = document.getElementById('db-count-t');
const dbTbody = document.getElementById('db-tbody');
const btnRefreshDb = document.getElementById('btn-refresh-db');

const setupModal = document.getElementById('setup-modal');
const btnShowSetup = document.getElementById('btn-show-setup');
const btnCloseSetup = document.getElementById('btn-close-setup');
const btnSaveSetup = document.getElementById('btn-save-setup');

const toast = document.getElementById('toast');

// --- State ---
let rowCount = 0;

// --- Functions ---

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

/**
 * Creates a new row in the data entry table
 */
function createRow(data = {}) {
    rowCount++;
    const tr = document.createElement('tr');
    tr.id = `row-${rowCount}`;

    tr.innerHTML = `
        <td>
            <div class="custom-select-wrapper">
                <div class="custom-select-trigger" onclick="toggleDropdown(this)">${data.type || 'E'}</div>
                <input type="hidden" class="field-type" value="${data.type || 'E'}">
                <ul class="custom-options">
                    <li data-value="E" onclick="selectOption(this)">E</li>
                    <li data-value="I" onclick="selectOption(this)">I</li>
                    <li data-value="T" onclick="selectOption(this)">T</li>
                </ul>
            </div>
        </td>
        <td><input type="text" class="field-pol" value="${data.pol || ''}" placeholder="POL"></td>
        <td><input type="text" class="field-pod" value="${data.pod || ''}" placeholder="POD"></td>
        <td><input type="text" class="field-bl" value="${data.bl || ''}" placeholder="BLN123..."></td>
        <td><input type="text" class="field-container" value="${data.container || ''}" placeholder="MSCU1..."></td>
        <td><input type="text" class="field-d-vessel" value="${data.d_vessel || ''}"></td>
        <td><input type="date" class="field-d-date" value="${data.d_date || ''}"></td>
        <td><input type="text" class="field-l-vessel" value="${data.l_vessel || ''}"></td>
        <td><input type="date" class="field-l-date" value="${data.l_date || ''}"></td>
        <td><input type="text" class="field-item" value="${data.item || ''}"></td>
        <td><input type="text" class="field-remark" value="${data.remark || ''}" placeholder="..."></td>
        <td>
            <div class="pdf-drop-zone ${data.pdf_url ? 'has-file' : ''}" onclick="this.querySelector('input').click()">
                <span>${data.pdf_url ? '📄' : '➕'}</span>
                <input type="file" accept="application/pdf" hidden onchange="handleFileSelect(this)">
                <input type="hidden" class="field-pdf-url" value="${data.pdf_url || ''}">
            </div>
        </td>
        <td style="display:none;"><input type="hidden" class="field-id" value="${data.id || ''}"></td>
        <td><button class="btn-delete" onclick="this.closest('tr').remove()">×</button></td>
    `;

    // Setup drag and drop for the new row
    const dropZone = tr.querySelector('.pdf-drop-zone');
    setupDragAndDrop(dropZone);

    entryTbody.appendChild(tr);
}

/**
 * Drag and Drop Setup
 */
function setupDragAndDrop(element) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        element.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    element.addEventListener('dragover', () => element.classList.add('dragover'));
    element.addEventListener('dragleave', () => element.classList.remove('dragover'));
    element.addEventListener('drop', e => {
        element.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0], element);
        }
    });
}

function handleFileSelect(input) {
    if (input.files.length > 0) {
        handleFileUpload(input.files[0], input.closest('.pdf-drop-zone'));
    }
}

async function handleFileUpload(file, element) {
    if (file.type !== 'application/pdf') {
        showToast("⚠️ Only PDF files are allowed.");
        return;
    }

    console.log("📤 Starting upload for:", file.name, `(${file.size} bytes)`);
    element.classList.add('loading');
    const existingHiddenInput = element.querySelector('.field-pdf-url');
    element.innerHTML = '<span>⏳</span>';
    if (existingHiddenInput) element.appendChild(existingHiddenInput);

    // Timeout control
    const uploadTimeout = setTimeout(() => {
        console.error("⏰ Upload timed out after 30 seconds.");
        showToast("❌ Upload timed out. Check your connection or Firebase Storage rules.");
        element.classList.remove('loading');
        element.innerHTML = `<span>➕</span><input type="file" accept="application/pdf" hidden onchange="handleFileSelect(this)"><input type="hidden" class="field-pdf-url" value="${existingHiddenInput ? existingHiddenInput.value : ''}">`;
    }, 30000);

    try {
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = storage.ref(`pdfs/${fileName}`);

        console.log("📡 Sending to storage path: pdfs/" + fileName);
        const snapshot = await storageRef.put(file);

        console.log("✅ File uploaded, getting download URL...");
        const url = await snapshot.ref.getDownloadURL();

        clearTimeout(uploadTimeout);
        console.log("🔗 URL received:", url);

        element.classList.remove('loading');
        element.classList.add('has-file');
        element.innerHTML = `<span>📄</span><input type="file" accept="application/pdf" hidden onchange="handleFileSelect(this)"><input type="hidden" class="field-pdf-url" value="${url}">`;
        showToast("✅ PDF uploaded successfully!");
    } catch (error) {
        clearTimeout(uploadTimeout);
        console.error("❌ Upload error details:", error);

        let errorMsg = "❌ Upload failed.";
        if (error.code === 'storage/unauthorized') {
            errorMsg = "❌ Unauthorized! Please check your Firebase Storage Rules (set to 'allow read, write: if true').";
        } else if (error.code === 'storage/quota-exceeded') {
            errorMsg = "❌ Storage quota exceeded!";
        } else {
            errorMsg = `❌ Error: ${error.message || 'Unknown source'}`;
        }

        showToast(errorMsg);
        element.classList.remove('loading');
        element.innerHTML = `<span>➕</span><input type="file" accept="application/pdf" hidden onchange="handleFileSelect(this)"><input type="hidden" class="field-pdf-url" value="${existingHiddenInput ? existingHiddenInput.value : ''}">`;
    }
}

/**
 * Bulk save all table data to Firestore
 */
async function syncToCloud() {
    const rows = entryTbody.querySelectorAll('tr');
    if (rows.length === 0) {
        showToast("⚠️ No data to save.");
        return;
    }

    const payload = [];
    let pendingUpload = false;

    rows.forEach(row => {
        try {
            const pdfInput = row.querySelector('.field-pdf-url');
            const idInput = row.querySelector('.field-id');
            const typeInput = row.querySelector('.field-type');

            if (row.querySelector('.pdf-drop-zone')?.classList.contains('loading')) {
                pendingUpload = true;
            }

            if (!typeInput) return; // Skip if structure is broken

            payload.push({
                type: typeInput.value,
                pol: row.querySelector('.field-pol')?.value.trim().toUpperCase() || '',
                pod: row.querySelector('.field-pod')?.value.trim().toUpperCase() || '',
                bl_no: row.querySelector('.field-bl')?.value.trim().toUpperCase() || '',
                container_no: row.querySelector('.field-container')?.value.trim().toUpperCase() || '',
                d_vessel: row.querySelector('.field-d-vessel')?.value.trim().toUpperCase() || '',
                d_date: row.querySelector('.field-d-date')?.value || '',
                l_vessel: row.querySelector('.field-l-vessel')?.value.trim().toUpperCase() || '',
                l_date: row.querySelector('.field-l-date')?.value || '',
                item_name: row.querySelector('.field-item')?.value.trim() || '',
                remark: row.querySelector('.field-remark')?.value.trim() || '',
                pdf_url: pdfInput ? pdfInput.value : '',
                doc_id: idInput ? idInput.value : '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn("Row parsing error:", e);
        }
    });

    if (pendingUpload) {
        if (!confirm("⚠️ Some PDFs are still uploading. Continue without them?")) return;
    }

    if (payload.length === 0) {
        showToast("⚠️ No valid data to save.");
        return;
    }

    try {
        const batch = db.batch();
        payload.forEach(item => {
            const dataToSave = { ...item };
            const docId = dataToSave.doc_id;
            delete dataToSave.doc_id; // Don't save the helper doc_id field itself

            if (docId) {
                const docRef = db.collection("erp_v2").doc(docId);
                batch.set(docRef, dataToSave, { merge: true });
            } else {
                const docRef = db.collection("erp_v2").doc();
                batch.set(docRef, dataToSave);
            }
        });

        await batch.commit();
        showToast(`✅ Successfully synced ${payload.length} records!`);
        entryTbody.innerHTML = "";
        createRow();
        fetchAllRecords(); // Refresh global list
    } catch (error) {
        console.error("Sync error:", error);
        showToast("❌ Sync failed.");
    }
}

/**
 * Handle Excel file upload
 */
function handleExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length > 0) {
            entryTbody.innerHTML = "";
            json.forEach(row => {
                const find = (keywords) => {
                    const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
                    return key ? row[key] : "";
                };

                createRow({
                    type: find(['type', '구분']),
                    pol: find(['pol', 'loading', '선적항']),
                    pod: find(['pod', 'discharge port', '양하항']),
                    bl: find(['bl', '비엘']),
                    container: find(['container', '컨테이너']),
                    d_vessel: find(['discharge vessel', '양하선', 'd-vessel']),
                    d_date: find(['discharge date', '양하일', 'd-date']),
                    l_vessel: find(['load vessel', '선적선', 'l-vessel']),
                    l_date: find(['load date', '선적일', 'l-date']),
                    item: find(['item', '품목', '부속품']),
                    remark: find(['remark', '비고', '참조', 'note'])
                });
            });
            showToast(`📂 Loaded ${json.length} rows from Excel.`);
        }
    };
    reader.readAsBinaryString(file);
}

/**
 * Search logic logic
 */
async function performSearch(field = "global", queryVal = "") {
    const query = (queryVal || (field === "global" ? globalSearch.value : field === "pol" ? polSearch.value : podSearch.value)).trim().toUpperCase();
    if (!query) return;

    searchResults.innerHTML = '<div class="empty-state">Searching...</div>';

    try {
        let resultMap = new Map();

        if (field === "global") {
            const queries = [
                db.collection("erp_v2").where("container_no", "==", query).get(),
                db.collection("erp_v2").where("bl_no", "==", query).get(),
                db.collection("erp_v2").where("d_vessel", "==", query).get(),
                db.collection("erp_v2").where("l_vessel", "==", query).get()
            ];
            const snapshots = await Promise.all(queries);
            snapshots.forEach(snapshot => snapshot.docs.forEach(doc => resultMap.set(doc.id, { ...doc.data(), id: doc.id })));
        } else if (field === "pol") {
            const snapshot = await db.collection("erp_v2").where("pol", "==", query).get();
            snapshot.docs.forEach(doc => resultMap.set(doc.id, { ...doc.data(), id: doc.id }));
        } else if (field === "pod") {
            const snapshot = await db.collection("erp_v2").where("pod", "==", query).get();
            snapshot.docs.forEach(doc => resultMap.set(doc.id, { ...doc.data(), id: doc.id }));
        }

        if (resultMap.size > 0) {
            renderSearchResults(Array.from(resultMap.values()));
            showToast(`📊 Found ${resultMap.size} records.`);
        } else {
            searchResults.innerHTML = '<div class="empty-state">No matching records found.</div>';
            showToast("⚠️ No records found.");
        }
    } catch (error) {
        console.error("Search error:", error);
        showToast("❌ Search error.");
    }
}

function renderSearchResults(records) {
    searchResults.innerHTML = "";
    records.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    records.forEach(data => {
        const card = document.createElement('div');
        card.className = "result-card";
        card.dataset.id = data.id;
        renderViewCard(data, card);
        searchResults.appendChild(card);
    });
}

function renderViewCard(data, card) {
    const typeMap = { 'E': 'Local Export', 'I': 'Local Import', 'T': 'T/S' };
    const fullType = typeMap[data.type] || data.type;
    card.innerHTML = `
        <div class="card-top">
            <span class="type-tag tag-${data.type?.toLowerCase()}">${fullType}</span>
            <span class="bl-no">${data.bl_no || 'NO BL'}</span>
        </div>
        <div class="card-grid">
            <span class="item-label">POL/POD:</span><span class="item-value" style="color:var(--msc-yellow)">${data.pol || '-'} / ${data.pod || '-'}</span>
            <span class="item-label">Container:</span><span class="item-value">${data.container_no}</span>
            <span class="item-label">D-Vessel:</span><span class="item-value">${data.d_vessel} (${data.d_date || '-'})</span>
            <span class="item-label">L-Vessel:</span><span class="item-value">${data.l_vessel} (${data.l_date || '-'})</span>
            <span class="item-label">Item:</span><span class="item-value" style="color:var(--msc-yellow)">${data.item_name}</span>
            <span class="item-label">Remark:</span><span class="item-value">${data.remark || '-'}</span>
            <span class="item-label">PDF:</span><span class="item-value">${data.pdf_url ? `<a href="${data.pdf_url}" target="_blank" class="btn-pdf-link">📄 VIEW PDF</a>` : '-'}</span>
        </div>
        <div class="card-actions" style="margin-top: 10px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn-small" onclick='quickEdit(this.closest(".result-card"), ${JSON.stringify(data).replace(/'/g, "&apos;")})'>EDIT RECORD</button>
            <button class="btn-small" style="background: rgba(99,102,241,0.1); color: var(--primary);" onclick='loadForEdit(${JSON.stringify(data).replace(/'/g, "&apos;")})'>TO TOP</button>
        </div>
    `;
}

function quickEdit(card, data) {
    card.innerHTML = `
        <div class="card-top">
            <select class="edit-type" style="background:var(--bg-dark); color:white; border:1px solid var(--primary); font-size:0.7rem;">
                <option value="E" ${data.type === 'E' ? 'selected' : ''}>E</option>
                <option value="I" ${data.type === 'I' ? 'selected' : ''}>I</option>
                <option value="T" ${data.type === 'T' ? 'selected' : ''}>T</option>
            </select>
            <input type="text" class="edit-bl" value="${data.bl_no || ''}" style="width:120px; font-size:0.8rem; border-bottom:1px solid var(--primary);">
        </div>
        <div class="card-grid edit-mode-grid" style="display: grid; grid-template-columns: 80px 1fr; gap: 5px;">
            <span class="item-label">POL:</span><input type="text" class="edit-pol" value="${data.pol || ''}">
            <span class="item-label">POD:</span><input type="text" class="edit-pod" value="${data.pod || ''}">
            <span class="item-label">CNTR:</span><input type="text" class="edit-container" value="${data.container_no || ''}">
            <span class="item-label">D-Vessel:</span><input type="text" class="edit-d-vessel" value="${data.d_vessel || ''}">
            <span class="item-label">D-Date:</span><input type="date" class="edit-d-date" value="${data.d_date || ''}">
            <span class="item-label">L-Vessel:</span><input type="text" class="edit-l-vessel" value="${data.l_vessel || ''}">
            <span class="item-label">L-Date:</span><input type="date" class="edit-l-date" value="${data.l_date || ''}">
            <span class="item-label">Item:</span><input type="text" class="edit-item" value="${data.item_name || ''}">
            <span class="item-label">Remark:</span><input type="text" class="edit-remark" value="${data.remark || ''}">
            <span class="item-label">PDF:</span>
            <div class="pdf-drop-zone ${data.pdf_url ? 'has-file' : ''}" onclick="this.querySelector('input').click()" style="width: 100%;">
                <span>${data.pdf_url ? '📄' : '➕ Change PDF'}</span>
                <input type="file" accept="application/pdf" hidden onchange="handleFileSelect(this)">
                <input type="hidden" class="field-pdf-url" value="${data.pdf_url || ''}">
            </div>
        </div>
        <div class="card-actions" style="margin-top: 10px; text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
            <button class="btn-small" style="background: var(--msc-yellow); color: black;" onclick='quickSave("${data.id}", this.closest(".result-card"))'>SAVE</button>
            <button class="btn-small" onclick='renderViewCard(${JSON.stringify(data).replace(/'/g, "&apos;")}, this.closest(".result-card"))'>CANCEL</button>
        </div>
    `;
    setupDragAndDrop(card.querySelector('.pdf-drop-zone'));
}

async function quickSave(docId, card) {
    const updatedData = {
        type: card.querySelector('.edit-type').value,
        bl_no: card.querySelector('.edit-bl').value.trim().toUpperCase(),
        pol: card.querySelector('.edit-pol').value.trim().toUpperCase(),
        pod: card.querySelector('.edit-pod').value.trim().toUpperCase(),
        container_no: card.querySelector('.edit-container').value.trim().toUpperCase(),
        d_vessel: card.querySelector('.edit-d-vessel').value.trim().toUpperCase(),
        d_date: card.querySelector('.edit-d-date').value,
        l_vessel: card.querySelector('.edit-l-vessel').value.trim().toUpperCase(),
        l_date: card.querySelector('.edit-l-date').value,
        item_name: card.querySelector('.edit-item').value.trim(),
        remark: card.querySelector('.edit-remark').value.trim(),
        pdf_url: card.querySelector('.field-pdf-url').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("erp_v2").doc(docId).update(updatedData);
        showToast("✅ Record updated successfully!");

        // Re-render the view card with new data
        const newData = { ...updatedData, id: docId };
        renderViewCard(newData, card);

        // Refresh master DB in background
        fetchAllRecords();
    } catch (error) {
        console.error("Quick save error:", error);
        showToast("❌ Quick save failed.");
    }
}

/**
 * Fetch and Display All Records
 */
async function fetchAllRecords() {
    dbTbody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:2rem;">Loading Master Database...</td></tr>';

    try {
        const snapshot = await db.collection("erp_v2")
            .orderBy("timestamp", "desc")
            .get();

        dbTbody.innerHTML = "";

        let countTotal = snapshot.size;
        let countE = 0;
        let countI = 0;
        let countT = 0;

        const typeMap = { 'E': 'Local Export', 'I': 'Local Import', 'T': 'T/S' };

        snapshot.docs.forEach(doc => {
            const data = doc.data();

            // Increment type counts
            if (data.type === 'E') countE++;
            else if (data.type === 'I') countI++;
            else if (data.type === 'T') countT++;

            const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="type-badge badge-${data.type?.toLowerCase()}">${data.type || 'E'}</span></td>
                <td>${data.pol || '-'}</td>
                <td>${data.pod || '-'}</td>
                <td>${data.bl_no || '-'}</td>
                <td style="color:var(--msc-yellow); font-weight:700;">${data.container_no || '-'}</td>
                <td>${data.d_vessel || '-'}</td>
                <td>${data.d_date || '-'}</td>
                <td>${data.l_vessel || '-'}</td>
                <td>${data.l_date || '-'}</td>
                <td style="color:var(--accent-yellow);">${data.item_name || '-'}</td>
                <td>${data.remark || '-'}</td>
                <td>${data.pdf_url ? `<a href="${data.pdf_url}" target="_blank" title="View PDF">📄</a>` : '-'}</td>
                <td class="timestamp">${dateStr}</td>
                <td>
                    <button class="btn-delete-db" onclick="deleteRecord('${doc.id}')">D</button>
                </td>
            `;
            dbTbody.appendChild(tr);
        });

        // Update count UI
        dbCount.textContent = countTotal;
        if (dbCountE) dbCountE.textContent = countE;
        if (dbCountI) dbCountI.textContent = countI;
        if (dbCountT) dbCountT.textContent = countT;

        if (countTotal === 0) {
            dbTbody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:2rem;">No records in database.</td></tr>';
        }
    } catch (error) {
        console.error("Fetch error:", error);
        dbTbody.innerHTML = '<tr><td colspan="14" style="text-align:center; color:#ef4444;">Failed to load database.</td></tr>';
    }
}

/**
 * Delete a single record from Firestore
 */
async function deleteRecord(docId) {
    if (!confirm("정말 이 데이터를 삭제하시겠습니까?")) return;

    try {
        await db.collection("erp_v2").doc(docId).delete();
        showToast("🗑️ Record deleted successfully.");
        fetchAllRecords();
    } catch (error) {
        console.error("Delete error:", error);
        showToast("❌ Delete failed.");
    }
}

/**
 * Loads a record into the Data Entry table for editing
 */
function loadForEdit(data) {
    if (entryTbody.children.length === 1 && entryTbody.querySelector('.field-bl').value === "" && entryTbody.querySelector('.field-container').value === "") {
        entryTbody.innerHTML = "";
    }

    createRow({
        type: data.type,
        pol: data.pol,
        pod: data.pod,
        bl: data.bl_no,
        container: data.container_no,
        d_vessel: data.d_vessel,
        d_date: data.d_date,
        l_vessel: data.l_vessel,
        l_date: data.l_date,
        item: data.item_name,
        remark: data.remark,
        pdf_url: data.pdf_url,
        id: data.id
    });

    showToast("📝 Record loaded to Data Management for editing.");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Setup / Config Logic
 */
function showSetupModal() {
    const cfg = JSON.parse(localStorage.getItem('msc_erp_firebase_config') || '{}');
    document.getElementById('cfg-apiKey').value = cfg.apiKey || '';
    document.getElementById('cfg-authDomain').value = cfg.authDomain || '';
    document.getElementById('cfg-projectId').value = cfg.projectId || '';
    document.getElementById('cfg-storageBucket').value = cfg.storageBucket || '';
    document.getElementById('cfg-messagingSenderId').value = cfg.messagingSenderId || '';
    document.getElementById('cfg-appId').value = cfg.appId || '';
    document.getElementById('cfg-measurementId').value = cfg.measurementId || '';

    setupModal.classList.remove('hidden');
}

function closeSetupModal() {
    setupModal.classList.add('hidden');
}

function saveSetup() {
    const config = {
        apiKey: document.getElementById('cfg-apiKey').value.trim(),
        authDomain: document.getElementById('cfg-authDomain').value.trim(),
        projectId: document.getElementById('cfg-projectId').value.trim(),
        storageBucket: document.getElementById('cfg-storageBucket').value.trim(),
        messagingSenderId: document.getElementById('cfg-messagingSenderId').value.trim(),
        appId: document.getElementById('cfg-appId').value.trim(),
        measurementId: document.getElementById('cfg-measurementId').value.trim()
    };

    if (!config.apiKey || !config.projectId) {
        alert("API Key and Project ID are required!");
        return;
    }

    localStorage.setItem('msc_erp_firebase_config', JSON.stringify(config));
    alert("Configuration saved! The page will reload to apply changes.");
    location.reload();
}

function toggleDropdown(trigger) {
    const wrapper = trigger.closest('.custom-select-wrapper');
    const wasActive = wrapper.classList.contains('active');
    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('active'));
    if (!wasActive) wrapper.classList.add('active');
}

function selectOption(li) {
    const wrapper = li.closest('.custom-select-wrapper');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const hiddenInput = wrapper.querySelector('.field-type');
    const value = li.getAttribute('data-value');
    trigger.textContent = value;
    hiddenInput.value = value;
    wrapper.classList.remove('active');
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('active'));
    }
});

// --- Event Listeners ---
btnAddRow.addEventListener('click', () => createRow());
btnBulkSave.addEventListener('click', syncToCloud);
excelUpload.addEventListener('change', handleExcel);
btnSearch.addEventListener('click', () => performSearch('global'));
btnPolSearch.addEventListener('click', () => performSearch('pol'));
btnPodSearch.addEventListener('click', () => performSearch('pod'));
globalSearch.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch('global'); });
polSearch.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch('pol'); });
podSearch.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch('pod'); });
btnRefreshDb.addEventListener('click', fetchAllRecords);

btnShowSetup.addEventListener('click', showSetupModal);
btnCloseSetup.addEventListener('click', closeSetupModal);
btnSaveSetup.addEventListener('click', saveSetup);

// Init
createRow();
fetchAllRecords();
