/**
 * Single entry point for every LLM call in the API.
 *
 * Both chat routes previously inlined their own `fetch` to an
 * OpenAI-compatible endpoint with no timeout, no retry and no cancellation,
 * so a hung provider hung the request until the platform killed the socket,
 * and a transient 503 surfaced to the user as a dead end.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmConfig {
  provider: 'groq' | 'openai';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('AI service not configured. Set GROQ_API_KEY or OPENAI_API_KEY in apps/api/.env');
    this.name = 'LlmNotConfiguredError';
  }
}

/** Raised when the provider could not produce a completion. */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** True when the caller may reasonably retry the same request later. */
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

// Groq retired llama-3.1-8b-instant; requests for it now 404. gpt-oss-120b is
// the strongest general model currently served there, and an 8B model was in
// any case a poor fit for reasoning about someone's finances.
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

const REQUEST_TIMEOUT_MS = 60_000;
const STREAM_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 3;

export function getLlmConfig(): LlmConfig | null {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      provider: 'groq',
      apiKey: groqKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      baseUrl: 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    };
  }

  return null;
}

export function isLlmConfigured(): boolean {
  return getLlmConfig() !== null;
}

/** 429 and 5xx are transient; other 4xx mean the request itself is wrong. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Exponential backoff with jitter, so a burst of failed requests does not
// retry in lockstep and re-stampede the provider.
function backoffDelay(attempt: number): number {
  const base = 400 * 2 ** (attempt - 1);
  return base + Math.floor(Math.random() * 250);
}

interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  /** Aborts the upstream request when the client disconnects. */
  signal?: AbortSignal;
}

async function postCompletion(
  config: LlmConfig,
  body: Record<string, unknown>,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  let lastError: LlmError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // A fresh controller per attempt; aborting one must not poison the next.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) {
        clearTimeout(timer);
        externalSignal?.removeEventListener('abort', onExternalAbort);
        return response;
      }

      const detail = await response.text().catch(() => '');
      const retryable = isRetryableStatus(response.status);
      lastError = new LlmError(
        `Provider returned ${response.status}: ${detail.slice(0, 300)}`,
        response.status,
        retryable,
      );

      if (!retryable) throw lastError;
    } catch (error) {
      if (error instanceof LlmError) throw error;

      // The caller gave up (client disconnected) — do not keep retrying.
      if (externalSignal?.aborted) {
        throw new LlmError('Request cancelled', undefined, false);
      }

      const aborted = error instanceof Error && error.name === 'AbortError';
      lastError = aborted
        ? new LlmError(`Provider timed out after ${timeoutMs}ms`, 408, true)
        : new LlmError(`Could not reach the provider: ${(error as Error).message}`, undefined, true);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }

    if (attempt < MAX_ATTEMPTS) await sleep(backoffDelay(attempt));
  }

  throw lastError ?? new LlmError('Could not reach the provider', undefined, true);
}

export interface CompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

interface CompletionResponse {
  choices: Array<{ message: { content: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {},
): Promise<CompletionResult> {
  const config = getLlmConfig();
  if (!config) throw new LlmNotConfiguredError();

  const response = await postCompletion(
    config,
    {
      model: config.model,
      messages,
      // Reasoning models spend part of this budget on hidden reasoning
      // tokens before emitting any visible content, so the ceiling has to
      // sit well above the length of the answer we actually want.
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.4,
    },
    REQUEST_TIMEOUT_MS,
    options.signal,
  );

  const data = (await response.json()) as CompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new LlmError('Provider returned an empty completion', undefined, true);
  }

  return {
    content,
    model: config.model,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

/**
 * Yields content deltas as they arrive so the UI can render tokens instead of
 * holding a spinner for the whole generation.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {},
): AsyncGenerator<string, void, undefined> {
  const config = getLlmConfig();
  if (!config) throw new LlmNotConfiguredError();

  const response = await postCompletion(
    config,
    {
      model: config.model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.4,
      stream: true,
    },
    STREAM_TIMEOUT_MS,
    options.signal,
  );

  if (!response.body) {
    throw new LlmError('Provider returned no stream body', undefined, true);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are newline-delimited; the last fragment may be partial so
      // it stays in the buffer until its terminator arrives.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // A malformed frame is not worth aborting a good stream over.
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
