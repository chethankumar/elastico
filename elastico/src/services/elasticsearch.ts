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
} 