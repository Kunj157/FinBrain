/**
 * Client for the advisor's server-sent-events chat endpoint.
 *
 * `fetch` is used rather than `EventSource` because the request must be a POST
 * carrying a JSON body and an Authorization header, neither of which
 * EventSource supports.
 */
import { getAuthToken } from '@/lib/api';

export interface StreamHandlers {
  /** Fired once, before any content, carrying the conversation id. */
  onStart?: (data: {
    conversationId: string;
    structuredData?: Record<string, unknown>;
    /** How much data the answer rests on: 'low' | 'medium' | 'high'. */
    confidence?: string;
  }) => void;
  onDelta?: (text: string) => void;
  onDone?: (data: {
    messageId: string;
    conversationId: string;
    structuredData?: Record<string, unknown>;
    confidence?: string;
  }) => void;
  /** Fired instead of onDone when the turn could not be completed. */
  onError?: (message: string) => void;
}

interface StreamRequest {
  message: string;
  conversationId: string | null;
  signal?: AbortSignal;
}

const GENERIC_FAILURE = 'The advisor is unavailable right now. Please try again.';

export async function streamAdvisorChat(
  { message, conversationId, signal }: StreamRequest,
  handlers: StreamHandlers,
): Promise<void> {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
  const token = await getAuthToken();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/advisor/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, conversationId }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') return;
    handlers.onError?.(GENERIC_FAILURE);
    return;
  }

  if (!response.ok || !response.body) {
    // Failures before the stream opens still arrive as ordinary JSON.
    const detail = await response
      .json()
      .then((body) => body?.error as string | undefined)
      .catch(() => undefined);
    handlers.onError?.(detail || GENERIC_FAILURE);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line; a trailing partial frame stays
      // in the buffer until the rest of it arrives.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        let event = 'message';
        let data = '';

        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }

        if (!data) continue;

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }

        if (event === 'start') {
          handlers.onStart?.(payload as never);
        } else if (event === 'delta') {
          handlers.onDelta?.(String(payload.content ?? ''));
        } else if (event === 'done') {
          handlers.onDone?.(payload as never);
          return;
        } else if (event === 'error') {
          handlers.onError?.(String(payload.error || GENERIC_FAILURE));
          return;
        }
      }
    }

    // The stream closed without a terminal frame — treat a truncated answer as
    // a failure rather than presenting it as complete advice.
    handlers.onError?.(GENERIC_FAILURE);
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') return;
    handlers.onError?.(GENERIC_FAILURE);
  } finally {
    await reader.cancel().catch(() => {});
  }
}
