import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { ConnectorTemplate } from '../../db/db';
import { Plus, Trash2, Image as ImageIcon, Save, X, Edit2 } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

export default function ConnectorTemplatesView() {
  const templates = useLiveQuery(() => db.connectorTemplates.toArray());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ConnectorTemplate>>({
    name: '', imageData: '', pinCount: 1
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageData: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const saveTemplate = async () => {
    if (!formData.name) return alert('Name required');
    await db.connectorTemplates.put(formData as ConnectorTemplate);
    setIsFormOpen(false);
    setFormData({ name: '', imageData: '', pinCount: 1 });
  };

  const editTemplate = (tpl: ConnectorTemplate) => {
    setFormData(tpl);
    setIsFormOpen(true);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const confirmDelete = async () => {
    if (confirmDeleteId !== null) {
      await db.connectorTemplates.delete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Connector Templates</h2>
          <p className="text-text-muted text-sm">Define generic physical connectors (e.g. D-Sub 37) with pin counts.</p>
        </div>
        <button
          onClick={() => { setFormData({ name: '', imageData: '', pinCount: 1 }); setIsFormOpen(true); }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-accent/20 text-sm"
        >
          <Plus size={16} />
          Create Connector
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-panel border border-border rounded-xl p-8 mb-10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
            <h2 className="text-xl font-medium text-white">{formData.id ? 'Edit' : 'New'} Connector Definition</h2>
             <button onClick={() => setIsFormOpen(false)} className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-canvas">
               <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm">
            <div className="space-y-6">
              <div>
                <label className="block font-medium text-text-muted mb-2">Connector Designation / Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. D-Sub 25 Male"
                  className="w-full bg-canvas border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent"
                />
              </div>
              
              <div>
                <label className="block font-medium text-text-muted mb-2">Connector Visual</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 bg-canvas hover:bg-canvas/80 border border-border px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-white">
                    <ImageIcon size={18} />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {formData.imageData && (
                    <img src={formData.imageData} alt="preview" className="h-10 w-10 object-contain bg-canvas rounded border border-border" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block font-medium text-text-muted mb-2">Total Number of Pins</label>
              <input 
                type="number"
                min="1"
                max="256"
                value={formData.pinCount || 1}
                onChange={e => setFormData({ ...formData, pinCount: Math.max(1, Number(e.target.value)) })}
                className="w-full bg-canvas border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent max-w-[150px]"
              />
              <p className="text-xs text-text-muted mt-2">Logical naming of each pin will be defined when attached to a component template.</p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4 border-t border-border pt-6">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="px-6 py-2.5 rounded-lg font-medium text-white hover:bg-canvas transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={saveTemplate}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-2.5 rounded-lg font-medium transition-all shadow-md shadow-accent/20 text-sm"
            >
              <Save size={16} />
              {formData.id ? 'Update Connector' : 'Save Connector'}
            </button>
          </div>
        </div>
      )}

      {/* List Existing */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates?.map(tpl => (
          <div key={tpl.id} className="bg-panel border border-border rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-white truncate pr-16">{tpl.name}</h3>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => editTemplate(tpl)}
                    className="p-1.5 text-text-muted hover:text-white rounded-md hover:bg-white/10"
                    title="Edit Template"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(tpl.id!)}
                    className="p-1.5 text-text-muted hover:text-system-error rounded-md hover:bg-system-error/10"
                    title="Delete Template"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="h-16 flex items-center justify-center bg-canvas border border-border/50 rounded-lg">
                {tpl.imageData ? (
                  <img src={tpl.imageData} alt={tpl.name} className="h-12 object-contain" />
                ) : (
                  <span className="text-xs text-text-muted border border-dashed border-border/50 px-2 py-1 rounded">No Img</span>
                )}
              </div>
              
              <div className="text-sm flex justify-between items-center text-text-muted bg-canvas px-3 py-1.5 rounded-lg border border-border/50">
                <span>Total Pins</span>
                <span className="font-mono text-white bg-panel px-2 py-0.5 rounded">{tpl.pinCount || 0}</span>
              </div>
            </div>
          </div>
        ))}
        {templates?.length === 0 && !isFormOpen && (
          <div className="col-span-full py-16 bg-panel/30 border-2 border-dashed border-border rounded-2xl text-center text-text-muted">
            No connectors defined yet.
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmDeleteId !== null}
        title="Delete Connector Template"
        message="Are you sure you want to delete this connector template? It cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
