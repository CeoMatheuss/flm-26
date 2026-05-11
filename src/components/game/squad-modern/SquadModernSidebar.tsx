import React from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  Users, 
  Target, 
  ArrowLeftRight, 
  Building2, 
  DollarSign, 
  GraduationCap, 
  FileText, 
  UserCircle2, 
  Settings,
  Shield
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { id: 'calendar', label: 'Agenda', icon: Calendar },
  { id: 'copas', label: 'Competições', icon: Trophy },
  { id: 'squad', label: 'Elenco', icon: Users },
  { id: 'tactics', label: 'Táticas', icon: Target },
  { id: 'market', label: 'Transferências', icon: ArrowLeftRight },
  { id: 'clubprofile', label: 'Clube', icon: Shield },
  { id: 'finance', label: 'Finanças', icon: DollarSign },
  { id: 'youth', label: 'Base', icon: GraduationCap },
  { id: 'journal', label: 'Relatórios', icon: FileText },
  { id: 'staff', label: 'Funcionários', icon: UserCircle2 },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

interface SquadModernSidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  trainerName: string;
}

export function SquadModernSidebar({ activeTab, onTabChange, trainerName }: SquadModernSidebarProps) {
  return (
    <div className="w-64 h-full flex flex-col bg-[#05070a] border-r border-white/5 overflow-hidden">
      {/* Logo Area */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <span className="text-white font-black italic tracking-tighter text-xl">FLM</span>
          </div>
          <div>
            <h1 className="text-white font-black italic tracking-tighter text-lg leading-none">FLM 26</h1>
            <span className="text-[10px] text-white/40 font-bold tracking-[0.2em] uppercase">Legend Manager</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto smooth-scroll">
        {MENU_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "bg-white/5 text-[#8b5cf6]" 
                  : "text-white/50 hover:text-white hover:bg-white/[0.02]"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8b5cf6] shadow-[0_0_15px_#8b5cf6]" />
              )}
              <Icon className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                isActive && "drop-shadow-[0_0_8px_#8b5cf6]"
              )} />
              <span className="text-sm font-bold tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Trainer Profile */}
      <div className="p-4 mt-auto border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <div className="w-10 h-10 rounded-lg bg-[#1a1c23] border border-white/10 flex items-center justify-center overflow-hidden">
            <UserCircle2 className="h-7 w-7 text-white/20" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider leading-none mb-1">Treinador</p>
            <p className="text-xs font-black text-white truncate">{trainerName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
