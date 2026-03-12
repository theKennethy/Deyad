// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MessageList from './MessageList';

afterEach(cleanup);

const sampleMessages = [
  { id: '1', role: 'user' as const, content: 'Hello world' },
  { id: '2', role: 'assistant' as const, content: 'Hi there! How can I help?', model: 'llama3' },
  { id: '3', role: 'assistant' as const, content: 'Here are the files', filesGenerated: ['src/App.tsx', 'src/index.css'] },
];

describe('MessageList', () => {
  it('renders user and assistant messages', () => {
    render(
      <MessageList messages={sampleMessages} pendingPlan={null} streaming={false} onApprovePlan={() => {}} onRejectPlan={() => {}} />,
    );
    expect(screen.getByText('Hello world')).toBeTruthy();
    expect(screen.getByText(/Hi there/)).toBeTruthy();
  });

  it('shows model badge for assistant messages', () => {
    render(
      <MessageList messages={sampleMessages} pendingPlan={null} streaming={false} onApprovePlan={() => {}} onRejectPlan={() => {}} />,
    );
    expect(screen.getByText('llama3')).toBeTruthy();
  });

  it('shows file chips for generated files', () => {
    render(
      <MessageList messages={sampleMessages} pendingPlan={null} streaming={false} onApprovePlan={() => {}} onRejectPlan={() => {}} />,
    );
    expect(screen.getByText('src/App.tsx')).toBeTruthy();
    expect(screen.getByText('src/index.css')).toBeTruthy();
  });

  it('shows plan approval buttons when pendingPlan matches', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const msgs = [{ id: '1', role: 'assistant' as const, content: 'Plan: do stuff' }];
    render(
      <MessageList messages={msgs} pendingPlan="Plan: do stuff" streaming={false} onApprovePlan={onApprove} onRejectPlan={onReject} />,
    );
    const approveBtn = screen.getByText(/Approve/);
    const rejectBtn = screen.getByText(/Reject/);
    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledOnce();
    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('disables plan buttons when streaming', () => {
    const msgs = [{ id: '1', role: 'assistant' as const, content: 'Plan: do stuff' }];
    render(
      <MessageList messages={msgs} pendingPlan="Plan: do stuff" streaming={true} onApprovePlan={() => {}} onRejectPlan={() => {}} />,
    );
    expect((screen.getByText(/Approve/) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText(/Reject/) as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders empty when no messages', () => {
    const { container } = render(
      <MessageList messages={[]} pendingPlan={null} streaming={false} onApprovePlan={() => {}} onRejectPlan={() => {}} />,
    );
    expect(container.querySelectorAll('.message').length).toBe(0);
  });
});
