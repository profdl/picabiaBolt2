import React from "react";
import { X } from "lucide-react";
import { useThemeClass } from '../../styles/useThemeClass';

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
  const styles = {
    base: useThemeClass(['drawer', 'base']),
    header: {
      base: useThemeClass(['drawer', 'header', 'base']),
      title: useThemeClass(['drawer', 'header', 'title']),
      close: useThemeClass(['drawer', 'header', 'close'])
    },
    content: useThemeClass(['drawer', 'content']),
    border: {
      left: useThemeClass(['drawer', 'border', 'left']),
      right: useThemeClass(['drawer', 'border', 'right'])
    }
  };

  const handleDrawerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-transparent z-30"
        onClick={onClose}
      />
      
      <div 
        onClick={handleDrawerClick}
        className={`
          fixed flex flex-col
          ${styles.base}
          ${position === 'left' ? styles.border.right : styles.border.left}
        `}
        style={{
          top: '4rem',
          bottom: '4rem',
          width: '400px',
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
        <div className={`${styles.header.base} flex-shrink-0`}>
          <h3 className={styles.header.title}>{title}</h3>
          <button
            onClick={onClose}
            className={styles.header.close}
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        <div className={`${styles.content} flex-1 overflow-y-auto`}>
          {children}
        </div>
      </div>
    </>
  );
};