const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File System APIs
  fs: {
    getWorkspacePath: () => ipcRenderer.invoke('get-workspace-path'),
    openWorkspaceInFinder: () => ipcRenderer.invoke('open-workspace-in-finder'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    readFolderStructure: (folderPath) => ipcRenderer.invoke('read-folder-structure', folderPath),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
    deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
    renamePath: (oldPath, newPath) => ipcRenderer.invoke('rename-path', oldPath, newPath),
  },
});
