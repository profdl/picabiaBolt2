import { useEffect } from "react";
import { Shape } from "../../types";
import { useStore } from "../../store";

interface SketchpadShapeProps {
  shape: Shape & { assetId?: string };
  sketchPadRef: React.RefObject<HTMLCanvasElement>;
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUpOrLeave: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handleContextMenu: (e: React.MouseEvent) => void;
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
  uploadCanvasToSupabase: (canvas: HTMLCanvasElement) => Promise<string | null>;
  onClear: () => void;
}
export const SketchpadShape: React.FC<SketchpadShapeProps> = ({
  shape,
  sketchPadRef,
  handlePointerDown,
  handlePointerMove,
  handlePointerUpOrLeave,
  handleContextMenu,
  tool,
}) => {
  const { addShape, deleteShape, setTool } = useStore();
  const { updateShape } = useStore();

  useEffect(() => {
    const handleClear = () => {
      if (sketchPadRef.current) {
        // Clear the main canvas
        const ctx = sketchPadRef.current.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, 512, 512);

          // Reset the stroke canvas in BrushTool
          const strokeCanvas = document.querySelector(
            '[data-shape-id="' + shape.id + '"]'
          ) as HTMLCanvasElement | null;
          if (strokeCanvas) {
            const strokeCtx = strokeCanvas.getContext("2d");
            if (strokeCtx) {
              strokeCtx.fillStyle = "#000000";
              strokeCtx.fillRect(0, 0, 512, 512);
            }
          }

          // Save the cleared state immediately
          const canvasData = sketchPadRef.current.toDataURL("image/png");
          updateShape(shape.id, { canvasData });
        }
      }
    };
    updateShape(shape.id, { onClear: handleClear });
  }, [shape.id, updateShape, sketchPadRef]);

  useEffect(() => {
    if (sketchPadRef.current && shape.canvasData) {
      const canvas = sketchPadRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
      };
      img.src = shape.canvasData;
    }
  }, [shape.canvasData, sketchPadRef]);

  return (
    <>
      <div className="absolute -top-6 left-0 text-sm text-gray-300 font-medium">
        SketchPad
      </div>
      <canvas
        ref={sketchPadRef}
        data-shape-id={shape.id}
        width={512}
        height={512}
        className="w-full h-full touch-none"
        onContextMenu={handleContextMenu}
        style={{
          pointerEvents: tool === "select" ? "none" : "all",
          backgroundColor: "#000000",
          touchAction: "none",
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointerDown(e);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handlePointerMove(e);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.releasePointerCapture(e.pointerId);
          handlePointerUpOrLeave(e);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          handlePointerUpOrLeave(e);
        }}
        onPointerCancel={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          handlePointerUpOrLeave(e);
        }}
      />
      {tool === "brush" && (
        <button
          className="absolute -bottom-6 right-0 text-xs px-1.5 py-0.5 bg-gray-300 text-gray-800 rounded hover:bg-red-600 transition-colors"
          style={{ pointerEvents: "all" }}
          onClick={(e) => {
            e.stopPropagation();
            // Create new shape with fresh canvas state
            const newId = Math.random().toString(36).substr(2, 9);
            const newShape = {
              id: newId,
              type: "sketchpad",
              position: shape.position,
              width: shape.width,
              height: shape.height,
              color: "#ffffff",
              rotation: shape.rotation,
              locked: true,
              isUploading: false,
              isEditing: false,
              model: "",
              useSettings: false,
              depthStrength: 0.25,
              edgesStrength: 0.25,
              contentStrength: 0.25,
              poseStrength: 0.25,
              sketchStrength: 0.25,
              remixStrength: 0.25,
              canvasData: null, // Ensure we start with a fresh canvas
            };

            // Delete old shape first to clean up associated canvases
            deleteShape(shape.id);
            // Add new shape and set tool
            addShape(newShape);
            setTool("brush");
          }}
        >
          Clear
        </button>
      )}
    </>
  );
};
