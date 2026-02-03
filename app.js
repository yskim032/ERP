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

// --- Live Schedule Elements ---
const btnLiveSchedule = document.getElementById('btn-live-schedule');
const scheduleTbody = document.getElementById('schedule-tbody');
const detailModal = document.getElementById('detail-modal');
const detailContent = document.getElementById('detail-content');
const btnCopyAll = document.getElementById('btn-copy-all');
const btnScheduleCaseOnly = document.getElementById('btn-schedule-case-only');
const btnScheduleShowAll = document.getElementById('btn-schedule-show-all');
const ledText = document.getElementById('led-text');

// --- Board Elements ---
const boardNickname = document.getElementById('board-nickname');
const boardText = document.getElementById('board-text');
const boardColor = document.getElementById('board-color');
const boardFontSize = document.getElementById('board-font-size');
const boardFontWeight = document.getElementById('board-font-weight');
const boardAnimate = document.getElementById('board-animate');
const boardSpeed = document.getElementById('board-speed');
const boardPin = document.getElementById('board-pin');
const btnBoardSave = document.getElementById('btn-board-save');
const boardList = document.getElementById('board-list');

// --- State ---
let rowCount = 0;
let allScheduleRows = []; // Cache for Live Schedule filtering
let ledRotationIndex = 0;
let ledRecords = [];
let ledInterval = null;
let boardEntries = []; // Message board storage

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
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length > 0) {
            entryTbody.innerHTML = "";
            json.forEach(row => {
                const find = (keywords, isDate = false) => {
                    const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
                    if (!key) return "";
                    let val = row[key];

                    if (isDate && val) {
                        try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) {
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                            }
                        } catch (err) { console.warn("Date parsing error:", err); }
                    }
                    return val;
                };

                createRow({
                    type: find(['type', '구분']),
                    pol: find(['pol', 'loading', '선적항']),
                    pod: find(['pod', 'discharge port', '양하항']),
                    bl: find(['bl', '비엘']),
                    container: find(['container', '컨테이너']),
                    d_vessel: find(['discharge vessel', '양하선', 'd-vessel']),
                    d_date: find(['discharge date', '양하일', 'd-date'], true),
                    l_vessel: find(['load vessel', '선적선', 'l-vessel']),
                    l_date: find(['load date', '선적일', 'l-date'], true),
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
    const isDUpcoming = isUpcomingDate(data.d_date);
    const isLUpcoming = isUpcomingDate(data.l_date);

    const dVesselHtml = isDUpcoming ? `<span class="past-date-box">${data.d_vessel} (${data.d_date || '-'})</span>` : `${data.d_vessel} (${data.d_date || '-'})`;
    const lVesselHtml = isLUpcoming ? `<span class="past-date-box">${data.l_vessel} (${data.l_date || '-'})</span>` : `${data.l_vessel} (${data.l_date || '-'})`;

    card.innerHTML = `
        <div class="card-top">
            <span class="type-tag tag-${data.type?.toLowerCase()}">${fullType}</span>
            <span class="bl-no">${data.bl_no || 'NO BL'}</span>
        </div>
        <div class="card-grid">
            <span class="item-label">POL/POD:</span><span class="item-value" style="color:var(--msc-yellow)">${data.pol || '-'} / ${data.pod || '-'}</span>
            <span class="item-label">Container:</span><span class="item-value">${data.container_no}</span>
            <span class="item-label">D-Vessel:</span><span class="item-value">${dVesselHtml}</span>
            <span class="item-label">L-Vessel:</span><span class="item-value">${lVesselHtml}</span>
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

            const isDUpcoming = isUpcomingDate(data.d_date);
            const isLUpcoming = isUpcomingDate(data.l_date);

            const dVesselContent = isDUpcoming ? `<span class="past-date-box">${data.d_vessel || '-'}</span>` : (data.d_vessel || '-');
            const dDateContent = isDUpcoming ? `<span class="past-date-box">${data.d_date || '-'}</span>` : (data.d_date || '-');
            const lVesselContent = isLUpcoming ? `<span class="past-date-box">${data.l_vessel || '-'}</span>` : (data.l_vessel || '-');
            const lDateContent = isLUpcoming ? `<span class="past-date-box">${data.l_date || '-'}</span>` : (data.l_date || '-');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="type-badge badge-${data.type?.toLowerCase()}">${data.type || 'E'}</span></td>
                <td>${data.pol || '-'}</td>
                <td>${data.pod || '-'}</td>
                <td>${data.bl_no || '-'}</td>
                <td style="color:var(--msc-yellow); font-weight:700;">${data.container_no || '-'}</td>
                <td>${dVesselContent}</td>
                <td>${dDateContent}</td>
                <td>${lVesselContent}</td>
                <td>${lDateContent}</td>
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

        updateLedTicker(snapshot.docs.map(d => d.data()));

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

/**
 * Live Schedule Logic
 */
async function handleLiveSchedule() {
    try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
            showToast("⚠️ Clipboard is empty.");
            return;
        }

        const lines = text.trim().split('\n');
        const rows = [];

        // Skip header if present (look for Vessel Voyage keywords)
        let startIndex = 0;
        if (lines[0].toLowerCase().includes('vessel') && lines[0].toLowerCase().includes('voyage')) {
            startIndex = 1;
        }

        for (let i = startIndex; i < lines.length; i++) {
            // Split by tabs and filter out empty strings to handle "ghost" columns
            const cols = lines[i].split('\t').map(c => c.trim()).filter(c => c.length > 0);
            if (cols.length < 3) continue; // Need at least Vessel, Voyage, and Arrival

            const vessel = cols[0];
            const voyage = cols[1] || "";
            const arrivalRaw = cols[2] || "";
            const departureRaw = cols[3] || "";
            const service = cols[4] || "";

            rows.push({
                displayVessel: `${vessel} ${voyage}`.trim(),
                searchVessel: vessel,
                arrival: normalizeScheduleDate(arrivalRaw),
                departure: normalizeScheduleDate(departureRaw),
                service: service
            });
        }

        if (rows.length === 0) {
            showToast("⚠️ No valid schedule data found in clipboard.");
            return;
        }

        renderScheduleTable(rows);
    } catch (err) {
        console.error("Clipboard error:", err);
        showToast("❌ Permission denied or clipboard error.");
    }
}

function normalizeScheduleDate(dateStr) {
    if (!dateStr) return "-";
    // Format: "Fr 30/01/2026 03:48" -> "2026-01-30"
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return dateStr;
}

async function renderScheduleTable(rows) {
    scheduleTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Processing...</td></tr>';
    allScheduleRows = []; // Clear previous cache

    allScheduleRows = await Promise.all(rows.map(async (row) => {
        const matches = await matchVesselRecords(row.searchVessel);
        const badges = matches.map(m => `
            <span class="spare-badge badge-${m.type.toLowerCase()}" 
                  onclick='showRecordDetail(${JSON.stringify(m).replace(/'/g, "&apos;")})'
                  title="Click to view details">
                ${m.type}
            </span>
        `).join('');

        const html = `
            <tr>
                <td style="color:var(--msc-yellow); font-weight:700;">${row.displayVessel}</td>
                <td>${row.arrival}</td>
                <td>${row.departure}</td>
                <td style="font-size:0.8rem;">${row.service}</td>
                <td>${badges || '<span style="opacity:0.3">-</span>'}</td>
            </tr>
        `;

        return {
            html: html,
            hasMatches: matches.length > 0
        };
    }));

    applyScheduleFilter(false); // Show all by default
    showToast(`✅ Loaded ${rows.length} schedule items.`);
}

function applyScheduleFilter(showOnlyMatches) {
    if (allScheduleRows.length === 0) return;

    const filtered = showOnlyMatches
        ? allScheduleRows.filter(r => r.hasMatches)
        : allScheduleRows;

    if (filtered.length === 0 && showOnlyMatches) {
        scheduleTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; opacity:0.5;">No matching spare cases found.</td></tr>';
    } else {
        scheduleTbody.innerHTML = filtered.map(r => r.html).join('');
    }

    // Update button active state
    btnScheduleCaseOnly.style.opacity = showOnlyMatches ? "1" : "0.5";
    btnScheduleCaseOnly.style.boxShadow = showOnlyMatches ? "0 0 15px var(--msc-yellow)" : "none";
    btnScheduleShowAll.style.opacity = showOnlyMatches ? "0.5" : "1";
    btnScheduleShowAll.style.boxShadow = showOnlyMatches ? "none" : "0 0 15px var(--msc-yellow)";
}

async function matchVesselRecords(vesselName) {
    const query = vesselName.trim().toUpperCase();
    const results = [];

    // We search both D-Vessel and L-Vessel
    const queries = [
        db.collection("erp_v2").where("d_vessel", "==", query).get(),
        db.collection("erp_v2").where("l_vessel", "==", query).get()
    ];

    const snapshots = await Promise.all(queries);
    const idSet = new Set();

    snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
            if (!idSet.has(doc.id)) {
                idSet.add(doc.id);
                results.push({ ...doc.data(), id: doc.id });
            }
        });
    });

    return results;
}

function showRecordDetail(data) {
    const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : '-';

    detailContent.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">Type:</span><span class="detail-value">${data.type}</span></div>
            <div class="detail-item"><span class="detail-label">POL:</span><span class="detail-value">${data.pol}</span></div>
            <div class="detail-item"><span class="detail-label">POD:</span><span class="detail-value">${data.pod}</span></div>
            <div class="detail-item"><span class="detail-label">BL No:</span><span class="detail-value">${data.bl_no}</span></div>
            <div class="detail-item"><span class="detail-label">Container:</span><span class="detail-value" style="color:var(--msc-yellow)">${data.container_no}</span></div>
            <div class="detail-item"><span class="detail-label">D-Vessel:</span><span class="detail-value">${data.d_vessel} (${data.d_date || '-'})</span></div>
            <div class="detail-item"><span class="detail-label">L-Vessel:</span><span class="detail-value">${data.l_vessel} (${data.l_date || '-'})</span></div>
            <div class="detail-item"><span class="detail-label">Item:</span><span class="detail-value">${data.item_name}</span></div>
            <div class="detail-item"><span class="detail-label">Remark:</span><span class="detail-value">${data.remark || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">Synced:</span><span class="detail-value">${dateStr}</span></div>
        </div>
    `;

    btnCopyAll.onclick = () => {
        const text = `
ERP RECORD DETAIL
-----------------
Type: ${data.type}
POL: ${data.pol}
POD: ${data.pod}
BL No: ${data.bl_no}
Container: ${data.container_no}
D-Vessel: ${data.d_vessel} (${data.d_date})
L-Vessel: ${data.l_vessel} (${data.l_date})
Item: ${data.item_name}
Remark: ${data.remark || '-'}
-----------------
`.trim();
        navigator.clipboard.writeText(text);
        showToast("📋 Copied to clipboard!");
    };

    detailModal.classList.remove('hidden');
}

function closeDetailModal() {
    detailModal.classList.add('hidden');
}

/**
 * LED Ticker Logic
 */
function updateLedTicker(records) {
    if (ledInterval) clearInterval(ledInterval);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validRecords = [];
    records.forEach(r => {
        const dates = [r.d_date, r.l_date].filter(d => d);
        dates.forEach(dateStr => {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
                // Only upcoming dates (today or future)
                if (targetDate >= today) {
                    const diffDays = Math.abs((targetDate - today) / (1000 * 60 * 60 * 24));
                    validRecords.push({
                        vessel: (dateStr === r.d_date ? r.d_vessel : r.l_vessel) || 'N/A',
                        date: dateStr,
                        bl: r.bl_no || 'N/A',
                        container: r.container_no || 'N/A',
                        diff: diffDays
                    });
                }
            }
        });
    });

    // Sort by proximity and take top 3
    ledRecords = validRecords.sort((a, b) => a.diff - b.diff).slice(0, 3);

    if (ledRecords.length === 0) {
        ledText.innerHTML = "No upcoming shipments found.";
        ledText.className = "led-text led-green";
        return;
    }

    // Colors to cycle through in the ribbon
    const colors = ['led-green', 'led-yellow', 'led-orange'];

    // Create the message ribbon (one set of messages)
    const ribbonHtml = ledRecords.map((record, idx) => {
        const colorClass = colors[idx % colors.length];
        return `
            <div class="led-text-item ${colorClass}">
                🚨 URGENT: [${record.vessel}] [${record.date}] BL:[${record.bl}] CNTR:[${record.container}] - PLEASE PROCESS ASAP 🚨
            </div>
        `;
    }).join('');

    // Double the content for a seamless CSS looping animation (0% -> -50%)
    ledText.innerHTML = ribbonHtml + ribbonHtml;
    ledText.className = "led-text"; // Remove specific color from parent

    // Restart animation
    ledText.style.animation = 'none';
    ledText.offsetHeight; // trigger reflow
    ledText.style.animation = null;
}

/**
 * Date Helpers
 */
function isUpcomingDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    // Handle YYYY-MM-DD format explicitly as local time to avoid UTC shifts
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;

    const targetDate = new Date(parts[0], parts[1] - 1, parts[2]); // local time
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today (local time)

    return targetDate >= today;
}

/**
 * Message Board Logic with Firebase
 */
function loadBoard() {
    // Real-time listener for board messages
    db.collection("board_messages")
        .orderBy("timestamp", "desc")
        .limit(50)
        .onSnapshot(snapshot => {
            boardEntries = [];
            snapshot.docs.forEach(doc => {
                boardEntries.push({ ...doc.data(), id: doc.id });
            });
            renderBoard();
        }, error => {
            console.error("Board load error:", error);
            showToast("❌ Failed to load board messages.");
        });
}

async function saveBoardMessage() {
    const nickname = boardNickname.value.trim();
    const text = boardText.value.trim();
    const color = boardColor.value;
    const fontSize = boardFontSize.value;
    const fontWeight = boardFontWeight.value;
    const animateRTL = boardAnimate.checked;
    const scrollSpeed = boardSpeed.value;
    const isPinned = boardPin.checked;

    if (!nickname || !text) {
        showToast("⚠️ Nickname and message are required.");
        return;
    }

    const newEntry = {
        nickname: nickname,
        text: text,
        color: color,
        fontSize: fontSize,
        fontWeight: fontWeight,
        animateRTL: animateRTL,
        scrollSpeed: scrollSpeed,
        isPinned: isPinned,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("board_messages").add(newEntry);

        boardText.value = ""; // Clear message field
        boardPin.checked = false; // Reset pin for next use
        boardAnimate.checked = false; // Reset animation toggle
        showToast("✅ Message posted!");
    } catch (error) {
        console.error("Save error:", error);
        showToast("❌ Failed to save message.");
    }
}

/**
 * Delete a message from the board
 */
async function deleteBoardMessage(id) {
    if (!confirm("Delete this message?")) return;

    try {
        await db.collection("board_messages").doc(id).delete();
        showToast("🗑️ Message deleted.");
    } catch (error) {
        console.error("Delete error:", error);
        showToast("❌ Failed to delete message.");
    }
}

/**
 * Show reply input form
 */
function showReplyForm(messageId, replyToId = null) {
    // Remove any existing reply form
    const existingForm = document.querySelector('.reply-input-form');
    if (existingForm) {
        existingForm.remove();
    }

    const targetId = replyToId || messageId;

    // Create popup form
    const formDiv = document.createElement('div');
    formDiv.className = 'reply-input-form';
    formDiv.innerHTML = `
        <div class="reply-form-header">💬 답글 작성</div>
        <input type="text" id="reply-nickname-${targetId}" placeholder="닉네임" value="${boardNickname.value || ''}" />
        <textarea id="reply-textarea-${targetId}" placeholder="답글을 입력하세요..." rows="1"></textarea>
        <div class="reply-form-actions">
            <button onclick="saveReply('${messageId}', '${replyToId || ''}', 'reply-textarea-${targetId}', 'reply-nickname-${targetId}')">전송</button>
            <button class="cancel" onclick="hideReplyForm()">취소</button>
        </div>
    `;

    document.body.appendChild(formDiv);

    // Auto-focus logic
    // If nickname is empty, focus nickname, else focus textarea
    const nicknameInput = document.getElementById(`reply-nickname-${targetId}`);
    const textarea = document.getElementById(`reply-textarea-${targetId}`);

    if (!nicknameInput.value) {
        nicknameInput.focus();
    } else {
        textarea.focus();
    }

    textarea.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}

function hideReplyForm() {
    const form = document.querySelector('.reply-input-form');
    if (form) {
        form.remove();
    }
}

/**
 * Save reply to a message
 */
async function saveReply(messageId, replyToId, textareaId, nicknameId) {
    const textarea = document.getElementById(textareaId);
    const nicknameInput = document.getElementById(nicknameId);

    const text = textarea?.value.trim();
    // Use the nickname from the popup form
    const nickname = nicknameInput?.value.trim() || "Anonymous";

    if (!text) {
        showToast("⚠️ 답글 내용을 입력하세요.");
        return;
    }

    const newReply = {
        id: Date.now().toString(),
        nickname: nickname,
        text: text,
        timestamp: new Date(),
        replies: []
    };

    try {
        // Get the message document
        const messageDoc = await db.collection("board_messages").doc(messageId).get();

        if (!messageDoc.exists) {
            showToast("❌ 메시지를 찾을 수 없습니다.");
            return;
        }

        const messageData = messageDoc.data();
        let replies = messageData.replies || [];

        if (replyToId) {
            // Add reply to a nested reply
            replies = addNestedReply(replies, replyToId, newReply);
        } else {
            // Add reply to main message
            replies.push(newReply);
        }

        // Update the message with new replies
        await db.collection("board_messages").doc(messageId).update({
            replies: replies,
            lastReplyTime: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast("✅ 답글이 등록되었습니다!");
        hideReplyForm();
    } catch (error) {
        console.error("Reply save error:", error);
        showToast("❌ 답글 저장 실패: " + error.message);
    }
}

/**
 * Recursively add reply to nested structure
 */
function addNestedReply(replies, targetId, newReply) {
    // Set ID if not already set
    if (!newReply.id) {
        newReply.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    return replies.map(reply => {
        if (reply.id === targetId) {
            return {
                ...reply,
                replies: [...(reply.replies || []), newReply]
            };
        } else if (reply.replies && reply.replies.length > 0) {
            return {
                ...reply,
                replies: addNestedReply(reply.replies, targetId, newReply)
            };
        }
        return reply;
    });
}

/**
 * Delete a reply
 */
async function deleteReply(messageId, replyId) {
    if (!confirm("이 답글을 삭제하시겠습니까?")) return;

    try {
        const messageDoc = await db.collection("board_messages").doc(messageId).get();

        if (!messageDoc.exists) {
            showToast("❌ 메시지를 찾을 수 없습니다.");
            return;
        }

        const messageData = messageDoc.data();
        let replies = messageData.replies || [];

        // Remove reply recursively
        replies = removeReplyById(replies, replyId);

        await db.collection("board_messages").doc(messageId).update({ replies });
        showToast("🗑️ 답글이 삭제되었습니다.");
    } catch (error) {
        console.error("Reply delete error:", error);
        showToast("❌ 답글 삭제 실패.");
    }
}

/**
 * Recursively remove reply by ID
 */
function removeReplyById(replies, targetId) {
    return replies.filter(reply => reply.id !== targetId).map(reply => ({
        ...reply,
        replies: reply.replies ? removeReplyById(reply.replies, targetId) : []
    }));
}

function renderBoard() {
    if (!boardList) return;

    // Sort logic: Pinned first, then by timestamp descending (newest first)
    const sortedEntries = [...boardEntries].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Use timestamp for sorting if available
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
    });

    // Get current time for checking if message is recent (within 1 hour)
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

    boardList.innerHTML = sortedEntries.map(entry => {
        const timeStr = entry.timestamp
            ? new Date(entry.timestamp.seconds * 1000).toLocaleString()
            : entry.time || '-';

        // Check if message is less than 1 hour old
        const messageTime = entry.timestamp?.seconds ? entry.timestamp.seconds * 1000 : 0;
        const isRecent = messageTime && (now - messageTime) < oneHourInMs;

        const textStyle = `
            color: ${entry.color || '#fff'}; 
            font-size: ${entry.fontSize || '0.9rem'}; 
            font-weight: ${entry.fontWeight || '400'}; 
            text-shadow: 0 0 8px ${entry.color || '#fff'}80;
            ${entry.animateRTL ? `animation-duration: ${entry.scrollSpeed || 15}s;` : ''}
        `.replace(/\n/g, '').trim();

        // Render replies recursively
        const repliesHtml = entry.replies ? renderReplies(entry.replies, entry.id, 0) : '';

        return `
            <div class="board-item ${entry.isPinned ? 'pinned' : ''} ${isRecent ? 'new-message' : ''}" data-message-id="${entry.id}">
                <span class="nickname">${entry.nickname}</span>
                <span class="time">${timeStr}</span>
                <div class="message-container">
                    <span class="message ${entry.animateRTL ? 'scrolling' : ''}" style="${textStyle}">
                        ${entry.text}
                    </span>
                </div>
                <div style="display: flex; gap: 4px;">
                    ${!entry.isPinned ? `<button class="btn-board-reply" onclick="showReplyForm('${entry.id}')" title="Reply">R</button>` : ''}
                    <button class="btn-board-delete" onclick="deleteBoardMessage('${entry.id}')" title="Delete message">×</button>
                </div>
                <div id="reply-form-${entry.id}" style="display: none; grid-column: 1 / -1;"></div>
                ${repliesHtml ? `<div class="replies-container" style="grid-column: 1 / -1;">${repliesHtml}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Recursive function to render replies
function renderReplies(replies, parentId, depth) {
    if (!replies || replies.length === 0) return '';

    const now = Date.now();

    return replies.map(reply => {
        const timeStr = reply.timestamp
            ? new Date(reply.timestamp.seconds * 1000).toLocaleString()
            : '-';

        const nestedRepliesHtml = reply.replies ? renderReplies(reply.replies, reply.id, depth + 1) : '';

        return `
            <div class="reply-wrapper" data-reply-id="${reply.id}">
                <div class="reply-bubble">
                    <div class="reply-header">
                        <span class="reply-nickname">${reply.nickname}</span>
                        <span class="reply-time">${timeStr}</span>
                    </div>
                    <div class="reply-text">${reply.text}</div>
                    <div class="reply-actions">
                        <button class="btn-board-reply" onclick="showReplyForm('${parentId}', '${reply.id}')" title="Reply" style="font-size: 0.7rem; padding: 2px 6px;">R</button>
                        <button class="btn-board-delete" onclick="deleteReply('${parentId}', '${reply.id}')" title="Delete" style="font-size: 0.9rem; padding: 2px 6px;">×</button>
                    </div>
                </div>
                <div id="reply-form-${reply.id}" style="display: none;"></div>
                ${nestedRepliesHtml ? `<div class="replies-container">${nestedRepliesHtml}</div>` : ''}
            </div>
        `;
    }).join('');
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

btnLiveSchedule.addEventListener('click', handleLiveSchedule);
btnScheduleCaseOnly.addEventListener('click', () => applyScheduleFilter(true));
btnScheduleShowAll.addEventListener('click', () => applyScheduleFilter(false));

btnBoardSave.addEventListener('click', saveBoardMessage);
boardText.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveBoardMessage(); });

// Init
createRow();
fetchAllRecords();
loadBoard();
