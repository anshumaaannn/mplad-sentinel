import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { MapPin, AlertOctagon, Filter, ExternalLink, Building2, Search, ArrowRight } from 'lucide-react';
import { Project, RiskLevel } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { apiClient } from '../services/api';

interface GeographicMapViewProps {
  onSelectProject: (id: string) => void;
}

function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const GeographicMapView: React.FC<GeographicMapViewProps> = ({ onSelectProject }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.5, 82.0]);
  const [mapZoom, setMapZoom] = useState(5);

  useEffect(() => {
    const fetchGeo = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getGeography();
        setGeoData(data);
      } catch (err) {
        console.error('Failed to load geography data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGeo();
  }, []);

  if (loading || !geoData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Loading Geographic Risk Mapping Engine...</p>
      </div>
    );
  }

  const markers = geoData.map_markers || [];
  const stateSummaries = geoData.state_summaries || [];

  const filteredMarkers = markers.filter((m: any) => {
    if (selectedRiskFilter !== 'ALL' && m.risk_level !== selectedRiskFilter) return false;
    if (selectedStateFilter !== 'ALL' && m.state !== selectedStateFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.project_id.toLowerCase().includes(q) ||
        m.work_name.toLowerCase().includes(q) ||
        m.district.toLowerCase().includes(q);
    }
    return true;
  });

  const getMarkerColor = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return '#EF4444';
      case 'HIGH': return '#F97316';
      case 'MODERATE': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const handleStateClick = (stateName: string) => {
    setSelectedStateFilter(stateName);
    const stateMarkers = markers.filter((m: any) => m.state === stateName);
    if (stateMarkers.length > 0) {
      setMapCenter([stateMarkers[0].latitude, stateMarkers[0].longitude]);
      setMapZoom(7);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Geographic Risk & Spatial Cluster Map
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive GIS map of monitored MPLADS infrastructure works across India
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search district / work..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <select
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Risk Levels ({markers.length})</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="HIGH">🟠 High Only</option>
            <option value="MODERATE">🟡 Moderate Only</option>
            <option value="LOW">🟢 Low Only</option>
          </select>

          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All States</option>
            {stateSummaries.map((st: any) => (
              <option key={st.state} value={st.state}>{st.state} ({st.project_count})</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedRiskFilter('ALL');
              setSelectedStateFilter('ALL');
              setSearchQuery('');
              setMapCenter([22.5, 82.0]);
              setMapZoom(5);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map + State Risk Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-xl lg:col-span-2 h-[580px] relative overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
          >
            <MapCenterController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a> Dark Matter'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
            />

            {filteredMarkers.map((marker: any) => (
              <CircleMarker
                key={marker.project_id}
                center={[marker.latitude, marker.longitude]}
                radius={marker.risk_score >= 75 ? 9 : marker.risk_score >= 50 ? 7 : 5}
                pathOptions={{
                  color: getMarkerColor(marker.risk_level),
                  fillColor: getMarkerColor(marker.risk_level),
                  fillOpacity: 0.85,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 max-w-[240px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                      <span className="font-mono font-bold text-teal-400">{marker.project_id}</span>
                      <span className="font-bold text-[10px] px-1.5 py-0.5 rounded" style={{
                        backgroundColor: `${getMarkerColor(marker.risk_level)}25`,
                        color: getMarkerColor(marker.risk_level)
                      }}>
                        {marker.risk_score}/100 • {marker.risk_level}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-100 text-[11px] leading-tight">
                      {marker.work_name}
                    </p>

                    <div className="text-[10px] text-slate-300 space-y-0.5 pt-0.5">
                      <p>📍 {marker.district}, {marker.state}</p>
                      <p>💰 Sanctioned: ₹{(marker.sanctioned_amount / 100000).toFixed(1)} L | Progress: {marker.physical_progress}%</p>
                      <p className="text-rose-300 font-medium">⚠️ {marker.primary_reason}</p>
                    </div>

                    <button
                      onClick={() => onSelectProject(marker.project_id)}
                      className="w-full mt-1.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      <span>Investigate Dossier</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 z-[1000] text-xs backdrop-blur-sm shadow-xl">
            <span className="font-bold text-[11px] text-slate-300 block mb-1.5 uppercase">Risk Level Color</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                <span className="text-slate-300 text-[10px]">Critical (75-100)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-300 text-[10px]">High (50-74)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300 text-[10px]">Moderate (25-49)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300 text-[10px]">Low (0-24)</span>
              </div>
            </div>
          </div>
        </div>

        {/* State Risk Summary Panel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">State-wise Risk Index</h3>
              <p className="text-xs text-slate-400">Ranked by volume of flagged works</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {stateSummaries.length} States
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 mt-3 pr-1">
            {stateSummaries.map((st: any) => {
              const isSelected = selectedStateFilter === st.state;
              return (
                <div
                  key={st.state}
                  onClick={() => handleStateClick(st.state)}
                  className={`py-3 px-3 rounded-lg cursor-pointer transition flex items-center justify-between ${
                    isSelected ? 'bg-slate-800/90 border border-teal-500/40' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{st.state}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {st.project_count} Works across {st.district_count} Districts • ₹{st.total_sanctioned_crore} Cr
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {st.critical_count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {st.critical_count} Crit
                        </span>
                      )}
                      {st.high_risk_count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {st.high_risk_count} High
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Avg Score: <strong>{st.avg_risk_score}</strong>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
