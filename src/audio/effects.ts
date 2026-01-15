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
