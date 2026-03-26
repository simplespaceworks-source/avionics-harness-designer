import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useNodes } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { useEffect, useMemo } from 'react';

import { useProjectStore } from '../../store/useProjectStore';
import { useRoutingStore } from '../../store/useRoutingStore';
import { parseSegmentsFromPath, applyJumpsToPath } from '../../utils/routing';

export default function WireEdge({
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  const { instances, templates } = useProjectStore();
  const wires = useProjectStore(s => s.wires);
  const { segments, setSegments, removeSegments } = useRoutingStore();
  
  const sourceInst = instances.find(i => String(i.id) === source);
  const targetInst = instances.find(i => String(i.id) === target);

  let customCenterX;
  let customOffset = 30;

  const nodesArray = useNodes();

  if (sourceInst && targetInst) {
    const siblingWires = wires.filter(w => 
      (String(w.sourceInstanceId) === source && String(w.targetInstanceId) === target) ||
      (String(w.sourceInstanceId) === target && String(w.targetInstanceId) === source)
    ).sort((a, b) => a.id.localeCompare(b.id));

    const laneIndex = siblingWires.findIndex(w => w.id === id);
    const totalLanes = siblingWires.length;
    // Spread parallel sibling wires cleanly by 12px increments
    const laneOffset = (laneIndex - (totalLanes - 1) / 2) * 12;

    const sourceHash = sourceInst.id || 0;
    const targetHash = targetInst.id || 0;

    if ((sourcePosition === 'right' && targetPosition === 'left') || (sourcePosition === 'left' && targetPosition === 'right')) {
      let midX = sourceX + (targetX - sourceX) * 0.5;
      
      // Distinctly shift different pairs of trunks passing through similar spaces
      const trunkShift = (((sourceHash * 7) + (targetHash * 13)) % 7) * 15 - 45; 
      midX += trunkShift;

      // Ensure vertical drop doesn't slice through any solid component blocks
      let collision = true;
      let attempts = 0;
      const padding = 25;
      const trunkWidth = totalLanes * 12;

      while (collision && attempts < 25) {
        collision = false;
        for (const n of nodesArray) {
          if (n.type === 'groupNode' || n.id === source || n.id === target) continue;
          const posAbs = (n as any).positionAbsolute || (n as any).computed?.positionAbsolute || n.position;
          if (!posAbs || !n.measured) continue;
          
          const ex = posAbs.x;
          const ey = posAbs.y;
          const ew = n.measured.width;
          const eh = n.measured.height;
          if (!ew || !eh) continue;

          // Vertical band of the wire
          const yMin = Math.min(sourceY, targetY);
          const yMax = Math.max(sourceY, targetY);

          // Component bounding checks
          const nTop = ey - padding;
          const nBot = ey + eh + padding;
          const nLeft = ex - padding - (trunkWidth / 2);
          const nRight = ex + ew + padding + (trunkWidth / 2);

          // 1. Does the vertical trunk intersect this solid block?
          if (yMax >= nTop && yMin <= nBot) {
             if (midX >= nLeft && midX <= nRight) {
                 collision = true;
                 if (midX < ex + ew/2) {
                    midX = nLeft - 5;
                 } else {
                    midX = nRight + 5;
                 }
             }
          }

          // 2. Does the primary horizontal trace intersect a solid block?
          const h1MinX = Math.min(sourceX, midX);
          const h1MaxX = Math.max(sourceX, midX);
          if (sourceY >= nTop && sourceY <= nBot) {
             if (h1MaxX >= ex - padding && h1MinX <= ex + ew + padding) {
                collision = true;
                if (sourceX < ex) {
                   midX = nLeft - 5;
                } else {
                   midX = nRight + 5;
                }
             }
          }

          // 3. Does the terminating horizontal trace intersect a solid block?
          const h2MinX = Math.min(midX, targetX);
          const h2MaxX = Math.max(midX, targetX);
          if (targetY >= nTop && targetY <= nBot) {
             if (h2MaxX >= ex - padding && h2MinX <= ex + ew + padding) {
                collision = true;
                if (targetX > ex + ew) {
                   midX = nRight + 5;
                } else {
                   midX = nLeft - 5;
                }
             }
          }
        }
        attempts++;
      }
      
      customCenterX = midX + laneOffset;
    } else if (sourcePosition === targetPosition) {
      customOffset = 25 + Math.abs(laneOffset) + ((targetHash % 3) * 15);
    }
  }

  const [rawEdgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
    centerX: customCenterX,
    offset: customOffset
  });

  useEffect(() => {
    const parsed = parseSegmentsFromPath(rawEdgePath, id);
    setSegments(id, parsed);
    return () => removeSegments(id);
  }, [rawEdgePath, id, setSegments, removeSegments]);

  const pathWithJumps = useMemo(() => {
    const allOtherSegments = Object.values(segments).flat().filter(s => s.edgeId !== id);
    return applyJumpsToPath(rawEdgePath, allOtherSegments, 6);
  }, [rawEdgePath, segments, id]);

  const wireColor = (data as Record<string, any>)?.color || '#3b82f6';
  const label = (data as Record<string, any>)?.label || '';

  const getPinName = (inst: any, handleId: string) => {
    if (!inst || !handleId) return '';
    const tpl = templates.find(t => t.id === inst.templateId);
    if (!tpl) return '';
    const parts = handleId.split('-');
    if (parts.length < 2) return handleId;
    const pinId = parts.pop();
    const connId = parts.join('-');
    const conn = tpl.defaultConnectors.find((c: any) => c.id === connId);
    const pin = conn?.pins.find((p: any) => p.id === pinId);
    return pin?.name || handleId;
  };

  const sourcePinName = getPinName(sourceInst, sourceHandleId || '');
  const targetPinName = getPinName(targetInst, targetHandleId || '');

  // Calculate approximate bounding box offset for labels to hover near the connection port natively
  const sLabelX = sourcePosition === 'left' ? sourceX - 35 : sourceX + 35;
  const sLabelY = sourceY;
  
  const tLabelX = targetPosition === 'left' ? targetX - 35 : targetX + 35;
  const tLabelY = targetY;

  return (
    <>
      {/* Background halo to create a clean gap strictly for overlapping logic lines */}
      <BaseEdge 
        id={`${id}-halo`}
        path={pathWithJumps} 
        style={{ ...style, stroke: '#1c1e26', strokeWidth: 9 }} 
        className="pointer-events-none"
      />
      <BaseEdge 
        id={id}
        path={pathWithJumps} 
        markerEnd={markerEnd} 
        style={{ ...style, stroke: wireColor, strokeWidth: 3 }} 
        className="transition-all hover:stroke-[4px] hover:drop-shadow-md cursor-pointer"
      />
      {/* Existing central label if any */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="pointer-events-auto absolute nopan bg-canvas text-white text-[10px] px-2 py-0.5 rounded border border-border font-mono whitespace-nowrap shadow-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Conditionally render textual labels at the ends if nodes are collapsed */}
      {(sourceInst?.isCollapsed || targetInst?.isCollapsed) && (
        <EdgeLabelRenderer>
          {sourceInst?.isCollapsed && sourcePinName && (
             <div
               style={{ 
                 transform: `translate(-50%, -50%) translate(${sLabelX}px,${sLabelY}px)` 
               }}
               className="pointer-events-auto absolute nopan bg-panel text-[#666666] text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/50 shadow-sm"
             >
               {sourcePinName}
             </div>
          )}
          {targetInst?.isCollapsed && targetPinName && (
             <div
               style={{ 
                 transform: `translate(-50%, -50%) translate(${tLabelX}px,${tLabelY}px)` 
               }}
               className="pointer-events-auto absolute nopan bg-panel text-[#666666] text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/50 shadow-sm"
             >
               {targetPinName}
             </div>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}
