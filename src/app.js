let routerDatabase = [];
let showPasswords = false;
let activeDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // Wire up Loading Overlay Action Buttons
    document.getElementById('btn-retry-conn').addEventListener('click', () => {
        window.location.reload();
    });

    document.getElementById('btn-go-offline').addEventListener('click', () => {
        setupOfflineMode();
    });

    // Run Connection Diagnostics Check Sequence
    await initializeAppConnection();

    // Form Event Listener
    document.getElementById('router-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const record = {
            id: Date.now().toString(),
            ownerName: document.getElementById('ownerName').value,
            ownerPhone: document.getElementById('ownerPhone').value || 'N/A',
            mikrotikType: document.getElementById('mikrotikType').value || 'Generic Router',
            ztIp: document.getElementById('ztIp').value,
            ztEmail: document.getElementById('ztEmail').value || 'N/A',
            mtUser: document.getElementById('mtUser').value || 'admin',
            mtPass: document.getElementById('mtPass').value || 'None Set',
            notes: document.getElementById('notes').value || ''
        };

        const success = await API.save(record);
        if (success) {
            if (API.isOffline) {
                routerDatabase.push(record);
                showToast("Saved locally to browser safemode storage!", "warning");
            } else {
                routerDatabase = await API.fetchAll();
                showToast("Device safely synced to cloud cloud vault!", "success");
            }
            renderTable(routerDatabase);
            e.target.reset();
        }
    });

    // Search Filtering
    document.getElementById('search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = routerDatabase.filter(item =>
            item.ownerName.toLowerCase().includes(query) ||
            item.ztIp.includes(query) ||
            item.mikrotikType.toLowerCase().includes(query)
        );
        renderTable(filtered);
    });

    // View Toggle
    document.getElementById('toggle-passwords').addEventListener('click', () => {
        showPasswords = !showPasswords;
        const btn = document.getElementById('toggle-passwords');
        btn.innerHTML = showPasswords ?
            `<i data-lucide="eye-off" class="w-4 h-4"></i> <span>Hide Sensitive Data</span>` :
            `<i data-lucide="eye" class="w-4 h-4"></i> <span>Show Sensitive Data</span>`;
        lucide.createIcons();
        renderTable(routerDatabase);
    });
});

/**
 * Orchestrates application verification checks
 */
async function initializeAppConnection() {
    const isConnected = await API.testConnection();

    if (isConnected) {
        // Hide loader overlay smooth path
        document.getElementById('loading-overlay').classList.add('hidden');

        // Adjust navigation status layout values
        document.getElementById('status-dot').className = "inline-block w-2 h-2 rounded-full bg-green-500 mr-2";
        document.getElementById('status-text').textContent = "Cloud Sync Active";
        document.getElementById('storage-mode-text').textContent = "Supabase DB";
        document.getElementById('storage-mode-text').className = "text-base font-bold text-sky-600";

        routerDatabase = await API.fetchAll();
        renderTable(routerDatabase);
    } else {
        // Connection error interface state shift
        document.getElementById('loader-spinner').classList.add('hidden');
        document.getElementById('loader-fail-actions').classList.remove('hidden');
        lucide.createIcons();
    }
}

/**
 * Forces execution parameters to prioritize safe localized localStorage state engines
 */
async function setupOfflineMode() {
    API.isOffline = true;
    document.getElementById('loading-overlay').classList.add('hidden');

    document.getElementById('status-dot').className = "inline-block w-2 h-2 rounded-full bg-amber-500 mr-2";
    document.getElementById('status-text').textContent = "Running Offline Mode";
    document.getElementById('storage-mode-text').textContent = "Local Storage Browser";
    document.getElementById('storage-mode-text').className = "text-base font-bold text-amber-600";

    routerDatabase = await API.fetchAll();
    renderTable(routerDatabase);
}

function renderTable(data) {
    const tbody = document.getElementById('router-table-body');
    const emptyState = document.getElementById('empty-state');
    tbody.innerHTML = '';

    document.getElementById('stat-total').textContent = routerDatabase.length;

    if (data.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition duration-150";
        tr.innerHTML = `
            <td class="p-4">
                <div class="font-medium text-slate-900">${item.ownerName}</div>
                <div class="text-xs text-slate-400 flex items-center mt-0.5"><i data-lucide="phone" class="w-3 h-3 mr-1"></i>${item.ownerPhone}</div>
            </td>
            <td class="p-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">${item.mikrotikType}</span>
                <div class="text-xs text-gray-400 mt-1 max-w-[150px] truncate" title="${item.notes}">${item.notes || 'No custom configurations'}</div>
            </td>
            <td class="p-4">
                <code class="text-xs font-mono bg-sky-50 text-sky-700 px-2 py-1 rounded border border-sky-100">${item.ztIp}</code>
                <div class="text-[11px] text-gray-400 mt-1 truncate max-w-[140px]">${item.ztEmail}</div>
            </td>
            <td class="p-4 font-mono text-xs">
                <div class="text-slate-600">U: ${item.mtUser}</div>
                <div class="text-slate-400 mt-0.5">P: ${showPasswords ? item.mtPass : '••••••••'}</div>
            </td>
            <td class="p-4 text-right">
                <button onclick="deleteDevice('${item.id}')" class="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition inline-flex items-center">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

/**
 * Opens the custom interface confirmation window
 */
function deleteDevice(id) {
    activeDeleteId = id;

    const modal = document.getElementById('delete-modal');
    const modalBox = document.getElementById('delete-modal-box');

    // Unhide modal framework container
    modal.classList.remove('hidden');

    // Trigger CSS entry animations smoothly
    setTimeout(() => {
        modalBox.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

/**
 * Closes the custom window safely resetting tracking states
 */
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const modalBox = document.getElementById('delete-modal-box');

    modalBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        activeDeleteId = null;
    }, 200);
}

// Register Modal Actions after content loads
document.addEventListener('DOMContentLoaded', () => {
    // Cancel Button click
    document.getElementById('modal-cancel-btn').addEventListener('click', closeDeleteModal);

    // Explicit Confirm Button click execution path
    document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
        if (!activeDeleteId) return;

        const success = await API.delete(activeDeleteId);
        if (success) {
            routerDatabase = routerDatabase.filter(r => r.id !== activeDeleteId);
            renderTable(routerDatabase);

            if (API.isOffline) {
                showToast("Device entry removed from local storage.", "warning");
            } else {
                showToast("Device permanently deleted from cloud database.", "error");
            }
        } else {
            showToast("Failed to delete device. Check connection.", "error");
        }

        // Wrap up execution state by closing modal view window layer
        closeDeleteModal();
    });
});

/**
 * Triggers a professional, animated toast notification banner
 * @param {string} message - Text context to show
 * @param {'success' | 'error' | 'warning'} type - Accent coloring configuration
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    // Pick theme colors based on type
    let bg = 'bg-emerald-600';
    let icon = 'check-circle';
    if (type === 'error') { bg = 'bg-rose-600'; icon = 'alert-triangle'; }
    if (type === 'warning') { bg = 'bg-amber-600'; icon = 'alert-circle'; }

    // Build the layout structures
    toast.className = `${bg} text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-3 pointer-events-auto transform translate-y-4 opacity-0 transition duration-300 ease-out text-sm font-medium`;
    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Trigger standard CSS entry animation
    setTimeout(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);

    // Automatically dismiss and slide away after 4 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}