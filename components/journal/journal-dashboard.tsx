"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { JournalSidebar } from "@/components/journal/journal-sidebar"
import { JournalContent } from "@/components/journal/journal-content"
import { JournalBreadcrumbs } from "@/components/journal/journal-breadcrumbs"
import type { JournalEntry } from "@/types/journal-types"
import type { Folder } from "@/types/folder-types"

type FolderRef = string | "root"
type SearchResult = { entry: JournalEntry; snippets: string[]; matchCount: number }
type FolderPayload = { folder: Folder | null; folders: Folder[]; entries: JournalEntry[] }

export function JournalDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedItem, setSelectedItem] = useState<JournalEntry | null>(null)

  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  // --- folder cache + seeded ancestors ---
  const folderCacheRef = useRef<Map<string, Folder>>(new Map())
  const [seededAncestors, setSeededAncestors] = useState<Folder[]>([]) // root->...->parent (from initial call)

  const readUrlFolderRef = (): FolderRef =>
    (searchParams?.get("folderId") as FolderRef) || "root"
  const readUrlEntryId = (): string | undefined =>
    searchParams?.get("id") ?? undefined
  const readUrlSearch = (): string | undefined => {
    const s = searchParams?.get("search")?.trim()
    return s || undefined
  }
  const buildUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    for (const [k, v] of Object.entries(updates)) v === null ? params.delete(k) : params.set(k, v)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const stashFolders = (payload: FolderPayload) => {
    if (payload.folder) folderCacheRef.current.set(payload.folder.id, payload.folder)
    payload.folders?.forEach((f) => folderCacheRef.current.set(f.id, f))
  }

  // --- one-time (per folderId) path fetch ---
  const seedPath = async (folderRef: FolderRef) => {
    const res = await fetch(`/api/folders/path?folderId=${folderRef}`)
    if (!res.ok) return
    const { folder, ancestors } = (await res.json()) as { folder: Folder | null; ancestors: Folder[] }
    if (folder) folderCacheRef.current.set(folder.id, folder)
    ancestors.forEach((f) => folderCacheRef.current.set(f.id, f))
    setSeededAncestors(ancestors)
    setCurrentFolder(folder ?? null)
  }

  // --- contents fetch ---
  const fetchContents = async (folderRef: FolderRef, searchQuery?: string) => {
    setLoading(true)
    setError(null)
    const ctrl = new AbortController()
    try {
      const qs = new URLSearchParams()
      qs.set("folderId", folderRef)
      if (searchQuery?.trim()) qs.set("search", searchQuery.trim())

      const res = await fetch(`/api/folders?${qs.toString()}`, { signal: ctrl.signal })
      if (!res.ok) throw new Error(`Failed to fetch contents: ${res.status} ${res.statusText}`)

      const data = (await res.json()) as FolderPayload
      setCurrentFolder(data.folder ?? null)
      setFolders(data.folders ?? [])
      setEntries(data.entries ?? [])
      stashFolders(data)

      if (searchQuery?.trim()) {
        setIsSearching(true)
        setSearchResults((data.entries ?? []).map((entry) => ({ entry, snippets: [], matchCount: 0 })))
      } else {
        setIsSearching(false)
        setSearchResults([])
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e)
        setError(e?.message || "Failed to fetch")
        setFolders([])
        setEntries([])
      }
    } finally {
      setLoading(false)
    }
    return () => ctrl.abort()
  }

  const fetchEntryById = async (id: string) => {
    try {
      const res = await fetch(`/api/journals/${id}`)
      if (!res.ok) return null
      return (await res.json()) as JournalEntry
    } catch {
      return null
    }
  }

  // --- on mount / folderId change: seed path once, then fetch contents ---
  useEffect(() => {
    const folderRef = readUrlFolderRef()
    const entryId = readUrlEntryId()
    const search = readUrlSearch()

    let cancel = () => {}
    ;(async () => {
      await seedPath(folderRef)                         // one-time path seed for this folderRef
      cancel = (await fetchContents(folderRef, search)) || (() => {})
      if (entryId) {
        const entry = await fetchEntryById(entryId)
        if (!entry) {
          router.replace(buildUrl({ id: null }))
          return
        }
        setSelectedItem(entry)
      } else {
        setSelectedItem(null)
      }
    })()

    return () => cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]) // runs when folderId/id/search changes

  useEffect(() => {
    const id = readUrlEntryId()
    if (!id) return
    const inList = entries.find((e) => e.id === id)
    if (inList) setSelectedItem(inList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  // --- breadcrumb chain (client-only after seed) ---
  // Build: [Home/null, ...seededAncestors, currentFolder?]
  const breadcrumbChain = useMemo(() => {
    if (!currentFolder || currentFolder.isRoot) return [null]
    return [null, ...seededAncestors, currentFolder]
  }, [seededAncestors, currentFolder])

  // --- actions (unchanged) ---
  const handleFolderChange = async (folder: Folder | null) => {
    const folderRef: FolderRef = folder?.id ?? "root"
    setCurrentFolder(folder ?? null)
    setSelectedItem(null)
    // no need to re-hit /path here; we’ll update chain on next URL change seed
    router.replace(buildUrl({ folderId: folderRef === "root" ? null : folderRef, id: null }))
    await fetchContents(folderRef)
  }

  const handleSearch = async (query: string) => {
    const folderRef: FolderRef = currentFolder?.id ?? "root"
    if (!query.trim()) {
      setIsSearching(false)
      setSearchResults([])
      await fetchContents(folderRef)
      return
    }
    await fetchContents(folderRef, query)
  }

  const selectEntry = (entry: JournalEntry) => {
    setSelectedItem(entry)
    const folderRef: FolderRef = currentFolder?.id ?? "root"
    router.replace(buildUrl({ id: entry.id, folderId: folderRef === "root" ? null : folderRef }))
  }

  const handleCreateEntry = async () => {
    try {
      const folderRef: FolderRef = currentFolder?.id ?? "root"
      const res = await fetch(`/api/journals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Entry", content: "", folderId: folderRef }),
      })
      if (!res.ok) throw new Error("Failed to create entry")
      const newEntry: JournalEntry = await res.json()
      setEntries((prev) => [...prev, newEntry])
      selectEntry(newEntry)
    } catch (e) {
      console.error(e)
      alert("Failed to create entry.")
    }
  }

  const handleCreateFolder = async (parent: Folder | null) => {
    setLoading(true)
    try {
      const parentRef: FolderRef = parent?.id ?? "root"
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: parentRef, name: "" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Create failed")
      const curRef: FolderRef = currentFolder?.id ?? "root"
      await fetchContents(curRef)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateContent = async (content: string) => {
    if (!selectedItem) return
    try {
      const res = await fetch(`/api/journals/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error("Failed to update entry")
      const updated: JournalEntry = await res.json()
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setSelectedItem(updated)
    } catch (e) {
      console.error(e)
      alert("Failed to save changes.")
    }
  }

  // --- UI (same as before) ---
  if (loading && !entries.length && !folders.length) {
    return <div style={{ display: "flex", height: "calc(100vh - 60px)", background: "white", alignItems: "center", justifyContent: "center" }}><div>Loading…</div></div>
  }
  if (error) {
    return (
      <div style={{ display: "flex", height: "calc(100vh - 60px)", background: "white", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "red", marginBottom: "1rem" }}>Error: {error}</div>
          <button
            onClick={() => fetchContents(readUrlFolderRef())}
            style={{ padding: "0.5rem 1rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const makeHref = (folder: Folder | null) => {
    const folderRef: FolderRef = folder?.id ?? "root"
    const params = new URLSearchParams(searchParams?.toString() || "")
    if (folderRef === "root") params.delete("folderId")
    else params.set("folderId", folderRef)
    params.delete("id")
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ""}`
  }
  
  const handleDeleteEntry = async (entry: JournalEntry) => {
    try {
      const res = await fetch(`/api/journals/${entry.id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete entry")
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      if (selectedItem?.id === entry.id) setSelectedItem(null)
    } catch (e) {
      console.error(e)
      alert("Failed to delete entry.")
    }
  }
  
  const handleDeleteFolder = async (folder: Folder) => {
    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete folder")
      // refresh current folder contents
      const curRef = currentFolder?.id ?? "root"
      await fetchContents(curRef)
    } catch (e) {
      console.error(e)
      alert("Failed to delete folder.")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", minHeight: 0, background: "white" }}>
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #eee", background: "white" }}>
        <JournalBreadcrumbs
          chain={breadcrumbChain} // [null, ...ancestors, current]
          onNavigate={handleFolderChange}
          makeHref={makeHref}
        />
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0, background: "white" }}>
        <JournalSidebar
          folders={[...folders].sort((a, b) => a.name.localeCompare(b.name))}
          entries={isSearching ? searchResults.map(r => r.entry) : entries}
          selectedItem={selectedItem}
          onSelectItem={setSelectedItem}
          onSearch={handleSearch}
          searchResults={searchResults}
          isSearching={isSearching}
          onSelectSearchResult={(r: SearchResult) => { setIsSearching(false); selectEntry(r.entry) }}
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          onCreateEntry={handleCreateEntry}
          onCreateFolder={handleCreateFolder}
          onDeleteEntry={handleDeleteEntry}
          onDeleteFolder={handleDeleteFolder}
        />
        <JournalContent selectedItem={selectedItem} onUpdateContent={handleUpdateContent} />
      </div>
    </div>
  )
}
