import * as Tone from 'tone';

export type EffectType =
  | 'AutoFilter' | 'AutoPanner' | 'AutoWah' | 'BitCrusher' | 'Chebyshev'
  | 'Chorus' | 'Distortion' | 'FeedbackDelay' | 'JCReverb' | 'FrequencyShifter'
  | 'Phaser' | 'PingPongDelay' | 'StereoWidener' | 'PitchShift' | 'Tremolo' | 'Vibrato';

export const EFFECT_TYPES: EffectType[] = [
  'AutoFilter', 'AutoPanner', 'AutoWah', 'BitCrusher', 'Chebyshev',
  'Chorus', 'Distortion', 'FeedbackDelay', 'JCReverb', 'FrequencyShifter',
  'Phaser', 'PingPongDelay', 'StereoWidener', 'PitchShift', 'Tremolo', 'Vibrato'
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
    case 'PitchShift': return new Tone.PitchShift({ wet: 0 });
    case 'Tremolo': return new Tone.Tremolo({ wet: 0 }).start();
    case 'Vibrato': return new Tone.Vibrato({ wet: 0 });
    default: return new Tone.Gain(1);
  }
}

export function updateEffectStrength(effect: Tone.ToneAudioNode, strength: number) {
  // Most effects have a 'wet' property.
  // @ts-ignore
  if (effect.wet) {
    // @ts-ignore
    effect.wet.value = strength; // 0 to 1
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
  'PitchShift': [
    { name: 'Pitch', key: 'pitch', min: -12, max: 12, step: 1, suffix: 'st' }
  ],
  'Tremolo': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Depth', key: 'depth', min: 0, max: 1, step: 0.05 }
  ],
  'Vibrato': [
    { name: 'Frequency', key: 'frequency', min: 0.1, max: 20, step: 0.1, suffix: 'Hz' },
    { name: 'Depth', key: 'depth', min: 0, max: 1, step: 0.05 }
  ]
};
