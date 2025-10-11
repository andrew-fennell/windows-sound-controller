import React, { useState } from 'react';

interface InstallModalProps {
  isOpen: boolean;
  onInstall: () => Promise<void>;
  onRecheck: () => Promise<void>;
  onStatusChange: (message: string, type: 'success' | 'error' | '') => void;
}

const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onInstall, onRecheck }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    await onInstall();
    setIsInstalling(false);
  };

  const handleRecheck = async () => {
    setIsRechecking(true);
    await onRecheck();
    setIsRechecking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content install-modal">
        <h2>⚠️ Required Module Not Found</h2>
        <p>This application requires the <strong>AudioDeviceCmdlets</strong> PowerShell module to control Windows audio devices.</p>

        <div className="install-options">
          <div className="install-option">
            <h3>Option 1: Automatic Installation (Recommended)</h3>
            <p>Click the button below to install the module. This will open PowerShell with administrator privileges.</p>
            <button
              className="btn btn-primary"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              {isInstalling ? 'Installing...' : 'Install Module Automatically'}
            </button>
          </div>

          <div className="install-option">
            <h3>Option 2: Manual Installation</h3>
            <p>Open PowerShell as Administrator and run:</p>
            <code className="install-command">Install-Module -Name AudioDeviceCmdlets -Force</code>
            <p style={{ marginTop: '10px' }}>After installation, click:</p>
            <button
              className="btn btn-secondary"
              onClick={handleRecheck}
              disabled={isRechecking}
            >
              {isRechecking ? 'Checking...' : 'Check Again'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallModal;
