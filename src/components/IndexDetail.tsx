/**
 * elastico/src/components/IndexDetail.tsx
 * Displays details and documents for a selected index
 */
import React, { useState, useEffect, useRef } from 'react';
import { ElasticsearchIndex, QueryResult } from '../types/elasticsearch';
import { useElasticsearch } from '../contexts/ElasticsearchContext';
import { useToast } from '../contexts/ToastContext';
import JsonEditor from './JsonEditor';
import { Loader2, RefreshCw, Search, Settings, FileText, Database, Home, Plus, Trash2, X, ChevronDown, ChevronUp, Save } from 'lucide-react';

// Tab interface definitions
type TabType = 'overview' | 'documents' | 'search' | 'mappings' | 'settings';

interface IndexDetailProps {
  index: ElasticsearchIndex;
  onRefresh?: (indexName?: string) => Promise<void>;
}

// Helper function to render field values in the table
function renderFieldValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className='text-gray-400'>null</span>;
  }

  if (typeof value === 'object') {
    return <span className='text-blue-600'>{'{...}'}</span>;
  }

  if (typeof value === 'boolean') {
    return value ? <span className='text-green-600'>true</span> : <span className='text-red-600'>false</span>;
  }

  if (Array.isArray(value)) {
    return <span className='text-blue-600'>[...]</span>;
  }

  // For strings, numbers, etc.
  return String(value).length > 50 ? `${String(value).substring(0, 47)}...` : String(value);
}

/**
 * Component to display index details and documents
 */
const IndexDetail: React.FC<IndexDetailProps> = ({ index, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const [pageSize] = useState(20);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // New state for operations
  const [isDeleting, setIsDeleting] = useState(false);

  // Add mapping state
  const [mappings, setMappings] = useState<any | null>(null);
  const [isMappingsLoading, setIsMappingsLoading] = useState(false);
  const [mappingsError, setMappingsError] = useState<string | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  // Add settings state
  const [settings, setSettings] = useState<any | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());

  // Add confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'deleteIndex' | 'deleteDocuments' | 'deleteSelectedDocuments' | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Add create document dialog state
  const [showCreateDocDialog, setShowCreateDocDialog] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [newDocJSON, setNewDocJSON] = useState('{\n  \n}');
  const [docId, setDocId] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Add state for selected documents
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Add search state
  const [searchQuery, setSearchQuery] = useState<string>('{\n  "query": {\n    "match_all": {}\n  }\n}');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTotalHits, setSearchTotalHits] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchJsonError, setSearchJsonError] = useState<string | null>(null);
  const [isSearchEditorMinimized, setIsSearchEditorMinimized] = useState(false);

  // Add these state variables at the top with the other state variables
  const [searchSortField, setSearchSortField] = useState<string | null>(null);
  const [searchSortOrder, setSearchSortOrder] = useState<'asc' | 'desc'>('asc');

  // Use this flag to track if data for each tab has been loaded at least once
  const [tabDataLoaded, setTabDataLoaded] = useState<Record<TabType, boolean>>({
    overview: false,
    documents: false,
    search: false,
    mappings: false,
    settings: false,
  });

  // Add a ref to track loaded data per index
  const indexDataCache = useRef<
    Record<
      string,
      {
        documents: any[];
        totalHits: number;
        mappings: any | null;
        settings: any | null;
        searchResults: any[];
        searchTotalHits: number;
        searchQuery: string;
      }
    >
  >({});

  // Pagination helpers
  const generatePaginationItems = (currentPage: number, totalPages: number, onPageClick: (page: number) => void) => {
    const items = [];
    // Logic to display a reasonable number of pagination items
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // First page
    if (startPage > 1) {
      items.push(
        <button key='first' onClick={() => onPageClick(1)} className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'>
          1
        </button>
      );
      if (startPage > 2) {
        items.push(
          <span key='ellipsis1' className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700'>
            ...
          </span>
        );
      }
    }

    // Pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <button
          key={i}
          onClick={() => onPageClick(i)}
          className={`relative inline-flex items-center px-4 py-2 border ${
            currentPage === i ? 'z-10 bg-purple-50 border-purple-500 text-purple-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          } text-sm font-medium`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <span key='ellipsis2' className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700'>
            ...
          </span>
        );
      }
      items.push(
        <button
          key='last'
          onClick={() => onPageClick(totalPages)}
          className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'
        >
          {totalPages}
        </button>
      );
    }

    return items;
  };

  const { service: elasticsearchService } = useElasticsearch();
  const { showToast } = useToast();

  // Set the overview tab as loaded initially
  useEffect(() => {
    setTabDataLoaded((prev) => ({ ...prev, overview: true }));
  }, []);

  // Reset state when index changes OR initialize from cache
  useEffect(() => {
    // Check if we have cached data for this index
    const cachedData = indexDataCache.current[index.name];

    if (cachedData) {
      // Restore documents and totalHits (even when empty)
      setDocuments(cachedData.documents);
      setTotalHits(cachedData.totalHits);
      setTabDataLoaded((prev) => ({ ...prev, documents: true }));
    } else {
      // Initialize cache entry for this index
      indexDataCache.current[index.name] = {
        documents: [],
        totalHits: 0,
        mappings: null,
        settings: null,
        searchResults: [],
        searchTotalHits: 0,
        searchQuery: '{\n  "query": {\n    "match_all": {}\n  }\n}',
      };

      // Reset tab data loaded state for a new index
      setTabDataLoaded({
        overview: true, // Overview is always shown first
        documents: false,
        search: false,
        mappings: false,
        settings: false,
      });

      // Reset search state for a new index
      setSearchResults([]);
      setSearchTotalHits(0);
      setSearchQuery('{\n  "query": {\n    "match_all": {}\n  }\n}');
    }

    // Clear any selected documents when index changes
    setSelectedDocIds(new Set());
    setIsAllSelected(false);
    setSelectedDoc(null);

    // Reset search-specific state
    setSearchPage(1);
    setSearchSortField(null);
    setSearchSortOrder('asc');
    setSearchError(null);
    setSearchJsonError(null);
    setIsSearching(false);

    // Reset pagination
    setPage(1);
    setSortField(null);
    setSortOrder('asc');
  }, [index.name]);

  // Create a tab switching handler that ensures a smooth experience
  const handleTabChange = (tab: TabType) => {
    // Store previous tab for reference
    const previousTab = activeTab;
    console.log(`Tab changed from ${previousTab} to ${tab}`);

    setActiveTab(tab);

    // Reset document selection when leaving the documents tab
    if (activeTab === 'documents' && tab !== 'documents') {
      setSelectedDoc(null);
    }

    // Check if we need to refresh the documents tab
    if (tab === 'documents') {
      // If it's not loaded OR if we're coming from another tab, refresh
      if (!tabDataLoaded.documents) {
        console.log('Documents tab not loaded or coming from another tab, refreshing documents data');

        // Clear documents first to show loading state
        setDocuments([]);

        // Use the refreshDocuments helper function
        (async () => {
          console.log('Starting async document refresh');
          try {
            const refreshedDocs = await refreshDocuments();
            console.log(`Documents tab refreshed, now showing ${refreshedDocs.length} documents`);
          } catch (error) {
            console.error('Failed to refresh documents during tab switch:', error);
          }
        })();
      } else {
        console.log('Documents tab already loaded, not refreshing');
      }
    }
  };

  // Initial load for documents tab
  useEffect(() => {
    if (activeTab !== 'documents') return;
    if (!elasticsearchService.isConnected()) {
      setError('Not connected to Elasticsearch');
      return;
    }
    if (!tabDataLoaded.documents) {
      refreshDocuments();
    }
  }, [activeTab, index.name, elasticsearchService, tabDataLoaded.documents]);

  // Refresh documents on page or sort change
  useEffect(() => {
    if (activeTab !== 'documents') return;
    if (!elasticsearchService.isConnected()) return;
    refreshDocuments();
  }, [page, sortField, sortOrder]);

  // Load mappings when viewing mappings tab for the first time
  useEffect(() => {
    if (activeTab !== 'mappings' || !elasticsearchService.isConnected()) return;

    // Only load if not loaded before
    if (!tabDataLoaded.mappings) {
      const loadMappings = async () => {
        setIsMappingsLoading(true);
        setMappingsError(null);

        try {
          const mappingsData = await elasticsearchService.getIndexMappings(index.name);
          setMappings(mappingsData);

          // Update cache
          indexDataCache.current[index.name] = {
            ...indexDataCache.current[index.name],
            mappings: mappingsData,
          };

          // Mark mappings tab as loaded
          setTabDataLoaded((prev) => ({ ...prev, mappings: true }));
        } catch (error) {
          console.error('Failed to load index mappings:', error);
          setMappingsError(`Failed to load index mappings: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setIsMappingsLoading(false);
        }
      };

      loadMappings();
    }
  }, [elasticsearchService, index.name, activeTab, tabDataLoaded.mappings]);

  // Load settings when viewing settings tab for the first time
  useEffect(() => {
    if (activeTab !== 'settings' || !elasticsearchService.isConnected()) return;

    // Only load if not loaded before
    if (!tabDataLoaded.settings) {
      const loadSettings = async () => {
        setIsSettingsLoading(true);
        setSettingsError(null);

        try {
          const settingsData = await elasticsearchService.getIndexSettings(index.name);
          setSettings(settingsData);

          // Update cache
          indexDataCache.current[index.name] = {
            ...indexDataCache.current[index.name],
            settings: settingsData,
          };

          // Mark settings tab as loaded
          setTabDataLoaded((prev) => ({ ...prev, settings: true }));
        } catch (error) {
          console.error('Failed to load index settings:', error);
          setSettingsError(`Failed to load index settings: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setIsSettingsLoading(false);
        }
      };

      loadSettings();
    }
  }, [elasticsearchService, index.name, activeTab, tabDataLoaded.settings]);

  // Show create document dialog
  const showCreateDocumentDialog = () => {
    setNewDocJSON('{\n  \n}');
    setDocId('');
    setJsonError(null);
    setShowCreateDocDialog(true);
  };

  // Handle create document
  const handleCreateDocument = async () => {
    // Validate JSON
    try {
      const docObject = JSON.parse(newDocJSON);
      setJsonError(null);
      setIsCreatingDoc(true);

      try {
        // Call the Elasticsearch service to create the document
        await elasticsearchService.createDocument(index.name, docObject, docId.trim() === '' ? undefined : docId.trim());

        // Show success toast
        showToast(`Document successfully created in "${index.name}"`, 'success');
        setShowCreateDocDialog(false);

        // Reset the documents tab loaded flag to force refresh when the tab is viewed
        setTabDataLoaded((prev) => ({ ...prev, documents: false }));

        // Clear documents array to ensure UI shows loading state
        setDocuments([]);

        // Refresh document list immediately if we're on documents tab
        if (activeTab === 'documents') {
          console.log('Refreshing documents immediately after creation');
          const refreshedDocs = await refreshDocuments();
          console.log(`Documents refreshed after creation, now has ${refreshedDocs.length} documents`);
        } else {
          // Even if we're not on the documents tab, still refresh the cache data
          // by making a background query to get updated documents
          (async () => {
            try {
              const sortConfig = sortField ? [{ [sortField]: { order: sortOrder } }] : [];
              const queryString = JSON.stringify({
                from: 0,
                size: pageSize,
                sort: sortConfig,
                query: {
                  match_all: {},
                },
              });

              const result: QueryResult = await elasticsearchService.executeQuery(index.name, queryString);
              const formattedDocs = result.hits.map((hit) => ({
                id: hit._id,
                ...hit._source,
              }));

              // Update cache with new data
              indexDataCache.current[index.name] = {
                ...indexDataCache.current[index.name],
                documents: formattedDocs,
                totalHits: result.total,
              };

              console.log('Updated document cache in background after document creation');
            } catch (error) {
              console.error('Failed to update document cache in background:', error);
            }
          })();
        }

        // Refresh the parent component's indices list to update doc count
        if (onRefresh) {
          await onRefresh(index.name);
        }
      } catch (error) {
        console.error('Failed to create document:', error);
        showToast(`Failed to create document: ${error instanceof Error ? error.message : String(error)}`, 'error');
      } finally {
        setIsCreatingDoc(false);
      }
    } catch (e) {
      setJsonError('Invalid JSON. Please check your document format.');
      return;
    }
  };

  // Show confirmation dialog for delete index
  const showDeleteIndexConfirmation = () => {
    setConfirmMessage(`Are you sure you want to delete the index "${index.name}"? This action cannot be undone.`);
    setConfirmAction('deleteIndex');
    setShowConfirmDialog(true);
  };

  // Show confirmation dialog for delete documents
  const showDeleteDocumentsConfirmation = () => {
    setConfirmMessage(`Are you sure you want to delete all documents in the index "${index.name}"? This action cannot be undone.`);
    setConfirmAction('deleteDocuments');
    setShowConfirmDialog(true);
  };

  // Handle confirm dialog response
  const handleConfirmDialogResponse = async (confirmed: boolean) => {
    if (!confirmed) {
      setShowConfirmDialog(false);
      setConfirmAction(null);
      return;
    }

    try {
      setIsDeleting(true);

      if (confirmAction === 'deleteIndex') {
        await deleteIndex();
      } else if (confirmAction === 'deleteDocuments') {
        await deleteAllDocuments();
      } else if (confirmAction === 'deleteSelectedDocuments') {
        // If we have a specific document ID to delete
        if (idToDelete) {
          await handleDeleteDocument();
        } else {
          // Otherwise handle bulk deletion of selected documents
          await deleteSelectedDocuments();
        }
      }
    } finally {
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  // Delete the entire index
  const deleteIndex = async () => {
    try {
      console.log('Deleting index:', index.name);
      await elasticsearchService.deleteIndex(index.name);

      // Show success toast
      showToast(`Index "${index.name}" was successfully deleted.`, 'success');

      // Clear documents if we're in the documents tab
      setDocuments([]);
      setTotalHits(0);

      // Refresh the parent component's indices list
      if (onRefresh) {
        // Pass the index name to indicate this index was deleted
        await onRefresh(index.name);
      }
    } catch (error) {
      console.error('Failed to delete index:', error);
      // Show error toast
      showToast(`Failed to delete index: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all documents in the index
  const deleteAllDocuments = async () => {
    try {
      console.log('Deleting all documents in index:', index.name);
      const deleted = await elasticsearchService.deleteAllDocumentsInIndex(index.name);

      // Show success toast
      showToast(`Successfully deleted ${deleted.toLocaleString()} documents from "${index.name}".`, 'success');

      // Clear current document lists from state
      setDocuments([]);
      setTotalHits(0);

      // Also clear search results if they exist
      setSearchResults([]);
      setSearchTotalHits(0);

      // Refresh both documents and search tabs
      await refreshAllTabsAfterDelete();

      // Refresh the parent component's indices list to update doc count
      if (onRefresh) {
        // Pass the index name to ensure this specific index gets refreshed in the UI
        await onRefresh(index.name);
      }
    } catch (error) {
      console.error('Failed to delete documents:', error);
      // Show error toast
      showToast(`Failed to delete documents: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to refresh both documents and search tabs after deletion
  const refreshAllTabsAfterDelete = async () => {
    console.log('Refreshing all tabs after document deletion');

    // Clear document state to ensure UI updates
    setDocuments([]);

    // Always reset the documents tab data load flag to force a fresh reload
    setTabDataLoaded((prev) => ({ ...prev, documents: false }));

    // Log the active tab to help with debugging
    console.log(`Current active tab during refresh: ${activeTab}`);

    try {
      // Explicitly use refreshDocuments to refresh the documents list
      console.log('Refreshing documents list after deletion');

      // Force a full refresh of documents regardless of current tab
      const refreshedDocs = await refreshDocuments();
      console.log(`Documents refreshed after deletion, now has ${refreshedDocs.length} documents`);

      // Ensure the documents tab is marked as loaded
      setTabDataLoaded((prev) => ({ ...prev, documents: true }));
    } catch (error) {
      console.error('Failed to refresh documents during all tabs refresh:', error);
    }

    // Then refresh the search tab if there's an active search query
    if (searchQuery && searchQuery.trim() !== '') {
      console.log('Refreshing search tab with query:', searchQuery);

      // Clear search results to ensure UI updates
      setSearchResults([]);
      setIsSearching(true);
      setSearchError(null);

      try {
        // Parse the query to ensure it's valid
        const queryObject = JSON.parse(searchQuery);

        // Reset to first page after deletion to avoid pagination issues
        queryObject.from = 0;
        queryObject.size = pageSize;

        // Format and update the query
        const formattedQuery = JSON.stringify(queryObject, null, 2);
        console.log('Executing search with modified query:', formattedQuery);

        // Reset to first page in the UI
        setSearchPage(1);

        // Execute the search query
        const result = await elasticsearchService.executeQuery(index.name, formattedQuery);
        console.log(`Search completed, got ${result.total} results`);

        // Format the results and update state
        const formattedResults = result.hits.map((hit) => ({
          id: hit._id,
          ...hit._source,
        }));

        setSearchResults(formattedResults);
        setSearchTotalHits(result.total);
        console.log(`Updated search results state with ${formattedResults.length} items`);

        // Update cache
        indexDataCache.current[index.name] = {
          ...indexDataCache.current[index.name],
          searchResults: formattedResults,
          searchTotalHits: result.total,
          searchQuery: formattedQuery,
        };

        setTabDataLoaded((prev) => ({ ...prev, search: true }));
      } catch (error) {
        console.error('Search refresh failed:', error);
        setSearchError(`Search refresh failed: ${error instanceof Error ? error.message : String(error)}`);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    console.log('All tabs refreshed after document deletion');
  };

  // Delete selected documents
  const deleteSelectedDocuments = async () => {
    try {
      console.log('Deleting selected documents:', Array.from(selectedDocIds));
      const deleted = await elasticsearchService.deleteDocuments(index.name, Array.from(selectedDocIds));

      // Show success toast
      showToast(`Successfully deleted ${deleted.toLocaleString()} selected document${deleted !== 1 ? 's' : ''} from "${index.name}".`, 'success');

      // If the selected document was deleted, clear it
      if (selectedDoc && selectedDocIds.has(selectedDoc.id)) {
        setSelectedDoc(null);
      }

      // Clear selected documents
      setSelectedDocIds(new Set());
      setIsAllSelected(false);

      // Refresh both documents and search tabs to ensure consistent data
      await refreshAllTabsAfterDelete();

      // Refresh the parent component's indices list to update doc count
      if (onRefresh) {
        await onRefresh(index.name);
      }
    } catch (error) {
      console.error('Failed to delete selected documents:', error);
      // Show error toast
      showToast(`Failed to delete selected documents: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to refresh documents
  const refreshDocuments = async () => {
    try {
      setIsLoading(true);
      console.log('Refreshing documents list');

      // Reset any errors
      setError(null);

      // Build sort query part
      const sortConfig = sortField ? [{ [sortField]: { order: sortOrder } }] : [];

      // Build pagination query
      const from = (page - 1) * pageSize;

      // Construct the full query
      const queryString = JSON.stringify({
        from,
        size: pageSize,
        sort: sortConfig,
        query: {
          match_all: {},
        },
      });

      // Force a fresh query to the server
      console.log(`Executing query to fetch documents for index: ${index.name}`);
      const result: QueryResult = await elasticsearchService.executeQuery(index.name, queryString);
      const formattedDocs = result.hits.map((hit) => ({
        id: hit._id,
        ...hit._source,
      }));

      // Update state
      console.log(`Setting ${formattedDocs.length} documents in state`);
      setDocuments(formattedDocs);
      setTotalHits(result.total);

      // Update cache
      indexDataCache.current[index.name] = {
        ...indexDataCache.current[index.name],
        documents: formattedDocs,
        totalHits: result.total,
      };

      console.log(`Documents refreshed, now has ${formattedDocs.length} documents`);

      // Mark documents tab as loaded
      setTabDataLoaded((prev) => ({ ...prev, documents: true }));

      return formattedDocs;
    } catch (error) {
      console.error('Failed to refresh documents:', error);
      setError(`Failed to refresh documents: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Handle document selection
  const handleSelectDocument = (id: string) => {
    setSelectedDocIds((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  };

  // Handle select all documents
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds(new Set());
    } else {
      // Get the IDs from either the documents list or search results based on active tab
      const docs = activeTab === 'search' ? searchResults : documents;
      const allIds = new Set(docs.map((doc) => doc.id));
      setSelectedDocIds(allIds);
    }
    setIsAllSelected(!isAllSelected);
  };

  // handleBulkDelete function removed as it is unused

  // Handle deletion of a single document
  const handleDeleteDocument = async () => {
    if (!idToDelete) return;

    setShowConfirmDialog(false);

    try {
      // Show deleting state
      setIsDeleting(true);
      console.log(`Deleting document with ID: ${idToDelete} from index: ${index.name}`);

      // Use deleteDocuments with a single-element array
      await elasticsearchService.deleteDocuments(index.name, [idToDelete]);

      console.log(`Document deleted successfully: ${idToDelete}`);
      showToast('Document deleted successfully', 'success');

      // If the selected document was deleted, clear it
      if (selectedDoc && selectedDoc.id === idToDelete) {
        console.log('Clearing selected document as it was deleted');
        setSelectedDoc(null);
      }

      // Remove from selected docs if it was selected
      if (selectedDocIds.has(idToDelete)) {
        console.log('Removing deleted document from selection');
        const newSelectedDocs = new Set(selectedDocIds);
        newSelectedDocs.delete(idToDelete);
        setSelectedDocIds(newSelectedDocs);
      }

      // Explicitly log the active tab before refreshing
      console.log(`Active tab before refresh: ${activeTab}`);

      // Force the documents tab to refresh on next view by setting the load flag to false
      setTabDataLoaded((prev) => ({ ...prev, documents: false }));

      // Refresh both documents and search tabs to ensure consistent data
      console.log('Starting document list refresh after single document deletion');
      await refreshAllTabsAfterDelete();
      console.log('Completed document list refresh after single document deletion');

      // Update the parent indices list to reflect the document count change
      if (onRefresh) {
        await onRefresh(index.name);
        console.log('Updated parent indices list');
      }

      // Clear the id to delete
      setIdToDelete(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine document fields for table columns based on first document
  let fields: string[] = [];
  if (activeTab === 'documents') {
    if (documents.length > 0) {
      // Get all field names from the first document
      fields = Object.keys(documents[0] || {})
        .filter((key) => key !== 'id' && key !== '_score')
        .slice(0, 10); // Limit to 10 fields to avoid overloading the UI
    }
  } else if (activeTab === 'search') {
    if (searchResults.length > 0) {
      // Get fields from search results
      fields = Object.keys(searchResults[0] || {})
        .filter((key) => key !== 'id' && key !== '_score')
        .slice(0, 10);
    } else {
      // If cached search results exist, use fields from there to maintain structure
      const cachedResults = indexDataCache.current[index.name]?.searchResults || [];
      if (cachedResults.length > 0) {
        fields = Object.keys(cachedResults[0] || {})
          .filter((key) => key !== 'id' && key !== '_score')
          .slice(0, 10);
      }
    }
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalHits / pageSize);

  // Handle pagination
  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Start with ascending order for a new field
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Toggle property expansion in the mappings view
  const togglePropertyExpansion = (propertyPath: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyPath)) {
        next.delete(propertyPath);
      } else {
        next.add(propertyPath);
      }
      return next;
    });
  };

  // Toggle settings section expansion in the settings view
  const toggleSettingsExpansion = (sectionPath: string) => {
    setExpandedSettings((prev) => {
      const next = new Set(prev);
      if (next.has(sectionPath)) {
        next.delete(sectionPath);
      } else {
        next.add(sectionPath);
      }
      return next;
    });
  };

  // Helper function to recursively render mapping properties
  const renderMappingProperties = (properties: any, path: string = '', level: number = 0) => {
    if (!properties) return null;

    return (
      <div style={{ marginLeft: level > 0 ? '20px' : '0' }}>
        {Object.entries(properties).map(([propName, propDetails]: [string, any]) => {
          const fullPath = path ? `${path}.${propName}` : propName;
          const isExpanded = expandedProperties.has(fullPath);

          // Handle nested properties
          const hasNestedProperties = propDetails.properties && Object.keys(propDetails.properties).length > 0;

          return (
            <div key={fullPath} className='mb-2'>
              <div
                className={`flex items-center py-1 px-2 ${level === 0 ? 'bg-gray-100 rounded-md' : ''} ${hasNestedProperties ? 'cursor-pointer' : ''}`}
                onClick={() => hasNestedProperties && togglePropertyExpansion(fullPath)}
              >
                {hasNestedProperties && (
                  <svg className={`h-4 w-4 mr-1 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
                  </svg>
                )}
                <span className='font-medium'>{propName}</span>
                <span className='ml-2 text-sm text-gray-500'>
                  {propDetails.type ? (
                    <span className={`px-2 py-0.5 rounded-full ${getTypeColor(propDetails.type)}`}>{propDetails.type}</span>
                  ) : (
                    <span className='px-2 py-0.5 bg-gray-100 rounded-full'>object</span>
                  )}
                </span>
              </div>

              {/* Property details */}
              {propDetails.type && (
                <div className='text-sm pl-6 py-1 space-y-1'>
                  {propDetails.analyzer && (
                    <div>
                      <span className='text-gray-500'>analyzer:</span> {propDetails.analyzer}
                    </div>
                  )}
                  {propDetails.format && (
                    <div>
                      <span className='text-gray-500'>format:</span> {propDetails.format}
                    </div>
                  )}
                  {propDetails.index === false && <div className='text-amber-600'>not indexed</div>}
                </div>
              )}

              {/* Nested properties */}
              {hasNestedProperties && isExpanded && renderMappingProperties(propDetails.properties, fullPath, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper function to determine type color
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'text':
      case 'keyword':
        return 'bg-blue-100 text-blue-800';
      case 'date':
        return 'bg-purple-100 text-purple-800';
      case 'long':
      case 'integer':
      case 'short':
      case 'byte':
      case 'double':
      case 'float':
      case 'half_float':
      case 'scaled_float':
        return 'bg-green-100 text-green-800';
      case 'boolean':
        return 'bg-yellow-100 text-yellow-800';
      case 'binary':
        return 'bg-red-100 text-red-800';
      case 'geo_point':
      case 'geo_shape':
        return 'bg-indigo-100 text-indigo-800';
      case 'ip':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to render settings in a structured way
  const renderSettings = (settingsObj: any, path: string = '', level: number = 0) => {
    if (!settingsObj || typeof settingsObj !== 'object') return null;

    return (
      <div style={{ marginLeft: level > 0 ? '20px' : '0' }}>
        {Object.entries(settingsObj).map(([key, value]: [string, any]) => {
          const fullPath = path ? `${path}.${key}` : key;
          const isExpanded = expandedSettings.has(fullPath);
          const isObject = value && typeof value === 'object' && !Array.isArray(value);

          // Skip rendering if value is an empty object
          if (isObject && Object.keys(value).length === 0) return null;

          return (
            <div key={fullPath} className='mb-2'>
              <div
                className={`flex items-center py-1 px-2 ${level === 0 ? 'bg-gray-100 rounded-md' : ''} ${isObject ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => isObject && toggleSettingsExpansion(fullPath)}
              >
                {isObject && Object.keys(value).length > 0 && (
                  <svg className={`h-4 w-4 mr-1 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
                  </svg>
                )}

                <span className='font-medium'>{key}</span>

                {!isObject && (
                  <span className='ml-2 text-sm'>{Array.isArray(value) ? <span className='text-blue-600'>[{value.join(', ')}]</span> : <span className='text-green-600'>{String(value)}</span>}</span>
                )}
              </div>

              {/* Nested settings */}
              {isObject && isExpanded && renderSettings(value, fullPath, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  // Fix the refreshCurrentTab function to better handle search results
  const refreshCurrentTab = async () => {
    // Force the current tab to reload by setting its loaded flag to false
    setTabDataLoaded((prev) => ({ ...prev, [activeTab]: false }));

    console.log(`Refreshing ${activeTab} tab`);

    // Show loading indicator based on current tab
    if (activeTab === 'overview') {
      // We could refresh index info here if needed
      if (onRefresh) {
        await onRefresh(index.name);
      }
      setTabDataLoaded((prev) => ({ ...prev, overview: true }));
    } else if (activeTab === 'documents') {
      // Force refresh documents tab
      await refreshDocuments();
    } else if (activeTab === 'mappings') {
      setIsMappingsLoading(true);
      setMappingsError(null);
      try {
        const mappingsData = await elasticsearchService.getIndexMappings(index.name);
        setMappings(mappingsData);

        // Update cache
        indexDataCache.current[index.name] = {
          ...indexDataCache.current[index.name],
          mappings: mappingsData,
        };

        setTabDataLoaded((prev) => ({ ...prev, mappings: true }));
      } catch (error) {
        console.error('Failed to load index mappings:', error);
        setMappingsError(`Failed to load index mappings: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsMappingsLoading(false);
      }
    } else if (activeTab === 'settings') {
      setIsSettingsLoading(true);
      setSettingsError(null);
      try {
        const settingsData = await elasticsearchService.getIndexSettings(index.name);
        setSettings(settingsData);

        // Update cache
        indexDataCache.current[index.name] = {
          ...indexDataCache.current[index.name],
          settings: settingsData,
        };

        setTabDataLoaded((prev) => ({ ...prev, settings: true }));
      } finally {
        setIsSettingsLoading(false);
      }
    } else if (activeTab === 'search') {
      // If we have a valid search query, re-execute it to refresh the results
      if (searchQuery && searchQuery.trim() !== '') {
        console.log('Refreshing search tab with query:', searchQuery);
        // Make sure we're completely re-running the search to get fresh results
        setIsSearching(true);
        setSearchError(null);

        try {
          // Parse the query to ensure it's valid and capture the pagination
          const queryObject = JSON.parse(searchQuery);

          // Always reset to first page after deletion to avoid pagination issues
          // This ensures we don't end up on a page that no longer exists
          queryObject.from = 0;
          queryObject.size = pageSize;

          // Format and update the query
          const formattedQuery = JSON.stringify(queryObject, null, 2);
          console.log('Executing search with modified query:', formattedQuery);

          // Reset to first page in the UI as well
          setSearchPage(1);

          // Execute the search query
          const result = await elasticsearchService.executeQuery(index.name, formattedQuery);
          console.log(`Search completed, got ${result.total} results`);

          // Format the results and update state
          const formattedResults = result.hits.map((hit) => ({
            id: hit._id,
            ...hit._source,
          }));

          setSearchResults(formattedResults);
          setSearchTotalHits(result.total);
          console.log(`Updated search results state with ${formattedResults.length} items`);

          // Update cache
          indexDataCache.current[index.name] = {
            ...indexDataCache.current[index.name],
            searchResults: formattedResults,
            searchTotalHits: result.total,
            searchQuery: formattedQuery,
          };

          setTabDataLoaded((prev) => ({ ...prev, search: true }));
        } catch (error) {
          console.error('Search refresh failed:', error);
          setSearchError(`Search refresh failed: ${error instanceof Error ? error.message : String(error)}`);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        console.log('No search query to refresh');
        // Mark search tab as loaded even if there's no query
        setTabDataLoaded((prev) => ({ ...prev, search: true }));
      }
    }

    console.log(`Finished refreshing ${activeTab} tab`);
  };

  // Handle search pagination
  const goToSearchPage = (newPage: number) => {
    const totalSearchPages = Math.ceil(searchTotalHits / pageSize);
    if (newPage < 1 || newPage > totalSearchPages) return;
    setSearchPage(newPage);

    // Re-execute search with new page
    searchWithPagination(newPage);
  };

  // Execute search with pagination
  const searchWithPagination = async (page: number) => {
    if (!elasticsearchService.isConnected()) {
      setSearchError('Not connected to Elasticsearch');
      return;
    }

    try {
      // Parse the current query to modify it
      const queryObject = JSON.parse(searchQuery);

      // Update pagination parameters
      const from = (page - 1) * pageSize;
      queryObject.from = from;
      queryObject.size = pageSize;

      // Convert back to string for the API
      const paginatedQuery = JSON.stringify(queryObject, null, 2);

      setIsSearching(true);
      setSearchError(null);

      try {
        // Execute the search query with pagination
        const result: QueryResult = await elasticsearchService.executeQuery(index.name, paginatedQuery);

        // Format the results
        const formattedResults = result.hits.map((hit) => ({
          id: hit._id,
          ...hit._source,
        }));

        setSearchResults(formattedResults);
        setSearchTotalHits(result.total);

        // Update cache with paginated search results
        indexDataCache.current[index.name] = {
          ...indexDataCache.current[index.name],
          searchResults: formattedResults,
          searchTotalHits: result.total,
          searchQuery: searchQuery, // Keep the original query
        };
      } catch (error) {
        console.error('Search failed:', error);
        setSearchError(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } catch (e) {
      setSearchJsonError('Invalid JSON. Please check your query format.');
    }
  };

  // Function to execute search query (initial search)
  const searchDocuments = async () => {
    if (!elasticsearchService.isConnected()) {
      setSearchError('Not connected to Elasticsearch');
      return;
    }

    // Validate JSON
    try {
      const queryObject = JSON.parse(searchQuery);

      // Set pagination parameters for initial search
      queryObject.from = 0;
      queryObject.size = pageSize;

      // Update the search query with pagination
      const formattedQuery = JSON.stringify(queryObject, null, 2);
      setSearchQuery(formattedQuery);
      setSearchJsonError(null);
      setIsSearching(true);
      setSearchError(null);

      // Reset to first page
      setSearchPage(1);

      try {
        // Execute the search query
        const result: QueryResult = await elasticsearchService.executeQuery(index.name, formattedQuery);

        // Format the results
        const formattedResults = result.hits.map((hit) => ({
          id: hit._id,
          ...hit._source,
        }));

        setSearchResults(formattedResults);
        setSearchTotalHits(result.total);

        // Update cache with search results
        indexDataCache.current[index.name] = {
          ...indexDataCache.current[index.name],
          searchResults: formattedResults,
          searchTotalHits: result.total,
          searchQuery: formattedQuery,
        };

        // Mark search tab as loaded
        setTabDataLoaded((prev) => ({ ...prev, search: true }));
      } catch (error) {
        console.error('Search failed:', error);
        setSearchError(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } catch (e) {
      setSearchJsonError('Invalid JSON. Please check your query format.');
      return;
    }
  };

  // Handle sorting for search results
  const handleSearchSort = (field: string) => {
    // If clicking the same field, toggle sort order
    if (searchSortField === field) {
      setSearchSortOrder(searchSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as sort field with default 'asc' order
      setSearchSortField(field);
      setSearchSortOrder('asc');
    }

    // Sort the results
    const sortedResults = [...searchResults].sort((a, b) => {
      // Handle null or undefined values
      if (a[field] == null) return 1;
      if (b[field] == null) return -1;

      // String comparison
      if (typeof a[field] === 'string' && typeof b[field] === 'string') {
        return searchSortOrder === 'asc' ? a[field].localeCompare(b[field]) : b[field].localeCompare(a[field]);
      }

      // Number comparison
      if (typeof a[field] === 'number' && typeof b[field] === 'number') {
        return searchSortOrder === 'asc' ? a[field] - b[field] : b[field] - a[field];
      }

      // Default comparison (convert to string)
      const aStr = String(a[field]);
      const bStr = String(b[field]);
      return searchSortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    setSearchResults(sortedResults);

    // Update cache with sorted results
    indexDataCache.current[index.name] = {
      ...indexDataCache.current[index.name],
      searchResults: sortedResults,
    };
  };

  return (
    <div className='h-full flex flex-col bg-white overflow-hidden rounded-lg shadow'>
      {/* Custom Confirmation Dialog */}
      {showConfirmDialog && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full shadow-xl'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>Confirm Action</h3>
            <p className='text-gray-500 mb-6'>{confirmMessage}</p>
            <div className='flex justify-end space-x-3'>
              <button onClick={() => handleConfirmDialogResponse(false)} className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300' disabled={isDeleting}>
                Cancel
              </button>
              <button onClick={() => handleConfirmDialogResponse(true)} className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700' disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Document Dialog */}
      {showCreateDocDialog && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-3xl w-full shadow-xl'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>Create New Document in {index.name}</h3>

            <div className='mb-4'>
              <label htmlFor='docId' className='block text-sm font-medium text-gray-700 mb-1'>
                Document ID (optional)
              </label>
              <input
                type='text'
                id='docId'
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className='w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm'
                placeholder='Leave empty for auto-generated ID'
              />
            </div>

            <div className='mb-4'>
              <label htmlFor='docJSON' className='block text-sm font-medium text-gray-700 mb-1'>
                Document JSON
              </label>
              <div className='rounded-lg overflow-hidden'>
                <JsonEditor value={newDocJSON} onChange={setNewDocJSON} height={300} error={jsonError} />
              </div>
            </div>

            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowCreateDocDialog(false)}
                className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                disabled={isCreatingDoc}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                className='px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50'
                disabled={isCreatingDoc}
              >
                {isCreatingDoc ? (
                  <>
                    <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Document'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with index name and actions */}
      <div className='px-6 py-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center'>
          <h2 className='text-lg font-medium text-gray-900 flex items-center'>
            <span className={`w-3 h-3 rounded-full mr-2 ${index.health === 'green' ? 'bg-green-500' : index.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
            {index.name}
          </h2>
          {/* Add refresh button */}
          <button
            onClick={refreshCurrentTab}
            className='ml-2 flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-purple-600 hover:bg-purple-50 focus:outline-none'
            title='Refresh'
          >
            <RefreshCw className='w-5 h-5' />
          </button>
          <p className='mt-1 text-sm text-gray-500 ml-3'>
            {index.docsCount.toLocaleString()} documents • {index.storageSize} size
          </p>
        </div>

        <div className='mt-3 sm:mt-0 flex flex-wrap gap-2'>
          <button
            className='px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center'
            onClick={showCreateDocumentDialog}
          >
            <Plus className='w-4 h-4 mr-1' />
            Create Document
          </button>

          <button
            className='px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center'
            onClick={showDeleteIndexConfirmation}
            disabled={isDeleting}
          >
            {isDeleting && confirmAction === 'deleteIndex' ? (
              <>
                <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className='w-4 h-4 mr-1' />
                Delete Index
              </>
            )}
          </button>

          <button
            className='px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center'
            onClick={showDeleteDocumentsConfirmation}
            disabled={isDeleting}
          >
            {isDeleting && confirmAction === 'deleteDocuments' ? (
              <>
                <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className='w-4 h-4 mr-1' />
                Clear Documents
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className='bg-gray-50 border-b border-gray-200'>
        <nav className='flex -mb-px'>
          <button
            className={`${
              activeTab === 'overview' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none flex items-center`}
            onClick={() => handleTabChange('overview')}
          >
            <Home className='w-4 h-4 mr-2' />
            Overview
          </button>
          <button
            className={`${
              activeTab === 'documents' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none flex items-center`}
            onClick={() => handleTabChange('documents')}
          >
            <FileText className='w-4 h-4 mr-2' />
            Documents
          </button>
          <button
            className={`${
              activeTab === 'search' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none flex items-center`}
            onClick={() => handleTabChange('search')}
          >
            <Search className='w-4 h-4 mr-2' />
            Search
          </button>
          <button
            className={`${
              activeTab === 'mappings' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none flex items-center`}
            onClick={() => handleTabChange('mappings')}
          >
            <Database className='w-4 h-4 mr-2' />
            Mappings
          </button>
          <button
            className={`${
              activeTab === 'settings' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm focus:outline-none flex items-center`}
            onClick={() => handleTabChange('settings')}
          >
            <Settings className='w-4 h-4 mr-2' />
            Settings
          </button>
        </nav>
      </div>

      {/* Content area */}
      <div className='flex-1 overflow-hidden flex'>
        {/* Main content based on active tab */}
        <div className={`flex-1 overflow-auto ${(activeTab === 'documents' || activeTab === 'search') && selectedDoc ? 'w-2/3' : 'w-full'}`}>
          {activeTab === 'overview' && (
            <div className='p-6'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Index Overview</h3>
              <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
                <div className='border-t border-gray-200 px-4 py-5 sm:px-6'>
                  <dl className='grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2'>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Name</dt>
                      <dd className='mt-1 text-sm text-gray-900'>{index.name}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Health</dt>
                      <dd className='mt-1 text-sm text-gray-900 flex items-center'>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${index.health === 'green' ? 'bg-green-500' : index.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                        <span className='capitalize'>{index.health}</span>
                      </dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Documents</dt>
                      <dd className='mt-1 text-sm text-gray-900'>{index.docsCount.toLocaleString()}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Size</dt>
                      <dd className='mt-1 text-sm text-gray-900'>{index.storageSize}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Status</dt>
                      <dd className='mt-1 text-sm text-gray-900 capitalize'>{index.status}</dd>
                    </div>
                    <div className='sm:col-span-1'>
                      <dt className='text-sm font-medium text-gray-500'>Shards</dt>
                      <dd className='mt-1 text-sm text-gray-900'>
                        {index.primaryShards} primary / {index.replicaShards} replica
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className='h-full flex flex-col'>
              {/* Documents toolbar */}
              <div className='px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center'>
                <div className='flex items-center'>
                  <span className='text-sm text-gray-500 mr-2'>{selectedDocIds.size > 0 ? `${selectedDocIds.size} document${selectedDocIds.size !== 1 ? 's' : ''} selected` : 'Select documents'}</span>
                </div>
                <div>
                  {selectedDocIds.size > 0 && (
                    <button
                      onClick={() => {
                        // Use the confirmation dialog with proper action to ensure refreshing
                        setConfirmAction('deleteSelectedDocuments');
                        setConfirmMessage(`Are you sure you want to delete ${selectedDocIds.size} selected document${selectedDocIds.size !== 1 ? 's' : ''}? This action cannot be undone.`);
                        setShowConfirmDialog(true);
                      }}
                      className='inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50'
                    >
                      {isDeleting && confirmAction === 'deleteSelectedDocuments' ? (
                        <>
                          <svg className='animate-spin -ml-1 mr-1 h-3 w-3 text-white inline-block' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className='w-3 h-3 mr-1' />
                          Delete Selected
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Documents table */}
              <div className='flex-1 overflow-x-auto'>
                {isLoading ? (
                  <div className='flex justify-center items-center h-full'>
                    <svg className='animate-spin h-8 w-8 text-purple-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                  </div>
                ) : error ? (
                  <div className='flex justify-center items-center h-full'>
                    <p className='text-red-500'>{error}</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className='flex justify-center items-center h-full'>
                    <p className='text-gray-500'>No documents found</p>
                  </div>
                ) : (
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th scope='col' className='px-4 py-3 w-10'>
                          <div className='flex items-center'>
                            <input
                              type='checkbox'
                              className='h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded'
                              checked={isAllSelected || (documents.length > 0 && selectedDocIds.size === documents.length)}
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                        <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100' onClick={() => handleSort('id')}>
                          <span className='flex items-center'>
                            ID
                            {sortField === 'id' && (sortOrder === 'asc' ? <ChevronUp className='ml-1 h-4 w-4' /> : <ChevronDown className='ml-1 h-4 w-4' />)}
                          </span>
                        </th>
                        {fields.map((field) => (
                          <th
                            key={field}
                            scope='col'
                            className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                            onClick={() => handleSort(field)}
                          >
                            <span className='flex items-center'>
                              {field}
                              {sortField === field && (
                                <svg className={`ml-1 h-4 w-4 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill='currentColor' viewBox='0 0 20 20'>
                                  <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
                                </svg>
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                      {documents.map((doc) => (
                        <tr key={doc.id} className={`hover:bg-gray-50 ${selectedDoc?.id === doc.id ? 'bg-purple-50' : ''} ${selectedDocIds.has(doc.id) ? 'bg-purple-50' : ''}`}>
                          <td className='px-4 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              <input
                                type='checkbox'
                                className='h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded'
                                checked={selectedDocIds.has(doc.id)}
                                onChange={() => handleSelectDocument(doc.id)}
                                onClick={(e) => e.stopPropagation()} // Prevent row click
                              />
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer' onClick={() => setSelectedDoc(doc)}>
                            {doc.id ? doc.id.toString().substring(0, 10) + '...' : 'N/A'}
                          </td>
                          {fields.map((field) => (
                            <td key={field} className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer' onClick={() => setSelectedDoc(doc)}>
                              {renderFieldValue(doc[field])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {documents.length > 0 && (
                <div className='border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-white'>
                  <div className='flex-1 flex justify-between sm:hidden'>
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                      className='relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages}
                      className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
                    >
                      Next
                    </button>
                  </div>
                  <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-sm text-gray-700'>
                        Showing <span className='font-medium'>{(page - 1) * pageSize + 1}</span> to <span className='font-medium'>{Math.min(page * pageSize, totalHits)}</span> of{' '}
                        <span className='font-medium'>{totalHits}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px' aria-label='Pagination'>
                        <button
                          onClick={() => goToPage(page - 1)}
                          disabled={page === 1}
                          className='relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50'
                        >
                          <span className='sr-only'>Previous</span>
                          <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                            <path fillRule='evenodd' d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        </button>
                        {generatePaginationItems(page, totalPages, goToPage)}
                        <button
                          onClick={() => goToPage(page + 1)}
                          disabled={page === totalPages}
                          className='relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50'
                        >
                          <span className='sr-only'>Next</span>
                          <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                            <path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className='p-6 h-full flex flex-col'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Search</h3>

              <div className={`transition-all duration-300 ease-in-out ${isSearchEditorMinimized ? 'mb-1' : 'mb-4'}`}>
                <div className='flex justify-between items-center mb-1'>
                  <label htmlFor='searchQuery' className='block text-sm font-medium text-gray-700'>
                    Search Query
                  </label>
                  <button
                    onClick={() => setIsSearchEditorMinimized(!isSearchEditorMinimized)}
                    className='text-gray-500 hover:text-gray-700 transition-colors'
                    title={isSearchEditorMinimized ? 'Expand editor' : 'Minimize editor'}
                  >
                    {isSearchEditorMinimized ? (
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                        <path fillRule='evenodd' d='M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z' clipRule='evenodd' />
                        <path fillRule='evenodd' d='M10 5a1 1 0 011 1v8a1 1 0 11-2 0V6a1 1 0 011-1z' clipRule='evenodd' />
                      </svg>
                    ) : (
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                        <path fillRule='evenodd' d='M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z' clipRule='evenodd' />
                      </svg>
                    )}
                  </button>
                </div>

                <div className={`rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${isSearchEditorMinimized ? 'h-0 opacity-0' : 'opacity-100'}`}>
                  <JsonEditor value={searchQuery} onChange={setSearchQuery} height={isSearchEditorMinimized ? 0 : 300} error={searchJsonError} />
                </div>

                {isSearchEditorMinimized && (
                  <div className='p-2 bg-gray-100 text-gray-600 text-sm rounded-lg border border-gray-300'>
                    <div className='truncate'>{searchQuery ? (searchQuery.length > 100 ? `${searchQuery.substring(0, 100)}...` : searchQuery) : 'No query defined'}</div>
                  </div>
                )}
              </div>

              <div className='flex justify-end space-x-3'>
                <button
                  onClick={() => {
                    setSearchResults([]);
                    setSearchTotalHits(0);
                    // Clear search results in the cache
                    if (indexDataCache.current[index.name]) {
                      indexDataCache.current[index.name] = {
                        ...indexDataCache.current[index.name],
                        searchResults: [],
                        searchTotalHits: 0,
                      };
                    }
                  }}
                  className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                  disabled={isSearching}
                >
                  Clear
                </button>
                <button
                  onClick={searchDocuments}
                  className='px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 flex items-center'
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <>
                      <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                      </svg>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className='w-4 h-4 mr-2' />
                      Search
                    </>
                  )}
                </button>
              </div>

              {isSearching ? (
                <div className='flex-1 flex justify-center items-center'>
                  <svg className='animate-spin h-8 w-8 text-purple-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                </div>
              ) : searchError ? (
                <div className='flex-1 p-4 bg-red-50 border border-red-200 rounded-md'>
                  <p className='text-red-600'>{searchError}</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className='flex-1 flex justify-center items-center h-40'>
                  <p className='text-gray-500'>No results found. Try a different search query.</p>
                </div>
              ) : (
                <div className='flex-1 flex flex-col overflow-hidden'>
                  {/* Search results toolbar */}
                  <div className='px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center shadow-sm'>
                    <div className='flex items-center'>
                      <span className='text-sm font-medium text-gray-700'>
                        {searchTotalHits} result{searchTotalHits !== 1 ? 's' : ''}
                        {selectedDocIds.size > 0 && ` (${selectedDocIds.size} selected)`}
                      </span>
                    </div>
                    <div>
                      {selectedDocIds.size > 0 && (
                        <button
                          onClick={() => {
                            // Set up the confirmation action for search documents deletion
                            setConfirmAction('deleteSelectedDocuments');
                            setConfirmMessage(`Are you sure you want to delete ${selectedDocIds.size} selected document${selectedDocIds.size !== 1 ? 's' : ''}? This action cannot be undone.`);
                            setShowConfirmDialog(true);
                          }}
                          className='inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50'
                        >
                          {isDeleting && confirmAction === 'deleteSelectedDocuments' ? (
                            <>
                              <Loader2 className='animate-spin mr-1 h-3 w-3 text-white' />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className='w-3 h-3 mr-1' />
                              Delete Selected
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search results table */}
                  <div className='flex-1 overflow-auto'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead className='bg-gray-50 sticky top-0 z-10'>
                        <tr>
                          <th scope='col' className='px-4 py-3 w-10'>
                            <div className='flex items-center'>
                              <input
                                type='checkbox'
                                className='h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded'
                                checked={isAllSelected || (searchResults.length > 0 && selectedDocIds.size === searchResults.length)}
                                onChange={handleSelectAll}
                              />
                            </div>
                          </th>
                          <th
                            scope='col'
                            className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-1/6'
                            onClick={() => handleSearchSort('id')}
                          >
                            <span className='flex items-center'>
                              ID
                              {searchSortField === 'id' && (searchSortOrder === 'asc' ? <ChevronUp className='ml-1 h-4 w-4' /> : <ChevronDown className='ml-1 h-4 w-4' />)}
                            </span>
                          </th>
                          {fields.map((field) => {
                            // Determine column width based on field type or name
                            let widthClass = '';

                            // Example of custom widths based on field name/type
                            if (field === 'name' || field === 'title') {
                              widthClass = 'w-1/4';
                            } else if (field === 'description' || field === 'content') {
                              widthClass = 'w-1/3';
                            } else {
                              widthClass = 'w-1/6';
                            }

                            return (
                              <th
                                key={field}
                                scope='col'
                                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${widthClass}`}
                                onClick={() => handleSearchSort(field)}
                              >
                                <span className='flex items-center'>
                                  {field}
                                  {searchSortField === field && (
                                    <svg className={`ml-1 h-4 w-4 ${searchSortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill='currentColor' viewBox='0 0 20 20'>
                                      <path
                                        fillRule='evenodd'
                                        d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
                                        clipRule='evenodd'
                                      />
                                    </svg>
                                  )}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className='bg-white divide-y divide-gray-200'>
                        {searchResults.map((doc) => (
                          <tr
                            key={doc.id}
                            className={`hover:bg-gray-50 ${selectedDoc?.id === doc.id ? 'bg-purple-50' : ''} ${selectedDocIds.has(doc.id) ? 'bg-purple-50' : ''}`}
                            onClick={() => setSelectedDoc(doc)}
                          >
                            <td className='px-4 py-4 whitespace-nowrap' onClick={(e) => e.stopPropagation()}>
                              <div className='flex items-center'>
                                <input
                                  type='checkbox'
                                  className='h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded'
                                  checked={selectedDocIds.has(doc.id)}
                                  onChange={() => handleSelectDocument(doc.id)}
                                />
                              </div>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                              {doc.id ? doc.id.toString().substring(0, 10) + (doc.id.toString().length > 10 ? '...' : '') : 'N/A'}
                            </td>
                            {fields.map((field) => (
                              <td key={field} className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                {renderFieldValue(doc[field])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Search pagination */}
                  {searchResults.length > 0 && (
                    <div className='border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-white shadow-sm'>
                      <div className='flex-1 flex justify-between sm:hidden'>
                        <button
                          onClick={() => goToSearchPage(searchPage - 1)}
                          disabled={searchPage === 1}
                          className='relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => goToSearchPage(searchPage + 1)}
                          disabled={searchPage === Math.ceil(searchTotalHits / pageSize)}
                          className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
                        >
                          Next
                        </button>
                      </div>
                      <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
                        <div>
                          <p className='text-sm text-gray-700'>
                            Showing <span className='font-medium'>{(searchPage - 1) * pageSize + 1}</span> to <span className='font-medium'>{Math.min(searchPage * pageSize, searchTotalHits)}</span> of{' '}
                            <span className='font-medium'>{searchTotalHits}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px' aria-label='Pagination'>
                            <button
                              onClick={() => goToSearchPage(searchPage - 1)}
                              disabled={searchPage === 1}
                              className='relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50'
                            >
                              <span className='sr-only'>Previous</span>
                              <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                                <path fillRule='evenodd' d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z' clipRule='evenodd' />
                              </svg>
                            </button>
                            {generatePaginationItems(searchPage, Math.ceil(searchTotalHits / pageSize), goToSearchPage)}
                            <button
                              onClick={() => goToSearchPage(searchPage + 1)}
                              disabled={searchPage === Math.ceil(searchTotalHits / pageSize)}
                              className='relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50'
                            >
                              <span className='sr-only'>Next</span>
                              <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                                <path fillRule='evenodd' d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z' clipRule='evenodd' />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mappings' && (
            <div className='p-6'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Index Mappings</h3>

              {isMappingsLoading ? (
                <div className='flex justify-center items-center h-40'>
                  <svg className='animate-spin h-8 w-8 text-purple-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                </div>
              ) : mappingsError ? (
                <div className='p-4 bg-red-50 border border-red-200 rounded-md'>
                  <p className='text-red-600'>{mappingsError}</p>
                </div>
              ) : !mappings ? (
                <p className='text-gray-500'>No mapping information available.</p>
              ) : (
                <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
                  <div className='px-4 py-5 sm:p-6'>
                    {/* Index mappings content */}
                    <div className='mb-4'>
                      <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wider mb-2'>Properties</h4>

                      {Object.keys(mappings).length === 0 ? (
                        <p className='text-gray-500'>This index has no mappings defined.</p>
                      ) : (
                        // Get the properties from the mappings
                        // Elasticsearch mappings structure: { index_name: { mappings: { properties: { ... } } } }
                        Object.entries(mappings).map(([indexName, indexData]: [string, any]) => {
                          const properties = indexData?.mappings?.properties;

                          return (
                            <div key={indexName} className='border border-gray-200 rounded-md p-4'>
                              {properties ? renderMappingProperties(properties) : <p className='text-gray-500'>No properties defined.</p>}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Raw JSON view toggle button */}
                    <div className='mt-6'>
                      <button
                        onClick={() => document.getElementById('raw-mappings')?.classList.toggle('hidden')}
                        className='inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                      >
                        <FileText className='mr-2 h-4 w-4' />
                        Toggle Raw JSON
                      </button>

                      <div id='raw-mappings' className='hidden mt-4'>
                        <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wider mb-2'>Raw Mappings JSON</h4>
                        <pre className='bg-gray-50 p-4 rounded-md overflow-auto text-sm text-gray-800 max-h-96'>{JSON.stringify(mappings, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className='p-6'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Index Settings</h3>

              {isSettingsLoading ? (
                <div className='flex justify-center items-center h-40'>
                  <svg className='animate-spin h-8 w-8 text-purple-500' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                </div>
              ) : settingsError ? (
                <div className='p-4 bg-red-50 border border-red-200 rounded-md'>
                  <p className='text-red-600'>{settingsError}</p>
                </div>
              ) : !settings ? (
                <p className='text-gray-500'>No settings information available.</p>
              ) : (
                <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
                  <div className='px-4 py-5 sm:p-6'>
                    {/* Index settings content */}
                    <div className='mb-4'>
                      <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wider mb-2'>Configuration</h4>

                      {Object.keys(settings).length === 0 ? (
                        <p className='text-gray-500'>This index has no settings defined.</p>
                      ) : (
                        <div className='border border-gray-200 rounded-md p-4'>
                          {Object.entries(settings).map(([indexName, indexData]: [string, any]) => {
                            // Get settings object from the response
                            // Structure is typically: { index_name: { settings: { index: {...}, ... } } }
                            return (
                              <div key={indexName}>
                                <div className='font-medium text-gray-700 mb-2'>Settings for: {indexName}</div>
                                {indexData && indexData.settings ? renderSettings(indexData.settings) : <p className='text-gray-500'>No settings information found.</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Raw JSON view toggle button */}
                    <div className='mt-6'>
                      <button
                        onClick={() => document.getElementById('raw-settings')?.classList.toggle('hidden')}
                        className='inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                      >
                        <FileText className='mr-2 h-4 w-4' />
                        Toggle Raw JSON
                      </button>

                      <div id='raw-settings' className='hidden mt-4'>
                        <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wider mb-2'>Raw Settings JSON</h4>
                        <pre className='bg-gray-50 p-4 rounded-md overflow-auto text-sm text-gray-800 max-h-96'>{JSON.stringify(settings, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Details Panel */}
        {selectedDoc && (activeTab === 'documents' || activeTab === 'search') && (
          <div className='w-1/3 border-l border-gray-200 bg-gray-50 overflow-auto'>
            <div className='sticky top-0 bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center z-10 shadow-sm'>
              <h3 className='text-lg font-medium text-gray-900'>Document Detail</h3>
              <div className='flex items-center space-x-2'>
                <button onClick={() => setSelectedDoc(null)} className='text-gray-400 hover:text-gray-500'>
                  <X className='h-6 w-6' />
                </button>
              </div>
            </div>
            <div className='p-4'>
              <div className='rounded-lg bg-white shadow-sm overflow-hidden border border-gray-200'>
                <div className='px-4 py-3 sm:px-6 bg-gray-50 border-b border-gray-200'>
                  <h3 className='text-sm font-medium text-gray-900'>Document ID</h3>
                  <p className='mt-1 max-w-2xl text-sm text-gray-500 break-all'>{selectedDoc.id}</p>
                </div>

                {/* Document Fields (excluding ID which is shown above) */}
                <div className='px-4 py-4 sm:p-5 bg-white divide-y divide-gray-200'>
                  {Object.entries(selectedDoc)
                    .filter(([key]) => key !== 'id')
                    .map(([key, value]) => (
                      <div key={key} className='py-3 first:pt-0 last:pb-0'>
                        <dt className='text-sm font-medium text-gray-500'>{key}</dt>
                        <dd className='mt-1 text-sm text-gray-900 break-words'>
                          {typeof value === 'object' ? <pre className='mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-60'>{JSON.stringify(value, null, 2)}</pre> : String(value)}
                        </dd>
                      </div>
                    ))}
                </div>

                {/* Raw JSON View */}
                <div className='px-4 py-3 sm:px-6 bg-gray-50 border-t border-gray-200'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-sm font-medium text-gray-900'>Raw JSON</h3>
                    <button
                      type='button'
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(JSON.stringify(selectedDoc, null, 2));
                          showToast('Document JSON copied to clipboard', 'success');
                        }
                      }}
                      className='inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                    >
                      <Save className='mr-2 h-4 w-4' />
                      Copy JSON
                    </button>
                  </div>
                  <div className='mt-2 bg-gray-800 rounded-md'>
                    <pre className='text-xs text-gray-200 overflow-auto whitespace-pre-wrap p-3 max-h-60'>{JSON.stringify(selectedDoc, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndexDetail;
