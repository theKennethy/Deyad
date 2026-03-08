// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App component', () => {
  beforeEach(() => {
    // clear any persisted widths
    localStorage.clear();
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
});
