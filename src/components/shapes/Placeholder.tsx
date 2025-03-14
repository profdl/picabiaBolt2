import React from 'react';

interface PlaceholderProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const Placeholder: React.FC<PlaceholderProps> = ({
  width = 100,
  height = 100,
  className = '',
  style = {},
  children,
  onClick,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Placeholder; 