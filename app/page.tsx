'use client'

import { FormEvent, useState } from 'react'
import { ArrowUp, ChevronDown, Menu, Mic, MoreHorizontal, Paperclip, Plus, Sparkles, Sun, UserRound, Volume2, X } from 'lucide-react'

type Message = { role: 'assistant' | 'user'; text: string; mood?: 'cool' | 'love' | 'sad' }

const starterMessages: Message[] = [
  { role: 'assistant', text: 'Good morning, Alex. I’m here and listening.' },
  { role: 'user', text: 'Help me shape a clear plan for today.' },
  { role: 'assistant', text: 'Absolutely. Let’s make space for what matters most.' },
]

const violetPalette = [
  { emoji: '😎', name: 'Cool Avatar', mood: 'cool' as const },
  { emoji: '♥', name: 'Luxury Heart', mood: 'love' as const },
  { emoji: '☹', name: 'Soft Sad', mood: 'sad' as const },
  { emoji: '✦', name: 'Violet Spark', mood: undefined },
  { emoji: '☾', name: 'Quiet Night', mood: undefined },
  { emoji: '⌁', name: 'Breathe', mood: undefined },
]

export default function Page() {
  const [messages, setMessages] = useState<Message[]>(starterMessages)
  const [draft, setDraft] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [afternoon, setAfternoon] = useState(false)
  const [broadcast, setBroadcast] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((current) => [...current, { role: 'user', text }])
    setDraft('')
  }

  function chooseEmoji(item: (typeof violetPalette)[number]) {
    setMessages((current) => [...current, { role: 'user', text: item.emoji, mood: item.mood }])
    setShowPalette(false)
    if (item.mood) {
      setBroadcast(item.mood === 'cool' ? "I'm good" : item.mood === 'love' ? 'Love you oo' : 'Ahh')
      window.setTimeout(() => setBroadcast(''), 1800)
    }
  }

  return (
    <main className={`nexus-shell ${afternoon ? 'afternoon' : ''} transition-colors duration-700 ease-in-out`}>
      <section className="nexus-device" aria-label="Nexus assistant">
        <header className="nexus-header">
          <button className="icon-button" aria-label="Open navigation" type="button"><Menu /></button>
          <div className="brand-lockup"><span className="brand-mark"><Sparkles /></span><span>NEXUS</span></div>
          <button className="icon-button" aria-label="More options" type="button"><MoreHorizontal /></button>
        </header>

        <div className="context-strip">
          <div className="identity-chip"><span className="status-dot" /> Alex Morgan <ChevronDown /></div>
          <button className="theme-toggle" type="button" aria-label={afternoon ? 'Switch to Luxury Night' : 'Switch to Afternoon Light'} onClick={() => setAfternoon((value) => !value)}><Sun /></button>
        </div>

        <div className="conversation" aria-live="polite">
          <div className="date-stamp"><span /> TODAY <span /></div>
          {messages.map((message, index) => (
            <div className={`message-row ${message.role}`} key={`${message.text}-${index}`}>
              {message.role === 'assistant' && <div className="assistant-avatar"><Sparkles /></div>}
              <div className="message-content">
                <span className="message-label">{message.role === 'assistant' ? 'NEXUS' : 'YOU'}</span>
                <div className={`message-bubble ${message.mood ? `mood-${message.mood}` : ''}`}>{message.text}</div>
                {message.role === 'assistant' && <div className="message-tools"><button type="button" aria-label="Listen to message"><Volume2 /></button><span>just now</span></div>}
              </div>
              {message.role === 'user' && <div className="user-avatar"><UserRound /></div>}
            </div>
          ))}
          <div className="empathy-wave" aria-label="Nexus is ready"><span /><span /><span /><span /><span /><span /><span /></div>
        </div>

        <div className="composer-wrap">
          {broadcast && <div className={`broadcast broadcast-${broadcast === 'Ahh' ? 'sad' : broadcast === "I'm good" ? 'cool' : 'love'}`} role="status">{broadcast}<span className="audio-burst">)))</span></div>}
          {showPalette && <div className="violet-palette" role="dialog" aria-label="Violet Palette"><div className="palette-heading"><span>VIOLET PALETTE</span><button type="button" aria-label="Close palette" onClick={() => setShowPalette(false)}><X /></button></div><div className="palette-grid">{violetPalette.map((item) => <button className={`palette-cell ${item.mood ? `cell-${item.mood}` : ''}`} key={item.name} type="button" onClick={() => chooseEmoji(item)}><span>{item.emoji}</span><small>{item.name}</small></button>)}</div></div>}
          <div className="quick-actions"><button type="button" aria-label="Attach file"><Paperclip /></button><button type="button" aria-label="Open Violet Palette" onClick={() => setShowPalette((value) => !value)}><Sparkles /></button><span className="quick-hint">Ask anything</span><button type="button" aria-label="Voice input"><Mic /></button></div>
          <form className="composer" onSubmit={handleSubmit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What’s on your mind?" aria-label="Message Nexus" /><button className="action-orb" type="submit" aria-label="Send message"><ArrowUp /></button></form>
          <p className="composer-note">Nexus is here to help you think clearly.</p>
        </div>
      </section>
    </main>
  )
}
