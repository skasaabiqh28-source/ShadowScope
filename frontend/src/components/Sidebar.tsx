import React from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  PlayCircle,
  Activity,
  AlertTriangle,
  GitBranch,
  FileCode2,
  History,
  GitCompare,
  FileText,
  Bot,
  FlaskConical,
  Settings as SettingsIcon,
} from 'lucide-react';

interface Props {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Sidebar: React.FC<Props> = ({ currentRoute, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-scan', label: 'New Security Scan', icon: PlayCircle },
    { id: 'monitor', label: 'Scan Monitor', icon: Activity },
    { id: 'findings', label: 'Findings', icon: AlertTriangle },
    { id: 'attack-paths', label: 'Attack Paths', icon: GitBranch },
    { id: 'api-security', label: 'API Security', icon: FileCode2 },
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'compare', label: 'Compare Scans', icon: GitCompare },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'assistant', label: 'Security Assistant', icon: Bot },
    { id: 'labs', label: 'Training Labs', icon: FlaskConical },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-[#0d121c] border-r border-[#1a2333] flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1a2333] bg-[#0d121c]">
        <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm text-gray-100 leading-tight">ShadowScope AI</div>
          <div className="text-[10px] text-blue-400 font-mono tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            STRIX ENGINE
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id || (item.id === 'monitor' && currentRoute.startsWith('scans/'));

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#141b29]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1a2333] text-xs text-gray-400 bg-[#0a0d14]/50">
        <div className="flex justify-between items-center mb-1">
          <span>Strix Version:</span>
          <span className="font-mono text-gray-300">1.6.2</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Target Mode:</span>
          <span className="text-emerald-400 font-medium">Authorized</span>
        </div>
      </div>
    </aside>
  );
};
