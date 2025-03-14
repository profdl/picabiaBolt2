import { Shape } from "../../../types";
import { ProcessedShape } from "./ProcessedShape";

interface EdgeShapeProps {
  shape: Shape;
}

export const EdgeShape: React.FC<EdgeShapeProps> = ({ shape }) => {
  return <ProcessedShape shape={shape} type="edge" />;
}; 