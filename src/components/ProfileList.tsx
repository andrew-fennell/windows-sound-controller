import React from 'react';
import { Profile } from '../types';

interface ProfileListProps {
  profiles: Profile[];
  onApply: (index: number) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onAddNew: () => void;
}

const ProfileList: React.FC<ProfileListProps> = ({ profiles, onApply, onEdit, onDelete, onAddNew }) => {
  return (
    <section className="profiles-section">
      <h2>Sound Profiles</h2>
      <div className="profiles-list">
        {profiles.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
            No profiles yet. Click "Add New Profile" to create one.
          </p>
        ) : (
          profiles.map((profile, index) => (
            <div key={index} className="profile-card">
              <div className="profile-name">
                {profile.name}
                {profile.shortcut && (
                  <span className="shortcut-badge">{profile.shortcut}</span>
                )}
              </div>
              <div className="profile-info">
                <div><strong>Playback:</strong> {profile.playback}</div>
                <div><strong>Recording:</strong> {profile.recording}</div>
              </div>
              <div className="profile-actions">
                <button className="btn btn-success" onClick={() => onApply(index)}>
                  Apply
                </button>
                <button className="btn btn-secondary" onClick={() => onEdit(index)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => onDelete(index)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button className="btn btn-primary" onClick={onAddNew}>
        + Add New Profile
      </button>
    </section>
  );
};

export default ProfileList;
