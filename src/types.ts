export interface AudioDevice {
  name: string;
  default: boolean;
}

export interface AudioDevices {
  playback: AudioDevice[];
  recording: AudioDevice[];
}

export interface Profile {
  name: string;
  playback: string;
  recording: string;
  shortcut?: string;
}

export interface ElectronAPI {
  checkModule: () => Promise<{ success: boolean; installed: boolean; needsInstall?: boolean; error?: string }>;
  installModule: () => Promise<{ success: boolean; error?: string }>;
  getAudioDevices: () => Promise<{ success: boolean; data?: AudioDevices; error?: string; needsInstall?: boolean }>;
  setAudioDevices: (devices: { playback: string; recording: string }) => Promise<{ success: boolean; error?: string }>;
  getProfiles: () => Promise<{ success: boolean; profiles: Profile[]; error?: string }>;
  saveProfiles: (profiles: Profile[]) => Promise<{ success: boolean; error?: string }>;
  applyProfile: (profile: Profile) => Promise<{ success: boolean; error?: string }>;
  onProfileApplied: (callback: (event: unknown, profileName: string) => void) => void;
  onUpdateAvailable: (callback: (event: unknown, updateInfo: { latestVersion: string; currentVersion: string }) => void) => void;
  openReleasesPage: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
