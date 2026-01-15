import React, { useState } from 'react';
import { clsx } from 'clsx';

interface RotaryDialProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
  size?: number;
}

export const RotaryDial: React.FC<RotaryDialProps> = ({ value, options, onChange, label, size = 60 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const currentIndex = options.indexOf(value);
  const sensitivity = 5; // Pixels per step

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY;
    if (Math.abs(deltaY) > sensitivity) {
      const steps = Math.round(deltaY / sensitivity);
      let newIndex = currentIndex + steps;
      newIndex = Math.max(0, Math.min(newIndex, options.length - 1));
      
      if (newIndex !== currentIndex) {
        onChange(options[newIndex]);
        setStartY(e.clientY); // Reset reference to avoid jumpiness
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Calculate rotation: Map index to -135deg to +135deg
  const rotation = -135 + (currentIndex / (options.length - 1)) * 270;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      {label && <span className="text-[9px] uppercase text-hex-text-dim tracking-wider">{label}</span>}
      <div 
        className="relative rounded-full border border-hex-border bg-hex-panel shadow-lg flex items-center justify-center cursor-ns-resize group"
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Active Ring */}
        <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
            <circle 
                cx={size/2} cy={size/2} r={size/2 - 4} 
                fill="none" stroke="#333" strokeWidth="2" 
            />
             {/* Dynamic Arc could go here but standard rotation is easier for knob feel */}
        </svg>

        {/* Knob Marker */}
        <div 
            className="absolute w-1 h-3 bg-hex-accent rounded-full origin-bottom"
            style={{ 
                bottom: '50%', 
                left: 'calc(50% - 2px)',
                transform: `rotate(${rotation}deg) translateY(-${size/2 - 10}px)` 
            }} 
        />
        
        {/* Center Value Display */}
        <div className="text-xs font-bold text-hex-text pointer-events-none z-10">
            {value}
        </div>
        
        {/* Glow effect on hover/drag */}
        <div className={clsx("absolute inset-0 rounded-full transition-opacity pointer-events-none", isDragging ? "opacity-30 bg-hex-accent blur-md" : "opacity-0 group-hover:opacity-10")} />
      </div>
    </div>
  );
};
