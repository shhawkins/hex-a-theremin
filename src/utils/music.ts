export type ScaleType = 'chromatic' | 'major' | 'minor' | 'pentatonicMajor' | 'pentatonicMinor' | 'blues';
export type ChordType = 'off' | 'triad' | 'seventh';

export const SCALES: Record<ScaleType, { name: string; intervals: number[] }> = {
    chromatic: { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    major: { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
    minor: { name: 'Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
    pentatonicMajor: { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
    pentatonicMinor: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
    blues: { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] }
};

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNearestScaleNote(semitonesFromRoot: number, scaleType: ScaleType): number {
    const scale = SCALES[scaleType];
    const octave = Math.floor(semitonesFromRoot / 12);
    const noteIndex = Math.round(semitonesFromRoot % 12);
    const normalizedIndex = noteIndex < 0 ? noteIndex + 12 : noteIndex;

    // Find nearest interval
    let minDiff = Infinity;
    let nearestInterval = 0;

    for (const interval of scale.intervals) {
        const diff = Math.abs(normalizedIndex - interval);
        if (diff < minDiff) {
            minDiff = diff;
            nearestInterval = interval;
        }
    }

    return octave * 12 + nearestInterval;
}

export function quantizeFrequency(
    freq: number,
    rootFreq: number,
    scaleType: ScaleType
): number {
    if (scaleType === 'chromatic') return freq;

    // Calculate semitones from root
    // freq = root * 2^(semitones/12)
    // semitones = 12 * log2(freq / root)
    const semitonesEx = 12 * Math.log2(freq / rootFreq);

    const quantizedSemitones = getNearestScaleNote(semitonesEx, scaleType);


    return rootFreq * Math.pow(2, quantizedSemitones / 12);
}

export function getChordFrequencies(
    baseFreq: number,
    rootFreq: number,
    scaleType: ScaleType,
    chordType: ChordType
): number[] {
    if (chordType === 'off' || scaleType === 'chromatic') return [baseFreq];

    // 1. Determine the scale degree of the base note
    const semitonesFromRoot = 12 * Math.log2(baseFreq / rootFreq);
    // Normalize to 0-11
    const quantizedSemitones = getNearestScaleNote(semitonesFromRoot, scaleType);

    // Get scale intervals
    const intervals = SCALES[scaleType].intervals;

    // Use quantized semitones for chord calculation
    const currentOctave = Math.floor(quantizedSemitones / 12);
    const baseNoteIndex = Math.round(quantizedSemitones % 12); // approx
    // Find closest scale interval
    let intervalIndex = -1;
    let minDiff = 100;

    // Simple approach: Iterate scale intervals to find match (modulo 12)
    const normBaseMod = ((baseNoteIndex % 12) + 12) % 12;

    // Find the scale step index
    intervals.forEach((val, idx) => {
        if (Math.abs(val - normBaseMod) < minDiff) {
            minDiff = Math.abs(val - normBaseMod);
            intervalIndex = idx;
        }
    });

    if (intervalIndex === -1) return [baseFreq];

    // Generate chord degrees (1, 3, 5, 7)
    // For triad: 0, +2, +4 (indexes in scale)
    // For 7th: 0, +2, +4, +6

    const chordOffsets = chordType === 'triad' ? [0, 2, 4] : [0, 2, 4, 6];

    const freqs = chordOffsets.map(offset => {
        // Calculate effective index
        const totalIndex = intervalIndex + offset;
        const effectiveIntervalIndex = totalIndex % intervals.length;
        const octaveShift = Math.floor(totalIndex / intervals.length);

        const scaleInterval = intervals[effectiveIntervalIndex];
        // semitones = scaleInterval + (currentOctave + octaveShift) * 12
        const totalSemitones = scaleInterval + (currentOctave + octaveShift) * 12;

        return rootFreq * Math.pow(2, totalSemitones / 12);
    });

    return freqs;
}
