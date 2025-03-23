import { nanoid } from 'nanoid';
import { ElasticsearchConnection } from '../types/elasticsearch';

// Key for storing connections in localStorage
const CONNECTIONS_STORAGE_KEY = 'elastiky-connections';

/**
 * Service for managing Elasticsearch connections
 */
export class ConnectionManager {
  private connections: ElasticsearchConnection[] = [];

  constructor() {
    this.loadConnections();
  }

  /**
   * Load saved connections from local storage
   */
  private loadConnections(): void {
    try {
      const savedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
      if (savedConnections) {
        this.connections = JSON.parse(savedConnections);
      }
    } catch (error) {
      console.error('Failed to load connections from storage:', error);
      this.connections = [];
    }
  }

  /**
   * Save connections to local storage
   */
  private saveConnections(): void {
    try {
      localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(this.connections));
    } catch (error) {
      console.error('Failed to save connections to storage:', error);
    }
  }

  /**
   * Get all saved connections
   * @returns Array of connection configurations
   */
  getAllConnections(): ElasticsearchConnection[] {
    return [...this.connections];
  }

  /**
   * Get a connection by ID
   * @param id - The connection ID
   * @returns The connection or undefined if not found
   */
  getConnection(id: string): ElasticsearchConnection | undefined {
    return this.connections.find(conn => conn.id === id);
  }

  /**
   * Add a new connection
   * @param connection - The connection configuration (without ID)
   * @returns The created connection with generated ID
   */
  addConnection(connection: Omit<ElasticsearchConnection, 'id'>): ElasticsearchConnection {
    const newConnection = {
      ...connection,
      id: nanoid()
    };

    this.connections.push(newConnection);
    this.saveConnections();
    
    return newConnection;
  }

  /**
   * Update an existing connection
   * @param id - The connection ID
   * @param updatedConnection - The updated connection data
   * @returns The updated connection or null if not found
   */
  updateConnection(id: string, updatedConnection: Partial<Omit<ElasticsearchConnection, 'id'>>): ElasticsearchConnection | null {
    const index = this.connections.findIndex(conn => conn.id === id);
    
    if (index === -1) {
      return null;
    }

    this.connections[index] = {
      ...this.connections[index],
      ...updatedConnection
    };

    this.saveConnections();
    
    return this.connections[index];
  }

  /**
   * Delete a connection
   * @param id - The connection ID
   * @returns Boolean indicating if the connection was deleted
   */
  deleteConnection(id: string): boolean {
    const initialLength = this.connections.length;
    this.connections = this.connections.filter(conn => conn.id !== id);
    
    if (initialLength !== this.connections.length) {
      this.saveConnections();
      return true;
    }
    
    return false;
  }
} 