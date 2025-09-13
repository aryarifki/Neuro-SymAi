import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// Types for the application
interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: string[];
  isValid?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

interface ApiResponse {
  response: string;
  isValid: boolean;
  confidence?: number;
  sources?: string[];
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

// Utility function to generate unique IDs
const generateId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Utility function to format timestamp
const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Local storage utilities
const STORAGE_KEY = 'indonesian_law_chat_messages';

const saveMessagesToStorage = (messages: Message[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to save messages to localStorage:', error);
  }
};

const loadMessagesFromStorage = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (error) {
    console.warn('Failed to load messages from localStorage:', error);
  }
  return [];
};

// Main Chat Component
const ChatInterface: React.FC = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    isConnected: true
  });

  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = loadMessagesFromStorage();
    if (savedMessages.length > 0) {
      setChatState(prev => ({ ...prev, messages: savedMessages }));
    }
  }, []);

  // Save messages to localStorage when messages change
  useEffect(() => {
    saveMessagesToStorage(chatState.messages);
  }, [chatState.messages]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatState.messages, chatState.isLoading]);

  // Health check for API connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health');
        const isHealthy = response.ok;
        setChatState(prev => ({ ...prev, isConnected: isHealthy }));
      } catch (error) {
        setChatState(prev => ({ ...prev, isConnected: false }));
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle input auto-resize
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInputValue(target.value);

    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Escape to close sidebar
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Send message to API
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || chatState.isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    // Add user message immediately
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      const assistantMessage: Message = {
        id: generateId(),
        type: data.isValid ? 'assistant' : 'error',
        content: data.response,
        timestamp: new Date(),
        confidence: data.confidence,
        sources: data.sources,
        isValid: data.isValid
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }));

    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        id: generateId(),
        type: 'error',
        content: 'Maaf, terjadi kesalahan saat menghubungi server. Silakan coba lagi dalam beberapa saat.',
        timestamp: new Date()
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const message = inputValue;
      setInputValue('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
      await sendMessage(message);
    }
  };

  // Handle Enter key in textarea
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Clear chat history
  const clearChat = () => {
    setChatState(prev => ({ ...prev, messages: [] }));
    localStorage.removeItem(STORAGE_KEY);
  };

  // Render message component
  const renderMessage = (message: Message) => (
    <div key={message.id} className={`message ${message.type}`}>
      <div className="message-avatar">
        {message.type === 'user' ? 'U' : message.type === 'error' ? '!' : 'AI'}
      </div>
      <div className="message-content">
        <div className="message-text">{message.content}</div>
        
        {/* Show confidence and sources for valid AI responses */}
        {message.type === 'assistant' && message.confidence !== undefined && (
          <div className="message-meta">
            <span className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </span>
            <div className="message-confidence">
              <span>Confidence: {message.confidence.toFixed(1)}%</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ width: `${message.confidence}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Show sources if available */}
        {message.sources && message.sources.length > 0 && (
          <div className="message-sources">
            <div className="sources-title">Sumber Hukum:</div>
            <ul className="sources-list">
              {message.sources.map((source, index) => (
                <li key={index} className="source-tag">{source}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Show timestamp for user and error messages */}
        {(message.type === 'user' || message.type === 'error') && (
          <div className="message-meta">
            <span className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // Render typing indicator
  const renderTypingIndicator = () => (
    <div className="typing-indicator">
      <div className="message-avatar">AI</div>
      <div className="typing-content">
        <span>Sedang mengetik</span>
        <div className="typing-dots">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Chatbot Hukum Indonesia - AI Assistant</title>
        <meta name="description" content="AI chatbot untuk konsultasi hukum Indonesia dengan referensi undang-undang yang akurat" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </Head>

      <div className="app-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h1 className="sidebar-title">Hukum Indonesia</h1>
            <p className="sidebar-subtitle">AI Legal Assistant</p>
          </div>
          
          <div className="sidebar-content">
            <div style={{ marginBottom: '1rem' }}>
              <button 
                onClick={clearChat}
                style={{
                  background: 'var(--bg-button)',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  color: 'white',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🗑️ Clear Chat
              </button>
            </div>

            <div className="chat-history">
              <h3 style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--text-muted)', 
                marginBottom: 'var(--spacing-md)' 
              }}>
                Recent Topics
              </h3>
              
              {chatState.messages.length === 0 && (
                <p style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: 'var(--font-size-sm)',
                  fontStyle: 'italic'
                }}>
                  No messages yet. Start a conversation!
                </p>
              )}

              {/* Show recent user messages as conversation starters */}
              {chatState.messages
                .filter(msg => msg.type === 'user')
                .slice(-5)
                .map((msg, index) => (
                  <div key={msg.id} className="chat-history-item">
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                      {msg.content.length > 50 
                        ? `${msg.content.substring(0, 50)}...` 
                        : msg.content
                      }
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--text-muted)',
                      marginTop: 'var(--spacing-xs)'
                    }}>
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="chat-container">
          {/* Header */}
          <header className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <button 
                className="mobile-menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
              >
                ☰
              </button>
              <h1 className="chat-title">Indonesian Law Assistant</h1>
            </div>
            
            <div className="status-indicator">
              <div className={`status-dot ${chatState.isConnected ? '' : 'offline'}`} />
              <span>{chatState.isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </header>

          {/* Messages Container */}
          <div className="messages-container">
            {chatState.messages.length === 0 && !chatState.isLoading && (
              <div className="empty-state">
                <div className="empty-state-icon">⚖️</div>
                <h2 className="empty-state-title">Selamat datang di Chatbot Hukum Indonesia</h2>
                <p className="empty-state-subtitle">
                  Tanyakan apapun tentang hukum Indonesia, seperti UU, KUHP, prosedur hukum, 
                  dan peraturan lainnya. Saya akan memberikan informasi yang akurat dengan 
                  referensi sumber yang valid.
                </p>
                <div style={{ marginTop: 'var(--spacing-xl)' }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                    Contoh pertanyaan:
                  </p>
                  <ul style={{ 
                    listStyle: 'none', 
                    marginTop: 'var(--spacing-md)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)'
                  }}>
                    <li>• &quot;Apa sanksi pidana untuk tindak pencurian?&quot;</li>
                    <li>• &quot;Bagaimana cara mengajukan gugatan cerai?&quot;</li>
                    <li>• &quot;Apa saja syarat sahnya perjanjian?&quot;</li>
                  </ul>
                </div>
              </div>
            )}

            {chatState.messages.map(renderMessage)}
            
            {chatState.isLoading && renderTypingIndicator()}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="input-container">
            <form onSubmit={handleSubmit} className="input-wrapper">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Tanyakan tentang hukum Indonesia... (Tekan Shift+Enter untuk baris baru)"
                className="input-field"
                disabled={chatState.isLoading || !chatState.isConnected}
                rows={1}
              />
              
              <button
                type="submit"
                className="send-button"
                disabled={!inputValue.trim() || chatState.isLoading || !chatState.isConnected}
              >
                {chatState.isLoading ? (
                  <div className="spinner" />
                ) : (
                  '→'
                )}
              </button>
            </form>

            {!chatState.isConnected && (
              <div className="error-message" style={{ marginTop: 'var(--spacing-md)' }}>
                ⚠️ Koneksi terputus. Memeriksa ulang...
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ChatInterface;