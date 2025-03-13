import { Position } from './shapes';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children?: ContextMenuItem[];
}

export interface DrawerState {
  isOpen: boolean;
  width: number;
  position: 'left' | 'right';
  content: React.ReactNode | null;
  setIsOpen: (isOpen: boolean) => void;
  setWidth: (width: number) => void;
  setPosition: (position: 'left' | 'right') => void;
  setContent: (content: React.ReactNode | null) => void;
  open: () => void;
  close: () => void;
}

export interface ModalState {
  isOpen: boolean;
  title: string;
  content: React.ReactNode | null;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  setIsOpen: (isOpen: boolean) => void;
  setTitle: (title: string) => void;
  setContent: (content: React.ReactNode | null) => void;
  setOnClose: (onClose: () => void) => void;
  setOnConfirm: (onConfirm: () => void) => void;
  setConfirmText: (text: string) => void;
  setCancelText: (text: string) => void;
  open: () => void;
  close: () => void;
  confirm: () => void;
}

export interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  position: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  setIsVisible: (isVisible: boolean) => void;
  setMessage: (message: string) => void;
  setType: (type: ToastState['type']) => void;
  setDuration: (duration: number) => void;
  setPosition: (position: ToastState['position']) => void;
  show: (message: string, type: ToastState['type']) => void;
  hide: () => void;
}

export interface TooltipState {
  isVisible: boolean;
  content: string;
  position: Position;
  setIsVisible: (isVisible: boolean) => void;
  setContent: (content: string) => void;
  setPosition: (position: Position) => void;
  show: (content: string, position: Position) => void;
  hide: () => void;
}

export interface DropdownState {
  isOpen: boolean;
  position: Position;
  items: ContextMenuItem[];
  setIsOpen: (isOpen: boolean) => void;
  setPosition: (position: Position) => void;
  setItems: (items: ContextMenuItem[]) => void;
  open: (position: Position, items: ContextMenuItem[]) => void;
  close: () => void;
} 