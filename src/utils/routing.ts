import type { Segment } from '../store/useRoutingStore';

export function parseSegmentsFromPath(path: string, edgeId: string): Segment[] {
  const matches = [...path.matchAll(/([ML])\s*([-\d.]+)[,\s]+([-\d.]+)/g)];
  const pts = matches.map(m => ({ x: parseFloat(m[2]), y: parseFloat(m[3]) }));
  
  const segments: Segment[] = [];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i-1];
    const curr = pts[i];
    
    const isHoriz = Math.abs(curr.y - prev.y) < 0.1;
    segments.push({
      edgeId,
      isHoriz,
      x1: prev.x,
      y1: prev.y,
      x2: curr.x,
      y2: curr.y
    });
  }
  return segments;
}

export function applyJumpsToPath(path: string, allOtherSegments: Segment[], jumpRadius = 4): string {
  const matches = [...path.matchAll(/([ML])\s*([-\d.]+)[,\s]+([-\d.]+)/g)];
  const pts = matches.map(m => ({ cmd: m[1], x: parseFloat(m[2]), y: parseFloat(m[3]) }));
  
  if (pts.length === 0) return path;

  let newPath = `M ${pts[0].x} ${pts[0].y} `;
  
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i-1];
    const curr = pts[i];
    
    const isHoriz = Math.abs(curr.y - prev.y) < 0.1;
    
    if (isHoriz) {
      const xMin = Math.min(prev.x, curr.x);
      const xMax = Math.max(prev.x, curr.x);
      const y = prev.y;
      
      let jumps: number[] = [];
      for (const seg of allOtherSegments) {
        if (!seg.isHoriz) { // Only checking intersection with vertical lines
          const segX = seg.x1;
          if (segX > xMin + jumpRadius && segX < xMax - jumpRadius) {
            const yMin = Math.min(seg.y1, seg.y2);
            const yMax = Math.max(seg.y1, seg.y2);
            if (y > yMin && y < yMax) {
              jumps.push(segX);
            }
          }
        }
      }
      
      if (jumps.length > 0) {
        const dir = curr.x > prev.x ? 1 : -1;
        jumps.sort((a, b) => (a - b) * dir);
        
        // Curve bumps 'up' (negative y) when going L->R, so sweep is 0. If going R->L, it's 1.
        const sweepFlag = dir === 1 ? 0 : 1; 
        let lastX = prev.x;
        
        for (const jx of jumps) {
          const startX = jx - jumpRadius * dir;
          const endX = jx + jumpRadius * dir;
          
          if ((dir === 1 && startX <= lastX) || (dir === -1 && startX >= lastX)) {
            continue; 
          }
          
          newPath += `L ${startX} ${y} `;
          newPath += `A ${jumpRadius} ${jumpRadius} 0 0 ${sweepFlag} ${endX} ${y} `;
          lastX = endX;
        }
        newPath += `L ${curr.x} ${curr.y} `;
      } else {
        newPath += `L ${curr.x} ${curr.y} `;
      }
    } else {
      newPath += `L ${curr.x} ${curr.y} `;
    }
  }
  
  return newPath;
}
