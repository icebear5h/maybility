import { LayoutWrapper } from "@/components/layout-wrapper"
import { RichTextEditor } from "@/components/rich-text-editor"

export default function JournalPage() {
  return (
    <LayoutWrapper>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <input
            type="text"
            placeholder="Journal Entry Title..."
            defaultValue="August 4, 2025"
            style={{
              width: '100%',
              fontSize: '2rem',
              fontWeight: 'bold',
              border: 'none',
              background: 'transparent',
              color: '#1a1a1a',
              fontFamily: 'Georgia, serif',
              outline: 'none',
              padding: '0.5rem 0'
            }}
          />
        </div>
        <RichTextEditor />
        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button className="btn btn-primary" style={{ fontSize: '14px', padding: '10px 24px' }}>
            Save Entry
          </button>
        </div>
      </div>
    </LayoutWrapper>
  )
}
