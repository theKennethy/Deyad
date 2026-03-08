// @vitest-environment jsdom
// @ts-nocheck
/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('App component', () => {
  beforeEach(() => {
    // clear any persisted widths
    localStorage.clear();
    // provide a minimal deyad API stub to avoid undefined errors
    (window as any).deyad = {
      listApps: vi.fn().mockResolvedValue([]),
      createApp: vi.fn(),
      readFiles: vi.fn().mockResolvedValue({}),
      writeFiles: vi.fn(),
      hasSnapshot: vi.fn().mockResolvedValue(false),
      dbStatus: vi.fn().mockResolvedValue({ status: 'none' }),
      onDbStatus: vi.fn().mockReturnValue(() => {}),
      onAppDevLog: vi.fn().mockReturnValue(() => {}),
      onAppDevStatus: vi.fn().mockReturnValue(() => {}),
      checkDocker: vi.fn(),
      getSettings: vi.fn().mockResolvedValue({ ollamaHost: '', defaultModel: '' }),
      listModels: vi.fn().mockResolvedValue({ models: [] }),
      andThen: undefined,
      createTerminal: vi.fn().mockResolvedValue('term1'),
      terminalWrite: vi.fn(),
      terminalResize: vi.fn(),
      onTerminalData: vi.fn().mockReturnValue(() => {}),
      onTerminalExit: vi.fn().mockReturnValue(() => {}),
      // other stubs may be needed but App won't call them in tests
    } as any;
  });

  it('initializes sidebar and right panel widths from localStorage', () => {
    localStorage.setItem('sidebarWidth', '300');
    localStorage.setItem('rightWidth', '500');

    const { container } = render(<App />);
    const sidebar = container.querySelector('.sidebar');
    const right = container.querySelector('.right-panel');

    expect(sidebar).toHaveStyle('width: 300px');
    expect(right).toHaveStyle('width: 500px');
  });

  it('falls back to defaults when storage is empty or invalid', () => {
    localStorage.setItem('sidebarWidth', 'not-a-number');
    localStorage.setItem('rightWidth', '');

    const { container } = render(<App />);
    const sidebar = container.querySelector('.sidebar');
    const right = container.querySelector('.right-panel');

    // defaults hard-coded in component
    expect(sidebar).toHaveStyle('width: 220px');
    expect(right).toHaveStyle('width: 340px');
  });

  it('allows sidebar to be resized by dragging the resizer', () => {
    const { container } = render(<App />);
    const sidebar = container.querySelector('.sidebar');
    const resizer = container.querySelector('.resizer[data-side="sidebar"]');
    expect(resizer).not.toBeNull();

    // simulate drag from x=0 to x=100
    fireEvent.mouseDown(resizer!, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 100 });
    fireEvent.mouseUp(window);

    // width should increase by dx (default 220 + 100)
    expect(sidebar).toHaveStyle('width: 320px');
    expect(localStorage.getItem('sidebarWidth')).toBe('320');
  });

  it('allows right panel to be resized by dragging the resizer', () => {
    const { container } = render(<App />);
    const right = container.querySelector('.right-panel');
    const resizer = container.querySelector('.resizer[data-side="right"]');
    expect(resizer).not.toBeNull();

    // simulate drag from x=200 to x=100 (shrinking right by 100)
    fireEvent.mouseDown(resizer!, { clientX: 200 });
    fireEvent.mouseMove(window, { clientX: 100 });
    fireEvent.mouseUp(window);

    // right width should be initial 340 - 100 = 240
    expect(right).toHaveStyle('width: 240px');
    expect(localStorage.getItem('rightWidth')).toBe('240');
  });

  it('shows terminal tab and switches to it', async () => {
    const { getByText, container } = render(<App />);
    const termBtn = getByText('Terminal');
    expect(termBtn).toBeInTheDocument();

    fireEvent.click(termBtn);
    // terminal panel should appear
    expect(container.querySelector('.terminal-panel')).toBeInTheDocument();
  });
});
