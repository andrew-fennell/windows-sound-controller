const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    checkModule: () => ipcRenderer.invoke('check-module'),
    installModule: () => ipcRenderer.invoke('install-module'),
    getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
    setAudioDevices: (devices) => ipcRenderer.invoke('set-audio-devices', devices),
    getProfiles: () => ipcRenderer.invoke('get-profiles'),
    saveProfiles: (profiles) => ipcRenderer.invoke('save-profiles', profiles),
    applyProfile: (profile) => ipcRenderer.invoke('apply-profile', profile),
    onProfileApplied: (callback) => ipcRenderer.on('profile-applied', callback),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    openReleasesPage: () => ipcRenderer.invoke('open-releases-page')
});
