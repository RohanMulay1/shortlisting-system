export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto animate-in">
      <div className="mb-8">
        <div className="text-xs text-zinc-400 font-medium mb-2">Settings</div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure scoring weights, API keys, and preferences.</p>
      </div>

      <div className="space-y-5">
        {/* API */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">API Configuration</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">OpenAI API Key</label>
              <input
                type="password"
                defaultValue="sk-proj-••••••••••••••••"
                className="w-full text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">Backend API URL</label>
              <input
                type="text"
                defaultValue="http://localhost:8000"
                className="w-full text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Scoring Weights */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Default Scoring Weights</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Skill Match", key: "skill_match", default: 0.5 },
              { label: "Skill Experience", key: "skill_exp", default: 0.3 },
              { label: "Total Experience", key: "total_exp", default: 0.15 },
              { label: "Bonus (Preferred)", key: "bonus", default: 0.05 },
            ].map(w => (
              <div key={w.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{w.label}</label>
                  <span className="text-xs font-mono text-zinc-600">{w.default}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} defaultValue={w.default} className="w-full accent-indigo-600" />
              </div>
            ))}
          </div>
        </div>

        <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  )
}
