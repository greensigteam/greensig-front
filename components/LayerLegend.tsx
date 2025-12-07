import React, { useState } from 'react';
import { HYDRO_LEGEND, VEG_LEGEND } from '../constants';
import { ChevronDown, ChevronUp, Droplets, Trees } from 'lucide-react';

interface LayerLegendProps {
  compact?: boolean;
}

const LayerLegend: React.FC<LayerLegendProps> = ({ compact = false }) => {
  const [isHydroOpen, setIsHydroOpen] = useState(false);
  const [isVegOpen, setIsVegOpen] = useState(false);

  return (
    <div
      className="absolute bottom-8 right-[340px] z-50 flex flex-row gap-3 items-end"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Panneau Hydrologie - Repliable */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 w-56 ring-1 ring-black/5 transition-all overflow-hidden">
        <div
          className={`flex justify-between items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isHydroOpen ? 'border-b border-slate-100' : ''}`}
          onClick={() => setIsHydroOpen(!isHydroOpen)}
        >
          <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
            <Droplets className="w-3 h-3 text-blue-500" /> Hydrologie
            <span className="bg-blue-100 text-blue-700 px-1.5 rounded-full text-[9px]">{HYDRO_LEGEND.length}</span>
          </h4>
          <div className="text-slate-400">
            {isHydroOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </div>
        </div>

        {isHydroOpen && (
          <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              {HYDRO_LEGEND.map(item => (
                <div key={item.type} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-700">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panneau Végétation - Repliable */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 w-56 ring-1 ring-black/5 transition-all overflow-hidden">
        <div
          className={`flex justify-between items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isVegOpen ? 'border-b border-slate-100' : ''}`}
          onClick={() => setIsVegOpen(!isVegOpen)}
        >
          <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
            <Trees className="w-3 h-3 text-green-500" /> Végétation
            <span className="bg-green-100 text-green-700 px-1.5 rounded-full text-[9px]">{VEG_LEGEND.length}</span>
          </h4>
          <div className="text-slate-400">
            {isVegOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </div>
        </div>

        {isVegOpen && (
          <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              {VEG_LEGEND.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.type} className="flex items-center gap-2">
                    {Icon ? (
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    ) : (
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="text-xs text-gray-700">{item.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerLegend;
