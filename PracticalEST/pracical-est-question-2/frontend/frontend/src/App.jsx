import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export default function App() {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [input, setInput] = useState('')
  const stompRef = useRef(null)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:9000/ws'),
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/messages', (frame) => {
          setMessages(prev => [...prev, JSON.parse(frame.body)])
        })
      },
      onDisconnect: () => setConnected(false),
      reconnectDelay: 3000,
    })
    client.activate()
    stompRef.current = client
    return () => client.deactivate()
  }, [])

  const send = () => {
    if (!input.trim() || !connected) return
    stompRef.current.publish({
      destination: '/app/send',
      body: JSON.stringify({ text: input.trim() }),
    })
    setInput('')
  }

  return (
    <div style={{ padding: '20px', color: 'white', background: '#111', minHeight: '100vh' }}>
      <h2>WebSocket — {connected ? '🟢 Connected' : '🔴 Disconnected'}</h2>

      <div style={{ border: '1px solid #333', padding: '10px', height: '300px',
        overflowY: 'auto', marginBottom: '10px', borderRadius: '8px' }}>
        {messages.length === 0
          ? <p style={{ color: '#666' }}>No messages yet...</p>
          : messages.map((m, i) => (
            <div key={i} style={{ marginBottom: '8px', padding: '8px',
              background: '#1e1e1e', borderRadius: '4px' }}>
              <span style={{ color: '#888', fontSize: '11px' }}>[{m.type}] {m.time} — </span>
              <span>{m.text}</span>
            </div>
          ))
        }
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          disabled={!connected}
          style={{ flex: 1, padding: '8px', background: '#222',
            color: 'white', border: '1px solid #444', borderRadius: '4px' }}
        />
        <button onClick={send} disabled={!connected}
          style={{ padding: '8px 16px', background: '#166534',
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Send
        </button>
      </div>
    </div>
  )
}