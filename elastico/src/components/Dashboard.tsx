/**
 * elastico/src/components/Dashboard.tsx
 * Main dashboard layout with sidebar and tabbed content area
 */
import React, { useState } from 'react';
import IndicesSidebar from './IndicesSidebar';
import IndexDetail from './IndexDetail';
import { ElasticsearchIndex } from '../types/elasticsearch';
import { useElasticsearch } from '../contexts/ElasticsearchContext';

/**
 * Tab representation for open indices
 */
interface IndexTab {
  index: ElasticsearchIndex;
  id: string; // Use the index name as the ID
}

/**
 * Main dashboard component
 */
const Dashboard: React.FC = () => {
  const [openTabs, setOpenTabs] = useState<IndexTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const { service: elasticsearchService, connectionStatus } = useElasticsearch();

  // Handle selecting an index from the sidebar
  const handleSelectIndex = (index: ElasticsearchIndex) => {
    // Check if the tab is already open
    const existingTabIndex = openTabs.findIndex((tab) => tab.id === index.name);

    if (existingTabIndex >= 0) {
      // If already open, just activate it
      setActiveTabId(index.name);
    } else {
      // Otherwise, add a new tab
      const newTab = { index, id: index.name };
      setOpenTabs([...openTabs, newTab]);
      setActiveTabId(index.name);
    }
  };

  // Handle closing a tab
  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    // Remove the tab
    const updatedTabs = openTabs.filter((tab) => tab.id !== tabId);
    setOpenTabs(updatedTabs);

    // If we closed the active tab, activate another one if available
    if (activeTabId === tabId && updatedTabs.length > 0) {
      setActiveTabId(updatedTabs[updatedTabs.length - 1].id);
    } else if (updatedTabs.length === 0) {
      setActiveTabId(null);
    }
  };

  // Get the currently active index
  const activeIndex = openTabs.find((tab) => tab.id === activeTabId)?.index || null;

  return (
    <div className='flex h-[calc(100vh-4rem)] bg-gray-100'>
      {/* Sidebar */}
      <IndicesSidebar onSelectIndex={handleSelectIndex} selectedIndex={activeIndex} />

      {/* Main content area */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Tabs */}
        <div className='bg-white border-b border-gray-200 flex overflow-x-auto'>
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center px-4 py-2 border-b-2 ${
                activeTabId === tab.id ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } cursor-pointer`}
            >
              <span className='truncate max-w-xs' title={tab.index.name}>
                {tab.index.name}
              </span>
              <button onClick={(e) => handleCloseTab(tab.id, e)} className='ml-2 text-gray-400 hover:text-gray-500'>
                <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Tab content */}
        <div className='flex-1 overflow-auto p-4'>
          {!elasticsearchService.isConnected() ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center'>
                <svg className='mx-auto h-12 w-12 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                </svg>
                <h3 className='mt-2 text-sm font-medium text-gray-900'>No connection</h3>
                <p className='mt-1 text-sm text-gray-500'>Connect to an Elasticsearch instance to get started.</p>
              </div>
            </div>
          ) : activeIndex ? (
            <IndexDetail index={activeIndex} />
          ) : (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center'>
                <svg className='mx-auto h-12 w-12 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='1.5'
                    d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                  />
                </svg>
                <h3 className='mt-2 text-sm font-medium text-gray-900'>No index selected</h3>
                <p className='mt-1 text-sm text-gray-500'>Select an index from the sidebar to view its details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
