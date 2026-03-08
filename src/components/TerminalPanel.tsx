import { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface Props {
  appId?: string;
}

export default function TerminalPanel({ appId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [termId, setTermId] = useState<string | null>(null);

  // initialise terminal once
  useEffect(() => {
    if (!containerRef.current) return;
    const term = new Terminal({ cursorBlink: true, fontSize: 13 });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const handleResize = () => {
      fit.fit();
      if (termId) {
        window.deyad.terminalResize(termId, term.cols, term.rows);
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
    };
  }, []);

  // create pty when terminal object ready
  useEffect(() => {
    if (termRef.current && !termId) {
      window.deyad.createTerminal(appId).then((id) => {
        setTermId(id);
      });
    }
  }, [appId, termId]);

  // wire data events
  useEffect(() => {
    if (!termId || !termRef.current) return;
    const term = termRef.current;
    const fit = fitRef.current!;

    const dataHandler = (payload: { id: string; data: string }) => {
      if (payload.id === termId) term.write(payload.data);
    };
    const exitHandler = (payload: { id: string; exitCode: number; signal: number }) => {
      if (payload.id === termId) {
        term.write(`\r\n
process exited (${payload.exitCode})\r\n`);
      }
    };

    const termListener = (_: any, payload: { id: string; data: string }) => dataHandler(payload);
    const exitListener = (_: any, payload: { id: string; exitCode: number; signal: number }) => exitHandler(payload);
    window.deyad.onTerminalData(dataHandler);
    window.deyad.onTerminalExit(exitHandler);

    term.onData((d) => {
      window.deyad.terminalWrite(termId, d);
    });

    // initial resize
    fit.fit();
    window.deyad.terminalResize(termId, term.cols, term.rows);

    return () => {
      // remove listeners by returning cleanup functions from expose? already returned above but we didn't store them
    };
  }, [termId]);

  return <div className="terminal-panel" ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />;
}
