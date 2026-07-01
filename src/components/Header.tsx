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
    customer: <User className="w-4 h-4 text-blue-600" />,
    driver: <Truck className="w-4 h-4 text-amber-500" />,
    partner: <Store className="w-4 h-4 text-indigo-600" />,
    admin: <Shield className="w-4 h-4 text-rose-600" />
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "customer": return "bg-blue-50 text-blue-700 border-blue-200";
      case "driver": return "bg-amber-50 text-amber-700 border-amber-200";
      case "partner": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "admin": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
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
      id="cleanup-header" 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 bg-white border-b border-slate-200 backdrop-blur-md px-6 py-4 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/10"
          >
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-extrabold text-xl tracking-tight text-slate-900 leading-none">
                Clean<span className="text-blue-600">Up</span>
              </h1>
              <span className="text-[9px] font-mono tracking-widest bg-yellow-400 text-slate-900 font-bold px-1.5 py-0.5 rounded uppercase">
                Startup Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">Layanan Laundry Digital Cepat & Professional</p>
          </div>
        </div>
 
        {/* Dynamic Controls / Simulators Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Profile Info */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <img 
              src={currentProfile.avatarUrl} 
              alt={currentProfile.fullName} 
              className="w-8 h-8 rounded-full border border-slate-300 object-cover" 
            />
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 max-w-[120px] truncate">{currentProfile.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] flex items-center gap-1 font-mono border px-1.5 py-0.5 rounded-md font-bold ${getRoleBadgeColor(currentProfile.userType)}`}>
                  {roleIcons[currentProfile.userType]}
                  {getRoleNameInIndonesian(currentProfile.userType)}
                </span>
                {!currentProfile.isVerified && (
                  <span className="text-[9px] bg-yellow-100 text-yellow-800 border border-yellow-300 px-1 py-0.2 rounded font-sans font-semibold">
                    BELUM DISETUJUI
                  </span>
                )}
              </div>
            </div>
          </div>
 
          {/* Quick Profile Switcher Trigger */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
            <span className="text-[10px] font-mono font-medium text-slate-500 px-2 uppercase tracking-wider hidden lg:inline">
              Pilih Akun Demo:
            </span>
            <select
              value={currentProfile.id}
              onChange={(e) => onSwitchProfile(e.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-700 rounded-lg py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-semibold"
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
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition duration-150 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-md shadow-blue-500/10"
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
