import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { ComponentTemplate } from '../../db/db';
import { Plus, Trash2, Image as ImageIcon, Save, X, Link as LinkIcon, Edit2 } from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';

export default function ComponentTemplatesView() {
  const templates = useLiveQuery(() => db.templates.toArray());
  const connectorTemplates = useLiveQuery(() => db.connectorTemplates.toArray()) || [];
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ComponentTemplate>>({
    name: '', type: 'Avionics', drawContinuous: 0, drawIntermittent: 0,
    defaultConnectors: [], imageData: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageData: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const addConnectorRef = () => {
    if (connectorTemplates.length === 0) {
       alert("You must create at least one Connector Template first!");
       return;
    }
    const ct = connectorTemplates[0];
    const initialPins = Array.from({ length: ct.pinCount || 1 }).map((_, i) => ({
      id: crypto.randomUUID(), pinIndex: i + 1, name: String(i + 1), type: 'Not Used'
    }));

    setFormData(prev => ({
      ...prev,
      defaultConnectors: [
        ...(prev.defaultConnectors || []),
        { id: crypto.randomUUID(), connectorTemplateId: ct.id!, customName: `J${(prev.defaultConnectors?.length || 0) + 1}`, pins: initialPins }
      ]
    }));
  };

  const updateConnectorRef = (id: string, param: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      defaultConnectors: prev.defaultConnectors?.map(c => 
        c.id === id ? { ...c, [param]: value } : c
      )
    }));
  };

  const [confirmConnectorChange, setConfirmConnectorChange] = useState<{id: string, newId: number} | null>(null);

  const executeConnectorChange = () => {
    if (!confirmConnectorChange) return;
    const {id, newId} = confirmConnectorChange;
    const ct = connectorTemplates.find(c => c.id === newId);
    if (!ct) {
      setConfirmConnectorChange(null);
      return;
    }
    
    const initialPins = Array.from({ length: ct.pinCount || 1 }).map((_, i) => ({
      id: crypto.randomUUID(), pinIndex: i + 1, name: String(i + 1), type: 'Not Used'
    }));
    setFormData(prev => ({
      ...prev,
      defaultConnectors: prev.defaultConnectors?.map(c => 
        c.id === id ? { ...c, connectorTemplateId: newId, pins: initialPins } : c
      )
    }));
    setConfirmConnectorChange(null);
  };

  const updateConnectorRefId = (id: string, newTemplateId: number) => {
    setConfirmConnectorChange({ id, newId: newTemplateId });
  };

  const updatePinParams = (connId: string, pinId: string, param: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      defaultConnectors: prev.defaultConnectors?.map(c => 
        c.id === connId ? {
          ...c,
          pins: c.pins.map(p => p.id === pinId ? { ...p, [param]: value } : p)
        } : c
      )
    }));
  };

  const deleteConnectorRef = (id: string) => {
    setFormData(prev => ({
      ...prev,
      defaultConnectors: prev.defaultConnectors?.filter(c => c.id !== id)
    }));
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const confirmDelete = async () => {
    if (confirmDeleteId !== null) {
      await db.templates.delete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const saveTemplate = async () => {
    if (!formData.name) return alert('Name required');
    await db.templates.put(formData as ComponentTemplate);
    setIsFormOpen(false);
    setFormData({ name: '', type: 'Avionics', drawContinuous: 0, drawIntermittent: 0, defaultConnectors: [], imageData: '' });
  };

  const editTemplate = (tpl: ComponentTemplate) => {
    setFormData(tpl);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col h-full w-full text-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Component Templates</h2>
          <p className="text-text-muted text-sm">Define complete hardware modules containing connectors.</p>
        </div>
        <button
          onClick={() => { setFormData({ name: '', type: 'Avionics', drawContinuous: 0, drawIntermittent: 0, defaultConnectors: [], imageData: '' }); setIsFormOpen(true); }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-accent/20"
        >
          <Plus size={16} />
          Create Component
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-panel border border-border rounded-xl p-8 mb-10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
            <h2 className="text-xl font-medium text-white">{formData.id ? 'Edit' : 'New'} Component Definition</h2>
             <button onClick={() => setIsFormOpen(false)} className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-canvas">
               <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block font-medium text-text-muted mb-2">Component Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Garmin G3X Touch"
                  className="w-full bg-canvas border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-text-muted mb-2">Category</label>
                  <input 
                    type="text" 
                    value={formData.type} 
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-canvas border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-medium text-text-muted mb-2">Continuous Draw (A)</label>
                  <input 
                    type="number" 
                    value={formData.drawContinuous || ''} 
                    onChange={e => setFormData({ ...formData, drawContinuous: Number(e.target.value) })}
                    className="w-full bg-canvas border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block font-medium text-text-muted mb-2">Component Visual</label>
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
              <div className="flex items-center justify-between">
                <label className="block font-medium text-text-muted">Assigned Connectors & Pins</label>
                <button 
                  onClick={addConnectorRef}
                  className="bg-canvas hover:bg-canvas/80 text-white border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <LinkIcon size={14} /> Link Connector
                </button>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.defaultConnectors?.length === 0 && (
                  <div className="text-center text-text-muted py-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center">
                    No connectors attached.<br/>
                    <span className="text-xs">Add a connector to define I/O pins.</span>
                  </div>
                )}
                {formData.defaultConnectors?.map((conn) => (
                  <div key={conn.id} className="bg-canvas border border-border rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex gap-3 items-center">
                      <input 
                        type="text" 
                        value={conn.customName}
                        onChange={e => updateConnectorRef(conn.id, 'customName', e.target.value)}
                        className="w-24 bg-panel border border-border rounded-lg px-3 py-2 text-white"
                        placeholder="Ref (J1)"
                      />
                      <select 
                        value={conn.connectorTemplateId}
                        onChange={e => updateConnectorRefId(conn.id, Number(e.target.value))}
                        className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-white outline-none"
                      >
                        {connectorTemplates.map(ct => (
                           <option key={ct.id} value={ct.id}>{ct.name} ({ct.pinCount || 0} pins)</option>
                        ))}
                      </select>
                      <button onClick={() => deleteConnectorRef(conn.id)} className="text-text-muted hover:text-system-error p-2 rounded hover:bg-system-error/10">
                         <X size={18} />
                      </button>
                    </div>

                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar bg-panel rounded-lg p-3 border border-border/50">
                      {conn.pins?.map(pin => (
                        <div key={pin.id} className="flex gap-3 items-center text-xs">
                           <span className="text-text-muted font-mono w-6 text-right">{pin.pinIndex}.</span>
                           <input
                             type="text"
                             value={pin.name}
                             onChange={e => updatePinParams(conn.id, pin.id, 'name', e.target.value)}
                             className="flex-1 bg-canvas border border-border rounded-md px-2 py-1.5 text-white focus:border-accent outline-none"
                             placeholder="Pin Label"
                           />
                           <select
                             value={pin.type}
                             onChange={e => updatePinParams(conn.id, pin.id, 'type', e.target.value)}
                             className="w-[110px] bg-canvas border border-border rounded-md px-2 py-1.5 text-text-muted outline-none focus:border-accent"
                           >
                             <option>Power In</option>
                             <option>Power Out</option>
                             <option>Data In</option>
                             <option>Data Out</option>
                             <option>Input</option>
                             <option>Output</option>
                             <option>Ground</option>
                             <option>Not Used</option>
                           </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4 border-t border-border pt-6">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="px-6 py-2.5 rounded-lg font-medium text-white hover:bg-canvas transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={saveTemplate}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-2.5 rounded-lg font-medium transition-all shadow-md shadow-accent/20"
            >
              <Save size={16} />
              {formData.id ? 'Update Component' : 'Save Component'}
            </button>
          </div>
        </div>
      )}

      {/* List Existing */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {templates?.map(tpl => (
          <div key={tpl.id} className="bg-panel border border-border rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-canvas border border-border/50 rounded-xl flex items-center justify-center p-2 shrink-0">
                {tpl.imageData ? (
                  <img src={tpl.imageData} alt={tpl.name} className="max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-text-muted break-words text-center border border-dashed border-border/50 px-1 py-1 rounded">No Img</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-base truncate mb-0.5 pr-16">{tpl.name}</h3>
                <p className="text-xs text-text-muted mb-3">{tpl.type}</p>
                <div className="flex gap-4 text-sm text-text-muted bg-canvas border border-border px-3 py-1.5 rounded-lg inline-flex">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-muted/70 uppercase font-medium">Power</span>
                    <span className="font-mono text-system-warn block leading-tight">{tpl.drawContinuous}A</span>
                  </div>
                  <div className="w-px bg-border my-1"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-muted/70 uppercase font-medium">Connectors</span>
                    <span className="font-mono text-white block leading-tight">{tpl.defaultConnectors.length} refs</span>
                  </div>
                </div>
              </div>
            </div>
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
        ))}
        {templates?.length === 0 && !isFormOpen && (
          <div className="col-span-full text-center py-16 bg-panel/30 border-2 border-dashed border-border rounded-2xl text-text-muted">
            <p>No component templates defined yet.</p>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmDeleteId !== null}
        title="Delete Component Template"
        message="Delete this template? Instances on the canvas will keep their properties but lose template synchronization."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmModal 
        isOpen={confirmConnectorChange !== null}
        title="Change Connector Type"
        message="Changing the underlying connector type will reset all existing pin labels and logic. Proceed?"
        onConfirm={executeConnectorChange}
        onCancel={() => setConfirmConnectorChange(null)}
      />
    </div>
  );
}
