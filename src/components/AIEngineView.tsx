import React, { useState } from 'react';
import { Cpu, Server, Zap, CheckCircle2, AlertCircle, RefreshCw, Trash2, Download, ShieldCheck } from 'lucide-react';
import { AIProviderConfig, AIExecutionLog, AIProviderType } from '../types';

interface AIEngineViewProps {
  config: AIProviderConfig;
  onUpdateConfig: (newConfig: AIProviderConfig) => void;
  logs: AIExecutionLog[];
  onClearLogs: () => void;
  onLogExecution: (log: AIExecutionLog) => void;
}

export const AIEngineView: React.FC<AIEngineViewProps> = ({
  config,
  onUpdateConfig,
  logs,
  onClearLogs,
  onLogExecution,
}) => {
  const [testingProvider, setTestingProvider] = useState<AIProviderType | null>(null);
  const [testResult, setTestResult] = useState<{
    provider: string;
    success: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const [localConfig, setLocalConfig] = useState<AIProviderConfig>(config);
  const [envStatus, setEnvStatus] = useState<{
    geminiKeyLoaded: boolean;
    groqKeyLoaded: boolean;
    openaiKeyLoaded: boolean;
    defaultProvider: string;
  }>({
    geminiKeyLoaded: false,
    groqKeyLoaded: false,
    openaiKeyLoaded: false,
    defaultProvider: 'gemini',
  });

  const checkHealth = () => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.env) {
          setEnvStatus(data.env);
        }
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    checkHealth();
  }, []);

  const handleSaveConfig = () => {
    onUpdateConfig(localConfig);
  };

  const handleTestConnection = async (targetProvider: AIProviderType) => {
    setTestingProvider(targetProvider);
    setTestResult(null);
    const startTime = Date.now();

    try {
      // If testing Ollama, first attempt direct browser check to see if local machine has Ollama running
      if (targetProvider === 'ollama') {
        try {
          const directController = new AbortController();
          const directTimeout = setTimeout(() => directController.abort(), 2000);
          const directResp = await fetch(`${localConfig.ollamaUrl}/api/tags`, {
            signal: directController.signal,
          });
          clearTimeout(directTimeout);
          if (directResp.ok) {
            const directData = await directResp.json();
            const models = (directData.models || []).map((m: any) => m.name).join(', ') || 'none found';
            const latency = Date.now() - startTime;
            setTestResult({
              provider: 'ollama',
              success: true,
              latencyMs: latency,
              message: `Connected directly from your browser to local Ollama! Available models: ${models}`,
            });
            setTestingProvider(null);
            return;
          }
        } catch (directErr: any) {
          // Direct browser fetch failed (likely CORS or Ollama not running)
          console.warn('Direct browser Ollama check failed, trying server proxy:', directErr);
        }
      }

      const response = await fetch('/api/ai/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetProvider,
          ollamaUrl: localConfig.ollamaUrl,
          ollamaModel: localConfig.ollamaModel,
          groqApiKey: localConfig.groqApiKey,
          groqModel: localConfig.groqModel,
          openaiApiKey: localConfig.openaiApiKey,
          openaiModel: localConfig.openaiModel,
        }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {
          success: false,
          error: `Server returned non-JSON response (${response.status}): ${rawText.slice(0, 150)}`,
        };
      }

      const log: AIExecutionLog = {
        id: `log_test_${Date.now()}`,
        timestamp: new Date().toISOString(),
        provider: targetProvider,
        model: targetProvider === 'gemini' ? localConfig.geminiModel : localConfig.ollamaModel,
        task: 'connectivity_test',
        latencyMs: data.latencyMs || 0,
        inputTokens: 10,
        outputTokens: 5,
        schemaValid: Boolean(data.success),
        retryCount: 0,
        status: data.success ? 'completed' : 'failed',
        error: data.error,
      };
      onLogExecution(log);

      setTestResult({
        provider: targetProvider,
        success: Boolean(data.success),
        latencyMs: data.latencyMs,
        message: data.message,
        error: data.error,
      });
    } catch (err: any) {
      setTestResult({
        provider: targetProvider,
        success: false,
        error: err.message || 'Connection test failed',
      });
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Multi-Provider AI Extraction Engine
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Provider-agnostic inference layer. Seamlessly switch between local Ollama and cloud providers without pipeline alteration.
        </p>
      </div>

      {/* Active Provider Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gemini */}
        <div
          onClick={() => {
            setLocalConfig({ ...localConfig, activeProvider: 'gemini' });
            onUpdateConfig({ ...localConfig, activeProvider: 'gemini' });
          }}
          className={`p-4 border rounded cursor-pointer transition-all ${
            localConfig.activeProvider === 'gemini'
              ? 'border-slate-900 bg-white ring-1 ring-slate-900'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
              Google Gemini
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Available
            </span>
          </div>
          <div className="text-xs font-mono text-slate-600 mt-2">
            gemini-3.8-flash
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Fast, zero-config server-proxied extraction with strict JSON schema validation.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTestConnection('gemini');
            }}
            disabled={testingProvider === 'gemini'}
            className="mt-3 text-[11px] font-medium text-slate-900 hover:underline cursor-pointer flex items-center gap-1"
          >
            {testingProvider === 'gemini' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Test Connection'}
          </button>
        </div>

        {/* Ollama */}
        <div
          onClick={() => {
            setLocalConfig({ ...localConfig, activeProvider: 'ollama' });
            onUpdateConfig({ ...localConfig, activeProvider: 'ollama' });
          }}
          className={`p-4 border rounded cursor-pointer transition-all ${
            localConfig.activeProvider === 'ollama'
              ? 'border-slate-900 bg-white ring-1 ring-slate-900'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
              Ollama (Local)
            </span>
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Localhost:11434
            </span>
          </div>
          <div className="text-xs font-mono text-slate-600 mt-2">
            {localConfig.ollamaModel}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Completely private local GPU inference. No resume leaves your machine.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTestConnection('ollama');
            }}
            disabled={testingProvider === 'ollama'}
            className="mt-3 text-[11px] font-medium text-slate-900 hover:underline cursor-pointer flex items-center gap-1"
          >
            {testingProvider === 'ollama' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Test Connection'}
          </button>
        </div>

        {/* Groq Cloud */}
        <div
          onClick={() => {
            setLocalConfig({ ...localConfig, activeProvider: 'groq' });
            onUpdateConfig({ ...localConfig, activeProvider: 'groq' });
          }}
          className={`p-4 border rounded cursor-pointer transition-all ${
            localConfig.activeProvider === 'groq'
              ? 'border-slate-900 bg-white ring-1 ring-slate-900'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
              Groq Cloud
            </span>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              High Speed LPU
            </span>
          </div>
          <div className="text-xs font-mono text-slate-600 mt-2">
            {localConfig.groqModel}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ultra-fast cloud inference on Groq LPUs with OpenAI-compatible endpoint.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTestConnection('groq');
            }}
            disabled={testingProvider === 'groq'}
            className="mt-3 text-[11px] font-medium text-slate-900 hover:underline cursor-pointer flex items-center gap-1"
          >
            {testingProvider === 'groq' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Test Connection'}
          </button>
        </div>

        {/* OpenAI */}
        <div
          onClick={() => {
            setLocalConfig({ ...localConfig, activeProvider: 'openai' });
            onUpdateConfig({ ...localConfig, activeProvider: 'openai' });
          }}
          className={`p-4 border rounded cursor-pointer transition-all ${
            localConfig.activeProvider === 'openai'
              ? 'border-slate-900 bg-white ring-1 ring-slate-900'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
              OpenAI
            </span>
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Cloud
            </span>
          </div>
          <div className="text-xs font-mono text-slate-600 mt-2">
            {localConfig.openaiModel}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Optional cloud fallback using OpenAI standard chat completion API.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTestConnection('openai');
            }}
            disabled={testingProvider === 'openai'}
            className="mt-3 text-[11px] font-medium text-slate-900 hover:underline cursor-pointer flex items-center gap-1"
          >
            {testingProvider === 'openai' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Connectivity Test Feedback */}
      {testResult && (
        <div
          className={`p-4 rounded border text-xs flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="font-bold uppercase font-mono">
              {testResult.provider} Test: {testResult.success ? 'Operational' : 'Unavailable'}
              {testResult.latencyMs && ` (${testResult.latencyMs}ms)`}
            </div>
            <p>{testResult.message || testResult.error}</p>
          </div>
        </div>
      )}

      {/* Environment Variables (.env) Status Card */}
      <div className="bg-white border border-slate-200 rounded p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Backend Environment (.env) Variables</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              API credentials loaded server-side from your <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">.env</code> file. Keys are kept confidential on the backend and never exposed to the client bundle.
            </p>
          </div>
          <button
            onClick={checkHealth}
            className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-check .env
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          {/* Gemini Env */}
          <div className="p-3 border rounded bg-slate-50 border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">GEMINI_API_KEY</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
                envStatus.geminiKeyLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {envStatus.geminiKeyLoaded ? 'Loaded' : 'Not Set'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              Google AI Studio runtime key
            </div>
          </div>

          {/* Groq Env */}
          <div className="p-3 border rounded bg-slate-50 border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">GROQ_API_KEY</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
                envStatus.groqKeyLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {envStatus.groqKeyLoaded ? 'Loaded' : 'Not Set'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              Groq Cloud LPU access key
            </div>
          </div>

          {/* OpenAI Env */}
          <div className="p-3 border rounded bg-slate-50 border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">OPENAI_API_KEY</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
                envStatus.openaiKeyLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {envStatus.openaiKeyLoaded ? 'Loaded' : 'Not Set'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              OpenAI standard completions key
            </div>
          </div>
        </div>

        {/* .env File Format Tip */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
          <div className="font-semibold text-slate-800">
            How to configure keys in .env:
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Add your keys to the project <code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded">.env</code> file (or configure them in AI Studio Secrets):
          </p>
          <pre className="font-mono text-[11px] bg-slate-900 text-slate-100 p-2.5 rounded overflow-x-auto select-all leading-normal">
{`GEMINI_API_KEY="AIzaSy..."
GROQ_API_KEY="gsk_..."
GROQ_MODEL="llama-3.3-70b-versatile"
OPENAI_API_KEY="sk-..."
OLLAMA_BASE_URL="http://localhost:11434"`}
          </pre>
        </div>
      </div>

      {/* Provider Parameters Configuration */}
      <div className="bg-white border border-slate-200 rounded p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Active Model & Endpoint Calibration</h3>
        <p className="text-xs text-slate-500">
          Configure preferred model names and local Ollama endpoint.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Local Ollama Base URL</label>
            <input
              type="text"
              value={localConfig.ollamaUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, ollamaUrl: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-medium mb-1">Ollama Model</label>
            <input
              type="text"
              value={localConfig.ollamaModel}
              onChange={(e) => setLocalConfig({ ...localConfig, ollamaModel: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Groq Model Identifier</label>
            <input
              type="text"
              value={localConfig.groqModel}
              onChange={(e) => setLocalConfig({ ...localConfig, groqModel: e.target.value })}
              placeholder="llama-3.3-70b-versatile or openai/gpt-oss-20b"
              className="w-full p-2 border border-slate-300 rounded font-mono"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                { name: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recommended)' },
                { name: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
                { name: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
              ].map(m => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setLocalConfig({ ...localConfig, groqModel: m.name })}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    localConfig.groqModel === m.name
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-slate-700 font-medium mb-1">OpenAI Model Identifier</label>
            <input
              type="text"
              value={localConfig.openaiModel}
              onChange={(e) => setLocalConfig({ ...localConfig, openaiModel: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full p-2 border border-slate-300 rounded font-mono"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSaveConfig}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Apply Provider Settings
          </button>
        </div>
      </div>

      {/* AI Execution Telemetry Logs */}
      <div className="bg-white border border-slate-200 rounded">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              AI Execution Logs & Telemetry
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recorded inference metrics (latency, token consumption, schema validity) for benchmarking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="text-xs text-slate-600 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Logs
              </button>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No execution logs recorded yet. Run a resume extraction or connection test to log telemetry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Task</th>
                  <th className="py-2.5 px-4 font-medium">Provider</th>
                  <th className="py-2.5 px-4 font-medium">Model</th>
                  <th className="py-2.5 px-4 font-medium text-right">Latency</th>
                  <th className="py-2.5 px-4 font-medium text-right">Tokens (In/Out)</th>
                  <th className="py-2.5 px-4 font-medium">Schema Valid</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-900 font-medium">
                      {log.task.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-slate-700">
                      {log.provider}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.model}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-900 font-semibold">
                      {log.latencyMs}ms
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">
                      {log.inputTokens} / {log.outputTokens}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={log.schemaValid ? 'text-emerald-700' : 'text-rose-700'}>
                        {log.schemaValid ? 'valid' : 'invalid'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={log.status === 'completed' ? 'text-emerald-700' : 'text-rose-700'}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
