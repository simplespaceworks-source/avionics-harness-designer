import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Library, GripVertical } from 'lucide-react';

export default function TemplateSidebar() {
  const templates = useLiveQuery(() => db.templates.toArray());

  const onDragStart = (event: React.DragEvent, templateId: number) => {
    event.dataTransfer.setData('application/reactflow', String(templateId));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-72 bg-panel border-l border-border flex flex-col h-full shadow-2xl z-20 shrink-0">
      <div className="h-14 px-4 border-b border-border flex items-center gap-3 bg-panel/80">
        <Library size={18} className="text-accent" />
        <h3 className="font-medium text-white">Component Library</h3>
      </div>
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        {templates?.map((tpl) => (
          <div 
            key={tpl.id}
            onDragStart={(e) => onDragStart(e, tpl.id!)}
            draggable
            className="group p-3 bg-canvas border border-border rounded-xl cursor-grab active:cursor-grabbing hover:border-accent/50 hover:shadow-lg transition-all flex flex-col gap-3 relative"
          >
            <div className="absolute top-3 right-2 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical size={16} />
            </div>
            <div className="font-semibold text-sm text-white pr-6">{tpl.name}</div>
            
            {tpl.imageData ? (
               <div className="bg-panel border border-border/50 rounded-lg p-2 flex justify-center h-20">
                 <img src={tpl.imageData} alt={tpl.name} className="h-full object-contain pointer-events-none" />
               </div>
            ) : (
               <div className="bg-panel border border-border/50 rounded-lg h-20 flex items-center justify-center text-xs text-text-muted">
                 No visual
               </div>
            )}
            
            <div className="text-[11px] text-text-muted flex justify-between items-center bg-panel/30 px-2 py-1 rounded">
              <span className="truncate max-w-[100px]">{tpl.type}</span>
              <span className="font-mono bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                {tpl.drawContinuous}A
              </span>
            </div>
          </div>
        ))}
        {templates?.length === 0 && (
          <div className="text-sm text-text-muted text-center pt-10 border-2 border-dashed border-border p-6 rounded-xl">
            No templates in library.<br/><br/>Go to the Templates page to create components.
          </div>
        )}
      </div>
    </aside>
  );
}
