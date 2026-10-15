import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatBubble } from './chat-bubble';

describe('ChatBubble', () => {
  it('shows a thinking state until the first token arrives', () => {
    render(<ChatBubble message={{ role: 'assistant', content: '', isStreaming: true }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Thinking');
    expect(screen.queryByText('Advisor')).not.toBeInTheDocument();
  });

  it('renders a failure as an alert with a retry, never as advice', () => {
    const onRetry = vi.fn();
    render(<ChatBubble message={{ role: 'assistant', content: 'Invalid input', isError: true }} onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("Couldn't get a response");
    expect(alert).not.toHaveTextContent('Advisor');
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('labels a finished reply as the advisor with its confidence', () => {
    render(<ChatBubble message={{ role: 'assistant', content: 'Save **more**', confidence: 'high' }} />);
    expect(screen.getByText('Advisor')).toBeInTheDocument();
    expect(screen.getByText('high confidence')).toBeInTheDocument();
  });
});
