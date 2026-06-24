import React, { useState, useEffect } from "react";
import { 
  Truck, 
  MapPin, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  Navigation, 
  AlertTriangle, 
  Briefcase,
  Coins,
  Compass,
  Camera
} from "lucide-react";
import { Order, BaseUser, DriverProfile, PartnerProfile } from "../types";
import InteractiveMap from "./InteractiveMap";

interface DriverPortalProps {
  currentUser: BaseUser;
  orders: Order[];
  partners?: PartnerProfile[];
  onRefreshState: () => void;
}

export default function DriverPortal({
  currentUser,
  orders,
  partners = [],
  onRefreshState
}: DriverPortalProps) {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [typedOtp, setTypedOtp] = useState<string>("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState<boolean>(false);

  // My current active driver assignment (can be pickup or delivery)
  const activeJob = orders.find(
    o => o.driverId === driverProfile?.id && 
    o.status !== "completed" && 
    o.status !== "cancelled" && 
    o.status !== "in_processing"
  );

  const [driverSubStep, setDriverSubStep] = useState<"route_to_laundry" | "take_photo" | "route_to_recipient">("route_to_laundry");
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState<boolean>(false);

  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isCapturingDeliveryPhoto, setIsCapturingDeliveryPhoto] = useState<boolean>(false);

  // Sync state with activeJob
  useEffect(() => {
    if (activeJob) {
      const savedStep = localStorage.getItem(`driver_step_${activeJob.id}`);
      setDriverSubStep((savedStep as any) || "route_to_laundry");
      setPickupPhoto(localStorage.getItem(`pickup_photo_${activeJob.id}`));
      setDeliveryPhoto(localStorage.getItem(`delivery_photo_${activeJob.id}`));
    } else {
      setDriverSubStep("route_to_laundry");
      setPickupPhoto(null);
      setDeliveryPhoto(null);
    }
  }, [activeJob?.id]);

  const updateSubStep = (step: "route_to_laundry" | "take_photo" | "route_to_recipient") => {
    if (activeJob) {
      localStorage.setItem(`driver_step_${activeJob.id}`, step);
    }
    setDriverSubStep(step);
  };

  const savePickupPhoto = (photo: string) => {
    if (activeJob) {
      localStorage.setItem(`pickup_photo_${activeJob.id}`, photo);
    }
    setPickupPhoto(photo);
  };

  const saveDeliveryPhoto = (photo: string) => {
    if (activeJob) {
      localStorage.setItem(`delivery_photo_${activeJob.id}`, photo);
    }
    setDeliveryPhoto(photo);
  };

  // Load driver profile from user ID
  useEffect(() => {
    const fetchDriverProfile = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setDriverProfile(data.driver);
          setIsOnline(data.driver?.isOnline || false);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDriverProfile();
  }, [currentUser]);

  // Handle Online/Offline toggles
  const handleToggleOnline = async (onlineState: boolean) => {
    if (!driverProfile) return;
    try {
      const res = await fetch(`/api/drivers/${driverProfile.id}/online`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: onlineState })
      });
      if (res.ok) {
        setIsOnline(onlineState);
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Find incoming jobs: Orders in 'pending' or 'confirmed' state with NO driver
  // Also orders in 'ready_for_delivery' with NO driver
  const pendingJobs = orders.filter(
    o => o.status === "confirmed" && !o.driverId
  );
  
  const deliveryJobs = orders.filter(
    o => o.status === "ready_for_delivery" && !o.driverId
  );

  // Accept a pickup/delivery request
  const handleAcceptJob = async (orderId: string, isDeliveryRun = false) => {
    if (!driverProfile) return;
    
    // Assign courier driver and advance status
    const targetStatus = isDeliveryRun ? "delivery_in_progress" : "driver_assigned";
    const notesMessage = isDeliveryRun 
      ? `Courier rider accepted delivery run. Garments are traveling from workshop to Customer's destination.` 
      : `Courier rider accepted pickup run. Traveling to customer coordinates.`;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: targetStatus, 
          driverId: driverProfile.id,
          notes: notesMessage
        })
      });

      if (res.ok) {
        alert("Dispatch Job Accepted! Your GPS coordinate simulation is now active.");
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Skip simulation checkpoints manually (For quick developer UI testing)
  const handleUpdateStatus = async (status: string, notes: string) => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/orders/${activeJob.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Secure Handover OTP submission
  const handleVerifyOtp = async () => {
    if (!activeJob || !typedOtp) return;
    setIsSubmittingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch(`/api/orders/${activeJob.id}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: typedOtp })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Pristine Handover Completed! Escrow earnings added to your ledger wallet.");
        setTypedOtp("");
        onRefreshState();
      } else {
        setOtpError(data.error || "Incorrect Verification PIN.");
      }
    } catch (e) {
      setOtpError("Network error. Retry.");
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleConfirmDeliveryPhoto = async () => {
    if (!activeJob || !deliveryPhoto) return;
    setIsSubmittingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch(`/api/orders/${activeJob.id}/confirm-delivery-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: deliveryPhoto })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Konfirmasi foto berhasil! Serah terima paket selesai dan pendapatan Anda telah masuk ke dompet kurir.");
        setDeliveryPhoto(null);
        onRefreshState();
      } else {
        setOtpError(data.error || "Gagal melakukan konfirmasi serah terima.");
      }
    } catch (e) {
      setOtpError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  // Driver metrics calculations
  const myCompletedTrips = orders.filter(
    o => o.driverId === driverProfile?.id && o.status === "completed"
  );
  
  // Deliveries payout = $2.50 per delivery standard
  const mockWalletBalance = 25.00 + myCompletedTrips.length * 2.50;

  if (!driverProfile) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Loading Driver Credentials...
      </div>
    );
  }

  return (
    <div id="driver-portal-view" className="w-full max-w-7xl mx-auto px-4 py-6">
      
      {/* Top Console summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Toggle Online offline */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs text-zinc-400">Driver Console State</p>
            <h3 className="font-sans font-bold text-sm text-zinc-200 mt-1">
              Duty Status: <span className={isOnline ? "text-emerald-400 font-extrabold" : "text-rose-400 font-extrabold"}>
                {isOnline ? "ONLINE (RECEIVING DISPATCHES)" : "OFFLINE"}
              </span>
            </h3>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => handleToggleOnline(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                isOnline 
                  ? "bg-emerald-950/40 border-emerald-500 text-emerald-300" 
                  : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Go Online
            </button>
            <button
              onClick={() => handleToggleOnline(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                !isOnline 
                  ? "bg-rose-950/40 border-rose-500 text-rose-300" 
                  : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Go Offline
            </button>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Escrow Payout Ledger</p>
            <p className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">${mockWalletBalance.toFixed(2)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Includes gas allowances & base fare allocations</p>
          </div>
          <div className="bg-sky-500/10 w-12 h-12 rounded-xl flex items-center justify-center border border-sky-500/15">
            <DollarSign className="w-6 h-6 text-sky-400" />
          </div>
        </div>

        {/* Trips Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Total Completed Trips</p>
            <p className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">{driverProfile.totalDeliveries + myCompletedTrips.length}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Average rating across platform: ★ {driverProfile.ratingAvg}</p>
          </div>
          <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center border border-emerald-500/15">
            <Truck className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Active job or Pending Dispatch matchboard */}
        <div className="lg:col-span-8 space-y-6">
          {isOnline ? (
            activeJob ? (
              /* Active Job HUD Card */
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest bg-sky-950 text-sky-300 border border-sky-800/40 px-2 py-0.5 rounded uppercase">
                      KONTRAK AKTIF BERJALAN
                    </span>
                    <h3 className="font-sans font-bold text-sm text-zinc-200 mt-1">
                      Pesanan #{activeJob.orderNumber} ({activeJob.status.replace(/_/g, ' ')})
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 uppercase font-mono">Ongkos Kirim</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">+${activeJob.deliveryFee.toFixed(2)}</p>
                  </div>
                </div>

                {/* Algoritma Rute Navigasi Stepper */}
                <div className="space-y-4">
                  <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-sky-400 animate-spin" />
                    Progres Alur Rute Pengantaran (GPS Algoritma)
                  </p>

                  {/* Horizontal Stepper Timeline */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] bg-zinc-950 p-2.5 border border-zinc-850 rounded-2xl">
                    <div className={`p-1.5 rounded-xl border transition ${
                      driverSubStep === "route_to_laundry" 
                        ? "border-sky-500 bg-sky-500/10 text-sky-400 font-bold" 
                        : "border-emerald-950 bg-emerald-950/5 text-emerald-500"
                    }`}>
                      <p>1. Ke Laundry</p>
                      <p className="text-[9px] mt-0.5 opacity-80">{driverSubStep === "route_to_laundry" ? "Aktif" : "Selesai"}</p>
                    </div>
                    <div className={`p-1.5 rounded-xl border transition ${
                      driverSubStep === "take_photo" 
                        ? "border-sky-500 bg-sky-500/10 text-sky-400 font-bold animate-pulse" 
                        : driverSubStep === "route_to_recipient" 
                        ? "border-emerald-950 bg-emerald-950/5 text-emerald-500" 
                        : "border-zinc-850 text-zinc-500"
                    }`}>
                      <p>2. Ambil Foto</p>
                      <p className="text-[9px] mt-0.5 opacity-80">
                        {driverSubStep === "take_photo" ? "Berjalan" : driverSubStep === "route_to_recipient" ? "Selesai" : "Menunggu"}
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-xl border transition ${
                      driverSubStep === "route_to_recipient" && activeJob.status !== "delivered"
                        ? "border-sky-500 bg-sky-500/10 text-sky-400 font-bold" 
                        : activeJob.status === "delivered"
                        ? "border-emerald-950 bg-emerald-950/5 text-emerald-500"
                        : "border-zinc-850 text-zinc-500"
                    }`}>
                      <p>3. Ke Penerima</p>
                      <p className="text-[9px] mt-0.5 opacity-80">
                        {driverSubStep === "route_to_recipient" && activeJob.status !== "delivered" ? "Aktif" : activeJob.status === "delivered" ? "Selesai" : "Menunggu"}
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-xl border transition ${
                      activeJob.status === "delivered" 
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold animate-pulse" 
                        : "border-zinc-850 text-zinc-500"
                    }`}>
                      <p>4. Input OTP</p>
                      <p className="text-[9px] mt-0.5 opacity-80">{activeJob.status === "delivered" ? "Aktif" : "Menunggu"}</p>
                    </div>
                  </div>

                  {/* Real-time Interactive Satellite Map HUD */}
                  <div className="h-[260px] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-850/80">
                    <InteractiveMap
                      mode="tracking"
                      customerLat={activeJob.pickupLat}
                      customerLng={activeJob.pickupLng}
                      partners={partners}
                      trackingOrder={activeJob}
                    />
                  </div>

                  {/* Dynamic Interactive GPS Map Box */}
                  <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4">
                    
                    {/* LANGKAH 1: NAVIGASI KE LAUNDRY */}
                    {driverSubStep === "route_to_laundry" && activeJob.status !== "delivered" && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/15">
                            <Navigation className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-200">LANGKAH 1: Ambil Barang di Workshop Laundry</p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              Silakan menuju ke lokasi mitra laundry <strong>{partners.find(p => p.id === activeJob.partnerId)?.businessName || "Laundry Partner"}</strong> untuk mengambil pakaian.
                            </p>
                            <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl mt-2 text-[11px] text-zinc-400 space-y-1">
                              <p className="font-semibold text-zinc-300">Alamat Workshop:</p>
                              <p>{partners.find(p => p.id === activeJob.partnerId)?.businessAddress || "Jl. Senopati No. 45, Jakarta"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${partners.find(p => p.id === activeJob.partnerId)?.businessLat || -6.2240},${partners.find(p => p.id === activeJob.partnerId)?.businessLng || 106.8090}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/10"
                          >
                            🗺️ Buka Google Maps (Rute Laundry) ➔
                          </a>
                          <button
                            onClick={() => updateSubStep("take_photo")}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/10"
                          >
                            📍 Saya Sudah Tiba di Laundry
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LANGKAH 2: FOTO PENGAMBILAN BARANG */}
                    {driverSubStep === "take_photo" && activeJob.status !== "delivered" && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/15">
                            <Camera className="w-5 h-5 animate-bounce" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-zinc-200">LANGKAH 2: Ambil Foto Bukti Pengambilan Barang</p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              Harap ambil foto kantong laundry di workshop mitra untuk verifikasi keamanan pengiriman.
                            </p>
                          </div>
                        </div>

                        {/* Modul Kamera Simulasi */}
                        <div className="border border-zinc-800 bg-zinc-900 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3">
                          {pickupPhoto ? (
                            <div className="space-y-3 w-full">
                              <img 
                                src={pickupPhoto} 
                                alt="Pickup bukti" 
                                className="w-full max-h-48 object-cover rounded-xl border border-zinc-700 shadow-md"
                              />
                              <p className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                                ✓ Foto Berhasil Diambil & Disimpan!
                              </p>
                              <button
                                onClick={() => {
                                  setIsCapturingPhoto(true);
                                  setTimeout(() => {
                                    savePickupPhoto("https://images.unsplash.com/photo-1545173168-9f19072f1787?auto=format&fit=crop&q=80&w=400");
                                    setIsCapturingPhoto(false);
                                  }, 700);
                                }}
                                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold transition"
                              >
                                Ambil Ulang Foto
                              </button>
                            </div>
                          ) : (
                            <div className="py-6 space-y-3 w-full">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-750 flex items-center justify-center mx-auto text-zinc-400">
                                <Camera className="w-6 h-6" />
                              </div>
                              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                                Ketuk tombol di bawah untuk menggunakan kamera ponsel Anda atau simulasi tangkapan foto.
                              </p>
                              <button
                                onClick={() => {
                                  setIsCapturingPhoto(true);
                                  setTimeout(() => {
                                    savePickupPhoto("https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=400");
                                    setIsCapturingPhoto(false);
                                  }, 800);
                                }}
                                disabled={isCapturingPhoto}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 mx-auto"
                              >
                                {isCapturingPhoto ? (
                                  <>
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Mengambil Foto...
                                  </>
                                ) : (
                                  "📸 Ambil Foto Bukti Pengambilan"
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => updateSubStep("route_to_laundry")}
                            className="py-2 px-3 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 rounded-xl text-xs font-bold transition"
                          >
                            ⬅ Kembali
                          </button>
                          <button
                            disabled={!pickupPhoto}
                            onClick={async () => {
                              // Update order status on server to delivery_in_progress
                              await handleUpdateStatus("delivery_in_progress", "Kurir telah mengonfirmasi pengambilan pakaian dari workshop mitra dan sedang dalam rute navigasi menuju alamat penerima.");
                              updateSubStep("route_to_recipient");
                            }}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/10"
                          >
                            ✓ Konfirmasi & Mulai Rute Pengantaran
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LANGKAH 3: NAVIGASI KE PENERIMA */}
                    {driverSubStep === "route_to_recipient" && activeJob.status !== "delivered" && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/15">
                            <Navigation className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-200">LANGKAH 3: Antarkan ke Alamat Penerima (Pelanggan)</p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              Silakan antarkan pakaian bersih yang sudah terbungkus rapi ke alamat rumah pelanggan.
                            </p>
                            <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl mt-2 text-[11px] text-zinc-400 space-y-1">
                              <p className="font-semibold text-zinc-300">Alamat Penerima:</p>
                              <p>{activeJob.deliveryAddress}</p>
                              <p className="text-zinc-500 text-[10px] mt-1">Catatan: {activeJob.deliveryNotes || "Antarkan langsung ke pintu."}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.deliveryLat},${activeJob.deliveryLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition shadow-lg shadow-violet-600/10"
                          >
                            🗺️ Buka Google Maps (Rute Penerima) ➔
                          </a>
                          <button
                            onClick={() => handleUpdateStatus("delivered", "Kurir telah tiba di lokasi pelanggan, menyajikan cucian bersih, dan menunggu verifikasi OTP keamanan.")}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/10"
                          >
                            📍 Saya Sudah Sampai di Penerima
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LANGKAH 4: KONFIRMASI FOTO SERAH TERIMA */}
                    {activeJob.status === "delivered" && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
                            <Camera className="w-5 h-5 animate-bounce" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-200">LANGKAH 4: Unggah Foto Bukti Serah Terima Paket</p>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              Sebagai ganti kode OTP, silakan ambil foto pakaian bersih yang telah diserahkan langsung ke pelanggan sebagai bukti otentik pengiriman selesai.
                            </p>
                          </div>
                        </div>

                        {/* Modul Kamera Simulasi Serah Terima */}
                        <div className="border border-zinc-800 bg-zinc-900 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3">
                          {deliveryPhoto ? (
                            <div className="space-y-3 w-full">
                              <img 
                                src={deliveryPhoto} 
                                alt="Bukti serah terima" 
                                className="w-full max-h-48 object-cover rounded-xl border border-zinc-700 shadow-md"
                              />
                              <p className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                                ✓ Foto Bukti Berhasil Diambil!
                              </p>
                              <button
                                onClick={() => {
                                  setIsCapturingDeliveryPhoto(true);
                                  setTimeout(() => {
                                    saveDeliveryPhoto("https://images.unsplash.com/photo-1545173168-9f19072f1787?auto=format&fit=crop&q=80&w=400");
                                    setIsCapturingDeliveryPhoto(false);
                                  }, 700);
                                }}
                                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold transition"
                              >
                                Ambil Ulang Foto
                              </button>
                            </div>
                          ) : (
                            <div className="py-6 space-y-3 w-full">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-750 flex items-center justify-center mx-auto text-zinc-400">
                                <Camera className="w-6 h-6" />
                              </div>
                              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                                Klik tombol di bawah untuk mengambil foto penyerahan pakaian bersih ke tangan pelanggan (Simulasi GPS Kamera).
                              </p>
                              <button
                                onClick={() => {
                                  setIsCapturingDeliveryPhoto(true);
                                  setTimeout(() => {
                                    saveDeliveryPhoto("https://images.unsplash.com/photo-1545173168-9f19072f1787?auto=format&fit=crop&q=80&w=400");
                                    setIsCapturingDeliveryPhoto(false);
                                  }, 800);
                                }}
                                disabled={isCapturingDeliveryPhoto}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 mx-auto"
                              >
                                {isCapturingDeliveryPhoto ? (
                                  <>
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Mengambil Foto...
                                  </>
                                ) : (
                                  "📸 Ambil Foto Bukti Serah Terima"
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {otpError && (
                          <p className="text-xs text-rose-400 font-semibold">{otpError}</p>
                        )}

                        <div className="flex gap-2">
                          <button
                            disabled={!deliveryPhoto || isSubmittingOtp}
                            onClick={handleConfirmDeliveryPhoto}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
                          >
                            {isSubmittingOtp ? (
                              <>
                                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Memproses...
                              </>
                            ) : (
                              "✓ Konfirmasi Foto & Klaim Pendapatan Kurir"
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Detail Informasi Simulasi */}
                    <div className="text-[10px] text-zinc-500 border-t border-zinc-900 pt-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      Semua koordinat GPS berjalan real-time. Alur ini dirancang untuk kemudahan pengantaran serta akurasi rute kurir.
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              /* Dispatch Matchboard pending jobs */
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-sans font-bold text-sm text-zinc-100 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-sky-400" />
                    Available Dispatch Job Contracts
                  </h3>
                  <span className="text-[10px] bg-zinc-900 font-mono text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
                    REAL-TIME MATCHING DIRECTORY
                  </span>
                </div>

                {/* Pickup Jobs Queue */}
                <div className="space-y-3.5">
                  <p className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Awaiting Pickup Runs:</p>
                  {pendingJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700 transition flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-zinc-200">Order #{job.orderNumber}</span>
                          <span className="text-[9px] bg-sky-950/40 text-sky-300 border border-sky-900/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            {job.serviceType.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 
                            <strong className="text-zinc-300 shrink-0">Pickup:</strong> {job.pickupAddress}
                          </p>
                          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" /> 
                            <strong className="text-zinc-300 shrink-0">Workshop:</strong> Jl. Senopati No. 45
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono font-medium">Garments: {job.weightKg} Kg / {job.itemCount} Items</p>
                      </div>

                      <div className="text-right flex flex-row sm:flex-col justify-between sm:justify-center gap-2 items-center sm:items-end">
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono uppercase">Contract payout</p>
                          <p className="text-base font-mono font-extrabold text-emerald-400">${job.deliveryFee.toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => handleAcceptJob(job.id, false)}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-sky-600/10"
                        >
                          Accept Pickup Run
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Delivery Runs (Washing complete, waiting for delivery courier) */}
                  <p className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase mt-6">Awaiting Delivery Runs:</p>
                  {deliveryJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700 transition flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-zinc-200">Order #{job.orderNumber}</span>
                          <span className="text-[9px] bg-emerald-950/40 text-emerald-300 border border-emerald-900/30 px-1.5 py-0.2 rounded font-mono font-bold">
                            DELIVERY RUN
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" /> 
                            <strong className="text-zinc-300 shrink-0">Workshop:</strong> Jl. Senopati No. 45
                          </p>
                          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 
                            <strong className="text-zinc-300 shrink-0">Delivery:</strong> {job.deliveryAddress}
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono font-medium">Garments packed and sealed. Handover ready.</p>
                      </div>

                      <div className="text-right flex flex-row sm:flex-col justify-between sm:justify-center gap-2 items-center sm:items-end">
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono uppercase">Contract payout</p>
                          <p className="text-base font-mono font-extrabold text-emerald-400">${job.deliveryFee.toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => handleAcceptJob(job.id, true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-emerald-600/10"
                        >
                          Accept Delivery Run
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingJobs.length === 0 && deliveryJobs.length === 0 && (
                    <div className="p-8 border border-zinc-800 border-dashed rounded-2xl text-center text-zinc-500 text-xs">
                      🛌 Currently no active pending dispatches in your proximity radius. Active customer orders are shown here immediately.
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            /* Offline screen state warning */
            <div className="bg-zinc-900/40 border border-zinc-800 border-dashed rounded-2xl p-8 text-center text-zinc-500 text-xs h-64 flex flex-col items-center justify-center gap-2">
              <Truck className="w-10 h-10 text-zinc-600 animate-bounce" />
              <p className="font-bold text-zinc-400">Offline</p>
              <p className="max-w-xs text-zinc-500 leading-relaxed">
                Toggle your status to ONLINE to open the secure geofencing radius, connect with customer booking streams, and process delivery faires.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Driver trip logs */}
        <div className="lg:col-span-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm text-zinc-200 border-b border-zinc-800/80 pb-3">
              Trips Log & Escrow Ledger
            </h3>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 text-xs">
              {myCompletedTrips.map((o) => (
                <div key={o.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 flex justify-between items-center">
                  <div>
                    <p className="font-mono font-bold text-zinc-200">LH-{o.orderNumber}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Washing completed by partner</p>
                    <p className="text-[9px] font-mono text-zinc-500 mt-1">
                      {new Date(o.completedAt || o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded font-mono font-bold">
                      +${o.deliveryFee.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {myCompletedTrips.length === 0 && (
                <div className="text-zinc-500 text-center py-4 italic">No trips completed during this active session.</div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
