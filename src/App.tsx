import { useEffect, useState, useMemo } from 'react';
import { AudioEngine, type VoiceType, type LoopTrack } from './audio/AudioEngine';
import { HexagonInstrument } from './components/HexagonInstrument';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { RotaryDial } from './components/RotaryDial';
import { EFFECT_TYPES, type EffectType } from './audio/effects';
import type { Point } from './utils/geometry';
import { Mic, Play, Square, Settings as SettingsIcon, Ghost, Activity, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

const engine = AudioEngine.getInstance();

const INITIAL_EFFECTS: EffectType[] = [
    'JCReverb', 'FeedbackDelay', 'Distortion', 'Chorus', 'AutoFilter', 'Phaser'
];

function App() {
  const [started, setStarted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [effects, setEffects] = useState<(EffectType | null)[]>(INITIAL_EFFECTS);
  const [badgePos, setBadgePos] = useState<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [voiceType, setVoiceType] = useState<VoiceType>('sine');
  const [octave, setOctave] = useState(2);
  const [rootNote, setRootNote] = useState('C');
  const [tracks, setTracks] = useState<LoopTrack[]>(engine.tracks);
  const [, setForceUpdate] = useState(0); 
  const [ghostNotesEnabled, setGhostNotesEnabled] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [activeColor, setActiveColor] = useState('#00f0ff'); // Dynamic Waveform color

  useEffect(() => {
    if (started) {
        INITIAL_EFFECTS.forEach((eff, i) => engine.setEffect(i, eff));
    }
  }, [started]);

  useEffect(() => {
      const interval = setInterval(() => {
          setTracks([...engine.tracks]);
          setForceUpdate(n => n + 1);
      }, 100);
      return () => clearInterval(interval);
  }, []);

  const isMobile = dimensions.width < 600;
  const hexScale = isMobile ? 0.28 : 0.35;
  const hexRadius = Math.min(dimensions.width, dimensions.height) * hexScale; 
  const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
  
  const sideColors = ['#00f0ff', '#ff0055', '#ccff00', '#aa00ff', '#ffffff', '#ffaa00'];

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      setBadgePos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStart = async () => {
    await engine.start();
    setStarted(true);
  };

  const handleEffectChange = (index: number, type: string) => {
    const newEffects = [...effects];
    newEffects[index] = type as EffectType; 
    setEffects(newEffects);
    engine.setEffect(index, newEffects[index]);
  };

  const availableEffects = (currentIndex: number) => {
    const selectedOthers = effects.filter((_, i) => i !== currentIndex);
    return EFFECT_TYPES.filter(e => !selectedOthers.includes(e));
  };

  const menuPositions = useMemo(() => {
     const positions: {x: number, y: number, rotation: number}[] = [];
     for(let i=0; i<6; i++) {
         const angleDeg = 60 * i + 30; 
         const angleRad = (angleDeg * Math.PI) / 180;
         const dist = hexRadius + (isMobile ? 35 : 50); 
         positions.push({
             x: center.x + dist * Math.cos(angleRad),
             y: center.y + dist * Math.sin(angleRad),
             rotation: angleDeg
         });
     }
     return positions;
  }, [center, hexRadius, isMobile]);

  if (!started) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-hex-bg text-hex-text font-mono">
        <div className="mb-8 text-4xl font-bold tracking-widest text-hex-accent drop-shadow-[0_0_10px_rgba(0,240,255,0.8)] text-center">
            HEXAGON SYNTH
        </div>
        <button 
          onClick={handleStart}
          className="group relative rounded-none border border-hex-accent bg-transparent px-10 py-4 text-xl font-bold uppercase tracking-wider text-hex-accent transition-all hover:bg-hex-accent hover:text-hex-bg hover:shadow-glow"
        >
          <span className="relative z-10">Initialize System</span>
          <div className="absolute inset-0 bg-hex-accent opacity-10 group-hover:opacity-100 transition-opacity blur-xl"></div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-hex-bg overflow-hidden font-mono text-xs text-hex-text select-none">
      
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Bottom Waveform */}
      <div className="absolute bottom-0 left-0 right-0 h-48 opacity-60 pointer-events-none z-0 mix-blend-screen">
         <WaveformVisualizer 
            analyzer={engine.waveform} 
            width={dimensions.width} 
            height={192} 
            color={activeColor} 
         />
      </div>

      {/* Main Instrument Layer */}
      <div className="absolute inset-0 z-10">
        <HexagonInstrument 
          engine={engine}
          width={dimensions.width}
          height={dimensions.height}
          effectBadgePos={badgePos}
          setEffectBadgePos={setBadgePos}
          colors={sideColors}
          ghostNotesEnabled={ghostNotesEnabled}
          octaveRange={octave}
          onNoteActive={setActiveColor}
        />
      </div>

      {/* Effect Menus */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {menuPositions.map((pos, i) => (
            <div 
                key={i}
                className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
                style={{ 
                    left: pos.x, 
                    top: pos.y,
                    width: isMobile ? '80px' : '120px'
                }}
            >
                {!isMobile && <div className="text-[10px] uppercase tracking-widest text-hex-text-dim mb-1 drop-shadow-md">Effect {i+1}</div>}
                <select 
                    className="w-full bg-black/80 border border-hex-border rounded-none px-1 py-1 text-[9px] sm:text-[10px] uppercase text-hex-accent focus:border-hex-accent focus:shadow-glow outline-none backdrop-blur-md appearance-none text-center cursor-pointer hover:bg-hex-panel"
                    value={effects[i] || ''}
                    onChange={(e) => handleEffectChange(i, e.target.value)}
                    style={{ 
                        borderColor: sideColors[i],
                        boxShadow: `0 0 5px ${sideColors[i]}20`
                    }}
                >
                    {availableEffects(i).map(eff => (
                        <option key={eff} value={eff}>{eff}</option>
                    ))}
                </select>
            </div>
        ))}
      </div>

      {/* Settings Panel (Top Left) */}
      <div className="absolute top-0 left-0 p-2 sm:p-4 z-30 pointer-events-none">
         <div className="pointer-events-auto flex flex-col gap-2 sm:gap-4 bg-hex-panel/80 border border-hex-border p-2 sm:p-4 backdrop-blur-md shadow-lg min-w-[150px] sm:min-w-[200px] scale-90 origin-top-left sm:scale-100">
             <div className="text-[10px] sm:text-xs font-bold text-hex-accent uppercase tracking-widest border-b border-hex-border pb-1 mb-2 flex items-center gap-2">
                 <SettingsIcon size={12} /> Synth
             </div>
             
             <div className="flex flex-col gap-1">
                 <label className="text-[9px] uppercase text-hex-text-dim">Voice</label>
                 <select 
                    value={voiceType} 
                    onChange={e => { setVoiceType(e.target.value as any); engine.setVoiceType(e.target.value as any); }}
                    className="bg-black border border-hex-border px-1 py-1 text-hex-accent outline-none focus:border-hex-accent text-[10px]"
                 >
                     <option value="sine">Sine</option>
                     <option value="triangle">Triangle</option>
                     <option value="sawtooth">Sawtooth</option>
                     <option value="square">Square</option>
                     <option value="pulse">Pulse</option>
                     <option value="fmsynth">FM</option>
                     <option value="amsynth">AM</option>
                     <option value="membrane">Membrane</option>
                     <option value="metal">Metal</option>
                 </select>
             </div>
             
             <div className="flex flex-col gap-1">
                 <div className="flex justify-between">
                     <label className="text-[9px] uppercase text-hex-text-dim">Octave Range</label>
                     <span className="text-hex-accent text-[10px]">{octave}</span>
                 </div>
                 <input 
                    type="range" min="1" max="5" step="1" 
                    value={octave} 
                    onChange={e => { 
                        const v = parseInt(e.target.value); 
                        setOctave(v); 
                        engine.octaveRange = v; 
                    }}
                    className="w-full h-1 bg-hex-border rounded-none appearance-none cursor-pointer"
                 />
             </div>

              <div className="flex flex-col gap-1 items-center pt-2">
                 <RotaryDial 
                    label="Root Note"
                    value={rootNote}
                    options={['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']}
                    onChange={(n) => {
                        setRootNote(n);
                        const idx = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(n);
                        const freq = 261.63 * Math.pow(2, idx/12);
                        engine.rootFreq = freq;
                    }}
                 />
             </div>
         </div>
      </div>

      {/* Debug Panel (Top Right) */}
      <div className="absolute top-0 right-0 p-2 sm:p-4 z-30 pointer-events-none flex flex-col items-end">
         {isMobile && (
             <button 
                onClick={() => setShowTelemetry(!showTelemetry)}
                className="pointer-events-auto bg-hex-panel/80 border border-hex-border p-2 mb-2 rounded backdrop-blur text-hex-accent"
             >
                 <Activity size={16} />
             </button>
         )}
         
         {(!isMobile || showTelemetry) && (
            <div className="pointer-events-auto bg-hex-panel/80 border border-hex-border p-4 backdrop-blur-md shadow-lg w-[160px] sm:w-[180px]">
                <div className="text-xs font-bold text-hex-accent uppercase tracking-widest border-b border-hex-border pb-1 mb-2">
                    Telemetry
                </div>
                <div className="space-y-1 font-mono text-[10px] text-gray-400">
                    <div className="flex justify-between"><span>PITCH</span> <span className="text-white">{(badgePos.x / dimensions.width).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>VOL</span> <span className="text-white">{(1 - badgePos.y / dimensions.height).toFixed(2)}</span></div>
                    <div className="h-px bg-hex-border my-2"></div>
                    {effects.map((e, i) => e && (
                        <div key={i} className="flex justify-between">
                            <span style={{ color: sideColors[i] }}>{e.substring(0,4)}</span>
                            <span className="text-white">{((engine as any).effects[i]?.wet?.value || 0).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
         )}
      </div>

      {/* Looper Panel (Bottom Right) */}
      <div className="absolute right-2 bottom-4 sm:right-4 sm:bottom-8 pointer-events-auto z-30">
        <div className="bg-hex-panel/90 border border-hex-border p-2 backdrop-blur-md shadow-2xl rounded-sm w-[180px] sm:w-[240px]">
            <div className="text-xs font-bold text-hex-secondary uppercase tracking-widest border-b border-hex-border pb-2 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Mic size={14} /> Loop</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => engine.clearAllLoops()}
                        className="text-gray-500 hover:text-red-500"
                        title="Clear All"
                    >
                        <Trash2 size={12} />
                    </button>
                    <button 
                        onClick={() => setGhostNotesEnabled(!ghostNotesEnabled)}
                        className={clsx("flex items-center gap-1 text-[9px] border px-1 rounded transition-colors", ghostNotesEnabled ? "border-hex-accent text-hex-accent" : "border-gray-700 text-gray-500")}
                        title="Toggle Ghost Notes"
                    >
                        <Ghost size={12} />
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col gap-1">
                {[0, 1, 2, 3].map(trackId => {
                    const track = tracks[trackId];
                    return (
                        <div key={trackId} className="flex items-center gap-2 bg-black/40 p-1 rounded-sm border border-transparent hover:border-hex-border transition-colors h-8">
                            {/* Status Dot */}
                            <div className={clsx(
                                "w-1.5 h-1.5 rounded-full shrink-0 ml-1",
                                track.isRecording ? "bg-red-500 animate-pulse" :
                                track.isPlaying ? "bg-green-500" : "bg-gray-800"
                            )} />
                            
                            <div className="text-[9px] font-bold text-gray-500 shrink-0 w-3">0{trackId+1}</div>

                            {/* Record Button */}
                            <button
                                onClick={() => {
                                    if (track.isRecording) engine.stopRecording(trackId);
                                    else engine.startRecording(trackId);
                                }}
                                className={clsx(
                                    "w-6 h-6 flex items-center justify-center border rounded-sm transition-all shrink-0",
                                    track.isRecording 
                                        ? "bg-red-600 border-red-500 text-white" 
                                        : "bg-black border-hex-border hover:border-red-500 text-gray-400"
                                )}
                            >
                                <div className={clsx("rounded-full bg-current", track.isRecording ? "w-2 h-2" : "w-3 h-3")} />
                            </button>

                            {/* Play Button */}
                            <button
                                onClick={() => engine.toggleTrackPlayback(trackId)}
                                disabled={!track.audioBuffer && !track.isRecording}
                                className={clsx(
                                    "w-6 h-6 flex items-center justify-center border rounded-sm transition-all shrink-0",
                                    track.isPlaying
                                        ? "bg-green-900/50 border-green-500 text-green-400"
                                        : "bg-black border-hex-border hover:border-green-500 text-gray-400",
                                    (!track.audioBuffer && !track.isRecording) && "opacity-30 cursor-not-allowed"
                                )}
                            >
                                {track.isPlaying ? <Square size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" />}
                            </button>

                            {/* Volume */}
                            <div className="flex-1 flex items-center group">
                                <input 
                                    type="range" min="0" max="1" step="0.05" defaultValue="0.8"
                                    onChange={(e) => engine.setTrackVolume(trackId, parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-800 rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gray-500 [&::-webkit-slider-thumb]:hover:bg-hex-accent"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

    </div>
  );
}

export default App;
