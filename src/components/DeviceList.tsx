import React from 'react';
import { AudioDevices } from '../types';

interface DeviceListProps {
  audioDevices: AudioDevices;
  onRefresh: () => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ audioDevices, onRefresh }) => {
  return (
    <section className="current-devices">
      <h2>Available Devices</h2>
      <div className="device-group">
        <h3>Playback Devices</h3>
        <div className="device-list">
          {audioDevices.playback && audioDevices.playback.length > 0 ? (
            audioDevices.playback.map((device, index) => (
              <div key={index} className={`device-item ${device.default ? 'default' : ''}`}>
                {device.name}
              </div>
            ))
          ) : (
            <p style={{ color: '#999' }}>No playback devices found</p>
          )}
        </div>
      </div>
      <div className="device-group">
        <h3>Recording Devices</h3>
        <div className="device-list">
          {audioDevices.recording && audioDevices.recording.length > 0 ? (
            audioDevices.recording.map((device, index) => (
              <div key={index} className={`device-item ${device.default ? 'default' : ''}`}>
                {device.name}
              </div>
            ))
          ) : (
            <p style={{ color: '#999' }}>No recording devices found</p>
          )}
        </div>
      </div>
      <button className="btn btn-secondary" onClick={onRefresh}>
        🔄 Refresh Devices
      </button>
    </section>
  );
};

export default DeviceList;
