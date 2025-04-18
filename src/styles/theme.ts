export const theme = {
  forms: {
    checkbox: `form-checkbox 
      w-3 h-3 rounded 
      border-neutral-300 dark:border-[#000000]
      text-blue-600 dark:text-blue-500
      bg-white dark:bg-[#a3a3a3]
      focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500
      focus:ring-offset-0
      checked:bg-blue-600 dark:checked:bg-blue-500
      checked:hover:bg-blue-700 dark:checked:hover:bg-blue-600
      transition-colors`
  },
  nav: {
    base: "bg-neutral-50 dark:bg-[#1e1e1e] shadow z-50 relative",
    container: "mx-auto px-4 sm:px-6 lg:px-8 w-full",
    header: "flex justify-between w-full h-16",
    logo: "text-xl font-bold text-neutral-900 dark:text-white",
    menuButton: "p-2 hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] rounded-lg",
  
    dropdown: {
      container: "absolute left-0 mt-0 w-48 rounded-md shadow-lg bg-neutral-50 dark:bg-[#2c2c2c] ring-1 ring-neutral-900/5 ring-opacity-5 z-50",
      item: "block px-4 py-2 text-sm text-neutral-700 dark:text-[#999999] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e]"
    },
    projectName: {
      input: "px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:bg-[#2c2c2c] dark:text-white",
      button: "text-sm text-neutral-600 dark:text-[#999999] hover:text-neutral-900 dark:hover:text-white"
    },
    auth: {
      signOut: "px-4 py-2 text-neutral-600 dark:text-[#999999] hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] rounded-md text-sm font-medium",
      login: "text-neutral-600 dark:text-[#999999] hover:text-neutral-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium",
      signUp: "bg-neutral-800 text-neutral-50 hover:bg-neutral-900 px-4 py-2 rounded-md text-sm font-medium dark:bg-[#0d99ff] dark:hover:bg-[#0b87e3]"
    }
  },
  toolbar: {
    container: "absolute bottom-0 left-0 right-0 bg-neutral-50 dark:bg-[#2c2c2c] shadow-lg px-4 py-2 border-t border-neutral-200 dark:border-[#404040]",
    button: {
      base: "p-2 rounded-lg transition-colors duration-200",
      active: "bg-neutral-100 dark:bg-[#3e3e3e]",
      primary: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#0d99ff] dark:hover:bg-[#0b87e3] dark:text-white font-medium shadow-sm",
      ghost: "hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] text-neutral-600 dark:text-[#999999]"
    },
    controls: {
      container: "flex flex-col gap-1",
      label: "text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase",
      input: "w-full dark:bg-[#2c2c2c] dark:text-white",
      slider: "mini-slider", 
    }
  },
  canvas: {
    container: "w-full h-full overflow-hidden bg-neutral-50 dark:bg-[#121212] relative",
    grid: {
      major: "stroke-neutral-200/40 dark:stroke-[#404040]/20",
      minor: "stroke-neutral-100/30 dark:stroke-[#404040]/10"
    }
  },
  contextMenu: {
    container: {
        light: 'bg-white border border-gray-200',
        dark: 'bg-[#1f1f1f] border border-neutral-700'
    },
    item: {
        light: 'text-neutral-700 hover:bg-gray-100',
        dark: 'text-neutral-200 hover:bg-neutral-700'
    },
    itemHover: {
        light: 'bg-gray-100',
        dark: 'bg-neutral-700'
    }
},
  button: {
    base: "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:pointer-events-none disabled:opacity-50",
    variant: {
      default: "bg-neutral-800 text-neutral-50 hover:bg-neutral-900 dark:bg-[#2c2c2c] dark:hover:bg-[#3e3e3e]",
      outline: "border border-neutral-200 dark:border-[#404040] bg-neutral-50 dark:bg-[#2c2c2c] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] text-neutral-700 dark:text-[#999999]",
      ghost: "hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] text-neutral-700 dark:text-[#999999]",
      link: "text-neutral-600 dark:text-[#999999] underline-offset-4 hover:underline",
      primary: "bg-neutral-800 dark:bg-[#0d99ff] hover:bg-neutral-900 dark:hover:bg-[#0b87e3] text-neutral-50"
    },
    size: {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-10 px-8"
    },
    toolbar: {
      base: "p-2 rounded-lg inline-flex items-center justify-center gap-1",
      default: "text-neutral-700 dark:text-[#999999] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e]",
      active: "bg-neutral-200 dark:bg-[#3e3e3e]",
      label: "text-sm font-medium leading-none"
    }
  },
  shape: {
    base: "transition-shadow hover:shadow-xl relative",
    selected: "ring-2 ring-neutral-500 dark:ring-[#0d99ff]",
    selectedWithToggle: "ring-2 ring-emerald-500 dark:ring-[#80dbbd]",
    container: "absolute inset-0 bg-transparent",
    diffusionPanel: "bg-neutral-200 dark:bg-[#262626]",
    edge: {
      container: "relative w-full h-full bg-transparent",
      image: "absolute w-full h-full object-cover"
    },
    depth: {
      container: "relative w-full h-full bg-transparent",
      image: "absolute w-full h-full object-cover"
    },
    pose: {
      container: "relative w-full h-full bg-transparent",
      image: "absolute w-full h-full object-cover"
    },
    controls: {
      panel: "absolute -top-8 left-0 flex items-center gap-1 bg-white dark:bg-[#2c2c2c] rounded-md shadow-sm p-1",
      panelMod: "absolute -top-8 right-0 flex items-center gap-1 bg-white dark:bg-[#2c2c2c] rounded-md shadow-sm p-1",
      group: "text-neutral-600 dark:text-[#999999] hover:text-neutral-900 dark:hover:text-white",
      groupHover: "bg-neutral-100 dark:bg-[#3e3e3e]",
      checkbox: "forms.checkbox",
      label: "text-xs text-neutral-700 dark:text-[#999999] whitespace-nowrap",
      slider: "mini-slider",
      tooltip: "bg-neutral-500 dark:bg-[#2c2c2c] text-neutral-50 dark:text-white px-2 py-1 rounded text-xs shadow-sm",
      button: "p-2 bg-neutral-50 dark:bg-[#2c2c2c] border border-neutral-200 dark:border-[#404040] rounded-lg hover:bg-neutral-100 dark:hover:bg-[#3e3e3e]",
      buttonActive: "bg-neutral-100 dark:bg-[#3e3e3e] border-neutral-500 dark:border-[#0d99ff]",
    },
    resizeHandle: "absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-neutral-50 dark:bg-[#2c2c2c] border border-neutral-500 dark:border-[#0d99ff] rounded-full cursor-se-resize",
    colorPicker: "absolute -left-6 top-1/2 w-4 h-4 cursor-pointer transform -translate-y-1/2",
    textArea: "w-full h-full bg-transparent resize-none outline-none text-left p-2",
    newOverlay: {
      container: "absolute -top-8 left-1/2 transform -translate-x-1/2 bg-neutral-50/90 dark:bg-[#2c2c2c]/90 px-2 py-1 rounded-md shadow-sm",
      text: "text-sm text-neutral-600 dark:text-[#999999] whitespace-nowrap"
    },
    sidePanel: {
      container: "bg-neutral-50 dark:bg-[#2c2c2c] p-1.5 rounded border border-neutral-200 dark:border-[#404040]",
      group: "flex items-center gap-1.5",
      checkbox: "forms.checkbox",
            label: "text-xs text-neutral-700 dark:text-[#999999] cursor-pointer whitespace-nowrap"
    }
  },
  drawer: {
    base: "fixed bg-neutral-50 dark:bg-[#1e1e1e] shadow-lg transition-transform duration-300 ease-in-out z-40 w-80 flex flex-col",
    search: {
      container: "relative mb-3 flex-shrink-0",
      input: `w-full pl-9 pr-3 py-2 
        text-neutral-900 dark:text-white
        bg-white dark:bg-[#2c2c2c]
        border border-neutral-200 dark:border-[#404040]
        rounded-md
        placeholder-neutral-500 dark:placeholder-neutral-400
        focus:outline-none 
        focus:ring-2 
        focus:ring-blue-500 dark:focus:ring-[#0d99ff]
        focus:border-transparent
        transition-colors`,
      icon: "w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 transform -translate-y-1/2"
    },
    header: {
      base: "px-4 py-3 border-b border-neutral-200 dark:border-[#404040] flex justify-between items-center bg-neutral-50 dark:bg-[#1e1e1e]",
      title: "font-medium text-neutral-700 dark:text-white",
      close: "p-1 hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] rounded-lg"
    },
    content: "flex-1 overflow-y-auto",
    border: {
      left: "border-l border-neutral-200 dark:border-[#404040]",
      right: "border-r border-neutral-200 dark:border-[#404040]"
    }
  },
  tabs: {
    base: "w-full",
    list: {
      base: "flex border-b border-neutral-200 dark:border-[#404040]"
    },
    trigger: {
      base: "px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200",
      selected: "border-neutral-800 dark:border-white text-neutral-900 dark:text-white",
      default: "border-transparent text-neutral-500 dark:text-[#999999] hover:text-neutral-700 dark:hover:text-white hover:border-neutral-300 dark:hover:border-[#404040]"
    },
    content: {
      base: "mt-4"
    }
  },
  imageGrid: {
    loader: {
      container: "text-center py-8",
      spinner: "w-8 h-8 animate-spin mx-auto text-[#0d99ff]",
      text: "mt-2 text-neutral-600 dark:text-[#999999]"
    },
    empty: "text-center py-8 text-neutral-500 dark:text-[#999999]",
    grid: "grid grid-cols-2 gap-2 p-4",
    imageContainer: "relative aspect-square bg-neutral-50 dark:bg-[#2c2c2c] rounded-lg overflow-hidden",
    generating: {
      container: "absolute inset-0 flex items-center justify-center",
      text: "text-sm font-medium text-neutral-600 dark:text-[#999999]"
    },
    image: {
      group: "absolute inset-0 group"
    },
    button: {
      add: "absolute inset-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200",
      addText: "bg-neutral-900/75 dark:bg-[#2c2c2c]/90 text-neutral-50 dark:text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-900/90 dark:hover:bg-[#3e3e3e] whitespace-nowrap",
      group: "absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
      view: "p-2 bg-neutral-800/75 dark:bg-[#2c2c2c]/90 text-neutral-50 dark:text-white rounded-full hover:bg-neutral-900/90 dark:hover:bg-[#3e3e3e]",
      delete: "p-2 bg-red-500/90 text-neutral-50 rounded-full hover:bg-red-600/95"
    }
  },
  textArea: {
    base: "w-full h-full resize-none outline-none text-left p-2",
    sticky: "w-full h-full resize-none outline-none text-left p-2 text-neutral-800",
    default: "w-full h-full resize-none outline-none text-left p-2 text-neutral-800 dark:text-white"
  },
  zoomControl: {
    container: "flex items-center gap-1 bg-neutral-10 dark:bg-[#121212] rounded-md border border-neutral-100 dark:border-[#202020] px-2 py-1 shadow-sm",
    button: "hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] p-1 rounded-md text-neutral-600 dark:text-[#999999]",
    input: "w-7 text-xs text-neutral-600 dark:text-[#999999] border-none focus:outline-none focus:ring-0 bg-transparent text-right px-0"
  },
  dropdown: {
    button: "flex items-center gap-1 px-2 h-6 bg-neutral-50 dark:bg-[#2c2c2c] border border-neutral-200 dark:border-[#404040] rounded hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] shadow-sm cursor-pointer text-neutral-600 dark:text-[#999999]",
    menu: "absolute left-0 top-full mt-1 w-36 bg-neutral-50 dark:bg-[#2c2c2c] border border-neutral-200 dark:border-[#404040] rounded shadow-lg py-1",
    item: "w-full px-3 py-1.5 text-xs text-left text-neutral-700 dark:text-[#999999] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] cursor-pointer flex items-center gap-2",
    submenu: "absolute left-full top-0 w-36 bg-neutral-50 dark:bg-[#2c2c2c] border border-neutral-200 dark:border-[#404040] rounded shadow-lg py-1 -ml-1",
    icon: "w-3 h-3 text-neutral-500 dark:text-[#999999]",
    deleteButton: "w-full px-3 py-1.5 text-xs text-left text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] cursor-pointer flex items-center gap-2",
    deleteIcon: "w-3 h-3 text-red-500 dark:text-red-400"
  },
  dashboard: {
    page: "min-h-screen bg-neutral-50 dark:bg-[#121212]",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
    header: {
      container: "flex items-center gap-4 mb-8",
      button: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#0d99ff] hover:bg-[#0b87e3]" // Updated to be blue in both modes
    },
  
    emptyState: {
      container: "text-center py-12",
      title: "text-lg font-medium text-neutral-900 dark:text-white mb-2",
      text: "text-neutral-500 dark:text-[#999999]"
    },
    grid: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
    loading: {
      container: "flex items-center justify-center min-h-[calc(100vh-4rem)]",
      spinner: "animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white"
    },
    error: {
      container: "flex items-center justify-center min-h-[calc(100vh-4rem)]",
      text: "text-red-600 dark:text-red-400"
    }
  },
  projectCard: {
    container: "relative bg-neutral-50 dark:bg-[#2c2c2c] rounded-lg shadow-md hover:shadow-lg transition-shadow group border border-neutral-200 dark:border-[#404040]",
    preview: {
      container: "aspect-video bg-white rounded-t-lg flex items-center justify-center overflow-hidden",
      placeholder: {
        icon: "w-12 h-12 text-neutral-300",
        text: "text-sm text-neutral-400 mt-2"
      }
    },
    content: {
      container: "p-4 bg-neutral-100 dark:bg-[#2c2c2c] border-t border-neutral-200 dark:border-[#404040]",
      header: "flex items-center justify-between",
      title: "text-lg font-medium text-neutral-900 dark:text-white truncate flex-1",
      actions: "flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity",
      button: {
        base: "p-1 rounded",
        edit: "text-neutral-600 dark:text-[#999999] hover:bg-neutral-200 dark:hover:bg-[#3e3e3e]",
        delete: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
      },
      date: "mt-2 text-sm text-neutral-500 dark:text-[#999999]"
    }
  },
  imageDetailsModal: {
    overlay: 'bg-neutral-900/90 dark:bg-neutral-950/90',
    container: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
    header: {
      base: 'border-b border-neutral-200 dark:border-neutral-800',
      title: 'text-neutral-900 dark:text-neutral-50',
      closeButton: 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
    },
    imageContainer: 'bg-neutral-100 dark:bg-neutral-950',
    sidebar: {
      base: 'bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50',
      section: {
        title: 'text-neutral-600 dark:text-neutral-300',
        grid: {
          label: 'text-neutral-500 dark:text-neutral-400',
          value: 'text-neutral-700 dark:text-neutral-200'
        }
      },
      prompt: {
        text: 'text-neutral-700 dark:text-neutral-200',
        negative: 'text-neutral-500 dark:text-neutral-400'
      },
      thumbnail: {
        border: 'border-neutral-200 dark:border-neutral-800',
        label: 'text-neutral-500 dark:text-neutral-400'
      },
      meta: {
        text: 'text-neutral-500 dark:text-neutral-400',
        status: {
          completed: 'text-neutral-700 dark:text-neutral-200',
          generating: 'text-neutral-600 dark:text-neutral-300',
          failed: 'text-neutral-500 dark:text-neutral-400'
        }
      }
    },
    navigationButton: `
    bg-blue-500/70 hover:bg-blue-600/80 
    text-white
    backdrop-blur-sm
    rounded-lg
    transition-all
    duration-200
    shadow-lg
  `
  }


};

export type Theme = typeof theme;