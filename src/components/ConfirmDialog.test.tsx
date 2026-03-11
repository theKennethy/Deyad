// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

afterEach(cleanup);

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Test" message="msg" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title, message, and buttons when open', () => {
    render(
      <ConfirmDialog open={true} title="Delete?" message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText('Delete?')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('uses custom button labels', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Export"
        message="Choose format"
        confirmLabel="Mobile"
        cancelLabel="ZIP"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('Mobile')).toBeTruthy();
    expect(screen.getByText('ZIP')).toBeTruthy();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open={true} title="T" message="M" onConfirm={onConfirm} onCancel={() => {}} />,
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open={true} title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when overlay is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog open={true} title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />,
    );
    // Click the overlay (outermost div)
    fireEvent.click(container.querySelector('.modal-overlay')!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onCancel when dialog body is clicked (stopPropagation)', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog open={true} title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />,
    );
    fireEvent.click(container.querySelector('.confirm-dialog')!);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
