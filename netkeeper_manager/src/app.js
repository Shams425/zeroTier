let routerDatabase = [];
let showPasswords = false;
let activeDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // Bind Loading Actions Overlay Buttons
    document.getElementById('btn-retry-conn').addEventListener('click', () => window.location.reload());
    document.getElementById('btn-go-offline').addEventListener('click', () => setupOfflineMode());

    // Bind Reconnect Action button on target indicator metric card
    document.getElementById('btn-reconnect-action').addEventListener('click', async () => {
        document.getElementById('loading-overlay').classList.remove('hidden');
        document.getElementById('loader-spinner').classList.remove('hidden');
        document.getElementById('loader-fail-actions').classList.add('hidden');
        await initializeAppConnection();
    });

    // Cancel Edit tracking clear hatch
    document.getElementById('btn-cancel-edit').addEventListener('click', resetFormState);

    // Run connection engine diagnostic checks on launch
    await initializeAppConnection();

    // Form Event Control Layer
    document.getElementById('router-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const targetId = document.getElementById('edit-target-id').value;

        const record = {
            id: targetId ? targetId : Date.now().toString(), // Maintain original tracking identification signature if editing
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
            showToast(targetId ? "Deployment setup modified successfully!" : "Device added to network registry!", "success");
            resetFormState();
            routerDatabase = await API.fetchAll();
            renderTable(routerDatabase);
        } else {
            showToast("Transaction error: Sync pipeline execution blocked.", "error");
        }
    });

    // Search and View Passwords listeners
    document.getElementById('search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = routerDatabase.filter(item =>
            item.ownerName.toLowerCase().includes(query) ||
            item.ztIp.includes(query) ||
            item.mikrotikType.toLowerCase().includes(query)
        );
        renderTable(filtered);
    });

    document.getElementById('toggle-passwords').addEventListener('click', () => {
        showPasswords = !showPasswords;
        const btn = document.getElementById('toggle-passwords');
        btn.innerHTML = showPasswords ?
            `<i data-lucide="eye-off" class="w-4 h-4"></i> <span>Hide Sensitive Data</span>` :
            `<i data-lucide="eye" class="w-4 h-4"></i> <span>Show Sensitive Data</span>`;
        lucide.createIcons();
        renderTable(routerDatabase);
    });

    // Modal delete confirmation structures binding handles
    document.getElementById('modal-cancel-btn').addEventListener('click', closeDeleteModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
        if (!activeDeleteId) return;
        const success = await API.delete(activeDeleteId);
        if (success) {
            routerDatabase = routerDatabase.filter(r => r.id !== activeDeleteId);
            renderTable(routerDatabase);
            showToast("Device permanently deleted from runtime registry.", "error");
        }
        closeDeleteModal();
    });
});

async function initializeAppConnection() {
    const isConnected = await API.testConnection();

    if (isConnected) {
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('btn-reconnect-action').classList.add('hidden'); // Hide reconnect utility if safe online execution paths hold

        document.getElementById('status-dot').className = "inline-block w-2 h-2 rounded-full bg-green-500 mr-2";
        document.getElementById('status-text').textContent = "Cloud Sync Active";
        document.getElementById('storage-mode-text').textContent = "Supabase DB";
        document.getElementById('storage-mode-text').className = "text-base font-bold text-sky-600";
    } else {
        document.getElementById('loader-spinner').classList.add('hidden');
        document.getElementById('loader-fail-actions').classList.remove('hidden');
        lucide.createIcons();
        return;
    }
    routerDatabase = await API.fetchAll();
    renderTable(routerDatabase);
}

function setupOfflineMode() {
    API.isOffline = true;
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('btn-reconnect-action').classList.remove('hidden'); // Reveal reconnect target tool switch layout button

    document.getElementById('status-dot').className = "inline-block w-2 h-2 rounded-full bg-amber-500 mr-2";
    document.getElementById('status-text').textContent = "Offline Safe-Mode Mode";
    document.getElementById('storage-mode-text').textContent = "Local Browser Mirror";
    document.getElementById('storage-mode-text').className = "text-base font-bold text-amber-600";

    API.fetchAll().then(data => {
        routerDatabase = data;
        renderTable(routerDatabase);
    });
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
                <div class="text-xs text-gray-400 mt-1 max-w-[150px] truncate" title="${item.notes}">${item.notes || ''}</div>
            </td>
            <td class="p-4">
                <code class="text-xs font-mono bg-sky-50 text-sky-700 px-2 py-1 rounded border border-sky-100">${item.ztIp}</code>
                <div class="text-[11px] text-gray-400 mt-1 truncate max-w-[140px]">${item.ztEmail}</div>
            </td>
            <td class="p-4 font-mono text-xs">
                <div class="text-slate-600">U: ${item.mtUser}</div>
                <div class="text-slate-400 mt-0.5">P: ${showPasswords ? item.mtPass : '••••••••'}</div>
            </td>
            <td class="p-4 text-right space-x-1">
                <button onclick="editDevice('${item.id}')" class="text-sky-600 hover:text-sky-800 p-1.5 hover:bg-sky-50 rounded-lg transition inline-flex items-center">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="triggerDeleteModal('${item.id}')" class="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition inline-flex items-center">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

/**
 * Automatically maps target data parameters right back onto the configuration editing workspace inputs
 */
function editDevice(id) {
    const device = routerDatabase.find(r => r.id === id);
    if (!device) return;

    // Load inputs parameters metrics values fields
    document.getElementById('edit-target-id').value = device.id;
    document.getElementById('ownerName').value = device.ownerName;
    document.getElementById('ownerPhone').value = device.ownerPhone === 'N/A' ? '' : device.ownerPhone;
    document.getElementById('mikrotikType').value = device.mikrotikType === 'Generic Router' ? '' : device.mikrotikType;
    document.getElementById('ztIp').value = device.ztIp;
    document.getElementById('ztEmail').value = device.ztEmail === 'N/A' ? '' : device.ztEmail;
    document.getElementById('mtUser').value = device.mtUser;
    document.getElementById('mtPass').value = device.mtPass === 'None Set' ? '' : device.mtPass;
    document.getElementById('notes').value = device.notes;

    // Mutate form display container visual layout cues configurations
    document.getElementById('form-title').textContent = "Modify MikroTik Setup";
    document.getElementById('submit-text').textContent = "Apply Adjustments";
    document.getElementById('form-icon').setAttribute('data-lucide', 'edit-3');
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    lucide.createIcons();

    // Scroll smoothly straight up to the input column module block
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormState() {
    document.getElementById('router-form').reset();
    document.getElementById('edit-target-id').value = "";
    document.getElementById('form-title').textContent = "Add New MikroTik";
    document.getElementById('submit-text').textContent = "Save Device";
    document.getElementById('form-icon').setAttribute('data-lucide', 'plus-circle');
    document.getElementById('btn-cancel-edit').classList.add('hidden');
    lucide.createIcons();
}

function triggerDeleteModal(id) {
    activeDeleteId = id;
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('delete-modal-box').classList.remove('scale-95', 'opacity-0'), 10);
}

function closeDeleteModal() {
    const modalBox = document.getElementById('delete-modal-box');
    modalBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        document.getElementById('delete-modal').classList.add('hidden');
        activeDeleteId = null;
    }, 200);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let bg = 'bg-emerald-600', icon = 'check-circle';
    if (type === 'error') { bg = 'bg-rose-600'; icon = 'alert-triangle'; }
    if (type === 'warning') { bg = 'bg-amber-600'; icon = 'alert-circle'; }

    toast.className = `${bg} text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-3 pointer-events-auto transform translate-y-4 opacity-0 transition duration-300 ease-out text-sm font-medium`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}