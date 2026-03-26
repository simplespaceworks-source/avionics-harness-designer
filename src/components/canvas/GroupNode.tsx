import { memo } from 'react';
import { NodeResizer } from '@xyflow/react';

interface GroupNodeProps {
  data: {
    name: string;
    id: number;
    onChangeName?: (name: string) => void;
    onResizeBox?: (w: number, h: number) => void;
  };
  selected: boolean;
}

export const GroupNode = memo(({ data, selected }: GroupNodeProps) => {
  return (
    <>
      <NodeResizer 
        color="#3b82f6" 
        isVisible={selected} 
        minWidth={200} 
        minHeight={150} 
        onResizeEnd={(_, params) => {
          if (data.onResizeBox) {
            data.onResizeBox(params.width, params.height);
          }
        }}
      />
      
      {/* Group Title Bar */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-black/60 backdrop-blur-sm border-b border-border/50 flex items-center px-3 rounded-t-lg transition-colors">
        {data.onChangeName && selected ? (
           <input 
             value={data.name}
             onChange={(e) => data.onChangeName!(e.target.value)}
             className="bg-transparent text-sm w-full outline-none font-medium text-white placeholder-text-muted nodrag nopan"
             autoFocus
           />
        ) : (
           <span className="text-sm font-medium text-white/90 truncate">{data.name}</span>
        )}
      </div>

      {/* Transparent Body to enclose children visually */}
      <div className="w-full h-full bg-panel/30 outline-none" />
    </>
  );
});

GroupNode.displayName = 'GroupNode';
