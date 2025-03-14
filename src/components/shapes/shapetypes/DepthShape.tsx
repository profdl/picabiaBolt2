import { Shape } from "../../../types";
import { ProcessedShape } from "./ProcessedShape";

interface DepthShapeProps {
  shape: Shape;
}

export const DepthShape: React.FC<DepthShapeProps> = ({ shape }) => {
  return <ProcessedShape shape={shape} type="depth" />;
}; 