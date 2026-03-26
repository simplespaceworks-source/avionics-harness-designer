import { useState } from 'react';
import ComponentTemplatesView from '../components/templates/ComponentTemplatesView';
import ConnectorTemplatesView from '../components/templates/ConnectorTemplatesView';

export default function Templates() {
  const [activeTab, setActiveTab] = useState<'components' | 'connectors'>('components');

  return (
    <div className="flex flex-col h-full w-full mx-auto p-10 lg:p-14 overflow-y-auto">
      <div className="flex bg-panel rounded-xl p-1 w-fit mb-8 border border-border mt-4">
        <button 
          onClick={() => setActiveTab('components')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'components' ? 'bg-canvas text-white shadow' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
        >
          Component Templates
        </button>
        <button 
          onClick={() => setActiveTab('connectors')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'connectors' ? 'bg-canvas text-white shadow' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
        >
          Connector Templates
        </button>
      </div>

      {activeTab === 'components' ? <ComponentTemplatesView /> : <ConnectorTemplatesView />}
    </div>
  );
}
