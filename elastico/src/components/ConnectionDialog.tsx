/**
 * elastico/src/components/ConnectionDialog.tsx
 * Modal dialog for creating and editing Elasticsearch connections
 */
import React from 'react';
import { ElasticsearchConnection } from '../types/elasticsearch';
import ConnectionForm from './ConnectionForm';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: Omit<ElasticsearchConnection, 'id'>) => void;
  initialValues?: Partial<ElasticsearchConnection>;
  isEditing?: boolean;
}

/**
 * Modal dialog component that presents a ConnectionForm for creating or editing connections
 * Styled to match the application's design system
 */
const ConnectionDialog: React.FC<ConnectionDialogProps> = ({ isOpen, onClose, onSave, initialValues, isEditing = false }) => {
  if (!isOpen) return null;

  const handleSave = (connection: Omit<ElasticsearchConnection, 'id'>) => {
    onSave(connection);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
        {/* Background overlay */}
        <div className='fixed inset-0 transition-opacity' aria-hidden='true'>
          <div
            className='absolute inset-0 bg-gray-500 opacity-75'
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          ></div>
        </div>

        {/* Center modal */}
        <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
          &#8203;
        </span>

        <div
          className='inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex justify-between items-center mb-5 border-b border-gray-200 pb-4'>
            <h3 className='text-lg leading-6 font-medium text-gray-900'>{isEditing ? 'Edit Connection' : 'New Connection'}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className='text-gray-400 hover:text-gray-500 focus:outline-none'
              aria-label='Close'
            >
              <span className='sr-only'>Close</span>
              <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>

          <div>
            <ConnectionForm onSave={handleSave} onCancel={onClose} initialValues={initialValues} isDialog={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDialog;
