const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let nextProcess;

// Maybility workspace folder
const MAYBILITY_FOLDER = path.join(os.homedir(), 'Maybility');

// Initialize Maybility workspace
async function initializeMaybilityWorkspace() {
  try {
    // Create main folder if it doesn't exist
    await fs.mkdir(MAYBILITY_FOLDER, { recursive: true });

    // Create default folder structure
    const defaultFolders = [
      'Journal',
      'Projects',
      'Goals',
      'Daily Notes',
      'Resources',
    ];

    for (const folder of defaultFolders) {
      const folderPath = path.join(MAYBILITY_FOLDER, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }

    // Create welcome file if it doesn't exist
    const welcomePath = path.join(MAYBILITY_FOLDER, 'Welcome.md');
    try {
      await fs.access(welcomePath);
    } catch {
      const welcomeContent = `# Welcome to Maybility

Your personal knowledge management system.

## Getting Started

- **Journal**: Daily reflections and thoughts
- **Projects**: Active work and initiatives
- **Goals**: Long-term objectives and milestones
- **Daily Notes**: Quick captures and meeting notes
- **Resources**: Reference materials and bookmarks

## Features

- **Castle View**: Visualize your knowledge hierarchy in 3D
- **Calendar**: Track events and time-based entries
- **Goals**: Plan and track multi-stage objectives
- **Semantic Space**: Explore entries by mood, energy, and clarity

Start by creating your first entry!
`;
      await fs.writeFile(welcomePath, welcomeContent, 'utf-8');
    }

    console.log(`Maybility workspace initialized at: ${MAYBILITY_FOLDER}`);
    return MAYBILITY_FOLDER;
  } catch (error) {
    console.error('Failed to initialize Maybility workspace:', error);
    throw error;
  }
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // In dev mode, assume dev server is already running
      resolve('http://localhost:3000');
      return;
    }

    // In production, start Next.js server
    const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
    nextProcess = spawn(nextBin, ['start'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3000' }
    });

    nextProcess.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes('Ready')) {
        resolve('http://localhost:3000');
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => resolve('http://localhost:3000'), 30000);
  });
}

// Enable WebGL support for 3D views (React Three Fiber)
// Note: removed disableHardwareAcceleration() which was breaking WebGL
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

async function createWindow() {
  const isDev = process.env.NODE_ENV === 'development';

  // Initialize workspace before creating window
  await initializeMaybilityWorkspace();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  const serverUrl = await startNextServer();
  mainWindow.loadURL(serverUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});

// ============================================================================
// FILE SYSTEM IPC HANDLERS
// ============================================================================

// Get the Maybility workspace folder
ipcMain.handle('get-workspace-path', async () => {
  return MAYBILITY_FOLDER;
});

// Open workspace in system file manager
ipcMain.handle('open-workspace-in-finder', async () => {
  const { shell } = require('electron');
  await shell.openPath(MAYBILITY_FOLDER);
  return true;
});

// Select a folder to work with (fallback for custom locations)
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: MAYBILITY_FOLDER,
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Read folder structure recursively
async function readFolderStructure(folderPath, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) return null;

  try {
    const stat = await fs.stat(folderPath);
    const name = path.basename(folderPath);

    if (!stat.isDirectory()) {
      return {
        id: folderPath,
        type: 'file',
        name,
        path: folderPath,
        parentIds: [],
        createdAt: stat.birthtime,
        updatedAt: stat.mtime,
      };
    }

    const items = await fs.readdir(folderPath);
    const children = [];

    for (const item of items) {
      // Skip hidden files and node_modules
      if (item.startsWith('.') || item === 'node_modules') continue;

      const itemPath = path.join(folderPath, item);
      const childNode = await readFolderStructure(itemPath, maxDepth, currentDepth + 1);
      if (childNode) {
        children.push(childNode);
      }
    }

    return {
      id: folderPath,
      type: 'folder',
      name,
      path: folderPath,
      parentIds: [],
      children,
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
    };
  } catch (error) {
    console.error(`Error reading ${folderPath}:`, error);
    return null;
  }
}

ipcMain.handle('read-folder-structure', async (event, folderPath) => {
  return await readFolderStructure(folderPath);
});

// Read file content
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Write file content
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create folder
ipcMain.handle('create-folder', async (event, folderPath) => {
  try {
    await fs.mkdir(folderPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete file or folder
ipcMain.handle('delete-path', async (event, targetPath) => {
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      await fs.rmdir(targetPath, { recursive: true });
    } else {
      await fs.unlink(targetPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Rename/move file or folder
ipcMain.handle('rename-path', async (event, oldPath, newPath) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
