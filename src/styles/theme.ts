export const theme = {
  nav: {
    base: "bg-neutral-50 dark:bg-neutral-900 shadow z-50 relative",
    container: "mx-auto px-4 sm:px-6 lg:px-8 w-full",
    header: "flex justify-between w-full h-16",
    logo: "text-xl font-bold text-neutral-900 dark:text-neutral-50",
    menuButton: "p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg",
    dropdown: {
      container: "absolute left-0 mt-0 w-48 rounded-md shadow-lg bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-900/5 ring-opacity-5 z-50",
      item: "block px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
    },
    projectName: {
      input: "px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-neutral-800 dark:text-neutral-50",
      button: "text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50"
    },
    auth: {
      signOut: "px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-sm font-medium",
      login: "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 px-3 py-2 rounded-md text-sm font-medium",
      signUp: "bg-neutral-800 text-neutral-50 hover:bg-neutral-900 px-4 py-2 rounded-md text-sm font-medium"
    }
  },
  toolbar: {
    container: "absolute bottom-0 left-0 right-0 bg-neutral-50 dark:bg-neutral-900 shadow-lg px-4 py-2 border-t border-neutral-200 dark:border-neutral-700",
    button: {
      base: "p-2 rounded-lg transition-colors duration-200",
      active: "bg-neutral-100 dark:bg-neutral-800",
      primary: "bg-blue-600 hover:bg-blue-700 text-neutral-50" 
    },
    controls: {
      container: "flex flex-col gap-1",
      label: "text-xs text-neutral-500 dark:text-neutral-400",
      input: "w-full dark:bg-neutral-800 dark:text-neutral-50"
    }
  },
  canvas: {
    container: "w-full h-full overflow-hidden bg-neutral-50 dark:bg-neutral-900 relative",
    grid: {
      major: "stroke-neutral-200 dark:stroke-neutral-700",
      minor: "stroke-neutral-100 dark:stroke-neutral-800"
    }
  },
  button: {
    base: "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:pointer-events-none disabled:opacity-50",
    variant: {
      default: "bg-neutral-800 text-neutral-50 hover:bg-neutral-900",
      outline: "border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
      ghost: "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
      link: "text-neutral-600 dark:text-neutral-300 underline-offset-4 hover:underline",
      primary: "bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-900 dark:hover:bg-neutral-600 text-neutral-50"
    },
    size: {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-10 px-8"
    },
    toolbar: {
      base: "p-2 rounded-lg inline-flex items-center justify-center gap-1",
      default: "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
      active: "bg-neutral-200 dark:bg-neutral-700",
      label: "text-sm font-medium leading-none"
    }
  },
  shape: {
    base: "transition-shadow hover:shadow-xl relative",
    selected: "ring-2 ring-neutral-500 dark:ring-neutral-400",
    container: "absolute inset-0",
    controls: {
      panel: "absolute left-full ml-2 top-0 z-[101]",
      group: "bg-neutral-50 dark:bg-neutral-800 rounded-md mb-1 p-1 border border-neutral-200 dark:border-neutral-700 shadow-sm",
      checkbox: "w-3 h-3 rounded border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 focus:ring-0",
      label: "text-xs text-neutral-700 dark:text-neutral-200 whitespace-nowrap",
      slider: "mini-slider w-24",
      tooltip: "bg-neutral-500 dark:bg-neutral-400 text-neutral-50 px-2 py-1 rounded text-xs",
      button: "p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700",
      buttonActive: "bg-neutral-100 dark:bg-neutral-700 border-neutral-500 dark:border-neutral-400"
    },
    resizeHandle: "absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-500 dark:border-neutral-400 rounded-full cursor-se-resize",
    colorPicker: "absolute -left-6 top-1/2 w-4 h-4 cursor-pointer transform -translate-y-1/2",
    textArea: "w-full h-full bg-transparent resize-none outline-none text-left p-2",
    newOverlay: {
      container: "absolute -top-8 left-1/2 transform -translate-x-1/2 bg-neutral-50/90 dark:bg-neutral-800/90 px-2 py-1 rounded-md shadow-sm",
      text: "text-sm text-neutral-600 dark:text-neutral-300 whitespace-nowrap"
    },
    sidePanel: {
      container: "bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded border border-neutral-200 dark:border-neutral-700",
      group: "flex items-center gap-1.5",
      checkbox: "w-3 h-3 cursor-pointer",
      label: "text-xs text-neutral-700 dark:text-neutral-200 cursor-pointer whitespace-nowrap"
    }
  },
  drawer: {
    base: "fixed bg-neutral-50 dark:bg-neutral-900 shadow-lg transition-transform duration-300 ease-in-out z-40 w-80 flex flex-col",
    header: {
      base: "px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900",
      title: "font-medium text-neutral-700 dark:text-neutral-200",
      close: "p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
    },
    content: "flex-1 overflow-y-auto",
    border: {
      left: "border-l border-neutral-200 dark:border-neutral-700",
      right: "border-r border-neutral-200 dark:border-neutral-700"
    }
  },
  textArea: {
    base: "w-full h-full resize-none outline-none text-left p-2",
    sticky: "w-full h-full resize-none outline-none text-left p-2 text-neutral-800", // Always dark text
    default: "w-full h-full resize-none outline-none text-left p-2 text-neutral-800 dark:text-neutral-100" // Respects dark mode
  },
  zoomControl: {
    container: "flex items-center gap-1 bg-neutral-50 dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-700 px-2 py-1 shadow-sm",
    button: "hover:bg-neutral-100 dark:hover:bg-neutral-800 p-1 rounded-md text-neutral-600 dark:text-neutral-300",
    input: "w-7 text-xs text-neutral-600 dark:text-neutral-300 border-none focus:outline-none focus:ring-0 bg-transparent text-right px-0"
  },
  dropdown: {
    button: "flex items-center gap-1 px-2 h-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm cursor-pointer text-neutral-600 dark:text-neutral-300",
    menu: "absolute left-0 top-full mt-1 w-36 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-lg py-1",
    item: "w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center gap-2",
    submenu: "absolute left-full top-0 w-36 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-lg py-1 -ml-1",
    icon: "w-3 h-3 text-neutral-500 dark:text-neutral-400",
    deleteButton: "w-full px-3 py-1.5 text-xs text-left text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center gap-2",
    deleteIcon: "w-3 h-3 text-red-500 dark:text-red-400"
  },
};


export type Theme = typeof theme;