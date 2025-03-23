import { Client } from '@elastic/elasticsearch';
import { 
  ElasticsearchConnection, 
  ElasticsearchIndex, 
  QueryResult,
  ClusterHealth
} from '../types/elasticsearch';

/**
 * Service for interacting with Elasticsearch 
 */
export class ElasticsearchService {
  private client: Client | null = null;
  private connection: ElasticsearchConnection | null = null;

  /**
   * Connect to an Elasticsearch instance
   * @param connectionConfig - The connection configuration
   * @returns boolean indicating if connection was successful
   */
  async connect(connectionConfig: ElasticsearchConnection): Promise<boolean> {
    try {
      // Create the node options object
      const nodeOptions: any = {
        node: `${connectionConfig.ssl ? 'https' : 'http'}://${connectionConfig.host}:${connectionConfig.port}`,
      };

      // Add authentication if needed
      if (connectionConfig.authType === 'basic' && connectionConfig.username && connectionConfig.password) {
        nodeOptions.auth = {
          username: connectionConfig.username,
          password: connectionConfig.password
        };
      } else if (connectionConfig.authType === 'apiKey' && connectionConfig.apiKey) {
        nodeOptions.auth = {
          apiKey: connectionConfig.apiKey
        };
      }

      // Create the client
      this.client = new Client(nodeOptions);
      
      // Test the connection
      const pingResponse = await this.client.ping();
      
      if (pingResponse) {
        this.connection = connectionConfig;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to connect to Elasticsearch:', error);
      this.client = null;
      this.connection = null;
      return false;
    }
  }

  /**
   * Disconnect from Elasticsearch
   */
  disconnect(): void {
    this.client = null;
    this.connection = null;
  }

  /**
   * Check if currently connected to Elasticsearch
   * @returns boolean indicating if connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Get the current connection
   * @returns The current connection or null if not connected
   */
  getCurrentConnection(): ElasticsearchConnection | null {
    return this.connection;
  }

  /**
   * Get all indices in the Elasticsearch cluster
   * @returns Array of index information
   */
  async getIndices(): Promise<ElasticsearchIndex[]> {
    if (!this.client) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      const { body: catResponse } = await this.client.cat.indices({ 
        format: 'json', 
        v: true
      }) as any;
      
      return catResponse.map((index: any) => ({
        name: index.index,
        health: index.health,
        status: index.status,
        docsCount: parseInt(index['docs.count'] || '0', 10),
        docsDeleted: parseInt(index['docs.deleted'] || '0', 10),
        primaryShards: parseInt(index.pri || '0', 10),
        replicaShards: parseInt(index.rep || '0', 10),
        storageSize: index['store.size'] || '0b'
      }));
    } catch (error) {
      console.error('Failed to get indices:', error);
      throw error;
    }
  }

  /**
   * Execute a query against Elasticsearch
   * @param index - The index to query
   * @param query - The query to execute (JSON string)
   * @returns Query results
   */
  async executeQuery(index: string, query: string): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      const queryObject = JSON.parse(query);
      const { body } = await this.client.search({
        index,
        ...queryObject
      }) as any;

      return {
        hits: body.hits.hits,
        total: typeof body.hits.total === 'object' ? body.hits.total.value : body.hits.total,
        took: body.took,
        timedOut: body.timed_out,
        shards: {
          total: body._shards.total,
          successful: body._shards.successful,
          failed: body._shards.failed,
          skipped: body._shards.skipped || 0
        }
      };
    } catch (error) {
      console.error('Failed to execute query:', error);
      throw error;
    }
  }

  /**
   * Get cluster health information
   * @returns Cluster health information
   */
  async getClusterHealth(): Promise<ClusterHealth> {
    if (!this.client) {
      throw new Error('Not connected to Elasticsearch');
    }

    try {
      const { body } = await this.client.cluster.health() as any;
      
      return {
        clusterName: body.cluster_name,
        status: body.status,
        numberOfNodes: body.number_of_nodes,
        numberOfDataNodes: body.number_of_data_nodes,
        activePrimaryShards: body.active_primary_shards,
        activeShards: body.active_shards,
        relocatingShards: body.relocating_shards,
        initializingShards: body.initializing_shards,
        unassignedShards: body.unassigned_shards,
        pendingTasks: body.number_of_pending_tasks
      };
    } catch (error) {
      console.error('Failed to get cluster health:', error);
      throw error;
    }
  }
} 