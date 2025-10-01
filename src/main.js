const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow;
const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
const scriptPath = path.join(app.getPath('userData'), 'AudioDeviceControl.ps1');

// Copy PowerShell script to userData on startup (to avoid asar issues)
function ensureScriptExists() {
    try {
        const sourceScript = path.join(__dirname, '..', 'scripts', 'AudioDeviceControl.ps1');

        // Check if we need to copy the script
        if (!fs.existsSync(scriptPath) || app.isPackaged) {
            // In production, extract from asar. In dev, copy from scripts folder
            const scriptContent = fs.readFileSync(sourceScript, 'utf8');
            fs.writeFileSync(scriptPath, scriptContent, 'utf8');
        }
        return true;
    } catch (error) {
        console.error('Failed to copy script:', error);
        return false;
    }
}

function createWindow() {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        autoHideMenuBar: true,
        resizable: false
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Helper function to execute PowerShell scripts
function executePowerShell(action, playbackDevice = null, recordingDevice = null) {
    return new Promise((resolve, reject) => {
        // Ensure script is available outside asar
        if (!ensureScriptExists()) {
            reject({ error: 'Failed to initialize PowerShell script' });
            return;
        }

        let command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" -Action ${action}`;

        if (playbackDevice) {
            command += ` -PlaybackDevice "${playbackDevice}"`;
        }
        if (recordingDevice) {
            command += ` -RecordingDevice "${recordingDevice}"`;
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error: error.message, stderr });
                return;
            }
            if (stdout.includes('MODULE_NOT_INSTALLED')) {
                reject({ error: 'MODULE_NOT_INSTALLED', needsInstall: true });
                return;
            }
            if (stdout.includes('MODULE_IMPORT_FAILED')) {
                reject({ error: 'Failed to import AudioDeviceCmdlets module', stderr });
                return;
            }
            resolve(stdout);
        });
    });
}

// IPC Handlers
ipcMain.handle('check-module', async () => {
    try {
        const result = await executePowerShell('check');
        return { success: true, installed: result.includes('MODULE_INSTALLED') };
    } catch (error) {
        if (error.needsInstall) {
            return { success: true, installed: false, needsInstall: true };
        }
        return { success: false, error: error.error || error, installed: false };
    }
});

ipcMain.handle('install-module', async () => {
    try {
        // Ensure script is available outside asar
        if (!ensureScriptExists()) {
            return { success: false, error: 'Failed to initialize PowerShell script' };
        }

        const command = `powershell.exe -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-ExecutionPolicy Bypass -File \\"${scriptPath}\\" -Action install' -Wait"`;

        return new Promise((resolve) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    resolve({ success: false, error: 'Installation failed. Please run PowerShell as Administrator and execute: Install-Module -Name AudioDeviceCmdlets -Force' });
                    return;
                }
                if (stdout.includes('INSTALL_SUCCESS')) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: stdout || stderr });
                }
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-audio-devices', async () => {
    try {
        const result = await executePowerShell('list');
        return { success: true, data: JSON.parse(result) };
    } catch (error) {
        return { success: false, error: error.error || error, needsInstall: error.needsInstall };
    }
});

ipcMain.handle('set-audio-devices', async (event, { playback, recording }) => {
    try {
        const result = await executePowerShell('set', playback, recording);
        if (result.includes('SUCCESS') || result.includes('set to:')) {
            return { success: true };
        }
        return { success: false, error: result };
    } catch (error) {
        return { success: false, error: error.error || error };
    }
});

ipcMain.handle('get-profiles', async () => {
    try {
        if (fs.existsSync(profilesPath)) {
            const data = fs.readFileSync(profilesPath, 'utf8');
            return { success: true, profiles: JSON.parse(data) };
        }
        return { success: true, profiles: [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-profiles', async (event, profiles) => {
    try {
        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('apply-profile', async (event, profile) => {
    try {
        const result = await executePowerShell('set', profile.playback, profile.recording);
        if (result.includes('SUCCESS') || result.includes('set to:')) {
            return { success: true };
        }
        return { success: false, error: result };
    } catch (error) {
        return { success: false, error: error.error || error };
    }
});
