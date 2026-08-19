'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowUp, Check, ChevronDown, Code2, Copy, KeyRound, Menu, Mic, MicOff, MoreHorizontal, Paperclip, Phone, QrCode, Settings, Share2, SlidersHorizontal, Sparkles, Sun, Trash2, UserRound, Video, Volume2, Waves, X } from 'lucide-react'

type Message = { role: 'assistant' | 'user'; text: string; mood?: 'cool' | 'love' | 'sad' }
const starterMessages: Message[] = [
  { role: 'assistant', text: 'Good morning, Alex. I’m here and listening.' },
  { role: 'user', text: 'Help me shape a clear plan for today.' },
  { role: 'assistant', text: 'Absolutely. Let’s make space for what matters most.' },
]
const violetPalette = [{ emoji: '😎', name: 'Cool Avatar', mood: 'cool' as const }, { emoji: '♥', name: 'Luxury Heart', mood: 'love' as const }, { emoji: '☹', name: 'Soft Sad', mood: 'sad' as const }, { emoji: '✦', name: 'Violet Spark' }, { emoji: '☾', name: 'Quiet Night' }, { emoji: '⌁', name: 'Breathe' }]
const seedWords = ['velvet', 'orbit', 'cinder', 'lumen', 'quiet', 'violet', 'harbor', 'north', 'echo', 'silver', 'morrow', 'atlas']
const sqlBlueprint = `create extension if not exists "pgcrypto";

create type public.message_delivery_status as enum ('Sending', 'Sent', 'Read');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  alias text,
  status text default 'offline',
  created_at timestamptz default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  empathy_wave_velocity numeric default 0,
  delivery_status public.message_delivery_status not null default 'Sending',
  created_at timestamptz default now()
);

create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz default now(),
  ended_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.call_sessions enable row level security;

create policy "profiles are owner readable" on public.profiles for select using (auth.uid() = id);
create policy "conversation members can read" on public.conversations for select using (exists (select 1 from public.messages m where m.conversation_id = id and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())));
create policy "messages are sender or recipient readable" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages are sender writable" on public.messages for insert with check (auth.uid() = sender_id);
create policy "messages are participants editable" on public.messages for update using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "calls are participants readable" on public.call_sessions for select using (auth.uid() = caller_id or auth.uid() = recipient_id);
create policy "calls are caller writable" on public.call_sessions for insert with check (auth.uid() = caller_id);`

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [ghostMode, setGhostMode] = useState(false)
  const [shredder, setShredder] = useState(true)
  const [timer, setTimer] = useState('Off')
  const [audio, setAudio] = useState(78)
  const [sensitivity, setSensitivity] = useState(64)
  const [showSeed, setShowSeed] = useState(false)
  const [copied, setCopied] = useState(false)
  function copySql() { navigator.clipboard?.writeText(sqlBlueprint); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }
  return <div className={`settings-overlay ${ghostMode ? 'ghost-mode' : ''}`} role="dialog" aria-modal="true" aria-label="Nexus settings"><div className="settings-panel"><header className="settings-header"><div><span className="call-kicker">NEXUS / CONTROL MATRIX</span><h1>Settings</h1></div><button className="call-close" onClick={onClose} aria-label="Close settings"><X /></button></header><div className="settings-scroll">
    <section className="settings-section"><div className="section-title"><KeyRound /><div><h2>Cryptographic identity</h2><p>Your private connection layer</p></div></div><div className="seed-grid">{seedWords.map((word, i) => <span key={word}>{showSeed ? word : `${String(i + 1).padStart(2, '0')} •••`}</span>)}</div><div className="settings-actions"><button className="matrix-button" onClick={() => setShowSeed((v) => !v)}><KeyRound /> {showSeed ? 'Hide seed phrase' : 'Reveal seed phrase'}</button><button className="matrix-button"><QrCode /> Spatial QR code</button></div><div className="ledger"><span>KEY ROTATION LEDGER</span><b><Check /> Active · rotated today</b><small>ed25519 / local-only identity</small></div></section>
    <section className="settings-section"><div className="section-title"><SlidersHorizontal /><div><h2>Spatial privacy control</h2><p>Decide what leaves the room</p></div></div><ToggleRow label="Ghost Mode" description="Low-contrast monochrome surface" value={ghostMode} onChange={setGhostMode} /><ToggleRow label="Metadata Shredder" description="Strip location and device metadata" value={shredder} onChange={setShredder} /><label className="select-row"><span><b>Ephemeral timer</b><small>Auto-expire new messages</small></span><select value={timer} onChange={(e) => setTimer(e.target.value)}>{['Off', '1hr', '24hr', '7d'].map((option) => <option key={option}>{option}</option>)}</select></label></section>
    <section className="settings-section"><div className="section-title"><Waves /><div><h2>Hardware codecs</h2><p>Tune your spatial presence</p></div></div><RangeRow label="High-fidelity audio tuning" value={audio} onChange={setAudio} /><RangeRow label="Waveform sensitivity" value={sensitivity} onChange={setSensitivity} /></section>
    <section className="settings-section developer-card"><div className="section-title"><Code2 /><div><h2>Zero-knowledge SQL blueprint</h2><p>Supabase-ready schema with strict participant RLS</p></div></div><pre>{sqlBlueprint}</pre><button className="matrix-button" onClick={copySql}>{copied ? <Check /> : <Copy />} {copied ? 'Copied blueprint' : 'Copy SQL blueprint'}</button></section>
  </div></div></div>
}
function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) { return <div className="toggle-row"><span><b>{label}</b><small>{description}</small></span><button className={`switch ${value ? 'switch-on' : ''}`} onClick={() => onChange(!value)} aria-pressed={value} aria-label={`Toggle ${label}`}><i /></button></div> }
function RangeRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="range-row"><span><b>{label}</b><strong>{value}%</strong></span><input type="range" min="0" max="100" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label> }
function Waveform({ amplitude }: { amplitude: number }) { return <svg className="call-waveform" viewBox="0 0 360 160" role="img" aria-label="Live audio waveform"><path d="M0 80 C20 80 24 55 42 55 S65 105 83 105 S105 28 125 28 S145 126 166 126 S188 45 208 45 S230 94 249 94 S270 18 289 18 S309 80 330 80 S345 67 360 67" style={{ transform: `scaleY(${0.7 + amplitude * 0.55})` }} /></svg> }
function CallCanvas({ onClose }: { onClose: () => void }) { const [audioOnly, setAudioOnly] = useState(false); const [emojiCall, setEmojiCall] = useState(false); const [muted, setMuted] = useState(false); const [amplitude, setAmplitude] = useState(.45); useEffect(() => { const timer = window.setInterval(() => setAmplitude(Math.random()), 700); return () => window.clearInterval(timer) }, []); return <div className="call-overlay" role="dialog" aria-modal="true" aria-label="Nexus call canvas"><div className="call-topbar"><button className="call-close" onClick={onClose} aria-label="Close call canvas"><X /></button><div><span className="call-kicker">NEXUS / LIVE CONNECTION</span><strong>Alex Morgan</strong></div><span className="call-status"><i /> 04:28</span></div>{!audioOnly ? <div className="video-grid"><div className="video-tile recipient-tile"><div className="video-blur" /><span className="tile-label">MORGAN / CONNECTED</span><div className="tile-avatar recipient-avatar"><UserRound /></div></div><div className={`video-tile user-tile ${emojiCall ? 'emoji-active' : ''}`}><div className="video-blur" />{emojiCall ? <div className={`live-emoji ${amplitude > .72 ? 'emoji-speaking' : ''}`}>😎</div> : <div className="tile-avatar"><UserRound /></div>}<span className="tile-label">{emojiCall ? 'VIOLET PRESENCE' : 'YOU / PRIVATE'}</span></div></div> : <div className="audio-canvas"><div className="audio-orb"><Waves /></div><p>Voice-only spatial audio</p><Waveform amplitude={amplitude} /><span className="amplitude-label">LIVE AMPLITUDE {Math.round(amplitude * 100)}%</span></div>}<div className="call-mode-row"><button className={!audioOnly ? 'mode-active' : ''} onClick={() => setAudioOnly(false)}><Video /> Spatial video</button><button className={audioOnly ? 'mode-active' : ''} onClick={() => setAudioOnly(true)}><Waves /> Voice only</button></div><div className="call-controls"><button className={`call-control ${emojiCall ? 'control-active' : ''}`} onClick={() => setEmojiCall((v) => !v)}><Sparkles /><span>Emoji call</span></button><button className="call-control" onClick={() => setMuted((v) => !v)}>{muted ? <MicOff /> : <Mic />}<span>{muted ? 'Unmute' : 'Mute'}</span></button><button className="call-control" onClick={() => navigator.clipboard?.writeText('Nexus Canvas shared')}><Share2 /><span>Share canvas</span></button><button className="end-call" onClick={onClose} aria-label="End connection"><Phone /></button></div></div> }
export default function Page() { const [messages, setMessages] = useState<Message[]>(starterMessages), [draft, setDraft] = useState(''), [showPalette, setShowPalette] = useState(false), [afternoon, setAfternoon] = useState(false), [broadcast, setBroadcast] = useState(''), [callOpen, setCallOpen] = useState(false), [settingsOpen, setSettingsOpen] = useState(false); function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const text = draft.trim(); if (!text) return; setMessages((current) => [...current, { role: 'user', text }]); setDraft('') } function chooseEmoji(item: (typeof violetPalette)[number]) { setMessages((current) => [...current, { role: 'user', text: item.emoji, mood: item.mood }]); setShowPalette(false); if (item.mood) { setBroadcast(item.mood === 'cool' ? "I'm good" : item.mood === 'love' ? 'Love you oo' : 'Ahh'); window.setTimeout(() => setBroadcast(''), 1800) } } return <main className={`nexus-shell ${afternoon ? 'afternoon' : ''}`}><section className="nexus-device" aria-label="Nexus assistant"><header className="nexus-header"><button className="icon-button" aria-label="Open navigation"><Menu /></button><div className="brand-lockup"><span className="brand-mark"><Sparkles /></span><span>NEXUS</span></div><div className="header-actions"><button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings /></button><button className="icon-button" aria-label="More options"><MoreHorizontal /></button></div></header><div className="context-strip"><div className="identity-chip"><span className="status-dot" /> Alex Morgan <ChevronDown /></div><button className="theme-toggle" aria-label="Toggle theme" onClick={() => setAfternoon((v) => !v)}><Sun /></button></div><div className="conversation" aria-live="polite"><div className="date-stamp"><span /> TODAY <span /></div>{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.text}-${index}`}>{message.role === 'assistant' && <div className="assistant-avatar"><Sparkles /></div>}<div className="message-content"><span className="message-label">{message.role === 'assistant' ? 'NEXUS' : 'YOU'}</span><div className={`message-bubble ${message.mood ? `mood-${message.mood}` : ''}`}>{message.text}</div>{message.role === 'assistant' && <div className="message-tools"><button aria-label="Listen to message"><Volume2 /></button><span>just now</span></div>}</div>{message.role === 'user' && <div className="user-avatar"><UserRound /></div>}</div>)}<div className="empathy-wave"><span /><span /><span /><span /><span /><span /><span /></div></div><div className="composer-wrap">{broadcast && <div className="broadcast" role="status">{broadcast}</div>}{showPalette && <div className="violet-palette" role="dialog" aria-label="Violet Palette"><div className="palette-heading"><span>VIOLET PALETTE</span><button aria-label="Close palette" onClick={() => setShowPalette(false)}><X /></button></div><div className="palette-grid">{violetPalette.map((item) => <button className="palette-cell" key={item.name} onClick={() => chooseEmoji(item)}><span>{item.emoji}</span><small>{item.name}</small></button>)}</div></div>}<div className="quick-actions"><button aria-label="Attach file"><Paperclip /></button><button aria-label="Open Violet Palette" onClick={() => setShowPalette((v) => !v)}><Sparkles /></button><span className="quick-hint">Ask anything</span><button aria-label="Voice input"><Mic /></button></div><form className="composer" onSubmit={handleSubmit}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What’s on your mind?" aria-label="Message Nexus" /><button className="action-orb" type="submit" aria-label="Open call canvas" onClick={(e) => { if (!draft.trim()) { e.preventDefault(); setCallOpen(true) } }}><ArrowUp /></button></form><p className="composer-note">Nexus is here to help you think clearly.</p></div></section>{callOpen && <CallCanvas onClose={() => setCallOpen(false)} />}{settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}</main> }
