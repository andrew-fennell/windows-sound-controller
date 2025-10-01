// State management
let profiles = [];
let audioDevices = { playback: [], recording: [] };
let editingProfileIndex = -1;

// DOM elements
const profilesList = document.getElementById('profiles-list');
const playbackDevicesDiv = document.getElementById('playback-devices');
const recordingDevicesDiv = document.getElementById('recording-devices');
const statusBar = document.getElementById('status-bar');
const addProfileBtn = document.getElementById('add-profile-btn');
const refreshDevicesBtn = document.getElementById('refresh-devices-btn');
const modal = document.getElementById('profile-modal');
const installModal = document.getElementById('install-modal');
const modalTitle = document.getElementById('modal-title');
const profileForm = document.getElementById('profile-form');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancel-btn');
const autoInstallBtn = document.getElementById('auto-install-btn');
const recheckBtn = document.getElementById('recheck-btn');

// Initialize app
async function init() {
    // Check if module is installed
    const moduleCheck = await checkModule();
    if (!moduleCheck) {
        return; // Module not installed, modal is shown
    }

    await loadProfiles();
    await loadAudioDevices();
    renderProfiles();
    renderDevices();
}

// Check if PowerShell module is installed
async function checkModule() {
    const result = await window.electronAPI.checkModule();
    if (result.success && !result.installed) {
        showInstallModal();
        return false;
    } else if (!result.success) {
        showStatus('Error checking module: ' + result.error, 'error');
        return false;
    }
    return true;
}

// Show installation modal
function showInstallModal() {
    installModal.style.display = 'block';
}

// Hide installation modal
function hideInstallModal() {
    installModal.style.display = 'none';
}

// Attempt automatic installation
async function attemptAutoInstall() {
    showStatus('Attempting to install AudioDeviceCmdlets module...', '');
    autoInstallBtn.disabled = true;
    autoInstallBtn.textContent = 'Installing...';

    const result = await window.electronAPI.installModule();

    if (result.success) {
        showStatus('Module installed successfully! Reloading...', 'success');
        hideInstallModal();
        setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        showStatus('Installation failed. Please try manual installation.', 'error');
        autoInstallBtn.disabled = false;
        autoInstallBtn.textContent = 'Install Module Automatically';
    }
}

// Recheck module installation
async function recheckModule() {
    recheckBtn.disabled = true;
    recheckBtn.textContent = 'Checking...';

    const result = await window.electronAPI.checkModule();

    if (result.success && result.installed) {
        showStatus('Module found! Reloading...', 'success');
        hideInstallModal();
        setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        showStatus('Module not found. Please complete installation.', 'error');
        recheckBtn.disabled = false;
        recheckBtn.textContent = 'Check Again';
    }
}

// Load profiles from storage
async function loadProfiles() {
    const result = await window.electronAPI.getProfiles();
    if (result.success) {
        profiles = result.profiles;
    } else {
        showStatus('Error loading profiles: ' + result.error, 'error');
    }
}

// Save profiles to storage
async function saveProfiles() {
    const result = await window.electronAPI.saveProfiles(profiles);
    if (!result.success) {
        showStatus('Error saving profiles: ' + result.error, 'error');
    }
}

// Load audio devices
async function loadAudioDevices() {
    showStatus('Loading audio devices...', '');
    const result = await window.electronAPI.getAudioDevices();

    if (result.success) {
        audioDevices = result.data;
        showStatus('Audio devices loaded successfully', 'success');
    } else {
        if (result.needsInstall) {
            showInstallModal();
        } else {
            showStatus('Error loading devices: ' + result.error, 'error');
        }
    }
}

// Render profiles list
function renderProfiles() {
    if (profiles.length === 0) {
        profilesList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No profiles yet. Click "Add New Profile" to create one.</p>';
        return;
    }

    profilesList.innerHTML = profiles.map((profile, index) => `
        <div class="profile-card">
            <div class="profile-header">
                <div class="profile-name">${escapeHtml(profile.name)}</div>
                <div class="profile-actions">
                    <button class="btn btn-success" onclick="applyProfile(${index})">Apply</button>
                    <button class="btn btn-danger" onclick="deleteProfile(${index})">Delete</button>
                </div>
            </div>
            <div class="profile-info">
                <div><strong>Playback:</strong> ${escapeHtml(profile.playback)}</div>
                <div><strong>Recording:</strong> ${escapeHtml(profile.recording)}</div>
            </div>
        </div>
    `).join('');
}

// Render audio devices
function renderDevices() {
    // Render playback devices
    if (audioDevices.playback && audioDevices.playback.length > 0) {
        playbackDevicesDiv.innerHTML = audioDevices.playback.map(device => `
            <div class="device-item ${device.default ? 'default' : ''}">
                ${escapeHtml(device.name)}
            </div>
        `).join('');
    } else {
        playbackDevicesDiv.innerHTML = '<p style="color: #999;">No playback devices found</p>';
    }

    // Render recording devices
    if (audioDevices.recording && audioDevices.recording.length > 0) {
        recordingDevicesDiv.innerHTML = audioDevices.recording.map(device => `
            <div class="device-item ${device.default ? 'default' : ''}">
                ${escapeHtml(device.name)}
            </div>
        `).join('');
    } else {
        recordingDevicesDiv.innerHTML = '<p style="color: #999;">No recording devices found</p>';
    }
}

// Apply profile
async function applyProfile(index) {
    const profile = profiles[index];
    showStatus(`Applying profile: ${profile.name}...`, '');

    const result = await window.electronAPI.applyProfile(profile);

    if (result.success) {
        showStatus(`✓ Profile "${profile.name}" applied successfully!`, 'success');
        // Refresh devices to show new defaults
        setTimeout(() => {
            loadAudioDevices().then(() => renderDevices());
        }, 500);
    } else {
        showStatus(`Error applying profile: ${result.error}`, 'error');
    }
}

// Delete profile
function deleteProfile(index) {
    if (confirm(`Are you sure you want to delete the profile "${profiles[index].name}"?`)) {
        profiles.splice(index, 1);
        saveProfiles();
        renderProfiles();
        showStatus('Profile deleted', 'success');
    }
}

// Show modal for adding profile
function showAddProfileModal() {
    editingProfileIndex = -1;
    modalTitle.textContent = 'Add New Profile';
    document.getElementById('profile-name').value = '';
    populateDeviceSelects();
    modal.style.display = 'block';
}

// Populate device select dropdowns
function populateDeviceSelects() {
    const playbackSelect = document.getElementById('profile-playback');
    const recordingSelect = document.getElementById('profile-recording');

    // Populate playback devices
    playbackSelect.innerHTML = '<option value="">Select device...</option>' +
        audioDevices.playback.map(device =>
            `<option value="${escapeHtml(device.name)}">${escapeHtml(device.name)}</option>`
        ).join('');

    // Populate recording devices
    recordingSelect.innerHTML = '<option value="">Select device...</option>' +
        audioDevices.recording.map(device =>
            `<option value="${escapeHtml(device.name)}">${escapeHtml(device.name)}</option>`
        ).join('');
}

// Handle profile form submission
function handleProfileSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('profile-name').value.trim();
    const playback = document.getElementById('profile-playback').value;
    const recording = document.getElementById('profile-recording').value;

    if (!name || !playback || !recording) {
        showStatus('Please fill in all fields', 'error');
        return;
    }

    const newProfile = { name, playback, recording };

    if (editingProfileIndex >= 0) {
        profiles[editingProfileIndex] = newProfile;
        showStatus('Profile updated', 'success');
    } else {
        profiles.push(newProfile);
        showStatus('Profile added', 'success');
    }

    saveProfiles();
    renderProfiles();
    modal.style.display = 'none';
}

// Show status message
function showStatus(message, type) {
    statusBar.textContent = message;
    statusBar.className = 'status-bar';
    if (type) {
        statusBar.classList.add(type);
    }

    if (type === 'success') {
        setTimeout(() => {
            statusBar.textContent = '';
            statusBar.className = 'status-bar';
        }, 3000);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
addProfileBtn.addEventListener('click', showAddProfileModal);
refreshDevicesBtn.addEventListener('click', async () => {
    await loadAudioDevices();
    renderDevices();
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

autoInstallBtn.addEventListener('click', attemptAutoInstall);
recheckBtn.addEventListener('click', recheckModule);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

profileForm.addEventListener('submit', handleProfileSubmit);

// Initialize app when DOM is loaded
init();
