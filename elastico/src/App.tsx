import React from 'react';
import { ElasticsearchProvider } from './contexts/ElasticsearchContext';
import { ToastProvider } from './contexts/ToastContext';
import AppHeader from './components/AppHeader';
import Dashboard from './components/Dashboard';

/**
 * Main application component
 */
function App(): React.ReactElement {
  return (
    <ElasticsearchProvider>
      <ToastProvider>
        <div className='min-h-screen flex flex-col bg-gray-100'>
          <AppHeader />
          <main className='flex-1 overflow-hidden'>
            <Dashboard />
          </main>
        </div>
      </ToastProvider>
    </ElasticsearchProvider>
  );
}

export default App;
