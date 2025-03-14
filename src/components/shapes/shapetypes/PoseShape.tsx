import { Shape } from "../../../types";
import { ProcessedShape } from "./ProcessedShape";

interface PoseShapeProps {
  shape: Shape;
}

export const PoseShape: React.FC<PoseShapeProps> = ({ shape }) => {
  return <ProcessedShape shape={shape} type="pose" />;
}; 