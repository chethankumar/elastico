import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ConnectionsPage from './pages/ConnectionsPage';
import IndicesPage from './pages/IndicesPage';
import QueryPage from './pages/QueryPage';

// NavLink component with active state
const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
        isActive ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </Link>
  );
};

/**
 * Main application component
 */
function App(): React.ReactElement {
  return (
    <Router>
      <div className='min-h-screen bg-gray-100'>
        {/* Header */}
        <header className='bg-white shadow'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between h-16'>
              <div className='flex'>
                <div className='flex-shrink-0 flex items-center'>
                  <h1 className='text-2xl font-bold text-primary-600'>Elastiky</h1>
                </div>
                <nav className='ml-6 flex space-x-8'>
                  <NavLink to='/'>Connections</NavLink>
                  <NavLink to='/indices'>Indices</NavLink>
                  <NavLink to='/query'>Query</NavLink>
                </nav>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main>
          <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
            <Routes>
              <Route path='/' element={<ConnectionsPage />} />
              <Route path='/indices' element={<IndicesPage />} />
              <Route path='/query' element={<QueryPage />} />
            </Routes>
          </div>
        </main>

        {/* Footer */}
        <footer className='bg-white'>
          <div className='max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8'>
            <p className='text-center text-sm text-gray-500'>Elastiky - Elasticsearch GUI Client &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
