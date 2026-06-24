import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Settings, 
  CheckCircle, 
  Star, 
  Coins, 
  AlertTriangle, 
  ArrowRight, 
  Trash2, 
  TrendingUp, 
  Users, 
  Briefcase 
} from "lucide-react";
import { Order, BaseUser, PartnerProfile, DriverProfile, PlatformConfig, Dispute } from "../types";

interface AdminPortalProps {
  currentUser: BaseUser;
  orders: Order[];
  users: BaseUser[];
  partners: PartnerProfile[];
  drivers: DriverProfile[];
  config: PlatformConfig;
  disputes: Dispute[];
  onRefreshState: () => void;
}

export default function AdminPortal({
  currentUser,
  orders,
  users: allUsers,
  partners,
  drivers,
  config,
  disputes,
  onRefreshState
}: AdminPortalProps) {
  // Config state
  const [commRate, setCommRate] = useState<number>(15);
  const [baseFare, setBaseFare] = useState<number>(2.00);
  const [kmFare, setKmFare] = useState<number>(0.50);
  const [surgeEnabled, setSurgeEnabled] = useState<boolean>(false);
  const [surgeMult, setSurgeMult] = useState<number>(1.25);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState<boolean>(false);

  // Dispute resolution states
  const [resolutionTexts, setResolutionTexts] = useState<{ [disputeId: string]: string }>({});
  const [isResolving, setIsResolving] = useState<{ [disputeId: string]: boolean }>({});

  // Populate config on load only once to prevent typed values from snapping back on periodic parent updates
  const hasInitializedConfig = React.useRef(false);

  useEffect(() => {
    if (config && !hasInitializedConfig.current) {
      setCommRate(config.commissionRate || 15);
      setBaseFare(config.deliveryFeeBase || 2.00);
      setKmFare(config.deliveryFeePerKm || 0.50);
      setSurgeEnabled(config.surgePricingEnabled || false);
      setSurgeMult(config.surgePricingMultiplier || 1.25);
      hasInitializedConfig.current = true;
    }
  }, [config]);

  // Handle system config save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingConfig(true);

    const payload = {
      commissionRate: commRate,
      deliveryFeeBase: baseFare,
      deliveryFeePerKm: kmFare,
      surgePricingEnabled: surgeEnabled,
      surgePricingMultiplier: surgeMult
    };

    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Platform core configurations and pricing algorithms updated successfully.");
        onRefreshState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // Handle partner / driver onboarding approvals
  const handleApproveUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/approve-user/${userId}`, {
        method: "PUT"
      });
      if (res.ok) {
        alert("User credentials successfully approved! The workshop or driver is now active on the dispatch market.");
        onRefreshState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle dispute ticket resolution
  const handleResolveDispute = async (disputeId: string) => {
    const text = resolutionTexts[disputeId] || "Resolved with default credit settlement";
    
    setIsResolving(prev => ({ ...prev, [disputeId]: true }));
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: text })
      });
      if (res.ok) {
        alert("Dispute ticket successfully closed & resolved.");
        onRefreshState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResolving(prev => ({ ...prev, [disputeId]: false }));
    }
  };

  // Platform performance calculation metrics
  const completedOrders = orders.filter(o => o.status === "completed");
  const platformGMV = completedOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  
  // Platform net revenues = 15% commission on subtotals + $0.50 platform levy per order
  const totalSubtotals = completedOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const totalCommissionRev = totalSubtotals * (config.commissionRate / 100);
  const totalLevyRev = completedOrders.length * 0.50;
  const platformNetRevenues = totalCommissionRev + totalLevyRev;

  // Pending onboard queues
  const pendingOnboardPartners = partners.filter(p => !p.isApproved);
  const pendingOnboardDrivers = drivers.filter(d => !d.isApproved);

  return (
    <div id="admin-portal-view" className="w-full max-w-7xl mx-auto px-4 py-6 space-y-8">
      
      {/* SaaS Executive indicators row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Platform Gross Value (GMV) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4.5">
          <p className="text-[10px] text-zinc-400 font-mono uppercase">Gross Merch Volume (GMV)</p>
          <p className="text-2xl font-extrabold font-mono text-zinc-100 mt-1">${platformGMV.toFixed(2)}</p>
          <p className="text-[9px] text-zinc-500 mt-1">Aggregated order balances</p>
        </div>

        {/* Platform Net Earnings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4.5 bg-gradient-to-br from-zinc-900 to-indigo-950/25">
          <p className="text-[10px] text-zinc-400 font-mono uppercase">Net Commission Earnings</p>
          <p className="text-2xl font-extrabold font-mono text-sky-400 mt-1">${platformNetRevenues.toFixed(2)}</p>
          <p className="text-[9px] text-zinc-500 mt-1">Comm ({config.commissionRate}%) + $0.50 Levy</p>
        </div>

        {/* Total Orders */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4.5">
          <p className="text-[10px] text-zinc-400 font-mono uppercase">Total System Bookings</p>
          <p className="text-2xl font-extrabold font-mono text-zinc-100 mt-1">{orders.length}</p>
          <p className="text-[9px] text-zinc-500 mt-1">{completedOrders.length} Completed / {orders.filter(o => o.status === "cancelled").length} Cancelled</p>
        </div>

        {/* Workshops */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4.5">
          <p className="text-[10px] text-zinc-400 font-mono uppercase">Registered Workshops</p>
          <p className="text-2xl font-extrabold font-mono text-zinc-100 mt-1">{partners.length}</p>
          <p className="text-[9px] text-zinc-500 mt-1">{partners.filter(p => p.isApproved).length} Approved / {partners.filter(p => !p.isApproved).length} Pending</p>
        </div>

        {/* Couriers */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4.5">
          <p className="text-[10px] text-zinc-400 font-mono uppercase">Courier Fleet</p>
          <p className="text-2xl font-extrabold font-mono text-zinc-100 mt-1">{drivers.length}</p>
          <p className="text-[9px] text-zinc-500 mt-1">{drivers.filter(d => d.isOnline).length} Active riders online</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Onboarding approvals & Disputes queue */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Onboarding Verification Registries */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm text-zinc-200 border-b border-zinc-800/80 pb-3">
              Partner & Driver Verification Onboarding Queue
            </h3>

            <div className="space-y-4">
              {/* Partners queue */}
              <div>
                <p className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase mb-2">Awaiting Workshop Approvals ({pendingOnboardPartners.length}):</p>
                {pendingOnboardPartners.map((p) => (
                  <div key={p.id} className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{p.businessName}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{p.businessAddress}</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Requested Capacity: {p.dailyCapacityKg} Kg / Day</p>
                    </div>
                    <button
                      onClick={() => handleApproveUser(p.userId)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                    >
                      Verify & Approve Workshop
                    </button>
                  </div>
                ))}
                {pendingOnboardPartners.length === 0 && (
                  <p className="text-[11px] text-zinc-500 italic px-2">No workshop applications currently awaiting verification.</p>
                )}
              </div>

              {/* Drivers queue */}
              <div className="border-t border-zinc-900 pt-4">
                <p className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase mb-2">Awaiting Courier Fleet Approvals ({pendingOnboardDrivers.length}):</p>
                {pendingOnboardDrivers.map((d) => {
                  const user = allUsers.find(u => u.id === d.userId);
                  return (
                    <div key={d.id} className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-200">{user?.fullName || "Courier Application"}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{d.vehicleType} ({d.vehiclePlate})</p>
                      </div>
                      <button
                        onClick={() => handleApproveUser(d.userId)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                      >
                        Approve Rider License
                      </button>
                    </div>
                  );
                })}
                {pendingOnboardDrivers.length === 0 && (
                  <p className="text-[11px] text-zinc-500 italic px-2">No rider license credentials awaiting approval.</p>
                )}
              </div>
            </div>
          </div>

          {/* Disputes Incident Board */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm text-zinc-200 border-b border-zinc-800/80 pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              Customer disputes Incident Dashboard ({disputes.filter(d => d.status === 'open').length})
            </h3>

            <div className="space-y-4">
              {disputes.map((disp) => {
                const order = orders.find(o => o.id === disp.orderId);
                const raisedUser = allUsers.find(u => u.id === disp.raisedBy);
                const againstPartner = partners.find(p => p.id === disp.against || p.userId === disp.against);

                return (
                  <div key={disp.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200">Incident Ticket #{disp.id}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-semibold ${
                            disp.status === 'resolved' 
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/40" 
                              : "bg-rose-950/40 text-rose-300 border border-rose-900/40 animate-pulse"
                          }`}>
                            {disp.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-mono mt-1">
                          Order Number: <strong className="text-zinc-400">{order?.orderNumber || "LH-MOCK"}</strong> | Raised By: <strong className="text-zinc-400">{raisedUser?.fullName || "Alex"}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Type: <span className="text-rose-400 font-bold capitalize">{disp.type.replace(/_/g, ' ')}</span>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 bg-zinc-900/60 p-3 border border-zinc-850 rounded-lg leading-relaxed">
                      " {disp.description} "
                    </p>

                    {disp.status === "open" ? (
                      <div className="space-y-2.5 border-t border-zinc-900 pt-3">
                        <label className="block text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Input Admin audit resolution & actions:</label>
                        <div className="flex gap-2.5">
                          <input 
                            type="text"
                            value={resolutionTexts[disp.id] || ""}
                            onChange={(e) => setResolutionTexts(prev => ({ ...prev, [disp.id]: e.target.value }))}
                            placeholder="e.g. Credited full order value $20 back to customer wallet balance."
                            className="flex-1 bg-zinc-900 text-xs border border-zinc-800 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500 text-zinc-200"
                          />
                          <button
                            onClick={() => handleResolveDispute(disp.id)}
                            disabled={isResolving[disp.id]}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition shrink-0"
                          >
                            {isResolving[disp.id] ? "Resolving..." : "Resolve Incident"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg text-[11px] text-zinc-400 leading-relaxed">
                        <strong className="text-emerald-400">Resolution:</strong> {disp.resolution}
                      </div>
                    )}
                  </div>
                );
              })}

              {disputes.length === 0 && (
                <p className="text-center py-6 text-zinc-500 text-xs italic">No disputes registered. Customer experiences are fully pristine.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Platform Configuration Algorithms */}
        <div className="lg:col-span-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <h3 className="font-sans font-bold text-sm text-zinc-200 border-b border-zinc-800/80 pb-3 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-sky-400" />
              SaaS Commission & Pricing Algorithms
            </h3>

            <form onSubmit={handleSaveConfig} className="mt-4 space-y-5">
              
              {/* Commission Rate */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Platform Commission Rate (%):
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min="1"
                    max="50"
                    value={commRate}
                    onChange={(e) => setCommRate(parseFloat(e.target.value) || 15)}
                    className="flex-1 bg-zinc-950 text-xs border border-zinc-850 p-2 rounded focus:outline-none text-zinc-200 font-mono"
                  />
                  <span className="text-xs text-zinc-500 font-mono">%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Deducted automatically from workshop order subtotal. Global standard is 15.00%.</p>
              </div>

              {/* Base Courier delivery fee */}
              <div className="grid grid-cols-2 gap-3 border-t border-zinc-900 pt-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Base Delivery Fare:
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={baseFare}
                    onChange={(e) => setBaseFare(parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-zinc-950 text-xs border border-zinc-850 p-2 rounded focus:outline-none text-zinc-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Additional Per-Km:
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={kmFare}
                    onChange={(e) => setKmFare(parseFloat(e.target.value) || 0.5)}
                    className="w-full bg-zinc-950 text-xs border border-zinc-850 p-2 rounded focus:outline-none text-zinc-200 font-mono"
                  />
                </div>
              </div>

              {/* Surge Pricing Toggle & multiplier */}
              <div className="border-t border-zinc-900 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Enable Surge Pricing multiplier:</span>
                  <input 
                    type="checkbox"
                    checked={surgeEnabled}
                    onChange={(e) => setSurgeEnabled(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-sky-500"
                  />
                </div>
                {surgeEnabled && (
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mb-1.5">
                      <span>Multiplier scale:</span>
                      <span className="text-sky-400 font-bold">{surgeMult.toFixed(2)}x</span>
                    </div>
                    <input 
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={surgeMult}
                      onChange={(e) => setSurgeMult(parseFloat(e.target.value))}
                      className="w-full accent-sky-500 cursor-ew-resize bg-zinc-800 h-1.5 rounded"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Boosts driver distance faires dynamically during heavy rainfall or high regional traffic.</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isUpdatingConfig}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/10 transition"
              >
                {isUpdatingConfig ? "Updating platform core..." : "Save Algorithm Parameters"}
              </button>

            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
