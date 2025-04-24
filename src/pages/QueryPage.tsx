import React, { useState, useEffect } from 'react';
import { QueryResult } from '../types/elasticsearch';
import { useElasticsearch } from '../contexts/ElasticsearchContext';

/**
 * Page component for executing Elasticsearch queries
 */
const QueryPage: React.FC = () => {
  const [index, setIndex] = useState<string>('');
  const [query, setQuery] = useState<string>('{\n  "query": {\n    "query_string": {\n      "query": "*"\n    }\n  }\n}');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [availableIndices, setAvailableIndices] = useState<string[]>([]);

  // Get elasticsearch service from context
  const { service: elasticsearchService, connectionStatus } = useElasticsearch();

  // Load available indices when component mounts or connection changes
  useEffect(() => {
    loadIndices();
  }, [connectionStatus]);

  const loadIndices = async () => {
    if (!elasticsearchService.isConnected()) {
      setError('Not connected to Elasticsearch. Please connect first.');
      return;
    }

    try {
      const indicesData = await elasticsearchService.getIndices();
      setAvailableIndices(indicesData.map((idx) => idx.name));

      // Set default index if none selected yet
      if (!index && indicesData.length > 0) {
        setIndex(indicesData[0].name);
      }
    } catch (error) {
      console.error('Failed to load indices:', error);
      setError(`Failed to load indices: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const executeQuery = async () => {
    if (!elasticsearchService.isConnected()) {
      setError('Not connected to Elasticsearch. Please connect first.');
      return;
    }

    if (!index) {
      setError('Please select an index');
      return;
    }

    try {
      // Parse the query to validate it's proper JSON
      JSON.parse(query);
    } catch (error) {
      setError('Invalid JSON query');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const queryResult = await elasticsearchService.executeQuery(index, query);
      setResult(queryResult);
    } catch (error) {
      console.error('Query execution failed:', error);
      setError(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold text-gray-900 mb-6'>Query Elasticsearch</h1>

      {error && (
        <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-md'>
          <p className='text-red-700'>{error}</p>
        </div>
      )}

      <div className='mb-6'>
        <label htmlFor='index-select' className='block text-sm font-medium text-gray-700 mb-1'>
          Select Index
        </label>
        <select
          id='index-select'
          value={index}
          onChange={(e) => setIndex(e.target.value)}
          className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500'
        >
          <option value=''>Select an index</option>
          {availableIndices.map((idx) => (
            <option key={idx} value={idx}>
              {idx}
            </option>
          ))}
        </select>
      </div>

      <div className='mb-6'>
        <label htmlFor='query-editor' className='block text-sm font-medium text-gray-700 mb-1'>
          Query (JSON)
        </label>
        <textarea
          id='query-editor'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={10}
          className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono'
          placeholder='{"query": {"match_all": {}}}'
        />
      </div>

      <div className='mb-8'>
        <button
          onClick={executeQuery}
          disabled={isExecuting}
          className='px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50'
        >
          {isExecuting ? 'Executing...' : 'Execute Query'}
        </button>
      </div>

      {result && (
        <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
          <div className='px-4 py-5 sm:px-6 flex justify-between items-center'>
            <div>
              <h3 className='text-lg leading-6 font-medium text-gray-900'>Query Results</h3>
              <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                Took {result.took}ms · {result.total} results
              </p>
            </div>
          </div>

          <div className='border-t border-gray-200 px-4 py-5 sm:p-6'>
            <div className='overflow-x-auto'>
              {result.hits.length === 0 ? (
                <p className='text-gray-500'>No results found</p>
              ) : (
                <pre className='language-json bg-gray-50 p-4 rounded-md overflow-auto max-h-96 text-sm'>{JSON.stringify(result.hits, null, 2)}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryPage;
