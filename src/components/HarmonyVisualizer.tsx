import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface HarmonyVisualizerProps {
    engine: AudioEngine;
    width: number;
    height: number;
    activeEffectTypes?: string[];
    centerX?: number;
    centerY?: number;
}

// 3D Point
interface Point3D { x: number; y: number; z: number; }

// Particle
interface Particle {
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

// Attractor Instance
interface Attractor {
    x: number; y: number; z: number;
    trail: Point3D[];
    hueOffset: number;
}

// Color Helper
const hsla = (h: number, s: number, l: number, a: number) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

// LORENZ CONSTANTS
const SIGMA = 10;
const RHO_BASE = 28;
const BETA = 8 / 3;

export const HarmonyVisualizer: React.FC<HarmonyVisualizerProps> = ({
    engine, width, height, activeEffectTypes = [], centerX, centerY
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // STATE
    const stateRef = useRef({
        attractors: [] as Attractor[],
        particles: [] as Particle[],
        time: 0,
        lastAmp: 0, // For burst detection
        glitchActive: 0,

        // MYSTERIOUS ENTITY LOGIC
        presence: 0,          // Current visibility (0-1)
        targetPresence: 0,    // Where we are fading to
        presenceTimer: 0      // Time until next "decision"
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize Attractors (3 interleaved)
        if (stateRef.current.attractors.length === 0) {
            for (let i = 0; i < 3; i++) {
                stateRef.current.attractors.push({
                    x: 0.1 + i * 0.5, y: 0, z: 0,
                    trail: [],
                    hueOffset: i * 30
                });
            }
        }

        let animId: number;

        // Smoothers
        let smDissonance = 0;
        let smAmplitude = 0;
        let smHue = 0;
        let globalAlpha = 0;

        const render = () => {
            const ref = stateRef.current;

            // Audio Analysis (RMS)
            const values = engine.waveform.getValue();
            const rms = Math.sqrt(values.reduce((acc, v) => acc + (v as number) ** 2, 0) / values.length);
            const smoothFactor = rms > smAmplitude ? 0.3 : 0.05; // Fast attack, VERY slow decay to bridge gaps (Arp fix)
            smAmplitude += (rms - smAmplitude) * smoothFactor;

            const freqs = Array.from(engine.activeFrequencies).sort((a, b) => a - b);
            const hasSound = freqs.length > 0 || smAmplitude > 0.05;

            // --- MYSTERIOUS ENTITY LOGIC ---
            ref.presenceTimer--;
            if (ref.presenceTimer <= 0) {
                // Time to make a decision
                const isPlaying = hasSound;
                const roll = Math.random();

                if (isPlaying) {
                    // 85% chance to appear/stay when playing
                    if (roll > 0.15) {
                        ref.targetPresence = 1.0;
                        ref.presenceTimer = 200 + Math.random() * 500; // 3-8s
                    } else {
                        ref.targetPresence = 0.0; // Random vanish
                        ref.presenceTimer = 100 + Math.random() * 200;
                    }
                } else {
                    // 5% chance to ghost in silence
                    if (roll > 0.95) {
                        ref.targetPresence = 0.5;
                        ref.presenceTimer = 200;
                    } else {
                        ref.targetPresence = 0.0;
                        ref.presenceTimer = 50 + Math.random() * 100;
                    }
                }
            }

            // Smooth fade
            ref.presence += (ref.targetPresence - ref.presence) * 0.01;

            // Global Alpha = Sound * Presence * 0.3 (Max Opacity - Barely Perceptible)
            const desiredAlpha = hasSound ? ref.presence * 0.3 : 0;
            globalAlpha += (desiredAlpha - globalAlpha) * 0.05;

            if (globalAlpha < 0.005) {
                ctx.clearRect(0, 0, width, height);
                animId = requestAnimationFrame(render);
                return;
            }

            // Dissonance
            let diss = 0;
            if (hasSound) {
                for (let i = 0; i < freqs.length - 1; i++) {
                    const r = freqs[i + 1] / freqs[i];
                    if (r < 1.059) diss += 1;
                    if (Math.abs(r - 1.414) < 0.05) diss += 1;
                }
                const avgPitch = freqs.reduce((a, f) => a + Math.log2(f), 0) / (freqs.length || 1);
                const targetHue = (avgPitch * 30 * 12) % 360;
                let dh = targetHue - smHue;
                if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
                smHue += dh * 0.05;
            }
            smDissonance += (diss - smDissonance) * 0.1;

            // Effects
            let chaosMod = 0;
            let glowMod = 0;
            activeEffectTypes.forEach((t, i) => {
                // @ts-ignore
                const wet = engine.effects[i]?.wet?.value || 0;
                if (wet > 0.1) {
                    if (['Distortion', 'BitCrusher'].includes(t)) chaosMod += wet;
                    if (['Reverb', 'Delay', 'JCReverb'].includes(t)) glowMod += wet;
                }
            });

            ref.time += 0.01 + smAmplitude * 0.05;

            // --- PHYSICS: BURSTS ---
            if (rms > 0.1 && rms > ref.lastAmp + 0.05) {
                const lead = ref.attractors[0];
                const burstCount = 10 + Math.floor(rms * 20);
                for (let i = 0; i < burstCount; i++) {
                    ref.particles.push({
                        x: lead.x, y: lead.y, z: lead.z,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        vz: (Math.random() - 0.5) * 5,
                        life: 1.0,
                        maxLife: 1.0,
                        color: hsla(smHue + (Math.random() * 60 - 30), 80, 70, 1),
                        size: Math.random() * 2 * (1 + smAmplitude)
                    });
                }
            }
            ref.lastAmp = rms;

            // --- PHYSICS: ATTRACTORS ---
            const rho = RHO_BASE + (smDissonance * 20) + (chaosMod * 30);
            const dt = 0.015 * (1 + smAmplitude * 2);

            ref.attractors.forEach((attr) => {
                const dx = SIGMA * (attr.y - attr.x);
                const dy = attr.x * (rho - attr.z) - attr.y;
                const dz = attr.x * attr.y - BETA * attr.z;

                attr.x += dx * dt;
                attr.y += dy * dt;
                attr.z += dz * dt;

                attr.trail.push({ x: attr.x, y: attr.y, z: attr.z });
                if (attr.trail.length > 150) attr.trail.shift();
            });

            // --- PHYSICS: PARTICLES ---
            ref.particles.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.z += p.vz;
                p.life -= 0.02;
                p.vx *= 0.95; p.vy *= 0.95; p.vz *= 0.95;
            });
            ref.particles = ref.particles.filter(p => p.life > 0);

            // --- GLITCH ---
            if (Math.random() < 0.005 + (chaosMod * 0.05)) ref.glitchActive = 6;
            if (ref.glitchActive > 0) ref.glitchActive--;

            // --- DRAWING ---
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            const cx = centerX ?? width / 2;
            const cy = centerY ?? height / 2;

            const rotY = ref.time * 0.15;
            const rotX = Math.sin(ref.time * 0.08) * 0.3;

            // Projection Helper
            const project = (x: number, y: number, z: number) => {
                let px = x; let py = y; let pz = z - 25;

                let tx = px * Math.cos(rotY) - pz * Math.sin(rotY);
                let tz = px * Math.sin(rotY) + pz * Math.cos(rotY);
                px = tx; pz = tz;

                let ty = py * Math.cos(rotX) - pz * Math.sin(rotX);
                tz = py * Math.sin(rotX) + pz * Math.cos(rotX);
                py = ty; pz = tz;

                if (ref.glitchActive > 0) {
                    px += (Math.random() - 0.5) * 15;
                    py += (Math.random() - 0.5) * 15;
                }

                const fov = 450 + (smAmplitude * 150);
                const scale = fov / (450 - pz * 3);

                // Safety Check
                if (!isFinite(scale) || scale < 0 || scale > 20) return { x: 0, y: 0, scale: 0, z: pz };

                return {
                    x: cx + px * scale * 3, // SCALED DOWN from 4 to 3 for padding
                    y: cy + py * scale * 3, // SCALED DOWN from 4 to 3 for padding
                    scale: scale,
                    z: pz
                };
            };

            // 2. Draw Attractors (Trails) - No Stars
            ref.attractors.forEach((attr, idx) => {
                if (attr.trail.length < 2) return;

                const hue = (smHue + attr.hueOffset) % 360;
                const baseSize = (idx === 0) ? 3 : 1;

                const head = project(attr.trail[attr.trail.length - 1].x, attr.trail[attr.trail.length - 1].y, attr.trail[attr.trail.length - 1].z);
                const tail = project(attr.trail[0].x, attr.trail[0].y, attr.trail[0].z);

                // ROBUST SAFETY CHECK for Gradient
                if (head.scale > 0 && tail.scale > 0 &&
                    isFinite(head.x) && isFinite(head.y) &&
                    isFinite(tail.x) && isFinite(tail.y)) {

                    const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
                    // Brighter Highs
                    grad.addColorStop(0, hsla(hue, 90, 60, 0));
                    grad.addColorStop(1, hsla(hue, 100, 90, globalAlpha));

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = baseSize * head.scale * (1 + smAmplitude * 2);
                    ctx.lineCap = 'round';

                    ctx.shadowBlur = (glowMod * 20) + (smAmplitude * 10);
                    ctx.shadowColor = hsla(hue, 100, 80, 1);

                    ctx.beginPath();
                    attr.trail.forEach((pt, i) => {
                        const p = project(pt.x, pt.y, pt.z);
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            });

            // 3. Draw Particles
            ref.particles.forEach(p => {
                const proj = project(p.x, p.y, p.z);
                if (proj.scale > 0) {
                    ctx.fillStyle = p.color.replace('1)', `${p.life * globalAlpha})`);
                    const size = p.size * proj.scale;
                    ctx.beginPath();
                    ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // 4. Neural Lines
            if (chaosMod > 0 || smDissonance > 0.5) {
                const main = ref.attractors[0];
                const pts = main.trail;
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = hsla((smHue + 180) % 360, 90, 85, globalAlpha * 0.5);
                ctx.beginPath();

                for (let i = 0; i < 20; i++) {
                    const idx1 = Math.floor(Math.random() * pts.length);
                    const idx2 = Math.floor(Math.random() * pts.length);
                    const p1 = pts[idx1];
                    const p2 = pts[idx2];
                    if (p1 && p2) {
                        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
                        if (dist < 10) {
                            const pr1 = project(p1.x, p1.y, p1.z);
                            const pr2 = project(p2.x, p2.y, p2.z);
                            if (pr1.scale > 0 && pr2.scale > 0) {
                                ctx.moveTo(pr1.x, pr1.y);
                                ctx.lineTo(pr2.x, pr2.y);
                            }
                        }
                    }
                }
                ctx.stroke();
            }

            animId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animId);
    }, [engine, width, height, activeEffectTypes, centerX, centerY]);

    return <canvas ref={canvasRef} width={width} height={height} className="pointer-events-none" />;
};
