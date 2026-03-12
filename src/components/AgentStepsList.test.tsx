// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import AgentStepsList from './AgentStepsList';

afterEach(cleanup);

describe('AgentStepsList', () => {
  it('renders header', () => {
    render(<AgentStepsList steps={[]} />);
    expect(screen.getByText('Agent Actions')).toBeTruthy();
  });

  it('renders tool steps with wrench icon', () => {
    render(<AgentStepsList steps={[{ type: 'tool', text: 'Running write_files' }]} />);
    expect(screen.getByText('Running write_files')).toBeTruthy();
    expect(screen.getByText('🔧')).toBeTruthy();
  });

  it('renders result steps with clipboard icon', () => {
    render(<AgentStepsList steps={[{ type: 'result', text: 'Wrote 3 files' }]} />);
    expect(screen.getByText('Wrote 3 files')).toBeTruthy();
    expect(screen.getByText('📋')).toBeTruthy();
  });

  it('renders multiple steps in order', () => {
    const steps = [
      { type: 'tool' as const, text: 'Step 1' },
      { type: 'result' as const, text: 'Step 2' },
      { type: 'tool' as const, text: 'Step 3' },
    ];
    const { container } = render(<AgentStepsList steps={steps} />);
    const stepEls = container.querySelectorAll('.agent-step');
    expect(stepEls.length).toBe(3);
  });

  it('renders empty when no steps', () => {
    const { container } = render(<AgentStepsList steps={[]} />);
    expect(container.querySelectorAll('.agent-step').length).toBe(0);
  });
});
