'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, Camera, Check, ChevronRight, Copy, DollarSign, Eye, KeyRound, LogOut, Menu, Mic, MicOff, MoreHorizontal, Paperclip, Phone, PhoneOff, QrCode, Radio, Search, Send, Settings, Smile, Sparkles, Type, UserRound, Video, Wallet, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = { kind: 'text' | 'video' | 'audio' | 'image'; text?: string; mediaUrl?: string }
type Contact = { id: string; name: string; alias: string; snippet: string; time: string; online: boolean; emoji: string; status?: Status }
type View = 'CHAT_LIST' | 'ACTIVE_CHAT' | 'PROFILE_MENU'
type Avatar = { url: string; isVideo: boolean } | null
type StatusOverlay = { mode: 'broadcast' } | { mode: 'player'; contact: Contact } | null
type CallMode = 'video' | 'audio' | 'emoji'
type CallSession = { contact: Contact; mode: CallMode } | null
type Me = { id: string; handle: string; displayName: string; wallet: string }
type Row = Record<string, any>
type Msg = { id: string; senderId: string; recipientId: string; kind: 'text' | 'payment' | 'emoji'; body: string; amount: number | null; createdAt: string }

const seed = ['velvet','orbit','cinder','lumen','quiet','violet','harbor','north','echo','silver','morrow','atlas']
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

function clock(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'now'
  if (diff < 86_400_000) return clock(iso)
  if (diff < 172_800_000) return 'Yesterday'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function initial(text: string) { return (text.replace(/^@/, '')[0] || 'N').toUpperCase() }
function cleanHandle(value: string) { return value.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._]/g, '') }

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

/* Pillar 1 — spatial key gateway. Linking a friend resolves a real handle on the grid. */
function QrPanel({ variant = 'full', myHandle, onLink, linking }: { variant?: 'full' | 'compact'; myHandle: string; onLink?: (handle: string) => Promise<void> | void; linking?: boolean }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const key = `nexus://key/${myHandle || 'unclaimed'}`
  async function link(e: FormEvent) {
    e.preventDefault()
    const h = cleanHandle(value)
    if (!h || !onLink) return
    await onLink(h)
    setValue(''); setOpen(false)
  }
  return (
    <div className={`qr-panel ${variant}`}>
      <div className="qr-frame">
        <span className="qr-grid-lines" aria-hidden />
        <QrCanvas seedStr={key} />
        <span className="qr-pulse" aria-hidden />
      </div>
      <div className="qr-meta"><b>{myHandle ? `@${myHandle}` : 'Your Nexus Key'}</b><small>Share this key so a friend can link you instantly</small></div>
      {onLink && <Tap className="qr-scan-btn" onClick={() => setOpen(true)}><Camera /> Link a Friend&apos;s Key</Tap>}
      {open && (
        <div className="scan-overlay" role="dialog" aria-label="Link a friend key">
          <div className="scan-viewport">
            <span className="scan-line" aria-hidden />
            <span className="scan-corner tl" aria-hidden /><span className="scan-corner tr" aria-hidden />
            <span className="scan-corner bl" aria-hidden /><span className="scan-corner br" aria-hidden />
            <QrCode className="scan-ghost" aria-hidden />
          </div>
          <form onSubmit={link} style={{ display: 'contents' }}>
            <p>Type your friend&apos;s handle to complete the key exchange</p>
            <div className="search-bar grid-search" style={{ margin: 0 }}>
              <Search />
              <input value={value} onChange={(e) => setValue(e.target.value.replace(/^@/, ''))} placeholder="friend.handle" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
              {value.trim() && <button type="submit" className="grid-send" aria-label="Complete key exchange">{linking ? <span className="spinner" /> : <ArrowUp />}</button>}
            </div>
          </form>
          <Tap className="scan-cancel" onClick={() => { setOpen(false); setValue('') }}>Cancel</Tap>
        </div>
      )}
    </div>
  )
}

/* Real cryptographic-feeling onboarding backed by Supabase auth. */
function Gateway() {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<'new' | 'return'>('new')
  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function generate() { setLoading(true); window.setTimeout(() => { setLoading(false); setGenerated(true) }, 1400) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (mode === 'new') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: cleanHandle(handle), email, password }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Could not forge that identity.'); setBusy(false); return }
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (signInError) {
        setError(/confirm/i.test(signInError.message) ? signInError.message : 'Invalid email or passphrase.')
        setBusy(false)
      }
    } catch {
      setError('The grid is unreachable. Try again.')
      setBusy(false)
    }
  }

  const showForm = mode === 'return' || generated

  return (
    <main className="gateway">
      <div className="gateway-art"><div className="gateway-ring" /><div className="gateway-mark"><Mark /></div></div>
      <span className="eyebrow">PRIVATE MESSENGER / 01</span>
      <h1>Find your people.<br /><em>Keep your space.</em></h1>
      <p className="gateway-copy">Nexus is a quiet, cryptographic room for the people who matter. No feeds. No noise. Just presence.</p>

      {!showForm ? (
        <>
          <Tap className="primary-action" onClick={generate} disabled={loading}>
            {loading ? <span className="spinner" /> : <KeyRound />} {loading ? 'Generating local identity...' : 'Generate cryptographic profile identity'} <ChevronRight />
          </Tap>
          <Tap className="ghost-action" onClick={() => setMode('return')}>I already have a Nexus identity</Tap>
        </>
      ) : (
        <form className="identity-card" onSubmit={submit}>
          {mode === 'new' && (
            <label className="handle-field">
              <span>CLAIM YOUR NEXUS HANDLE</span>
              <div className="handle-input"><b>@</b>
                <input value={handle} onChange={(e) => setHandle(cleanHandle(e.target.value))} maxLength={24} placeholder="samuel.nexus" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </div>
              <small>{handle ? `Friends can reach you at @${handle}` : 'Alphanumeric · lowercase · dots allowed'}</small>
            </label>
          )}

          <label className="handle-field">
            <span>RECOVERY EMAIL</span>
            <div className="handle-input"><b>@</b>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder="you@mail.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </div>
            <small>Never shown to anyone. Used only to restore your identity.</small>
          </label>

          <label className="handle-field">
            <span>PASSPHRASE</span>
            <div className="handle-input"><b><KeyRound /></b>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="8+ characters" autoComplete={mode === 'new' ? 'new-password' : 'current-password'} />
            </div>
            <small>Unlocks your identity capsule on any device.</small>
          </label>

          {mode === 'new' && (
            <>
              <div className="identity-card-head"><span>YOUR PRIVATE SEED</span><Tap type="button" onClick={() => setRevealed(!revealed)}>{revealed ? 'Mask' : 'Reveal'}</Tap></div>
              <div className="seed-words">{seed.map((word, i) => <span key={word}>{revealed ? `${i + 1}. ${word}` : `${String(i + 1).padStart(2,'0')} •••••`}</span>)}</div>
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <Tap className="primary-action" type="submit" disabled={busy || (mode === 'new' && !handle.trim())}>
            {busy ? <span className="spinner" /> : null}
            {busy ? 'Opening the grid…' : mode === 'new' ? 'Enter Nexus Network' : 'Unlock my identity'} <ArrowUp />
          </Tap>
          <Tap className="ghost-action" type="button" onClick={() => { setMode(mode === 'new' ? 'return' : 'new'); setError('') }}>
            {mode === 'new' ? 'I already have a Nexus identity' : 'Forge a new identity instead'}
          </Tap>
        </form>
      )}
      <small className="gateway-note">Messages are keyed to your identity and only readable by you and your peer.</small>
    </main>
  )
}

function ProfileDrawer({ me, avatar, setAvatar, onClose, onToast, onLink, onSignOut }: { me: Me; avatar: Avatar; setAvatar: (value: Avatar | ((prev: Avatar) => Avatar)) => void; onClose: () => void; onToast: (text: string) => void; onLink: (handle: string) => Promise<void>; onSignOut: () => void }) {
  const short = `${me.wallet.slice(0, 6)}...${me.wallet.slice(-4)}`
  function upload(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) { const isVideo = file.type.startsWith('video/'); setAvatar((prev) => { if (prev?.url?.startsWith('blob:')) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(file), isVideo } }); onToast(isVideo ? 'Living video avatar is live' : 'Avatar updated') } }
  async function copyAddress() { await navigator.clipboard?.writeText(me.wallet); onToast('Wallet address copied') }
  return <div className="drawer-backdrop" onClick={onClose}><aside className="profile-drawer" onClick={(e) => e.stopPropagation()}><header className="drawer-header"><div><span className="eyebrow">NEXUS / PROFILE</span><h2>@{me.handle}</h2></div><Tap className="nav-icon" onClick={onClose} aria-label="Close profile menu"><X /></Tap></header><label className="avatar-upload"><input type="file" accept="image/*,video/*" onChange={upload} /><AvatarMedia avatar={avatar} fallback={<UserRound />} /><span>{avatar?.isVideo ? 'Change video · live' : 'Change avatar'}</span></label><section className="wallet-card"><div className="wallet-title"><Wallet /><span>NEXUS CRYPTO WALLET</span><small>LIVE</small></div><strong>$1,250.00</strong><p>0.5 ETH · available balance</p><div className="wallet-address"><code>{short}</code><Tap onClick={copyAddress} aria-label="Copy wallet address"><Copy /></Tap></div><div className="wallet-actions"><Tap onClick={() => onToast('Send flow ready')}><Send /> Send</Tap><Tap onClick={() => onToast('Receive address ready')}><QrCode /> Receive</Tap><Tap onClick={() => onToast('Swap flow ready')}><Sparkles /> Swap</Tap></div></section><section className="wallet-qr"><div className="section-label"><span>Key Exchange</span><span className="muted">Live QR</span></div><QrPanel variant="compact" myHandle={me.handle} onLink={onLink} /></section><section className="drawer-links"><Tap onClick={() => onToast('Privacy center opened')}><KeyRound /><span><b>Privacy center</b><small>Identity capsule and encryption</small></span><ChevronRight /></Tap><Tap onClick={() => onToast('Notifications are enabled')}><Sparkles /><span><b>Notifications</b><small>Quiet hours and mentions</small></span><ChevronRight /></Tap><Tap onClick={() => onToast('Settings saved locally')}><Settings /><span><b>Preferences</b><small>Appearance and language</small></span><ChevronRight /></Tap><Tap onClick={onSignOut}><LogOut /><span><b>Seal this device</b><small>Sign out of Nexus</small></span><ChevronRight /></Tap></section></aside></div>
}

function Directory({ me, avatar, contacts, freshId, myStatus, discovering, unread, onSelect, onProfile, onBroadcast, onOpenStatus, onOpenMyStatus, onDiscover, onQuickStatus, onLink }: { me: Me; avatar: Avatar; contacts: Contact[]; freshId: string | null; myStatus: Status | null; discovering: string | null; unread: Record<string, number>; onSelect: (contact: Contact) => void; onProfile: () => void; onBroadcast: () => void; onOpenStatus: (contact: Contact) => void; onOpenMyStatus: () => void; onDiscover: (query: string) => void; onQuickStatus: (file: File) => void; onLink: (handle: string) => Promise<void> }) {
  const withStatus = contacts.filter((c) => c.status)
  const [query, setQuery] = useState('')
  function submitDiscover(e: FormEvent) { e.preventDefault(); const q = query.trim(); if (!q || discovering) return; onDiscover(q); setQuery('') }
  function pickQuickStatus(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) onQuickStatus(f); e.target.value = '' }
  return (
    <main className="messenger-shell">
      <header className="messenger-header">
        <Tap className="nav-icon" aria-label="Open menu"><Menu /></Tap>
        <div className="brand-lockup"><Mark /><b>NEXUS</b></div>
        <div className="header-actions">
          <Tap className="nav-icon" aria-label="More options"><MoreHorizontal /></Tap>
          <Tap className="nav-icon profile-button avatar-slot" onClick={onProfile} aria-label="Open profile wallet"><AvatarMedia avatar={avatar} fallback={<UserRound />} /></Tap>
        </div>
      </header>

      <div className="directory-head">
        <div><span className="eyebrow">PRIVATE NETWORK · @{me.handle}</span><h1>Your people<span>.</span></h1></div>
        <Tap className={`profile-orb avatar-slot ${myStatus ? 'status-ring' : ''}`} onClick={onBroadcast} aria-label="Broadcast your living status sphere"><AvatarMedia avatar={avatar} fallback={<UserRound />} /></Tap>
      </div>

      <form className="search-bar grid-search" onSubmit={submitDiscover}>
        <Search />
        <input value={query} onChange={(e) => setQuery(e.target.value.replace(/^@/, ''))} placeholder="Scan the Global Grid for User Handles..." autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search" aria-label="Search the global grid for a user handle" />
        {query.trim() && <button type="submit" className="grid-send" aria-label="Send handshake signal">{discovering ? <span className="spinner" /> : <ArrowUp />}</button>}
      </form>

      <section className="stories">
        <div className="section-label"><span>Living Status</span><Tap onClick={onBroadcast}>Broadcast</Tap></div>
        <div className="story-row">
          {myStatus ? (
            <Tap className="story" onClick={onOpenMyStatus}>
              <span className="story-avatar sphere-avatar avatar-slot status-ring live-ring">
                {myStatus.kind === 'video' && myStatus.mediaUrl ? <video className="avatar-media" src={myStatus.mediaUrl} muted loop playsInline autoPlay />
                  : myStatus.kind === 'image' && myStatus.mediaUrl ? <img className="avatar-media" src={myStatus.mediaUrl || "/placeholder.svg"} alt="Your living status" />
                  : <AvatarMedia avatar={avatar} fallback={<UserRound />} />}
              </span>
              <small>You</small>
            </Tap>
          ) : (
            <label className="story">
              <input type="file" accept="image/*,video/*" onChange={pickQuickStatus} hidden />
              <span className="story-avatar sphere-avatar avatar-slot add"><AvatarMedia avatar={avatar} fallback={<UserRound />} /><i className="story-add">+</i></span>
              <small>Add</small>
            </label>
          )}
          {withStatus.map((c) => (
            <Tap className="story" key={c.id} onClick={() => onOpenStatus(c)}>
              <span className="story-avatar sphere-avatar status-ring">{c.emoji}</span>
              <small>{c.alias}</small>
            </Tap>
          ))}
        </div>
      </section>

      <section className="thread-list">
        {contacts.length === 0 && <p className="empty-grid">Nobody here yet. Scan the Global Grid above for a friend&apos;s handle, or share your key so they can link you.</p>}
        {contacts.map((c) => (
          <Tap className={`thread ${freshId === c.id ? 'fresh' : ''}`} key={c.id} onClick={() => onSelect(c)}>
            <span className={`thread-avatar ${c.online ? 'online' : ''} ${c.status ? 'status-ring' : ''}`}>{c.emoji}</span>
            <span className="thread-body">
              <b>{c.name}{c.alias !== `@${c.name}` && c.name !== c.alias.slice(1) ? <small>{c.alias}</small> : null}</b>
              <small>{c.snippet}</small>
            </span>
            <span className="thread-meta">
              <small>{c.time}</small>
              {unread[c.id] ? <i className="thread-unread">{unread[c.id]}</i> : null}
            </span>
          </Tap>
        ))}
      </section>

      <section className="wallet-qr directory-qr">
        <div className="section-label"><span>Spatial Key Exchange</span><span className="muted">@{me.handle}</span></div>
        <QrPanel variant="compact" myHandle={me.handle} onLink={onLink} linking={!!discovering} />
      </section>
    </main>
  )
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
            : status.kind === 'image' && status.mediaUrl
              ? <img className="sphere-media" src={status.mediaUrl || "/placeholder.svg"} alt={`${subject.name} living status`} />
              : status.kind === 'audio' && status.mediaUrl
                ? <><span className="sphere-orb-mark">{subject.emoji}</span><audio src={status.mediaUrl} loop autoPlay /></>
                : <span className="sphere-orb-mark">{status.kind === 'audio' ? <Radio /> : subject.emoji}</span>}
          {status.kind !== 'video' && status.kind !== 'image' && <span className="sphere-ambient-bars" aria-hidden><i /><i /><i /><i /><i /></span>}
        </div>
        <div className="sphere-info"><b>{subject.name}</b>{status.text && <p>{status.text}</p>}<small>{status.kind === 'video' ? '15s ambient video loop' : status.kind === 'image' ? 'living photo sphere' : status.kind === 'audio' ? '10s ambient audio loop' : 'living status'}</small></div>
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
  function pickVideo(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setMediaUrl(URL.createObjectURL(f)); setKind('video'); onToast('15s video snippet attached') }
  async function record() {
    if (recording) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => { const blob = new Blob(chunks, { type: 'audio/webm' }); setMediaUrl(URL.createObjectURL(blob)); setKind('audio'); stream.getTracks().forEach((t) => t.stop()); setRecording(false); onToast('10s ambient loop captured') }
      recRef.current = rec; rec.start(); setKind('audio'); setRecording(true)
      window.setTimeout(() => { if (rec.state !== 'inactive') rec.stop() }, 10000)
    } catch { setKind('audio'); setMediaUrl(''); setRecording(false); onToast('Ambient loop captured · simulated') }
  }
  function save() { onSave({ kind, text: text.trim() || undefined, mediaUrl: mediaUrl || undefined }); onClose() }
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

/* Live microphone loudness (0..1). Falls back to a gentle synthetic wave when no mic. */
function useMicLevel(active: boolean, muted: boolean) {
  const [level, setLevel] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf = 0, cancelled = false, phase = 0
    let ctx: AudioContext | null = null
    let stream: MediaStream | null = null
    let analyser: AnalyserNode | null = null
    const data = new Uint8Array(64)
    ;(async () => {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AC) {
          ctx = new AC()
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const src = ctx.createMediaStreamSource(stream)
          analyser = ctx.createAnalyser(); analyser.fftSize = 128
          src.connect(analyser)
        }
      } catch { analyser = null }
      const loop = () => {
        if (cancelled) return
        let v = 0
        if (analyser && !muted) {
          analyser.getByteFrequencyData(data)
          let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i]
          v = Math.min(1, sum / data.length / 78)
        } else if (!muted) {
          phase += 0.09
          v = 0.28 + Math.abs(Math.sin(phase)) * 0.46 * (0.6 + Math.random() * 0.4)
        }
        setLevel((prev) => prev + (v - prev) * 0.32)
        raf = requestAnimationFrame(loop)
      }
      loop()
    })()
    return () => { cancelled = true; cancelAnimationFrame(raf); try { stream?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ } try { ctx?.close() } catch { /* noop */ } }
  }, [active, muted])
  return muted ? 0 : level
}

/* VisionOS-inspired cinematic call spheres: spatial video · voice filaments · emoji privacy face */
function CallOverlay({ session, avatar, onClose, onToast }: { session: { contact: Contact; mode: CallMode }; avatar: Avatar; onClose: () => void; onToast: (text: string) => void }) {
  const [mode, setMode] = useState<CallMode>(session.mode)
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const level = useMicLevel(true, muted)
  useEffect(() => { const t = window.setInterval(() => setSeconds((s) => s + 1), 1000); return () => window.clearInterval(t) }, [])
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0'); const ss = String(seconds % 60).padStart(2, '0')
  const rays = Array.from({ length: 40 })
  function switchMode(next: CallMode) { setMode(next); if (next === 'emoji') onToast('Emoji privacy engine · cameras off') }
  return (
    <div className={`call-sphere-overlay mode-${mode}`} role="dialog" aria-label={`${session.contact.name} call`}>
      <span className="call-aurora" aria-hidden />
      <header className="call-sphere-top">
        <div><span className="call-kick">NEXUS SPATIAL CALL</span><strong>{session.contact.name}</strong><span className="call-clock">{mode === 'emoji' ? 'Private emoji mode' : mode === 'audio' ? 'Voice co-frequency' : 'Spatial video'} · {mm}:{ss}</span></div>
      </header>

      <div className="call-stage">
        {mode === 'video' && (
          <div className="spatial-field" style={{ ['--lvl' as string]: level }}>
            <div className="fluid-sphere peer"><span className="fluid-glow" aria-hidden />{session.contact.status?.kind === 'video' && session.contact.status.mediaUrl ? <video className="fluid-media" src={session.contact.status.mediaUrl} muted loop playsInline autoPlay /> : <span className="fluid-mark">{session.contact.emoji}</span>}</div>
            <div className="fluid-sphere me"><span className="fluid-glow" aria-hidden /><span className="fluid-media-wrap"><AvatarMedia avatar={avatar} fallback={<span className="fluid-mark"><Video /></span>} /></span></div>
          </div>
        )}
        {mode === 'audio' && (
          <div className="freq-field" style={{ ['--lvl' as string]: level }}>
            <div className="freq-rays">{rays.map((_, i) => { const rot = (i / rays.length) * 360; const base = 26 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 22; const h = base + level * 120 * (0.55 + (i % 4) / 5); return <i key={i} style={{ height: `${h}px`, transform: `rotate(${rot}deg) translateY(${-(h / 2) - 44}px)` }} /> })}</div>
            <span className="freq-node self" /><span className="freq-node peer" />
            <span className="freq-label">{session.contact.name} · voice topography</span>
          </div>
        )}
        {mode === 'emoji' && (
          <div className="emoji-face-stage">
            <div className="emoji-face" style={{ ['--lvl' as string]: level }}>
              <span className="ef-shine" aria-hidden />
              <span className="ef-eye left"><i /></span>
              <span className="ef-eye right"><i /></span>
              <span className="ef-mouth" style={{ height: `${12 + level * 74}px` }} />
            </div>
            <span className="emoji-face-note">Your camera is hidden · avatar mirrors your voice</span>
          </div>
        )}
      </div>

      <div className="call-controls">
        <div className="call-modes">
          <button type="button" className={mode === 'video' ? 'on' : ''} onClick={() => switchMode('video')} aria-label="Spatial video call"><Video /><small>Video</small></button>
          <button type="button" className={mode === 'audio' ? 'on' : ''} onClick={() => switchMode('audio')} aria-label="Voice call"><Radio /><small>Voice</small></button>
          <button type="button" className={mode === 'emoji' ? 'on' : ''} onClick={() => switchMode('emoji')} aria-label="Emoji privacy call"><Smile /><small>Emoji</small></button>
        </div>
        <div className="call-primary">
          <button type="button" className={`call-round ${muted ? 'muted' : ''}`} onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff /> : <Mic />}</button>
          <button type="button" className="call-round end" onClick={onClose} aria-label="End call"><PhoneOff /></button>
        </div>
      </div>
    </div>
  )
}

function Chat({ me, contact, avatar, messages, peerWatching, peerTyping, onBack, onProfile, onToast, onStartCall, onSend, onTyping }: { me: Me; contact: Contact; avatar: Avatar; messages: Msg[]; peerWatching: boolean; peerTyping: boolean; onBack: () => void; onProfile: () => void; onToast: (text: string) => void; onStartCall: (mode: CallMode) => void; onSend: (payload: { kind: 'text' | 'payment'; body?: string; amount?: number }) => Promise<void>; onTyping: () => void }) {
  const [draft, setDraft] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState(25)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [mood, setMood] = useState<{ mood: Mood; char: string } | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { if (!mood) return; const t = window.setTimeout(() => setMood(null), 1500); return () => window.clearTimeout(t) }, [mood])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, peerTyping])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return
    const body = draft.trim()
    if (!body) return
    setDraft('')
    await onSend({ kind: 'text', body })
  }
  async function sendFunds() { setPayOpen(false); await onSend({ kind: 'payment', amount }); onToast(`Sent $${amount.toFixed(2)}`) }
  function pickEmoji(e: { char: string; label: string; mood: Mood }) { setDraft((d) => d + e.char); setMood({ mood: e.mood, char: e.char }); playTone(e.mood) }

  return (
    <main className="messenger-shell chat-shell">
      <header className={`chat-header ${peerWatching ? 'peer-watching' : ''}`}>
        <Tap className="nav-icon" onClick={onBack} aria-label="Back"><ArrowLeft /></Tap>
        <span className={`chat-avatar ${contact.online ? 'online' : ''} ${contact.status ? 'status-ring' : ''}`}>{contact.emoji}</span>
        <div className="chat-title">
          <b>{contact.name}</b>
          <small className={peerWatching ? 'copresence' : ''}>{peerWatching ? <><Eye /> looking at this room now</> : contact.online ? 'online now' : 'last seen recently'}</small>
        </div>
        <div className="header-actions">
          <Tap className="nav-icon" onClick={() => onStartCall('audio')} aria-label="Start voice call"><Phone /></Tap>
          <Tap className="nav-icon" onClick={() => onStartCall('video')} aria-label="Start video call"><Video /></Tap>
          <Tap className="nav-icon avatar-slot" onClick={onProfile} aria-label="Open profile"><AvatarMedia avatar={avatar} fallback={<MoreHorizontal />} /></Tap>
        </div>
      </header>

      <div className="chat-transcript">
        <div className="date-stamp"><span /> TODAY <span /></div>
        {messages.length === 0 && <p className="empty-room">This room is new. Say something true.</p>}
        {messages.map((m) => {
          const mine = m.senderId === me.id
          const stamp = `${clock(m.createdAt)}${mine ? ' · Sent' : ''}`
          if (m.kind === 'payment') return (
            <div className={`chat-message payment ${mine ? 'mine' : ''}`} key={m.id}>
              <div className="payment-card"><div className="payment-glow" /><div className="payment-head"><span className="payment-badge"><DollarSign /></span><div><small>NEXUS PAYMENT</small><b>${Number(m.amount ?? 0).toFixed(2)}</b></div></div><span className="payment-status"><Check /> {mine ? 'Funds sent · settled instantly' : 'Funds received · settled instantly'}</span></div>
              <small>{stamp}</small>
            </div>
          )
          return <div className={`chat-message ${mine ? 'mine' : ''}`} key={m.id}><p>{m.body}</p><small>{stamp}</small></div>
        })}
        {peerTyping && <div className="typing"><span /> {contact.name} is in the room</div>}
        <div ref={endRef} />
      </div>

      <div className="chat-composer-wrap">
        <div className={`pay-module ${payOpen ? 'open' : ''}`}>
          <div className="pay-head"><span>SEND FUNDS</span><b>${amount.toFixed(2)}</b></div>
          <input className="pay-slider" type="range" min={1} max={500} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Amount to send" />
          <div className="pay-scale"><small>$1</small><small>$500</small></div>
          <Tap className="pay-send" onClick={sendFunds}><Wallet /> Send Funds</Tap>
        </div>
        <EmojiDrawer open={emojiOpen} onPick={pickEmoji} onClose={() => setEmojiOpen(false)} />
        <div className="chat-tools">
          <Tap aria-label="Attach file"><Paperclip /></Tap>
          <Tap className={`emoji-toggle ${emojiOpen ? 'active' : ''}`} onClick={() => setEmojiOpen((v) => !v)} aria-label="Open violet emoji palette"><Smile /></Tap>
          <Tap className={`money-toggle ${payOpen ? 'active' : ''}`} onClick={() => setPayOpen(!payOpen)} aria-label="Open send funds panel"><DollarSign /></Tap>
          <span>Private message</span>
          <Tap onClick={() => onStartCall('emoji')} aria-label="Start emoji privacy call"><Sparkles /></Tap>
        </div>
        <form className={`chat-composer ${peerWatching ? 'peer-watching' : ''}`} onSubmit={submit}>
          <input value={draft} onChange={(e) => { setDraft(e.target.value); onTyping() }} placeholder="Say something true..." />
          <Tap className="send-orb" aria-label="Send message"><ArrowUp /></Tap>
        </form>
        <small className="composer-note">Live on the Nexus grid · delivered instantly</small>
      </div>

      {mood && <div className={`mood-fx mood-${mood.mood}`} aria-hidden><span className="mood-emoji">{mood.char}</span>{mood.mood === 'shock' ? <span className="ahh-ripple"><span className="ahh-label">Ahh</span></span> : <div className="mood-voice"><span className="mv-bars"><i /><i /><i /><i /></span>{moodVoice[mood.mood]}</div>}</div>}
    </main>
  )
}

export default function Page() {
  const supabase = useMemo(() => createClient(), [])
  const [booted, setBooted] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [view, setView] = useState<View>('CHAT_LIST')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [avatar, setAvatar] = useState<Avatar>(null)
  const [toast, setToast] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [freshId, setFreshId] = useState<string | null>(null)
  const [myStatus, setMyStatus] = useState<Status | null>(null)
  const [statusOverlay, setStatusOverlay] = useState<StatusOverlay>(null)
  const [discovering, setDiscovering] = useState<string | null>(null)
  const [call, setCall] = useState<CallSession>(null)
  const [onlineIds, setOnlineIds] = useState<string[]>([])
  const [watchers, setWatchers] = useState<string[]>([])
  const [typingFrom, setTypingFrom] = useState<string | null>(null)
  const [unread, setUnread] = useState<Record<string, number>>({})

  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const roomRef = useRef<string | null>(null)
  const typingTimer = useRef<number>(0)

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2200); return () => window.clearTimeout(timer) }, [toast])
  const showToast = useCallback((text: string) => setToast(text), [])

  /* ---------- identity ---------- */
  useEffect(() => {
    let alive = true
    async function resolve(userId: string | undefined) {
      if (!userId) { if (alive) { setMe(null); setBooted(true) } return }
      const { data } = await supabase.from('profiles').select('id, handle, display_name, wallet_address').eq('id', userId).maybeSingle()
      if (!alive) return
      if (data) setMe({ id: data.id, handle: data.handle, displayName: data.display_name || data.handle, wallet: data.wallet_address })
      setBooted(true)
    }
    supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string } } | null } }) => resolve(data.session?.user.id))
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: { user: { id: string } } | null) => { resolve(session?.user.id) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [supabase])

  /* ---------- directory + transcript ---------- */
  const loadGrid = useCallback(async (self: Me) => {
    const [{ data: links }, { data: msgs }] = await Promise.all([
      supabase.from('contacts').select('contact_id').eq('owner_id', self.id),
      supabase.from('messages').select('id, sender_id, recipient_id, kind, body, amount, created_at').or(`sender_id.eq.${self.id},recipient_id.eq.${self.id}`).order('created_at', { ascending: true }).limit(500),
    ])

    const rows: Msg[] = ((msgs ?? []) as Row[]).map((m) => ({ id: m.id, senderId: m.sender_id, recipientId: m.recipient_id, kind: m.kind, body: m.body, amount: m.amount, createdAt: m.created_at }))
    setMessages(rows)

    const peerIds = new Set<string>(((links ?? []) as Row[]).map((l) => l.contact_id as string))
    rows.forEach((m) => { peerIds.add(m.senderId === self.id ? m.recipientId : m.senderId) })
    peerIds.delete(self.id)
    if (peerIds.size === 0) { setContacts([]); return }

    const ids = [...peerIds]
    const [{ data: profiles }, { data: statuses }] = await Promise.all([
      supabase.from('profiles').select('id, handle, display_name, last_seen').in('id', ids),
      supabase.from('statuses').select('user_id, kind, body, media_url, created_at').in('user_id', [...ids, self.id]).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
    ])

    const statusFor = new Map<string, Status>()
    ;((statuses ?? []) as Row[]).forEach((s) => { if (!statusFor.has(s.user_id)) statusFor.set(s.user_id, { kind: s.kind, text: s.body || undefined, mediaUrl: s.media_url || undefined }) })
    const mine = statusFor.get(self.id)
    if (mine) setMyStatus((prev) => prev ?? mine)

    const list: Contact[] = ((profiles ?? []) as Row[]).map((p) => {
      const thread = rows.filter((m) => m.senderId === p.id || m.recipientId === p.id)
      const last = thread[thread.length - 1]
      return {
        id: p.id,
        name: p.display_name || p.handle,
        alias: `@${p.handle}`,
        snippet: last ? (last.kind === 'payment' ? `Payment · $${Number(last.amount ?? 0).toFixed(2)}` : last.body) : 'Key linked · say hello',
        time: last ? relative(last.createdAt) : 'new',
        online: false,
        emoji: initial(p.display_name || p.handle),
        status: statusFor.get(p.id),
      }
    })
    list.sort((a, b) => (a.time === 'new' ? 1 : 0) - (b.time === 'new' ? 1 : 0))
    setContacts(list)
  }, [supabase])

  useEffect(() => { if (me) loadGrid(me) }, [me, loadGrid])

  /* ---------- realtime messages ---------- */
  useEffect(() => {
    if (!me) return
    const channel = supabase
      .channel('nexus-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: row }: { new: Record<string, string> }) => {
        const r = row as Record<string, string>
        if (r.sender_id !== me.id && r.recipient_id !== me.id) return
        const msg: Msg = { id: r.id, senderId: r.sender_id, recipientId: r.recipient_id, kind: r.kind as Msg['kind'], body: r.body, amount: r.amount ? Number(r.amount) : null, createdAt: r.created_at }
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        const peer = msg.senderId === me.id ? msg.recipientId : msg.senderId
        setContacts((prev) => {
          const known = prev.some((c) => c.id === peer)
          if (!known) { loadGrid(me); return prev }
          return prev.map((c) => c.id === peer ? { ...c, snippet: msg.kind === 'payment' ? `Payment · $${Number(msg.amount ?? 0).toFixed(2)}` : msg.body, time: 'now' } : c)
        })
        if (msg.senderId !== me.id && roomRef.current !== msg.senderId) {
          setUnread((prev) => ({ ...prev, [msg.senderId]: (prev[msg.senderId] ?? 0) + 1 }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [me, supabase, loadGrid])

  /* ---------- presence + typing ---------- */
  useEffect(() => {
    if (!me) return
    const channel = supabase.channel('nexus-presence', { config: { presence: { key: me.id } } })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, { room: string | null }[]>
        const ids = Object.keys(state)
        setOnlineIds(ids)
        setWatchers(ids.filter((id) => id !== me.id && state[id]?.some((p: { room: string | null }) => p.room === me.id)))
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: { from: string; to: string } }) => {
        const from = (payload as { from: string; to: string }).from
        if ((payload as { to: string }).to !== me.id) return
        setTypingFrom(from)
        window.setTimeout(() => setTypingFrom((cur) => (cur === from ? null : cur)), 2600)
      })
      .subscribe((status: string) => { if (status === 'SUBSCRIBED') channel.track({ room: roomRef.current }) })
    presenceRef.current = channel
    return () => { presenceRef.current = null; supabase.removeChannel(channel) }
  }, [me, supabase])

  const enterRoom = useCallback((peerId: string | null) => {
    roomRef.current = peerId
    presenceRef.current?.track({ room: peerId })
  }, [])

  function signalTyping() {
    if (!me || !selected) return
    const now = Date.now()
    if (now - typingTimer.current < 1200) return
    typingTimer.current = now
    presenceRef.current?.send({ type: 'broadcast', event: 'typing', payload: { from: me.id, to: selected.id } })
  }

  /* ---------- actions ---------- */
  const linkHandle = useCallback(async (raw: string) => {
    if (!me) return
    const clean = cleanHandle(raw)
    if (!clean) return
    if (clean === me.handle) { showToast('That is your own key'); return }
    setDiscovering(clean)
    const { data: profile } = await supabase.from('profiles').select('id, handle, display_name').eq('handle', clean).maybeSingle()
    if (!profile) { setDiscovering(null); showToast(`No @${clean} on the grid yet`); return }
    const { error } = await supabase.from('contacts').insert({ owner_id: me.id, contact_id: profile.id })
    setDiscovering(null)
    if (error && !/duplicate|unique/i.test(error.message)) { showToast('Handshake failed'); return }
    setFreshId(profile.id)
    showToast(error ? `@${clean} is already linked` : `@${clean} joined your grid`)
    window.setTimeout(() => setFreshId((cur) => (cur === profile.id ? null : cur)), 1600)
    await loadGrid(me)
  }, [me, supabase, showToast, loadGrid])

  const sendMessage = useCallback(async (payload: { kind: 'text' | 'payment'; body?: string; amount?: number }) => {
    if (!me || !selected) return
    const optimistic: Msg = { id: `local-${Date.now()}`, senderId: me.id, recipientId: selected.id, kind: payload.kind, body: payload.body ?? '', amount: payload.amount ?? null, createdAt: new Date().toISOString() }
    setMessages((prev) => [...prev, optimistic])
    const { data, error } = await supabase.from('messages').insert({ sender_id: me.id, recipient_id: selected.id, kind: payload.kind, body: payload.body ?? '', amount: payload.amount ?? null }).select('id').single()
    if (error) { setMessages((prev) => prev.filter((m) => m.id !== optimistic.id)); showToast('Message did not leave the device'); return }
    setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...m, id: data.id } : m))
  }, [me, selected, supabase, showToast])

  const saveStatus = useCallback(async (status: Status) => {
    if (!me) return
    setMyStatus(status)
    await supabase.from('statuses').insert({ user_id: me.id, kind: status.kind, body: status.text ?? '', media_url: null })
    showToast('Living status sphere broadcast')
  }, [me, supabase, showToast])

  function quickStatus(file: File) {
    const isVideo = file.type.startsWith('video/')
    saveStatus({ kind: isVideo ? 'video' : 'image', mediaUrl: URL.createObjectURL(file) })
  }

  async function signOut() { await supabase.auth.signOut(); setMe(null); setContacts([]); setMessages([]); setView('CHAT_LIST'); setSelected(null) }

  if (!booted) return <div className="app-canvas boot"><div className="gateway-art"><div className="gateway-ring" /><div className="gateway-mark"><Mark /></div></div><p className="boot-note">Opening your identity capsule…</p></div>
  if (!me) return <div className="app-canvas"><Gateway /></div>

  const decorated = contacts.map((c) => ({ ...c, online: onlineIds.includes(c.id) }))
  const selfContact: Contact = { id: me.id, name: `@${me.handle}`, alias: `@${me.handle}`, snippet: '', time: 'now', online: true, emoji: initial(me.handle), status: myStatus ?? undefined }
  const activeContact = selected ? (decorated.find((c) => c.id === selected.id) ?? selected) : null
  const thread = activeContact ? messages.filter((m) => m.senderId === activeContact.id || m.recipientId === activeContact.id) : []

  function openChat(contact: Contact) {
    setSelected(contact); setView('ACTIVE_CHAT'); enterRoom(contact.id)
    setUnread((prev) => { const next = { ...prev }; delete next[contact.id]; return next })
  }
  function leaveChat() { setView('CHAT_LIST'); setSelected(null); enterRoom(null) }

  return <div className="app-canvas">
    <div className="view-stage" key={view === 'PROFILE_MENU' ? (selected ? 'ACTIVE_CHAT' : 'CHAT_LIST') : view}>
      {(view === 'CHAT_LIST' || (view === 'PROFILE_MENU' && !selected)) && (
        <Directory
          me={me} avatar={avatar} contacts={decorated} freshId={freshId} myStatus={myStatus} discovering={discovering} unread={unread}
          onSelect={openChat}
          onProfile={() => setView('PROFILE_MENU')}
          onBroadcast={() => setStatusOverlay({ mode: 'broadcast' })}
          onOpenStatus={(contact) => setStatusOverlay({ mode: 'player', contact })}
          onOpenMyStatus={() => { if (myStatus) setStatusOverlay({ mode: 'player', contact: selfContact }) }}
          onDiscover={linkHandle}
          onQuickStatus={quickStatus}
          onLink={linkHandle}
        />
      )}
      {(view === 'ACTIVE_CHAT' || (view === 'PROFILE_MENU' && selected)) && activeContact && (
        <Chat
          me={me} contact={activeContact} avatar={avatar} messages={thread}
          peerWatching={watchers.includes(activeContact.id)}
          peerTyping={typingFrom === activeContact.id}
          onBack={leaveChat}
          onProfile={() => setView('PROFILE_MENU')}
          onToast={showToast}
          onStartCall={(mode) => setCall({ contact: activeContact, mode })}
          onSend={sendMessage}
          onTyping={signalTyping}
        />
      )}
    </div>

    {view === 'PROFILE_MENU' && <ProfileDrawer me={me} avatar={avatar} setAvatar={setAvatar} onClose={() => setView(selected ? 'ACTIVE_CHAT' : 'CHAT_LIST')} onToast={showToast} onLink={linkHandle} onSignOut={signOut} />}
    {statusOverlay?.mode === 'broadcast' && <BroadcastOverlay current={myStatus} onSave={saveStatus} onClose={() => setStatusOverlay(null)} onToast={showToast} />}
    {statusOverlay?.mode === 'player' && statusOverlay.contact.status && <StatusSphere subject={statusOverlay.contact} onClose={() => setStatusOverlay(null)} />}
    {call && <CallOverlay session={call} avatar={avatar} onClose={() => setCall(null)} onToast={showToast} />}
    {toast && <Toast text={toast} />}
  </div>
}
