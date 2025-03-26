import React, { useState, useEffect } from 'react';
import { ElasticsearchConnection } from '../types/elasticsearch';
import { ConnectionManager } from '../services/connectionManager';
import { useElasticsearch } from '../contexts/ElasticsearchContext';
import ConnectionList from '../components/ConnectionList';
import ConnectionDialog from '../components/ConnectionDialog';

/**
 * Page component for managing Elasticsearch connections
 */
const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<ElasticsearchConnection[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ElasticsearchConnection | null>(null);

  // Get elasticsearch service and state from context
  const { service: elasticsearchService, connectionStatus, setConnectionStatus, isConnecting, setIsConnecting, connectionError, setConnectionError } = useElasticsearch();

  // Initialize services
  const connectionManager = new ConnectionManager();

  // Load connections when component mounts
  useEffect(() => {
    const loadedConnections = connectionManager.getAllConnections();
    setConnections(loadedConnections);
  }, []);

  const handleAddConnection = () => {
    setEditingConnection(null);
    setIsFormVisible(true);
  };

  const handleEditConnection = (connectionId: string) => {
    const connection = connectionManager.getConnection(connectionId);
    if (connection) {
      setEditingConnection(connection);
      setIsFormVisible(true);
    }
  };

  const handleDeleteConnection = (connectionId: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      connectionManager.deleteConnection(connectionId);
      setConnections(connectionManager.getAllConnections());
    }
  };

  const handleConnectToElasticsearch = async (connectionId: string) => {
    const connection = connectionManager.getConnection(connectionId);
    if (!connection) return;

    setIsConnecting(true);
    setConnectionError(null);
    setConnectionStatus(null);

    try {
      const response = await elasticsearchService.connect(connection);
      setConnectionStatus(response);

      if (response.connected) {
        // Navigate to the dashboard or index list page
        console.log('Connected successfully!', response);
        // Show success message with cluster info
      } else {
        setConnectionError(response.error || 'Could not connect to Elasticsearch. Please check your connection details.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveConnection = (connection: Omit<ElasticsearchConnection, 'id'>) => {
    if (editingConnection) {
      // Update existing connection
      connectionManager.updateConnection(editingConnection.id, connection);
    } else {
      // Add new connection
      connectionManager.addConnection(connection);
    }

    // Update the connections list and close the form
    setConnections(connectionManager.getAllConnections());
    setIsFormVisible(false);
    setEditingConnection(null);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setEditingConnection(null);
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>Elasticsearch Connections</h1>
        <button
          onClick={handleAddConnection}
          className='px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
        >
          Add Connection
        </button>
      </div>

      {connectionError && (
        <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-md'>
          <p className='text-red-700'>{connectionError}</p>
        </div>
      )}

      {connectionStatus && connectionStatus.connected && (
        <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-md'>
          <p className='text-green-700'>
            Connected to {connectionStatus.clusterName}
            {connectionStatus.status && ` (Status: ${connectionStatus.status})`}
          </p>
        </div>
      )}

      {isConnecting && (
        <div className='mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md'>
          <p className='text-blue-700'>Connecting to Elasticsearch...</p>
        </div>
      )}

      <ConnectionList connections={connections} onConnect={handleConnectToElasticsearch} onEdit={handleEditConnection} onDelete={handleDeleteConnection} />

      <ConnectionDialog isOpen={isFormVisible} onClose={handleCancelForm} onSave={handleSaveConnection} initialValues={editingConnection || undefined} isEditing={!!editingConnection} />
    </div>
  );
};

export default ConnectionsPage;
