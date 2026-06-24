import React from "react";
import { 
  Sparkles, 
  User, 
  Truck, 
  Store, 
  Shield, 
  RefreshCw,
  Coins
} from "lucide-react";
import { motion } from "motion/react";
import { BaseUser } from "../types";

interface HeaderProps {
  currentProfile: BaseUser | null;
  allUsers: BaseUser[];
  onSwitchProfile: (userId: string) => void;
  onRefreshState: () => void;
}

export default function Header({
  currentProfile,
  allUsers,
  onSwitchProfile,
  onRefreshState
}: HeaderProps) {
  if (!currentProfile) return null;

  const roleIcons: { [key: string]: React.ReactNode } = {
    customer: <User className="w-4 h-4 text-emerald-400" />,
    driver: <Truck className="w-4 h-4 text-sky-400" />,
    partner: <Store className="w-4 h-4 text-violet-400" />,
    admin: <Shield className="w-4 h-4 text-rose-400" />
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "customer": return "bg-emerald-950/40 text-emerald-300 border-emerald-800/50";
      case "driver": return "bg-sky-950/40 text-sky-300 border-sky-800/50";
      case "partner": return "bg-violet-950/40 text-violet-300 border-violet-800/50";
      case "admin": return "bg-rose-950/40 text-rose-300 border-rose-800/50";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const getRoleNameInIndonesian = (role: string) => {
    switch (role) {
      case "customer": return "PELANGGAN";
      case "driver": return "KURIR FLEET";
      case "partner": return "MITRA LAUNDRY";
      case "admin": return "SUPER ADMIN";
      default: return role.toUpperCase();
    }
  };

  return (
    <motion.header 
      id="laundryhub-header" 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800/80 backdrop-blur-md px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/15"
          >
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-extrabold text-lg tracking-tight text-white leading-none">
                Laundry<span className="text-sky-400">Hub</span>
              </h1>
              <span className="text-[9px] font-mono tracking-widest bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 uppercase">
                AGREGATOR UTAMA
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-sans">Bersihnya bikin tenang</p>
          </div>
        </div>

        {/* Dynamic Controls / Simulators Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Profile Info */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 shadow-inner">
            <img 
              src={currentProfile.avatarUrl} 
              alt={currentProfile.fullName} 
              className="w-8 h-8 rounded-full border border-zinc-700 object-cover" 
            />
            <div className="text-left">
              <p className="text-xs font-semibold text-zinc-100 max-w-[120px] truncate">{currentProfile.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] flex items-center gap-1 font-mono border px-1.5 py-0.5 rounded-md font-bold ${getRoleBadgeColor(currentProfile.userType)}`}>
                  {roleIcons[currentProfile.userType]}
                  {getRoleNameInIndonesian(currentProfile.userType)}
                </span>
                {!currentProfile.isVerified && (
                  <span className="text-[9px] bg-amber-950/40 text-amber-400 border border-amber-800/40 px-1 py-0.2 rounded font-sans">
                    BELUM DISETUJUI
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Profile Switcher Trigger */}
          <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-1">
            <span className="text-[10px] font-mono font-medium text-zinc-400 px-2 uppercase tracking-wider hidden lg:inline">
              Simulator Peran:
            </span>
            <select
              value={currentProfile.id}
              onChange={(e) => onSwitchProfile(e.target.value)}
              className="bg-zinc-950 border border-zinc-700/60 text-xs text-zinc-200 rounded-lg py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer font-medium"
            >
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({getRoleNameInIndonesian(user.userType)})
                </option>
              ))}
            </select>
          </div>

          {/* Sync Trigger */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRefreshState}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition duration-150 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Sinkronisasi status database real-time"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
