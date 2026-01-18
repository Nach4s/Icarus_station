import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Bot, Send, Loader2, AlertTriangle, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'

const API_URL = 'http://localhost:5000'

const AICompanionPanel = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I\'m the Icarus Station AI Companion. I can help you analyze station status, sensors, crew nutrition, and safety systems. Ask me anything!'
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [stationStatus, setStationStatus] = useState('nominal')
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const sendMessage = async (messageText) => {
        const userMessage = messageText || input.trim()
        if (!userMessage || isLoading) return

        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            const response = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            })

            const data = await response.json()

            if (data.success !== false && data.response) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.response
                }])

                if (data.context_summary) {
                    setStationStatus(data.context_summary.status || 'nominal')
                }
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠️ Error: ${data.error || 'Failed to get response. Check if backend is running.'}`
                }])
            }
        } catch (error) {
            console.error('AI Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Connection error. Please make sure the backend server is running on port 5000.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const handleQuickAction = (query) => {
        if (!isLoading) {
            sendMessage(query)
        }
    }

    const getStatusIcon = () => {
        switch (stationStatus) {
            case 'critical':
                return <AlertTriangle className="w-5 h-5 text-status-critical" />
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-status-warning" />
            default:
                return <CheckCircle className="w-5 h-5 text-status-nominal" />
        }
    }

    const getStatusText = () => {
        switch (stationStatus) {
            case 'critical': return 'CRITICAL'
            case 'warning': return 'WARNING'
            default: return 'NOMINAL'
        }
    }

    const getStatusColor = () => {
        switch (stationStatus) {
            case 'critical': return 'text-status-critical bg-status-critical/10 border-status-critical/30'
            case 'warning': return 'text-status-warning bg-status-warning/10 border-status-warning/30'
            default: return 'text-status-nominal bg-status-nominal/10 border-status-nominal/30'
        }
    }

    const quickActions = [
        { label: 'Station Status', query: 'What is the current station status?' },
        { label: 'Danger Check', query: 'Are there any dangerous readings?' },
        { label: 'Nutrition', query: 'Analyze crew nutrition' },
        { label: 'Tasks', query: 'What tasks do I have?' }
    ]

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-display font-bold text-white">AI Companion</h2>
                        <p className="text-sm text-gray-400">Station analysis & recommendations</p>
                    </div>
                </div>

                {/* Station Status Indicator */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span className="text-sm font-bold">{getStatusText()}</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
                {quickActions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleQuickAction(action.query)}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 
                       text-gray-400 hover:text-white hover:bg-white/10 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto mb-4 space-y-4 pr-2">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] rounded-xl p-4 ${msg.role === 'user'
                            ? 'bg-primary/20 border border-primary/30 text-white'
                            : 'bg-white/5 border border-white/10 text-gray-200'
                            }`}>
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-xs text-primary font-medium">AI Companion</span>
                                </div>
                            )}
                            <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                                {msg.role === 'assistant' ? (
                                    <ReactMarkdown
                                        components={{
                                            h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mt-2 mb-2" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-md font-semibold text-gray-200 mt-2 mb-1" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2" {...props} />,
                                            li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                                            p: ({ node, ...props }) => <p className="my-1" {...props} />,
                                            table: ({ node, ...props }) => <table className="w-full my-2 text-sm" {...props} />,
                                            thead: ({ node, ...props }) => <thead className="border-b border-white/20" {...props} />,
                                            th: ({ node, ...props }) => <th className="text-left py-1 px-2 text-gray-400 font-medium" {...props} />,
                                            td: ({ node, ...props }) => <td className="py-1 px-2 text-gray-300" {...props} />,
                                            code: ({ node, ...props }) => <code className="bg-white/10 px-1 py-0.5 rounded text-primary text-xs" {...props} />,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                ) : (
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm text-gray-400">Analyzing data...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about the station..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white 
                     placeholder-gray-500 focus:outline-none focus:border-primary/50 
                     disabled:opacity-50 transition-colors"
                />
                <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="px-4 py-3 bg-primary/20 border border-primary/30 rounded-xl text-primary
                     hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Footer note */}
            <p className="text-xs text-gray-500 text-center mt-4">
                Powered by OpenAI. Add OPENAI_API_KEY to backend .env for full functionality.
            </p>
        </div>
    )
}

export default AICompanionPanel
