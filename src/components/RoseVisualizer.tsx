import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface RoseVisualizerProps {
    engine: AudioEngine;
    width: number;
    height: number;
    centerX?: number;
    centerY?: number;
    activeEffectTypes?: string[];
}

// Interval Dissonance Map
const INTERVAL_DISSONANCE: Record<number, number> = {
    0: 0.0,   // Unison
    1: 0.9,   // Minor 2nd
    2: 0.5,   // Major 2nd
    3: 0.1,   // Minor 3rd
    4: 0.1,   // Major 3rd
    5: 0.2,   // Perfect 4th
    6: 1.0,   // Tritone
    7: 0.0,   // Perfect 5th
    8: 0.2,   // Minor 6th
    9: 0.2,   // Major 6th
    10: 0.6,  // Minor 7th
    11: 0.9,  // Major 7th
    12: 0.0   // Octave
};

export const RoseVisualizer: React.FC<RoseVisualizerProps> = ({ engine, width, height, centerX, centerY }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let rotation = 0;
        let innerRotation = 0; // Counter-rotation for depth

        // Smoothers
        let smoothedDissonance = 0;
        let smoothedAmplitude = 0;
        let smoothedK = 3;
        let smoothedHue = 0;
        let containerAlpha = 0;

        // Peak detector for transient glow
        let peakLevel = 0;
        let lastAmplitude = 0;

        const render = () => {
            const freqs = Array.from(engine.activeFrequencies).sort((a, b) => a - b);
            const values = engine.waveform.getValue();
            const rms = Math.sqrt(values.reduce((acc, val) => acc + (val as number) * (val as number), 0) / values.length);

            // Peak detection - spike on sudden amplitude increases
            const amplitudeDelta = rms - lastAmplitude;
            if (amplitudeDelta > 0.05) {
                peakLevel = Math.min(1, peakLevel + amplitudeDelta * 3);
            }
            peakLevel *= 0.92; // Quick decay
            lastAmplitude = rms;

            // Container Fade - smooth in, instant out
            const hasSound = freqs.length > 0 || rms > 0.01;
            if (hasSound) {
                containerAlpha += 0.003 + (rms * 0.025);
                if (containerAlpha > 1) containerAlpha = 1;
            } else {
                containerAlpha = 0; // Instant disappear
            }

            if (containerAlpha < 0.001) {
                ctx.clearRect(0, 0, width, height);
                animId = requestAnimationFrame(render);
                return;
            }

            let dissonanceScore = 0;
            let consonanceScore = 0; // Track consonance for shimmer
            let intervalCount = 0;

            if (freqs.length > 0) {
                const sumLog = freqs.reduce((acc, f) => acc + Math.log2(f), 0);
                const avgLog = sumLog / freqs.length;
                const chroma = (avgLog * 12) % 12;
                const targetHue = (chroma * 30) % 360;

                let diff = targetHue - smoothedHue;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                smoothedHue += diff * 0.04;
                if (smoothedHue < 0) smoothedHue += 360;
                if (smoothedHue > 360) smoothedHue -= 360;

                if (freqs.length > 1) {
                    for (let i = 0; i < freqs.length; i++) {
                        for (let j = i + 1; j < freqs.length; j++) {
                            const ratio = freqs[j] / freqs[i];
                            const semi = Math.abs(12 * Math.log2(ratio));
                            const roundedSemi = Math.round(semi) % 12;
                            const deviation = Math.abs(semi - Math.round(semi));
                            let score = INTERVAL_DISSONANCE[roundedSemi] || 0.5;
                            score += deviation * 3;
                            dissonanceScore += score;

                            // Track consonance (inverse of dissonance for perfect intervals)
                            if (roundedSemi === 0 || roundedSemi === 7 || roundedSemi === 12) {
                                consonanceScore += 1 - deviation;
                            } else if (roundedSemi === 3 || roundedSemi === 4 || roundedSemi === 5) {
                                consonanceScore += 0.5 - deviation;
                            }
                            intervalCount++;
                        }
                    }
                    dissonanceScore /= intervalCount;
                    consonanceScore = intervalCount > 0 ? consonanceScore / intervalCount : 0;
                }
            } else {
                smoothedHue += (220 - smoothedHue) * 0.008;
            }

            // Smoothing
            smoothedDissonance += (dissonanceScore - smoothedDissonance) * 0.04;
            smoothedAmplitude += (rms - smoothedAmplitude) * 0.08;

            const baseK = freqs.length > 0 ? freqs.length : 3;
            const kTarget = baseK + (smoothedDissonance * Math.PI);
            smoothedK += (kTarget - smoothedK) * 0.04;

            // --- DRAWING ---
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            const cx = centerX ?? width / 2;
            const cy = centerY ?? height / 2;

            // DYNAMIC SIZE: 90% at normal volume, shrinks to 40% when silent
            const maxRadius = Math.min(width, height) * 0.42;
            const scale = 0.4 + Math.min(smoothedAmplitude * 1.8, 0.5); // 0.4 to 0.9
            const clampedRadius = maxRadius * scale;

            // Boosted luminosity with peak glow
            const baseSat = 35 + smoothedDissonance * 30;
            const baseLight = 38 + smoothedAmplitude * 25 + peakLevel * 20; // Peak adds brightness

            // Colors with consonance shimmer prep
            const primaryColor = `hsl(${smoothedHue}, ${baseSat}%, ${baseLight}%)`;
            const secondaryColor = `hsl(${(smoothedHue + 180) % 360}, ${baseSat * 0.7}%, ${baseLight * 0.85}%)`;
            const tertiaryColor = `hsl(${(smoothedHue + 90) % 360}, ${baseSat * 0.6}%, ${baseLight * 0.7}%)`;

            ctx.save();
            ctx.translate(cx, cy);

            // Main rotation
            rotation += 0.001 + (smoothedDissonance * 0.004);
            // Counter-rotation for inner layer (creates depth)
            innerRotation -= 0.0015 + (smoothedAmplitude * 0.002);

            const points = 400;
            const time = Date.now() * 0.001;

            // 3 layers with depth
            const layers = [
                { radiusMult: 1.0, color: primaryColor, lineWidth: 0.6 + smoothedAmplitude * 3, alpha: 0.95, blur: 10 + smoothedAmplitude * 30 + peakLevel * 15, rotation: rotation },
                { radiusMult: 0.7, color: secondaryColor, lineWidth: 0.4 + smoothedAmplitude * 2, alpha: 0.6, blur: 6, rotation: rotation * 0.95 },
                { radiusMult: 0.4, color: tertiaryColor, lineWidth: 0.3 + smoothedAmplitude * 1.5, alpha: 0.4, blur: 3, rotation: innerRotation } // Counter-rotating!
            ];

            for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
                const layer = layers[layerIdx];

                ctx.save();
                ctx.rotate(layer.rotation);
                ctx.beginPath();

                const layerR = clampedRadius * layer.radiusMult;
                const layerK = smoothedK + (1 - layer.radiusMult) * 0.15;

                for (let i = 0; i <= points; i++) {
                    const theta = (i / points) * Math.PI * 2 * (Math.floor(smoothedK) + 1);

                    const spike = smoothedDissonance * Math.sin(theta * 18) * 0.08;
                    const shapeMod = Math.cos(layerK * theta);
                    const r = layerR * (0.85 + 0.15 * shapeMod) + (spike * layerR);

                    const x = r * Math.cos(theta);
                    const y = r * Math.sin(theta);

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();

                // Harmonic shimmer on consonance - subtle alpha variation along path
                let shimmerAlpha = layer.alpha;
                if (consonanceScore > 0.3 && layerIdx === 0) {
                    // Rapid subtle shimmer when consonant
                    shimmerAlpha += Math.sin(time * 15) * 0.1 * consonanceScore;
                }

                ctx.strokeStyle = layer.color;
                ctx.lineWidth = layer.lineWidth;
                ctx.globalAlpha = shimmerAlpha * containerAlpha;
                ctx.shadowBlur = layer.blur;
                ctx.shadowColor = layer.color;
                ctx.stroke();

                ctx.restore();
            }

            // Inner glow core
            if (smoothedAmplitude > 0.02) {
                const coreSize = clampedRadius * 0.18 * (0.4 + smoothedAmplitude + peakLevel * 0.5);
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
                gradient.addColorStop(0, `hsla(${smoothedHue}, 80%, 90%, ${(smoothedAmplitude + peakLevel) * 0.7})`);
                gradient.addColorStop(0.4, `hsla(${smoothedHue}, 70%, 70%, ${smoothedAmplitude * 0.4})`);
                gradient.addColorStop(1, `hsla(${smoothedHue}, 60%, 50%, 0)`);

                ctx.globalAlpha = containerAlpha;
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            ctx.globalAlpha = 1;

            animId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animId);
    }, [engine, width, height, centerX, centerY]);

    return <canvas ref={canvasRef} width={width} height={height} className="pointer-events-none" />;
};
