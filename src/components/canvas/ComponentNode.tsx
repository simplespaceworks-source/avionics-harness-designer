import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ComponentInstance, ComponentTemplate } from '../../db/db';
import { useProjectStore } from '../../store/useProjectStore';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type ComponentNodeData = Record<string, unknown> & {
  instance: ComponentInstance;
  template?: ComponentTemplate;
};

export default function ComponentNode({ data, selected }: NodeProps) {
  const { instance } = data as ComponentNodeData;
  const { templates, connectorTemplates, wires, instances, toggleInstanceCollapse } = useProjectStore();
  const template = templates.find(t => t.id === instance.templateId);

  const handleToggle = () => {
    toggleInstanceCollapse(instance.id!);
  };

  return (
    <div className={`
      relative min-w-[200px] bg-canvas border-2 rounded-xl shadow-xl flex flex-col items-center 
      transition-all duration-200
      ${selected ? 'border-accent shadow-accent/20' : 'border-border'}
    `}>
      <div 
        className="h-6 w-full bg-panel rounded-t-xl border-b border-border flex items-center px-3 justify-center relative cursor-pointer group hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider truncate">
          {instance.name || template?.name || 'Unknown Component'}
        </span>
        {instance.isCollapsed ? (
          <ChevronRight size={12} className="absolute right-2 text-text-muted/50" />
        ) : (
          <ChevronDown size={12} className="absolute right-2 text-text-muted/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      
      {instance.isCollapsed ? (
        <div className="absolute inset-0 pointer-events-none">
          {template?.defaultConnectors?.map(conn => 
            conn.pins?.filter(p => p.type !== 'Not Used').map(pin => {
              const fullPinId = `${conn.id}-${pin.id}`;
              return (
                <div key={fullPinId}>
                  <Handle type="source" position={Position.Right} id={fullPinId} className="opacity-0 w-0 h-0 right-0 top-1/2 pointer-events-none" />
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center p-4 w-full h-24 relative overflow-hidden text-center bg-canvas">
        {template?.imageData ? (
          <img src={template.imageData} alt={template.name} className="max-h-full max-w-full object-contain mix-blend-screen" draggable={false} />
        ) : (
          <span className="text-text-muted text-xs font-mono bg-panel/50 px-2 py-1 border border-border/50 rounded inline-block">
            {template?.name || 'NO_IMAGE'}
          </span>
        )}
      </div>

      {template?.defaultConnectors?.map((conn) => {
        const ct = connectorTemplates.find(c => c.id === conn.connectorTemplateId);
        if (!ct) return null;

        const activePins = conn.pins?.filter(p => p.type !== 'Not Used') || [];
        if (activePins.length === 0) return null; // Only show connector block if there are usable pins

        return (
          <div key={conn.id} className="w-full flex flex-col border-t border-border/50">
            <div className="px-2 py-1 text-[10px] font-medium text-text-muted bg-panel border-b border-border/30 flex justify-between items-center group relative">
              <span className="text-white bg-canvas/50 px-1 py-0.5 rounded">{conn.customName}</span>
              <span className="text-accent">{ct.name}</span>
              
              {/* Tooltip to show Connector Image if it exists */}
              {ct.imageData && (
                <div className="absolute right-0 top-6 hidden group-hover:flex flex-col items-center z-50 bg-panel border border-border rounded shadow-xl p-1 pointer-events-none">
                  <img src={ct.imageData} alt={ct.name} className="w-16 h-16 object-contain mix-blend-screen" />
                </div>
              )}
            </div>
            
            {activePins.map((pin) => {
              const fullPinId = `${conn.id}-${pin.id}`;
              const connectedWires = wires.filter(w => 
                (w.sourceInstanceId === instance.id && w.sourcePinId === fullPinId) ||
                (w.targetInstanceId === instance.id && w.targetPinId === fullPinId)
              );
              
              let side = 'right';
              if (connectedWires.length > 0) {
                const connectedWire = connectedWires[0];
                const otherNodeId = connectedWire.sourceInstanceId === instance.id ? connectedWire.targetInstanceId : connectedWire.sourceInstanceId;
                const otherInstance = instances.find(i => i.id === otherNodeId);
                if (otherInstance) {
                  // If the connected instance is to our right, place pin on our right. Otherwise left.
                  side = otherInstance.posX > instance.posX ? 'right' : 'left';
                }
              } else {
                // Default un-connected styling
                if (['Input', 'Power In', 'Data In', 'Ground'].includes(pin.type)) {
                  side = 'left';
                }
              }

              return (
                <div key={pin.id} className="relative h-6 flex items-center justify-between px-2 w-full text-[10px] text-text-muted hover:bg-white/5 transition-colors">
                  {side === 'left' ? (
                    <>
                      <Handle 
                        type="source" 
                        position={Position.Left} 
                        id={fullPinId} 
                        className="w-3 h-3 border-2 border-panel bg-text-muted hover:bg-accent hover:border-accent transition-colors cursor-crosshair -left-1.5"
                      />
                      <span className="pl-4 font-mono text-left block w-full truncate">{pin.name}</span>
                      <span className="text-[8px] uppercase tracking-widest text-[#666666] absolute right-2">{pin.type}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[8px] uppercase tracking-widest text-[#666666] absolute left-2">{pin.type}</span>
                      <span className="pr-4 font-mono text-right block w-full truncate">{pin.name}</span>
                      <Handle 
                        type="source" 
                        position={Position.Right} 
                        id={fullPinId} 
                        className="w-3 h-3 border-2 border-panel bg-text-muted hover:bg-accent hover:border-accent transition-colors cursor-crosshair -right-1.5"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}
