'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, Check, ChevronRight, Copy, DollarSign, KeyRound, Menu, MoreHorizontal, Paperclip, Phone, QrCode, Search, Send, Settings, Sparkles, UserRound, Video, Wallet, X } from 'lucide-react'

type Contact = { name: string; alias: string; snippet: string; time: string; online: boolean; emoji: string }
type View = 'ONBOARDING' | 'CHAT_LIST' | 'ACTIVE_CHAT' | 'PROFILE_MENU'
type Avatar = { url: string; isVideo: boolean } | null
type Message =
  | { id: number; mine: boolean; kind: 'text'; text: string; time: string }
  | { id: number; mine: boolean; kind: 'payment'; amount: number; time: string }

const contacts: Contact[] = [
  { name: 'Morgan Lee', alias: '@morgan', snippet: 'The violet room is ready.', time: '09:42', online: true, emoji: 'M' },
  { name: 'Sage Chen', alias: '@sage', snippet: 'Sending you the notes now.', time: 'Yesterday', online: true, emoji: 'S' },
  { name: 'Riley Park', alias: '@riley', snippet: 'That sounds like a plan.', time: 'Tue', online: false, emoji: 'R' },
  { name: 'Noah Williams', alias: '@noah', snippet: 'Let’s talk after sunset.', time: 'Mon', online: true, emoji: 'N' },
]
const stories = [{ name: 'Morgan', emoji: 'M', active: true }, { name: 'Sage', emoji: 'S', active: true }, { name: 'Riley', emoji: 'R', active: false }, { name: 'Noah', emoji: 'N', active: true }]
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

function Mark() { return <span className="brand-mark"><Sparkles /></span> }
function Tap({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`tap ${className}`} {...props} /> }
function Toast({ text }: { text: string }) { return <div className="toast" role="status"><Check /> {text}</div> }

/* Living avatar — streams a looping muted video or falls back to image / icon */
function AvatarMedia({ avatar, fallback }: { avatar: Avatar; fallback: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [failed, setFailed] = useState(false)

  // Reset the failure state whenever the source changes so a new upload can render.
  useEffect(() => { setFailed(false) }, [avatar?.url])

  // Autoplay can reject (e.g. remount between views). Swallow the rejection so it
  // never surfaces as an unhandled "{"isTrusted":true}" event.
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

function Gateway({ onEnter }: { onEnter: () => void }) {
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
    <Tap className="primary-action" onClick={onEnter}>Enter Nexus Network <ArrowUp /></Tap></div>}<small className="gateway-note">Your identity is generated on-device and never stored by Nexus.</small></main>
}

function ProfileDrawer({ avatar, setAvatar, onClose, onToast }: { avatar: Avatar; setAvatar: (value: Avatar) => void; onClose: () => void; onToast: (text: string) => void }) {
  const wallet = '0x7a9C...4F2B';
  function upload(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) { const isVideo = file.type.startsWith('video/'); setAvatar((prev) => { if (prev?.url?.startsWith('blob:')) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(file), isVideo } }); onToast(isVideo ? 'Living video avatar is live' : 'Avatar updated') } }
  async function copyAddress() { await navigator.clipboard?.writeText('0x7a9C91eA2d7F8B2c4F2B'); onToast('Wallet address copied') }
  return <div className="drawer-backdrop" onClick={onClose}><aside className="profile-drawer" onClick={(e) => e.stopPropagation()}><header className="drawer-header"><div><span className="eyebrow">NEXUS / PROFILE</span><h2>Your space</h2></div><Tap className="nav-icon" onClick={onClose} aria-label="Close profile menu"><X /></Tap></header><label className="avatar-upload"><input type="file" accept="image/*,video/*" onChange={upload} /><AvatarMedia avatar={avatar} fallback={<UserRound />} /><span>{avatar?.isVideo ? 'Change video · live' : 'Change avatar'}</span></label><section className="wallet-card"><div className="wallet-title"><Wallet /><span>NEXUS CRYPTO WALLET</span><small>LIVE</small></div><strong>$1,250.00</strong><p>0.5 ETH · available balance</p><div className="wallet-address"><code>{wallet}</code><Tap onClick={copyAddress} aria-label="Copy wallet address"><Copy /></Tap></div><div className="wallet-actions"><Tap onClick={() => onToast('Send flow ready')}><Send /> Send</Tap><Tap onClick={() => onToast('Receive address ready')}><QrCode /> Receive</Tap><Tap onClick={() => onToast('Swap flow ready')}><Sparkles /> Swap</Tap></div></section><section className="drawer-links"><Tap onClick={() => onToast('Privacy center opened')}><KeyRound /><span><b>Privacy center</b><small>Identity capsule and encryption</small></span><ChevronRight /></Tap><Tap onClick={() => onToast('Notifications are enabled')}><Sparkles /><span><b>Notifications</b><small>Quiet hours and mentions</small></span><ChevronRight /></Tap><Tap onClick={() => onToast('Settings saved locally')}><Settings /><span><b>Preferences</b><small>Appearance and language</small></span><ChevronRight /></Tap></section></aside></div>
}

function Directory({ avatar, onSelect, onProfile }: { avatar: Avatar; onSelect: (contact: Contact) => void; onProfile: () => void }) { return <main className="messenger-shell"><header className="messenger-header"><Tap className="nav-icon" aria-label="Open menu"><Menu /></Tap><div className="brand-lockup"><Mark /><b>NEXUS</b></div><div className="header-actions"><Tap className="nav-icon" aria-label="More options"><MoreHorizontal /></Tap><Tap className="nav-icon profile-button avatar-slot" onClick={onProfile} aria-label="Open profile wallet"><AvatarMedia avatar={avatar} fallback={<UserRound />} /></Tap></div></header><div className="directory-head"><div><span className="eyebrow">PRIVATE NETWORK</span><h1>Your people<span>.</span></h1></div><Tap className="profile-orb avatar-slot" onClick={onProfile} aria-label="Open your profile"><AvatarMedia avatar={avatar} fallback={<UserRound />} /></Tap></div><div className="search-bar"><Search /><input placeholder="Search your network" /></div><section className="stories"><div className="section-label"><span>Stories</span><Tap>View all</Tap></div><div className="story-row">{stories.map((story) => <Tap className="story" key={story.name}><span className={`story-avatar ${story.active ? 'story-active' : ''}`}>{story.emoji}</span><small>{story.name}</small></Tap>)}</div></section><section className="contacts"><div className="section-label"><span>Conversations</span><span className="muted">{contacts.length} people</span></div>{contacts.map((contact) => <Tap className="contact-row" key={contact.name} onClick={() => onSelect(contact)}><span className={`contact-avatar ${contact.online ? 'online' : ''}`}>{contact.emoji}</span><span className="contact-copy"><b>{contact.name}</b><small>{contact.alias} · {contact.snippet}</small></span><span className="contact-meta"><small>{contact.time}</small><ChevronRight /></span></Tap>)}</section><footer className="network-footer"><span className="online-dot" /> Encrypted network <span>·</span> 12 peers</footer></main> }

function Chat({ contact, avatar, onBack, onProfile, onToast }: { contact: Contact; avatar: Avatar; onBack: () => void; onProfile: () => void; onToast: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, mine: false, kind: 'text', text: 'Good morning. I left a little space here for you.', time: '09:40' },
    { id: 2, mine: true, kind: 'text', text: 'I like that. Let’s make today feel intentional.', time: '09:41 · Sent' },
  ])
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState(25)
  function submit(e: FormEvent) { e.preventDefault(); const message = draft.trim(); if (!message) return; setMessages((current) => [...current, { id: Date.now(), mine: true, kind: 'text', text: message, time: '09:41 · Sent' }]); setDraft('') }
  function sendFunds() { setMessages((current) => [...current, { id: Date.now(), mine: true, kind: 'payment', amount, time: '09:41 · Sent' }]); setPayOpen(false); onToast(`Sent $${amount.toFixed(2)}`) }
  return <main className="messenger-shell chat-shell"><header className="chat-header"><Tap className="nav-icon" onClick={onBack} aria-label="Back"><ArrowLeft /></Tap><span className={`chat-avatar ${contact.online ? 'online' : ''}`}>{contact.emoji}</span><div className="chat-title"><b>{contact.name}</b><small>{contact.online ? 'online now' : 'last seen recently'}</small></div><div className="header-actions"><Tap className="nav-icon" aria-label="Start video call"><Video /></Tap><Tap className="nav-icon avatar-slot" onClick={onProfile} aria-label="Open profile"><AvatarMedia avatar={avatar} fallback={<MoreHorizontal />} /></Tap></div></header><div className="chat-transcript"><div className="date-stamp"><span /> TODAY <span /></div>{messages.map((message) => message.kind === 'payment'
    ? <div className={`chat-message payment ${message.mine ? 'mine' : ''}`} key={message.id}><div className="payment-card"><div className="payment-glow" /><div className="payment-head"><span className="payment-badge"><DollarSign /></span><div><small>NEXUS PAYMENT</small><b>${message.amount.toFixed(2)}</b></div></div><span className="payment-status"><Check /> Funds sent · settled instantly</span></div><small>{message.time}</small></div>
    : <div className={`chat-message ${message.mine ? 'mine' : ''}`} key={message.id}><p>{message.text}</p><small>{message.time}</small></div>)}<div className="typing"><span /> {contact.name} is in the room</div></div><div className="chat-composer-wrap">
    <div className={`pay-module ${payOpen ? 'open' : ''}`}>
      <div className="pay-head"><span>SEND FUNDS</span><b>${amount.toFixed(2)}</b></div>
      <input className="pay-slider" type="range" min={1} max={500} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Amount to send" />
      <div className="pay-scale"><small>$1</small><small>$500</small></div>
      <Tap className="pay-send" onClick={sendFunds}><Wallet /> Send Funds</Tap>
    </div>
    <div className="chat-tools"><Tap aria-label="Attach file"><Paperclip /></Tap><Tap className={`money-toggle ${payOpen ? 'active' : ''}`} onClick={() => setPayOpen(!payOpen)} aria-label="Open send funds panel"><DollarSign /></Tap><span>Private message</span><Tap aria-label="Start call"><Phone /></Tap></div><form className="chat-composer" onSubmit={submit}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Say something true..." /><Tap className="send-orb" aria-label="Send message"><ArrowUp /></Tap></form><small className="composer-note">End-to-end encrypted · ephemeral by default</small></div></main>
}

export default function Page() {
  const [view, setView] = useState<View>('ONBOARDING')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [avatar, setAvatar] = useState<Avatar>(null)
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2200); return () => window.clearTimeout(timer) }, [toast])
  function showToast(text: string) { setToast(text) }
  return <div className="app-canvas">
    <div className="view-stage" key={view === 'PROFILE_MENU' ? (selected ? 'ACTIVE_CHAT' : 'CHAT_LIST') : view}>
      {view === 'ONBOARDING' && <Gateway onEnter={() => setView('CHAT_LIST')} />}
      {view === 'CHAT_LIST' && <Directory avatar={avatar} onSelect={(contact) => { setSelected(contact); setView('ACTIVE_CHAT') }} onProfile={() => setView('PROFILE_MENU')} />}
      {view === 'ACTIVE_CHAT' && selected && <Chat contact={selected} avatar={avatar} onBack={() => setView('CHAT_LIST')} onProfile={() => setView('PROFILE_MENU')} onToast={showToast} />}
      {view === 'PROFILE_MENU' && (selected ? <Chat contact={selected} avatar={avatar} onBack={() => setView('CHAT_LIST')} onProfile={() => setView('PROFILE_MENU')} onToast={showToast} /> : <Directory avatar={avatar} onSelect={(contact) => { setSelected(contact); setView('ACTIVE_CHAT') }} onProfile={() => setView('PROFILE_MENU')} />)}
    </div>
    {view === 'PROFILE_MENU' && <ProfileDrawer avatar={avatar} setAvatar={setAvatar} onClose={() => setView(selected ? 'ACTIVE_CHAT' : 'CHAT_LIST')} onToast={showToast} />}
    {toast && <Toast text={toast} />}
  </div>
}
