import { invoke } from '@tauri-apps/api/core';
import { 
  ElasticsearchConnection, 
  ElasticsearchIndex, 
  QueryResult,
  ClusterHealth,
  ConnectionResponse
} from '../types/elasticsearch';

/**
 * Service for interacting with Elasticsearch via the Tauri backend
 */
export class ElasticsearchService {
  private connection: ElasticsearchConnection | null = null;
  private clusterInfo: { name: string; status: string } | null = null;

  /**
   * Connect to an Elasticsearch instance using the Tauri backend
   * @param connectionConfig - The connection configuration
   * @returns Connection response object with details about the connection
   */
  async connect(connectionConfig: ElasticsearchConnection): Promise<ConnectionResponse> {
    try {
      // Convert the connection config to the format expected by the backend
      const backendConfig = {
        id: connectionConfig.id,
        name: connectionConfig.name,
        host: connectionConfig.host,
        port: connectionConfig.port,
        username: connectionConfig.username || null,
        password: connectionConfig.password || null,
        ssl: connectionConfig.ssl || false,
        api_key: connectionConfig.apiKey || null,
        auth_type: connectionConfig.authType
      };

      // Call the Rust backend to connect and get detailed response
      const response = await invoke<any>('connect_to_elasticsearch', { connection: backendConfig });
      
      console.log('Elasticsearch connection response:', response);
      
      if (response && response.connected) {
        // Store connection details
        this.connection = connectionConfig;
        this.clusterInfo = {
          name: response.cluster_name || 'Unknown Cluster',
          status: response.status || 'unknown'
        };
        
        return {
          connected: true,
          clusterName: response.cluster_name,
          status: response.status,
          health: response.health || null,
          error: null
        };
      }
      
      // If we reached here but don't have a clear error, return a generic failure
      return {
        connected: false,
        clusterName: null,
        status: null,
        health: null,
        error: 'Failed to connect to Elasticsearch for unknown reasons'
      };
    } catch (error: any) {
      console.error('Failed to connect to Elasticsearch:', error);
      this.connection = null;
      this.clusterInfo = null;
      
      return {
        connected: false,
        clusterName: null,
        status: null,
        health: null,
        error: error?.toString() || 'Unknown connection error'
      };
    }
  }

  /**
   * Disconnect from Elasticsearch using the Tauri backend
   */
  async disconnect(): Promise<void> {
    try {
      await invoke('disconnect_from_elasticsearch');
      this.connection = null;
      this.clusterInfo = null;
    } catch (error) {
      console.error('Failed to disconnect from Elasticsearch:', error);
    }
  }

  /**
   * Check if currently connected to Elasticsearch
   * @returns boolean indicating if connected
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Get the current connection
   * @returns The current connection or null if not connected
   */
  getCurrentConnection(): ElasticsearchConnection | null {
    return this.connection;
  }
  
  /**
   * Get information about the connected cluster
   * @returns Object containing cluster name and status, or null if not connected
   */
  getClusterInfo(): { name: string; status: string } | null {
    return this.clusterInfo;
  }

  /**
   * Get all indices in the Elasticsearch cluster using the Tauri backend
   * @returns Array of index information
   */
  async getIndices(): Promise<ElasticsearchIndex[]> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to get indices
      const indices = await invoke<any[]>('get_elasticsearch_indices');
      
      // Convert from snake_case to camelCase
      return indices.map(index => ({
        name: index.name,
        health: index.health,
        status: index.status,
        docsCount: index.docs_count,
        docsDeleted: index.docs_deleted,
        primaryShards: index.primary_shards,
        replicaShards: index.replica_shards,
        storageSize: index.storage_size
      }));
    } catch (error) {
      console.error('Failed to get indices:', error);
      throw error;
    }
  }

  /**
   * Execute a query against Elasticsearch using the Tauri backend
   * @param index - The index to query
   * @param query - The query to execute (JSON string)
   * @returns Query results
   */
  async executeQuery(index: string, query: string): Promise<QueryResult> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to execute the query
      const result = await invoke<any>('execute_elasticsearch_query', { index, query });
      
      // Convert from snake_case to camelCase
      return {
        hits: result.hits,
        total: result.total,
        took: result.took,
        timedOut: result.timed_out,
        shards: {
          total: result.shards.total,
          successful: result.shards.successful,
          failed: result.shards.failed,
          skipped: result.shards.skipped
        }
      };
    } catch (error) {
      console.error('Failed to execute query:', error);
      throw error;
    }
  }

  /**
   * Get cluster health information using the Tauri backend
   * @returns Cluster health information
   */
  async getClusterHealth(): Promise<ClusterHealth> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to get cluster health
      const health = await invoke<any>('get_elasticsearch_cluster_health');
      
      // Convert from snake_case to camelCase
      return {
        clusterName: health.cluster_name,
        status: health.status,
        numberOfNodes: health.number_of_nodes,
        numberOfDataNodes: health.number_of_data_nodes,
        activePrimaryShards: health.active_primary_shards,
        activeShards: health.active_shards,
        relocatingShards: health.relocating_shards,
        initializingShards: health.initializing_shards,
        unassignedShards: health.unassigned_shards,
        pendingTasks: health.pending_tasks
      };
    } catch (error) {
      console.error('Failed to get cluster health:', error);
      throw error;
    }
  }

  /**
   * Delete an Elasticsearch index
   * @param indexName - The name of the index to delete
   * @returns A boolean indicating if the operation was successful
   */
  async deleteIndex(indexName: string): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to delete the index
      const result = await invoke<boolean>('delete_elasticsearch_index', { index: indexName });
      return result;
    } catch (error) {
      console.error(`Failed to delete index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Delete all documents in an Elasticsearch index while preserving the index structure
   * @param indexName - The name of the index to clear
   * @returns The number of documents deleted
   */
  async deleteAllDocumentsInIndex(indexName: string): Promise<number> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to delete all documents in the index
      const deleted = await invoke<number>('delete_all_documents_in_index', { index: indexName });
      return deleted;
    } catch (error) {
      console.error(`Failed to delete documents in index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Delete specific documents from an Elasticsearch index by their IDs
   * @param indexName - The name of the index containing the documents
   * @param docIds - Array of document IDs to delete
   * @returns The number of documents successfully deleted
   */
  async deleteDocuments(indexName: string, docIds: string[]): Promise<number> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    if (!docIds.length) {
      return 0; // Nothing to delete
    }

    try {
      // Call the Rust backend to delete the specified documents
      const deleted = await invoke<number>('delete_elasticsearch_documents', { 
        index: indexName,
        docIds
      });
      return deleted;
    } catch (error) {
      console.error(`Failed to delete documents in index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new Elasticsearch index
   * @param indexName - The name of the new index
   * @param shards - The number of primary shards
   * @param replicas - The number of replica shards
   * @returns A boolean indicating if the operation was successful
   */
  async createIndex(indexName: string, shards: number, replicas: number): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to create the index
      const result = await invoke<boolean>('create_elasticsearch_index', { 
        index: indexName,
        shards,
        replicas
      });
      return result;
    } catch (error) {
      console.error(`Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new document in an Elasticsearch index
   * @param indexName - The name of the index to add the document to
   * @param document - The document data as an object
   * @param id - Optional ID for the document
   * @returns The response from Elasticsearch including the generated ID and metadata
   */
  async createDocument(indexName: string, document: object, id?: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to create the document
      const result = await invoke<any>('create_elasticsearch_document', { 
        index: indexName,
        document: JSON.stringify(document),
        id: id || null
      });
      return result;
    } catch (error) {
      console.error(`Failed to create document in index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Get mappings for an Elasticsearch index
   * @param indexName - The name of the index to get mappings for
   * @returns The index mappings as a JSON object
   */
  async getIndexMappings(indexName: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to get index mappings
      const mappings = await invoke<any>('get_elasticsearch_index_mappings', { 
        index: indexName 
      });
      return mappings;
    } catch (error) {
      console.error(`Failed to get mappings for index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Get settings for an Elasticsearch index
   * @param indexName - The name of the index to get settings for
   * @returns The index settings as a JSON object
   */
  async getIndexSettings(indexName: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      // Call the Rust backend to get index settings
      const settings = await invoke<any>('get_elasticsearch_index_settings', { 
        index: indexName 
      });
      return settings;
    } catch (error) {
      console.error(`Failed to get settings for index ${indexName}:`, error);
      throw error;
    }
  }
} 