import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  ShoppingBag, 
  Star, 
  Clock, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Layers, 
  Plus, 
  CheckCircle, 
  ArrowRight,
  Info,
  ChevronRight,
  Navigation,
  FileText,
  Store,
  Sparkles,
  Camera
} from "lucide-react";
import { 
  PartnerProfile, 
  LaundryService, 
  Order, 
  BaseUser, 
  CustomerProfile, 
  WalletTransaction 
} from "../types";
import InteractiveMap from "./InteractiveMap";

interface CustomerPortalProps {
  currentUser: BaseUser;
  partners: PartnerProfile[];
  services: LaundryService[];
  orders: Order[];
  walletTransactions: WalletTransaction[];
  onRefreshState: () => void;
}

export default function CustomerPortal({
  currentUser,
  partners,
  services,
  orders,
  walletTransactions,
  onRefreshState
}: CustomerPortalProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<"home" | "order" | "history">("home");

  // Third-Party Aggregator Search, Filter and Sorting states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // "all", "wash-fold", "wash-iron", "dry-clean", "iron-only"
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "price_low" | "price_high" | "popularity">("distance");
  const [maxPriceLimit, setMaxPriceLimit] = useState<number>(15);

  // Dynamic customer coordinates
  const [customerLat, setCustomerLat] = useState<number>(-6.2088);
  const [customerLng, setCustomerLng] = useState<number>(106.8456);
  const [selectedAreaName, setSelectedAreaName] = useState<string>("Sudirman Business District, Jakarta");

  // Real Haversine Distance Calculator (km)
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Dynamic Price Range Calculator (Calculated directly from actual database/catalog services)
  const getPartnerPriceRange = (partnerId: string) => {
    const pServices = services.filter(s => s.partnerId === partnerId && s.isActive);
    if (pServices.length === 0) return { min: 0, max: 0, formatted: "N/A" };
    
    const prices = pServices.map(s => s.pricePerKg || s.pricePerItem || 0).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 0, formatted: "N/A" };
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return {
      min,
      max,
      formatted: `$${min.toFixed(2)} - $${max.toFixed(2)}`
    };
  };
  
  // New Order Wizard states
  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile | null>(null);
  const [serviceType, setServiceType] = useState<string>("wash_fold");
  const [weightKg, setWeightKg] = useState<number>(5.0);
  const [itemCount, setItemCount] = useState<number>(10);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState<string>("Apartment Grand Sudirman Tower A, Floor 18, Jakarta");
  const [pickupNotes, setPickupNotes] = useState<string>("Intercom #1802. Leave with lobby desk if unavailable.");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [promoApplied, setPromoApplied] = useState<boolean>(false);
  const [promoCode, setPromoCode] = useState<string>("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Selected active tracking order
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  // Review states
  const [reviewedOrderId, setReviewedOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Dispute states
  const [disputedOrderId, setDisputedOrderId] = useState<string | null>(null);
  const [disputeType, setDisputeType] = useState<"damage" | "lost_item" | "wrong_order" | "other">("wrong_order");
  const [disputeDescription, setDisputeDescription] = useState<string>("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);

  // Interaktivitas Tambahan: States untuk Top-Up Dompet & Kalkulator Simulasi Biaya
  const [isTopUpOpen, setIsTopUpOpen] = useState<boolean>(false);
  const [topUpRupiah, setTopUpRupiah] = useState<number>(100000);
  const [topUpProvider, setTopUpProvider] = useState<string>("BCA");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState<boolean>(false);

  // Interactive Cost & Perfume simulator states
  const [calcWeight, setCalcWeight] = useState<number>(3);
  const [calcCategory, setCalcCategory] = useState<string>("wash-fold");
  const [calcPerfume, setCalcPerfume] = useState<string>("Lavender Blossom");
  const [calcPerfumeStrength, setCalcPerfumeStrength] = useState<"normal" | "extra">("normal");
  const [calcSpeed, setCalcSpeed] = useState<"regular" | "express">("regular");

  // Map location change handler
  const handleMapLocationChange = (lat: number, lng: number) => {
    setCustomerLat(lat);
    setCustomerLng(lng);
    setSelectedAreaName(`Custom Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    setPickupAddress(`Apartment Grand Royal Custom Pin, Lantai 12, Jakarta`);
  };

  // Canvas Map Ref for real-time driver tracking rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Find active ongoing order for quick shortcut
  const activeOrder = orders.find(o => o.status !== "completed" && o.status !== "cancelled");

  // Load tracking details automatically if there's an active order
  useEffect(() => {
    if (activeOrder && !trackingOrderId) {
      setTrackingOrderId(activeOrder.id);
    }
  }, [activeOrder, trackingOrderId]);

  // Polling for active tracking order coordinates and status updates
  useEffect(() => {
    if (!trackingOrderId) return;

    const fetchOrderUpdate = async () => {
      try {
        const res = await fetch(`/api/orders/${trackingOrderId}`);
        if (res.ok) {
          const data = await res.json();
          setTrackingOrder(data);
        }
      } catch (err) {
        console.error("Error polling tracking details:", err);
      }
    };

    fetchOrderUpdate();
    const interval = setInterval(fetchOrderUpdate, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [trackingOrderId]);

  // Handle HTML5 Canvas Drawing for live geospatial driver routing simulation
  useEffect(() => {
    if (!canvasRef.current || !trackingOrder) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw mock city grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background style
    ctx.fillStyle = "#18181b"; // dark slate bg
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Mock Roads
    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 4;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Get coordinates relative to map bounds
    // Map Jakarta coordinates (-6.2300 to -6.1800, 106.8000 to 106.8600) to 0..400px
    const minLat = -6.2350;
    const maxLat = -6.1800;
    const minLng = 106.8000;
    const maxLng = 106.8600;

    const getXY = (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * canvas.width;
      // Invert Y since canvas Y goes down but Latitude increases going north
      const y = canvas.height - ((lat - minLat) / (maxLat - minLat)) * canvas.height;
      return { x, y };
    };

    const customerPos = getXY(trackingOrder.pickupLat, trackingOrder.pickupLng);
    
    const partner = partners.find(p => p.id === trackingOrder.partnerId);
    const partnerPos = partner ? getXY(partner.businessLat, partner.businessLng) : { x: 100, y: 100 };
    const driverPos = getXY(trackingOrder.currentLat, trackingOrder.currentLng);

    // Draw Route paths (Line)
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#38bdf8"; // sky blue path line
    ctx.lineWidth = 2;
    ctx.moveTo(customerPos.x, customerPos.y);
    ctx.lineTo(partnerPos.x, partnerPos.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 1. Draw Customer Home Marker
    ctx.beginPath();
    ctx.arc(customerPos.x, customerPos.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "#10b981"; // Emerald
    ctx.fill();
    ctx.strokeStyle = "#047857";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("H", customerPos.x - 3, customerPos.y + 3);

    // 2. Draw Laundry Partner Workshop Marker
    ctx.beginPath();
    ctx.arc(partnerPos.x, partnerPos.y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = "#8b5cf6"; // Violet
    ctx.fill();
    ctx.strokeStyle = "#6d28d9";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("W", partnerPos.x - 4, partnerPos.y + 3);

    // 3. Draw Active Courier Driver Position
    if (trackingOrder.driverId) {
      ctx.beginPath();
      ctx.arc(driverPos.x, driverPos.y, 11, 0, 2 * Math.PI);
      ctx.fillStyle = "#0284c7"; // Sky blue
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw outer pulse halo to indicate real-time tracking
      ctx.beginPath();
      ctx.arc(driverPos.x, driverPos.y, 18, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("🚚", driverPos.x - 6, driverPos.y + 3);
    }

    // Legend label details
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(10, 10, 150, 75);
    ctx.strokeStyle = "#3f3f46";
    ctx.strokeRect(10, 10, 150, 75);

    ctx.fillStyle = "#10b981";
    ctx.beginPath(); ctx.arc(20, 22, 4, 0, 2*Math.PI); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "10px sans-serif"; ctx.fillText("Your Apartment (H)", 30, 25);

    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath(); ctx.arc(20, 42, 4, 0, 2*Math.PI); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillText("Partner Workshop (W)", 30, 45);

    ctx.fillStyle = "#0284c7";
    ctx.beginPath(); ctx.arc(20, 62, 4, 0, 2*Math.PI); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillText("Uber Courier (Active)", 30, 65);

  }, [trackingOrder, partners]);

  // Calculations for Wizard prices
  const baseDeliveryFee = 2.00;
  const deliveryDistanceFee = 0.50; // per standard pickup-delivery distance of 1.5km = 0.75
  const estimatedDeliveryDistance = 1.8; // mock km
  const deliveryFee = baseDeliveryFee + estimatedDeliveryDistance * deliveryDistanceFee;
  
  // Calculate pricing subtotal
  const selectedPartnerServices = selectedPartner ? services.filter(s => s.partnerId === selectedPartner.id) : [];
  const currentService = selectedPartnerServices.find(s => s.categoryId === `cat-${serviceType}`) || selectedPartnerServices[0];
  const unitPrice = currentService ? (currentService.pricePerKg || currentService.pricePerItem || 1.50) : 1.50;
  const isWeightBased = serviceType === "wash_fold" || serviceType === "wash_iron";
  
  const subtotal = isWeightBased ? (weightKg * unitPrice) : (itemCount * unitPrice);
  const serviceFee = 1.00;
  const platformFee = 0.50;
  const discount = promoApplied ? 3.00 : 0.00;
  const totalAmount = subtotal + serviceFee + deliveryFee + platformFee - discount;

  // Active user wallet balance
  const activeUserWalletTransactions = walletTransactions.filter(t => t.userId === currentUser.id);
  const currentWalletBalance = activeUserWalletTransactions.reduce((acc, t) => {
    return t.type === "deposit" || t.type === "refund" ? acc + t.amount : acc - t.amount;
  }, 0);

  // Apply promo helper
  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "LAUNDRY50" || promoCode.trim().toUpperCase() === "UBERFRESH") {
      setPromoApplied(true);
      alert("Kode promo berhasil digunakan! Diskon $3.00 (Rp 45.000) telah dipasang.");
    } else {
      alert("Kode promo salah. Gunakan kode 'UBERFRESH' untuk diskon.");
    }
  };

  // Submit real top-up deposit
  const handleTopUp = async () => {
    if (topUpRupiah <= 0) return;
    setIsSubmittingTopUp(true);
    // Convert Rupiah to USD ($1 = Rp 15.000)
    const usdAmount = parseFloat((topUpRupiah / 15000).toFixed(2));
    
    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: usdAmount,
          provider: topUpProvider,
          description: `Isi Saldo Mandiri via ${topUpProvider}`
        })
      });

      if (response.ok) {
        alert(`Sukses! Pengisian saldo sebesar Rp ${topUpRupiah.toLocaleString("id-ID")} (setara $${usdAmount.toFixed(2)}) berhasil diproses secara real-time.`);
        setIsTopUpOpen(false);
        onRefreshState();
      } else {
        alert("Gagal melakukan top-up. Silakan coba kembali.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // Submit new order
  const handlePlaceOrder = async () => {
    if (!selectedPartner) return;
    setIsSubmittingOrder(true);

    const orderPayload = {
      customerId: "cust-1", // mock client profile
      partnerId: selectedPartner.id,
      serviceType,
      weightKg,
      itemCount,
      specialInstructions,
      pickupAddress,
      pickupLat: -6.2088,
      pickupLng: 106.8456,
      pickupNotes,
      deliveryAddress: pickupAddress,
      deliveryLat: -6.2088,
      deliveryLng: 106.8456,
      deliveryNotes: pickupNotes,
      subtotal: parseFloat(subtotal.toFixed(2)),
      serviceFee,
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      platformFee,
      discount: parseFloat(discount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      paymentMethod
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        const orderData = await response.json();
        setTrackingOrderId(orderData.id);
        setTrackingOrder(orderData);
        onRefreshState();
        setActiveTab("home");
        alert(`Order ${orderData.orderNumber} successfully booked! Dynamic routing matches are active.`);
      } else {
        alert("Could not process transaction. Check inputs.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Submit rating and review
  const handleSubmitReview = async () => {
    if (!reviewedOrderId || !trackingOrder) return;
    setIsSubmittingReview(true);

    const reviewPayload = {
      orderId: reviewedOrderId,
      reviewerId: currentUser.id,
      targetUserId: trackingOrder.partnerId, // review partner
      targetType: "partner",
      rating: reviewRating,
      comment: reviewComment
    };

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewPayload)
      });

      if (response.ok) {
        alert("Thank you! Review submitted successfully. Ratings updated across platforms.");
        setReviewedOrderId(null);
        setReviewComment("");
        onRefreshState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Submit dispute tickets
  const handleSubmitDispute = async () => {
    if (!disputedOrderId || !trackingOrder) return;
    setIsSubmittingDispute(true);

    const disputePayload = {
      orderId: disputedOrderId,
      raisedBy: currentUser.id,
      against: trackingOrder.partnerId,
      type: disputeType,
      description: disputeDescription
    };

    try {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disputePayload)
      });

      if (response.ok) {
        alert("Dispute ticket filed successfully. Super admins are notified to investigate.");
        setDisputedOrderId(null);
        setDisputeDescription("");
        onRefreshState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <div id="customer-portal-view" className="w-full max-w-7xl mx-auto px-4 py-6">
      
      {/* Upper Navigation Tabs */}
      <div className="flex border-b border-zinc-800 gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("home")}
          className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === "home" 
              ? "border-sky-500 text-sky-400" 
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          🔍 Eksplorasi Mitra & Pelacakan GPS
        </button>
        <button
          onClick={() => {
            setSelectedPartner(partners[0]);
            setActiveTab("order");
          }}
          className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === "order" 
              ? "border-sky-500 text-sky-400" 
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          🧺 Pesan Antar-Jemput (Pickup)
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === "history" 
              ? "border-sky-500 text-sky-400" 
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          📄 Riwayat Transaksi & Dompet ({orders.filter(o => o.customerId === "cust-1").length})
        </button>
      </div>

      {/* --- TAB 1: HOME & TRACKING --- */}
      {activeTab === "home" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel: Live Tracking (Primary visual element if active) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {trackingOrder ? (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border-b border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono tracking-wider bg-sky-500/10 text-sky-300 border border-sky-800/30 px-2 py-0.5 rounded-full uppercase">
                      Real-Time GPS Tracking
                    </span>
                    <h3 className="font-sans font-bold text-sm text-zinc-100 mt-1">
                      Tracking Order {trackingOrder.orderNumber}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Total Charged</p>
                    <p className="text-xs font-mono font-bold text-sky-400">${trackingOrder.totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* Interactive Real-Time Satellite Tracking Map */}
                <div className="relative h-[320px] w-full bg-zinc-950">
                  <InteractiveMap
                    mode="tracking"
                    customerLat={customerLat}
                    customerLng={customerLng}
                    partners={partners}
                    trackingOrder={trackingOrder}
                  />
                  <div className="absolute bottom-3 right-3 z-[1000] bg-zinc-950/90 border border-zinc-800/80 rounded-lg p-2.5 max-w-[200px] text-[10px] text-zinc-400 shadow-xl leading-relaxed">
                    <span className="font-bold text-zinc-200 block mb-1">💡 Simulator GPS Peta:</span>
                    LOKASI KURIR terupdate secara otomatis dari satelit. Setiap beberapa detik koordinat GPS kurir bergerak mendekati workshop atau rumah Anda.
                  </div>
                </div>

                {/* Tracking order info status box */}
                <div className="p-5 border-t border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4">
                    <div>
                      <p className="text-xs text-zinc-400">Current Status</p>
                      <p className="text-sm font-extrabold text-zinc-100 uppercase tracking-wide flex items-center gap-2 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                        {trackingOrder.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {trackingOrder.otpCode && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-center">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Secure Delivery OTP</p>
                        <p className="text-sm font-extrabold font-mono text-emerald-400 tracking-widest mt-0.5">{trackingOrder.otpCode}</p>
                      </div>
                    )}
                  </div>

                  {/* Courier Details */}
                  {trackingOrder.driverId ? (
                    <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs overflow-hidden border border-zinc-700">
                          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" alt="Budi Courier" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-200">Courier: Budi Santoso</p>
                          <p className="text-[10px] text-sky-400 mt-0.5 font-mono">Honda Vario Scooter (B 1234 SDU)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/50 px-2 py-0.5 rounded-full">
                          ★ 4.8
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3 mb-4 text-center">
                      <p className="text-xs text-zinc-400 font-sans">
                        ⏳ Looking for nearby courier rider. First-accept assignment is active...
                      </p>
                    </div>
                  )}

                  {/* Tracking Milestones timeline */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Routing Milestones:</p>
                    {trackingOrder.trackingHistory.slice().reverse().map((hist, i) => (
                      <div key={i} className="flex gap-3 text-xs items-start">
                        <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shadow shadow-sky-500/50" />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-zinc-200 capitalize">{hist.status.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {new Date(hist.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">{hist.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions for active tracking order */}
                  <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-zinc-800/80">
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to cancel this order? Only pending/confirmed orders can be cancelled without cancellation fee.")) {
                          const res = await fetch(`/api/orders/${trackingOrder.id}/cancel`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reason: "Cancelled by Customer" })
                          });
                          if (res.ok) {
                            alert("Order cancelled successfully");
                            onRefreshState();
                          }
                        }
                      }}
                      disabled={trackingOrder.status === "cancelled" || trackingOrder.status === "completed" || ["picked_up", "in_processing", "ready_for_delivery", "delivery_in_progress", "delivered"].includes(trackingOrder.status)}
                      className="px-4 py-2 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/50 disabled:opacity-40 disabled:pointer-events-none text-rose-300 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel Order
                    </button>

                    {trackingOrder.status === "delivered" && (
                      <div className="w-full bg-emerald-950/20 border border-emerald-900/60 rounded-xl p-3 mt-3">
                        <p className="text-xs text-emerald-300 font-bold mb-1.5">🔑 Action Required:</p>
                        <p className="text-[11px] text-zinc-400 mb-2">
                          Your courier is at your door! Show them the code <span className="font-mono font-bold text-emerald-400">{trackingOrder.otpCode}</span> or complete order directly below:
                        </p>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/orders/${trackingOrder.id}/verify-otp`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ otp: trackingOrder.otpCode })
                            });
                            if (res.ok) {
                              alert("Order completed! You can now review your experiences.");
                              setReviewedOrderId(trackingOrder.id);
                              onRefreshState();
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/10 transition"
                        >
                          Confirm Handover & Complete Order
                        </button>
                      </div>
                    )}

                    {trackingOrder.status === "completed" && (
                      <div className="w-full flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setReviewedOrderId(trackingOrder.id);
                            setDisputedOrderId(null);
                          }}
                          className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold text-center"
                        >
                          ★ Review Experience
                        </button>
                        <button
                          onClick={() => {
                            setDisputedOrderId(trackingOrder.id);
                            setReviewedOrderId(null);
                          }}
                          className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-rose-400 border border-zinc-700 rounded-xl text-xs font-bold text-center"
                        >
                          ⚠ Raise Dispute
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-400 flex flex-col items-center justify-center h-full min-h-[350px]">
                <ShoppingBag className="w-12 h-12 text-zinc-600 mb-3" />
                <h4 className="font-sans font-bold text-sm text-zinc-300">No Active Orders Tracking</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                  Book a new pickup service on the next tab to experience real-time courier matching and visual GPS map simulations.
                </p>
                <button
                  onClick={() => {
                    setSelectedPartner(partners[0]);
                    setActiveTab("order");
                  }}
                  className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-sky-600/10"
                >
                  Book New Service
                </button>
              </div>
            )}
          </div>

          {/* Right panel: Partners Directory & Wallet Summary */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Dompet Laundry & Top-up Interaktif */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Saldo Dompet Laundry Anda</p>
                  <p className="text-2xl font-extrabold font-mono text-white mt-1">
                    Rp {(currentWalletBalance * 15000).toLocaleString("id-ID")}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">Setara dengan: ${currentWalletBalance.toFixed(2)} USD</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 w-12 h-12 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              {/* Collapsible Interactive Top-Up Form */}
              {!isTopUpOpen ? (
                <div className="flex gap-2 text-[11px] text-zinc-500 items-center justify-between border-t border-zinc-800/60 pt-3">
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Pembayaran Escrow Kurir Aman
                  </span>
                  <button
                    onClick={() => setIsTopUpOpen(true)}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer bg-sky-950/20 border border-sky-900/40 px-2.5 py-1 rounded-lg transition"
                  >
                    + Isi Saldo (Top-Up)
                  </button>
                </div>
              ) : (
                <div className="border-t border-zinc-800/80 pt-3.5 mt-2.5 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">Simulasi Pengisian Saldo</span>
                    <button 
                      onClick={() => setIsTopUpOpen(false)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-350"
                    >
                      Batal
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div>
                    <span className="text-[9px] font-mono text-zinc-400 block mb-1.5 uppercase">Pilih Jumlah Nominal:</span>
                    <div className="grid grid-cols-3 gap-1.5 font-mono">
                      {[50000, 100000, 250000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTopUpRupiah(val)}
                          className={`py-1.5 rounded-lg text-xs transition cursor-pointer ${
                            topUpRupiah === val
                              ? "bg-sky-500 text-white font-bold"
                              : "bg-zinc-950 text-zinc-400 border border-zinc-850 hover:text-white"
                          }`}
                        >
                          Rp {(val/1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Provider Grid */}
                  <div>
                    <span className="text-[9px] font-mono text-zinc-400 block mb-1.5 uppercase">Metode Pembayaran:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["BCA", "GoPay", "OVO", "Mandiri"].map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => setTopUpProvider(prov)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            topUpProvider === prov
                              ? "bg-emerald-500 text-white"
                              : "bg-zinc-950 text-zinc-400 border border-zinc-850 hover:text-white"
                          }`}
                        >
                          {prov}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Input */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">Rp</span>
                    <input 
                      type="number" 
                      value={topUpRupiah} 
                      onChange={(e) => setTopUpRupiah(Math.max(0, parseInt(e.target.value) || 0))} 
                      className="flex-1 bg-zinc-950 border border-zinc-850 p-1.5 text-xs text-white rounded font-mono"
                    />
                  </div>

                  <button
                    onClick={handleTopUp}
                    disabled={isSubmittingTopUp || topUpRupiah <= 0}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition duration-150 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
                  >
                    {isSubmittingTopUp ? "Sedang Memproses..." : "Konfirmasi Top-Up Sekarang"}
                  </button>
                </div>
              )}
            </div>

            {/* Kalkulator Simulasi Tarif & Pewangi Interaktif */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col space-y-4 bg-gradient-to-br from-zinc-900 to-zinc-950">
              <div>
                <h3 className="font-sans font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Kalkulator Simulasi Tarif & Pewangi
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Gunakan simulasi interaktif ini untuk memprediksi biaya, memilih aroma pewangi khas, serta menentukan durasi pengerjaan.
                </p>
              </div>

              {/* Slider for weight */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Estimasi Berat Pakaian:</span>
                  <span className="text-sky-400 font-bold font-mono">{calcWeight} kg</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  step="0.5" 
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-500 block mb-1">Pilih Jenis Layanan:</span>
                  <select
                    value={calcCategory}
                    onChange={(e) => setCalcCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-1.5 text-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  >
                    <option value="wash-fold">Cuci Lipat (Kiloan)</option>
                    <option value="wash-iron">Cuci Setrika</option>
                    <option value="iron-only">Setrika Saja</option>
                  </select>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Kecepatan Pengerjaan:</span>
                  <select
                    value={calcSpeed}
                    onChange={(e: any) => setCalcSpeed(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-1.5 text-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  >
                    <option value="regular">Reguler (24 Jam)</option>
                    <option value="express">Express (6-12 Jam) (+50%)</option>
                  </select>
                </div>
              </div>

              {/* Perfume selections */}
              <div className="space-y-2 border-t border-zinc-800/60 pt-3">
                <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">Aroma Pewangi Premium (Gratis):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { name: "Lavender Blossom", color: "from-violet-500/20 to-indigo-500/10 border-violet-500/30", text: "text-violet-400" },
                    { name: "Downy Mystique", color: "from-pink-500/20 to-rose-500/10 border-pink-500/30", text: "text-pink-400" },
                    { name: "Ocean Breeze", color: "from-sky-500/20 to-blue-500/10 border-sky-500/30", text: "text-sky-400" }
                  ].map((frag) => (
                    <button
                      key={frag.name}
                      type="button"
                      onClick={() => setCalcPerfume(frag.name)}
                      className={`p-1.5 rounded-lg border text-[10px] font-medium text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        calcPerfume === frag.name
                          ? `${frag.color} border-sky-500 bg-sky-950/20 font-bold ${frag.text}`
                          : "border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span>🌸</span>
                      <span className="mt-0.5">{frag.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Perfume Strength Slider */}
                <div className="flex items-center justify-between text-[11px] bg-zinc-950 p-2 rounded-lg border border-zinc-850 mt-1">
                  <span className="text-zinc-400">Kepekatan Parfum:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCalcPerfumeStrength("normal")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        calcPerfumeStrength === "normal"
                          ? "bg-zinc-800 text-sky-400"
                          : "text-zinc-500 hover:text-zinc-350"
                      }`}
                    >
                      Sedang
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcPerfumeStrength("extra")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        calcPerfumeStrength === "extra"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "text-zinc-500 hover:text-zinc-350"
                      }`}
                    >
                      Ekstra Harum (+Rp 5k)
                    </button>
                  </div>
                </div>
              </div>

              {/* Display simulated calculations */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 flex items-center justify-between text-xs mt-1.5">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase font-mono font-bold">Estimasi Total Biaya:</p>
                  <p className="text-md font-bold font-mono text-emerald-400 mt-0.5">
                    Rp {(() => {
                      let basePrice = calcCategory === "wash-fold" ? 10000 : calcCategory === "wash-iron" ? 15000 : 7000;
                      let total = basePrice * calcWeight;
                      if (calcSpeed === "express") total *= 1.5;
                      if (calcPerfumeStrength === "extra") total += 5000;
                      return Math.round(total).toLocaleString("id-ID");
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Set booking inputs automatically!
                    setServiceType(calcCategory.replace("-", "_"));
                    setWeightKg(calcWeight);
                    setSpecialInstructions(`Parfum: ${calcPerfume} (${calcPerfumeStrength === "extra" ? "Ekstra Harum" : "Normal"}), Pengerjaan: ${calcSpeed === "express" ? "Express" : "Regular"}`);
                    setActiveTab("order");
                    alert(`Simulasi berhasil diterapkan ke form pemesanan! Silakan pilih mitra laundry Anda.`);
                  }}
                  className="px-2.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] rounded-lg transition cursor-pointer shrink-0"
                >
                  Gunakan Simulasi Ini ➔
                </button>
              </div>
            </div>

            {/* Partners Aggregator Directory */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col space-y-4">
              <div>
                <h3 className="font-sans font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Store className="w-4 h-4 text-violet-400" />
                  Direktori Jasa Laundry Sekitar Anda (Pihak Ketiga)
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Kami bertindak sebagai <strong>pihak ketiga</strong> yang mengagregasikan usaha laundry lokal terdekat. Kami menjamin kurir pengiriman, asuransi pakaian hilang, dan pembayaran aman (escrow).
                </p>
              </div>

              {/* MODUL INTEGRASI GOOGLE MAPS & APPLE MAPS INTERAKTIF */}
              <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-[10px] font-mono tracking-wider text-sky-400 uppercase font-extrabold flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    🛰️ Peta Satelit Interaktif Jasa Laundry Terdekat
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Lokasi Anda: {customerLat.toFixed(4)}, {customerLng.toFixed(4)}
                  </span>
                </div>

                {/* Live Real-World Satellite Map Component */}
                <div className="h-[280px] w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/80">
                  <InteractiveMap
                    mode="directory"
                    customerLat={customerLat}
                    customerLng={customerLng}
                    onCustomerLocationChange={handleMapLocationChange}
                    partners={partners}
                    selectedPartnerId={selectedPartner?.id}
                    onSelectPartner={(partnerId) => {
                      const p = partners.find(x => x.id === partnerId);
                      if (p) {
                        setSelectedPartner(p);
                        setActiveTab("order");
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  💡 <strong className="text-zinc-300">Tips Peta:</strong> Klik di mana saja pada peta atau geser pin hijau untuk mengubah titik lokasi penjemputan Anda secara real-time. Klik ikon laundry warna ungu untuk melihat nama toko dan klik <strong>"Pilih Mitra"</strong> untuk memesan!
                </p>

                <div className="space-y-2 pt-2 border-t border-zinc-850">
                  <label className="block text-[11px] font-bold text-zinc-300">
                    Atau Pilih Lokasi Cepat (Simulasi Area Jakarta):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { name: "Sudirman", area: "Sudirman Business District, Jakarta", lat: -6.2088, lng: 106.8456 },
                      { name: "Senopati", area: "Senopati, Jakarta Selatan", lat: -6.2244, lng: 106.8090 },
                      { name: "Menteng", area: "Menteng, Jakarta Pusat", lat: -6.1956, lng: 106.8312 },
                      { name: "Kemang", area: "Kemang, Jakarta Selatan", lat: -6.2731, lng: 106.8106 },
                      { name: "Kelapa Gading", area: "Kelapa Gading, Jakarta Utara", lat: -6.1554, lng: 106.9024 }
                    ].map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => {
                          setCustomerLat(loc.lat);
                          setCustomerLng(loc.lng);
                          setSelectedAreaName(loc.area);
                          // Automatically pre-fill pickup address form with chosen area
                          setPickupAddress(`Apartment Grand Royal ${loc.name} Tower B, Jakarta`);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition ${
                          selectedAreaName.includes(loc.name)
                            ? "bg-indigo-600 text-white shadow shadow-indigo-600/30"
                            : "bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800"
                        }`}
                      >
                        📍 {loc.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Saat ini Anda di: <strong className="text-zinc-300">{selectedAreaName}</strong>. Jarak ke semua mitra laundry terhitung real-time menggunakan koordinat GPS ini.
                  </p>
                </div>

                {/* External Maps Launcher & New Partner Register */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-850">
                  <div className="flex gap-1.5">
                    <a
                      href={`https://www.google.com/maps/search/laundry+near+${customerLat},${customerLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-sky-950/40 hover:bg-sky-900/40 border border-sky-900/35 rounded-lg text-[10px] font-bold text-sky-400 text-center flex items-center justify-center gap-1 transition"
                    >
                      🌐 Cari Google Maps ➔
                    </a>
                    <a
                      href={`maps://?q=laundry&sll=${customerLat},${customerLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300 text-center flex items-center justify-center gap-1 transition"
                    >
                      🍎 Cari Apple Maps ➔
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      const name = prompt("Masukkan nama Toko Laundry baru sekitar area Anda:");
                      if (!name) return;
                      const address = prompt("Masukkan alamat lengkap Toko Laundry baru:", "Jl. Kenangan No. 12, Jakarta");
                      if (!address) return;
                      const customLat = customerLat + (Math.random() - 0.5) * 0.02;
                      const customLng = customerLng + (Math.random() - 0.5) * 0.02;

                      // Submit a new partner dynamically on server!
                      fetch("/api/partners", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          businessName: name,
                          businessAddress: address,
                          description: "Mitra baru yang didaftarkan langsung oleh pelanggan di area sekitar.",
                          email: `${name.toLowerCase().replace(/\s+/g, "")}@example.com`,
                          phone: "08123456789",
                          businessLat: customLat,
                          businessLng: customLng,
                          logoUrl: "https://images.unsplash.com/photo-1545173168-9f19072f1787?auto=format&fit=crop&q=80&w=200",
                          capacityKg: 100,
                          ratingAvg: 5.0
                        })
                      }).then((res) => {
                        if (res.ok) {
                          alert(`Sukses! Toko Laundry "${name}" berhasil didaftarkan di sekitar area ${selectedAreaName} sebagai mitra baru.`);
                          onRefreshState();
                        } else {
                          alert("Gagal mendaftarkan mitra baru.");
                        }
                      });
                    }}
                    className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-lg shadow-emerald-600/10 cursor-pointer"
                  >
                    ➕ Jadikan Laundry Sekitar Sebagai Mitra Baru
                  </button>
                </div>
              </div>

              {/* 1. Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Cari nama laundry, alamat, atau spesialisasi..."
                  className="w-full bg-zinc-950 text-xs border border-zinc-850 p-2.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-zinc-200"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* 2. Category Filter Pills */}
              <div>
                <p className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase mb-2">Pilih Layanan / Kategori:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", name: "Semua" },
                    { id: "wash-fold", name: "Cuci Lipat (Kiloan)" },
                    { id: "wash-iron", name: "Cuci Setrika" },
                    { id: "dry-clean", name: "Dry Clean & Premium" },
                    { id: "iron-only", name: "Setrika Saja" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                        categoryFilter === cat.id
                          ? "bg-sky-500 text-white font-bold"
                          : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Sorting and Pricing Budget Controls */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Urutkan (Sort):</label>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="w-full bg-zinc-950 text-[11px] border border-zinc-850 p-2 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                  >
                    <option value="distance">📍 Terdekat (Nearest)</option>
                    <option value="rating">⭐️ Rating Tertinggi</option>
                    <option value="price_low">💵 Harga Terendah</option>
                    <option value="price_high">💎 Harga Termahal</option>
                    <option value="popularity">🔥 Paling Populer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Max Tarif Layanan:</label>
                  <select
                    value={maxPriceLimit}
                    onChange={(e) => setMaxPriceLimit(parseFloat(e.target.value))}
                    className="w-full bg-zinc-950 text-[11px] border border-zinc-850 p-2 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="20">Semua Harga</option>
                    <option value="12">Di bawah $12 (Rp 180rb)</option>
                    <option value="5">Di bawah $5 (Rp 75rb)</option>
                    <option value="2">Di bawah $2 (Rp 30rb)</option>
                  </select>
                </div>
              </div>

              {/* Verified Platform Guarantee Indicator */}
              <div className="bg-sky-950/25 border border-sky-900/35 p-2 rounded-xl text-[10px] text-sky-400 leading-relaxed flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>Setiap mitra laundry telah melalui sertifikasi uji higienitas air & detergen. Dilindungi asuransi platform s/d Rp 500.000.</span>
              </div>

              {/* 4. Partner List Items */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {partners
                  .filter(p => p.isApproved)
                  .filter(p => {
                    // Search Match
                    const matchesSearch = 
                      p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.businessAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.description.toLowerCase().includes(searchQuery.toLowerCase());
                    
                    if (!matchesSearch) return false;

                    // Category Match
                    if (categoryFilter !== "all") {
                      const pServices = services.filter(s => s.partnerId === p.id && s.isActive);
                      const hasCategory = pServices.some(s => s.categoryId === `cat-${categoryFilter}`);
                      if (!hasCategory) return false;
                    }

                    // Price Limit Match (Check minimum price matches budget)
                    const range = getPartnerPriceRange(p.id);
                    if (range.min > maxPriceLimit) return false;

                    return true;
                  })
                  .sort((a, b) => {
                    const distA = getDistance(customerLat, customerLng, a.businessLat, a.businessLng);
                    const distB = getDistance(customerLat, customerLng, b.businessLat, b.businessLng);

                    if (sortBy === "distance") {
                      return distA - distB;
                    }
                    if (sortBy === "rating") {
                      return b.ratingAvg - a.ratingAvg;
                    }
                    if (sortBy === "price_low") {
                      const minA = getPartnerPriceRange(a.id).min;
                      const minB = getPartnerPriceRange(b.id).min;
                      return minA - minB;
                    }
                    if (sortBy === "price_high") {
                      const maxA = getPartnerPriceRange(a.id).max;
                      const maxB = getPartnerPriceRange(b.id).max;
                      return maxB - maxA;
                    }
                    if (sortBy === "popularity") {
                      return b.totalOrders - a.totalOrders;
                    }
                    return 0;
                  })
                  .map((p) => {
                    const distance = getDistance(customerLat, customerLng, p.businessLat, p.businessLng);
                    const range = getPartnerPriceRange(p.id);
                    // Convert standard USD price catalog to Rupiah for perfect Indonesian context
                    const minRupiah = Math.round(range.min * 15000).toLocaleString("id-ID");
                    const maxRupiah = Math.round(range.max * 15000).toLocaleString("id-ID");
                    const formattedRupiahRange = `Rp ${minRupiah} - Rp ${maxRupiah}`;

                    return (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setSelectedPartner(p);
                          setActiveTab("order");
                        }}
                        className="group bg-zinc-950 border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40 p-3 rounded-xl transition cursor-pointer flex gap-3"
                      >
                        <img 
                          src={p.logoUrl} 
                          alt={p.businessName} 
                          className="w-12 h-12 rounded-lg object-cover border border-zinc-800 shrink-0 self-start" 
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="text-[11px] font-bold text-zinc-200 truncate group-hover:text-sky-400 transition">
                              {p.businessName}
                            </h4>
                            <div className="flex items-center gap-1 font-mono text-[9px] text-amber-400 shrink-0 bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.2 rounded">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />
                              {p.ratingAvg > 0 ? p.ratingAvg.toFixed(1) : "New"}
                            </div>
                          </div>

                          <p className="text-[10px] text-zinc-400 line-clamp-1.5 leading-relaxed">
                            {p.description}
                          </p>

                          {/* Dynamic Price Range Indicator */}
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                            <span>Range Tarif:</span>
                            <span className="font-mono bg-emerald-950/15 border border-emerald-900/20 px-1 py-0.2 rounded text-[9px]">
                              {formattedRupiahRange}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">(${range.min.toFixed(2)} - ${range.max.toFixed(2)})</span>
                          </div>

                          {/* Direct External Maps Launch Row */}
                          <div className="flex gap-2 pt-1.5" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${p.businessLat},${p.businessLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 hover:text-sky-400 border border-zinc-800 rounded text-[9px] font-bold text-zinc-400 transition flex items-center gap-1 cursor-pointer"
                            >
                              🗺️ Buka Rute Google Maps ➔
                            </a>
                            <a
                              href={`maps://?daddr=${p.businessLat},${p.businessLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 hover:text-zinc-200 border border-zinc-800 rounded text-[9px] font-bold text-zinc-400 transition flex items-center gap-1 cursor-pointer"
                            >
                              🍎 Buka Apple Maps
                            </a>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-900 text-[9px] text-zinc-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-600" /> 
                              <span>{distance} km</span>
                              <span className="text-zinc-700">•</span>
                              <span className="truncate max-w-[120px]">{p.businessAddress}</span>
                            </span>
                            <span className="text-sky-400 font-bold group-hover:underline flex items-center shrink-0">
                              Pilih Jasa <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Empty State */}
                {partners.filter(p => p.isApproved).filter(p => {
                  const matchesSearch = 
                    p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.businessAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  if (!matchesSearch) return false;

                  if (categoryFilter !== "all") {
                    const pServices = services.filter(s => s.partnerId === p.id && s.isActive);
                    const hasCategory = pServices.some(s => s.categoryId === `cat-${categoryFilter}`);
                    if (!hasCategory) return false;
                  }

                  const range = getPartnerPriceRange(p.id);
                  if (range.min > maxPriceLimit) return false;

                  return true;
                }).length === 0 && (
                  <p className="text-center text-[11px] text-zinc-500 italic py-6">
                    Tidak ada jasa laundry yang cocok dengan kriteria pencarian/filter Anda.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* --- TAB 2: ORDER WIZARD --- */}
      {activeTab === "order" && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800">
            <h2 className="font-sans font-extrabold text-base text-zinc-100">Book Premium Laundry Pickup</h2>
            <p className="text-xs text-zinc-400 mt-1">Configure your laundry items, schedule coordinates, and choose a verified partner.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left panel: configure */}
            <div className="lg:col-span-7 p-6 border-r border-zinc-800 space-y-6">
              
              {/* Partner Select Dropdown */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Select Laundry Partner Workshop:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {partners.filter(p => p.isApproved).map((p) => {
                    const distance = getDistance(customerLat, customerLng, p.businessLat, p.businessLng);
                    const range = getPartnerPriceRange(p.id);
                    const minRupiah = Math.round(range.min * 15000).toLocaleString("id-ID");
                    const maxRupiah = Math.round(range.max * 15000).toLocaleString("id-ID");
                    const formattedRupiahRange = `Rp ${minRupiah} - Rp ${maxRupiah}`;

                    return (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedPartner(p)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                          selectedPartner?.id === p.id 
                            ? "bg-sky-950/20 border-sky-500/80 shadow shadow-sky-500/10 animate-pulse-once" 
                            : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                        }`}
                      >
                        <img src={p.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{p.businessName}</p>
                          <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-0.5 font-mono">
                            <span className="text-amber-400 font-bold">★ {p.ratingAvg > 0 ? p.ratingAvg.toFixed(1) : "New"}</span>
                            <span>• {distance} km</span>
                          </div>
                          <p className="text-[9px] text-emerald-400 font-semibold mt-0.5">{formattedRupiahRange}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Select Washing & Care Service:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "wash_fold", label: "Wash & Fold", desc: "Per Kg", icon: "🧺" },
                    { id: "wash_iron", label: "Wash & Steam", desc: "Per Kg", icon: "💨" },
                    { id: "dry_clean", label: "Dry Clean", desc: "Per Item", icon: "🧣" },
                    { id: "iron_only", label: "Iron Only", desc: "Per Item", icon: "🔌" }
                  ].map((srv) => (
                    <div 
                      key={srv.id}
                      onClick={() => setServiceType(srv.id)}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                        serviceType === srv.id 
                          ? "bg-sky-950/20 border-sky-500/80" 
                          : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-xl block mb-1.5">{srv.icon}</span>
                      <p className="text-xs font-bold text-zinc-200">{srv.label}</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{srv.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Capacity Bag Calculator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/40 p-4 border border-zinc-800/80 rounded-xl">
                {isWeightBased ? (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Estimated Weight (Kg):
                      </label>
                      <span className="text-xs font-mono font-extrabold text-sky-400">{weightKg.toFixed(1)} Kg</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.0" 
                      max="30.0" 
                      step="0.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                      className="w-full accent-sky-500 cursor-ew-resize bg-zinc-800 h-1.5 rounded-lg"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Typical personal bag is 4–7 Kg. Heavy sheets or family laundry is 10+ Kg.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Estimated Garment Items:
                      </label>
                      <span className="text-xs font-mono font-extrabold text-sky-400">{itemCount} items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setItemCount(Math.max(1, itemCount - 1))}
                        className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 flex items-center justify-center border border-zinc-700"
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        value={itemCount}
                        onChange={(e) => setItemCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 h-8 text-center bg-zinc-950 border border-zinc-800 rounded font-mono text-xs focus:ring-1 focus:ring-sky-500"
                        placeholder="Jumlah"
                      />
                      <button 
                        onClick={() => setItemCount(itemCount + 1)}
                        className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-zinc-200 flex items-center justify-center border border-zinc-700"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      Dihitung per potong pakaian. 📱 <strong className="text-sky-400">Bisa diketik langsung</strong> untuk memudahkan pengguna HP & Tablet.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Jumlah Total Pakaian (Bisa Diketik):
                  </label>
                  <input 
                    type="number" 
                    value={itemCount} 
                    onChange={(e) => setItemCount(parseInt(e.target.value) || 0)}
                    placeholder="Contoh: 15"
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none text-zinc-200 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Sangat memudahkan audit jumlah pakaian oleh mitra laundry terdekat saat serah terima.</p>
                </div>
              </div>

              {/* Geolocation Pickup & delivery details */}
              <div className="space-y-3.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Pickup & Delivery Addresses:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500"><MapPin className="w-4 h-4 text-emerald-400" /></span>
                  <input 
                    type="text" 
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Pickup address"
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none text-zinc-200"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500"><Info className="w-4 h-4 text-zinc-600" /></span>
                  <input 
                    type="text" 
                    value={pickupNotes}
                    onChange={(e) => setPickupNotes(e.target.value)}
                    placeholder="Gate codes, instructions for the rider"
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none text-zinc-200"
                  />
                </div>
              </div>

              {/* Special instructions */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Special Wash Care Instructions (optional):
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g., Hang dry my blue shirts, cold water wash, hypoallergenic soap only, do not iron the wool cardigan."
                  rows={2}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none text-zinc-200 leading-relaxed"
                />
              </div>

            </div>

            {/* Right panel: Checkout breakdown & submit */}
            <div className="lg:col-span-5 p-6 bg-zinc-950 flex flex-col justify-between">
              
              {/* Pricing breakdown */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-sans font-bold text-sm text-zinc-100 mb-1.5 uppercase tracking-wider">Payment Breakdown</h3>
                  <p className="text-[10px] text-zinc-500 font-sans leading-none">Complete transparency of fees</p>
                </div>

                <div className="space-y-3 border-t border-zinc-800/80 pt-4 font-mono text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>Selected Service Care:</span>
                    <span className="text-zinc-200 text-right max-w-[150px] truncate">{currentService?.name || "Standard Care"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="text-zinc-200">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Driver Distance Courier:</span>
                    <span className="text-zinc-200">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Washing Machine Gas Fee:</span>
                    <span className="text-zinc-200">${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Service Levy:</span>
                    <span className="text-zinc-200">${platformFee.toFixed(2)}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Promo Applied (UBERFRESH):</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-sans text-sm font-extrabold text-zinc-100 border-t border-zinc-800/80 pt-3">
                    <span>Total Amount Charged:</span>
                    <span className="text-sky-400 font-mono">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Promo Code Input */}
                <div className="flex gap-2 bg-zinc-900 p-2 border border-zinc-800 rounded-xl">
                  <input 
                    type="text" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter UBERFRESH"
                    className="flex-1 bg-zinc-950 text-xs border border-zinc-800 py-1 px-2 focus:outline-none rounded font-mono uppercase text-zinc-200"
                  />
                  <button 
                    onClick={handleApplyPromo}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] px-3 rounded font-bold uppercase transition border border-zinc-700"
                  >
                    Apply
                  </button>
                </div>

                {/* Secure Escrow Payment method */}
                <div className="space-y-2.5">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Select Escrow Payment Provider:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div 
                      onClick={() => setPaymentMethod("card")}
                      className={`p-2.5 border rounded-xl text-center cursor-pointer transition ${
                        paymentMethod === "card" 
                          ? "bg-zinc-900 border-sky-500/80" 
                          : "bg-zinc-950 border-zinc-800"
                      }`}
                    >
                      <p className="text-xs font-bold text-zinc-200">💳 Stripe Card</p>
                    </div>
                    <div 
                      onClick={() => setPaymentMethod("wallet")}
                      className={`p-2.5 border rounded-xl text-center cursor-pointer transition ${
                        paymentMethod === "wallet" 
                          ? "bg-zinc-900 border-sky-500/80" 
                          : "bg-zinc-950 border-zinc-800"
                      }`}
                    >
                      <p className="text-xs font-bold text-zinc-200">💰 Hub Wallet</p>
                      <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Bal: ${currentWalletBalance.toFixed(1)}</p>
                    </div>
                  </div>
                  {paymentMethod === "wallet" && currentWalletBalance < totalAmount && (
                    <p className="text-[10px] text-rose-400 text-center font-semibold">
                      ⚠️ Insufficient wallet balance. Deposit via credit card first or switch to Stripe Card.
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Trigger */}
              <div className="mt-8 pt-4 border-t border-zinc-800/80">
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmittingOrder || !selectedPartner || (paymentMethod === "wallet" && currentWalletBalance < totalAmount)}
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:opacity-40 disabled:pointer-events-none hover:from-sky-400 hover:to-indigo-500 py-3 text-sm font-extrabold text-white rounded-xl transition shadow-xl shadow-sky-500/10 flex items-center justify-center gap-2"
                >
                  {isSubmittingOrder ? "Confirming Escrow Deposit..." : "Place Escrow Order & Match Driver"}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[9px] text-zinc-500 text-center mt-2.5 max-w-sm mx-auto leading-relaxed">
                  Payments are locked safely in escrow and only distributed to partners and drivers upon successful OTP handover completion.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* --- TAB 3: ORDER HISTORY & REVIEW --- */}
      {activeTab === "history" && (
        <div className="space-y-6">
          
          {/* Active Review Box if requested */}
          {reviewedOrderId && (
            <div className="bg-zinc-900 border border-violet-800/40 rounded-2xl p-6 bg-gradient-to-r from-zinc-900 to-violet-950/20 shadow-xl">
              <h3 className="font-sans font-extrabold text-sm text-zinc-100 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 animate-spin" />
                Submit Feedback for Completed Order {orders.find(o => o.id === reviewedOrderId)?.orderNumber}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Reviewing the washing quality of the Laundry Partner workshop.</p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Rating (1 to 5 Stars):
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className={`w-9 h-9 rounded-lg text-sm font-extrabold flex items-center justify-center border transition ${
                          reviewRating >= star 
                            ? "bg-amber-500 text-zinc-950 border-amber-600" 
                            : "bg-zinc-950 text-zinc-500 border-zinc-800"
                        }`}
                      >
                        {star} ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Comments:
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Washing smelled great, folding was pristine. Fast pickup."
                    rows={2.5}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-sky-600/10"
                  >
                    {isSubmittingReview ? "Submitting..." : "Post Review"}
                  </button>
                  <button
                    onClick={() => setReviewedOrderId(null)}
                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs border border-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Dispute Box if requested */}
          {disputedOrderId && (
            <div className="bg-zinc-900 border border-rose-800/40 rounded-2xl p-6 bg-gradient-to-r from-zinc-900 to-rose-950/20 shadow-xl">
              <h3 className="font-sans font-extrabold text-sm text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Raise Dispute Ticket for Order {orders.find(o => o.id === disputedOrderId)?.orderNumber}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Our customer experience super admins will audit processing cycles immediately.</p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Dispute Category:
                  </label>
                  <select
                    value={disputeType}
                    onChange={(e: any) => setDisputeType(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200"
                  >
                    <option value="damage">Fabric / Garment Damage</option>
                    <option value="lost_item">Missing Clothes Item</option>
                    <option value="wrong_order">Wrong Laundry Delivery</option>
                    <option value="other">Other Inconvenience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Describe Incident:
                  </label>
                  <textarea
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    placeholder="Washing workshop lost my wool sock or damaged the seam."
                    rows={2.5}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitDispute}
                    disabled={isSubmittingDispute}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/10"
                  >
                    {isSubmittingDispute ? "Filing Incident..." : "Submit Dispute Ticket"}
                  </button>
                  <button
                    onClick={() => setDisputedOrderId(null)}
                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs border border-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ledger & History Tables */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-bold text-sm text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Garment History Log
              </h3>
              <span className="text-[10px] font-mono bg-zinc-950 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                SECURE TRANSACTION RECORD
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] font-mono">
                    <th className="py-3 px-2">Order No.</th>
                    <th className="py-3 px-2">Partner Workshop</th>
                    <th className="py-3 px-2">Care Service</th>
                    <th className="py-3 px-2">Load details</th>
                    <th className="py-3 px-2 text-right">Price Charged</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {orders.filter(o => o.customerId === "cust-1").map((o) => {
                    const p = partners.find(pt => pt.id === o.partnerId);
                    return (
                      <tr key={o.id} className="hover:bg-zinc-950/40 text-zinc-300">
                        <td className="py-3 px-2 font-mono font-bold text-zinc-200">{o.orderNumber}</td>
                        <td className="py-3 px-2 font-semibold text-zinc-200">{p?.businessName || "Unknown"}</td>
                        <td className="py-3 px-2 capitalize">{o.serviceType.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-2 font-mono text-[11px]">
                          {o.weightKg} Kg / {o.itemCount} Garments
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-sky-400">
                          ${o.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            o.status === "completed" 
                              ? "bg-emerald-950/50 text-emerald-300 border border-emerald-900/40" 
                              : o.status === "cancelled" 
                              ? "bg-rose-950/50 text-rose-300 border border-rose-900/40" 
                              : "bg-sky-950/50 text-sky-300 border border-sky-900/40 animate-pulse"
                          }`}>
                            {o.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => {
                                setTrackingOrderId(o.id);
                                setActiveTab("home");
                              }}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-[10px] font-bold"
                            >
                              Track
                            </button>
                            {o.status === "completed" && (
                              <>
                                <button
                                  onClick={() => {
                                    setReviewedOrderId(o.id);
                                    setDisputedOrderId(null);
                                  }}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded text-[10px] font-bold"
                                  title="Write Partner Review"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => {
                                    setDisputedOrderId(o.id);
                                    setReviewedOrderId(null);
                                  }}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-rose-400 border border-zinc-700 rounded text-[10px] font-bold"
                                  title="Report Damage/Incident"
                                >
                                  Dispute
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.filter(o => o.customerId === "cust-1").length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-zinc-500 italic">No orders logged in database yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
