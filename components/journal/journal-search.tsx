"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, FileText } from "lucide-react"
import { format } from "date-fns"
import type { JournalEntry } from "@/types/journal-types"

type SearchResult = {
  entry: JournalEntry
  snippets: string[]
  matchCount: number
}

type JournalSearchProps = {
  entries: JournalEntry[]
  onSearch: (query: string) => void
  searchResults: SearchResult[]
  onSelectResult: (result: SearchResult) => void
  onClose: () => void
}

export function JournalSearch({ entries, onSearch, searchResults, onSelectResult, onClose }: JournalSearchProps) {
  const [query, setQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(query)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, onSearch])

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} style={{ background: "#fef08a", padding: "0 2px", borderRadius: "2px" }}>
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "white",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Search Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #e0e0e0",
          background: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all your notes..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                border: "1px solid #d0d0d0",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                background: "white",
              }}
            />
          </div>
          <button
            onClick={onClose}
            className="btn"
            style={{
              fontSize: "13px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <X className="h-3 w-3" />
            Close
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
        {!query.trim() ? (
          <div style={{ textAlign: "center", color: "#666", marginTop: "40px" }}>
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 style={{ fontSize: "1.125rem", marginBottom: "8px", color: "#333" }}>Search your journal</h3>
            <p style={{ fontSize: "14px" }}>Type to search across all your notes and ideas</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div style={{ textAlign: "center", color: "#666", marginTop: "40px" }}>
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 style={{ fontSize: "1.125rem", marginBottom: "8px", color: "#333" }}>No results found</h3>
            <p style={{ fontSize: "14px" }}>Try different keywords or check your spelling</p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "16px", fontSize: "14px", color: "#666" }}>
              Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{query}"
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {searchResults.map((result, index) => (
                <div
                  key={`${result.entry.id}-${index}`}
                  onClick={() => onSelectResult(result)}
                  style={{
                    padding: "16px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: "white",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6"
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.1)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e0e0e0"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span style={{ fontWeight: "500", color: "#333" }}>{highlightText(result.entry.title, query)}</span>
                    {result.matchCount > 1 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#3b82f6",
                          background: "#eff6ff",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          fontWeight: "500",
                        }}
                      >
                        {result.matchCount} matches
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
                    {format(new Date(result.entry.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>

                  {result.snippets.length > 0 && (
                    <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
                      {result.snippets.map((snippet, snippetIndex) => (
                        <div key={snippetIndex} style={{ marginBottom: "4px" }}>
                          {highlightText(snippet.trim(), query)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
