// components/journal/journal-sidebar.tsx
"use client"

import { useState, useMemo } from "react"
import { FileText, Calendar, Search, Trash2 } from "lucide-react"
import { JournalSearch } from "@/components/journal/journal-search"
import type { JournalEntry } from "@/types/journal-types"
import type { Folder } from "@/types/folder-types"

type SearchResult = { entry: JournalEntry; snippets: string[]; matchCount: number }

type JournalSidebarProps = {
  folders: Folder[]
  entries: JournalEntry[]
  selectedItem: JournalEntry | null
  onSelectItem: (item: JournalEntry) => void
  onDeleteEntry: (item: JournalEntry) => void
  onDeleteFolder: (folder: Folder) => void
  onSearch: (query: string) => void
  searchResults: SearchResult[]
  isSearching: boolean
  onSelectSearchResult: (result: SearchResult) => void
  currentFolder: Folder | null
  onFolderChange: (folder: Folder | null) => void
  onCreateEntry: () => void
  onCreateFolder: (parent: Folder | null) => void
}

const iconFor = (name: string) =>
  name.toLowerCase().includes("journal") ? Calendar : FileText

export function JournalSidebar({
  folders,
  entries,
  selectedItem,
  onSelectItem,
  onDeleteEntry,
  onDeleteFolder,
  onSearch,
  searchResults,
  isSearching,
  onSelectSearchResult,
  currentFolder,
  onFolderChange,
  onCreateEntry,
  onCreateFolder,
}: JournalSidebarProps) {
  const [showSearch, setShowSearch] = useState(false)
  const currentFolderId = currentFolder?.id ?? null
  const rootFolderId = useMemo(
    () => folders.find((f) => (f as any).isRoot)?.id ?? null,
    [folders]
  )

  return (
    <div
      style={{
        width: 320,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderRight: "1px solid #e0e0e0",
        background: "#fafafa",
      }}
    >
      {showSearch ? (
        <JournalSearch
          entries={entries}
          onSearch={onSearch}
          searchResults={searchResults}
          onSelectResult={(result) => {
            onSelectSearchResult(result)
            setShowSearch(false)
          }}
          onClose={() => setShowSearch(false)}
        />
      ) : (
        <>
          {/* Header */}
          <div
            style={{
              padding: "20px 16px 16px",
              borderBottom: "1px solid #e0e0e0",
              background: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    margin: 0,
                  }}
                >
                  Journal
                </h2>
                <p style={{ fontSize: 14, color: "#666", margin: "4px 0 0" }}>
                  Organize your thoughts and ideas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSearch(true)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d0d0d0",
                borderRadius: 6,
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "#666",
              }}
            >
              <Search size={16} />
              Search entries...
            </button>
          </div>

          {/* Scrollable column */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              padding: "16px 0",
            }}
          >
            {/* --- FOLDERS LIST (single-click open, hover-only red delete) --- */}
            {folders.map((folder) => {
              const FolderIcon = iconFor(folder.name)
              const isActive = currentFolderId === folder.id
              const isRootLike =
                (folder as any).isRoot === true ||
                folder.parentId === null ||
                folder.name?.trim().toLowerCase() === "root"

              return (
                <div key={folder.id} style={{ marginBottom: 4 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Open folder ${folder.name}`}
                    className="group"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 16px",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      backgroundColor: isActive ? "#f0f7ff" : "transparent",
                      borderRadius: 6,
                    }}
                    onClick={() => onFolderChange(folder)} // SINGLE CLICK OPEN
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onFolderChange(folder)
                      }
                    }}
                  >
                    <FolderIcon className="h-4 w-4 text-gray-600 mr-2" />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? "#1976d2" : "#333",
                        flex: 1,
                        userSelect: "none",
                      }}
                    >
                      {folder.name}
                    </span>

                    {/* Hover-only red delete */}
                    <button
                      type="button"
                      disabled={isRootLike}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (
                          !isRootLike &&
                          window.confirm(
                            `Delete folder "${folder.name}" and all its contents? This cannot be undone.`
                          )
                        ) {
                          onDeleteFolder(folder)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: isRootLike ? "not-allowed" : "pointer",
                        padding: 4,
                      }}
                      aria-label={
                        isRootLike
                          ? "Cannot delete the root folder"
                          : `Delete folder ${folder.name}`
                      }
                      title={
                        isRootLike
                          ? "Cannot delete the root folder"
                          : "Delete folder"
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                    </button>
                  </div>
                </div>
              )
            })}

            <div style={{ height: 8 }} />

            {/* --- ENTRIES LIST (single-click open, hover-only red delete) --- */}
            {entries.map((entry) => (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                className="group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  borderRadius: 4,
                  cursor: "pointer",
                  backgroundColor:
                    selectedItem?.id === entry.id ? "#f5f5f5" : "transparent",
                  transition: "background-color 0.2s",
                  marginBottom: 2,
                }}
                onClick={() => onSelectItem(entry)} // SINGLE CLICK OPEN
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelectItem(entry)
                  }
                }}
              >
                <FileText className="h-4 w-4 text-gray-500 mr-2" />
                <span
                  style={{
                    fontSize: 14,
                    color: "#333",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                  }}
                  title={entry.title || "Untitled"}
                >
                  {entry.title || "Untitled"}
                </span>

                {/* Hover-only red delete */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (
                      window.confirm(
                        `Delete entry "${entry.title || "Untitled"}"? This cannot be undone.`
                      )
                    ) {
                      onDeleteEntry(entry)
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  aria-label={`Delete entry ${entry.title || "Untitled"}`}
                  title="Delete entry"
                >
                  <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                </button>
              </div>
            ))}

            {/* --- ACTION BUTTONS --- */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                padding: "16px 16px 24px",
              }}
            >
              <button
                type="button"
                onClick={() => onCreateEntry()}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d0d0d0",
                  borderRadius: 6,
                  background: "white",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                title="Create new entry"
              >
                + Entry
              </button>

              <button
                type="button"
                onClick={() => onCreateFolder(currentFolder)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d0d0d0",
                  borderRadius: 6,
                  background: "white",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                title="Create folder"
              >
                + Folder
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
