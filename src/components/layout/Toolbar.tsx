import React from 'react';

export const Toolbar: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-gray-900 text-white flex items-center justify-between px-4 border-t border-gray-700">
      <div className="flex items-center space-x-4">
        {/* Add any other toolbar items here */}
      </div>
    </div>
  );
}; 