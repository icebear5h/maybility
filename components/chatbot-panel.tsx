import { MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ChatbotPanel() {
  return (
    <aside className="hidden h-screen w-80 flex-col border-l border-slate-200 bg-white shadow-sm lg:flex">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <MessageSquare className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-800">AI Assistant</h2>
      </div>
      <div className="flex-1 space-y-4 p-4 text-sm">
        <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
          <p className="font-semibold text-blue-700 mb-1">AI:</p>
          <p className="text-slate-700">Welcome! How can I help you plan your day?</p>
        </div>
        <div className="flex justify-end">
          <div className="w-4/5 rounded-lg bg-green-50 p-3 border border-green-100">
            <p className="font-semibold text-green-700 mb-1">You:</p>
            <p className="text-slate-700">Summarize my notes from yesterday.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="relative">
          <Textarea
            placeholder="Ask for writing prompts..."
            className="pr-12 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
            rows={2}
          />
          <Button type="submit" size="icon" className="absolute bottom-2 right-2 h-8 w-8 bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </aside>
  )
}
