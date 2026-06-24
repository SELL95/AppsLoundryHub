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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-sans p-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center animate-spin shadow-lg shadow-sky-500/10 mb-4">
          <div className="w-5 h-5 bg-zinc-950 rounded-lg" />
        </div>
        <p className="text-sm font-semibold tracking-wider text-zinc-300 animate-pulse">
          Starting LaundryHub Engine...
        </p>
        <p className="text-xs text-zinc-500 mt-1.5">Spinning up microservice simulators</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-sans p-6 text-center">
        <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-2xl max-w-md">
          <p className="text-sm font-bold text-rose-400">⚠️ Backend Connection Refused</p>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            {error}. The Node.js dev server is compiling. Click Refresh below if it doesn't self-heal.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-bold transition"
          >
            Refresh Interface
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col selection:bg-sky-500/35">
      
      {/* Top Profile Switcher Header */}
      <Header 
        currentProfile={currentProfile}
        allUsers={users}
        onSwitchProfile={handleSwitchProfile}
        onRefreshState={fetchState}
      />

      {/* Primary Role portal renderer */}
      <main className="flex-1 bg-zinc-950">
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
      <footer className="bg-zinc-950 border-t border-zinc-900 py-3.5 px-6 text-center text-[10px] text-zinc-500 font-mono tracking-wide flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 LaundryHub Platform, Inc. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SIMULATION ACTIVE (4s RE-ROUTE ENGINE)
          </span>
          <span className="text-zinc-600">|</span>
          <span>PORT: 3000 (INGRESS SAFE)</span>
        </div>
      </footer>

    </div>
  );
}
