import api from './api';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const response = await api.post('/ai/chat', { message, history });
  return response.data.data.reply;
}

export async function getFinancialContext() {
  const response = await api.get('/ai/context');
  return response.data.data;
}
