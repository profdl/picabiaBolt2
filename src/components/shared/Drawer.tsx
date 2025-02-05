import React from "react";
import { X } from "lucide-react";

interface DrawerProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: "left" | "right";
}

export const Drawer: React.FC<DrawerProps> = ({ 
  title, 
  children, 
  isOpen, 
  onClose,
  position = 'right'
}) => {
  const handleDrawerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent overlay */}
      <div 
        className="fixed inset-0 bg-black/0 z-30"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        onClick={handleDrawerClick}
        className={`
          fixed bg-white shadow-lg transition-transform duration-300 ease-in-out z-40
          w-80 ${position === 'left' ? 'border-r' : 'border-l'} border-gray-200
          flex flex-col
        `}
        style={{
          top: '4rem', // 64px navbar height
          bottom: '4rem', // toolbar height
          ...(position === 'left' 
            ? {
                left: 0,
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
              }
            : {
                right: 0,
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
              }
          )
        }}
      >
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
    </>
  );
};