import * as Tone from 'tone';

export type EffectType =
  | 'AutoFilter' | 'AutoPanner' | 'AutoWah' | 'BitCrusher' | 'Chebyshev'
  | 'Chorus' | 'Distortion' | 'FeedbackDelay' | 'JCReverb' | 'FrequencyShifter'
  | 'Phaser' | 'PingPongDelay' | 'StereoWidener' | 'Tremolo' | 'Vibrato'
  | 'PitchShift' | 'EQ3' | 'Reverb';

export const EFFECT_TYPES: EffectType[] = [
  'AutoFilter', 'AutoPanner', 'AutoWah', 'BitCrusher', 'Chebyshev',
  'Chorus', 'Distortion', 'FeedbackDelay', 'JCReverb', 'FrequencyShifter',
  'Phaser', 'PingPongDelay', 'StereoWidener', 'Tremolo', 'Vibrato',
  'PitchShift', 'EQ3', 'Reverb'
];

export function createEffect(type: EffectType): Tone.ToneAudioNode {
  switch (type) {
    case 'AutoFilter': return new Tone.AutoFilter({ wet: 0 }).start();
    case 'AutoPanner': return new Tone.AutoPanner({ wet: 0 }).start();
    case 'AutoWah': return new Tone.AutoWah({ wet: 0 });
    case 'BitCrusher': {
      const eff = new Tone.BitCrusher(4);
      eff.wet.value = 0;
      return eff;
    }
    case 'Chebyshev': return new Tone.Chebyshev({ wet: 0, order: 50 });
    case 'Chorus': return new Tone.Chorus({ wet: 0 }).start();
    case 'Distortion': return new Tone.Distortion({ wet: 0 });
    case 'FeedbackDelay': return new Tone.FeedbackDelay({ wet: 0, delayTime: 0.25, feedback: 0.5 });
    case 'JCReverb': return new Tone.JCReverb({ wet: 0 });
    case 'FrequencyShifter': return new Tone.FrequencyShifter({ wet: 0 });
    case 'Phaser': return new Tone.Phaser({ wet: 0 });
    case 'PingPongDelay': return new Tone.PingPongDelay({ wet: 0, delayTime: 0.25, feedback: 0.5 });
    case 'StereoWidener': return new Tone.StereoWidener({ wet: 0 });

    case 'Tremolo': return new Tone.Tremolo({ wet: 0 }).start();
    case 'Vibrato': return new Tone.Vibrato({ wet: 0 });
    case 'PitchShift': return new Tone.PitchShift({ wet: 0, pitch: 0 });
    case 'EQ3': return new Tone.EQ3({ low: 0, mid: 0, high: 0 }); // wet 0 doesn't apply to EQ usually? It's insert. But Tone.EQ3 has wet? no, it's component. We might need dry/wet mix manually if we want it. But let's assume EQ is always active if selected? 
    // Wait, the system assumes everything has wet/dry modulation. 
    // Tone.EQ3 DOES NOT have a wet property standardly exposed like effects.
    // However, AudioEngine wraps effects in a chain. 
    // If an effect doesn't have wet, we might need a Dry/Wet merger. 
    // BUT most tone effects extend Effect which has wet. EQ3 extends AudioNode, NOT Effect.
    // So EQ3 cannot be used with `effect.wet.value = 0` in `updateEffectStrength`.
    // We should probably check `updateEffectStrength`.
    // Reverb DOES extend Effect.
    case 'Reverb': {
      const r = new Tone.Reverb({ decay: 1.5, wet: 0 });
      r.generate();
      return r;
    }
    default: return new Tone.Gain(1);
  }
}


export function updateEffectStrength(effect: Tone.ToneAudioNode, strength: number) {
  // Most effects have a 'wet' property.
  // @ts-ignore
  if (effect.wet) {
    // @ts-ignore
    if (typeof effect.wet.rampTo === 'function') {
      // @ts-ignore
      effect.wet.rampTo(strength, 0.2);
    } else {
      // @ts-ignore
      effect.wet.value = strength; // 0 to 1
    }
  } else if (effect.name === 'EQ3') {
    // EQ3 doesn't have wet, so we can't modulate mix easily without a wrapper.
    // For now, do nothing (Insert effect).
  }
}

export const EFFECT_PARAMS: Record<EffectType, { name: string; key: string; min: number; max: number; step: number; suffix?: string }[]> = {
  'AutoFilter': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Depth', key: 'depth', min: 0, max: 1, step: 0.05 },
    { name: 'Base Freq', key: 'baseFrequency', min: 20, max: 1000, step: 10, suffix: 'Hz' }
  ],
  'AutoPanner': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Depth', key: 'depth', min: 0, max: 1, step: 0.05 }
  ],
  'AutoWah': [
    { name: 'Base Freq', key: 'baseFrequency', min: 20, max: 1000, step: 10, suffix: 'Hz' },
    { name: 'Octaves', key: 'octaves', min: 1, max: 8, step: 1 },
    { name: 'Sensitivity', key: 'sensitivity', min: -40, max: 0, step: 1, suffix: 'dB' },
    { name: 'Q', key: 'Q', min: 0, max: 10, step: 0.1 }
  ],
  'BitCrusher': [
    { name: 'Bits', key: 'bits', min: 1, max: 16, step: 1 }
  ],
  'Chebyshev': [
    { name: 'Order', key: 'order', min: 1, max: 100, step: 1 }
  ],
  'Chorus': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Delay Time', key: 'delayTime', min: 2, max: 20, step: 0.5, suffix: 'ms' },
    { name: 'Depth', key: 'depth', min: 0, max: 1, step: 0.05 }
  ],
  'Distortion': [
    { name: 'Distortion', key: 'distortion', min: 0, max: 1, step: 0.05 }
  ],
  'FeedbackDelay': [
    { name: 'Delay Time', key: 'delayTime', min: 0, max: 1, step: 0.05, suffix: 's' },
    { name: 'Feedback', key: 'feedback', min: 0, max: 0.95, step: 0.05 }
  ],
  'JCReverb': [
    { name: 'Room Size', key: 'roomSize', min: 0, max: 1, step: 0.05 }
  ],
  'FrequencyShifter': [
    { name: 'Frequency', key: 'frequency', min: -1000, max: 1000, step: 10, suffix: 'Hz' }
  ],
  'Phaser': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Octaves', key: 'octaves', min: 1, max: 8, step: 1 },
    { name: 'Base Freq', key: 'baseFrequency', min: 20, max: 1000, step: 10, suffix: 'Hz' }
  ],
  'PingPongDelay': [
    { name: 'Delay Time', key: 'delayTime', min: 0, max: 1, step: 0.05, suffix: 's' },
    { name: 'Feedback', key: 'feedback', min: 0, max: 0.95, step: 0.05 }
  ],
  'StereoWidener': [
    { name: 'Width', key: 'width', min: 0, max: 1, step: 0.05 }
  ],

  'Tremolo': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Depth', key: 'depth', min: 0, max: 1, step: 0.05 }
  ],
  'Vibrato': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Depth', key: 'depth', min: 0, max: 1, step: 0.05 }
  ],
  'PitchShift': [
    { name: 'Pitch', key: 'pitch', min: -12, max: 12, step: 1, suffix: 'st' },
    { name: 'Window', key: 'windowSize', min: 0.03, max: 0.1, step: 0.01 }
  ],
  'EQ3': [
    { name: 'Low', key: 'low', min: -10, max: 10, step: 1, suffix: 'dB' },
    { name: 'Mid', key: 'mid', min: -10, max: 10, step: 1, suffix: 'dB' },
    { name: 'High', key: 'high', min: -10, max: 10, step: 1, suffix: 'dB' }
  ],
  'Reverb': [
    { name: 'Decay', key: 'decay', min: 0.1, max: 5, step: 0.1, suffix: 's' },
    { name: 'PreDelay', key: 'preDelay', min: 0, max: 0.1, step: 0.01, suffix: 's' }
  ]
};
