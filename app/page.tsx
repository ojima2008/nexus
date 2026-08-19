'use client'

import { FormEvent, useState } from 'react'
import {
  Archive,
  ArrowUp,
  ChevronDown,
  Menu,
  Mic,
  MoreHorizontal,
  Paperclip,
  Plus,
  Sparkles,
  Sun,
  UserRound,
  Volume2,
} from 'lucide-react'

const starterMessages = [
  { role: 'assistant', text: "Good morning, Alex. I’m here and listening." },
  { role: 'user', text: 'Help me shape a clear plan for today.' },
  { role: 'assistant', text: 'Absolutely. Let’s make space for what matters most.' },
]

export default function Page() {
  const [messages, setMessages] = useState(starterMessages)
  const [draft, setDraft] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((current) => [...current, { role: 'user', text }])
    setDraft('')
  }

  return (
    <main className="nexus-shell">
      <section className="nexus-device" aria-label="Nexus assistant">
        <header className="nexus-header">
          <button className="icon-button" aria-label="Open navigation" type="button"><Menu /></button>
          <div className="brand-lockup"><span className="brand-mark"><Sparkles /></span><span>NEXUS</span></div>
          <button className="icon-button" aria-label="More options" type="button"><MoreHorizontal /></button>
        </header>

        <div className="context-strip">
          <div className="identity-chip"><span className="status-dot" /> Alex Morgan <ChevronDown /></div>
          <button className="theme-toggle" type="button" aria-label="Switch theme"><Sun /></button>
        </div>

        <div className="conversation" aria-live="polite">
          <div className="date-stamp"><span /> TODAY <span /></div>
          {messages.map((message, index) => (
            <div className={`message-row ${message.role}`} key={`${message.text}-${index}`}>
              {message.role === 'assistant' && <div className="assistant-avatar"><Sparkles /></div>}
              <div className="message-content">
                <span className="message-label">{message.role === 'assistant' ? 'NEXUS' : 'YOU'}</span>
                <div className="message-bubble">{message.text}</div>
                {message.role === 'assistant' && <div className="message-tools"><button type="button" aria-label="Listen to message"><Volume2 /></button><span>just now</span></div>}
              </div>
              {message.role === 'user' && <div className="user-avatar"><UserRound /></div>}
            </div>
          ))}
          <div className="empathy-wave" aria-label="Nexus is ready"><span /><span /><span /><span /><span /><span /><span /></div>
        </div>

        <div className="composer-wrap">
          <div className="quick-actions"><button type="button" aria-label="Attach file"><Paperclip /></button><button type="button" aria-label="Add context"><Plus /></button><span className="quick-hint">Ask anything</span><button type="button" aria-label="Voice input"><Mic /></button></div>
          <form className="composer" onSubmit={handleSubmit}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What’s on your mind?" aria-label="Message Nexus" />
            <button className="action-orb" type="submit" aria-label="Send message"><ArrowUp /></button>
          </form>
          <p className="composer-note">Nexus is here to help you think clearly.</p>
        </div>
      </section>
    </main>
  )
}
