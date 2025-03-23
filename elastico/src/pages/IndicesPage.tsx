import React, { useState, useEffect } from 'react';
import { ElasticsearchIndex } from '../types/elasticsearch';
import { useElasticsearch } from '../contexts/ElasticsearchContext';

/**
 * Page component for managing and viewing Elasticsearch indices
 */
const IndicesPage: React.FC = () => {
  const [indices, setIndices] = useState<ElasticsearchIndex[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get elasticsearch service from context
  const { service: elasticsearchService, connectionStatus } = useElasticsearch();

  // Load indices when component mounts or connection changes
  useEffect(() => {
    loadIndices();
  }, [connectionStatus]);

  const loadIndices = async () => {
    if (!elasticsearchService.isConnected()) {
      setError('Not connected to Elasticsearch. Please connect first.');
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

  // Filter indices based on search term
  const filteredIndices = indices.filter((index) => index.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Get icon based on health status
  const getHealthIcon = (health: 'green' | 'yellow' | 'red') => {
    switch (health) {
      case 'green':
        return <span className='w-3 h-3 bg-green-500 rounded-full inline-block mr-2'></span>;
      case 'yellow':
        return <span className='w-3 h-3 bg-yellow-500 rounded-full inline-block mr-2'></span>;
      case 'red':
        return <span className='w-3 h-3 bg-red-500 rounded-full inline-block mr-2'></span>;
      default:
        return null;
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>Elasticsearch Indices</h1>
        <div className='flex space-x-2'>
          <button onClick={loadIndices} className='px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-md'>
          <p className='text-red-700'>{error}</p>
        </div>
      )}

      <div className='mb-6'>
        <input
          type='text'
          placeholder='Search indices...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500'
        />
      </div>

      {isLoading ? (
        <div className='flex justify-center items-center h-64'>
          <p className='text-gray-500'>Loading indices...</p>
        </div>
      ) : (
        <div className='bg-white shadow overflow-hidden sm:rounded-md'>
          {filteredIndices.length === 0 ? (
            <div className='px-4 py-5 sm:p-6 text-center'>
              <p className='text-gray-500'>No indices found.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Name
                    </th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Health
                    </th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Docs Count
                    </th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Size
                    </th>
                    <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Shards
                    </th>
                    <th scope='col' className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {filteredIndices.map((index) => (
                    <tr key={index.name} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{index.name}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        <div className='flex items-center'>
                          {getHealthIcon(index.health)}
                          <span className='capitalize'>{index.health}</span>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize'>{index.status}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{index.docsCount.toLocaleString()}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{index.storageSize}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {index.primaryShards} / {index.replicaShards}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button className='text-primary-600 hover:text-primary-900 mr-4' onClick={() => console.log('View Index:', index.name)}>
                          View
                        </button>
                        <button className='text-red-600 hover:text-red-900' onClick={() => console.log('Delete Index:', index.name)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndicesPage;
