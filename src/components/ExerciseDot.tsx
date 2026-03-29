interface ExerciseDotProps {
  x: number;
  y: number;
  size: number;
  brightness?: number; // 0-1 opacity
}

export function ExerciseDot({ x, y, size, brightness = 0.7 }: ExerciseDotProps) {
  return (
    <div
      className="absolute transition-all duration-75 ease-linear bg-white rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`,
        opacity: brightness,
        boxShadow: `0 0 ${20 * brightness}px rgba(255,255,255,${brightness * 0.8})`,
      }}
    />
  );
}
