interface ExerciseDotProps {
  x: number;
  y: number;
  size: number;
}

export function ExerciseDot({ x, y, size }: ExerciseDotProps) {
  return (
    <div
      className="absolute transition-all duration-75 ease-linear bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
}