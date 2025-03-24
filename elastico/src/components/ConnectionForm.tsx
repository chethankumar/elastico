import React, { useState } from 'react';
import { ElasticsearchConnection } from '../types/elasticsearch';

interface ConnectionFormProps {
  onSave: (connection: Omit<ElasticsearchConnection, 'id'>) => void;
  onCancel: () => void;
  initialValues?: Partial<ElasticsearchConnection>;
  isDialog?: boolean;
}

/**
 * Form for creating or editing an Elasticsearch connection
 * Styled to match the overall application design system
 */
const ConnectionForm: React.FC<ConnectionFormProps> = ({ onSave, onCancel, initialValues = {}, isDialog = false }) => {
  const [name, setName] = useState(initialValues.name || '');
  const [host, setHost] = useState(initialValues.host || 'localhost');
  const [port, setPort] = useState(initialValues.port?.toString() || '9200');
  const [authType, setAuthType] = useState<'none' | 'basic' | 'apiKey'>(initialValues.authType || 'none');
  const [username, setUsername] = useState(initialValues.username || '');
  const [password, setPassword] = useState(initialValues.password || '');
  const [apiKey, setApiKey] = useState(initialValues.apiKey || '');
  const [ssl, setSsl] = useState(initialValues.ssl || false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Connection name is required';
    }

    if (!host.trim()) {
      newErrors.host = 'Host is required';
    }

    if (!port.trim()) {
      newErrors.port = 'Port is required';
    } else if (isNaN(Number(port)) || Number(port) <= 0) {
      newErrors.port = 'Port must be a positive number';
    }

    if (authType === 'basic') {
      if (!username.trim()) {
        newErrors.username = 'Username is required for basic authentication';
      }
      if (!password.trim()) {
        newErrors.password = 'Password is required for basic authentication';
      }
    } else if (authType === 'apiKey') {
      if (!apiKey.trim()) {
        newErrors.apiKey = 'API key is required for API key authentication';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const connection: Omit<ElasticsearchConnection, 'id'> = {
      name,
      host,
      port: Number(port),
      authType,
      ssl,
    };

    if (authType === 'basic') {
      connection.username = username;
      connection.password = password;
    } else if (authType === 'apiKey') {
      connection.apiKey = apiKey;
    }

    onSave(connection);
  };

  // Handle authentication type change
  const handleAuthTypeChange = (type: 'none' | 'basic' | 'apiKey') => {
    setAuthType(type);
    setIsAuthDropdownOpen(false);
  };

  // Authentication type options
  const authTypes = [
    { value: 'none', label: 'No Authentication', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { value: 'basic', label: 'Basic Auth', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { value: 'apiKey', label: 'API Key', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  ];

  // Application-wide input field style
  const inputClass = (error?: string) =>
    `mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm`;

  // Form button styles
  const cancelBtnClass =
    'px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500';
  const saveBtnClass =
    'px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500';

  return (
    <div className={isDialog ? '' : 'bg-white p-6 rounded-lg shadow-md'}>
      {!isDialog && <h2 className='text-2xl font-bold mb-6 text-gray-900'>{initialValues.id ? 'Edit Connection' : 'New Connection'}</h2>}

      <form onSubmit={handleSubmit} className='space-y-5'>
        <div>
          <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
            Connection Name
          </label>
          <input type='text' id='name' value={name} onChange={(e) => setName(e.target.value)} className={inputClass(errors.name)} placeholder='My Elasticsearch Cluster' />
          {errors.name && <p className='mt-1 text-sm text-red-600'>{errors.name}</p>}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label htmlFor='host' className='block text-sm font-medium text-gray-700'>
              Host
            </label>
            <input type='text' id='host' value={host} onChange={(e) => setHost(e.target.value)} className={inputClass(errors.host)} placeholder='localhost' />
            {errors.host && <p className='mt-1 text-sm text-red-600'>{errors.host}</p>}
          </div>

          <div>
            <label htmlFor='port' className='block text-sm font-medium text-gray-700'>
              Port
            </label>
            <input type='text' id='port' value={port} onChange={(e) => setPort(e.target.value)} className={inputClass(errors.port)} placeholder='9200' />
            {errors.port && <p className='mt-1 text-sm text-red-600'>{errors.port}</p>}
          </div>
        </div>

        <div>
          <div className='flex items-center'>
            <input type='checkbox' id='ssl' checked={ssl} onChange={(e) => setSsl(e.target.checked)} className='h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded' />
            <label htmlFor='ssl' className='ml-2 block text-sm text-gray-700'>
              Use SSL/TLS
            </label>
          </div>
        </div>

        {/* Enhanced Authentication Dropdown */}
        <div className='relative'>
          <label htmlFor='authType' className='block text-sm font-medium text-gray-700 mb-1'>
            Authentication
          </label>

          <div className='mt-1 relative'>
            <button
              type='button'
              className='bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm'
              onClick={() => setIsAuthDropdownOpen(!isAuthDropdownOpen)}
              aria-haspopup='listbox'
              aria-expanded={isAuthDropdownOpen}
              aria-labelledby='auth-type-button'
            >
              <div className='flex items-center'>
                <span className='flex items-center'>
                  <svg className='h-5 w-5 text-purple-500 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d={authTypes.find((type) => type.value === authType)?.icon} />
                  </svg>
                  {authTypes.find((type) => type.value === authType)?.label}
                </span>
              </div>
              <span className='absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none'>
                <svg className='h-5 w-5 text-gray-400' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                  <path
                    fillRule='evenodd'
                    d='M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3z'
                    clipRule='evenodd'
                    transform='rotate(180 10 10)'
                  />
                </svg>
              </span>
            </button>

            {isAuthDropdownOpen && (
              <ul
                className='absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm'
                tabIndex={-1}
                role='listbox'
                aria-labelledby='auth-type-button'
                aria-activedescendant={`auth-type-option-${authType}`}
              >
                {authTypes.map((type) => (
                  <li
                    key={type.value}
                    id={`auth-type-option-${type.value}`}
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${authType === type.value ? 'text-white bg-purple-600' : 'text-gray-900 hover:bg-gray-100'}`}
                    role='option'
                    aria-selected={authType === type.value}
                    onClick={() => handleAuthTypeChange(type.value as 'none' | 'basic' | 'apiKey')}
                  >
                    <div className='flex items-center'>
                      <svg className={`h-5 w-5 mr-2 ${authType === type.value ? 'text-white' : 'text-purple-500'}`} fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d={type.icon} />
                      </svg>
                      <span className={`block truncate ${authType === type.value ? 'font-semibold' : 'font-normal'}`}>{type.label}</span>
                    </div>

                    {authType === type.value && (
                      <span className={`absolute inset-y-0 right-0 flex items-center pr-4 ${authType === type.value ? 'text-white' : 'text-purple-600'}`}>
                        <svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                          <path
                            fillRule='evenodd'
                            d='M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Authentication Details Sections */}
        {authType === 'basic' && (
          <div className='space-y-4 p-4 rounded-md bg-gray-50 border border-gray-200'>
            <div className='flex items-center border-b border-gray-200 pb-2 mb-3'>
              <svg className='h-5 w-5 text-purple-500 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
              <h4 className='text-sm font-medium text-gray-700'>Basic Authentication</h4>
            </div>

            <div>
              <label htmlFor='username' className='block text-sm font-medium text-gray-700'>
                Username
              </label>
              <input type='text' id='username' value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass(errors.username)} />
              {errors.username && <p className='mt-1 text-sm text-red-600'>{errors.username}</p>}
            </div>

            <div>
              <label htmlFor='password' className='block text-sm font-medium text-gray-700'>
                Password
              </label>
              <input type='password' id='password' value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass(errors.password)} />
              {errors.password && <p className='mt-1 text-sm text-red-600'>{errors.password}</p>}
            </div>
          </div>
        )}

        {authType === 'apiKey' && (
          <div className='space-y-4 p-4 rounded-md bg-gray-50 border border-gray-200'>
            <div className='flex items-center border-b border-gray-200 pb-2 mb-3'>
              <svg className='h-5 w-5 text-purple-500 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                />
              </svg>
              <h4 className='text-sm font-medium text-gray-700'>API Key Authentication</h4>
            </div>

            <div>
              <label htmlFor='apiKey' className='block text-sm font-medium text-gray-700'>
                API Key
              </label>
              <input type='password' id='apiKey' value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={inputClass(errors.apiKey)} />
              {errors.apiKey && <p className='mt-1 text-sm text-red-600'>{errors.apiKey}</p>}
            </div>
          </div>
        )}

        <div className='flex justify-end space-x-3 pt-4'>
          <button type='button' onClick={onCancel} className={cancelBtnClass}>
            Cancel
          </button>
          <button type='submit' className={saveBtnClass}>
            Save Connection
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConnectionForm;
