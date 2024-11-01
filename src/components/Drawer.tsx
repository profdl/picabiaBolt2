import React from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ 
  title, 
  children, 
  isOpen, 
  onClose 
}) => {
  return (
    <div 
      className={`
        fixed right-0 bg-white shadow-lg transition-transform duration-300 ease-in-out z-40
        w-80 border-l border-gray-200
      `}
      style={{
        top: '4rem', // 64px navbar height
        bottom: '4rem', // toolbar height
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-medium text-gray-700">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};