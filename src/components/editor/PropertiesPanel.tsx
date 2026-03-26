import type { Node, Edge } from '@xyflow/react';
import { useOnSelectionChange } from '@xyflow/react';
import { useProjectStore } from '../../store/useProjectStore';
import { useState } from 'react';
import { Activity, Info, Zap, Settings, AlertTriangle, Download } from 'lucide-react';
import { exportWireListCSV } from '../../utils/export';

export default function PropertiesPanel() {
  const { instances, templates, wires, wireTypes, updateWire, updateInstance, instanceDistances } = useProjectStore();
  
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes);
      setSelectedEdges(edges);
    },
  });

  const totalContinuousAmps = instances.reduce((acc, inst) => {
    const tpl = templates.find(t => t.id === inst.templateId);
    return acc + (tpl?.drawContinuous || 0);
  }, 0);

  const renderGlobalStats = () => (
    <>
      <div className="bg-canvas border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-system-warn" />
          <h4 className="font-medium text-white">Electrical Load (ELA)</h4>
        </div>
        <div className="flex flex-col gap-1 items-center justify-center py-4 bg-panel rounded-lg border border-border/50 shadow-inner">
          <span className="text-4xl font-mono text-system-warn font-semibold tracking-tighter">{totalContinuousAmps.toFixed(1)}</span>
          <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium mt-1">Continuous Amps</span>
        </div>
      </div>

      <div className="bg-canvas border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-border pb-2.5">
          <Info size={16} className="text-accent" />
          <h4 className="font-medium text-white">Harness Stats</h4>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-sm text-text-muted">Total Components</span>
          <span className="font-mono text-white text-sm bg-panel px-2 py-0.5 rounded">{instances.length}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-text-muted">Wire Segments</span>
          <span className="font-mono text-white text-sm bg-panel px-2 py-0.5 rounded">{wires.length}</span>
        </div>
        {wires.length > 0 && (
           <button 
             onClick={() => exportWireListCSV(wires[0].projectId)}
             className="mt-2 w-full flex justify-center items-center gap-2 bg-panel hover:bg-white/10 text-white py-2 rounded-lg border border-border transition-colors text-sm font-medium"
           >
             <Download size={14} /> Export Wire List (CSV)
           </button>
        )}
      </div>
    </>
  );

  const renderWireProperties = () => {
    const edgeId = selectedEdges[0].id;
    const wire = wires.find(w => w.id === edgeId);
    if (!wire) return null;

    const sourceInst = instances.find(i => i.id === wire.sourceInstanceId);
    const targetInst = instances.find(i => i.id === wire.targetInstanceId);
    
    let lengthInches: number | null = null;
    
    if (sourceInst && targetInst) {
      const a = sourceInst.id!;
      const b = targetInst.id!;
      const [idA, idB] = a < b ? [a, b] : [b, a];
      const route = instanceDistances.find(d => d.instanceAId === idA && d.instanceBId === idB);
      
      if (route && route.distance > 0) {
        lengthInches = route.distance;
      }
    }

    const wireType = wireTypes.find(wt => wt.id === wire.wireTypeId);
    
    const sourceTpl = templates.find(t => t.id === sourceInst?.templateId);
    const targetTpl = templates.find(t => t.id === targetInst?.templateId);
    const expectedLoad = Math.max(sourceTpl?.drawContinuous || 0, targetTpl?.drawContinuous || 0);

    const isGaugeInsufficient = wireType && expectedLoad > wireType.maxCurrent;

    return (
      <div className="bg-canvas border border-border rounded-xl p-5 shadow-sm flex flex-col gap-5 animate-in fade-in">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Settings size={16} className="text-accent" />
          <h4 className="font-medium text-white">Wire Properties</h4>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Wire Type (Gauge)</label>
          <select 
            value={wire.wireTypeId}
            onChange={(e) => updateWire(wire.id, { wireTypeId: Number(e.target.value) })}
            className="w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent transition-colors mb-1"
          >
            {wireTypes.map(wt => (
              <option key={wt.id} value={wt.id}>{wt.designation} (Max {wt.maxCurrent}A)</option>
            ))}
          </select>
          {isGaugeInsufficient && (
            <div className="flex items-start gap-1.5 mt-2 text-system-error text-xs bg-system-error/10 p-2 rounded">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Warning: {wireType?.designation} is insufficient for the expected max load of {expectedLoad}A.</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Physical Length</span>
            <span className="text-[9px] text-text-muted/60">Defined via Routing Matrix</span>
          </div>
          <span className={`font-mono px-2 py-1 rounded text-sm ${lengthInches !== null ? 'text-white bg-panel border-border border' : 'text-system-warn/80 bg-system-warn/10'}`}>
            {lengthInches !== null ? `${lengthInches.toFixed(1)}"` : 'Not Routed'}
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Wire Color</label>
          <div className="flex items-center gap-3">
             <input 
               type="color" 
               value={wire.color}
               onChange={(e) => updateWire(wire.id, { color: e.target.value })}
               className="w-10 h-10 rounded cursor-pointer bg-panel border border-border"
             />
             <div className="flex flex-col">
               <span className="text-sm font-mono text-white uppercase">{wire.color}</span>
               <span className="text-[10px] text-text-muted">Hex Code</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComponentProperties = () => {
    const nodeId = selectedNodes[0].id;
    const inst = instances.find(i => String(i.id) === String(nodeId));
    if (!inst) return null;
    
    const tpl = templates.find(t => t.id === inst.templateId);
    
    return (
      <div className="bg-canvas border border-border rounded-xl p-5 shadow-sm flex flex-col gap-5 animate-in fade-in">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Settings size={16} className="text-accent" />
          <h4 className="font-medium text-white">Component Properties</h4>
        </div>

        <div>
           <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Custom Name</label>
           <input 
             value={inst.customName || ''}
             onChange={(e) => updateInstance(inst.id!, { customName: e.target.value })}
             placeholder={tpl?.name || 'My Component'}
             className="w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent transition-colors"
           />
        </div>

        <div className="flex flex-col gap-2">
           <label className="block text-xs font-medium text-text-muted uppercase tracking-wide">Component Type</label>
           <div className="w-full bg-panel/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-text-muted flex items-center justify-between">
             <span className="truncate">{tpl?.name || 'Unknown Template'}</span>
             <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 uppercase tracking-widest">{tpl?.type}</span>
           </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Electrical Load</span>
          <div className="flex gap-2 text-xs">
            <span className="font-mono text-system-warn bg-system-warn/10 px-2 py-1 rounded" title="Continuous Draw">{tpl?.drawContinuous || 0}A Cont</span>
            <span className="font-mono text-system-error bg-system-error/10 px-2 py-1 rounded" title="Intermittent Draw">{tpl?.drawIntermittent || 0}A Int</span>
          </div>
        </div>

        <div className="border-t border-border pt-4">
           <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Installation Notes</label>
           <textarea 
             value={inst.notes || ''}
             onChange={(e) => updateInstance(inst.id!, { notes: e.target.value })}
             placeholder="Add notes specific to this component instance... (e.g. Panel location, specific mounting instructions)"
             className="w-full h-24 bg-panel border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent transition-colors resize-none"
           />
        </div>
        
        <div className="flex justify-between items-center py-2 border-t border-border mt-2">
          <span className="text-xs text-text-muted uppercase tracking-wider">System ID</span>
          <span className="font-mono text-xs bg-panel border border-border px-2 py-0.5 rounded text-white">{inst.id}</span>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 bg-panel border-l border-border flex flex-col h-full shadow-2xl z-20 shrink-0">
      <div className="h-14 px-4 border-b border-border flex items-center gap-3 bg-panel/80">
        <Activity size={18} className="text-accent" />
        <h3 className="font-medium text-white">Analysis & Properties</h3>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6">
        {selectedNodes.length === 0 && selectedEdges.length === 0 && renderGlobalStats()}
        {selectedEdges.length === 1 && selectedNodes.length === 0 && renderWireProperties()}
        {selectedNodes.length === 1 && selectedEdges.length === 0 && renderComponentProperties()}
      </div>
    </aside>
  );
}
