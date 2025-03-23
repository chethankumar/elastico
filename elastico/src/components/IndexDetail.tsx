/**
 * elastico/src/components/IndexDetail.tsx
 * Displays details and documents for a selected index
 */
import React, { useState, useEffect } from 'react';
import { ElasticsearchIndex, QueryResult } from '../types/elasticsearch';
import { useElasticsearch } from '../contexts/ElasticsearchContext';

// Tab interface definitions
type TabType = 'overview' | 'documents' | 'mappings' | 'settings';

interface IndexDetailProps {
  index: ElasticsearchIndex;
}

/**
 * Component to display index details and documents
 */
const IndexDetail: React.FC<IndexDetailProps> = ({ index }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const [pageSize] = useState(20);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { service: elasticsearchService } = useElasticsearch();

  // Load documents when the index changes or pagination/sort changes
  useEffect(() => {
    if (activeTab !== 'documents') return;

    const loadDocuments = async () => {
      if (!elasticsearchService.isConnected()) {
        setError('Not connected to Elasticsearch');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Build sort query part
        const sortConfig = sortField ? [{ [sortField]: { order: sortOrder } }] : [];

        // Build pagination query
        const from = (page - 1) * pageSize;

        // Construct the full query
        const queryString = JSON.stringify({
          from,
          size: pageSize,
          sort: sortConfig,
          query: {
            match_all: {},
          },
        });

        const result: QueryResult = await elasticsearchService.executeQuery(index.name, queryString);
        setDocuments(
          result.hits.map((hit) => ({
            id: hit._id,
            ...hit._source,
          }))
        );
        setTotalHits(result.total);
      } catch (error) {
        console.error('Failed to load documents:', error);
        setError(`Failed to load documents: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [elasticsearchService, index, page, pageSize, activeTab, sortField, sortOrder]);

  // Determine document fields for table columns based on first document
  let fields: string[] = [];
  if (documents.length > 0) {
    // Get all field names from the first document
    fields = Object.keys(documents[0] || {})
      .filter((key) => key !== 'id' && key !== '_score')
      .slice(0, 10); // Limit to 10 fields to avoid overloading the UI
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalHits / pageSize);

  // Handle pagination
  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Start with ascending order for a new field
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className='h-full flex flex-col bg-white overflow-hidden rounded-lg shadow'>
      {/* Header with index name and actions */}
      <div className='px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center'>
        <div>
          <h2 className='text-lg font-medium text-gray-900 flex items-center'>
            <span className={`w-3 h-3 rounded-full mr-2 ${index.health === 'green' ? 'bg-green-500' : index.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
            {index.name}
          </h2>
          <p className='mt-1 text-sm text-gray-500'>
            {index.docsCount.toLocaleString()} documents • {index.storageSize} size
          </p>
        </div>
        <div>
          <button
            className='ml-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete the index "${index.name}"? This action cannot be undone.`)) {
                // Delete index logic would go here
                console.log('Delete index:', index.name);
              }
            }}
          >
            Delete Index
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className='bg-gray-50 border-b border-gray-200'>
        <nav className='flex -mb-px'>
          <button
            className={`${
              activeTab === 'overview' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${
              activeTab === 'documents' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none`}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button
            className={`${
              activeTab === 'mappings' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none`}
            onClick={() => setActiveTab('mappings')}
          >
            Mappings
          </button>
          <button
            className={`${
              activeTab === 'settings' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Content area */}
      <div className='flex-1 overflow-hidden flex'>
        {/* Main content based on active tab */}
        <div className='flex-1 overflow-auto'>
          {activeTab === 'overview' && (
            <div className='p-6'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Index Overview</h3>
              <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='border-t border-gray-200 px-4 py-5 sm:px-6'>
                  <dl className='grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2'>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Name</dt>
                      <dd className='mt-1 text-sm text-gray-900'>{index.name}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Health</dt>
                      <dd className='mt-1 text-sm text-gray-900 flex items-center'>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${index.health === 'green' ? 'bg-green-500' : index.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                        <span className='capitalize'>{index.health}</span>
                      </dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Documents</dt>
                      <dd className='mt-1 text-sm text-gray-900'>{index.docsCount.toLocaleString()}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Size</dt>
                      <dd className='mt-1 text-sm text-gray-900'>{index.storageSize}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Status</dt>
                      <dd className='mt-1 text-sm text-gray-900 capitalize'>{index.status}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Shards</dt>
                      <dd className='mt-1 text-sm text-gray-900'>
                        {index.primaryShards} primary / {index.replicaShards} replica
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className='h-full flex flex-col'>
              {/* Documents table */}
              <div className='flex-1 overflow-x-auto'>
                {isLoading ? (
                  <div className='flex justify-center items-center h-full'>
                    <svg className='animate-spin h-8 w-8 text-purple-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                  </div>
                ) : error ? (
                  <div className='flex justify-center items-center h-full'>
                    <p className='text-red-500'>{error}</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className='flex justify-center items-center h-full'>
                    <p className='text-gray-500'>No documents found</p>
                  </div>
                ) : (
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100' onClick={() => handleSort('id')}>
                          <span className='flex items-center'>
                            ID
                            {sortField === 'id' && (
                              <svg className={`ml-1 h-4 w-4 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill='currentColor' viewBox='0 0 20 20'>
                                <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
                              </svg>
                            )}
                          </span>
                        </th>
                        {fields.map((field) => (
                          <th
                            key={field}
                            scope='col'
                            className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                            onClick={() => handleSort(field)}
                          >
                            <span className='flex items-center'>
                              {field}
                              {sortField === field && (
                                <svg className={`ml-1 h-4 w-4 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill='currentColor' viewBox='0 0 20 20'>
                                  <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
                                </svg>
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {documents.map((doc) => (
                        <tr key={doc.id} className={`hover:bg-gray-50 cursor-pointer ${selectedDoc?.id === doc.id ? 'bg-purple-50' : ''}`} onClick={() => setSelectedDoc(doc)}>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{doc.id ? doc.id.toString().substring(0, 10) + '...' : 'N/A'}</td>
                          {fields.map((field) => (
                            <td key={field} className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {renderFieldValue(doc[field])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {documents.length > 0 && (
                <div className='border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-white'>
                  <div className='flex-1 flex justify-between sm:hidden'>
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                      className='relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages}
                      className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
                    >
                      Next
                    </button>
                  </div>
                  <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-sm text-gray-700'>
                        Showing <span className='font-medium'>{(page - 1) * pageSize + 1}</span> to <span className='font-medium'>{Math.min(page * pageSize, totalHits)}</span> of{' '}
                        <span className='font-medium'>{totalHits}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px' aria-label='Pagination'>
                        <button
                          onClick={() => goToPage(page - 1)}
                          disabled={page === 1}
                          className='relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50'
                        >
                          <span className='sr-only'>Previous</span>
                          <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                            <path fillRule='evenodd' d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        </button>
                        {generatePaginationItems()}
                        <button
                          onClick={() => goToPage(page + 1)}
                          disabled={page === totalPages}
                          className='relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50'
                        >
                          <span className='sr-only'>Next</span>
                          <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                            <path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mappings' && (
            <div className='p-6'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Index Mappings</h3>
              <p className='text-gray-500'>Mappings will be implemented in a future update.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className='p-6'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Index Settings</h3>
              <p className='text-gray-500'>Settings will be implemented in a future update.</p>
            </div>
          )}
        </div>

        {/* Document details panel (shown when a document is selected) */}
        {activeTab === 'documents' && selectedDoc && (
          <div className='w-1/3 border-l border-gray-200 bg-gray-50 overflow-auto'>
            <div className='sticky top-0 bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center'>
              <h3 className='text-lg font-medium text-gray-900'>Document Detail</h3>
              <button onClick={() => setSelectedDoc(null)} className='text-gray-400 hover:text-gray-500'>
                <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            <div className='p-4'>
              <div className='rounded-md bg-white shadow-sm overflow-hidden border border-gray-200'>
                <div className='px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200'>
                  <h3 className='text-sm font-medium text-gray-900'>ID: {selectedDoc.id}</h3>
                </div>
                <div className='px-4 py-5 sm:p-6'>
                  <pre className='text-sm text-gray-700 overflow-auto whitespace-pre-wrap max-h-96'>{JSON.stringify(selectedDoc, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper function to generate pagination items
  function generatePaginationItems() {
    const items = [];
    // Logic to display a reasonable number of pagination items
    const maxPagesToShow = 5;
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // First page
    if (startPage > 1) {
      items.push(
        <button key='first' onClick={() => goToPage(1)} className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'>
          1
        </button>
      );
      if (startPage > 2) {
        items.push(
          <span key='ellipsis1' className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700'>
            ...
          </span>
        );
      }
    }

    // Pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`relative inline-flex items-center px-4 py-2 border ${
            page === i ? 'z-10 bg-purple-50 border-purple-500 text-purple-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          } text-sm font-medium`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <span key='ellipsis2' className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700'>
            ...
          </span>
        );
      }
      items.push(
        <button
          key='last'
          onClick={() => goToPage(totalPages)}
          className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'
        >
          {totalPages}
        </button>
      );
    }

    return items;
  }
};

// Helper function to render field values in the table
function renderFieldValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className='text-gray-400'>null</span>;
  }

  if (typeof value === 'object') {
    return <span className='text-blue-600'>{'{...}'}</span>;
  }

  if (typeof value === 'boolean') {
    return value ? <span className='text-green-600'>true</span> : <span className='text-red-600'>false</span>;
  }

  if (Array.isArray(value)) {
    return <span className='text-blue-600'>[...]</span>;
  }

  // For strings, numbers, etc.
  return String(value).length > 50 ? `${String(value).substring(0, 47)}...` : String(value);
}

export default IndexDetail;
