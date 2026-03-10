import { useState, useEffect } from 'react';

type AiProvider = 'ollama' | 'openai' | 'anthropic' | 'groq';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [defaultModel, setDefaultModel] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider>('ollama');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await window.deyad.getSettings();
    setOllamaHost(settings.ollamaHost);
    setDefaultModel(settings.defaultModel);
    setAiProvider((settings.aiProvider as AiProvider) || 'ollama');
    setOpenaiKey(settings.openaiKey || '');
    setAnthropicKey(settings.anthropicKey || '');
    setGroqKey(settings.groqKey || '');
    loadModels();
  };

  const loadModels = async () => {
    try {
      const { models: list } = await window.deyad.listModels();
      setModels(list.map((m) => m.name));
    } catch { /* not available */ }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await window.deyad.setSettings({
      ollamaHost: ollamaHost.trim(),
      defaultModel,
      aiProvider,
      openaiKey: openaiKey.trim(),
      anthropicKey: anthropicKey.trim(),
      groqKey: groqKey.trim(),
    });
    setSaving(false);
    setSaved(true);
    // Reload models for the new provider
    loadModels();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTestResult('testing');
    try {
      await window.deyad.setSettings({
        ollamaHost: ollamaHost.trim(),
        aiProvider,
        openaiKey: openaiKey.trim(),
        anthropicKey: anthropicKey.trim(),
        groqKey: groqKey.trim(),
      });
      const { models: list } = await window.deyad.listModels();
      setModels(list.map((m) => m.name));
      setTestResult('success');
    } catch {
      setTestResult('error');
    }
    setTimeout(() => setTestResult('idle'), 3000);
  };

  const handleProviderChange = async (p: AiProvider) => {
    setAiProvider(p);
    setDefaultModel('');
    // Save provider immediately so list-models uses the right one
    await window.deyad.setSettings({ aiProvider: p, openaiKey: openaiKey.trim(), anthropicKey: anthropicKey.trim(), groqKey: groqKey.trim() });
    try {
      const { models: list } = await window.deyad.listModels();
      setModels(list.map((m) => m.name));
      if (list.length > 0) setDefaultModel(list[0].name);
    } catch { setModels([]); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* AI Provider selector */}
          <div className="form-field">
            <label>AI Provider</label>
            <div className="provider-cards">
              {(['ollama', 'openai', 'anthropic', 'groq'] as AiProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`provider-card ${aiProvider === p ? 'selected' : ''}`}
                  onClick={() => handleProviderChange(p)}
                >
                  <span className="provider-name">
                    {p === 'ollama' ? '🦙 Ollama' : p === 'openai' ? '🤖 OpenAI' : p === 'anthropic' ? '🧠 Anthropic' : '⚡ Groq'}
                  </span>
                  <span className="provider-desc">
                    {p === 'ollama' ? 'Local (free)' : p === 'openai' ? 'GPT-4o' : p === 'anthropic' ? 'Claude' : 'Fast inference'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ollama host (only for ollama) */}
          {aiProvider === 'ollama' && (
            <div className="form-field">
              <label htmlFor="ollama-host">Ollama Host URL</label>
              <div className="settings-host-row">
                <input
                  id="ollama-host"
                  value={ollamaHost}
                  onChange={(e) => setOllamaHost(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <button className="btn-secondary btn-test" onClick={handleTest} disabled={testResult === 'testing'}>
                  {testResult === 'testing' ? 'Testing…' : testResult === 'success' ? 'Success' : testResult === 'error' ? 'Error' : 'Test'}
                </button>
              </div>
            </div>
          )}

          {/* API keys for cloud providers */}
          {aiProvider === 'openai' && (
            <div className="form-field">
              <label htmlFor="openai-key">OpenAI API Key</label>
              <input
                id="openai-key"
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          )}
          {aiProvider === 'anthropic' && (
            <div className="form-field">
              <label htmlFor="anthropic-key">Anthropic API Key</label>
              <input
                id="anthropic-key"
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
          )}
          {aiProvider === 'groq' && (
            <div className="form-field">
              <label htmlFor="groq-key">Groq API Key</label>
              <input
                id="groq-key"
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
              />
            </div>
          )}

          {/* Default model */}
          <div className="form-field">
            <label htmlFor="default-model">Default Model</label>
            <select
              id="default-model"
              className="model-select settings-model-select"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            >
              <option value="">Auto (use first available)</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
