"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Table } from "@tiptap/extension-table"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"

const content = `
  <h2>Welcome to Your Journal</h2>
  <p>This is your creative space. Start by typing here. Use the toolbar above to format your text, create lists, add tables, and more.</p>
  <blockquote>"The best time to plant a tree was 20 years ago. The second best time is now." – Chinese Proverb</blockquote>
  <ul>
    <li>Capture daily thoughts and reflections</li>
    <li>Plan your next creative project</li>
    <li>Draft ideas for blog posts or articles</li>
  </ul>
  <p>Here's a sample table:</p>
  <table>
    <tbody>
      <tr>
        <th>Feature</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Rich Text Formatting</td>
        <td>Complete</td>
      </tr>
      <tr>
        <td>Calendar Integration</td>
        <td>Complete</td>
      </tr>
    </tbody>
  </table>
`

export function RichTextEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    immediatelyRender: false,
  })

  if (!editor) {
    return <div>Loading editor...</div>
  }

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden', background: 'white' }}>
      <div className="editor-toolbar">
        <button
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <span style={{ width: '1px', background: '#d0d0d0', margin: '0 4px' }}></span>
        <button
          className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <span style={{ width: '1px', background: '#d0d0d0', margin: '0 4px' }}></span>
        <button
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <span style={{ width: '1px', background: '#d0d0d0', margin: '0 4px' }}></span>
        <button
          className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          Code
        </button>
        <button
          className="toolbar-btn"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          Table
        </button>
      </div>
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
