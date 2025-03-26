/**
 * elastico/src/contexts/ToastContext.tsx
 * Context for managing toast notifications across the application
 */
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Toast from '../components/Toast';

// Define the shape of a toast notification
export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Define the context interface
interface ToastContextProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Create the context with default values
const ToastContext = createContext<ToastContextProps>({
  showToast: () => {}, // Default implementation does nothing
});

// Custom hook to use the toast context
export const useToast = () => useContext(ToastContext);

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider component for toast notifications
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Function to add a new toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString(); // Simple ID generation using timestamp
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
  }, []);

  // Function to remove a toast by ID
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render all active toasts */}
      <div className='toast-container'>
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
