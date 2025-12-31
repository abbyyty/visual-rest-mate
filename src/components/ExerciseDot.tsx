interface ExerciseDotProps {
  x: number;
  y: number;
}

export function ExerciseDot({ x, y }: ExerciseDotProps) {
  return (
    <div
      className="exercise-dot absolute transition-all duration-75 ease-linear"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}
