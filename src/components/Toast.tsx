/**
 * elastico/src/components/Toast.tsx
 * Toast notification component for displaying temporary messages
 */
import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number; // Time in milliseconds before auto-closing
}

/**
 * Toast notification component that automatically dismisses after a duration
 */
const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
  // Auto-dismiss the toast after the specified duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // Clean up the timer when the component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [onClose, duration]);

  // Determine the background color based on the type
  const bgColor = type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-blue-50 border-blue-500 text-blue-700';

  // Determine the icon based on the type
  const icon =
    type === 'success' ? (
      <svg className='h-5 w-5 text-green-500' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
      </svg>
    ) : type === 'error' ? (
      <svg className='h-5 w-5 text-red-500' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
          clipRule='evenodd'
        />
      </svg>
    ) : (
      <svg className='h-5 w-5 text-blue-500' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
        <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
      </svg>
    );

  return (
    <div className='fixed bottom-5 right-5 z-50 animate-fade-in'>
      <div className={`max-w-md rounded-lg shadow-lg border-l-4 ${bgColor}`}>
        <div className='p-4 flex items-start'>
          <div className='flex-shrink-0 pt-0.5'>{icon}</div>
          <div className='ml-3 flex-1'>
            <p className='text-sm font-medium'>{message}</p>
          </div>
          <div className='ml-4 flex-shrink-0 flex'>
            <button onClick={onClose} className='bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'>
              <span className='sr-only'>Close</span>
              <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                <path
                  fillRule='evenodd'
                  d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
