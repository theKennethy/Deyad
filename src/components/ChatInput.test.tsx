// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ChatInput from './ChatInput';

afterEach(cleanup);

const baseProps = {
  input: '',
  setInput: vi.fn(),
  streaming: false,
  agentMode: false,
  imageAttachment: null,
  setImageAttachment: vi.fn(),
  onSend: vi.fn(),
  onImagePaste: vi.fn(),
};

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput {...baseProps} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByText('↑')).toBeTruthy();
  });

  it('shows lightning icon in agent mode', () => {
    render(<ChatInput {...baseProps} agentMode={true} />);
    expect(screen.getByText('⚡')).toBeTruthy();
  });

  it('calls onSend when send button clicked', () => {
    const onSend = vi.fn();
    render(<ChatInput {...baseProps} input="hello" onSend={onSend} />);
    fireEvent.click(screen.getByText('↑'));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it('disables textarea when streaming', () => {
    render(<ChatInput {...baseProps} streaming={true} />);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('disables send button when input is empty', () => {
    render(<ChatInput {...baseProps} input="" />);
    const btn = screen.getByText('↑') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows image preview when attachment exists', () => {
    render(<ChatInput {...baseProps} imageAttachment="data:image/png;base64,abc" />);
    expect(screen.getByAltText('Attached')).toBeTruthy();
  });

  it('calls setImageAttachment(null) when removing image', () => {
    const setImage = vi.fn();
    render(<ChatInput {...baseProps} imageAttachment="data:image/png;base64,abc" setImageAttachment={setImage} />);
    fireEvent.click(screen.getByText('✕'));
    expect(setImage).toHaveBeenCalledWith(null);
  });

  it('calls setInput on textarea change', () => {
    const setInput = vi.fn();
    render(<ChatInput {...baseProps} setInput={setInput} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(setInput).toHaveBeenCalledWith('test');
  });

  it('shows attach image button', () => {
    render(<ChatInput {...baseProps} />);
    expect(screen.getByTitle(/Attach image/i)).toBeTruthy();
  });
});
