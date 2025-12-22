/**
 * Frontmatter utilities for parsing and writing YAML metadata in markdown files
 */

export interface Frontmatter {
  title?: string
  created?: string
  updated?: string
  mood?: number
  energy?: number
  clarity?: number
  tags?: string[]
  [key: string]: any
}

/**
 * Parse frontmatter from markdown content
 * Format:
 * ---
 * title: My Title
 * created: 2024-01-01T00:00:00.000Z
 * mood: 0.5
 * ---
 * Content here...
 */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/

  const match = content.match(frontmatterRegex)
  if (!match) {
    return { frontmatter: {}, content }
  }

  const [, yamlContent, markdownContent] = match
  const frontmatter: Frontmatter = {}

  // Simple YAML parser (handles basic key: value pairs)
  const lines = yamlContent.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.substring(0, colonIndex).trim()
    let value: any = trimmed.substring(colonIndex + 1).trim()

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    // Parse numbers
    if (!isNaN(Number(value)) && value !== '') {
      value = Number(value)
    }

    // Parse booleans
    if (value === 'true') value = true
    if (value === 'false') value = false

    // Parse arrays (simple comma-separated values in brackets)
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v)
    }

    frontmatter[key] = value
  }

  return { frontmatter, content: markdownContent }
}

/**
 * Serialize frontmatter and content into markdown with YAML frontmatter
 */
export function serializeFrontmatter(frontmatter: Frontmatter, content: string): string {
  if (Object.keys(frontmatter).length === 0) {
    return content
  }

  const yamlLines: string[] = []

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      yamlLines.push(`${key}: [${value.join(', ')}]`)
    } else if (typeof value === 'string') {
      // Quote strings with special characters
      if (value.includes(':') || value.includes('#') || value.includes('\n')) {
        yamlLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
      } else {
        yamlLines.push(`${key}: ${value}`)
      }
    } else {
      yamlLines.push(`${key}: ${value}`)
    }
  }

  return `---\n${yamlLines.join('\n')}\n---\n${content}`
}

/**
 * Update frontmatter fields in existing content
 */
export function updateFrontmatter(content: string, updates: Partial<Frontmatter>): string {
  const { frontmatter, content: markdownContent } = parseFrontmatter(content)
  const updated = { ...frontmatter, ...updates }
  return serializeFrontmatter(updated, markdownContent)
}
