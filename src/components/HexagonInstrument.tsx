import React, { useRef, useEffect, useState, useMemo } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { getHexagonVertices, isPointInHexagon, getDistancesToSides, type Point, SQRT3 } from '../utils/geometry';
import * as Tone from 'tone';

import { EFFECT_PARAMS, type EffectType } from '../audio/effects';
import { quantizeFrequency, getChordFrequencies, type ScaleType, type ChordType } from '../utils/music';
import type { RegionType } from './RegionSelector';

interface HexagonInstrumentProps {
  engine: AudioEngine;
  width: number;
  height: number;
  effectBadgePos: Point;
  setEffectBadgePos: (p: Point) => void;
  colors: string[];
  ghostNotesEnabled: boolean;
  octaveRange: number;
  paramModulations: Record<string, { x: boolean, y: boolean, xInv?: boolean, yInv?: boolean, p?: boolean }>;
  masterVolume: number;
  volMod: { x: boolean, y: boolean, xInv?: boolean, yInv?: boolean, p?: boolean };
  toneMod: { x: boolean, y: boolean, xInv?: boolean, yInv?: boolean, p?: boolean };
  toneBase: number;
  scaleType: ScaleType;
  chordType: ChordType;
  scaleRegion: RegionType;
  chordRegion: RegionType;
  arpRegion: RegionType;
  arpEnabled: boolean;
  onNoteActive: (color: string) => void;
  onModulationUpdate?: (factors: { vol: number, tone: number }) => void;
  onEffectSwap?: (index1: number, index2: number) => void;
  center?: { x: number, y: number };
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
  colors: propColors,
  ghostNotesEnabled,
  octaveRange,
  paramModulations,
  masterVolume,
  volMod,
  toneMod,
  toneBase,
  scaleType,
  chordType,
  scaleRegion = 'whole',
  chordRegion = 'whole',
  arpRegion = 'whole',
  arpEnabled = false,

  onNoteActive,
  onModulationUpdate,
  onEffectSwap,
  center
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* Refactored to store full pointer data for correct updates */
  const [activeTouches, setActiveTouches] = useState<Map<number, Point>>(new Map());
  const trailsRef = useRef<Map<number, Trail>>(new Map());
  // Animation state for swap feedback
  const swapAnimRef = useRef<{ vertexIdx: number, startTime: number } | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const activeBadgePointer = useRef<number | null>(null);

  // Geometry
  const centerX = center ? center.x : width / 2;
  const centerY = center ? center.y : height / 2;
  const radius = Math.min(width, height) * 0.42;
  const vertices = useMemo(() => getHexagonVertices({ x: centerX, y: centerY }, radius), [centerX, centerY, radius]);

  // Enhanced Color Theory Palette - "Beautiful Color Wheel"
  // Using HSL to create a seamless rainbow gradient around the hexagon
  const getSideColor = (index: number) => {
    // 6 sides = 60 degrees each.
    // 0: Cyan, 1: Blue, 2: Purple, 3: Pink, 4: Orange, 5: Yellow/Green?
    // Let's adjust for a classic spectral look
    const hues = [190, 260, 320, 10, 45, 120]; // Cyan, Purple, Magenta, Red, Orange, Green
    return `hsl(${hues[index]}, 100%, 60%)`;
  };

  const sideColors = useMemo(() => [0, 1, 2, 3, 4, 5].map(i => getSideColor(i)), []);

  const getColorForPosition = (angleRad: number) => {
    // Smooth gradient
    const deg = (angleRad * 180 / Math.PI + 360) % 360;
    return `hsl(${deg}, 100%, 65%)`; // Slightly brighter/more saturated
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

    // Vertex Tap Detection (for swapping effects)
    if (onEffectSwap) {
      const vertexThreshold = 25;
      const vertexIdx = vertices.findIndex(v => Math.sqrt(Math.pow(x - v.x, 2) + Math.pow(y - v.y, 2)) < vertexThreshold);

      if (vertexIdx !== -1) {
        // Vertex i connects side i-1 and side i (mod 6)
        // Vertices are usually generated starting from angle 0 or 30.
        // Let's assume vertex 0 is between side 5 and side 0.
        // Vertex 1 is between side 0 and side 1.
        // We trigger swap for the two adjacent sides.
        const sideA = (vertexIdx + 5) % 6; // Previous side
        const sideB = vertexIdx;           // Next side
        onEffectSwap(sideA, sideB);

        // Trigger Animation
        swapAnimRef.current = { vertexIdx, startTime: performance.now() };
        return;
      }
    }

    if (isPointInHexagon(p, vertices)) {
      (e.target as Element).setPointerCapture(e.pointerId);

      updateNoteFromPosition(e.pointerId, x, y, e.pressure, e.tiltX, e.tiltY, e.pointerType);
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
      if (isPointInHexagon({ x, y }, vertices)) {
        setEffectBadgePos({ x, y });
        updateEffectsFromBadge({ x, y });
      }
      return;
    }

    if (activeTouches.has(e.pointerId)) {
      updateNoteFromPosition(e.pointerId, x, y, e.pressure, e.tiltX, e.tiltY, e.pointerType);
      setActiveTouches(prev => new Map(prev).set(e.pointerId, { x, y }));

      const angle = Math.atan2(y - centerY, x - centerX);
      const color = getColorForPosition(angle);

      recordTouchIfActive(x, y, e.pointerId, color);
      onNoteActive(color);

      const trail = trailsRef.current.get(e.pointerId);
      if (trail) {
        trail.points.push({ x, y, age: 1.0, width: 2, color });
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

        if (next.size === 0 && onModulationUpdate) {
          onModulationUpdate({ vol: 1, tone: 1 });
        }
        return next;
      });
    }
  };

  const updateNoteFromPosition = (id: number, x: number, y: number, pressure: number = 0.5, tiltX: number = 0, tiltY: number = 0, pointerType: string = 'touch') => {
    const minX = centerX - radius;
    const maxX = centerX + radius;
    const minY = centerY - radius * SQRT3 / 2;
    const maxY = centerY + radius * SQRT3 / 2;

    let normX = (x - minX) / (maxX - minX);
    let normY = 1 - ((y - minY) / (maxY - minY));

    // Swap: X is Volume (Loudness), Y is Pitch (Up=High)
    const minNote = engine.rootFreq * Math.pow(2, 0);
    const maxNote = engine.rootFreq * Math.pow(2, octaveRange);

    // Pitch follows Y (Vertical) - Up (normY=1) is High Pitch
    let freq = minNote * Math.pow(maxNote / minNote, normY);

    // Region Logic
    // Top Half: normY > 0.5 (since normY 1 is Top)
    // Bottom Half: normY <= 0.5
    const isTop = normY > 0.5;

    // Scale Logic
    let effectiveScale = scaleType;
    if (scaleRegion === 'top' && !isTop) effectiveScale = 'chromatic';
    if (scaleRegion === 'bottom' && isTop) effectiveScale = 'chromatic';

    // Scale Quantization
    freq = quantizeFrequency(freq, engine.rootFreq, effectiveScale);

    // Chord Logic
    let effectiveChord = chordType;
    if (chordRegion === 'top' && !isTop) effectiveChord = 'off';
    if (chordRegion === 'bottom' && isTop) effectiveChord = 'off';

    // Chord Generation
    let freqs: number[] = [freq];
    if (effectiveChord !== 'off') {
      freqs = getChordFrequencies(freq, engine.rootFreq, effectiveScale, effectiveChord);
    }

    // Arp Logic
    let useArp = arpEnabled;
    if (arpRegion === 'top' && !isTop) useArp = false;
    if (arpRegion === 'bottom' && isTop) useArp = false;

    // Calculate Volume with Modulation
    let volFactor = 1.0;
    if (volMod.x || volMod.y || volMod.p) {
      let factors = [];
      if (volMod.x) {
        let val = Math.max(0, Math.min(1, normX));
        if (volMod.xInv) val = 1 - val;
        factors.push(val);
      }
      if (volMod.y) {
        let val = Math.max(0, Math.min(1, normY));
        if (volMod.yInv) val = 1 - val;
        factors.push(val);
      }
      if (volMod.p && pointerType === 'pen') {
        factors.push(pressure);
      }

      // Use average of enabled modulators, or 1.0 if none apply (e.g. p enabled but using finger)
      if (factors.length > 0) {
        const sum = factors.reduce((a, b) => a + b, 0);
        volFactor = sum / factors.length;
      }
    }

    // Apple Pencil Pressure Modulation


    const vol = masterVolume * volFactor; // Scale base volume by modulation

    // Calculate Tone with Modulation
    let toneFactor = 1.0;
    if (toneMod.x || toneMod.y || toneMod.p) {
      let factors = [];
      // Tone mod: X or Y maps 0..1 to modulation factor
      if (toneMod.x) {
        let val = Math.max(0, Math.min(1, normX));
        if (toneMod.xInv) val = 1 - val;
        factors.push(val);
      }
      if (toneMod.y) {
        let val = Math.max(0, Math.min(1, normY));
        if (toneMod.yInv) val = 1 - val;
        factors.push(val);
      }
      if (toneMod.p && pointerType === 'pen') {
        factors.push(pressure);
      }

      if (factors.length > 0) {
        const sum = factors.reduce((a, b) => a + b, 0);
        toneFactor = sum / factors.length;
      }
    }

    // Apple Pencil Tilt Modulation (Tilt affects Tone/Filter)
    if (pointerType === 'pen') {
      // Tilt is usually -90 to 90. Map to factor.
      // Let's use tiltX for simplicity or magnitude?
      // If pen is tilted down (low angle), sound is "duller" (lower freq)?
      // If pen is upright, sound is "brighter"?
      // Standard tilt is 0 when upright? No, 0 is often flat.
      // Let's try: Upright (0 tilt) = Bright. Flat = Dark.
      // Actually browser API: 0 is perpendicular to screen (upright). 90 is flat.
      // We'll map 0 (upright) -> 1.0, 90 (flat) -> 0.5
      const tiltMag = Math.sqrt(tiltX * tiltX + tiltY * tiltY); // roughly degree
      const tiltFactor = 1.0 - (Math.min(tiltMag, 90) / 180); // 0->1, 90->0.5
      toneFactor *= tiltFactor;
    }

    // Tone usually sets a filter frequency. 
    // If modulation is on, we scale the Base Tone.
    // If Base Tone is 1.0 (Open), and mod is 0.5, effective is 0.5.
    const finalTone = toneBase * toneFactor;

    if (onModulationUpdate) onModulationUpdate({ vol: volFactor, tone: toneFactor });

    engine.setTone(finalTone);
    engine.startNote(id, freqs, vol, useArp);

    // Apply Modulations
    // Loop through all 6 effect slots
    for (let i = 0; i < 6; i++) {
      const effect = engine.effects[i];
      if (!effect) continue;

      // 1. Check Mix/Wet Modulation
      const wetMod = paramModulations[`${i}:wet`];
      if (wetMod && (wetMod.x || wetMod.y || wetMod.p)) {
        let factors = [];
        if (wetMod.x) {
          let val = Math.max(0, Math.min(1, normX));
          if (wetMod.xInv) val = 1 - val;
          factors.push(val);
        }
        if (wetMod.y) {
          let val = Math.max(0, Math.min(1, normY));
          if (wetMod.yInv) val = 1 - val;
          factors.push(val);
        }
        if (wetMod.p && pointerType === 'pen') {
          factors.push(pressure);
        }

        // For effects, if factors is empty (e.g. finger with only P mod), strength should probably be 0 (no effect) or previous?
        // Actually for "Wet", usually we want 0 if not active?
        // Wait, if I enable P-mod for Wet, and I touch with finger, I expect... what?
        // If I use X/Y, I expect X/Y value.
        // If I use P, I expect Pressure.
        // If I use finger (no pressure mod), maybe I just want 0 (Dry)?
        // Or do I want "current knob value"?
        // engine.updateEffectParameter(i, strength) sets the value ABSOLUTELY.
        // If we send 0, it turns Dry.
        // If P is on, and I use finger, should it be Dry? Yes, presumably.

        const strength = factors.length > 0 ? factors.reduce((a, b) => a + b, 0) / factors.length : 0;
        engine.updateEffectParameter(i, strength);
      }

      // 2. Check Specific Parameters
      const typeName = effect.name.replace('Tone.', '') as EffectType;
      const params = EFFECT_PARAMS[typeName] || [];

      params.forEach((p) => {
        const pMod = paramModulations[`${i}:${p.key}`];
        if (pMod && (pMod.x || pMod.y || pMod.p)) {
          let factors = [];
          if (pMod.x) {
            let val = Math.max(0, Math.min(1, normX));
            if (pMod.xInv) val = 1 - val;
            factors.push(val);
          }
          if (pMod.y) {
            let val = Math.max(0, Math.min(1, normY));
            if (pMod.yInv) val = 1 - val;
            factors.push(val);
          }
          if (pMod.p && pointerType === 'pen') {
            factors.push(pressure);
          }

          // Map 0..1 to Min..Max
          const strength = factors.length > 0 ? factors.reduce((a, b) => a + b, 0) / factors.length : 0;
          const val = p.min + strength * (p.max - p.min);
          engine.setEffectParam(i, p.key, val);
        }
      });
    }
  };

  const updateEffectsFromBadge = (pos: Point) => {
    const dists = getDistancesToSides(pos, vertices);
    const maxDist = radius;

    dists.forEach((d, i) => {
      // Only update from badge if modulation is NOT active for this effect's MIX (Wet)
      const wetMod = paramModulations[`${i}:wet`];
      if (!wetMod || (!wetMod.x && !wetMod.y && !wetMod.p)) {
        const strength = Math.max(0, 1 - (d / maxDist));
        engine.updateEffectParameter(i, strength);
      }
    });
  };

  // NEW: Update active notes when modulations change (Multitasking Fix)
  useEffect(() => {
    activeTouches.forEach((pos, id) => {
      // For updates from React state (mod toggle), we don't have pressure/tilt.
      // We retain the last known position. Ideally we'd cache full event data.
      // For now, passing defaults is acceptable as this limits "hands-off" mod changes.
      updateNoteFromPosition(id, pos.x, pos.y);
    });
  }, [volMod, toneMod, paramModulations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 0. Background Gradient within Hexagon (Subtle)
      // This fills the hex with a very faint spectrum
      ctx.save();
      ctx.beginPath();
      vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.clip();
      // Draw a radial gradient? Or mesh? Let's keep it simple: faint radial
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0, 242, 255, 0.05)'); // Faint cyan glow at edges
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      // 1. Hexagon Frame (Glow restored)
      ctx.shadowBlur = 10; // Moderate glow
      ctx.shadowColor = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2. Active Sides (Vibrant)
      // Draw them with a bit of "neon light" aesthetic
      vertices.forEach((v, i) => {
        const nextV = vertices[(i + 1) % 6];
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(nextV.x, nextV.y);

        ctx.strokeStyle = sideColors[i];
        ctx.lineWidth = 3;

        // Bloom
        ctx.shadowBlur = 12;
        ctx.shadowColor = sideColors[i];
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // 3. Grid (Techy but clean) - HORIZONTAL for Pitch
      // Add semitone lines back, but cleaner
      const totalNotes = 12 * octaveRange;
      const notchCount = totalNotes;
      const hexHalfHeight = radius * SQRT3 / 2;
      const topY = centerY - hexHalfHeight;
      const bottomY = centerY + hexHalfHeight;
      const leftX = centerX - radius;
      const rightX = centerX + radius; // Fix: Defined rightX

      // Define grid height range matching the note range
      const gridHeight = bottomY - topY;

      ctx.save();
      // Clip to Hexagon so horizontal lines don't bleed
      ctx.beginPath();
      vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.clip();

      ctx.globalAlpha = 0.8;
      for (let i = 0; i <= notchCount; i++) {
        // Calculate Y for this pitch step
        // Pitch Low (i=0) -> BottomY
        // Pitch High (i=max) -> TopY
        const y = bottomY - (i / notchCount) * gridHeight;

        const isRoot = i % 12 === 0;

        if (isRoot) {
          // Root Note Line - Visible
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Semitone Lines - Faint
          // We draw full lines across and let the hexagon clip handle the edges
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Very faint
          ctx.lineWidth = 1;
          // dash?
          // ctx.setLineDash([2, 4]); // Optional: make them dashed
          ctx.stroke();
          // ctx.setLineDash([]);
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // 4. Ghost Notes (Luminous dots)
      if (ghostNotesEnabled && engine.masterLoopDuration) {
        const transportTime = Tone.Transport.seconds % engine.masterLoopDuration;

        engine.tracks.forEach(track => {
          if (track.isPlaying && track.ghostEvents.length > 0) {
            track.ghostEvents.forEach(e => {
              const diff = Math.abs(e.time - transportTime);
              const wrapDiff = Math.abs(engine.masterLoopDuration! - diff);
              const threshold = 0.15; // increased window for visibility

              if (diff < threshold || wrapDiff < threshold) {
                ctx.beginPath();
                ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = e.color || track.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = e.color || track.color;
                ctx.fill();

                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.arc(e.x, e.y, 10 + (Math.random() * 3), 0, Math.PI * 2);
                ctx.strokeStyle = e.color || track.color;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            });
          }
        });
      }

      // 5. Trails (Neon Lasers)
      ctx.lineCap = 'round';
      trailsRef.current.forEach((trail, id) => {
        if (trail.points.length > 1) {

          // Outer Glow
          ctx.beginPath();
          for (let i = 1; i < trail.points.length; i++) {
            const p1 = trail.points[i - 1];
            const p2 = trail.points[i];
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = 3;
            ctx.strokeStyle = p2.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p2.color;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;

          // Inner Core (White hot)
          ctx.beginPath();
          for (let i = 1; i < trail.points.length; i++) {
            const p1 = trail.points[i - 1];
            const p2 = trail.points[i];
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
          }
        }

        trail.points.forEach(p => p.age -= 0.05); // Slower decay for nicer trails
        trail.points = trail.points.filter(p => p.age > 0);

        if (!activeTouches.has(id) && trail.points.length === 0) {
          trailsRef.current.delete(id);
        }
      });

      // 6. Active Touches (Glowing Rings)
      activeTouches.forEach((p) => {
        const angle = Math.atan2(p.y - centerY, p.x - centerX);
        const color = getColorForPosition(angle);

        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });

      // 7. Badge (Defined Puck with color)
      ctx.beginPath();
      ctx.arc(effectBadgePos.x, effectBadgePos.y, 8, 0, Math.PI * 2);
      // Fill with dark hue of current position
      const badgeAngle = Math.atan2(effectBadgePos.y - centerY, effectBadgePos.x - centerX);
      const badgeColor = getColorForPosition(badgeAngle);
      ctx.fillStyle = '#111';
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = badgeColor;
      ctx.shadowBlur = 15;
      ctx.shadowColor = badgeColor;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center dot
      ctx.beginPath();
      ctx.arc(effectBadgePos.x, effectBadgePos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Connector line (very faint laser)
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(effectBadgePos.x, effectBadgePos.y);
      ctx.strokeStyle = badgeColor;
      ctx.stroke();
      ctx.strokeStyle = badgeColor;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 8. Swap Animation (Arrow)
      if (swapAnimRef.current) {
        const { vertexIdx, startTime } = swapAnimRef.current;
        const elapsed = performance.now() - startTime;
        const duration = 400;

        if (elapsed < duration) {
          const v = vertices[vertexIdx];
          // Angle of vertex from center
          const angle = Math.atan2(v.y - centerY, v.x - centerX);

          // Draw arc around vertex
          // We want it to look like it's swapping the adjacent sides.
          // Radius 30px
          const arcRadius = 32;
          const progress = elapsed / duration;
          // Ease out
          const ease = 1 - Math.pow(1 - progress, 3);

          ctx.save();
          ctx.translate(v.x, v.y);
          ctx.rotate(angle); // Align with vertex direction

          // Draw curved arrow
          // We want an arc perpendicular to the radius (angle 0 in this rotated context)
          // So roughly from -PI/2 to +PI/2?
          // Let's do a shorter arc: -PI/3 to +PI/3
          // Animate stroke drawing? or just fade?
          // "Brief, subtle". Let's do a static shape fading out, maybe expanding slightly.

          const alpha = 1 - ease;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';

          // Draw Arc
          ctx.beginPath();
          // Start at bottom (-PI/2.5) go to top (+PI/2.5) relative to vertex outward normal (which is 0)
          // Actually, we want it "inside" the hex or "outside"? 
          // Vertex connects sides. The arrow should wrap around the corner.
          // Let's draw it "inside" (towards center) because outside might be clipped by container?
          // No, user drawing was outside. 
          // Let's try centered on vertex.

          // To make it look like a swap, maybe double headed arrow?
          // Or just a swipe.
          // Let's draw an arc from -130deg to +130deg (away from center)
          // Start: Math.PI * 0.8
          // End: Math.PI * 1.2? (This is the "back" of the vertex)
          // No, the vertex points OUT. 0 is OUT.
          // So the "sides" angle range is roughly +120deg and -120deg (2pi/3).
          // Let's draw the arc crossing the 0 degree line? No, that's the point.
          // Let's draw the arc "cup" facing the center?
          // That would be from PI/2 to 3PI/2.

          // Let's try an arc from PI/2 + 0.5 to 3PI/2 - 0.5?
          // Rotated: 0 is "Out".
          // Arc logic:
          // ctx.arc(0, 0, arcRadius, Math.PI / 2 + 0.4, 3 * Math.PI / 2 - 0.4);

          // Animated swipe:
          // Draw full arc but use dashoffset? Or just draw partial based on progress.
          // Let's just draw the full arc and fade opacity.

          ctx.beginPath();
          // Draw arc "around" the vertex corner
          // 0 is OUT. PI is IN (towards center).
          // Sides are roughly at 2PI/3 (120) and 4PI/3 (240)?
          // We want to connect the sides.
          // Let's draw arc from 120+offset to 240-offset?
          // No, we want to cross the "tip".
          // Let's draw arc from PI/2 to -PI/2 (crossing 0)?
          // Yes, crossing the "tip" (0).

          const startAng = -Math.PI / 3;
          const endAng = Math.PI / 3;

          ctx.arc(0, 0, arcRadius + (ease * 5), startAng, endAng); // Expand slightly
          ctx.stroke();

          // Arrowheads?
          // Let's add simple dots or small ticks at ends?
          // Or a real arrow head at endAng.

          // Arrow head at end
          // Rotate local context to tip?
          // Simple line manually
          // Tangent at endAng is endAng + PI/2

          // Draw simple double arrow heads
          // Let's keep it subtle as requested. Just the arc might be enough visual cue.
          // User image had arrow heads.
          // Let's add one arrow head at `endAng`.

          // ... actually let's just do the arc for now, "subtle".
          // Maybe a glowing arc.

          ctx.restore();

        } else {
          swapAnimRef.current = null;
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current !== undefined) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [width, height, vertices, activeTouches, effectBadgePos, propColors, ghostNotesEnabled, octaveRange, sideColors]);

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