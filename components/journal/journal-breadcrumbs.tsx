"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import type { Folder } from "@/types/folder-types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type Props = {
  chain: (Folder | null)[]                 // caller can pass anything; we normalize here
  onNavigate: (folder: Folder | null) => void
  makeHref?: (folder: Folder | null) => string
}

function isRootLike(node: Folder | null): boolean {
  if (node === null) return true
  // be defensive: support either flag or structural root
  const maybe = node as any
  return !!maybe.isRoot || node.parentId === null || node.name?.trim().toLowerCase() === "root"
}

export function JournalBreadcrumbs({ chain, onNavigate, makeHref }: Props) {
  // Normalize once per change in input chain
  const ordered = useMemo<(Folder | null)[]>(() => {
    // Map any root-like node to `null`
    const mapped = chain.map((n) => (isRootLike(n as Folder | null) ? null : (n as Folder)))

    // Ensure we start with Home (null)
    if (mapped[0] !== null) mapped.unshift(null)

    // Remove duplicate Home/nulls and duplicate folder ids while preserving order
    const out: (Folder | null)[] = []
    const seen = new Set<string>()
    for (const n of mapped) {
      if (n === null) {
        if (out.length === 0 || out[out.length - 1] !== null) out.push(null)
      } else if (!seen.has(n.id)) {
        out.push(n)
        seen.add(n.id)
      }
    }
    return out
  }, [chain])

  const renderItem = (node: Folder | null, isLast: boolean) => {
    const key = node ? node.id : "root"
    const label = node === null ? "Home" : node.name

    if (isLast) {
      return (
        <BreadcrumbItem key={`${key}-last`}>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      )
    }

    return (
      <BreadcrumbItem key={key}>
        <BreadcrumbLink asChild>
          {makeHref ? (
            <Link href={makeHref(node)}>{label}</Link>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(node)}
              style={{ all: "unset", cursor: "pointer", color: "inherit" }}
            >
              {label}
            </button>
          )}
        </BreadcrumbLink>
      </BreadcrumbItem>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {ordered.map((node, i) => {
          const isLast = i === ordered.length - 1
          return (
            <React.Fragment key={(node as Folder | null)?.id ?? "root"}>
              {renderItem(node as Folder | null, isLast)}
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
