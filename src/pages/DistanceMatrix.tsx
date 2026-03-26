import { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';

export default function DistanceMatrix() {
  const { activeProject, instances, templates, instanceDistances, setInstanceDistance } = useProjectStore();
  const [unit, setUnit] = useState<'in' | 'ft' | 'cm' | 'm'>('in');

  const TO_DISPLAY = {
    'in': 1,
    'ft': 1 / 12,
    'cm': 2.54,
    'm': 0.0254
  };

  const getLabel = (inst: any) => {
    if (inst.customName) return inst.customName;
    const siblings = instances.filter(i => i.templateId === inst.templateId).sort((a,b) => a.id! - b.id!);
    const template = templates.find(t => t.id === inst.templateId);
    const baseName = template?.name || 'Component';
    if (siblings.length > 1) {
      const index = siblings.findIndex(i => i.id === inst.id) + 1;
      return `${baseName} ${index}`;
    }
    return baseName;
  };

  const getDistance = (idA: number, idB: number) => {
    const [a, b] = idA < idB ? [idA, idB] : [idB, idA];
    const rec = instanceDistances.find(d => d.instanceAId === a && d.instanceBId === b);
    if (!rec) return '';
    
    // Convert inch value from DB to display unit
    const converted = rec.distance * TO_DISPLAY[unit];
    return Number.isInteger(converted) ? String(converted) : converted.toFixed(2);
  };

  const handleDistanceChange = (idA: number, idB: number, val: string) => {
    if (!activeProject) return;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      // Convert written display value back to absolute inches for DB storage
      const inches = num / TO_DISPLAY[unit];
      setInstanceDistance(activeProject.id!, idA, idB, inches);
    }
  };

  if (!activeProject || instances.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-canvas text-text-muted">
        <p>No components found in this project to map distances between.</p>
        <p className="text-sm mt-2">Add components in the Canvas view first.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-canvas overflow-auto p-8 border-t border-border mt-14 relative z-0">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold text-white mb-2">Distance Matrix</h2>
        <div className="flex items-center justify-between mb-8">
          <p className="text-text-muted text-sm max-w-2xl">
            Define the physical routing distance between any two hardware components in your harness. 
            This data will be used to calculate the necessary wire segment lengths for BOM export.
          </p>
          <div className="flex items-center gap-3 bg-panel border border-border px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs font-medium text-text-muted uppercase">Base Unit</span>
            <select 
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="bg-canvas border border-border rounded text-sm text-white px-2 py-1 outline-none focus:border-accent"
            >
              <option value="in">Inches (in)</option>
              <option value="ft">Feet (ft)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="m">Meters (m)</option>
            </select>
          </div>
        </div>

        <div className="bg-panel border border-border shadow-lg rounded-xl overflow-hidden w-full overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs uppercase bg-canvas/50 text-text-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium border-r border-border sticky left-0 bg-panel z-10 w-48">
                  Component (Row \ Col)
                </th>
                {instances.map((inst: any) => {
                  const label = getLabel(inst);
                  return (
                    <th key={inst.id} className="px-6 py-4 font-medium text-center border-r last:border-r-0 border-border min-w-[120px]">
                      <div className="truncate max-w-[140px] mx-auto" title={label}>
                        {label}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {instances.map((rowInst: any) => {
                const rowLabel = getLabel(rowInst);
                return (
                <tr key={rowInst.id} className="border-b border-border last:border-b-0 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white border-r border-border sticky left-0 bg-panel z-10 group-hover:bg-panel shadow-[1px_0_0_0_rgba(255,255,255,0.05)] truncate max-w-[200px]" title={rowLabel}>
                    {rowLabel}
                  </td>
                  
                  {instances.map((colInst: any) => {
                    const isDiagonal = rowInst.id === colInst.id;
                    const val = getDistance(rowInst.id!, colInst.id!);
                    
                    return (
                      <td key={colInst.id} className={`px-4 py-2 border-r last:border-r-0 border-border text-center ${isDiagonal ? 'bg-canvas/30' : ''}`}>
                        {isDiagonal ? (
                          <span className="text-text-muted/40 font-mono">-</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                             <input 
                               type="number"
                               min="0"
                               step="0.5"
                               value={val}
                               placeholder="--"
                               onChange={(e) => handleDistanceChange(rowInst.id!, colInst.id!, e.target.value)}
                               className="w-20 bg-canvas border border-border rounded px-3 py-1.5 text-white font-mono text-center focus:border-accent focus:outline-none transition-colors"
                             />
                             <span className="text-[10px] text-text-muted/70 uppercase w-4">{unit}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
