import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface HarmonyVisualizerProps {
    engine: AudioEngine;
    width: number;
    height: number;
}

// Interval Dissonance Map (Semitones -> Dissonance Score 0-1)
// 0: Perfect Consonance, 1: High Dissonance
const INTERVAL_DISSONANCE: Record<number, number> = {
    0: 0.0,   // Unison
    1: 0.9,   // Minor 2nd (Very Dissonant)
    2: 0.5,   // Major 2nd (Mild Dissonant)
    3: 0.1,   // Minor 3rd (Consonant)
    4: 0.1,   // Major 3rd (Consonant)
    5: 0.2,   // Perfect 4th (Consonant)
    6: 1.0,   // Tritone (Very Dissonant)
    7: 0.0,   // Perfect 5th (Perfect Consonance)
    8: 0.2,   // Minor 6th (Consonant)
    9: 0.2,   // Major 6th (Consonant)
    10: 0.6,  // Minor 7th (Mild Dissonant)
    11: 0.9,  // Major 7th (Very Dissonant)
    12: 0.0   // Octave
};

// Rose Curve / Lissajous Dissonance Visualizer
export const HarmonyVisualizer: React.FC<HarmonyVisualizerProps> = ({ engine, width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let rotation = 0;

        // Smoothers
        let smoothedDissonance = 0;
        let smoothedAmplitude = 0;
        let smoothedK = 3; // The "petal" count parameter
        let smoothedHue = 0;

        const render = () => {
            // 1. Analyze Harmony
            const freqs = Array.from(engine.activeFrequencies).sort((a, b) => a - b);
            let dissonanceScore = 0;
            let intervalCount = 0;

            if (freqs.length > 0) {
                // Pitch to Hue Mapping
                const sumLog = freqs.reduce((acc, f) => acc + Math.log2(f), 0);
                const avgLog = sumLog / freqs.length;
                const chroma = (avgLog * 12) % 12;
                const targetHue = (chroma * 30) % 360;

                let diff = targetHue - smoothedHue;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                smoothedHue += diff * 0.05;
                if (smoothedHue < 0) smoothedHue += 360;
                if (smoothedHue > 360) smoothedHue -= 360;

                // Dissonance Calculation
                if (freqs.length > 1) {
                    for (let i = 0; i < freqs.length; i++) {
                        for (let j = i + 1; j < freqs.length; j++) {
                            const f1 = freqs[i];
                            const f2 = freqs[j];
                            const ratio = f2 / f1;
                            const semi = Math.abs(12 * Math.log2(ratio));
                            const roundedSemi = Math.round(semi) % 12;
                            const deviation = Math.abs(semi - Math.round(semi));

                            let score = INTERVAL_DISSONANCE[roundedSemi] || 0.5;
                            score += deviation * 3; // Heavy penalty for detuning

                            dissonanceScore += score;
                            intervalCount++;
                        }
                    }
                    dissonanceScore /= intervalCount;
                }
            } else {
                // Decay to silence/neutral
                smoothedHue += (200 - smoothedHue) * 0.01; // Fade to blue
            }

            // 2. Audio Amplitude (Pulse)
            const values = engine.waveform.getValue();
            const rms = Math.sqrt(values.reduce((acc, val) => acc + (val as number) * (val as number), 0) / values.length);

            // Smoothing
            smoothedDissonance += (dissonanceScore - smoothedDissonance) * 0.05;
            smoothedAmplitude += (rms - smoothedAmplitude) * 0.1;

            // Map Dissonance to Fractal 'k'
            const baseK = freqs.length > 0 ? freqs.length : 3;
            const kTarget = baseK + (smoothedDissonance * 3.14159);
            smoothedK += (kTarget - smoothedK) * 0.05;

            // Draw
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter'; // Glowy

            const cx = width / 2;
            const cy = height / 2;

            // DYNAMICS INVERSION:
            // Quiet = Large Radius (Expanded), Hollow
            // Loud = Small Radius (Condensed), Dense
            const maxRadius = Math.min(width, height) / 2.2;
            const minRadius = maxRadius * 0.4;
            const currentRadius = maxRadius - (smoothedAmplitude * (maxRadius - minRadius));

            const sat = 30 + smoothedDissonance * 40; // 30-70% Sat (more muted)
            const light = 25 + smoothedAmplitude * 35; // 25-60% Light (ghostly)

            const color = `hsl(${smoothedHue}, ${sat}%, ${light}%)`;
            const contrastColor = `hsl(${(smoothedHue + 180) % 360}, ${sat}%, ${light}%)`;

            ctx.save();
            ctx.translate(cx, cy);
            rotation += 0.001 + (smoothedDissonance * 0.005); // Slow, deliberate rotation
            ctx.rotate(rotation);

            const points = 360; // Higher resolution for neat lines

            // Draw 3 layers - varying from outer shell (hollow) to inner core
            for (let layer = 0; layer < 3; layer++) {
                ctx.beginPath();

                // Layers spread out when quiet, condense when loud
                const spread = 0.3 * (1 - smoothedAmplitude);
                const layerR = currentRadius * (1 - layer * spread);
                const layerK = smoothedK + (layer * 0.005 * smoothedDissonance);

                for (let i = 0; i <= points; i++) {
                    const theta = (i / points) * Math.PI * 2 * (Math.floor(smoothedK) + 1);

                    const spike = smoothedDissonance * Math.sin(theta * 20) * 0.1; // Reduced spike amplitude for neatness

                    // Rose Curve logic
                    const shapeMod = Math.cos(layerK * theta);
                    const r = layerR * (0.8 + 0.2 * shapeMod) + (spike * layerR);

                    const x = r * Math.cos(theta);
                    const y = r * Math.sin(theta);

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();

                ctx.strokeStyle = layer === 1 ? contrastColor : color;
                // Quiet = Thin (0.5), Loud = Thick (3)
                ctx.lineWidth = 0.5 + smoothedAmplitude * 4;
                ctx.shadowBlur = 5 + smoothedAmplitude * 30; // Glow increases with loudness
                ctx.shadowColor = color;

                ctx.stroke();

                // Fill only significantly when loud
                if (smoothedAmplitude > 0.1) {
                    ctx.globalAlpha = smoothedAmplitude * 0.3; // Semitransparent fill
                    ctx.fillStyle = color;
                    // ctx.fill(); // Keep hollow mostly
                    ctx.globalAlpha = 1;
                }
            }

            // Core: Visible only when loud enough
            if (smoothedAmplitude > 0.05) {
                ctx.beginPath();
                const coreRadius = currentRadius * 0.3 * smoothedAmplitude;
                ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${smoothedHue}, 100%, 90%)`; // Hot white center
                ctx.shadowBlur = 20 + smoothedAmplitude * 50;
                ctx.shadowColor = `hsl(${smoothedHue}, 100%, 50%)`;
                ctx.fill();
            }

            ctx.restore();

            animId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animId);
    }, [engine, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} className="" />;
};
