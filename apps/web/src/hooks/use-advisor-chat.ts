import { useCallback, useRef, useState } from 'react';
import { streamAdvisorChat } from '@/lib/advisor-stream';

export interface AdvisorChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Server id of the persisted message; required to attach feedback. */
  id?: string;
  /** Marks a failed turn so it is never presented as advice. */
  isError?: boolean;
  /** True while tokens are still arriving. */
  isStreaming?: boolean;
  /** How much data this particular answer rested on. */
  confidence?: string;
  structuredData?: Record<string, unknown>;
}

interface Options {
  /** Called the first time a conversation id is issued. */
  onConversationStarted?: (conversationId: string) => void;
}

/**
 * The advisor conversation, streamed.
 *
 * Extracted because three surfaces needed it — the advisor page, the dashboard
 * panel and the insights panel — and the latter two were calling a separate,
 * older endpoint with its own duplicated system prompt. Questions asked there
 * got no streaming, no markdown, no memory and no affordability tool, while
 * the same question on the advisor page behaved properly.
 */
export function useAdvisorChat({ onConversationStarted }: Options = {}) {
  const [messages, setMessages] = useState<AdvisorChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // A ref as well as state: send() reads it synchronously when queueing the
  // next turn, before React has re-rendered with the new id.
  const conversationIdRef = useRef<string | null>(null);
  const lastQuestionRef = useRef<string | null>(null);

  const setConversation = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  const send = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message) return;

      lastQuestionRef.current = message;
      setIsLoading(true);

      let assistantIndex = -1;
      setMessages((prev) => {
        assistantIndex = prev.length + 1;
        return [
          ...prev,
          { role: 'user', content: message },
          // Placeholder the deltas append into, so tokens appear as they
          // arrive rather than after the whole answer is generated.
          { role: 'assistant', content: '', isStreaming: true },
        ];
      });

      const patch = (changes: Partial<AdvisorChatMessage>) => {
        setMessages((prev) => prev.map((m, i) => (i === assistantIndex ? { ...m, ...changes } : m)));
      };

      await streamAdvisorChat(
        { message, conversationId: conversationIdRef.current },
        {
          onStart: ({ conversationId: id, structuredData, confidence }) => {
            // Adopt the id immediately: without it the next message would be
            // sent with a null id and silently open a second conversation.
            if (!conversationIdRef.current) {
              setConversation(id);
              onConversationStarted?.(id);
            }
            patch({ structuredData, confidence });
          },
          onDelta: (text) => {
            setMessages((prev) =>
              prev.map((m, i) => (i === assistantIndex ? { ...m, content: m.content + text } : m)),
            );
          },
          onDone: ({ messageId, structuredData, confidence }) => {
            patch({ id: messageId, structuredData, confidence, isStreaming: false });
          },
          onError: (error) => {
            // Rendered as an error, never as an assistant reply: an outage
            // must not read as financial advice.
            patch({ content: error, isError: true, isStreaming: false });
          },
        },
      );

      setIsLoading(false);
    },
    [onConversationStarted, setConversation],
  );

  /** Re-asks the last question, discarding the failed exchange. */
  const retry = useCallback(() => {
    const question = lastQuestionRef.current;
    if (!question) return;
    setMessages((prev) => prev.slice(0, -2));
    void send(question);
  }, [send]);

  return {
    messages,
    setMessages,
    isLoading,
    conversationId,
    setConversation,
    send,
    retry,
  };
}
