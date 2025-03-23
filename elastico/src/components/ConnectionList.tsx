import React from 'react';
import { ElasticsearchConnection } from '../types/elasticsearch';

interface ConnectionListProps {
  connections: ElasticsearchConnection[];
  onConnect: (connectionId: string) => void;
  onEdit: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
}

/**
 * Component to display a list of saved Elasticsearch connections
 */
const ConnectionList: React.FC<ConnectionListProps> = ({ connections, onConnect, onEdit, onDelete }) => {
  return (
    <div className='bg-white rounded-lg shadow overflow-hidden'>
      <div className='px-4 py-5 sm:px-6'>
        <h3 className='text-lg leading-6 font-medium text-gray-900'>Saved Connections</h3>
        <p className='mt-1 max-w-2xl text-sm text-gray-500'>Your Elasticsearch connection profiles</p>
      </div>

      {connections.length === 0 ? (
        <div className='px-4 py-5 sm:p-6 text-center'>
          <p className='text-gray-500'>No connections yet. Create one to get started.</p>
        </div>
      ) : (
        <ul className='divide-y divide-gray-200'>
          {connections.map((connection) => (
            <li key={connection.id} className='px-4 py-4 sm:px-6 hover:bg-gray-50'>
              <div className='flex items-center justify-between'>
                <div className='flex-1 min-w-0'>
                  <h4 className='text-md font-medium text-gray-900 truncate'>{connection.name}</h4>
                  <p className='mt-1 flex items-center text-sm text-gray-500'>
                    {connection.ssl ? 'https://' : 'http://'}
                    {connection.host}:{connection.port}
                  </p>
                  <p className='mt-1 text-xs text-gray-500'>Authentication: {connection.authType === 'none' ? 'None' : connection.authType === 'basic' ? 'Basic Auth' : 'API Key'}</p>
                </div>
                <div className='flex-shrink-0 flex space-x-2'>
                  <button
                    onClick={() => onConnect(connection.id)}
                    className='inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => onEdit(connection.id)}
                    className='inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(connection.id)}
                    className='inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConnectionList;
