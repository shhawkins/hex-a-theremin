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
  const sensitivity = 5;

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
        setStartY(e.clientY);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const rotation = -135 + (currentIndex / (options.length - 1)) * 270;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {label && <span className="text-[9px] uppercase text-gray-400 tracking-[0.2em] font-medium text-glow-sm">{label}</span>}
      <div
        className={clsx(
          "relative rounded-full border border-white/10 bg-black/40 flex items-center justify-center cursor-ns-resize group transition-all",
          isDragging ? "border-hex-accent/50 bg-black/60 shadow-[0_0_15px_rgba(0,242,255,0.2)]" : "hover:border-white/30"
        )}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >

        {/* Ticks - Elegant */}
        {options.map((_, i) => {
          const rot = -135 + (i / (options.length - 1)) * 270;
          const isSelected = i === currentIndex;
          return (
            <div
              key={i}
              className={clsx(
                "absolute w-px origin-bottom transition-all duration-300",
                isSelected ? "bg-hex-accent h-2.5 bottom-[50%] translate-y-[-14px] shadow-[0_0_4px_#00f2ff]" : "bg-white/10 h-1.5 bottom-[50%] translate-y-[-14px]"
              )}
              style={{
                left: 'calc(50% - 0.5px)',
                transform: `rotate(${rot}deg) translateY(-${size / 2 - 12}px)`
              }}
            />
          );
        })}

        {/* Knob Marker - Illuminated */}
        <div
          className="absolute w-full h-full rounded-full transition-transform duration-100 ease-out flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className={clsx(
              "absolute top-1.5 w-1.5 h-3.5 rounded-full transition-colors shadow-[0_0_8px_currentColor]",
              isDragging ? "bg-hex-accent text-hex-accent" : "bg-white/90 text-white"
            )}
          />
        </div>

        {/* Center Value Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[10px] items-center justify-center font-bold text-gray-200 font-mono z-10 transition-colors group-hover:text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
};
