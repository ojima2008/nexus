'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, Camera, Check, ChevronRight, Copy, DollarSign, KeyRound, Menu, Mic, MoreHorizontal, Paperclip, Phone, Plus, QrCode, Radio, Search, Send, Settings, Smile, Sparkles, Type, UserRound, Video, Wallet, X } from 'lucide-react'

type Status = { kind: 'text' | 'video' | 'audio'; text?: string; mediaUrl?: string }
type Contact = { id: string; name: string; alias: string; snippet: string; time: string; online: boolean; emoji: string; status?: Status }
type View = 'ONBOARDING' | 'CHAT_LIST' | 'ACTIVE_CHAT' | 'PROFILE_MENU'
type Avatar = { url: string; isVideo: boolean } | null
type StatusOverlay = { mode: 'broadcast' } | { mode: 'player'; contact: Contact } | null
type Message =
  | { id: number; mine: boolean; kind: 'text'; text: string; time: string }
  | { id: number; mine: boolean; kind: 'payment'; amount: number; time: string }

const initialContacts: Contact[] = [
  { id: 'morgan', name: 'Morgan Lee', alias: '@morgan', snippet: 'The violet room is ready.', time: '09:42', online: true, emoji: 'M', status: { kind: 'text', text: 'In the violet room, thinking in low light.' } },
  { id: 'sage', name: 'Sage Chen', alias: '@sage', snippet: 'Sending you the notes now.', time: 'Yesterday', online: true, emoji: 'S', status: { kind: 'audio', text: 'Ambient loop · rain on glass' } },
  { id: 'riley', name: 'Riley Park', alias: '@riley', snippet: 'That sounds like a plan.', time: 'Tue', online: false, emoji: 'R' },
  { id: 'noah', name: 'Noah Williams', alias: '@noah', snippet: 'Let’s talk after sunset.', time: 'Mon', online: true, emoji: 'N', status: { kind: 'text', text: 'Chasing the last of the light.' } },
]
const friendPool = [
  { name: 'Ava Stone', alias: '@ava', snippet: 'Key linked · say hello', emoji: 'A' },
  { name: 'Theo Marsh', alias: '@theo', snippet: 'Connected through your Nexus key', emoji: 'T' },
  { name: 'Iris Vale', alias: '@iris', snippet: 'New encrypted channel open', emoji: 'I' },
  { name: 'Leo Kane', alias: '@leo', snippet: 'Verified friend key', emoji: 'L' },
]
const seed = ['velvet','orbit','cinder','lumen','quiet','violet','harbor','north','echo','silver','morrow','atlas']
const dialCodes = [
  { code: '+1', label: 'US' },
  { code: '+44', label: 'UK' },
  { code: '+91', label: 'IN' },
  { code: '+234', label: 'NG' },
  { code: '+81', label: 'JP' },
  { code: '+49', label: 'DE' },
  { code: '+61', label: 'AU' },
  { code: '+55', label: 'BR' },
]
type Mood = 'cool' | 'love' | 'shock'
const emojiPalette: { char: string; label: string; mood: Mood }[] = [
  { char: '😎', label: "I'm Good", mood: 'cool' },
  { char: '♥️', label: 'Love You Oo', mood: 'love' },
  { char: '😮', label: 'Ahh', mood: 'shock' },
  { char: '✨', label: 'Shimmer', mood: 'cool' },
  { char: '🔥', label: 'Warmth', mood: 'love' },
  { char: '😭', label: 'Overwhelm', mood: 'shock' },
]
const moodVoice: Record<Mood, string> = { cool: "Vocalizing Mood: I'm Good", love: 'Vocalizing Mood: Love You Oo', shock: 'Ahh' }

function Mark() { return <span className="brand-mark"><Sparkles /></span> }
function Tap({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`tap ${className}`} {...props} /> }
function Toast({ text }: { text: string }) { return <div className="toast" role="status"><Check /> {text}</div> }

/* Short synthesized "mood" audio burst via the Web Audio API — real, and fully guarded. */
function playTone(mood: Mood) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = mood === 'shock' ? 'triangle' : 'sine'
    osc.frequency.value = mood === 'love' ? 523.25 : mood === 'cool' ? 392 : 300
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.62)
    osc.onended = () => { try { ctx.close() } catch { /* noop */ } }
  } catch { /* audio unavailable — the on-screen overlay still fires */ }
}

/* Living avatar — streams a looping muted video or falls back to image / icon */
function AvatarMedia({ avatar, fallback }: { avatar: Avatar; fallback: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [avatar?.url])
  useEffect(() => {
    if (!avatar?.isVideo || failed) return
    const node = videoRef.current
    if (!node) return
    const play = node.play()
    if (play && typeof play.catch === 'function') play.catch(() => {})
  }, [avatar?.isVideo, avatar?.url, failed])
  if (avatar && !failed) {
    if (avatar.isVideo) return <video ref={videoRef} className="avatar-media" src={avatar.url} loop muted playsInline autoPlay onError={() => setFailed(true)} />
    return <img className="avatar-media" src={avatar.url || "/placeholder.svg"} alt="Your profile avatar" onError={() => setFailed(true)} />
  }
  return <>{fallback}</>
}

/* Deterministic decorative QR module grid (finder patterns + data). */
function qrModules(seedStr: string, n: number): boolean[][] {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619) }
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 }
  const grid: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => rand() > 0.52))
  const place = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const ring = i === 0 || i === 6 || j === 0 || j === 6
      const core = i >= 2 && i <= 4 && j >= 2 && j <= 4
      grid[r + i][c + j] = ring || core
    }
    for (let i = -1; i < 8; i++) for (let j = -1; j < 8; j++) {
      if (i === -1 || i === 7 || j === -1 || j === 7) { const rr = r + i, cc = c + j; if (rr >= 0 && cc >= 0 && rr < n && cc < n) grid[rr][cc] = false }
    }
  }
  place(0, 0); place(0, n - 7); place(n - 7, 0)
  return grid
}
function QrCanvas({ seedStr }: { seedStr: string }) {
  const n = 23
  const grid = useMemo(() => qrModules(seedStr, n), [seedStr])
  return (
    <svg className="qr-svg" viewBox={`0 0 ${n} ${n}`} role="img" aria-label="Your Nexus identity key">
      {grid.map((row, r) => row.map((on, c) => on ? <rect key={`${r}-${c}`} x={c + 0.08} y={r + 0.08} width={0.84} height={0.84} rx={0.26} /> : null))}
    </svg>
  )
}

/* Pillar 1 — spatial QR gateway + simulated scan viewport */
function QrPanel({ variant = 'full', onAddFriend }: { variant?: 'full' | 'compact'; onAddFriend: () => void }) {
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState('')
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)) }, [])
  function scan() {
    setScanning(true); setStatus('Searching for a friend key…')
    timers.current.push(window.setTimeout(() => setStatus('Key found · verifying signature'), 1150))
    timers.current.push(window.setTimeout(() => { setScanning(false); setStatus(''); onAddFriend() }, 2150))
  }
  return (
    <div className={`qr-panel ${variant}`}>
      <div className="qr-frame">
        <span className="qr-grid-lines" aria-hidden />
        <QrCanvas seedStr="nexus://key/0x7a9C91eA2d7F8B2c4F2B" />
        <span className="qr-pulse" aria-hidden />
      </div>
      <div className="qr-meta"><b>Your Nexus Key</b><small>Let a friend scan this to connect instantly</small></div>
      <Tap className="qr-scan-btn" onClick={scan}><Camera /> Scan Friend&apos;s Key</Tap>
      {scanning && (
        <div className="scan-overlay" role="dialog" aria-label="Scanning for a friend key">
          <div className="scan-viewport">
            <span className="scan-line" aria-hidden />
            <span className="scan-corner tl" aria-hidden /><span className="scan-corner tr" aria-hidden />
            <span className="scan-corner bl" aria-hidden /><span className="scan-corner br" aria-hidden />
            <QrCode className="scan-ghost" aria-hidden />
          </div>
          <p>{status}</p>
          <Tap className="scan-cancel" onClick={() => { setScanning(false); setStatus('') }}>Cancel</Tap>
        </div>
      )}
    </div>
  )
}

function Gateway({ onEnter, onAddFriend }: { onEnter: () => void; onAddFriend: () => void }) {
  const [loading, setLoading] = useState(false); const [generated, setGenerated] = useState(false); const [revealed, setRevealed] = useState(false)
  const [linkPhone, setLinkPhone] = useState(false); const [dial, setDial] = useState('+1'); const [phone, setPhone] = useState('')
  function generate() { setLoading(true); window.setTimeout(() => { setLoading(false); setGenerated(true) }, 1500) }
  return <main className="gateway"><div className="gateway-art"><div className="gateway-ring" /><div className="gateway-mark"><Mark /></div></div><span className="eyebrow">PRIVATE MESSENGER / 01</span><h1>Find your people.<br /><em>Keep your space.</em></h1><p className="gateway-copy">Nexus is a quiet, cryptographic room for the people who matter. No feeds. No noise. Just presence.</p>{!generated ? <Tap className="primary-action" onClick={generate} disabled={loading}>{loading ? <span className="spinner" /> : <KeyRound />} {loading ? 'Generating local identity...' : 'Generate cryptographic profile identity'} <ChevronRight /></Tap> : <div className="identity-card"><div className="identity-card-head"><span>YOUR PRIVATE SEED</span><Tap onClick={() => setRevealed(!revealed)}>{revealed ? 'Mask' : 'Reveal'}</Tap></div><div className="seed-words">{seed.map((word, i) => <span key={word}>{revealed ? `${i + 1}. ${word}` : `${String(i + 1).padStart(2,'0')} •••••`}</span>)}</div>
    <div className="recovery-slot">
      <button type="button" className={`recovery-toggle ${linkPhone ? 'on' : ''}`} onClick={() => setLinkPhone(!linkPhone)} aria-pressed={linkPhone}>
        <span className="recovery-copy"><b>Link Phone Number for Recovery</b><small>Optional · stay 100% anonymous, or add a fallback</small></span>
        <span className="recovery-switch"><i /></span>
      </button>
      <div className={`recovery-field ${linkPhone ? 'open' : ''}`}>
        <div className="recovery-input">
          <div className="dial-picker">
            <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Country code">
              {dialCodes.map((d) => <option key={d.code} value={d.code}>{d.label} {d.code}</option>)}
            </select>
            <ChevronRight />
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))} inputMode="tel" placeholder="Phone number" />
        </div>
        <small className="recovery-note">Never shared. Used only to restore your seed if this device is lost.</small>
      </div>
    </div>
    <div className="gateway-qr-slot"><span className="slot-label">SPATIAL KEY EXCHANGE</span><QrPanel variant="compact" onAddFriend={onAddFriend} /></div>
    <Tap className="primary-action" onClick={onEnter}>Enter Nexus Network <ArrowUp /></Tap></div>}<small className="gateway-note">Your identity is generated on-device and never stored by Nexus.</small></main>
}

function ProfileDrawer({ avatar, setAvatar, onClose, onToast, onAddFriend }: { avatar: Avatar; setAvatar: (value: Avatar | ((prev: Avatar) => Avatar)) => void; onClose: () => void; onToast: (text: string) => void; onAddFriend: () => void }) {
  const wallet = '0x7a9C...4F2B';
  function upload(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) { const isVideo = file.type.startsWith('video/'); setAvatar((prev) => { if (prev?.url?.startsWith('blob:')) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(file), isVideo } }); onToast(isVideo ? 'Living video avatar is live' : 'Avatar updated') } }
  async function copyAddress() { await navigator.clipboard?.writeText('0x7a9C91eA2d7F8B2c4F2B'); onToast('Wallet address copied') }
  return <div className="drawer-backdrop" onClick={onClose}><aside className="profile-drawer" onClick={(e) => e.stopPropagation()}><header className="drawer-header"><div><span className="eyebrow">NEXUS / PROFILE</span><h2>Your space</h2></div><Tap className="nav-icon" onClick={onClose} aria-label="Close profile menu"><X /></Tap></header><label className="avatar-upload"><input type="file" accept="image/*,video/*" onChange={upload} /><AvatarMedia avatar={avatar} fallback={<UserRound />} /><span>{avatar?.isVideo ? 'Change video · live' : 'Change avatar'}</span></label><section className="wallet-card"><div className="wallet-title"><Wallet /><span>NEXUS CRYPTO WALLET</span><small>LIVE</small></div><strong>$1,250.00</strong><p>0.5 ETH · available balance</p><div className="wallet-address"><code>{wallet}</code><Tap onClick={copyAddress} aria-label="Copy wallet address"><Copy /></Tap></div><div className="wallet-actions"><Tap onClick={() => onToast('Send flow ready')}><Send /> Send</Tap><Tap onClick={() => onToast('Receive address ready')}><QrCode /> Receive</Tap><Tap onClick={() => onToast('Swap flow ready')}><Sparkles /> Swap</Tap></div></section><section className="wallet-qr"><div className="section-label"><span>Key Exchange</span><span className="muted">Live QR</span></div><QrPanel variant="compact" onAddFriend={onAddFriend} /></section><section className="drawer-links"><Tap onClick={() => onToast('Privacy center opened')}><KeyRound /><span><b>Privacy center</b><small>Identity capsule and encryption</small></span><ChevronRight /></Tap><Tap onClick={() => onToast('Notifications are enabled')}><Sparkles /><span><b>Notifications</b><small>Quiet hours and mentions</small></span><ChevronRight /></Tap><Tap onClick={() => onToast('Settings saved locally')}><Settings /><span><b>Preferences</b><small>Appearance and language</small></span><ChevronRight /></Tap></section></aside></div>
}

function Directory({ avatar, contacts, freshId, myStatus, onSelect, onProfile, onBroadcast, onOpenStatus }: { avatar: Avatar; contacts: Contact[]; freshId: string | null; myStatus: Status | null; onSelect: (contact: Contact) => void; onProfile: () => void; onBroadcast: () => void; onOpenStatus: (contact: Contact) => void }) {
  const withStatus = contacts.filter((c) => c.status)
  return <main className="messenger-shell"><header className="messenger-header"><Tap className="nav-icon" aria-label="Open menu"><Menu /></Tap><div className="brand-lockup"><Mark /><b>NEXUS</b></div><div className="header-actions"><Tap className="nav-icon" aria-label="More options"><MoreHorizontal /></Tap><Tap className="nav-icon profile-button avatar-slot" onClick={onProfile} aria-label="Open profile wallet"><AvatarMedia avatar={avatar} fallback={<UserRound />} /></Tap></div></header><div className="directory-head"><div><span className="eyebrow">PRIVATE NETWORK</span><h1>Your people<span>.</span></h1></div><Tap className={`profile-orb avatar-slot ${myStatus ? 'status-ring' : ''}`} onClick={onBroadcast} aria-label="Broadcast your living status sphere"><AvatarMedia avatar={avatar} fallback={<UserRound />} /></Tap></div><div className="search-bar"><Search /><input placeholder="Search your network" /></div><section className="stories"><div className="section-label"><span>Living Status</span><Tap onClick={onBroadcast}>Broadcast</Tap></div><div className="story-row"><Tap className="story" onClick={onBroadcast}><span className={`story-avatar sphere-avatar avatar-slot ${myStatus ? 'status-ring' : 'story-idle'}`}><AvatarMedia avatar={avatar} fallback={<Plus />} /></span><small>Your status</small></Tap>{withStatus.map((contact) => <Tap className="story" key={contact.id} onClick={() => onOpenStatus(contact)}><span className="story-avatar sphere-avatar status-ring">{contact.emoji}</span><small>{contact.name.split(' ')[0]}</small></Tap>)}</div></section><section className="contacts"><div className="section-label"><span>Conversations</span><span className="muted">{contacts.length} people</span></div>{contacts.map((contact) => <Tap className={`contact-row ${freshId === contact.id ? 'contact-fresh' : ''}`} key={contact.id} onClick={() => onSelect(contact)}><span className={`contact-avatar ${contact.online ? 'online' : ''} ${contact.status ? 'status-ring' : ''}`}>{contact.emoji}</span><span className="contact-copy"><b>{contact.name}</b><small>{contact.alias} · {contact.snippet}</small></span><span className="contact-meta"><small>{contact.time}</small><ChevronRight /></span></Tap>)}</section><footer className="network-footer"><span className="online-dot" /> Encrypted network <span>·</span> 12 peers online</footer></main>
}

/* Pillar 3 — floating organic status sphere player with swipe-down close */
function StatusSphere({ subject, onClose }: { subject: Contact; onClose: () => void }) {
  const status = subject.status as Status
  const [dragY, setDragY] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    if (status.kind !== 'audio' || status.mediaUrl) return
    let ctx: AudioContext | null = null
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = new AC()
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = 108
      lfo.type = 'sine'; lfo.frequency.value = 0.35; lfoGain.gain.value = 26
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency)
      gain.gain.value = 0.05; osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); lfo.start()
    } catch { /* ambiance unavailable */ }
    return () => { try { ctx?.close() } catch { /* noop */ } }
  }, [status])
  function down(e: React.PointerEvent) { startRef.current = e.clientY }
  function move(e: React.PointerEvent) { if (startRef.current == null) return; setDragY(Math.max(0, e.clientY - startRef.current)) }
  function end() { if (dragY > 120) { onClose(); return } setDragY(0); startRef.current = null }
  return (
    <div className="sphere-overlay" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} role="dialog" aria-label={`${subject.name} living status`}>
      <div className="sphere-drag" style={{ transform: `translateY(${dragY}px)`, opacity: Math.max(0, 1 - dragY / 360) }}>
        <div className={`sphere-body sphere-${status.kind}`}>
          {status.kind === 'video' && status.mediaUrl
            ? <video className="sphere-media" src={status.mediaUrl} loop muted playsInline autoPlay />
            : status.kind === 'audio' && status.mediaUrl
              ? <><span className="sphere-orb-mark">{subject.emoji}</span><audio src={status.mediaUrl} loop autoPlay /></>
              : <span className="sphere-orb-mark">{status.kind === 'audio' ? <Radio /> : subject.emoji}</span>}
          {status.kind !== 'video' && <span className="sphere-ambient-bars" aria-hidden><i /><i /><i /><i /><i /></span>}
        </div>
        <div className="sphere-info"><b>{subject.name}</b>{status.text && <p>{status.text}</p>}<small>{status.kind === 'video' ? '15s ambient video loop' : status.kind === 'audio' ? '10s ambient audio loop' : 'living status'}</small></div>
        <span className="sphere-hint">Swipe down to close</span>
      </div>
    </div>
  )
}

/* Pillar 3 — broadcast composer */
function BroadcastOverlay({ current, onSave, onClose, onToast }: { current: Status | null; onSave: (status: Status) => void; onClose: () => void; onToast: (text: string) => void }) {
  const [text, setText] = useState(current?.text ?? '')
  const [kind, setKind] = useState<Status['kind']>(current?.kind ?? 'text')
  const [mediaUrl, setMediaUrl] = useState(current?.mediaUrl ?? '')
  const [recording, setRecording] = useState(false)
  const recRef = useRef<MediaRecorder | null>(null)
  useEffect(() => () => { if (mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl) }, [mediaUrl])
  function pickVideo(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setMediaUrl((prev) => { if (prev.startsWith('blob:')) URL.revokeObjectURL(prev); return URL.createObjectURL(f) }); setKind('video'); onToast('15s video snippet attached') }
  async function record() {
    if (recording) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => { const blob = new Blob(chunks, { type: 'audio/webm' }); setMediaUrl((prev) => { if (prev.startsWith('blob:')) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) }); setKind('audio'); stream.getTracks().forEach((t) => t.stop()); setRecording(false); onToast('10s ambient loop captured') }
      recRef.current = rec; rec.start(); setKind('audio'); setRecording(true)
      window.setTimeout(() => { if (rec.state !== 'inactive') rec.stop() }, 10000)
    } catch { setKind('audio'); setMediaUrl(''); setRecording(false); onToast('Ambient loop captured · simulated') }
  }
  function save() { const status: Status = { kind, text: text.trim() || undefined, mediaUrl: mediaUrl || undefined }; onSave(status); onToast('Living status sphere broadcast'); onClose() }
  return (
    <div className="broadcast-overlay" onClick={onClose}>
      <div className="broadcast-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="broadcast-head"><div><span className="eyebrow">NEXUS / STATUS</span><h2>Broadcast Living Status Sphere</h2></div><Tap className="nav-icon" onClick={onClose} aria-label="Close broadcast"><X /></Tap></div>
        <textarea className="broadcast-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={90} rows={2} placeholder="Say something ambient…" />
        <div className="broadcast-modes">
          <button type="button" className={`mode-btn ${kind === 'text' ? 'on' : ''}`} onClick={() => setKind('text')}><Type /><b>Text</b><small>A quiet line</small></button>
          <label className={`mode-btn ${kind === 'video' ? 'on' : ''}`}><input type="file" accept="video/*" onChange={pickVideo} /><Video /><b>Video</b><small>15s loop</small></label>
          <button type="button" className={`mode-btn ${recording ? 'rec' : kind === 'audio' ? 'on' : ''}`} onClick={record}><Mic /><b>{recording ? 'Recording…' : 'Ambient'}</b><small>10s audio</small></button>
        </div>
        <Tap className="broadcast-save" onClick={save}><Radio /> Broadcast Sphere</Tap>
      </div>
    </div>
  )
}

/* Pillar 2 — violet speaking emoji palette */
function EmojiDrawer({ open, onPick, onClose }: { open: boolean; onPick: (e: { char: string; label: string; mood: Mood }) => void; onClose: () => void }) {
  return (
    <div className={`emoji-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="emoji-inner">
        <div className="palette-heading"><span>VIOLET PALETTE · SPEAKING MOODS</span><Tap onClick={onClose} aria-label="Close emoji palette"><X /></Tap></div>
        <div className="palette-grid">
          {emojiPalette.map((e) => <Tap className={`palette-cell mood-${e.mood}`} key={e.char} onClick={() => onPick(e)}><span>{e.char}</span><small>{e.label}</small></Tap>)}
        </div>
      </div>
    </div>
  )
}

function Chat({ contact, avatar, onBack, onProfile, onToast }: { contact: Contact; avatar: Avatar; onBack: () => void; onProfile: () => void; onToast: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, mine: false, kind: 'text', text: 'Good morning. I left a little space here for you.', time: '09:40' },
    { id: 2, mine: true, kind: 'text', text: 'I like that. Let’s make today feel intentional.', time: '09:41 · Sent' },
  ])
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState(25)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [mood, setMood] = useState<{ mood: Mood; char: string } | null>(null)
  useEffect(() => { if (!mood) return; const t = window.setTimeout(() => setMood(null), 1500); return () => window.clearTimeout(t) }, [mood])
  function submit(e: FormEvent) { e.preventDefault(); const message = draft.trim(); if (!message) return; setMessages((current) => [...current, { id: Date.now(), mine: true, kind: 'text', text: message, time: '09:41 · Sent' }]); setDraft('') }
  function sendFunds() { setMessages((current) => [...current, { id: Date.now(), mine: true, kind: 'payment', amount, time: '09:41 · Sent' }]); setPayOpen(false); onToast(`Sent $${amount.toFixed(2)}`) }
  function pickEmoji(e: { char: string; label: string; mood: Mood }) { setDraft((d) => d + e.char); setMood({ mood: e.mood, char: e.char }); playTone(e.mood) }
  return <main className="messenger-shell chat-shell"><header className="chat-header"><Tap className="nav-icon" onClick={onBack} aria-label="Back"><ArrowLeft /></Tap><span className={`chat-avatar ${contact.online ? 'online' : ''} ${contact.status ? 'status-ring' : ''}`}>{contact.emoji}</span><div className="chat-title"><b>{contact.name}</b><small>{contact.online ? 'online now' : 'last seen recently'}</small></div><div className="header-actions"><Tap className="nav-icon" aria-label="Start video call"><Video /></Tap><Tap className="nav-icon avatar-slot" onClick={onProfile} aria-label="Open profile"><AvatarMedia avatar={avatar} fallback={<MoreHorizontal />} /></Tap></div></header><div className="chat-transcript"><div className="date-stamp"><span /> TODAY <span /></div>{messages.map((message) => message.kind === 'payment'
    ? <div className={`chat-message payment ${message.mine ? 'mine' : ''}`} key={message.id}><div className="payment-card"><div className="payment-glow" /><div className="payment-head"><span className="payment-badge"><DollarSign /></span><div><small>NEXUS PAYMENT</small><b>${message.amount.toFixed(2)}</b></div></div><span className="payment-status"><Check /> Funds sent · settled instantly</span></div><small>{message.time}</small></div>
    : <div className={`chat-message ${message.mine ? 'mine' : ''}`} key={message.id}><p>{message.text}</p><small>{message.time}</small></div>)}<div className="typing"><span /> {contact.name} is in the room</div></div><div className="chat-composer-wrap">
    <div className={`pay-module ${payOpen ? 'open' : ''}`}>
      <div className="pay-head"><span>SEND FUNDS</span><b>${amount.toFixed(2)}</b></div>
      <input className="pay-slider" type="range" min={1} max={500} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Amount to send" />
      <div className="pay-scale"><small>$1</small><small>$500</small></div>
      <Tap className="pay-send" onClick={sendFunds}><Wallet /> Send Funds</Tap>
    </div>
    <EmojiDrawer open={emojiOpen} onPick={pickEmoji} onClose={() => setEmojiOpen(false)} />
    <div className="chat-tools"><Tap aria-label="Attach file"><Paperclip /></Tap><Tap className={`emoji-toggle ${emojiOpen ? 'active' : ''}`} onClick={() => setEmojiOpen((v) => !v)} aria-label="Open violet emoji palette"><Smile /></Tap><Tap className={`money-toggle ${payOpen ? 'active' : ''}`} onClick={() => setPayOpen(!payOpen)} aria-label="Open send funds panel"><DollarSign /></Tap><span>Private message</span><Tap aria-label="Start call"><Phone /></Tap></div><form className="chat-composer" onSubmit={submit}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Say something true..." /><Tap className="send-orb" aria-label="Send message"><ArrowUp /></Tap></form><small className="composer-note">End-to-end encrypted · ephemeral by default</small></div>
    {mood && <div className={`mood-fx mood-${mood.mood}`} aria-hidden><span className="mood-emoji">{mood.char}</span>{mood.mood === 'shock' ? <span className="ahh-ripple"><span className="ahh-label">Ahh</span></span> : <div className="mood-voice"><span className="mv-bars"><i /><i /><i /><i /></span>{moodVoice[mood.mood]}</div>}</div>}
  </main>
}

export default function Page() {
  const [view, setView] = useState<View>('ONBOARDING')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [avatar, setAvatar] = useState<Avatar>(null)
  const [toast, setToast] = useState('')
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [freshId, setFreshId] = useState<string | null>(null)
  const [myStatus, setMyStatus] = useState<Status | null>(null)
  const [statusOverlay, setStatusOverlay] = useState<StatusOverlay>(null)
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2200); return () => window.clearTimeout(timer) }, [toast])
  function showToast(text: string) { setToast(text) }
  function addFriend() {
    const pick = friendPool[Math.floor(Math.random() * friendPool.length)]
    const id = `f-${Date.now()}`
    setContacts((prev) => [{ id, online: true, time: 'now', ...pick }, ...prev])
    setFreshId(id)
    showToast('Friend key verified · added to network')
    window.setTimeout(() => setFreshId((cur) => (cur === id ? null : cur)), 1500)
  }
  const directoryProps = { avatar, contacts, freshId, myStatus, onSelect: (contact: Contact) => { setSelected(contact); setView('ACTIVE_CHAT') }, onProfile: () => setView('PROFILE_MENU'), onBroadcast: () => setStatusOverlay({ mode: 'broadcast' }), onOpenStatus: (contact: Contact) => setStatusOverlay({ mode: 'player', contact }) }
  return <div className="app-canvas">
    <div className="view-stage" key={view === 'PROFILE_MENU' ? (selected ? 'ACTIVE_CHAT' : 'CHAT_LIST') : view}>
      {view === 'ONBOARDING' && <Gateway onEnter={() => setView('CHAT_LIST')} onAddFriend={addFriend} />}
      {view === 'CHAT_LIST' && <Directory {...directoryProps} />}
      {view === 'ACTIVE_CHAT' && selected && <Chat contact={selected} avatar={avatar} onBack={() => setView('CHAT_LIST')} onProfile={() => setView('PROFILE_MENU')} onToast={showToast} />}
      {view === 'PROFILE_MENU' && (selected ? <Chat contact={selected} avatar={avatar} onBack={() => setView('CHAT_LIST')} onProfile={() => setView('PROFILE_MENU')} onToast={showToast} /> : <Directory {...directoryProps} />)}
    </div>
    {view === 'PROFILE_MENU' && <ProfileDrawer avatar={avatar} setAvatar={setAvatar} onClose={() => setView(selected ? 'ACTIVE_CHAT' : 'CHAT_LIST')} onToast={showToast} onAddFriend={addFriend} />}
    {statusOverlay?.mode === 'broadcast' && <BroadcastOverlay current={myStatus} onSave={setMyStatus} onClose={() => setStatusOverlay(null)} onToast={showToast} />}
    {statusOverlay?.mode === 'player' && <StatusSphere subject={statusOverlay.contact} onClose={() => setStatusOverlay(null)} />}
    {toast && <Toast text={toast} />}
  </div>
}
