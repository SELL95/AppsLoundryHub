import React, { useState, useEffect } from "react";
import { 
  Store, 
  Layers, 
  CheckCircle, 
  Plus, 
  Clock, 
  Trash2, 
  DollarSign, 
  Info,
  ChevronRight,
  TrendingUp,
  Settings,
  Sparkles
} from "lucide-react";
import { Order, BaseUser, PartnerProfile, LaundryService, PlatformConfig } from "../types";

interface PartnerPortalProps {
  currentUser: BaseUser;
  orders: Order[];
  services: LaundryService[];
  config?: PlatformConfig | null;
  onRefreshState: () => void;
}

export default function PartnerPortal({
  currentUser,
  orders,
  services: allServices,
  config,
  onRefreshState
}: PartnerPortalProps) {
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  
  // Service Creator fields
  const [newServiceName, setNewServiceName] = useState<string>("");
  const [newServiceDesc, setNewServiceDesc] = useState<string>("");
  const [newServicePrice, setNewServicePrice] = useState<string>("");
  const [pricingType, setPricingType] = useState<"kg" | "item">("kg");
  const [newServiceHours, setNewServiceHours] = useState<string>("24");
  const [newServiceCategory, setNewServiceCategory] = useState<string>("cat-wash-fold");
  const [isAddingService, setIsAddingService] = useState<boolean>(false);

  // Capacity Adjuster
  const [capacityKg, setCapacityKg] = useState<number>(150);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState<boolean>(false);

  // States for dynamic washing simulation/delay
  const [washingProgress, setWashingProgress] = useState<{ [orderId: string]: number }>({});
  const [isWashing, setIsWashing] = useState<{ [orderId: string]: boolean }>({});

  const handleStartWashing = (orderId: string) => {
    setIsWashing(prev => ({ ...prev, [orderId]: true }));
    setWashingProgress(prev => ({ ...prev, [orderId]: 0 }));
    
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setWashingProgress(prev => ({ ...prev, [orderId]: current }));
      if (current >= 100) {
        clearInterval(interval);
        setIsWashing(prev => ({ ...prev, [orderId]: false }));
      }
    }, 600); // 10% progress every 0.6 seconds (total 6 seconds simulation)
  };

  // Load Partner Profile
  const hasInitializedCapacity = React.useRef(false);

  useEffect(() => {
    const fetchPartnerProfile = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setPartnerProfile(data.partner);
          if (data.partner && !hasInitializedCapacity.current) {
            setCapacityKg(data.partner.dailyCapacityKg || 150);
            hasInitializedCapacity.current = true;
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPartnerProfile();
  }, [currentUser]);

  if (!partnerProfile) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Loading Partner workshop details...
      </div>
    );
  }

  // Orders addressing this partner
  const myOrders = orders.filter(o => o.partnerId === partnerProfile.id);

  // Incoming Pending confirmation (status: 'pending')
  const incomingOrders = myOrders.filter(o => o.status === "pending");

  // Orders currently being processed inside the workshop (status: 'in_processing')
  const inProcessingOrders = myOrders.filter(o => o.status === "in_processing");

  // Filter service catalog
  const myServices = allServices.filter(s => s.partnerId === partnerProfile.id);

  // Confirm and match driver pickup
  const handleConfirmOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "confirmed",
          notes: "Washing workshop approved booking request. Requesting nearest courier rider."
        })
      });
      if (res.ok) {
        alert("Booking request approved! Delivery rider dispatch requested.");
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Skip simulation check points for laundry states
  const handleWashingComplete = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "ready_for_delivery",
          notes: "Washing, drying, sanitizing, and steam pressing cycle complete! Items carefully sealed in LaundryHub protective garment bags."
        })
      });
      if (res.ok) {
        alert("Washing cycle finalized! Clothes are packed and sealed. Delivery dispatch active.");
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit new service in catalog
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) return;
    setIsAddingService(true);

    const payload = {
      name: newServiceName,
      description: newServiceDesc,
      pricePerKg: pricingType === "kg" ? parseFloat(newServicePrice) : undefined,
      pricePerItem: pricingType === "item" ? parseFloat(newServicePrice) : undefined,
      processingTimeHours: parseInt(newServiceHours) || 24,
      categoryId: newServiceCategory
    };

    try {
      const res = await fetch(`/api/partners/${partnerProfile.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("New care service successfully added to your catalog!");
        setNewServiceName("");
        setNewServiceDesc("");
        setNewServicePrice("");
        onRefreshState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingService(false);
    }
  };

  // Update capacity
  const handleSaveCapacity = async () => {
    setIsUpdatingCapacity(true);
    try {
      const res = await fetch(`/api/partners/${partnerProfile.id}/capacity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCapacityKg: capacityKg })
      });
      if (res.ok) {
        alert(`Capacity limit updated to ${capacityKg} Kg per day.`);
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  // Financial calculations
  const myCompletedOrders = myOrders.filter(o => o.status === "completed");
  const grossRevenue = myCompletedOrders.reduce((acc, o) => acc + o.subtotal, 0);
  
  // Escrow wallet based on dynamic commission rate from platform config
  const currentCommRate = config?.commissionRate !== undefined ? config.commissionRate : 15;
  const myShareEarnings = grossRevenue * ((100 - currentCommRate) / 100);

  return (
    <div id="partner-portal-view" className="w-full max-w-7xl mx-auto px-4 py-6">
      
      {/* Top Console indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Earnings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Workshop Net Revenue</p>
            <p className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">${myShareEarnings.toFixed(2)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Deducted {currentCommRate}% standard platform commission</p>
          </div>
          <div className="bg-sky-500/10 w-12 h-12 rounded-xl flex items-center justify-center border border-sky-500/15">
            <DollarSign className="w-6 h-6 text-sky-400" />
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Incoming Requests</p>
            <p className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">{incomingOrders.length}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Awaiting confirmation and matching</p>
          </div>
          <div className="bg-violet-500/10 w-12 h-12 rounded-xl flex items-center justify-center border border-violet-500/15">
            <Store className="w-6 h-6 text-violet-400" />
          </div>
        </div>

        {/* active in workshop */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Garments in Washing</p>
            <p className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">{inProcessingOrders.length}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Sorting, tumble dry, or press</p>
          </div>
          <div className="bg-amber-500/10 w-12 h-12 rounded-xl flex items-center justify-center border border-amber-500/15">
            <Layers className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        {/* Workshop status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Workshop Approval</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`w-3 h-3 rounded-full ${partnerProfile.isApproved ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
              <p className="text-sm font-bold text-zinc-200">
                {partnerProfile.isApproved ? "Approved & Live" : "Pending admin review"}
              </p>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Authorized to receive dispatches</p>
          </div>
          <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center border border-emerald-500/15">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Washing Queue & Incoming orders */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Incoming Bookings Queue */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-sans font-bold text-sm text-zinc-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400 animate-pulse" />
                Incoming Garments Orders Queue ({incomingOrders.length})
              </h3>
              <span className="text-[10px] bg-zinc-950 font-mono text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded">
                AWAITING PROCESSING SIGN-OFF
              </span>
            </div>

            <div className="space-y-3">
              {incomingOrders.map((o) => (
                <div key={o.id} className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-100">Order #{o.orderNumber}</span>
                      <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.2 rounded font-mono uppercase font-semibold">
                        {o.serviceType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Garments Weight estimate: <strong className="text-zinc-200">{o.weightKg} Kg</strong> / Pieces: <strong className="text-zinc-200">{o.itemCount} items</strong>
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Special requests: {o.specialInstructions || "No delicate requirements."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmOrder(o.id)}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-violet-600/10 transition"
                    >
                      Confirm Booking & Dispatch Pickup
                    </button>
                  </div>
                </div>
              ))}
              {incomingOrders.length === 0 && (
                <p className="text-center py-6 text-zinc-500 text-xs italic">No pending bookings waiting for confirmation.</p>
              )}
            </div>
          </div>

          {/* Active Laundry Processing milestons */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-sans font-bold text-sm text-zinc-200 flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-400" />
                Active Washing Workshop Cycles ({inProcessingOrders.length})
              </h3>
              <span className="text-[10px] bg-zinc-950 font-mono text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded">
                INTERNAL CYCLE HUD
              </span>
            </div>

            <div className="space-y-3.5">
              {inProcessingOrders.map((o) => {
                const progress = washingProgress[o.id] !== undefined ? washingProgress[o.id] : 0;
                const washingActive = isWashing[o.id] || false;
                const isFinished = progress >= 100;

                return (
                  <div key={o.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-zinc-100">Order #{o.orderNumber}</p>
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Estimasi beban pakaian: {o.weightKg} Kg</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        isFinished 
                          ? "bg-emerald-950/45 text-emerald-400 border border-emerald-900/40" 
                          : washingActive 
                          ? "bg-indigo-950/45 text-indigo-400 border border-indigo-900/40 animate-pulse" 
                          : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                      }`}>
                        {isFinished ? "PENCUCIAN SELESAI" : washingActive ? "PROSES PENCUCIAN SEDANG BERJALAN" : "MENUNGGU SIKLUS MULAI"}
                      </span>
                    </div>

                    {/* Progress Bar Interaktif */}
                    <div className="bg-zinc-900/60 p-3.5 border border-zinc-850 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                          {washingActive && <span className="inline-block w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                          {isFinished ? "✅ Semua Tahap Selesai!" : washingActive ? "⏳ Sedang memproses (mencuci & menyetrika)..." : "ℹ️ Klik tombol di bawah untuk mulai proses pencucian"}
                        </span>
                        <span className="font-mono font-bold text-zinc-300">{progress}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Visual checklist processing steps */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-zinc-900 p-2 border border-zinc-850 rounded-xl">
                      <div className="border border-emerald-900 bg-emerald-950/10 p-1.5 rounded text-center">
                        <p className="font-bold text-emerald-400">✓ Tahap 1: Sorting</p>
                        <p className="text-zinc-500 mt-0.5 font-mono">Selesai</p>
                      </div>
                      <div className={`p-1.5 rounded text-center border ${
                        progress >= 30 ? "border-emerald-900 bg-emerald-950/10 text-emerald-400" : washingActive ? "border-indigo-900/40 bg-indigo-950/10 text-indigo-400" : "border-zinc-800 text-zinc-500"
                      }`}>
                        <p className="font-bold">⚙ Tahap 2: Cuci</p>
                        <p className="mt-0.5 font-mono">{progress >= 30 ? "Selesai" : washingActive ? "Proses..." : "Menunggu"}</p>
                      </div>
                      <div className={`p-1.5 rounded text-center border ${
                        progress >= 70 ? "border-emerald-900 bg-emerald-950/10 text-emerald-400" : washingActive && progress >= 30 ? "border-indigo-900/40 bg-indigo-950/10 text-indigo-400" : "border-zinc-800 text-zinc-500"
                      }`}>
                        <p className="font-bold">🌀 Tahap 3: Kering</p>
                        <p className="mt-0.5 font-mono">{progress >= 70 ? "Selesai" : washingActive && progress >= 30 ? "Proses..." : "Menunggu"}</p>
                      </div>
                      <div className={`p-1.5 rounded text-center border ${
                        progress >= 100 ? "border-emerald-900 bg-emerald-950/10 text-emerald-400" : washingActive && progress >= 70 ? "border-indigo-900/40 bg-indigo-950/10 text-indigo-400" : "border-zinc-800 text-zinc-500"
                      }`}>
                        <p className="font-bold">💨 Tahap 4: Setrika</p>
                        <p className="mt-0.5 font-mono">{progress >= 100 ? "Selesai" : washingActive && progress >= 70 ? "Proses..." : "Menunggu"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-2.5 border-t border-zinc-900">
                      <span className="text-[10px] text-zinc-500 italic">Catatan khusus: "{o.specialInstructions || "Cuci bersih standar."}"</span>
                      <div className="flex gap-2">
                        {!isFinished && !washingActive && (
                          <button
                            onClick={() => handleStartWashing(o.id)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/10"
                          >
                            ⚡ Mulai Proses Pengerjaan
                          </button>
                        )}
                        <button
                          onClick={() => handleWashingComplete(o.id)}
                          disabled={!isFinished}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-600/10"
                        >
                          Mark Care Finished & Panggil Kurir Pengantaran
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {inProcessingOrders.length === 0 && (
                <p className="text-center py-6 text-zinc-500 text-xs italic">No garments currently washing inside the workshop. Couriers deliver here automatically after customer pickup confirmation.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Catalog management & capacity controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Daily limit Regulator */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm text-zinc-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-violet-400" />
              Daily Capacity limits
            </h3>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-zinc-400">Washing machine limit:</span>
                <span className="text-xs font-mono font-bold text-violet-400">{capacityKg} Kg / Day</span>
              </div>
              <input 
                type="range"
                min="50"
                max="500"
                step="10"
                value={capacityKg}
                onChange={(e) => setCapacityKg(parseInt(e.target.value))}
                className="w-full accent-violet-500 cursor-ew-resize bg-zinc-800 h-1.5 rounded-lg"
              />
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                When customer order aggregate weight reaches limit, your listing will be temporarily hidden from customer catalog exploration.
              </p>
            </div>

            <button
              onClick={handleSaveCapacity}
              disabled={isUpdatingCapacity}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold border border-zinc-700 rounded-xl transition"
            >
              {isUpdatingCapacity ? "Updating limits..." : "Save limits"}
            </button>
          </div>

          {/* Service catalog catalog list & Creator */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm text-zinc-200 border-b border-zinc-800/80 pb-3">
              My Service Offerings Catalog
            </h3>

            {/* List offerings */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {myServices.map((s) => (
                <div key={s.id} className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-850 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-zinc-200">{s.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{s.processingTimeHours} hours turnaround</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-violet-400">
                      ${s.pricePerKg ? `${s.pricePerKg}/Kg` : `${s.pricePerItem}/Item`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form Creator */}
            <form onSubmit={handleCreateService} className="border-t border-zinc-800/80 pt-4 space-y-3">
              <p className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Add New Care service offering:</p>

              <div>
                <input 
                  type="text" 
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Silk Sheets Dry Cleaning"
                  required
                  className="w-full bg-zinc-950 text-xs border border-zinc-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={pricingType}
                    onChange={(e: any) => setPricingType(e.target.value)}
                    className="w-full bg-zinc-950 text-xs border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none"
                  >
                    <option value="kg">Per Kg</option>
                    <option value="item">Per Piece</option>
                  </select>
                </div>
                <div>
                  <input 
                    type="number" 
                    step="0.10"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="Price ($)"
                    className="w-full bg-zinc-950 text-xs border border-zinc-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full bg-zinc-950 text-xs border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none"
                  >
                    <option value="cat-wash-fold">Wash & Fold</option>
                    <option value="cat-wash-iron">Wash & Iron</option>
                    <option value="cat-dry-clean">Dry Clean</option>
                    <option value="cat-iron-only">Iron Only</option>
                  </select>
                </div>
                <div>
                  <input 
                    type="number" 
                    value={newServiceHours}
                    onChange={(e) => setNewServiceHours(e.target.value)}
                    placeholder="Turnaround hours"
                    className="w-full bg-zinc-950 text-xs border border-zinc-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-sky-500 text-zinc-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingService}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-violet-600/10 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAddingService ? "Injecting offering..." : "Add to Live Catalog"}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
