// @vitest-environment happy-dom
// @ts-nocheck
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DatabasePanel from './DatabasePanel';

const fullApp = {
  id: 'fs1',
  name: 'FullStack',
  description: '',
  createdAt: new Date().toISOString(),
  appType: 'fullstack' as const,
  dbProvider: 'mysql' as const,
};

const pgApp = { ...fullApp, id: 'pg1', dbProvider: 'postgresql' as const };

const simpleSchema = {
  tables: [
    { name: 'User', columns: ['id', 'name', 'email'] },
    { name: 'Post', columns: ['id', 'title', 'body'] },
  ],
};

describe('DatabasePanel', () => {
  beforeEach(() => {
    (window as any).deyad = {
      dbDescribe: vi.fn().mockResolvedValue(simpleSchema),
    };
  });

  afterEach(() => cleanup());

  it('shows message for non-fullstack app', () => {
    render(<DatabasePanel app={{ ...fullApp, appType: 'frontend' }} dbStatus="none" />);
    expect(screen.getByText(/only for full-stack apps/i)).toBeTruthy();
  });

  it('shows placeholder when DB stopped (mysql)', () => {
    render(<DatabasePanel app={fullApp} dbStatus="stopped" />);
    expect(screen.getByText(/start the database/i)).toBeTruthy();
  });

  it('shows placeholder when DB stopped (postgresql)', () => {
    render(<DatabasePanel app={pgApp} dbStatus="stopped" />);
    expect(screen.getByText(/start the database/i)).toBeTruthy();
  });

  it('renders iframe when DB is running (mysql)', () => {
    const { container } = render(<DatabasePanel app={fullApp} dbStatus="running" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.src).toContain('8080');
  });

  it('renders iframe when DB is running (postgresql)', () => {
    const { container } = render(<DatabasePanel app={pgApp} dbStatus="running" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.src).toContain('5050');
  });

  it('switches to schema view and shows tables', async () => {
    const { container } = render(<DatabasePanel app={fullApp} dbStatus="running" />);
    const schemaBtn = container.querySelector('.db-toolbar-tab:nth-child(2)');
    fireEvent.click(schemaBtn!);
    expect(await screen.findByText('User')).toBeTruthy();
    expect(screen.getByText('Post')).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});