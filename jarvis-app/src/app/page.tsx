'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, ChevronLeft, ChevronRight, Brain } from 'lucide-react';
import dynamic from 'next/dynamic';
import BrainPanel from '@/components/BrainPanel';
import AgentGrid from '@/components/AgentGrid';
import SetupGate from '@/components/SetupGate';
import DashboardView from '@/components/DashboardView';
import type { OrbState } from '@/components/JarvisOrb';
import { ClapDetector } from '@/lib/clap-detect';

// Dynamic import so Three.js only loads client-side
const JarvisOrb = dynamic(() => import('@/components/JarvisOrb'), { ssr: false });
const BriefingView = dynamic(() => import('@/components/BriefingView'), { ssr: false });

// ─── CommandBar (must live outside JarvisInterface to preserve input focus) ──

interface CommandBarProps {
  activeAgent: string | undefined;
  onClearAgent: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  input: string;
  setInput: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isListening: boolean;
  groqOk: boolean;
  isLoading: boolean;
  onToggleListen: () => void;
  onSubmit: () => void;
}

const CommandBar: React.FC<CommandBarProps> = ({
  activeAgent, onClearAgent, inputRef, input, setInput,
  onKeyDown, isListening, groqOk, isLoading, onToggleListen, onSubmit,
}) => (
  <div
    className="px-4 py-3 border-t"
    style={{ borderColor: 'var(--j-glass-border)', background: 'rgba(5,5,8,0.92)', backdropFilter: 'blur(12px)' }}
  >
    {activeAgent && (
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--j-orange)' }}>
          ◈ {activeAgent.toUpperCase()} MODE
        </span>
        <button
          onClick={onClearAgent}
          style={{ fontSize: '0.55rem', color: 'var(--j-text-lo)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--j-red)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--j-text-lo)')}
        >
          ✕ CLEAR
        </button>
      </div>
    )}
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={isListening ? 'LISTENING...' : groqOk ? 'ASK JARVIS ANYTHING...' : 'CONFIGURE GROQ API KEY FIRST'}
        className="hud-input flex-1 px-4 py-2.5"
        style={{ fontSize: '0.78rem' }}
        disabled={isLoading || !groqOk}
      />
      <button
        onClick={onToggleListen}
        className={`hud-btn p-2.5 ${isListening ? 'mic-active' : ''}`}
        disabled={isLoading}
        title="Voice input"
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      <button
        onClick={onSubmit}
        className="hud-btn hud-btn-primary p-2.5"
        disabled={isLoading || !input.trim() || !groqOk}
      >
        <Send size={16} />
      </button>
    </div>
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult:  (e: SpeechRecognitionEvent) => void;
  onerror:   (e: { error: string }) => void;
  onend:     () => void;
}
interface SpeechRecognitionEvent extends Event {
  results: { [i: number]: { [i: number]: { transcript: string } }; length: number };
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'jarvis';
  timestamp: Date;
  streaming?: boolean;
}

// ─── Boot greeting ────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, sir.';
  if (h < 17) return 'Good afternoon, sir.';
  return 'Good evening, sir.';
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate   = 0.82;
  u.pitch  = 0.65;
  u.volume = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find(v => v.name === 'Daniel') ||
    voices.find(v => v.name.includes('David')) ||
    voices.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en')) ||
    voices.find(v => v.lang.startsWith('en'));
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

// ─── Message bubble ───────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
  const isUser = msg.sender === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={isUser ? 'msg-user' : 'msg-jarvis'}
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: 3,
          fontSize: '0.78rem',
          lineHeight: 1.65,
          letterSpacing: '0.02em',
          color: isUser ? 'var(--j-text-hi)' : 'var(--j-text-hi)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {!isUser && (
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--j-cyan)', marginBottom: 5 }}>
            ◈ JARVIS
          </div>
        )}
        <div>{msg.text}{msg.streaming ? <span className="animate-pulse" style={{ color: 'var(--j-cyan)' }}>▊</span> : null}</div>
        <div style={{ fontSize: '0.55rem', color: 'var(--j-text-lo)', marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
          {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Thinking indicator ───────────────────────────────────────────────────

const ThinkingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex justify-start mb-3"
  >
    <div className="msg-jarvis" style={{ padding: '10px 16px', borderRadius: 3 }}>
      <div style={{ fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--j-cyan)', marginBottom: 6 }}>◈ JARVIS</div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="thinking-dot"
            style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--j-cyan)' }}
          />
        ))}
        <span style={{ fontSize: '0.6rem', color: 'var(--j-text-mid)', marginLeft: 4, letterSpacing: '0.1em' }}>
          PROCESSING
        </span>
      </div>
    </div>
  </motion.div>
);

// ─── Main interface ───────────────────────────────────────────────────────

export default function JarvisInterface() {
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [orbState,     setOrbState]     = useState<OrbState>('idle');
  const [isListening,  setIsListening]  = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [booted,       setBooted]       = useState(false);
  const [activeAgent,  setActiveAgent]  = useState<string | undefined>();
  const [agentPrompt,  setAgentPrompt]  = useState('');
  const [groqOk,       setGroqOk]       = useState(false);
  const [notionOk,     setNotionOk]     = useState(false);
  const [brainOpen,    setBrainOpen]    = useState(true);
  const [agentsOpen,   setAgentsOpen]   = useState(true);
  const [isMobile,     setIsMobile]     = useState(false);
  const [mobilePanel,  setMobilePanel]  = useState<'chat' | 'brain' | 'agents'>('chat');
  const [viewMode,     setViewMode]     = useState<'orb' | 'dashboard' | 'briefing'>('orb');
  const [clapReady,    setClapReady]    = useState(false);
  const [activating,   setActivating]   = useState(false);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const inputRef         = useRef<HTMLInputElement>(null);
  const recognitionRef   = useRef<SpeechRecognition | null>(null);
  const synthRef         = useRef<SpeechSynthesis | null>(null);
  const clapRef          = useRef<ClapDetector | null>(null);
  const clapHandlerRef   = useRef<() => void>(() => {});

  // ── Init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── View mode (persisted) ─────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('jarvis-view');
    if (saved === 'dashboard' || saved === 'orb' || saved === 'briefing') setViewMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('jarvis-view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    // Speech recognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (e) => {
        setInput(e.results[0][0].transcript);
        setIsListening(false);
        setOrbState('idle');
      };
      recognitionRef.current.onerror = () => { setIsListening(false); setOrbState('idle'); };
      recognitionRef.current.onend   = () => { setIsListening(false); setOrbState('idle'); };
    }
    // Speech synthesis
    if ('speechSynthesis' in window) synthRef.current = window.speechSynthesis;

    // Health check + boot
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        setGroqOk(data.groq);
        setNotionOk(data.notion);
        boot(data.groq);
      })
      .catch(() => boot(false));

    // Clap detection — start passively after first user gesture
    const startClap = () => {
      if (clapRef.current) return;
      const detector = new ClapDetector(() => clapHandlerRef.current());
      detector.start()
        .then(() => { clapRef.current = detector; setClapReady(true); })
        .catch(() => {});
      window.removeEventListener('click', startClap);
    };
    window.addEventListener('click', startClap);
    return () => {
      window.removeEventListener('click', startClap);
      clapRef.current?.stop();
    };
  }, []);

  const boot = (hasGroq: boolean) => {
    setTimeout(() => {
      const greeting = getGreeting();
      speak(greeting);
      const suffix = hasGroq
        ? '\n\nSystems online. Double-clap to activate briefing.'
        : '\n\nGroq API key not configured — please follow setup instructions.';
      setMessages([{
        id: 'boot',
        text: greeting + suffix,
        sender: 'jarvis',
        timestamp: new Date(),
      }]);
      setBooted(true);
    }, 1200);
  };

  // ── Auto-scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !groqOk || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setOrbState('thinking');

    const streamId = (Date.now() + 1).toString();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: agentPrompt ? agentPrompt + text : text }),
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      setOrbState('responding');
      setMessages(prev => [...prev, {
        id: streamId,
        text: '',
        sender: 'jarvis',
        timestamp: new Date(),
        streaming: true,
      }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const { text: delta } = JSON.parse(raw);
            if (delta) {
              full += delta;
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, text: full } : m
              ));
            }
          } catch { /* skip */ }
        }
      }

      // Finalize
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, streaming: false } : m
      ));
      speak(full.slice(0, 180));

    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, text: 'ERROR — Connection lost. Verify GROQ_API_KEY.', streaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
      setOrbState('idle');
    }
  }, [groqOk, isLoading, agentPrompt]);

  // sendMessage must be declared before handleClapWake (dependency order)
  const handleClapWake = useCallback(() => {
    if (isLoading) return;
    setActivating(true);
    setViewMode('briefing');
    speak('Activating briefing, sir.');
    setOrbState('thinking');
    setTimeout(() => {
      setActivating(false);
      sendMessage(
        'Give me my full business briefing. Cover in this order: (1) PRISM — Dubai real estate deals, pipeline, active clients; (2) ELEVATE — LinkedIn content, brand growth, community size; (3) Trading — current macro positions, P&L, gold/silver; (4) Aviation — active charter/MRO operations, upcoming flights. For each: status, revenue, top priority. Be direct, executive style, no filler.'
      );
    }, 1200);
  }, [isLoading, sendMessage]);
  // Keep ref in sync so clap detector always calls the latest version
  useEffect(() => { clapHandlerRef.current = handleClapWake; }, [handleClapWake]);

  const handleSubmit = () => {
    if (input.trim()) sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  // ── Voice ──────────────────────────────────────────────────────────────

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setOrbState('idle');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setOrbState('listening');
    }
  };

  // ── Agent activation ───────────────────────────────────────────────────

  const activateAgent = (prompt: string, agentId: string) => {
    setActiveAgent(agentId);
    setAgentPrompt(prompt);
    inputRef.current?.focus();
  };

  // ── Brain entry click ──────────────────────────────────────────────────

  const onBrainEntry = (entry: { title: string }) => {
    setInput(`Tell me about: ${entry.title}`);
    if (isMobile) setMobilePanel('chat');
    inputRef.current?.focus();
  };

  // ─── Status bar ─────────────────────────────────────────────────────────

  const StatusBar = () => (
    <div
      className="flex items-center justify-between px-4 py-1.5 border-t"
      style={{
        borderColor: 'var(--j-glass-border)',
        background: 'rgba(2,4,8,0.6)',
        fontSize: '0.58rem',
        letterSpacing: '0.1em',
        color: 'var(--j-text-lo)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className={groqOk ? 'pulse-dot' : ''}
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: groqOk ? 'var(--j-green)' : 'var(--j-red)',
            }}
          />
          <span className={groqOk ? 'status-online' : 'status-offline'}>
            {groqOk ? 'GROQ.ONLINE' : 'GROQ.OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: notionOk ? 'var(--j-cyan)' : 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: notionOk ? 'var(--j-cyan)' : 'var(--j-text-lo)' }}>
            {notionOk ? 'BRAIN.ONLINE' : 'BRAIN.OFFLINE'}
          </span>
        </div>
      </div>
      <div style={{ color: 'var(--j-text-lo)' }}>
        {activeAgent ? `◈ ${activeAgent.toUpperCase()} ACTIVE` : 'JARVIS — SAMBHAV OS'}
      </div>
      <div>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC</div>
      <div className="flex items-center gap-1.5">
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: clapReady ? 'var(--j-green)' : 'rgba(255,255,255,0.15)' }} />
        <span style={{ color: clapReady ? 'var(--j-text-mid)' : 'var(--j-text-lo)' }}>
          {activating ? '◈ ACTIVATING...' : clapReady ? '👏 CLAP×2 TO BRIEF' : 'CLAP.STANDBY'}
        </span>
      </div>
    </div>
  );

  // ─── Command bar props (CommandBar defined at module level) ─────────────

  const cmdBarProps: CommandBarProps = {
    activeAgent,
    onClearAgent: () => { setActiveAgent(undefined); setAgentPrompt(''); },
    inputRef,
    input,
    setInput,
    onKeyDown: handleKeyDown,
    isListening,
    groqOk,
    isLoading,
    onToggleListen: toggleListening,
    onSubmit: handleSubmit,
  };

  // ─── Chat area ─────────────────────────────────────────────────────────

  const ChatArea = () => (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
      <AnimatePresence mode="popLayout">
        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
        {isLoading && orbState === 'thinking' && <ThinkingIndicator key="thinking" />}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────

  if (isMobile) {
    // ── MOBILE LAYOUT ──
    return (
      <div className="flex flex-col h-screen hud-grid" style={{ background: 'var(--j-black)' }}>
        <SetupGate groqConnected={groqOk} notionConnected={notionOk} />

        {/* Navbar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: 'var(--j-glass-border)', background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-2">
            <div className={`pulse-dot-cyan`} style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--j-cyan)' }}>JARVIS</span>
          </div>
          <div className="flex gap-1">
            {(['chat', 'brain', 'agents'] as const).map(p => (
              <button
                key={p}
                onClick={() => setMobilePanel(p)}
                className="hud-btn px-2 py-1"
                style={{
                  fontSize: '0.58rem',
                  letterSpacing: '0.08em',
                  background: mobilePanel === p ? 'rgba(0,212,255,0.12)' : 'transparent',
                  color: mobilePanel === p ? 'var(--j-cyan)' : 'var(--j-text-mid)',
                  borderColor: mobilePanel === p ? 'var(--j-cyan-border)' : 'transparent',
                }}
              >
                {p === 'chat' ? '⌨ CHAT' : p === 'brain' ? '◈ BRAIN' : '◇ AGENTS'}
              </button>
            ))}
          </div>
        </div>

        {/* Orb */}
        {booted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ height: 220, position: 'relative', flexShrink: 0 }}
          >
            <JarvisOrb orbState={orbState} />
            {/* State label */}
            <div
              className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
              style={{
                fontSize: '0.55rem',
                letterSpacing: '0.2em',
                color: orbState === 'idle' ? 'var(--j-cyan-dim)' : orbState === 'thinking' ? 'var(--j-orange)' : orbState === 'responding' ? 'var(--j-green)' : '#7788ff',
              }}
            >
              {orbState.toUpperCase()}
            </div>
          </motion.div>
        )}

        {/* Panel content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {mobilePanel === 'chat' && (
            <>
              <ChatArea />
              <CommandBar {...cmdBarProps} />
              <StatusBar />
            </>
          )}
          {mobilePanel === 'brain' && (
            <BrainPanel
              notionConnected={notionOk}
              onEntryClick={onBrainEntry}
              className="flex-1"
            />
          )}
          {mobilePanel === 'agents' && (
            <div className="hud-panel flex-1">
              <AgentGrid
                onAgentActivate={(p, id) => { activateAgent(p, id); setMobilePanel('chat'); }}
                activeAgent={activeAgent}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ──
  return (
    <div className="flex flex-col h-screen hud-grid scan-line" style={{ background: 'var(--j-black)' }}>
      <SetupGate groqConnected={groqOk} notionConnected={notionOk} />

      {/* Top navbar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: booted ? 1 : 0, y: booted ? 0 : -20 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-between px-6 py-2 border-b boot-in"
        style={{
          borderColor: 'var(--j-glass-border)',
          background: 'rgba(5,5,8,0.92)',
          backdropFilter: 'blur(16px)',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="pulse-dot-cyan" style={{ width: 7, height: 7 }} />
          <span style={{ fontSize: '0.85rem', letterSpacing: '0.35em', color: 'var(--j-cyan)', fontWeight: 700 }} className="glow-cyan">
            JARVIS
          </span>
          <span style={{ fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--j-text-lo)' }}>
            SAMBHAV OS v1.0
          </span>
        </div>

        {/* Center: orb state */}
        <div
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            color: orbState === 'idle'
              ? 'var(--j-cyan-dim)'
              : orbState === 'listening'
              ? '#7788ff'
              : orbState === 'thinking'
              ? 'var(--j-orange)'
              : 'var(--j-green)',
          }}
        >
          ● {orbState.toUpperCase()}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {(['orb', 'dashboard', 'briefing'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="hud-btn px-2.5 py-1"
                style={{
                  fontSize: '0.58rem',
                  letterSpacing: '0.08em',
                  background: viewMode === mode ? 'rgba(0,212,255,0.12)' : 'transparent',
                  color: viewMode === mode ? 'var(--j-cyan)' : 'var(--j-text-mid)',
                  borderColor: viewMode === mode ? 'var(--j-cyan-border)' : 'transparent',
                }}
              >
                {mode === 'orb' ? '◉ ORB' : mode === 'dashboard' ? '◫ DATA' : '◈ BRIEF'}
              </button>
            ))}
          </div>
          {viewMode === 'orb' && (
            <>
              <button
                onClick={() => setBrainOpen(v => !v)}
                className="hud-btn px-2.5 py-1 flex items-center gap-1.5"
                title="Toggle brain panel"
              >
                <Brain size={12} />
                <span style={{ fontSize: '0.58rem', letterSpacing: '0.08em' }}>BRAIN</span>
                {brainOpen ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
              </button>
              <button
                onClick={() => setAgentsOpen(v => !v)}
                className="hud-btn px-2.5 py-1"
                title="Toggle agents panel"
                style={{ fontSize: '0.58rem', letterSpacing: '0.08em' }}
              >
                AGENTS {agentsOpen ? '◀' : '▶'}
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Main content area — switches between ORB, DASHBOARD, and BRIEFING */}
      <AnimatePresence mode="wait">
        {viewMode === 'briefing' ? (
          <motion.div
            key="briefing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <BriefingView
              active={orbState !== 'idle'}
              lastMessage={messages.filter(m => m.sender === 'jarvis').slice(-1)[0]?.text}
              groqOk={groqOk}
              notionOk={notionOk}
            />
          </motion.div>
        ) : viewMode === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <DashboardView
              onCommand={(text) => {
                setInput(text);
                sendMessage(text);
              }}
              notionConnected={notionOk}
            />
          </motion.div>
        ) : (
          <motion.div
            key="orb"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 overflow-hidden"
          >
            {/* ── Left: Brain Panel ── */}
            <AnimatePresence>
              {brainOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 268, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-r overflow-hidden flex-shrink-0"
                  style={{ borderColor: 'var(--j-glass-border)', background: 'rgba(6,13,31,0.7)' }}
                >
                  <BrainPanel
                    notionConnected={notionOk}
                    onEntryClick={onBrainEntry}
                    className="h-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Center: Orb + Chat ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

              {/* Orb — always centered, behind chat */}
              <div className="absolute inset-0 pointer-events-none">
                {booted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="w-full h-full"
                  >
                    <JarvisOrb orbState={orbState} />
                  </motion.div>
                )}
              </div>

              {/* Chat overlay — messages + input */}
              <div className="relative z-10 flex flex-col h-full">
                <ChatArea />
                <CommandBar {...cmdBarProps} />
              </div>
            </div>

            {/* ── Right: Agent Grid ── */}
            <AnimatePresence>
              {agentsOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-l overflow-hidden flex-shrink-0 hud-panel"
                  style={{ borderColor: 'var(--j-glass-border)', borderRadius: 0 }}
                >
                  <AgentGrid
                    onAgentActivate={activateAgent}
                    activeAgent={activeAgent}
                    className="h-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command bar — visible in dashboard and briefing views */}
      {(viewMode === 'dashboard' || viewMode === 'briefing') && <CommandBar {...cmdBarProps} />}

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
