/**
 * Represents an Elasticsearch connection configuration
 */
export interface ElasticsearchConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  apiKey?: string;
  authType: 'none' | 'basic' | 'apiKey';
}

/**
 * Response from trying to connect to Elasticsearch
 */
export interface ConnectionResponse {
  connected: boolean;
  clusterName: string | null;
  status: string | null;
  health: any | null;
  error: string | null;
}

/**
 * Represents index information from Elasticsearch
 */
export interface ElasticsearchIndex {
  name: string;
  health: 'green' | 'yellow' | 'red';
  status: 'open' | 'close';
  docsCount: number;
  docsDeleted: number;
  primaryShards: number;
  replicaShards: number;
  storageSize: string;
}

/**
 * Represents a saved query 
 */
export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  connectionId: string;
  createdAt: Date;
  lastRun?: Date;
}

/**
 * Query execution result 
 */
export interface QueryResult {
  hits: any[];
  total: number;
  took: number;
  timedOut: boolean;
  shards: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

/**
 * Basic cluster health information
 */
export interface ClusterHealth {
  clusterName: string;
  status: 'green' | 'yellow' | 'red';
  numberOfNodes: number;
  numberOfDataNodes: number;
  activePrimaryShards: number;
  activeShards: number;
  relocatingShards: number;
  initializingShards: number;
  unassignedShards: number;
  pendingTasks: number;
} 