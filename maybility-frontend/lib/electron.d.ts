export interface ElectronAPI {
  fs: {
    getWorkspacePath: () => Promise<string>
    openWorkspaceInFinder: () => Promise<boolean>
    selectFolder: () => Promise<string | null>
    readFolderStructure: (folderPath: string) => Promise<FileSystemNode | null>
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
    createFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>
    deletePath: (targetPath: string) => Promise<{ success: boolean; error?: string }>
    renamePath: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>
  }
}

export interface FileSystemNode {
  id: string
  type: 'file' | 'folder'
  name: string
  path: string
  parentIds: string[]
  children?: FileSystemNode[]
  createdAt: Date
  updatedAt: Date
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
