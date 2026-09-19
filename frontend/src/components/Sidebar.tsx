import React from 'react';
import {
  Terminal,
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
  X,
} from 'lucide-react';

interface Props {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentRoute,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard', num: '01', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'new-scan', num: '02', label: 'NEW_SCAN', icon: PlayCircle },
    { id: 'monitor', num: '03', label: 'MONITOR', icon: Activity },
    { id: 'findings', num: '04', label: 'FINDINGS', icon: AlertTriangle },
    { id: 'attack-paths', num: '05', label: 'ATTACK_PATHS', icon: GitBranch },
    { id: 'api-security', num: '06', label: 'API_SECURITY', icon: FileCode2 },
    { id: 'history', num: '07', label: 'SCAN_HISTORY', icon: History },
    { id: 'compare', num: '08', label: 'COMPARE_SCANS', icon: GitCompare },
    { id: 'reports', num: '09', label: 'AUDIT_REPORTS', icon: FileText },
    { id: 'assistant', num: '10', label: 'AI_ASSISTANT', icon: Bot },
    { id: 'labs', num: '11', label: 'TRAINING_LABS', icon: FlaskConical },
    { id: 'settings', num: '12', label: 'SETTINGS', icon: SettingsIcon },
  ];

  const content = (
    <div className="flex flex-col h-full select-none bg-black font-mono text-xs border-r border-[#1f521f]">
      {/* ASCII Brand Header */}
      <div className="p-3 border-b border-[#1f521f] bg-[#050c05]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#33ff00] animate-pulse" />
            <span className="font-bold text-[#33ff00] tracking-wider text-xs terminal-glow">
              SHADOWSCOPE // CLI
            </span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="md:hidden text-[#94a3b8] hover:text-[#ff3333]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-[10px] text-[#1f521f] mt-1 font-mono leading-tight">
          +-----------------------------+<br />
          | CORE: STRIX v1.6.2          |<br />
          | MODE: LLM_ORCHESTRATOR      |<br />
          +-----------------------------+
        </div>
      </div>

      {/* Navigation List */}
      <nav aria-label="Main Navigation" className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        <div className="px-2 py-1 text-[10px] text-[#1f521f] font-bold tracking-widest">
          // NAVIGATION_MENU
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.id ||
            (item.id === 'monitor' && currentRoute.startsWith('scans/')) ||
            (item.id === 'findings' && currentRoute.startsWith('findings/'));

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-mono transition-all duration-75 text-left ${
                isActive
                  ? 'bg-[#33ff00] text-black font-bold shadow-[0_0_10px_rgba(51,255,0,0.4)]'
                  : 'text-[#33ff00] hover:bg-[#0d220d] hover:border hover:border-[#33ff00]/60'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span className={isActive ? 'text-black' : 'text-[#1f521f]'}>
                  [{item.num}]
                </span>
                <span className="font-bold tracking-wider truncate">
                  {isActive ? `> ${item.label}` : item.label}
                </span>
              </div>
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-[#1f521f]'}`} />
            </button>
          );
        })}
      </nav>

      {/* Footer Terminal Telemetry */}
      <div className="p-3 border-t border-[#1f521f] bg-[#050c05] text-[10px] space-y-1">
        <div className="flex justify-between items-center text-[#94a3b8]">
          <span>STATUS:</span>
          <span className="text-[#33ff00] font-bold">[ONLINE]</span>
        </div>
        <div className="flex justify-between items-center text-[#94a3b8]">
          <span>SCOPE:</span>
          <span className="text-[#33ff00] font-bold">[AUTH_OK]</span>
        </div>
        <div className="pt-1 text-[#1f521f] text-[9px] flex items-center justify-between border-t border-[#1f521f]/40">
          <span>TTY: /dev/pts/0</span>
          <span className="cursor-block" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-black border-r border-[#1f521f] h-screen shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer Slide-over */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/85 transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
