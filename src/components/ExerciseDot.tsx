interface ExerciseDotProps {
  x: number;
  y: number;
}

export function ExerciseDot({ x, y }: ExerciseDotProps) {
  return (
    <div
      className="absolute transition-all duration-75 ease-linear w-5 h-5 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        aspectRatio: '1 / 1',
      }}
    />
  );
}
