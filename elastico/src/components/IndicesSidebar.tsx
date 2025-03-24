/**
 * elastico/src/components/IndicesSidebar.tsx
 * Sidebar component showing Elasticsearch indices in a tree format
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ElasticsearchIndex } from '../types/elasticsearch';
import { useElasticsearch } from '../contexts/ElasticsearchContext';
import { useToast } from '../contexts/ToastContext';

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
  registerRefresh?: (refreshFn: () => Promise<void>) => void;
}

/**
 * Interface for the form data to create a new index
 */
interface NewIndexFormData {
  name: string;
  shards: number;
  replicas: number;
}

/**
 * Sidebar component with search and index tree
 */
const IndicesSidebar: React.FC<IndicesSidebarProps> = ({ onSelectIndex, selectedIndex, registerRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [indices, setIndices] = useState<ElasticsearchIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Index Dialog State
  const [showNewIndexDialog, setShowNewIndexDialog] = useState(false);
  const [isCreatingIndex, setIsCreatingIndex] = useState(false);
  const [newIndexForm, setNewIndexForm] = useState<NewIndexFormData>({
    name: '',
    shards: 1,
    replicas: 1,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewIndexFormData, string>>>({});

  const { service: elasticsearchService, connectionStatus } = useElasticsearch();
  const { showToast } = useToast();

  // Create a stable loadIndices function with useCallback so it can be registered
  const loadIndices = useCallback(async () => {
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
  }, [elasticsearchService]);

  // Register the loadIndices function with the parent component
  useEffect(() => {
    if (registerRefresh) {
      registerRefresh(loadIndices);
    }
  }, [registerRefresh, loadIndices]);

  // Load indices when the connection changes
  useEffect(() => {
    loadIndices();
  }, [elasticsearchService, connectionStatus, loadIndices]);

  // Handle refresh button click
  const handleRefresh = async () => {
    setIsLoading(true);
    await loadIndices();
  };

  // Handle new index dialog open
  const handleOpenNewIndexDialog = () => {
    if (!elasticsearchService.isConnected()) {
      showToast('Please connect to Elasticsearch before creating an index', 'error');
      return;
    }
    setNewIndexForm({ name: '', shards: 1, replicas: 1 });
    setFormErrors({});
    setShowNewIndexDialog(true);
  };

  // Handle form input changes for string fields
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setNewIndexForm((prev) => ({
      ...prev,
      name: value,
    }));

    // Clear error
    if (formErrors.name) {
      setFormErrors((prev) => ({
        ...prev,
        name: undefined,
      }));
    }
  };

  // Handle form input changes for number fields
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'shards' | 'replicas') => {
    const { value } = e.target;
    const numValue = value === '' ? 1 : parseInt(value, 10);

    setNewIndexForm((prev) => ({
      ...prev,
      [field]: numValue,
    }));

    // Clear error
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Validate the form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewIndexFormData, string>> = {};

    if (!newIndexForm.name) {
      errors.name = 'Index name is required';
    } else if (!/^[a-z0-9_-]+$/.test(newIndexForm.name)) {
      errors.name = 'Index name can only contain lowercase letters, numbers, underscores and hyphens';
    }

    if (newIndexForm.shards < 1) {
      errors.shards = 'Must have at least 1 shard';
    }

    if (newIndexForm.replicas < 0) {
      errors.replicas = 'Replicas cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleCreateIndex = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreatingIndex(true);

    try {
      // Call the Elasticsearch service to create a new index
      await elasticsearchService.createIndex(newIndexForm.name, newIndexForm.shards, newIndexForm.replicas);

      showToast(`Index "${newIndexForm.name}" was successfully created`, 'success');
      setShowNewIndexDialog(false);

      // Refresh the indices list
      await loadIndices();
    } catch (error) {
      console.error('Failed to create index:', error);
      showToast(`Failed to create index: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsCreatingIndex(false);
    }
  };

  // Filter indices based on search term
  const filteredIndices = indices.filter((index) => index.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className='h-full flex flex-col bg-white border-r border-gray-200 w-64'>
      {/* New Index Dialog */}
      {showNewIndexDialog && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full shadow-xl'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>Create New Index</h3>

            <div className='space-y-4'>
              <div>
                <label htmlFor='indexName' className='block text-sm font-medium text-gray-700'>
                  Index Name
                </label>
                <input
                  type='text'
                  id='indexName'
                  name='name'
                  value={newIndexForm.name}
                  onChange={handleNameChange}
                  className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm'
                  placeholder='my-new-index'
                />
                {formErrors.name && <p className='mt-1 text-sm text-red-600'>{formErrors.name}</p>}
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label htmlFor='shards' className='block text-sm font-medium text-gray-700'>
                    Shards
                  </label>
                  <input
                    type='number'
                    id='shards'
                    name='shards'
                    min='1'
                    value={newIndexForm.shards}
                    onChange={(e) => handleNumberChange(e, 'shards')}
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm'
                  />
                  {formErrors.shards && <p className='mt-1 text-sm text-red-600'>{formErrors.shards}</p>}
                </div>

                <div>
                  <label htmlFor='replicas' className='block text-sm font-medium text-gray-700'>
                    Replicas
                  </label>
                  <input
                    type='number'
                    id='replicas'
                    name='replicas'
                    min='0'
                    value={newIndexForm.replicas}
                    onChange={(e) => handleNumberChange(e, 'replicas')}
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm'
                  />
                  {formErrors.replicas && <p className='mt-1 text-sm text-red-600'>{formErrors.replicas}</p>}
                </div>
              </div>
            </div>

            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() => setShowNewIndexDialog(false)}
                className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                disabled={isCreatingIndex}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIndex}
                className='px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50'
                disabled={isCreatingIndex}
              >
                {isCreatingIndex ? (
                  <>
                    <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Index'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='px-4 py-2 border-b border-gray-200'>
        <h2 className='text-md font-medium text-gray-900'>Indices</h2>
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
          <div className='flex space-x-2'>
            <button onClick={handleOpenNewIndexDialog} className='text-xs text-purple-600 hover:text-purple-800 flex items-center'>
              <svg className='h-3 w-3 mr-1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                <path fillRule='evenodd' d='M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z' clipRule='evenodd' />
              </svg>
              New
            </button>
            <button onClick={handleRefresh} className='text-xs text-purple-600 hover:text-purple-800 flex items-center'>
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
    </div>
  );
};

export default IndicesSidebar;
