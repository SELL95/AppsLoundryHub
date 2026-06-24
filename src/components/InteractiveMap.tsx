import { useEffect, useRef, useState } from "react";
import { PartnerProfile, Order } from "../types";
import { MapPin, Navigation, Store, Check } from "lucide-react";

interface InteractiveMapProps {
  mode: "tracking" | "directory";
  customerLat: number;
  customerLng: number;
  onCustomerLocationChange?: (lat: number, lng: number, addressName?: string) => void;
  partners?: PartnerProfile[];
  selectedPartnerId?: string;
  onSelectPartner?: (partnerId: string) => void;
  trackingOrder?: Order;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function InteractiveMap({
  mode,
  customerLat,
  customerLng,
  onCustomerLocationChange,
  partners = [],
  selectedPartnerId,
  onSelectPartner,
  trackingOrder,
}: InteractiveMapProps) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  
  // Keep track of Leaflet markers and lines to update them dynamically
  const customerMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const partnerMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  // 1. Dynamic script loader for Leaflet
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    try {
      // Add Leaflet CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);

      // Add Leaflet JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.crossOrigin = "";
      script.onload = () => {
        setLeafletLoaded(true);
      };
      script.onerror = () => {
        setLoadError("Gagal memuat pustaka peta Leaflet. Cek koneksi internet Anda.");
      };
      document.body.appendChild(script);
    } catch (e) {
      setLoadError("Gagal menginisialisasi pustaka peta.");
    }
  }, []);

  // 2. Initialize Map Instance
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    // Avoid double initialization
    if (mapInstanceRef.current) return;

    const L = window.L;
    
    // Set map center: if in tracking mode, center on customer/driver; else center on customer
    const initialCenter: [number, number] = [customerLat, customerLng];
    
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: mode === "tracking" ? 14 : 13,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark cyberistic custom style layer (using OSM standard with modern filter via CSS)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // In Directory mode, allow clicking anywhere on the map to set Customer's location
    if (mode === "directory" && onCustomerLocationChange) {
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        onCustomerLocationChange(lat, lng);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, mode]);

  // 3. Update Markers dynamically based on props and coordinates
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Define custom SVG Marker icons
    const createCustomIcon = (color: string, iconHtml: string) => {
      return L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-zinc-900" style="background-color: ${color}">
            <div class="text-white text-xs flex items-center justify-center">${iconHtml}</div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-zinc-900" style="background-color: ${color}"></div>
          </div>
        `,
        className: "custom-leaflet-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
    };

    const customerIcon = createCustomIcon("#10b981", "🏠"); // Emerald for customer
    const partnerIcon = createCustomIcon("#8b5cf6", "🧺"); // Violet for partners
    const driverIcon = createCustomIcon("#0284c7", "🚚"); // Sky blue for drivers

    // Clear previous markers
    if (customerMarkerRef.current) {
      customerMarkerRef.current.remove();
      customerMarkerRef.current = null;
    }
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
    partnerMarkersRef.current.forEach(m => m.remove());
    partnerMarkersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (mode === "directory") {
      // Render Customer Marker
      const customerMarker = L.marker([customerLat, customerLng], {
        icon: customerIcon,
        draggable: true,
      }).addTo(map);

      // Bind simple popup
      customerMarker.bindPopup(`<strong class="text-zinc-900 font-sans">📍 Lokasi Anda</strong><br/><span class="text-xs text-zinc-500">Gunakan marker ini atau geser untuk mengganti lokasi penjemputan.</span>`).openPopup();

      customerMarker.on("dragend", () => {
        const position = customerMarker.getLatLng();
        if (onCustomerLocationChange) {
          onCustomerLocationChange(position.lat, position.lng);
        }
      });

      customerMarkerRef.current = customerMarker;

      // Render all nearby laundry partners
      partners.forEach(partner => {
        const partnerMarker = L.marker([partner.businessLat, partner.businessLng], {
          icon: partnerIcon,
        }).addTo(map);

        const isSelected = selectedPartnerId === partner.id;

        const popupContent = document.createElement("div");
        popupContent.className = "p-1.5 font-sans min-w-[180px]";
        popupContent.innerHTML = `
          <strong class="text-zinc-900 text-sm block">${partner.businessName}</strong>
          <span class="text-xs text-zinc-500 block mt-0.5 mb-1.5">${partner.businessAddress}</span>
          <div class="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100">
            <span class="text-xs font-bold text-amber-500">★ ${partner.ratingAvg.toFixed(1)}</span>
            <button id="select-partner-${partner.id}" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer transition">
              ${isSelected ? "✓ Dipilih" : "Pilih Mitra"}
            </button>
          </div>
        `;

        // Wait for popup to open to add interactive click event
        partnerMarker.bindPopup(popupContent);
        partnerMarker.on("popupopen", () => {
          const btn = document.getElementById(`select-partner-${partner.id}`);
          if (btn && onSelectPartner) {
            btn.onclick = (e) => {
              e.preventDefault();
              onSelectPartner(partner.id);
              partnerMarker.closePopup();
            };
          }
        });

        partnerMarkersRef.current.push(partnerMarker);
      });

      // Recenter map on customer
      map.setView([customerLat, customerLng], map.getZoom());

    } else if (mode === "tracking" && trackingOrder) {
      // In tracking mode, use trackingOrder's pickup/delivery lat-lng
      const targetLat = trackingOrder.pickupLat;
      const targetLng = trackingOrder.pickupLng;

      // Render Customer Marker (Emerald)
      const customerMarker = L.marker([targetLat, targetLng], {
        icon: customerIcon,
      }).addTo(map);
      customerMarker.bindPopup(`<strong class="text-zinc-900">🏠 Rumah Anda</strong>`);
      customerMarkerRef.current = customerMarker;

      // Find the laundry partner
      const matchedPartner = partners.find(p => p.id === trackingOrder.partnerId);
      const partnerLat = matchedPartner?.businessLat || targetLat + 0.01;
      const partnerLng = matchedPartner?.businessLng || targetLng + 0.01;

      // Render Laundry Partner Workshop (Violet)
      const partnerMarker = L.marker([partnerLat, partnerLng], {
        icon: partnerIcon,
      }).addTo(map);
      partnerMarker.bindPopup(`<strong class="text-zinc-900">🧺 Workshop: ${matchedPartner?.businessName || "Mitra Laundry"}</strong>`);
      partnerMarkersRef.current.push(partnerMarker);

      // Render active Courier Driver
      const curLat = trackingOrder.currentLat;
      const curLng = trackingOrder.currentLng;

      if (trackingOrder.driverId) {
        const driverMarker = L.marker([curLat, curLng], {
          icon: driverIcon,
        }).addTo(map);
        
        driverMarker.bindPopup(`
          <div class="font-sans">
            <strong class="text-zinc-900 block text-xs">🚚 Kurir Sedang Bergerak</strong>
            <span class="text-[10px] text-sky-600 font-mono block">Status: ${trackingOrder.status.replace(/_/g, " ")}</span>
          </div>
        `).openPopup();
        
        driverMarkerRef.current = driverMarker;

        // Draw dynamic routing line (Dotted blue line)
        const lineCoords = [
          [targetLat, targetLng],
          [curLat, curLng],
          [partnerLat, partnerLng],
        ];

        const polyline = L.polyline(lineCoords, {
          color: "#0ea5e9",
          weight: 3,
          dashArray: "6, 6",
          opacity: 0.8,
        }).addTo(map);

        polylineRef.current = polyline;

        // Auto-fit bounds to make sure customer, driver, and workshop are perfectly visible
        const bounds = L.latLngBounds([
          [targetLat, targetLng],
          [partnerLat, partnerLng],
          [curLat, curLng],
        ]);
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        // No driver matched yet, just connect customer and partner
        const polyline = L.polyline([[targetLat, targetLng], [partnerLat, partnerLng]], {
          color: "#8b5cf6",
          weight: 3,
          dashArray: "6, 6",
          opacity: 0.7,
        }).addTo(map);

        polylineRef.current = polyline;

        const bounds = L.latLngBounds([[targetLat, targetLng], [partnerLat, partnerLng]]);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

  }, [leafletLoaded, customerLat, customerLng, partners, selectedPartnerId, trackingOrder?.currentLat, trackingOrder?.currentLng, trackingOrder?.status, mode]);

  if (loadError) {
    return (
      <div className="w-full h-full min-h-[250px] flex flex-col items-center justify-center bg-zinc-950 text-center p-6 border border-zinc-850 rounded-2xl">
        <p className="text-rose-400 font-bold text-sm">{loadError}</p>
        <p className="text-zinc-500 text-xs mt-2">Pastikan Anda memiliki koneksi internet aktif untuk memuat peta satelit.</p>
      </div>
    );
  }

  if (!leafletLoaded) {
    return (
      <div className="w-full h-full min-h-[250px] flex flex-col items-center justify-center bg-zinc-950 text-center gap-3 border border-zinc-850 rounded-2xl">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-400 text-xs font-medium">Memuat Peta Satelit Interaktif...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[250px] rounded-2xl overflow-hidden border border-zinc-850">
      {/* Dynamic inline styles to apply cyber-dark mode maps */}
      <style>{`
        .custom-dark-leaflet .leaflet-tile-container img {
          filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(1.1) !important;
        }
        .custom-dark-leaflet .leaflet-container {
          background-color: #09090b !important;
        }
        .leaflet-popup-content-wrapper {
          background-color: #ffffff !important;
          color: #09090b !important;
          border-radius: 12px !important;
          padding: 4px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4) !important;
        }
        .leaflet-popup-tip {
          background-color: #ffffff !important;
        }
      `}</style>

      <div 
        ref={mapContainerRef} 
        className="w-full h-full min-h-[250px] custom-dark-leaflet z-10" 
      />

      {/* Subtle overlay instructions */}
      <div className="absolute top-2.5 right-2.5 z-[1000] bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 px-2.5 py-1.5 rounded-lg text-[9px] text-zinc-400 pointer-events-none flex items-center gap-1.5">
        <Navigation className="w-3 h-3 text-emerald-400" />
        <span>Peta Satelit Real-Time aktif</span>
      </div>
    </div>
  );
}
