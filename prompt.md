Use the Tone.js library to create a playable musical instrument React Typescript web app that meets the following requirements:

1) A playable, hexagonal pad with a dark, minimal, futuristic aesthetic that allows the user to drag their finger and produce sound. The UI should be sleek, minimal, uncluttered, and understated.  

2) Inspired by the theremin: dragging a finger/cursor up and down affects volume (higher = louder, lower = quieter), and dragging left/right controls pitch. The sound continues playing if the user’s finger goes outside the hexagon; the listening area for pitch/volume is square, while the app visually renders a hexagon.  

3) A small circular badge can be dragged around; its distance to any one side of the hexagon dictates the strength of one of six parameters chosen by the user.  

4) Each side of the hexagon has a dropdown menu allowing the user to independently assign one of the following Tone.js parameters:  
- AutoFilter, AutoPanner, AutoWah, BitCrusher, Chebyshev, Chorus, Distortion, FeedbackDelay, JCReverb, FrequencyShifter, Phaser, PingPongDelay, StereoWidener, PitchShift, Tremolo, Vibrato  

5) Duplicate parameters are not allowed. The hexagon should always have six unique parameters, and the UI should grey out options that are already selected.  

6) Works and looks great on all screen sizes, including mobile.  

7) Dynamic visual feedback:  
- Subtle trail scales proportionally to finger movement speed.  
- Each hex side has a chromatic color; the visual feedback reflects the average color based on the finger position.  
- The effects badge changes color based on its position in the hexagon.  
- A waveform representing the audio being played is rendered below the hexagon in an aesthetically pleasing way that represents the real time colors of the current sound(s).
- Colors and waveform update in real time as the user moves their fingers.  

8) The user can move the effects badge and play the instrument at the same time.  

9) Built-in debug GUI displaying real-time values for pitch, volume, and each of the six parameters on the hexagon.  

10) Supports multi-touch: up to 10 simultaneous notes on devices that allow multiple touches. Each touch independently controls pitch/volume, while the badge modulates parameters globally.  

11) Pitch range of the hexagon can be set from 1 to 5 octaves.  

12) Horizontal scale on the hexagon shows subtle indications for the root note and notches for the notes in between. It should be easy to place two fingers to create harmonies, and this updates when the octave range changes.  

13) A dial allows the user to set the root note to any chromatic note (C by default).  

14) Instrument voices built with Tone.js (default = Sine):  
- Sine, Triangle, Sawtooth, Square, Pulse, FMSynth, AMSynth, PluckSynth, MembraneSynth, Noise + Filter 

15) The app should remain smooth at 60fps even with multiple touches, visual trails, and effects active, and the sound should respond smoothly like a theremin, with continuous, glitch-free pitch and volume changes.

16) We should have a 4 track recorder that allows the user to record, mix, and play along with their own loops. The looper should have a toggle for “Ghost Notes” which toggles a render of where the touches were when the loops were recorded. We should be able to set the volume of each of the 4 channels independently with sliders. The user should be able to tap to start and stop recording the loop; this must be highly responsive for good looping.


#2

The UI is looking nice and we have basic functionality. I can tap with 10 fingers, I can play notes in different voices, the octave and root note controls all work—great! However, we have some major issues:\
\
1) The top and bottom hexagon dropdown menus to select parameter are cut off and I can’t see or change them\
\
2) I can’t see the debug values, they’re hidden behind the recorder.\
\
3) All the effects are initialized to none. None shouldn’t be an option. They should always have six unique parameters. Pick any defaults

4) I would describe this aesthetic as more ’80’s retro’ than sleek and futuristic. Can you do an overhaul on the styling to meet this requirement?\
\
5) I see the icons for our 4 track recorder, but it’s not functional, other than seeing some colors change. It should be a fully functional four track that allows the user to mix each channel after recording. It should have  buttons that allows the user to start and stop looping recording and playback with a tap.

#3

Better, still some major issues though:

1) The looper is still non-functional. We have sliders now and the UI looks better, but after I press record, play something, and press again to stop, it just looks like nothing happened. I should be able to press play and hear back what I played

2) The looper should have a “Ghost Notes” toggle which will render a visual playback of the notes that were played during the recording so the user can ‘play along’ visually as well as aurally. Bonus points if each of the 4 tracks’ ghost notes are visually distinct somehow.

3) The UI looks great on my iPad, but terrible on my iPhone. The menus cover up almost the entire screen. The dropdown menu boxes to set the parameters for each side of the hexagon are cut off. Even on my iPad, the upper left is cut off by the “Synth Engine” modal. It should look and work great on all screens.

4) Some of the effects don’t seem to do anything, for example Feedback/Delay seems to have no effect despite its value updating in the debug Telemetry modal.

#4
Getting there! Some issues:

1) The layout on mobile looks better, but now I can’t see the “Telemetry” / debug information anymore. I should be able to see it when I need to on mobile, try making it a collapsible menu.

2) The bottom of the recorder is cut off on both iPad and mobile (looks good on my laptop)

3) And the major issue: As far as I can tell, the 4-Track Loop recorder is not functional. I see the toggle for the ghost notes now and can occasionally get it to look like it’s recording (this is buggy), but it doesn’t seem to save anything and I can’t playback a recording or see ghost notes

#5
Hmmm, that didn’t seem to help much. Our issues:

1) The recorder/looper is still not functional.
2) The recording mechanism is unclear: when I press record and it seems to be recording, the play button becomes clickable in some instances. However, clicking it doesn’t play anything and clicking record again disables the play button (this was inconsistent). The first recording should set the loop length with the user clicking twice, then the user can record over that loop on the other 3 channels.
3) The layout of the recorder actually got worse. Now I can scroll through it (undesirable).
4) I’m noticing that the dynamic visual feedback requested in the original prompt wasn’t implemented. The waveform doesn’t dynamically change color based on note position, and neither do the dots below my fingers (although it’s hard to tell), they should have colorful, dynamic trails based on how fast the finger/cursor moves.\
5) The dial to select any root note became a clickable menu\
6) The horizontal scale doesn’t change when the user adjusts the octave range. Also that slider should say “Octave Range” not just “Octave”