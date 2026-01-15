import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';

interface WaveformVisualizerProps {
  analyzer: Tone.Waveform;
  width: number;
  height: number;
  color: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ analyzer, width, height, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const values = analyzer.getValue();
      ctx.clearRect(0, 0, width, height);
      
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      
      // Add glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      
      const sliceWidth = width / values.length;
      let x = 0;
      
      for (let i = 0; i < values.length; i++) {
        const v = values[i] as number; 
        const y = (v + 1) / 2 * height;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [analyzer, width, height, color]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg" />;
};