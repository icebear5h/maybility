"use client"

import { useState } from "react"

export default function RichTextEditor() {
  const [content, setContent] = useState(`# Welcome to Your Journal

This is your creative space. Start by typing here using **Markdown** formatting.

## What you can do:

- Write with **bold** and *italic* text
- Create lists like this one
- Add [links](https://example.com)
- Use \`inline code\` for technical notes

> "The best time to plant a tree was 20 years ago. The second best time is now." – Chinese Proverb

### Today's Goals:
1. Capture daily thoughts and reflections
2. Plan your next creative project
3. Draft ideas for blog posts or articles

---

Just start typing to replace this content with your own thoughts!`)

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden', background: 'white' }}>
      <div style={{ 
        background: '#f8f8f8', 
        padding: '12px 16px', 
        borderBottom: '1px solid #e0e0e0',
        fontSize: '13px',
        color: '#666'
      }}>
        {'Markdown Editor - Use **bold**, *italic*, # headers, - lists, > quotes'}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{
          width: '100%',
          minHeight: '500px',
          padding: '24px',
          border: 'none',
          outline: 'none',
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          resize: 'vertical',
          background: 'white'
        }}
        placeholder="Start writing your journal entry in Markdown..."
      />
    </div>
  )
}
