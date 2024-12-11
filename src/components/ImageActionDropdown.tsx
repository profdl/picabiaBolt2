import {
  ChevronDown,
  Download,
  Crop,
  Eraser,
  ArrowDown,
  ArrowUp,
  MoveDown,
  MoveUp,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Shape } from "../types";

interface ImageActionDropdownProps {
  shape: Shape;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (isOpen: boolean) => void;
  onSelectSubject: (e: React.MouseEvent) => void;
  onCrop: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  sendForward: () => void;
  sendBackward: () => void;
  sendToFront: () => void;
  sendToBack: () => void;
  deleteShape: () => void;
}

export function ImageActionDropdown({
  isDropdownOpen,
  setIsDropdownOpen,
  onSelectSubject,
  onCrop,
  onDownload,
  sendForward,
  sendBackward,
  sendToFront,
  sendToBack,
  deleteShape,
}: ImageActionDropdownProps) {
  const [showArrangeMenu, setShowArrangeMenu] = useState(false);
  const handleAction = (action: (e: React.MouseEvent) => void) => {
    action(new MouseEvent("click") as unknown as React.MouseEvent);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 px-2 h-6 bg-white border border-gray-200 rounded hover:bg-gray-50 shadow-sm cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
      >
        <span className="text-xs text-gray-600">Edit Image</span>
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </button>

      {isDropdownOpen && (
        <div
          className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg py-1"
          style={{ zIndex: 1002 }}
        >
          <div
            className="relative w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
            onMouseEnter={() => setShowArrangeMenu(true)}
            onMouseLeave={() => setShowArrangeMenu(false)}
          >
            <span className="flex items-center gap-2">
              <MoveUp className="w-3 h-3 text-gray-500" />
              Arrange
            </span>
            <ChevronRight className="w-3 h-3 text-gray-500" />

            {showArrangeMenu && (
              <div className="absolute left-full top-0 w-36 bg-white border border-gray-200 rounded shadow-lg py-1 -ml-1">
                <button
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                  onClick={() => handleAction(sendForward)}
                >
                  <ArrowUp className="w-3 h-3 text-gray-500" />
                  Send Forward
                </button>
                <button
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                  onClick={() => handleAction(sendBackward)}
                >
                  <ArrowDown className="w-3 h-3 text-gray-500" />
                  Send Backward
                </button>
                <button
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                  onClick={() => handleAction(sendToFront)}
                >
                  <MoveUp className="w-3 h-3 text-gray-500" />
                  Send to Front
                </button>
                <button
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                  onClick={() => handleAction(sendToBack)}
                >
                  <MoveDown className="w-3 h-3 text-gray-500" />
                  Send to Back
                </button>
              </div>
            )}
          </div>

          <button
            className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
            onClick={() => handleAction(onSelectSubject)}
          >
            <Eraser className="w-3 h-3 text-gray-500" />
            Remove Background
          </button>
          <button
            className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
            onClick={() => handleAction(onCrop)}
          >
            <Crop className="w-3 h-3 text-gray-500" />
            Crop
          </button>
          <button
            className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
            onClick={() => handleAction(onDownload)}
          >
            <Download className="w-3 h-3 text-gray-500" />
            Download
          </button>
          <button
            className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
            onClick={() => handleAction(deleteShape)}
          >
            <Trash2 className="w-3 h-3 text-red-500" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
