import React, { useRef, useEffect, useState, useMemo } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { getHexagonVertices, isPointInHexagon, getDistancesToSides, type Point, SQRT3 } from '../utils/geometry';
import * as Tone from 'tone';

interface HexagonInstrumentProps {
  engine: AudioEngine;
  width: number;
  height: number;
  effectBadgePos: Point;
  setEffectBadgePos: (p: Point) => void;
  colors: string[];
  ghostNotesEnabled: boolean;
  octaveRange: number; // Passed prop
  onNoteActive: (color: string) => void; // Callback for waveform color
}

interface Trail {
  id: number;
  points: { x: number; y: number; age: number; width: number; color: string }[];
  lastX: number;
  lastY: number;
}

export const HexagonInstrument: React.FC<HexagonInstrumentProps> = ({
  engine,
  width,
  height,
  effectBadgePos,
  setEffectBadgePos,
  colors,
  ghostNotesEnabled,
  octaveRange,
  onNoteActive
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTouches, setActiveTouches] = useState<Map<number, Point>>(new Map());
  const trailsRef = useRef<Map<number, Trail>>(new Map());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const activeBadgePointer = useRef<number | null>(null);

  // Geometry
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.45; 
  const vertices = useMemo(() => getHexagonVertices({ x: centerX, y: centerY }, radius), [centerX, centerY, radius]);

  // Color Helper
  const getColorForPosition = (angleRad: number) => {
      // Map angle to Hue (0-360)
      const deg = (angleRad * 180 / Math.PI + 360) % 360;
      return `hsl(${deg}, 100%, 60%)`;
  };

  const recordTouchIfActive = (x: number, y: number, id: number, color: string) => {
      engine.tracks.forEach((track, idx) => {
          if (track.isRecording) {
              engine.recordTouchEvent(idx, x, y, id, color);
          }
      });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = { x, y };

    const badgeDist = Math.sqrt(Math.pow(x - effectBadgePos.x, 2) + Math.pow(y - effectBadgePos.y, 2));
    if (badgeDist < 30) {
      (e.target as Element).setPointerCapture(e.pointerId);
      activeBadgePointer.current = e.pointerId;
      return;
    }

    if (isPointInHexagon(p, vertices)) {
      (e.target as Element).setPointerCapture(e.pointerId);
      updateNoteFromPosition(e.pointerId, x, y);
      setActiveTouches(prev => new Map(prev).set(e.pointerId, p));
      
      const angle = Math.atan2(y - centerY, x - centerX);
      const color = getColorForPosition(angle);
      
      recordTouchIfActive(x, y, e.pointerId, color);
      onNoteActive(color);
      
      trailsRef.current.set(e.pointerId, { 
          id: e.pointerId, 
          points: [], 
          lastX: x, lastY: y 
      });
    }
  };


  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeBadgePointer.current === e.pointerId) {
      if (isPointInHexagon({x, y}, vertices)) {
          setEffectBadgePos({ x, y });
          updateEffectsFromBadge({ x, y });
      }
      return;
    }

    if (activeTouches.has(e.pointerId)) {
      updateNoteFromPosition(e.pointerId, x, y);
      setActiveTouches(prev => new Map(prev).set(e.pointerId, { x, y }));
      
      const angle = Math.atan2(y - centerY, x - centerX);
      const color = getColorForPosition(angle);
      
      recordTouchIfActive(x, y, e.pointerId, color);
      onNoteActive(color);

      // Trail Logic
      const trail = trailsRef.current.get(e.pointerId);
      if (trail) {
          const dist = Math.sqrt(Math.pow(x - trail.lastX, 2) + Math.pow(y - trail.lastY, 2));
          // Speed -> Width (faster = thinner? or thicker? "scales proportionally" -> Faster = Thicker/Longer?)
          // Usually fast = thinner/streaky or thicker/impactful? Let's go thicker with speed up to a limit.
          const width = Math.min(10, 2 + dist / 2);
          
          trail.points.push({ x, y, age: 1.0, width, color });
          trail.lastX = x;
          trail.lastY = y;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeBadgePointer.current === e.pointerId) {
      activeBadgePointer.current = null;
      return;
    }

    if (activeTouches.has(e.pointerId)) {
      engine.stopNote(e.pointerId);
      setActiveTouches(prev => {
        const next = new Map(prev);
        next.delete(e.pointerId);
        return next;
      });
    }
  };

  const updateNoteFromPosition = (id: number, x: number, y: number) => {
    const minX = centerX - radius;
    const maxX = centerX + radius;
    const minY = centerY - radius * SQRT3/2; 
    const maxY = centerY + radius * SQRT3/2;
    
    let normX = (x - minX) / (maxX - minX);
    let normY = 1 - ((y - minY) / (maxY - minY)); 
    
    const minNote = engine.rootFreq * Math.pow(2, 0); 
    const maxNote = engine.rootFreq * Math.pow(2, octaveRange);
    
    const freq = minNote * Math.pow(maxNote / minNote, normX);
    const vol = Math.max(0, Math.min(1, normY));

    engine.startNote(id, freq, vol);
  };

  const updateEffectsFromBadge = (pos: Point) => {
    const dists = getDistancesToSides(pos, vertices);
    const maxDist = radius; 
    
    dists.forEach((d, i) => {
       const strength = Math.max(0, 1 - (d / maxDist));
       engine.updateEffectParameter(i, strength);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Hexagon Background
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Draw Sides with Colors
      vertices.forEach((v, i) => {
        const nextV = vertices[(i + 1) % 6];
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(nextV.x, nextV.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = colors[i] || '#fff';
        ctx.stroke();
      });

      // Draw Grid - Subdivide based on octaveRange (horizontal)
      // We want roughly 12 * octaveRange notches
      const totalNotes = 12 * octaveRange;
      const notchCount = totalNotes; // Can be dense
      
      // Draw Root Note indicators (every 12)
      ctx.globalAlpha = 0.2;
      const hexWidth = radius * 2;
      const leftX = centerX - radius;
      
      for(let i=0; i<=notchCount; i++) {
          const x = leftX + (i/notchCount) * hexWidth;
          // Check if this is a Root Note (C)
          const isRoot = i % 12 === 0;
          
          if (x >= leftX && x <= leftX + hexWidth) {
              ctx.beginPath();
              // Clip to hexagon? Simplified: Draw vertical line segment constrained by height?
              // Just draw full height within bounding box, opacity handles subtlety
              ctx.moveTo(x, centerY - radius * SQRT3/2);
              ctx.lineTo(x, centerY + radius * SQRT3/2);
              
              if (isRoot) {
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 2;
                  ctx.globalAlpha = 0.4;
              } else {
                  ctx.strokeStyle = '#555';
                  ctx.lineWidth = 1;
                  ctx.globalAlpha = 0.1;
              }
              ctx.stroke();
          }
      }
      ctx.globalAlpha = 1;

      // Draw Ghost Notes
      if (ghostNotesEnabled && engine.masterLoopDuration) {
          const transportTime = Tone.Transport.seconds % engine.masterLoopDuration;
          
          engine.tracks.forEach(track => {
              if (track.isPlaying && track.ghostEvents.length > 0) {
                  track.ghostEvents.forEach(e => {
                      // Check if time matches current transport time window
                      const diff = Math.abs(e.time - transportTime);
                      const wrapDiff = Math.abs(engine.masterLoopDuration! - diff);
                      const threshold = 0.15; // 150ms window
                      
                      if (diff < threshold || wrapDiff < threshold) {
                          ctx.beginPath();
                          ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
                          ctx.fillStyle = e.color || track.color;
                          ctx.shadowBlur = 10;
                          ctx.shadowColor = e.color || track.color;
                          ctx.fill();
                          ctx.shadowBlur = 0;
                      }
                  });
              }
          });
      }

      // Draw Trails
      trailsRef.current.forEach((trail, id) => {
        // Draw connected segments
        if (trail.points.length > 1) {
            for (let i = 1; i < trail.points.length; i++) {
                const p1 = trail.points[i-1];
                const p2 = trail.points[i];
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = p2.color;
                ctx.lineWidth = p2.width * p2.age;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }

        trail.points.forEach(p => p.age -= 0.04);
        trail.points = trail.points.filter(p => p.age > 0);
        
        if (!activeTouches.has(id) && trail.points.length === 0) {
            trailsRef.current.delete(id);
        }
      });

      // Draw Active Touches
      activeTouches.forEach((p) => {
          const angle = Math.atan2(p.y - centerY, p.x - centerX);
          const color = getColorForPosition(angle);
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.8;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.globalAlpha = 1;
      });

      // Draw Badge
      ctx.beginPath();
      ctx.arc(effectBadgePos.x, effectBadgePos.y, 12, 0, Math.PI * 2);
      
      // Badge Color based on position (Angle)
      const badgeAngle = Math.atan2(effectBadgePos.y - centerY, effectBadgePos.x - centerX);
      ctx.fillStyle = getColorForPosition(badgeAngle);
      ctx.fill();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Badge Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current !== undefined) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [width, height, vertices, activeTouches, effectBadgePos, colors, ghostNotesEnabled, octaveRange]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="touch-none cursor-crosshair"
      style={{ width, height }}
    />
  );
};