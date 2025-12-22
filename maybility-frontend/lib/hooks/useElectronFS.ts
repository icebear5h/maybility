"use client"

import { useState, useCallback, useEffect } from 'react'
import type { Node } from '@/lib/types'
import { parseFrontmatter } from '@/lib/frontmatter'

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electron !== undefined
}

export function useElectronFS() {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  // Track isElectron in state to avoid hydration mismatch (always false on first render)
  const [isElectronState, setIsElectronState] = useState(false)

  useEffect(() => {
    setIsElectronState(isElectron())
  }, [])

  // Auto-load Maybility workspace on mount
  useEffect(() => {
    if (!isElectron() || initialized) return

    const initWorkspace = async () => {
      try {
        setLoading(true)
        const workspacePath = await window.electron!.fs.getWorkspacePath()
        setCurrentFolder(workspacePath)
        await loadFolderStructure(workspacePath)
        setInitialized(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }

    initWorkspace()
  }, [initialized])

  // Open workspace in file manager
  const openWorkspaceInFinder = useCallback(async () => {
    if (!isElectron()) return
    try {
      await window.electron!.fs.openWorkspaceInFinder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open workspace')
    }
  }, [])

  // Select a folder from the file system
  const selectFolder = useCallback(async () => {
    if (!isElectron()) {
      setError('File system access only available in Electron')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const folderPath = await window.electron!.fs.selectFolder()
      if (!folderPath) {
        setLoading(false)
        return
      }

      setCurrentFolder(folderPath)
      await loadFolderStructure(folderPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select folder')
    } finally {
      setLoading(false)
    }
  }, [])

  // Read folder metadata from .folder.json if it exists
  const readFolderMetadata = useCallback(async (folderPath: string): Promise<{ description?: string } | null> => {
    if (!isElectron()) return null

    try {
      const metadataPath = `${folderPath}/.folder.json`
      const result = await window.electron!.fs.readFile(metadataPath)
      if (result.success && result.content) {
        return JSON.parse(result.content)
      }
    } catch (err) {
      // No metadata file, that's ok
    }
    return null
  }, [])

  // Convert file system node to app Node format
  const convertToNode = useCallback(async (fsNode: any, parentPath: string | null = null): Promise<Node> => {
    // Strip .md extension from file names for display
    let displayName = fsNode.name
    if (fsNode.type === 'file' && displayName.endsWith('.md')) {
      displayName = displayName.slice(0, -3)
    }

    const node: Node = {
      id: fsNode.path,
      type: fsNode.type,
      name: displayName,
      path: fsNode.path,
      parentIds: parentPath ? [parentPath] : [],
      createdAt: new Date(fsNode.createdAt),
      updatedAt: new Date(fsNode.updatedAt),
      archivedAt: null,
    }

    // Read folder metadata
    if (fsNode.type === 'folder') {
      const metadata = await readFolderMetadata(fsNode.path)
      if (metadata?.description) {
        node.description = metadata.description
      }
    }

    return node
  }, [readFolderMetadata])

  // Load folder structure from file system
  const loadFolderStructure = useCallback(async (folderPath: string) => {
    if (!isElectron()) return

    try {
      setLoading(true)
      setError(null)

      const structure = await window.electron!.fs.readFolderStructure(folderPath)
      if (!structure) {
        setError('Failed to read folder structure')
        return
      }

      // Flatten the tree structure into a list of nodes
      const flattenNodes = async (fsNode: any, parentPath: string | null = null): Promise<Node[]> => {
        const node = await convertToNode(fsNode, parentPath)
        const nodes: Node[] = [node]

        if (fsNode.children && fsNode.type === 'folder') {
          for (const child of fsNode.children) {
            const childNodes = await flattenNodes(child, fsNode.path)
            nodes.push(...childNodes)
          }
        }

        return nodes
      }

      const allNodes = await flattenNodes(structure)
      setNodes(allNodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder')
    } finally {
      setLoading(false)
    }
  }, [convertToNode])

  // Read file content
  const readFile = useCallback(async (filePath: string): Promise<string | null> => {
    if (!isElectron()) return null

    try {
      const result = await window.electron!.fs.readFile(filePath)
      if (result.success && result.content) {
        return result.content
      }
      setError(result.error || 'Failed to read file')
      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
      return null
    }
  }, [])

  // Read file with metadata parsed from frontmatter
  const readFileWithMetadata = useCallback(async (filePath: string): Promise<{
    content: string
    frontmatter: {
      title?: string
      created?: string
      updated?: string
      [key: string]: any
    }
  } | null> => {
    if (!isElectron()) return null

    try {
      const fileContent = await readFile(filePath)
      if (!fileContent) return null

      const { frontmatter, content } = parseFrontmatter(fileContent)
      return { content, frontmatter }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file with metadata')
      return null
    }
  }, [readFile])

  // Write file content
  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    if (!isElectron()) return false

    try {
      const result = await window.electron!.fs.writeFile(filePath, content)
      if (!result.success) {
        setError(result.error || 'Failed to write file')
      }
      return result.success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to write file')
      return false
    }
  }, [])

  // Write file with frontmatter metadata
  const writeFileWithMetadata = useCallback(async (
    filePath: string,
    content: string,
    metadata: {
      title?: string
      created?: string
      updated?: string
      [key: string]: any
    }
  ): Promise<boolean> => {
    if (!isElectron()) return false

    try {
      const { serializeFrontmatter } = await import('@/lib/frontmatter')
      const fileContent = serializeFrontmatter(metadata, content)
      return await writeFile(filePath, fileContent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to write file with metadata')
      return false
    }
  }, [writeFile])

  // Create folder
  const createFolder = useCallback(async (folderPath: string): Promise<boolean> => {
    if (!isElectron()) return false

    try {
      const result = await window.electron!.fs.createFolder(folderPath)
      if (result.success && currentFolder) {
        // Reload the structure
        await loadFolderStructure(currentFolder)
      } else if (!result.success) {
        setError(result.error || 'Failed to create folder')
      }
      return result.success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
      return false
    }
  }, [currentFolder, loadFolderStructure])

  // Delete path (file or folder)
  const deletePath = useCallback(async (targetPath: string): Promise<boolean> => {
    if (!isElectron()) return false

    try {
      const result = await window.electron!.fs.deletePath(targetPath)
      if (result.success && currentFolder) {
        // Reload the structure
        await loadFolderStructure(currentFolder)
      } else if (!result.success) {
        setError(result.error || 'Failed to delete')
      }
      return result.success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      return false
    }
  }, [currentFolder, loadFolderStructure])

  // Rename/move path
  const renamePath = useCallback(async (oldPath: string, newPath: string): Promise<boolean> => {
    if (!isElectron()) return false

    try {
      const result = await window.electron!.fs.renamePath(oldPath, newPath)
      if (result.success && currentFolder) {
        // Reload the structure
        await loadFolderStructure(currentFolder)
      } else if (!result.success) {
        setError(result.error || 'Failed to rename')
      }
      return result.success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename')
      return false
    }
  }, [currentFolder, loadFolderStructure])

  return {
    isElectron: isElectronState,
    currentFolder,
    nodes,
    loading,
    error,
    initialized,
    selectFolder,
    openWorkspaceInFinder,
    readFile,
    readFileWithMetadata,
    writeFile,
    createFolder,
    deletePath,
    renamePath,
    refreshFolder: () => currentFolder && loadFolderStructure(currentFolder),
  }
}
