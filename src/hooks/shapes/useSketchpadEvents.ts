
interface UseSketchpadEventsProps {
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUpOrLeave: () => void;
}

export function useSketchpadEvents({
  handlePointerDown,
  handlePointerMove,
  handlePointerUpOrLeave
}: UseSketchpadEventsProps) {
  const handleSketchpadPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (handlePointerDown) {
      handlePointerDown(e);
    }
  };

  const handleSketchpadPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (handlePointerMove) {
      handlePointerMove(e);
    }
  };

  const handleSketchpadPointerUpOrLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (handlePointerUpOrLeave) {
      handlePointerUpOrLeave();
    }
  };

  return {
    handleSketchpadPointerDown,
    handleSketchpadPointerMove,
    handleSketchpadPointerUpOrLeave
  };
}