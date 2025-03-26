/**
 * elastico/src/contexts/ElasticsearchContext.tsx
 * Context provider for sharing ElasticsearchService across components
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ElasticsearchService } from '../services/elasticsearch';
import { ConnectionResponse } from '../types/elasticsearch';

// Create a singleton instance of the service
const elasticsearchService = new ElasticsearchService();

interface ElasticsearchContextType {
  service: ElasticsearchService;
  connectionStatus: ConnectionResponse | null;
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionResponse | null>>;
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  connectionError: string | null;
  setConnectionError: React.Dispatch<React.SetStateAction<string | null>>;
}

const ElasticsearchContext = createContext<ElasticsearchContextType | undefined>(undefined);

/**
 * Provider component for Elasticsearch service and connection state
 */
export const ElasticsearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionResponse | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  return (
    <ElasticsearchContext.Provider
      value={{
        service: elasticsearchService,
        connectionStatus,
        setConnectionStatus,
        isConnecting,
        setIsConnecting,
        connectionError,
        setConnectionError,
      }}
    >
      {children}
    </ElasticsearchContext.Provider>
  );
};

/**
 * Hook to use the elasticsearch context
 */
export const useElasticsearch = (): ElasticsearchContextType => {
  const context = useContext(ElasticsearchContext);
  if (context === undefined) {
    throw new Error('useElasticsearch must be used within an ElasticsearchProvider');
  }
  return context;
};
