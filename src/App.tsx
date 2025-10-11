import React, { useState, useEffect, useCallback } from 'react';
import { Profile, AudioDevices } from './types';
import ProfileList from './components/ProfileList';
import ProfileModal from './components/ProfileModal';
import DeviceList from './components/DeviceList';
import InstallModal from './components/InstallModal';
import StatusBar from './components/StatusBar';

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [audioDevices, setAudioDevices] = useState<AudioDevices>({
    playback: [],
    recording: [],
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'update' | ''>('');
  const [statusOnClick, setStatusOnClick] = useState<(() => void) | undefined>(undefined);
  const [editingProfileIndex, setEditingProfileIndex] = useState<number | undefined>(undefined);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const showStatus = useCallback((message: string, type: 'success' | 'error' | 'update' | '', onClick?: () => void) => {
    setStatusMessage(message);
    setStatusType(type);
    setStatusOnClick(onClick ? () => onClick : undefined);

    if (type === 'success') {
      setTimeout(() => {
        setStatusMessage('');
        setStatusType('');
        setStatusOnClick(undefined);
      }, 3000);
    }
  }, []);

  const checkModule = useCallback(async () => {
    if (!window.electronAPI) {
      console.warn('Electron API not available - running in browser mode');
      return false;
    }
    const result = await window.electronAPI.checkModule();
    if (result.success && !result.installed) {
      setIsInstallModalOpen(true);
      return false;
    } else if (!result.success) {
      showStatus('Error checking module: ' + result.error, 'error');
      return false;
    }
    return true;
  }, [showStatus]);

  const loadProfiles = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.getProfiles();
    if (result.success) {
      setProfiles(result.profiles);
    } else {
      showStatus('Error loading profiles: ' + result.error, 'error');
    }
  }, [showStatus]);

  const loadAudioDevices = useCallback(async () => {
    if (!window.electronAPI) return;
    showStatus('Loading audio devices...', '');
    const result = await window.electronAPI.getAudioDevices();

    if (result.success && result.data) {
      setAudioDevices(result.data);
      showStatus('Audio devices loaded successfully', 'success');
    } else {
      if (result.needsInstall) {
        setIsInstallModalOpen(true);
      } else {
        showStatus('Error loading devices: ' + result.error, 'error');
      }
    }
  }, [showStatus]);

  const saveProfiles = useCallback(async (newProfiles: Profile[]) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.saveProfiles(newProfiles);
    if (!result.success) {
      showStatus('Error saving profiles: ' + result.error, 'error');
    }
  }, [showStatus]);

  const handleApplyProfile = useCallback(async (index: number) => {
    if (!window.electronAPI) return;
    const profile = profiles[index];
    showStatus(`Applying profile: ${profile.name}...`, '');

    const result = await window.electronAPI.applyProfile(profile);

    if (result.success) {
      showStatus(`✓ Profile "${profile.name}" applied successfully!`, 'success');
      // Refresh devices to show new defaults
      setTimeout(() => {
        loadAudioDevices();
      }, 500);
    } else {
      showStatus(`Error applying profile: ${result.error}`, 'error');
    }
  }, [profiles, showStatus, loadAudioDevices]);

  const handleDeleteProfile = useCallback((index: number) => {
    if (window.confirm(`Are you sure you want to delete the profile "${profiles[index].name}"?`)) {
      const newProfiles = [...profiles];
      newProfiles.splice(index, 1);
      setProfiles(newProfiles);
      saveProfiles(newProfiles);
      showStatus('Profile deleted', 'success');
    }
  }, [profiles, saveProfiles, showStatus]);

  const handleSaveProfile = useCallback((profile: Profile, index?: number) => {
    if (index !== undefined) {
      // Edit existing profile
      const newProfiles = [...profiles];
      newProfiles[index] = profile;
      setProfiles(newProfiles);
      saveProfiles(newProfiles);
      showStatus('Profile updated', 'success');
    } else {
      // Add new profile
      const newProfiles = [...profiles, profile];
      setProfiles(newProfiles);
      saveProfiles(newProfiles);
      showStatus('Profile added', 'success');
    }
  }, [profiles, saveProfiles, showStatus]);

  const handleEditProfile = useCallback((index: number) => {
    setEditingProfileIndex(index);
    setEditingProfile(profiles[index]);
    setIsModalOpen(true);
  }, [profiles]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingProfileIndex(undefined);
    setEditingProfile(null);
  }, []);

  const handleInstallModule = useCallback(async () => {
    if (!window.electronAPI) return;
    showStatus('Attempting to install AudioDeviceCmdlets module...', '');
    const result = await window.electronAPI.installModule();

    if (result.success) {
      showStatus('Module installed successfully! Reloading...', 'success');
      setIsInstallModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showStatus('Installation failed. Please try manual installation.', 'error');
    }
  }, [showStatus]);

  const handleRecheckModule = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.checkModule();

    if (result.success && result.installed) {
      showStatus('Module found! Reloading...', 'success');
      setIsInstallModalOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showStatus('Module not found. Please complete installation.', 'error');
    }
  }, [showStatus]);

  useEffect(() => {
    const init = async () => {
      const moduleInstalled = await checkModule();
      if (!moduleInstalled) return;

      await loadProfiles();
      await loadAudioDevices();
    };

    init();

    // Listen for profile applied from shortcuts or tray
    if (window.electronAPI) {
      window.electronAPI.onProfileApplied((_event, profileName) => {
        showStatus(`✓ Profile "${profileName}" applied successfully!`, 'success');
        loadAudioDevices();
      });

      // Listen for update available notifications
      window.electronAPI.onUpdateAvailable((_event, updateInfo: any) => {
        if (updateInfo.available) {
          showStatus(
            `Update available: ${updateInfo.latestVersion} (current: v${updateInfo.currentVersion}) - Click to download`,
            'update',
            async () => {
              await window.electronAPI.openReleasesPage();
            }
          );
        } else if (updateInfo.upToDate) {
          showStatus(`You're up to date! (v${updateInfo.currentVersion})`, 'success');
        } else if (updateInfo.error) {
          showStatus(updateInfo.message || 'Unable to check for updates', 'error');
        }
      });
    }
  }, [checkModule, loadProfiles, loadAudioDevices, showStatus]);

  return (
    <div className="container">
      <header>
        <h1>🔊 Windows Sound Controller</h1>
        <p>Switch between different audio device configurations</p>
      </header>

      <div className="main-content">
        <ProfileList
          profiles={profiles}
          onApply={handleApplyProfile}
          onEdit={handleEditProfile}
          onDelete={handleDeleteProfile}
          onAddNew={() => {
            setEditingProfileIndex(undefined);
            setEditingProfile(null);
            setIsModalOpen(true);
          }}
        />
        <DeviceList
          audioDevices={audioDevices}
          onRefresh={loadAudioDevices}
        />
      </div>

      <StatusBar message={statusMessage} type={statusType} onClick={statusOnClick} />

      <ProfileModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProfile}
        audioDevices={audioDevices}
        onError={(msg) => showStatus(msg, 'error')}
        editingProfile={editingProfile}
        editingIndex={editingProfileIndex}
      />

      <InstallModal
        isOpen={isInstallModalOpen}
        onInstall={handleInstallModule}
        onRecheck={handleRecheckModule}
        onStatusChange={showStatus}
      />
    </div>
  );
};

export default App;
