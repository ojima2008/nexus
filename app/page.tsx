'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowUp, ChevronDown, Menu, Mic, MicOff, MoreHorizontal, Paperclip, Phone, Share2, Sparkles, Sun, UserRound, Video, Volume2, Waves, X } from 'lucide-react'

type Message = { role: 'assistant' | 'user'; text: string; mood?: 'cool' | 'love' | 'sad' }
const starterMessages: Message[] = [
  { role: 'assistant', text: 'Good morning, Alex. I’m here and listening.' },
  { role: 'user', text: 'Help me shape a clear plan for today.' },
  { role: 'assistant', text: 'Absolutely. Let’s make space for what matters most.' },
]
const violetPalette = [{ emoji: '😎', name: 'Cool Avatar', mood: 'cool' as const }, { emoji: '♥', name: 'Luxury Heart', mood: 'love' as const }, { emoji: '☹', name: 'Soft Sad', mood: 'sad' as const }, { emoji: '✦', name: 'Violet Spark' }, { emoji: '☾', name: 'Quiet Night' }, { emoji: '⌁', name: 'Breathe' }]

function Waveform({ amplitude }: { amplitude: number }) {
  return <svg className="call-waveform" viewBox="0 0 360 160" role="img" aria-label="Live audio waveform"><path d="M0 80 C20 80 24 55 42 55 S65 105 83 105 S105 28 125 28 S145 126 166 126 S188 45 208 45 S230 94 249 94 S270 18 289 18 S309 80 330 80 S345 67 360 67" style={{ transform: `scaleY(${0.7 + amplitude * 0.55})` }} /></svg>
}

function CallCanvas({ onClose }: { onClose: () => void }) {
  const [audioOnly, setAudioOnly] = useState(false)
  const [emojiCall, setEmojiCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [amplitude, setAmplitude] = useState(0.45)
  useEffect(() => { const timer = window.setInterval(() => setAmplitude(Math.random()), 700); return () => window.clearInterval(timer) }, [])
  return <div className="call-overlay" role="dialog" aria-modal="true" aria-label="Nexus call canvas">
    <div className="call-topbar"><button className="call-close" onClick={onClose} aria-label="Close call canvas"><X /></button><div><span className="call-kicker">NEXUS / LIVE CONNECTION</span><strong>Alex Morgan</strong></div><span className="call-status"><i /> 04:28</span></div>
    {!audioOnly ? <div className="video-grid"><div className="video-tile recipient-tile"><div className="video-blur" /><span className="tile-label">MORGAN / CONNECTED</span><div className="tile-avatar recipient-avatar"><UserRound /></div></div><div className={`video-tile user-tile ${emojiCall ? 'emoji-active' : ''}`}><div className="video-blur" />{emojiCall ? <div className={`live-emoji ${amplitude > .72 ? 'emoji-speaking' : ''}`}>😎</div> : <div className="tile-avatar"><UserRound /></div>}<span className="tile-label">{emojiCall ? 'VIOLET PRESENCE' : 'YOU / PRIVATE'}</span></div></div> : <div className="audio-canvas"><div className="audio-orb"><Waves /></div><p>Voice-only spatial audio</p><Waveform amplitude={amplitude} /><span className="amplitude-label">LIVE AMPLITUDE {Math.round(amplitude * 100)}%</span></div>}
    <div className="call-mode-row"><button className={!audioOnly ? 'mode-active' : ''} onClick={() => setAudioOnly(false)}><Video /> Spatial video</button><button className={audioOnly ? 'mode-active' : ''} onClick={() => setAudioOnly(true)}><Waves /> Voice only</button></div>
    <div className="call-controls"><button className={`call-control ${emojiCall ? 'control-active' : ''}`} onClick={() => setEmojiCall((v) => !v)}><Sparkles /><span>Emoji call</span></button><button className="call-control" onClick={() => setMuted((v) => !v)}>{muted ? <MicOff /> : <Mic />}<span>{muted ? 'Unmute' : 'Mute'}</span></button><button className="call-control" onClick={() => navigator.clipboard?.writeText('Nexus Canvas shared')}><Share2 /><span>Share canvas</span></button><button className="end-call" onClick={onClose} aria-label="End connection"><Phone /></button></div>
  </div>
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>(starterMessages), [draft, setDraft] = useState(''), [showPalette, setShowPalette] = useState(false), [afternoon, setAfternoon] = useState(false), [broadcast, setBroadcast] = useState(''), [callOpen, setCallOpen] = useState(false)
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const text = draft.trim(); if (!text) return; setMessages((current) => [...current, { role: 'user', text }]); setDraft('') }
  function chooseEmoji(item: (typeof violetPalette)[number]) { setMessages((current) => [...current, { role: 'user', text: item.emoji, mood: item.mood }]); setShowPalette(false); if (item.mood) { setBroadcast(item.mood === 'cool' ? "I'm good" : item.mood === 'love' ? 'Love you oo' : 'Ahh'); window.setTimeout(() => setBroadcast(''), 1800) } }
  return <main className={`nexus-shell ${afternoon ? 'afternoon' : ''}`}><section className="nexus-device" aria-label="Nexus assistant">
    <header className="nexus-header"><button className="icon-button" aria-label="Open navigation"><Menu /></button><div className="brand-lockup"><span className="brand-mark"><Sparkles /></span><span>NEXUS</span></div><button className="icon-button" aria-label="More options"><MoreHorizontal /></button></header>
    <div className="context-strip"><div className="identity-chip"><span className="status-dot" /> Alex Morgan <ChevronDown /></div><button className="theme-toggle" aria-label="Toggle theme" onClick={() => setAfternoon((v) => !v)}><Sun /></button></div>
    <div className="conversation" aria-live="polite"><div className="date-stamp"><span /> TODAY <span /></div>{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.text}-${index}`}>{message.role === 'assistant' && <div className="assistant-avatar"><Sparkles /></div>}<div className="message-content"><span className="message-label">{message.role === 'assistant' ? 'NEXUS' : 'YOU'}</span><div className={`message-bubble ${message.mood ? `mood-${message.mood}` : ''}`}>{message.text}</div>{message.role === 'assistant' && <div className="message-tools"><button aria-label="Listen to message"><Volume2 /></button><span>just now</span></div>}</div>{message.role === 'user' && <div className="user-avatar"><UserRound /></div>}</div>)}<div className="empathy-wave"><span /><span /><span /><span /><span /><span /><span /></div></div>
    <div className="composer-wrap">{broadcast && <div className="broadcast" role="status">{broadcast}</div>}{showPalette && <div className="violet-palette" role="dialog" aria-label="Violet Palette"><div className="palette-heading"><span>VIOLET PALETTE</span><button aria-label="Close palette" onClick={() => setShowPalette(false)}><X /></button></div><div className="palette-grid">{violetPalette.map((item) => <button className="palette-cell" key={item.name} onClick={() => chooseEmoji(item)}><span>{item.emoji}</span><small>{item.name}</small></button>)}</div></div>}<div className="quick-actions"><button aria-label="Attach file"><Paperclip /></button><button aria-label="Open Violet Palette" onClick={() => setShowPalette((v) => !v)}><Sparkles /></button><span className="quick-hint">Ask anything</span><button aria-label="Voice input"><Mic /></button></div><form className="composer" onSubmit={handleSubmit}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What’s on your mind?" aria-label="Message Nexus" /><button className="action-orb" type="submit" aria-label="Open call canvas" onClick={(e) => { if (!draft.trim()) { e.preventDefault(); setCallOpen(true) } }}><ArrowUp /></button></form><p className="composer-note">Nexus is here to help you think clearly.</p></div>
  </section>{callOpen && <CallCanvas onClose={() => setCallOpen(false)} />}</main>
}
