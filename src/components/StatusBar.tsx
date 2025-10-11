import React from 'react';

interface StatusBarProps {
  message: string;
  type?: 'success' | 'error' | 'update' | '';
  onClick?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ message, type = '', onClick }) => {
  return (
    <div
      className={`status-bar ${type} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={onClick ? 'Click to view details' : ''}
    >
      {message}
    </div>
  );
};

export default StatusBar;
