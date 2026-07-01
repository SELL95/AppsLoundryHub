import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import CustomerPortal from "./components/CustomerPortal";
import DriverPortal from "./components/DriverPortal";
import PartnerPortal from "./components/PartnerPortal";
import AdminPortal from "./components/AdminPortal";
import { 
  BaseUser, 
  CustomerProfile, 
  DriverProfile, 
  PartnerProfile, 
  LaundryService, 
  Order, 
  PlatformConfig, 
  WalletTransaction, 
  Dispute,
  Review 
} from "./types";

export default function App() {
  // Shared state synchronized with backend in-memory database
  const [users, setUsers] = useState<BaseUser[]>([]);
  const [currentProfile, setCurrentProfile] = useState<BaseUser | null>(null);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [services, setServices] = useState<LaundryService[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize state function
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Could not fetch state from Express server.");
      const data = await res.json();
      
      setUsers(data.users);
      setPartners(data.partners);
      setDrivers(data.drivers);
      setServices(data.services);
      setOrders(data.orders);
      setWalletTransactions(data.walletTransactions);
      setDisputes(data.disputes);
      setReviews(data.reviews);
      setConfig(data.platformConfig);

      // Find current active session profile
      const activeUser = data.users.find((u: BaseUser) => u.id === data.currentSessionUserId);
      if (activeUser) {
        setCurrentProfile(activeUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Express server starting. Please wait...");
    } finally {
      setIsLoading(false);
    }
  };

  // Switch session active profile on backend
  const handleSwitchProfile = async (userId: string) => {
    try {
      const res = await fetch("/api/auth/switch-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        await fetchState();
      } else {
        alert("Could not switch profile on backend.");
      }
    } catch (err) {
      console.error("Error switching profile:", err);
    }
  };

  // Initial load & Polling loop for state sync
  useEffect(() => {
    fetchState();
    
    // Set a polling loop every 3 seconds to keep coordinates/statuses in perfect real-time sync!
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 font-sans p-6">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center animate-spin shadow-lg shadow-blue-500/20 mb-4">
          <div className="w-5 h-5 bg-yellow-400 rounded-lg" />
        </div>
        <p className="text-sm font-bold tracking-wider text-slate-800 animate-pulse">
          Starting CleanUp Simulator...
        </p>
        <p className="text-xs text-slate-400 mt-1.5">Mempersiapkan simulator platform laundry professional</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 font-sans p-6 text-center">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl max-w-md shadow-sm">
          <p className="text-sm font-bold text-red-600">⚠️ Hubungan Backend Terputus</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {error}. Dev server sedang memproses kompilasi ulang. Silakan segarkan halaman.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow"
          >
            Segarkan Aplikasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-blue-500/20">
      
      {/* Top Profile Switcher Header */}
      <Header 
        currentProfile={currentProfile}
        allUsers={users}
        onSwitchProfile={handleSwitchProfile}
        onRefreshState={fetchState}
      />

      {/* Primary Role portal renderer */}
      <main className="flex-1 bg-slate-50">
        {currentProfile?.userType === "customer" && (
          <CustomerPortal 
            currentUser={currentProfile}
            partners={partners}
            services={services}
            orders={orders}
            walletTransactions={walletTransactions}
            onRefreshState={fetchState}
          />
        )}

        {currentProfile?.userType === "driver" && (
          <DriverPortal 
            currentUser={currentProfile}
            orders={orders}
            partners={partners}
            onRefreshState={fetchState}
          />
        )}

        {currentProfile?.userType === "partner" && (
          <PartnerPortal 
            currentUser={currentProfile}
            orders={orders}
            services={services}
            config={config}
            onRefreshState={fetchState}
          />
        )}

        {currentProfile?.userType === "admin" && config && (
          <AdminPortal 
            currentUser={currentProfile}
            orders={orders}
            users={users}
            partners={partners}
            drivers={drivers}
            config={config}
            disputes={disputes}
            onRefreshState={fetchState}
          />
        )}
      </main>

      {/* Bottom status bar */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-[10px] text-slate-500 font-mono tracking-wide flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
        <p>© 2026 CleanUp Startup Platform, Inc. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-blue-600 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            SIMULASI SISTEM AKTIF (SINKRONISASI GPS)
          </span>
          <span className="text-slate-300">|</span>
          <span>SIMULATOR LIVE</span>
        </div>
      </footer>

    </div>
  );
}
