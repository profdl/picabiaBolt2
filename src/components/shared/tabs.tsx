import React from 'react'
import { useThemeClass } from '../../styles/useThemeClass';

interface TabsProps {
  defaultValue: string
  children: React.ReactNode
  className?: string
}

interface TabsChildProps {
  currentValue?: string;
  onSelect?: (value: string) => void;
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  onClick?: () => void
  isSelected?: boolean
}

interface TabsContentProps {
  value: string
  currentValue: string
  children: React.ReactNode
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className }) => {
  const [value, setValue] = React.useState(defaultValue)
  const styles = {
    base: useThemeClass(['tabs', 'base'])
  };

  return (
    <div className={`${styles.base} ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement<TabsChildProps>(child)) {
          return React.cloneElement(child, {
            currentValue: value,
            onSelect: setValue
          })
        }
        return child
      })}
    </div>
  )
}

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => (
  <div className={`flex border-b border-gray-200 ${className}`}>
    {children}
  </div>
)

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ children, isSelected }) => (
  <button
    className={`px-4 py-2 text-sm font-medium border-b-2 ${isSelected
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
  >
    {children}
  </button>
)

export const TabsContent: React.FC<TabsContentProps> = ({ value, currentValue, children }) => (
  <div className={value === currentValue ? 'block' : 'hidden'}>
    {children}
  </div>
)
