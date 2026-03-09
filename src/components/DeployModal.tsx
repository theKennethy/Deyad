import { useState, useEffect, useRef } from 'react';

interface Props {
  appId: string;
  appName: string;
  appType: 'frontend' | 'fullstack';
  onClose: () => void;
}

type FrontendProvider = 'netlify' | 'vercel' | 'surge';
type FullstackProvider = 'railway' | 'flyio';
type Provider = FrontendProvider | FullstackProvider;

interface ProviderInfo {
  id: Provider;
  name: string;
  desc: string;
  type: 'frontend' | 'fullstack' | 'both';
}

const PROVIDERS: ProviderInfo[] = [
  { id: 'vercel', name: 'Vercel', desc: 'Best for frontend apps. Free tier.', type: 'both' },
  { id: 'netlify', name: 'Netlify', desc: 'Great for static sites & SPAs. Free tier.', type: 'both' },
  { id: 'surge', name: 'Surge', desc: 'Simple static hosting. Free.', type: 'frontend' },
  { id: 'railway', name: 'Railway', desc: 'Full-stack deploy with DB. Usage-based pricing.', type: 'fullstack' },
  { id: 'flyio', name: 'Fly.io', desc: 'Container-based deploy. Free tier.', type: 'fullstack' },
];

export default function DeployModal({ appId, appName, appType, onClose }: Props) {
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [logs, setLogs] = useState('');
  const [result, setResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    checkCLIs();
    const unsub = window.deyad.onDeployLog(({ appId: id, data }) => {
      if (id === appId) {
        setLogs((prev) => prev + data);
      }
    });
    return unsub;
  }, [appId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const checkCLIs = async () => {
    setChecking(true);
    const checks = await window.deyad.deployCheck();
    setAvailable(checks);
    setChecking(false);
  };

  const filteredProviders = PROVIDERS.filter((p) => {
    if (appType === 'fullstack') return true; // show all
    return p.type === 'frontend' || p.type === 'both';
  });

  const handleDeploy = async () => {
    if (!selected) return;
    setDeploying(true);
    setLogs('');
    setResult(null);

    const isFullstackDeploy = selected === 'railway' || selected === 'flyio';

    const res = isFullstackDeploy
      ? await window.deyad.deployFullstack(appId, selected as FullstackProvider)
      : await window.deyad.deploy(appId, selected as FrontendProvider);

    setResult(res);
    setDeploying(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal deploy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Deploy {appName}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {checking ? (
            <div className="deploy-checking">Checking available deploy tools...</div>
          ) : (
            <>
              <p className="deploy-hint">
                Select a deployment provider. CLIs must be installed and authenticated.
              </p>

              <div className="deploy-providers">
                {filteredProviders.map((p) => {
                  const isAvailable = available[p.id] ?? false;
                  return (
                    <button
                      key={p.id}
                      className={`deploy-provider ${selected === p.id ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                      onClick={() => isAvailable && setSelected(p.id)}
                      disabled={deploying}
                    >
                      <div className="deploy-provider-name">
                        {p.name}
                        {!isAvailable && <span className="deploy-cli-missing">CLI not found</span>}
                        {isAvailable && <span className="deploy-cli-ready">Ready</span>}
                      </div>
                      <div className="deploy-provider-desc">{p.desc}</div>
                    </button>
                  );
                })}
              </div>

              {Object.values(available).every((v) => !v) && (
                <div className="deploy-install-hint">
                  No deploy CLIs detected. Install one:
                  <code>npm i -g vercel</code> or <code>npm i -g netlify-cli</code>
                </div>
              )}

              {logs && (
                <pre ref={logRef} className="deploy-logs">{logs}</pre>
              )}

              {result && (
                <div className={`deploy-result ${result.success ? 'success' : 'error'}`}>
                  {result.success ? (
                    <>
                      Deployed successfully!
                      {result.url && (
                        <button
                          className="deploy-url-btn"
                          onClick={() => navigator.clipboard.writeText(result.url!)}
                        >
                          {result.url} (click to copy)
                        </button>
                      )}
                    </>
                  ) : (
                    <>Deploy failed: {result.error}</>
                  )}
                </div>
              )}
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={deploying}>
              {result?.success ? 'Done' : 'Cancel'}
            </button>
            {!result?.success && (
              <button
                className="btn-primary btn-deploy"
                onClick={handleDeploy}
                disabled={!selected || deploying}
              >
                {deploying ? 'Deploying…' : 'Deploy Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
