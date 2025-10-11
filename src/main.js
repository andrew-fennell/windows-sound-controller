const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { checkForUpdates, openReleasesPage } = require('./updateChecker');

let mainWindow;
let tray = null;
let profilesPath;
let scriptPath;

// Initialize paths after app is ready
function initPaths() {
    profilesPath = path.join(app.getPath('userData'), 'profiles.json');
    scriptPath = path.join(app.getPath('userData'), 'AudioDeviceControl.ps1');
}

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

    // Load the React build
    // Check if dist-react exists, if not, the app is running in packaged mode
    const distPath = path.join(__dirname, '..', 'dist-react', 'index.html');
    const distExists = fs.existsSync(distPath);

    if (distExists) {
        // Load from built files
        mainWindow.loadFile(distPath);
    } else if (app.isPackaged) {
        // Packaged mode - load from asar
        mainWindow.loadFile(path.join(__dirname, '..', 'dist-react', 'index.html'));
    } else {
        // Development mode with Vite dev server
        mainWindow.loadURL('http://localhost:5173').catch(() => {
            console.error('Could not connect to Vite dev server at http://localhost:5173');
            console.error('Please run "npm run dev" in another terminal first.');
        });
    }

    // Minimize to tray instead of taskbar
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    // Prevent closing, minimize to tray instead
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

// Create system tray
function createTray() {
    // Try multiple icon paths for dev and production
    let iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

    // In packaged app, resources are in different location
    if (app.isPackaged) {
        iconPath = path.join(process.resourcesPath, 'assets', 'icon.png');
    }

    // Check if icon exists, if not try alternative paths
    if (!fs.existsSync(iconPath)) {
        iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
    }

    // Create tray icon
    const trayIcon = nativeImage.createFromPath(iconPath);

    // Check if icon loaded successfully
    if (trayIcon.isEmpty()) {
        console.error('Failed to load tray icon from:', iconPath);
        // Create a default icon as fallback
        tray = new Tray(nativeImage.createEmpty());
    } else {
        tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    }

    tray.setToolTip('Windows Sound Controller');

    // Build initial tray menu
    updateTrayMenu();

    // Show window on tray icon click
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });
}

// Update tray menu with current profiles
function updateTrayMenu() {
    let profiles = [];
    try {
        if (fs.existsSync(profilesPath)) {
            const data = fs.readFileSync(profilesPath, 'utf8');
            profiles = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading profiles for tray:', error);
    }

    const profileMenuItems = profiles.map((profile, index) => ({
        label: profile.name + (profile.shortcut ? ` (${profile.shortcut})` : ''),
        click: async () => {
            await applyProfileByIndex(index);
        }
    }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Window',
            click: () => {
                mainWindow.show();
            }
        },
        { type: 'separator' },
        {
            label: 'Profiles',
            submenu: profileMenuItems.length > 0 ? profileMenuItems : [
                { label: 'No profiles yet', enabled: false }
            ]
        },
        { type: 'separator' },
        {
            label: 'Check for Updates',
            click: () => {
                handleCheckForUpdates(true);
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
}

// Check for updates (manual or automatic)
async function handleCheckForUpdates(isManual = false) {
    const pkg = require('../package.json');
    const currentVersion = pkg.version;

    const result = await checkForUpdates(currentVersion);

    if (!result.success) {
        // Silently fail if offline or error (don't show error to user)
        if (isManual) {
            // Only show error in status bar if user manually checked
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-available', {
                    error: true,
                    message: result.offline
                        ? 'Unable to check for updates - offline'
                        : 'Unable to check for updates'
                });
            }
        }
        console.log('Update check failed:', result.error);
        return;
    }

    if (result.available) {
        // Send update available to renderer (status bar)
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-available', {
                available: true,
                latestVersion: result.latestVersion,
                currentVersion: result.currentVersion
            });
        }
    } else if (isManual) {
        // Only show "up to date" message in status bar if user manually checked
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-available', {
                upToDate: true,
                currentVersion: result.currentVersion
            });
        }
    }
}

// Apply profile by index (helper for tray and shortcuts)
async function applyProfileByIndex(index) {
    try {
        if (!fs.existsSync(profilesPath)) {
            return;
        }
        const data = fs.readFileSync(profilesPath, 'utf8');
        const profiles = JSON.parse(data);

        if (index >= 0 && index < profiles.length) {
            const profile = profiles[index];
            await executePowerShell('set', profile.playback, profile.recording);

            // Notify the renderer if window is visible
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('profile-applied', profile.name);
            }
        }
    } catch (error) {
        console.error('Error applying profile:', error);
    }
}

// Register global shortcuts
function registerGlobalShortcuts() {
    // Unregister all previous shortcuts
    globalShortcut.unregisterAll();

    try {
        if (!fs.existsSync(profilesPath)) {
            return;
        }
        const data = fs.readFileSync(profilesPath, 'utf8');
        const profiles = JSON.parse(data);

        profiles.forEach((profile, index) => {
            if (profile.shortcut) {
                try {
                    const success = globalShortcut.register(profile.shortcut, () => {
                        applyProfileByIndex(index);
                    });

                    if (!success) {
                        console.error(`Failed to register shortcut: ${profile.shortcut}`);
                    }
                } catch (error) {
                    console.error(`Error registering shortcut ${profile.shortcut}:`, error);
                }
            }
        });
    } catch (error) {
        console.error('Error registering shortcuts:', error);
    }
}

app.whenReady().then(() => {
    initPaths();
    ensureScriptExists();
    createWindow();
    createTray();
    registerGlobalShortcuts();

    // Auto-check for updates on startup (silent, only shows if update available)
    setTimeout(() => {
        handleCheckForUpdates(false);
    }, 5000); // Wait 5 seconds after startup to avoid blocking

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Don't quit on window close, keep running in tray
    // User must explicitly quit from tray menu
});

app.on('before-quit', () => {
    app.isQuitting = true;
});

app.on('will-quit', () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();
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
        // Update tray menu and shortcuts when profiles change
        updateTrayMenu();
        registerGlobalShortcuts();
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

ipcMain.handle('open-releases-page', async () => {
    openReleasesPage();
});
