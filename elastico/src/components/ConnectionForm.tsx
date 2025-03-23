import React, { useState } from 'react';
import { ElasticsearchConnection } from '../types/elasticsearch';

interface ConnectionFormProps {
  onSave: (connection: Omit<ElasticsearchConnection, 'id'>) => void;
  onCancel: () => void;
  initialValues?: Partial<ElasticsearchConnection>;
}

/**
 * Form for creating or editing an Elasticsearch connection
 */
const ConnectionForm: React.FC<ConnectionFormProps> = ({ onSave, onCancel, initialValues = {} }) => {
  const [name, setName] = useState(initialValues.name || '');
  const [host, setHost] = useState(initialValues.host || 'localhost');
  const [port, setPort] = useState(initialValues.port?.toString() || '9200');
  const [authType, setAuthType] = useState<'none' | 'basic' | 'apiKey'>(initialValues.authType || 'none');
  const [username, setUsername] = useState(initialValues.username || '');
  const [password, setPassword] = useState(initialValues.password || '');
  const [apiKey, setApiKey] = useState(initialValues.apiKey || '');
  const [ssl, setSsl] = useState(initialValues.ssl || false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  return (
    <div className='bg-white p-6 rounded-lg shadow-md'>
      <h2 className='text-2xl font-bold mb-6 text-gray-900'>{initialValues.id ? 'Edit Connection' : 'New Connection'}</h2>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div>
          <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
            Connection Name
          </label>
          <input
            type='text'
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
            placeholder='My Elasticsearch Cluster'
          />
          {errors.name && <p className='mt-1 text-sm text-red-600'>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor='host' className='block text-sm font-medium text-gray-700'>
            Host
          </label>
          <input
            type='text'
            id='host'
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border ${
              errors.host ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
            placeholder='localhost'
          />
          {errors.host && <p className='mt-1 text-sm text-red-600'>{errors.host}</p>}
        </div>

        <div>
          <label htmlFor='port' className='block text-sm font-medium text-gray-700'>
            Port
          </label>
          <input
            type='text'
            id='port'
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border ${
              errors.port ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
            placeholder='9200'
          />
          {errors.port && <p className='mt-1 text-sm text-red-600'>{errors.port}</p>}
        </div>

        <div>
          <div className='flex items-center'>
            <input type='checkbox' id='ssl' checked={ssl} onChange={(e) => setSsl(e.target.checked)} className='h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded' />
            <label htmlFor='ssl' className='ml-2 block text-sm text-gray-700'>
              Use SSL/TLS
            </label>
          </div>
        </div>

        <div>
          <label htmlFor='authType' className='block text-sm font-medium text-gray-700'>
            Authentication
          </label>
          <select
            id='authType'
            value={authType}
            onChange={(e) => setAuthType(e.target.value as 'none' | 'basic' | 'apiKey')}
            className='mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md'
          >
            <option value='none'>No Authentication</option>
            <option value='basic'>Basic Auth</option>
            <option value='apiKey'>API Key</option>
          </select>
        </div>

        {authType === 'basic' && (
          <>
            <div>
              <label htmlFor='username' className='block text-sm font-medium text-gray-700'>
                Username
              </label>
              <input
                type='text'
                id='username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors.username && <p className='mt-1 text-sm text-red-600'>{errors.username}</p>}
            </div>

            <div>
              <label htmlFor='password' className='block text-sm font-medium text-gray-700'>
                Password
              </label>
              <input
                type='password'
                id='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
              />
              {errors.password && <p className='mt-1 text-sm text-red-600'>{errors.password}</p>}
            </div>
          </>
        )}

        {authType === 'apiKey' && (
          <div>
            <label htmlFor='apiKey' className='block text-sm font-medium text-gray-700'>
              API Key
            </label>
            <input
              type='password'
              id='apiKey'
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.apiKey ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
            />
            {errors.apiKey && <p className='mt-1 text-sm text-red-600'>{errors.apiKey}</p>}
          </div>
        )}

        <div className='flex justify-end space-x-3'>
          <button
            type='button'
            onClick={onCancel}
            className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          >
            Cancel
          </button>
          <button
            type='submit'
            className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          >
            Save Connection
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConnectionForm;
