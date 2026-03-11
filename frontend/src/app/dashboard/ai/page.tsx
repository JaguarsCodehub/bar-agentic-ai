'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import api from '@/lib/api';

type Message = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: 'Hello! I am your Bar Management AI Agent. I can help you analyze stock, sales, losses, and generated reconciliation reports. How can I help you today?',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', { query: userMsg.content });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.response
      }]);
    } catch (error) {
      console.error('Failed to get AI response', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: 'Sorry, I encountered an error while analyzing your request. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ 
          width: 50, height: 50, borderRadius: 16, 
          background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(108, 92, 231, 0.3)'
        }}>
          <Sparkles size={24} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, var(--color-text), #6c5ce7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bar Intelligence Agent
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '15px' }}>
            Ask me anything about your current stock, sales trends, or loss reports.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ 
        flex: 1, 
        background: 'var(--color-surface)', 
        borderRadius: '24px', 
        border: '1px solid var(--color-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* Messages List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: msg.role === 'agent' ? 'linear-gradient(135deg, #6c5ce7, #a29bfe)' : 'var(--color-border)',
                color: msg.role === 'agent' ? 'white' : 'var(--color-text)'
              }}>
                {msg.role === 'agent' ? <Bot size={20} /> : <UserIcon size={20} />}
              </div>
              
              {/* Bubble */}
              <div style={{
                maxWidth: '75%',
                padding: '16px 20px',
                borderRadius: '20px',
                borderTopLeftRadius: msg.role === 'agent' ? '4px' : '20px',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '20px',
                background: msg.role === 'user' ? '#f3f4f6' : 'rgba(108, 92, 231, 0.05)',
                border: msg.role === 'agent' ? '1px solid rgba(108, 92, 231, 0.1)' : 'none',
                color: 'var(--color-text)',
                fontSize: '15px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                color: 'white'
              }}>
                <Bot size={20} />
              </div>
              <div style={{
                padding: '16px 24px',
                borderRadius: '20px',
                borderTopLeftRadius: '4px',
                background: 'rgba(108, 92, 231, 0.05)',
                border: '1px solid rgba(108, 92, 231, 0.1)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Loader2 size={16} className="animate-spin" color="#6c5ce7" />
                <span style={{ color: '#6c5ce7', fontSize: '14px', fontWeight: 500 }}>Analyzing data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', position: 'relative' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask about highest selling products, loss reports, or stock levels..."
              style={{
                flex: 1,
                padding: '16px 20px',
                paddingRight: '60px',
                borderRadius: '16px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                fontSize: '15px',
                resize: 'none',
                minHeight: '24px',
                height: '56px',
                lineHeight: '22px',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
                color: 'var(--color-text)'
              }}
              disabled={loading}
              onFocus={(e) => e.target.style.borderColor = '#6c5ce7'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                position: 'absolute',
                right: '10px',
                bottom: '10px',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #6c5ce7, #a29bfe)' : 'var(--color-border)',
                color: input.trim() && !loading ? 'white' : 'var(--color-text-secondary)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              <Send size={18} style={{ transform: 'translateX(-1px)' }} />
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
             <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
               <Sparkles size={12} /> Responses are generated based on your bar's private data.
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}
