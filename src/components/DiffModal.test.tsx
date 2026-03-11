// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DiffModal from './DiffModal';

afterEach(cleanup);

const oldFiles: Record<string, string> = {
  'src/App.tsx': 'const x = 1;\nconsole.log(x);\n',
};

const newFiles: Record<string, string> = {
  'src/App.tsx': 'const x = 2;\nconsole.log(x);\nconsole.log("added");\n',
  'src/utils.ts': 'export function hello() { return "hi"; }\n',
};

describe('DiffModal', () => {
  it('renders diff modal with file names', () => {
    render(<DiffModal oldFiles={oldFiles} newFiles={newFiles} onApply={() => {}} onReject={() => {}} />);
    expect(screen.getByText(/src\/App\.tsx/)).toBeTruthy();
    expect(screen.getByText(/src\/utils\.ts/)).toBeTruthy();
  });

  it('shows Review Changes heading', () => {
    render(<DiffModal oldFiles={oldFiles} newFiles={newFiles} onApply={() => {}} onReject={() => {}} />);
    expect(screen.getByText('Review Changes')).toBeTruthy();
  });

  it('calls onApply when Apply button is clicked', () => {
    const onApply = vi.fn();
    render(<DiffModal oldFiles={oldFiles} newFiles={newFiles} onApply={onApply} onReject={() => {}} />);
    fireEvent.click(screen.getByText(/Apply/));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('calls onReject when Reject button is clicked', () => {
    const onReject = vi.fn();
    render(<DiffModal oldFiles={oldFiles} newFiles={newFiles} onApply={() => {}} onReject={onReject} />);
    fireEvent.click(screen.getByText(/Reject/));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('handles all-new files (no old content)', () => {
    render(
      <DiffModal oldFiles={{}} newFiles={{ 'new.ts': 'hello' }} onApply={() => {}} onReject={() => {}} />,
    );
    expect(screen.getByText(/new\.ts/)).toBeTruthy();
  });

  it('handles empty diff', () => {
    const { container } = render(
      <DiffModal oldFiles={{}} newFiles={{}} onApply={() => {}} onReject={() => {}} />,
    );
    expect(container.innerHTML).toBeTruthy();
  });
});
