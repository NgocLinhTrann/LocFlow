import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Translate from './components/Translate';
import Glossary from './components/Glossary';
import Memory from './components/Memory';
import { LayoutDashboard, FileSpreadsheet, BookOpen, Database, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'translate':
        return <Translate />;
      case 'glossary':
        return <Glossary />;
      case 'memory':
        return <Memory />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'translate', name: 'Translate File', icon: FileSpreadsheet },
    { id: 'glossary', name: 'Glossary Terms', icon: BookOpen },
    { id: 'memory', name: 'Translation Memory', icon: Database },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/40">
      {/* Sidebar Panel - Obsidian theme with high contrast */}
      <aside className="w-64 bg-obsidian-950 text-slate-300 flex flex-col justify-between border-r border-obsidian-900 shrink-0">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="h-20 px-6 flex items-center border-b border-obsidian-900 gap-3 bg-obsidian-950/40 relative overflow-hidden">
            {/* Soft decorative background radial glow */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl" />
            
            <div className="p-2 bg-gradient-to-tr from-brand-600 to-violet-500 rounded-xl text-white shadow-lg shadow-brand-500/25 relative z-10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="relative z-10">
              <span className="font-extrabold text-xl tracking-tight text-white block">LocFlow</span>
              <span className="text-[10px] text-brand-300 block -mt-0.5 font-bold tracking-wider uppercase">AI with memory</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 mt-4 space-y-1.5 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-smooth ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-600/20 ring-1 ring-brand-500/15'
                      : 'text-obsidian-400 hover:text-white hover:bg-obsidian-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110 text-white' : 'text-obsidian-400 group-hover:text-slate-200'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Brand Info */}
        <div className="p-6 border-t border-obsidian-900 bg-obsidian-950/20 text-center">
          <span className="text-[9px] font-bold text-obsidian-500 tracking-widest uppercase block">LocFlow Local Utility</span>
          <span className="text-[10px] text-obsidian-400 mt-1.5 font-medium block">v1.0.0 • Connected</span>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto px-10 py-8 max-w-6xl">
        <div className="h-full max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
