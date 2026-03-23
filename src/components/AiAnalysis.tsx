'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { formatAllApartments, generateChatGPTPrompt } from '@/lib/ai-export';
import { applyFilters } from '@/lib/filters';
import FilterBar from './FilterBar';
import {
  Send,
  Check,
  Bot,
  User,
  Sparkles,
  ClipboardCopy,
  Loader2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  {
    label: 'Best investment overall',
    prompt: 'Which apartment is the best overall investment? Consider price/m², rental yield potential, location, and condition. Give me a clear winner with reasoning.',
  },
  {
    label: 'Best for renting to students/young professionals',
    prompt: 'Which apartment would be best for renting to young professionals or students? Consider proximity to Hauptbahnhof, size, price, and district appeal for that demographic.',
  },
  {
    label: 'Best for families',
    prompt: 'Which apartment would be best suited for renting to families? Consider number of rooms, area, quiet location, and family-friendly features.',
  },
  {
    label: 'Compare all — ranked table',
    prompt: 'Create a comparison table ranking all apartments by investment quality. Include columns for: price, price/m², area, rooms, estimated rental yield, distance to Hbf, condition score, and an overall investment score out of 10.',
  },
  {
    label: 'Red flags & risks',
    prompt: 'Identify any red flags or risks for each apartment. Consider: overpriced for the area, poor energy efficiency, high Hausgeld, bad condition, unfavorable location, or any other concerns from the data.',
  },
  {
    label: 'Rental yield analysis',
    prompt: 'Estimate the potential rental yield for each apartment. Consider Leipzig rental market rates for each district, apartment size, and condition. Calculate gross and approximate net yield.',
  },
];

export default function AiAnalysis() {
  const { apartments, filters, aiChatMessages, setAiChatMessages } = useStore();
  const messages = aiChatMessages;
  const setMessages = setAiChatMessages;
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const filtered = useMemo(
    () => applyFilters(apartments, filters),
    [apartments, filters]
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [aiChatMessages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setLoading(true);

    // Format apartment data at send time to ensure we use current filtered list
    const apartmentData = formatAllApartments(filtered);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          apartmentData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('API key')) {
          setApiKeyMissing(true);
        }
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyForChatGPT = async () => {
    const prompt = generateChatGPTPrompt(filtered);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = prompt;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    // Process the content into HTML-safe segments
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    let inTable = false;
    let tableRows: string[][] = [];
    let tableKey = 0;

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${tableKey++}`} className="overflow-x-auto my-3">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  {tableRows[0].map((cell, i) => (
                    <th key={i} className="border border-border px-2 py-1.5 text-left font-semibold">
                      {processInline(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/20'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-border px-2 py-1">
                        {processInline(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table detection
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) inTable = true;
        const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        // Skip separator rows
        if (cells.every((c) => /^[\s:-]+$/.test(c))) {
          tableRows.push(cells);
          continue;
        }
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="font-bold text-sm mt-3 mb-1">
            {processInline(line.slice(4))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="font-bold text-base mt-4 mb-1.5">
            {processInline(line.slice(3))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="font-bold text-lg mt-4 mb-2">
            {processInline(line.slice(2))}
          </h1>
        );
      }
      // Numbered list
      else if (/^\d+\.\s/.test(line)) {
        elements.push(
          <div key={i} className="ml-4 my-0.5">
            {processInline(line)}
          </div>
        );
      }
      // Bullet list
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={i} className="ml-4 my-0.5 flex gap-1.5">
            <span className="text-muted-foreground shrink-0">•</span>
            <span>{processInline(line.slice(2))}</span>
          </div>
        );
      }
      // Empty line
      else if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      }
      // Normal text
      else {
        elements.push(
          <p key={i} className="my-0.5">
            {processInline(line)}
          </p>
        );
      }
    }

    if (inTable) flushTable();

    return elements;
  };

  // Process inline markdown (bold, code, links, bare URLs)
  const processInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Find the earliest match among all patterns
      const patterns: { match: RegExpMatchArray; type: string }[] = [];

      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) patterns.push({ match: boldMatch, type: 'bold' });

      const codeMatch = remaining.match(/`(.+?)`/);
      if (codeMatch && codeMatch.index !== undefined) patterns.push({ match: codeMatch, type: 'code' });

      const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (linkMatch && linkMatch.index !== undefined) patterns.push({ match: linkMatch, type: 'link' });

      const bareUrlMatch = remaining.match(/(?<!\()(https?:\/\/[^\s)<>]+)/);
      if (bareUrlMatch && bareUrlMatch.index !== undefined) {
        // Don't match if this URL is already part of a markdown link
        const before = remaining.slice(0, bareUrlMatch.index);
        if (!before.endsWith('](')) {
          patterns.push({ match: bareUrlMatch, type: 'bareUrl' });
        }
      }

      if (patterns.length === 0) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      // Pick the earliest match
      patterns.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
      const earliest = patterns[0];
      const idx = earliest.match.index!;

      // Push text before the match
      if (idx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      }

      if (earliest.type === 'bold') {
        parts.push(
          <strong key={key++} className="font-semibold">
            {processInline(earliest.match[1])}
          </strong>
        );
      } else if (earliest.type === 'code') {
        parts.push(
          <code key={key++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
            {earliest.match[1]}
          </code>
        );
      } else if (earliest.type === 'link') {
        parts.push(
          <a
            key={key++}
            href={earliest.match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {earliest.match[1]}
          </a>
        );
      } else if (earliest.type === 'bareUrl') {
        parts.push(
          <a
            key={key++}
            href={earliest.match[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {earliest.match[0]}
          </a>
        );
      }

      remaining = remaining.slice(idx + earliest.match[0].length);
    }

    return parts;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-white px-3 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto max-w-screen-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              <h1 className="text-base font-semibold sm:text-lg">AI Analysis</h1>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full sm:text-xs sm:px-2 flex-shrink-0">
                {filtered.length}/{apartments.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 ${
                  filtersExpanded
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {filtersExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:gap-1.5 sm:px-3"
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
              <button
                onClick={copyForChatGPT}
                className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted transition-colors sm:gap-1.5 sm:px-3"
                title="Copy a formatted prompt with filtered apartment data to paste into ChatGPT"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible filter bar */}
          {filtersExpanded && (
            <div className="sticky top-0 z-10 animate-in slide-in-from-top-2 duration-200">
              <div className="border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                <FilterBar />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-screen-lg px-4 py-4 space-y-4">
          {messages.length === 0 && !apiKeyMissing && (
            <div className="py-12 text-center space-y-6">
              <div className="space-y-2">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h2 className="text-xl font-semibold text-foreground">
                  Analyze your apartments with AI
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ask questions about your {filtered.length} filtered apartments.
                  Use the <strong>Filters</strong> button above to narrow down which apartments to analyze.
                </p>
              </div>

              {/* Suggested prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-2xl mx-auto">
                {SUGGESTED_PROMPTS.map((sp) => (
                  <button
                    key={sp.label}
                    onClick={() => sendMessage(sp.prompt)}
                    className="text-left rounded-xl border border-border p-3 hover:bg-muted/50 hover:border-primary/30 transition-all group"
                  >
                    <span className="text-xs font-medium text-primary group-hover:text-primary/80">
                      {sp.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Export fallback note */}
              <div className="text-xs text-muted-foreground pt-4">
                No API key? Use the <strong>Copy for ChatGPT</strong> button above to export
                all apartment data as a prompt you can paste directly into{' '}
                <a
                  href="https://chat.openai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  chat.openai.com
                </a>
              </div>
            </div>
          )}

          {apiKeyMissing && messages.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500" />
              <h2 className="text-lg font-semibold">OpenAI API Key Required</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                To use the built-in chat, add your OpenAI API key to <code className="bg-muted px-1.5 py-0.5 rounded text-xs">.env.local</code>:
              </p>
              <code className="block bg-muted rounded-lg px-4 py-2 text-xs font-mono max-w-sm mx-auto">
                OPENAI_API_KEY=sk-your-key-here
              </code>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  Meanwhile, use <strong>Copy for ChatGPT</strong> above to export your data manually.
                </p>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-foreground border border-border/50'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose-sm">{renderContent(msg.content)}</div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted/60 rounded-2xl px-4 py-3 border border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing apartments...
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-white px-4 py-3">
        <div className="mx-auto max-w-screen-lg">
          {/* Quick prompt chips when there's an active conversation */}
          {messages.length > 0 && (
            <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
              {[
                'Which is the best value?',
                'Compare top 3',
                'Rental yield estimate',
                'Any red flags?',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                apartments.length === 0
                  ? 'No apartments loaded — add some first!'
                  : filtered.length === 0
                  ? 'No apartments match current filters'
                  : `Ask about ${filtered.length} filtered apartments...`
              }
              disabled={loading || filtered.length === 0}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || filtered.length === 0}
              className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Uses GPT-5.4 · Your apartment data is sent to OpenAI for analysis
          </p>
        </div>
      </div>
    </div>
  );
}
