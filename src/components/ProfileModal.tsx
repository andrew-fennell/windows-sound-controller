import React, { useState, useEffect } from 'react';
import { Profile, AudioDevices } from '../types';
import ShortcutInput from './ShortcutInput';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Profile, index?: number) => void;
  audioDevices: AudioDevices;
  onError: (message: string) => void;
  editingProfile?: Profile | null;
  editingIndex?: number;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  audioDevices,
  onError,
  editingProfile = null,
  editingIndex
}) => {
  const [name, setName] = useState('');
  const [playback, setPlayback] = useState('');
  const [recording, setRecording] = useState('');
  const [shortcut, setShortcut] = useState('');

  useEffect(() => {
    if (isOpen && editingProfile) {
      // Load profile data when editing
      setName(editingProfile.name);
      setPlayback(editingProfile.playback);
      setRecording(editingProfile.recording);
      setShortcut(editingProfile.shortcut || '');
    } else if (!isOpen) {
      // Reset form when modal closes
      setName('');
      setPlayback('');
      setRecording('');
      setShortcut('');
    }
  }, [isOpen, editingProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !playback || !recording) {
      onError('Please fill in all required fields');
      return;
    }

    const newProfile: Profile = { name, playback, recording };
    if (shortcut) {
      newProfile.shortcut = shortcut;
    }

    onSave(newProfile, editingIndex);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }} onClick={handleBackdropClick}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>{editingProfile ? 'Edit Profile' : 'Add New Profile'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="profile-name">Profile Name:</label>
            <input
              type="text"
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-playback">Playback Device:</label>
            <select
              id="profile-playback"
              value={playback}
              onChange={(e) => setPlayback(e.target.value)}
              required
            >
              <option value="">Select device...</option>
              {audioDevices.playback.map((device, index) => (
                <option key={index} value={device.name}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="profile-recording">Recording Device:</label>
            <select
              id="profile-recording"
              value={recording}
              onChange={(e) => setRecording(e.target.value)}
              required
            >
              <option value="">Select device...</option>
              {audioDevices.recording.map((device, index) => (
                <option key={index} value={device.name}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
          <ShortcutInput value={shortcut} onChange={setShortcut} onError={onError} />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Save Profile</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
