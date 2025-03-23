/**
 * elastico/src/components/IndicesSidebar.tsx
 * Sidebar component showing Elasticsearch indices in a tree format
 */
import React, { useState, useEffect } from 'react';
import { ElasticsearchIndex } from '../types/elasticsearch';
import { useElasticsearch } from '../contexts/ElasticsearchContext';

export interface IndexTreeProps {
  indices: ElasticsearchIndex[];
  onSelectIndex: (index: ElasticsearchIndex) => void;
  selectedIndex?: ElasticsearchIndex | null;
}

/**
 * Tree view component for displaying indices
 */
const IndexTree: React.FC<IndexTreeProps> = ({ indices, onSelectIndex, selectedIndex }) => {
  // Sort indices alphabetically by name
  const sortedIndices = [...indices].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ul className='space-y-1'>
      {sortedIndices.map((index) => (
        <li key={index.name}>
          <button
            onClick={() => onSelectIndex(index)}
            className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-md ${selectedIndex?.name === index.name ? 'bg-purple-100 text-purple-900' : 'hover:bg-gray-100'}`}
          >
            <div className='flex items-center'>
              <span className={`w-2 h-2 rounded-full mr-2 ${index.health === 'green' ? 'bg-green-500' : index.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              <span className='truncate' title={index.name}>
                {index.name}
              </span>
            </div>
            <div className='text-xs text-gray-500'>{index.docsCount.toLocaleString()}</div>
          </button>
        </li>
      ))}
    </ul>
  );
};

interface IndicesSidebarProps {
  onSelectIndex: (index: ElasticsearchIndex) => void;
  selectedIndex?: ElasticsearchIndex | null;
}

/**
 * Sidebar component with search and index tree
 */
const IndicesSidebar: React.FC<IndicesSidebarProps> = ({ onSelectIndex, selectedIndex }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [indices, setIndices] = useState<ElasticsearchIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { service: elasticsearchService, connectionStatus } = useElasticsearch();

  // Load indices when the connection changes
  useEffect(() => {
    const loadIndices = async () => {
      if (!elasticsearchService.isConnected()) {
        setIndices([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const indicesData = await elasticsearchService.getIndices();
        setIndices(indicesData);
      } catch (error) {
        console.error('Failed to load indices:', error);
        setError(`Failed to load indices: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadIndices();
  }, [elasticsearchService, connectionStatus]);

  // Filter indices based on search term
  const filteredIndices = indices.filter((index) => index.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className='h-full flex flex-col bg-white border-r border-gray-200 w-64'>
      <div className='px-4 py-3 border-b border-gray-200'>
        <h2 className='text-lg font-medium text-gray-900'>Indices</h2>
      </div>

      <div className='px-3 py-2 border-b border-gray-200'>
        <div className='relative'>
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <svg className='h-5 w-5 text-gray-400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z' clipRule='evenodd' />
            </svg>
          </div>
          <input
            type='text'
            className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm'
            placeholder='Search indices'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-2'>
        {isLoading ? (
          <div className='flex justify-center items-center h-32'>
            <svg className='animate-spin h-6 w-6 text-purple-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
            </svg>
          </div>
        ) : error ? (
          <div className='text-center py-4 px-2'>
            <p className='text-sm text-red-600'>{error}</p>
          </div>
        ) : !elasticsearchService.isConnected() ? (
          <div className='text-center py-4 px-2'>
            <p className='text-sm text-gray-500'>Not connected to Elasticsearch</p>
          </div>
        ) : filteredIndices.length === 0 ? (
          <div className='text-center py-4 px-2'>
            <p className='text-sm text-gray-500'>{searchTerm ? 'No matching indices found' : 'No indices found'}</p>
          </div>
        ) : (
          <IndexTree indices={filteredIndices} onSelectIndex={onSelectIndex} selectedIndex={selectedIndex} />
        )}
      </div>

      <div className='px-4 py-3 border-t border-gray-200 bg-gray-50'>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-gray-500'>
            {indices.length} {indices.length === 1 ? 'index' : 'indices'}
          </span>
          <button
            onClick={() => {
              setIsLoading(true);
              elasticsearchService
                .getIndices()
                .then((indicesData) => {
                  setIndices(indicesData);
                  setError(null);
                })
                .catch((error) => {
                  console.error('Failed to refresh indices:', error);
                  setError(`Failed to refresh indices: ${error instanceof Error ? error.message : String(error)}`);
                })
                .finally(() => {
                  setIsLoading(false);
                });
            }}
            className='text-xs text-purple-600 hover:text-purple-800 flex items-center'
          >
            <svg className='h-3 w-3 mr-1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
              <path
                fillRule='evenodd'
                d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
                clipRule='evenodd'
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndicesSidebar;
