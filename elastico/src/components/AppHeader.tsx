/**
 * elastico/src/components/AppHeader.tsx
 * Main application header with connection management features
 */
import React, { useState } from 'react';
import { useElasticsearch } from '../contexts/ElasticsearchContext';
import { ConnectionManager } from '../services/connectionManager';
import { ElasticsearchConnection } from '../types/elasticsearch';
import ConnectionForm from './ConnectionForm';

// Dialog component for modals
const Dialog: React.FC<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0'>
        <div className='fixed inset-0 transition-opacity' aria-hidden='true'>
          <div
            className='absolute inset-0 bg-gray-500 opacity-75'
            onClick={(e) => {
              console.log('Backdrop clicked');
              e.stopPropagation();
              onClose();
            }}
          ></div>
        </div>
        <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
          &#8203;
        </span>
        <div
          className='inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md sm:my-8 sm:align-middle sm:max-w-lg sm:p-6 mx-auto'
          onClick={(e) => e.stopPropagation()} // Prevent clicks in the dialog from bubbling to backdrop
        >
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-lg leading-6 font-medium text-gray-900'>{title}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Close button clicked');
                onClose();
              }}
              className='text-gray-400 hover:text-gray-500'
            >
              <span className='sr-only'>Close</span>
              <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
          <div className='overflow-x-auto'>{children}</div>
        </div>
      </div>
    </div>
  );
};

// Connection list component for the browse dialog
const ConnectionsList: React.FC<{
  connections: ElasticsearchConnection[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onConnect: (id: string) => void;
  activeConnectionId?: string;
}> = ({ connections, onEdit, onDelete, onConnect, activeConnectionId }) => {
  console.log('Rendering ConnectionsList with connections:', connections);
  console.log('Active connection ID:', activeConnectionId);

  return (
    <div className='mt-4'>
      {connections.length === 0 ? (
        <div className='text-center py-6 bg-gray-50 rounded-lg'>
          <p className='text-gray-500'>No connections available. Add a connection to get started.</p>
        </div>
      ) : (
        <ul className='divide-y divide-gray-200'>
          {connections.map((connection) => (
            <li key={connection.id} className='py-4 hover:bg-gray-50'>
              <div className='flex flex-col space-y-3'>
                {/* Connection info */}
                <div>
                  <p className='text-sm font-medium text-gray-900'>{connection.name}</p>
                  <p className='text-sm text-gray-500 truncate'>
                    {connection.ssl ? 'https://' : 'http://'}
                    {connection.host}:{connection.port} • {connection.authType !== 'none' ? 'Authenticated' : 'No Auth'}
                  </p>
                </div>

                {/* Actions row */}
                <div className='flex justify-between items-center'>
                  {/* Connect button */}
                  {activeConnectionId === connection.id ? (
                    <span className='inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800'>
                      <span className='w-2 h-2 mr-2 bg-green-500 rounded-full'></span>
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Connect button clicked for connection:', connection.id);
                        onConnect(connection.id);
                      }}
                      className='bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-3 rounded-md text-sm'
                    >
                      Connect
                    </button>
                  )}

                  {/* Edit/Delete buttons */}
                  <div className='flex space-x-2'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(connection.id);
                      }}
                      className='inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50'
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(connection.id);
                      }}
                      className='inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-gray-50'
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Application header component with connection management
 */
const AppHeader: React.FC = () => {
  const [isConnectionsDialogOpen, setIsConnectionsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ElasticsearchConnection | null>(null);
  const [connections, setConnections] = useState<ElasticsearchConnection[]>([]);

  const { service: elasticsearchService, connectionStatus, setConnectionStatus, isConnecting, setIsConnecting, connectionError, setConnectionError } = useElasticsearch();

  // Use a ref for the ConnectionManager to ensure we use the same instance
  const connectionManagerRef = React.useRef(new ConnectionManager());
  const connectionManager = connectionManagerRef.current;

  // Load connections
  React.useEffect(() => {
    console.log('Loading connections from storage');
    const loadedConnections = connectionManager.getAllConnections();
    console.log('Loaded connections:', loadedConnections);
    setConnections(loadedConnections);
  }, [isConnectionsDialogOpen, isAddDialogOpen, isEditDialogOpen, connectionManager]);

  // For debugging
  React.useEffect(() => {
    console.log('Current connections state:', connections);
  }, [connections]);

  const handleConnect = async (connectionId: string) => {
    console.log('handleConnect called with connectionId:', connectionId);
    const connection = connectionManager.getConnection(connectionId);
    if (!connection) {
      console.error('Connection not found for id:', connectionId);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    setConnectionStatus(null);

    try {
      console.log('Attempting to connect with config:', connection);
      const response = await elasticsearchService.connect(connection);
      console.log('Connection response:', response);
      setConnectionStatus(response);

      if (!response.connected) {
        setConnectionError(response.error || 'Could not connect to Elasticsearch. Please check your connection details.');
      } else {
        // Close dialogs if open
        setIsConnectionsDialogOpen(false);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveConnection = (connection: Omit<ElasticsearchConnection, 'id'>) => {
    console.log('Saving connection:', connection);

    if (editingConnection) {
      // Update existing connection
      connectionManager.updateConnection(editingConnection.id, connection);
      setIsEditDialogOpen(false);
    } else {
      // Add new connection
      connectionManager.addConnection(connection);
      setIsAddDialogOpen(false);
    }

    // Refresh connections list
    const updatedConnections = connectionManager.getAllConnections();
    console.log('Updated connections list:', updatedConnections);
    setConnections(updatedConnections);
  };

  const handleEditConnection = (connectionId: string) => {
    const connection = connectionManager.getConnection(connectionId);
    if (connection) {
      setEditingConnection(connection);
      setIsEditDialogOpen(true);
    }
  };

  const handleDeleteConnection = (connectionId: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      connectionManager.deleteConnection(connectionId);
      setConnections(connectionManager.getAllConnections());
    }
  };

  const activeConnection = elasticsearchService.getCurrentConnection();

  return (
    <header className='bg-white shadow-sm'>
      <div className='max-w-full mx-auto px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-700 to-purple-500'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex items-center'>
            <span className='text-xl font-bold text-white'>Elastiky</span>

            {/* Connection dropdown */}
            <div className='ml-6 relative'>
              <button
                type='button'
                className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-purple-100 bg-purple-800 hover:bg-purple-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                onClick={() => setIsConnectionsDialogOpen(true)}
              >
                {activeConnection ? (
                  <>
                    <span className='mr-2'>📊</span>
                    {activeConnection.name}
                  </>
                ) : (
                  'Select Connection'
                )}
                <svg className='ml-2 -mr-0.5 h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                  <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
                </svg>
              </button>
            </div>

            {/* Connection status indicator */}
            {connectionStatus && connectionStatus.connected && (
              <div className='ml-4 text-sm text-purple-100 flex items-center'>
                <span className='w-2 h-2 bg-green-500 rounded-full mr-2'></span>
                Connected to {connectionStatus.clusterName}
                {connectionStatus.status && ` (${connectionStatus.status})`}
              </div>
            )}
          </div>

          <div className='flex items-center space-x-4'>
            {/* Browse connections button */}
            <button
              onClick={() => setIsConnectionsDialogOpen(true)}
              className='inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-200 bg-purple-800 hover:bg-purple-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
            >
              Browse Connections
            </button>

            {/* Add connection button */}
            <button
              onClick={() => {
                setEditingConnection(null);
                setIsAddDialogOpen(true);
              }}
              className='inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
            >
              <svg className='-ml-0.5 mr-2 h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                <path fillRule='evenodd' d='M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z' clipRule='evenodd' />
              </svg>
              Add Connection
            </button>
          </div>
        </div>
      </div>

      {/* Connection error message */}
      {connectionError && (
        <div className='bg-red-50 border-l-4 border-red-400 p-4'>
          <div className='flex'>
            <div className='flex-shrink-0'>
              <svg className='h-5 w-5 text-red-400' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div className='ml-3'>
              <p className='text-sm text-red-700'>{connectionError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connecting indicator */}
      {isConnecting && (
        <div className='bg-blue-50 border-l-4 border-blue-400 p-4'>
          <div className='flex'>
            <div className='flex-shrink-0'>
              <svg className='animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
              </svg>
            </div>
            <div className='ml-3'>
              <p className='text-sm text-blue-700'>Connecting to Elasticsearch...</p>
            </div>
          </div>
        </div>
      )}

      {/* Connections Browse Dialog */}
      <Dialog title='Elasticsearch Connections' isOpen={isConnectionsDialogOpen} onClose={() => setIsConnectionsDialogOpen(false)}>
        {connections.length > 0 ? (
          <div>
            <p className='mb-4 text-sm text-gray-600'>Select a connection to connect to Elasticsearch</p>
            <ConnectionsList
              connections={connections}
              onEdit={handleEditConnection}
              onDelete={handleDeleteConnection}
              onConnect={handleConnect}
              activeConnectionId={elasticsearchService.getCurrentConnection()?.id}
            />
          </div>
        ) : (
          <div className='py-6 text-center'>
            <p className='text-gray-500 mb-4'>No connections available</p>
            <button
              onClick={() => {
                setIsConnectionsDialogOpen(false);
                setIsAddDialogOpen(true);
              }}
              className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700'
            >
              Add Connection
            </button>
          </div>
        )}
      </Dialog>

      {/* Add Connection Dialog */}
      <Dialog title='Add Connection' isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
        <ConnectionForm onSave={handleSaveConnection} onCancel={() => setIsAddDialogOpen(false)} />
      </Dialog>

      {/* Edit Connection Dialog */}
      <Dialog title='Edit Connection' isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
        <ConnectionForm onSave={handleSaveConnection} onCancel={() => setIsEditDialogOpen(false)} initialValues={editingConnection || undefined} />
      </Dialog>
    </header>
  );
};

export default AppHeader;
