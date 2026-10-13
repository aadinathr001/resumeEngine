import React from 'react';
import { Cpu, FileText, Briefcase, BarChart3, Settings, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AIProviderType } from '../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeProvider: AIProviderType;
  providerStatus: 'connected' | 'untested' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  activeProvider,
  providerStatus
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'resumes', label: 'Resumes' },
    { id: 'jobs', label: 'Job Library' },
    { id: 'matches', label: 'Match Analysis' },
    { id: 'ai-engine', label: 'AI Engine' },
    { id: 'benchmarks', label: 'Benchmarks' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        {/* Zone 1: Single element brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#overview"
            onClick={(e) => { e.preventDefault(); onSelectTab('overview'); }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            ResumeIQ
          </a>
          <span className="text-xs font-mono text-slate-400">v1.2</span>
        </div>

        {/* Zone 2: 4-6 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`transition-colors whitespace-nowrap cursor-pointer pb-0.5 ${
                  isActive
                    ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                    : 'hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action / status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span>Provider:</span>
            <span className="font-semibold uppercase text-slate-800">{activeProvider}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                providerStatus === 'connected'
                  ? 'text-emerald-700 font-medium'
                  : providerStatus === 'error'
                  ? 'text-rose-700 font-medium'
                  : 'text-slate-600'
              }
            >
              {providerStatus === 'connected' ? 'Ready' : providerStatus === 'error' ? 'Check' : 'Standby'}
            </span>
          </div>
          <button
            onClick={() => onSelectTab('matches')}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            Run Match
          </button>
        </div>
      </div>
    </header>
  );
};
