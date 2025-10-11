import React, { useState, useRef } from 'react';

interface ShortcutInputProps {
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}

const ShortcutInput: React.FC<ShortcutInputProps> = ({ value, onChange, onError }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setIsCapturing(true);
    if (inputRef.current) {
      inputRef.current.style.background = '#fffacd';
    }
  };

  const handleBlur = () => {
    setIsCapturing(false);
    if (inputRef.current) {
      inputRef.current.style.background = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCapturing) return;

    e.preventDefault();
    e.stopPropagation();

    // Build the shortcut string
    const parts: string[] = [];

    // Check for modifier keys
    if (e.ctrlKey || e.metaKey) {
      parts.push('Control');
    }
    if (e.altKey) {
      parts.push('Alt');
    }
    if (e.shiftKey) {
      parts.push('Shift');
    }

    // Get the key using e.code for physical key position
    const code = e.code;
    const key = e.key;
    const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'OS', 'Win'];

    if (!modifierKeys.includes(key)) {
      // Normalize the key based on e.code (physical key)
      let normalizedKey = '';

      // Handle digit keys (Digit0-9)
      if (code.startsWith('Digit')) {
        normalizedKey = code.replace('Digit', '');
      }
      // Handle letter keys (KeyA-Z)
      else if (code.startsWith('Key')) {
        normalizedKey = code.replace('Key', '');
      }
      // Handle function keys (F1-F24)
      else if (code.startsWith('F') && code.length <= 3) {
        normalizedKey = code;
      }
      // Handle special keys
      else if (code === 'Space') {
        normalizedKey = 'Space';
      }
      else if (code.startsWith('Arrow')) {
        normalizedKey = code.replace('Arrow', '');
      }
      else if (code === 'Minus') {
        normalizedKey = '-';
      }
      else if (code === 'Equal') {
        normalizedKey = '=';
      }
      else if (code === 'BracketLeft') {
        normalizedKey = '[';
      }
      else if (code === 'BracketRight') {
        normalizedKey = ']';
      }
      else if (code === 'Backslash') {
        normalizedKey = '\\';
      }
      else if (code === 'Semicolon') {
        normalizedKey = ';';
      }
      else if (code === 'Quote') {
        normalizedKey = '\'';
      }
      else if (code === 'Comma') {
        normalizedKey = ',';
      }
      else if (code === 'Period') {
        normalizedKey = '.';
      }
      else if (code === 'Slash') {
        normalizedKey = '/';
      }
      else if (code === 'Backquote') {
        normalizedKey = '`';
      }
      // Handle numpad keys
      else if (code.startsWith('Numpad')) {
        normalizedKey = code;
      }
      // For other keys, use the key value
      else if (key.length === 1) {
        normalizedKey = key.toUpperCase();
      }
      else {
        normalizedKey = key;
      }

      if (normalizedKey) {
        parts.push(normalizedKey);
      }
    }

    // Only set if we have at least one modifier and a key
    if (parts.length >= 2) {
      const shortcut = parts.join('+');
      onChange(shortcut);
    } else if (parts.length === 1 && !modifierKeys.includes(key)) {
      // Just a single key without modifiers - show warning
      onError('Please use at least one modifier key (Ctrl, Alt, Shift)');
    }
  };

  return (
    <div className="form-group">
      <label htmlFor="profile-shortcut">Keyboard Shortcut (optional):</label>
      <input
        ref={inputRef}
        type="text"
        id="profile-shortcut"
        value={value}
        readOnly
        placeholder={isCapturing ? 'Press your key combination...' : 'Click here and press your key combination...'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <small style={{ color: '#999', fontSize: '12px', display: 'block', marginTop: '5px' }}>
        Click the field above and press your desired key combination (e.g., Ctrl+Shift+1)
      </small>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginTop: '5px', fontSize: '12px', padding: '5px 10px' }}
        onClick={() => onChange('')}
      >
        Clear Shortcut
      </button>
    </div>
  );
};

export default ShortcutInput;
