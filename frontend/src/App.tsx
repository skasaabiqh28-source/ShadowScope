/**
 * Main Application Component and State-based Router.
 *
 * # State-based Navigation — lightweight router managing the active screen in component state without heavy external router dependencies.
 * # Layout Composition — combining the persistent Sidebar, Top Header, and dynamic content pane into a cohesive cybersecurity dashboard.
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { NewScan } from './pages/NewScan';
import { ScanMonitor } from './pages/ScanMonitor';
import { Findings } from './pages/Findings';
import { FindingDetail } from './pages/FindingDetail';
import { AttackPaths } from './pages/AttackPaths';
import { ApiSecurity } from './pages/ApiSecurity';
import { ScanHistory } from './pages/ScanHistory';
import { CompareScans } from './pages/CompareScans';
import { Reports } from './pages/Reports';
import { SecurityAssistant } from './pages/SecurityAssistant';
import { TrainingLabs } from './pages/TrainingLabs';
import { Settings } from './pages/Settings';
import { ProviderStatus } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [routeParam, setRouteParam] = useState<string | undefined>(undefined);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | undefined>(undefined);
  const [dockerRunning, setDockerRunning] = useState<boolean>(false);

  const fetchGlobalTelemetry = async () => {
    try {
      const p = await api.getProviderStatus();
      setProviderStatus(p);
      const s = await api.getSettings();
      setDockerRunning(s.docker_running);
    } catch (err) {
      console.error('Error fetching global telemetry:', err);
    }
  };

  useEffect(() => {
    fetchGlobalTelemetry();
    const interval = setInterval(fetchGlobalTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (route: string, param?: string) => {
    if (route.startsWith('scans/')) {
      setCurrentRoute('monitor');
      setRouteParam(route.replace('scans/', ''));
    } else if (route.startsWith('findings/')) {
      setCurrentRoute('finding-detail');
      setRouteParam(route.replace('findings/', ''));
    } else {
      setCurrentRoute(route);
      setRouteParam(param);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render active page
  const renderContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'new-scan':
        return <NewScan onNavigate={handleNavigate} />;
      case 'monitor':
        return <ScanMonitor scanId={routeParam || ''} onNavigate={handleNavigate} />;
      case 'findings':
        return <Findings initialScanId={routeParam} onNavigate={handleNavigate} />;
      case 'finding-detail':
        return <FindingDetail findingId={routeParam || ''} onNavigate={handleNavigate} />;
      case 'attack-paths':
        return <AttackPaths initialScanId={routeParam} onNavigate={handleNavigate} />;
      case 'api-security':
        return <ApiSecurity onNavigate={handleNavigate} />;
      case 'history':
        return <ScanHistory onNavigate={handleNavigate} />;
      case 'compare':
        return <CompareScans />;
      case 'reports':
        return <Reports initialScanId={routeParam} onNavigate={handleNavigate} />;
      case 'assistant':
        return <SecurityAssistant initialFindingId={routeParam} onNavigate={handleNavigate} />;
      case 'labs':
        return <TrainingLabs onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      'new-scan': 'New Security Scan',
      monitor: 'Scan Monitor',
      findings: 'Findings Repository',
      'finding-detail': 'Finding Details',
      'attack-paths': 'Attack Path Graph',
      'api-security': 'API Security',
      history: 'Scan History',
      compare: 'Compare Scans',
      reports: 'Audit Reports',
      assistant: 'Security Assistant',
      labs: 'Training Labs',
      settings: 'Settings & Telemetry',
    };
    return titles[currentRoute] || 'Dashboard';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-gray-100">
      {/* Persistent Navigation Sidebar */}
      <Sidebar currentRoute={currentRoute} onNavigate={handleNavigate} />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          title={getPageTitle()}
          providerStatus={providerStatus}
          dockerRunning={dockerRunning}
          onRefreshProvider={fetchGlobalTelemetry}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0a0d14]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
