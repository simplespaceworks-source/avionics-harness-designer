import { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { ChevronDown, ChevronRight, Link as LinkIcon, Unlink, X } from 'lucide-react';
import type { Wire, ComponentInstance } from '../db/db';

function PinMappingGroup({ 
  inst, pin, wires, instances, templates, activeProject, addWire, removeWire, instanceDistances 
}: any) {
  const [draftInstId, setDraftInstId] = useState('');
  const [draftPinId, setDraftPinId] = useState('');

  const connectedWires = wires.filter((w: Wire) => 
    (w.sourceInstanceId === inst.id && w.sourcePinId === pin.fullId) ||
    (w.targetInstanceId === inst.id && w.targetPinId === pin.fullId)
  );

  const getDistance = (idA: number, idB: number) => {
    const [a, b] = idA < idB ? [idA, idB] : [idB, idA];
    const rec = instanceDistances.find((d: any) => d.instanceAId === a && d.instanceBId === b);
    return rec ? rec.distance : 0;
  };

  const calculateLengthParam = (wire: Wire) => {
    const d = getDistance(wire.sourceInstanceId, wire.targetInstanceId);
    if (d > 0) return `${d} in`;
    return 'Not Set';
  };

  const handlePinSelection = async (targetPinVal: string) => {
    if (!activeProject || !draftInstId || !targetPinVal) return;
    const tInstId = Number(draftInstId);

    await addWire({
      id: crypto.randomUUID(),
      projectId: activeProject.id!,
      sourceInstanceId: inst.id,
      sourceConnectorId: 'default',
      sourcePinId: pin.fullId,
      targetInstanceId: tInstId,
      targetConnectorId: 'default',
      targetPinId: targetPinVal,
      wireTypeId: 1,
      color: localStorage.getItem('defaultWireColor') || '#3b82f6',
      waypoints: '[]',
      buildPhase: 'Baseline'
    });

    setDraftInstId('');
    setDraftPinId('');
  };

  return (
    <tr className="hover:bg-white/[0.02] transition-colors group border-b border-border/20 last:border-b-0">
      <td className="px-6 py-4 align-top">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-white text-xs">{pin.name}</span>
          <span className="text-[10px] text-text-muted">{pin.connectorName}</span>
        </div>
      </td>
      <td className="px-6 py-4 align-top">
        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${
          pin.type.includes('Power') ? 'border-system-warn/40 text-system-warn bg-system-warn/10' : 
          pin.type === 'Ground' ? 'border-system-success/40 text-system-success bg-system-success/10' :
          'border-border text-text-muted bg-canvas'
        }`}>
          {pin.type}
        </span>
      </td>
      <td className="px-6 py-4 align-top" colSpan={2}>
        <div className="flex flex-col gap-3">
          {/* Render Existing Connections */}
          {connectedWires.map((wire: Wire) => {
            const isSource = wire.sourceInstanceId === inst.id;
            const targetInstId = isSource ? wire.targetInstanceId : wire.sourceInstanceId;
            const targetPinFullId = isSource ? wire.targetPinId : wire.sourcePinId;
            
            const targetInst = instances.find((i: ComponentInstance) => i.id === targetInstId);
            const targetTpl = templates.find((t: any) => t.id === targetInst?.templateId);
            const pinRaw = targetPinFullId.split('-').pop(); // rough guess
            const targetLabel = targetInst ? `${targetInst.name || targetTpl?.name} => Pin ${pinRaw}` : 'Unknown Target';

            return (
              <div key={wire.id} className="flex items-center justify-between bg-canvas border border-border rounded-md px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <LinkIcon size={14} className="text-accent" />
                  <span className="text-white font-mono">{targetLabel}</span>
                  <span className="text-text-muted bg-panel px-1.5 py-0.5 border border-border rounded text-[10px]">
                    {calculateLengthParam(wire)}
                  </span>
                </div>
                <button 
                  onClick={() => removeWire(wire.id)}
                  className="text-text-muted hover:text-system-error transition-colors p-1"
                  title="Remove Connection"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}

          {/* Draft New Connection Row */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <Unlink size={14} className="text-text-muted/50 hidden sm:block shrink-0" />
            
            <select 
              className="flex-1 w-full bg-canvas border border-border rounded-md px-2 py-1.5 text-white text-xs focus:border-accent outline-none"
              value={draftInstId}
              onChange={(e) => {
                setDraftInstId(e.target.value);
                setDraftPinId('');
              }}
            >
              <option value="">-- Target Hardware --</option>
              {instances.filter((i: ComponentInstance) => i.id !== inst.id).map((otherInst: ComponentInstance) => {
                 const tpl = templates.find((t: any) => t.id === otherInst.templateId);
                 return (
                  <option key={otherInst.id} value={otherInst.id}>
                    {otherInst.name || tpl?.name || `Comp ${otherInst.id}`}
                  </option>
                 )
              })}
            </select>
            
            <select 
              className="flex-1 w-full bg-canvas border border-border rounded-md px-2 py-1.5 text-white text-xs focus:border-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!draftInstId}
              value={draftPinId}
              onChange={(e) => {
                setDraftPinId(e.target.value);
                if (e.target.value) handlePinSelection(e.target.value);
              }}
            >
              <option value="">-- Select Pin --</option>
              {draftInstId && (() => {
                const tInst = instances.find((i: ComponentInstance) => String(i.id) === draftInstId);
                const tTpl = templates.find((t: any) => t.id === tInst?.templateId);
                if (!tTpl) return null;
                
                const tPins = tTpl.defaultConnectors.flatMap((c: any) => 
                  c.pins.filter((p: any) => p.type !== 'Not Used').map((p: any) => ({
                    id: `${c.id}-${p.id}`,
                    display: `[${c.customName}] ${p.name} (${p.type})`
                  }))
                );
                
                return tPins.map((tp: any) => (
                  <option key={tp.id} value={tp.id}>{tp.display}</option>
                ));
              })()}
            </select>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function WiringList() {
  const { activeProject, instances, wires, templates, addWire, removeWire, instanceDistances } = useProjectStore();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (!activeProject || instances.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-canvas text-text-muted">
        <p>No components found in this project.</p>
        <p className="text-sm mt-2">Add components in the Canvas view first to edit their wiring here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-canvas overflow-y-auto p-8 border-t border-border mt-14 relative z-0">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold text-white mb-2">Wiring Mapping Editor</h2>
        <p className="text-text-muted text-sm mb-8">
          Textually map point-to-point pin connections without navigating the visual canvas. You can assign 
          multiple wires to any pin to construct electrical buses and parallel ground ties offline.
        </p>

        <div className="flex flex-col gap-4">
          {instances.map(inst => {
            const template = templates.find(t => t.id === inst.templateId);
            if (!template) return null;
            
            const isExpanded = expanded[inst.id!];
            
            const allPins = template.defaultConnectors.flatMap(conn => 
              conn.pins.filter(p => p.type !== 'Not Used').map(p => ({
                ...p,
                connectorName: conn.customName,
                connectorId: conn.id,
                fullId: `${conn.id}-${p.id}`
              }))
            );

            return (
              <div key={inst.id} className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleExpand(inst.id!)}
                  className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/5 transition-colors border-b border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={18} className="text-text-muted" /> : <ChevronRight size={18} className="text-text-muted" />}
                    <h3 className="font-medium text-white text-lg text-left">
                      {inst.name || template.name}
                    </h3>
                    <span className="text-xs text-text-muted font-mono bg-canvas px-2 py-0.5 rounded border border-border">ID: {inst.id}</span>
                  </div>
                  <div className="text-sm text-accent font-medium bg-accent/10 px-2 py-0.5 rounded">
                    {allPins.length} Active Pins
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-canvas/50 text-text-muted border-b border-border">
                        <tr>
                          <th className="px-6 py-3 font-medium w-[20%]">Source Pin</th>
                          <th className="px-6 py-3 font-medium w-[15%]">Signal Type</th>
                          <th className="px-6 py-3 font-medium w-[65%]">Target Connections</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {allPins.length === 0 && (
                          <tr><td colSpan={3} className="px-6 py-8 text-center text-text-muted">No active pins on this component constraint.</td></tr>
                        )}
                        {allPins.map(pin => (
                          <PinMappingGroup
                            key={pin.fullId}
                            inst={inst}
                            pin={pin}
                            wires={wires}
                            instances={instances}
                            templates={templates}
                            activeProject={activeProject}
                            addWire={addWire}
                            removeWire={removeWire}
                            instanceDistances={instanceDistances}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
