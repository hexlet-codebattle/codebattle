#!/usr/bin/env python3
"""Synthesizes the game sound effects in static/audio/game/.

They share the voice of the tournament cues (static/audio/tournament/):
a sine with a faint second harmonic, linear fades, mono 44.1 kHz, peaks at 0.6.
Standard library only, so it runs anywhere:

    python3 scripts/generate_game_sounds.py
"""

import math
import struct
import wave
from pathlib import Path

RATE = 44_100
OUT = Path(__file__).resolve().parent.parent / "static" / "audio" / "game"

# Note frequencies (Hz), the same register as the tournament cues.
D5, E5, Gb5, G5, A5, B5 = 587.33, 659.26, 739.99, 783.99, 880.0, 987.77
C6, D6, E6, G6 = 1046.5, 1174.66, 1318.51, 1567.98
B4, Bb4, A4 = 493.88, 466.16, 440.0
E4, D4 = 329.63, 293.66


def phrase(notes, peak=0.6, harmonic=0.15):
    """Renders notes as (start_hz, end_hz, seconds, gap_after) into samples.

    Notes with no gap are played legato: one continuous oscillator whose pitch
    steps or glides, like the tournament arpeggio. A gap re-articulates the note.
    """
    out = []
    phase = 0.0
    groups, group = [], []
    for note in notes:
        group.append(note)
        if note[3] > 0:
            groups.append(group)
            group = []
    if group:
        groups.append(group)

    for index, group in enumerate(groups):
        total = sum(int(n[2] * RATE) for n in group)
        attack = min(int(0.012 * RATE), total // 4)
        last = index == len(groups) - 1
        # The final note rings out; inner notes get a short fade to stay crisp.
        release = int(min(0.35, total * 0.6) * RATE) if last else min(int(0.025 * RATE), total // 3)
        position = 0
        for start_hz, end_hz, seconds, _gap in group:
            count = int(seconds * RATE)
            for i in range(count):
                # Exponential glide sounds even across the range.
                hz = start_hz * (end_hz / start_hz) ** (i / count)
                phase += 2 * math.pi * hz / RATE
                gain = min(1.0, position / attack, (total - position) / release)
                out.append(peak * gain * (math.sin(phase) + harmonic * math.sin(2 * phase)) / (1 + harmonic))
                position += 1
        out.extend([0.0] * int(group[-1][3] * RATE))
        phase = 0.0

    out.extend([0.0] * int(0.02 * RATE))
    return out


def note(hz, seconds, gap=0.0, to=None):
    return (hz, to or hz, seconds, gap)


SOUNDS = {
    # Run tests: a quick, light upward blip.
    "check": phrase([note(G5, 0.06), note(C6, 0.09)], peak=0.45),
    # Tests passed: a bright staccato climb that lands on a held top note.
    "win": phrase(
        [
            note(G5, 0.08, 0.025),
            note(B5, 0.08, 0.025),
            note(D6, 0.08, 0.025),
            note(G6, 0.08),
            note(G6, 0.42, to=G6 * 1.003),
        ]
    ),
    # Tests failed: a soft, low double "bonk" — each note drops fast in pitch like a wooden thunk.
    # Short and unsentimental, since it fires on every failed run (give_up owns the sad slide).
    "failure": phrase([note(A4, 0.06, 0.05, to=E4), note(A4, 0.12, to=D4)], peak=0.6, harmonic=0.45),
    # Someone gave up: a slow legato slide down.
    "give_up": phrase([note(Gb5, 0.14), note(D5, 0.14), note(A4, 0.3, to=A4 * 0.94)], peak=0.55),
    # Time is over: an urgent triple beep, then a low closing tone.
    "time_is_over": phrase(
        [
            note(B5, 0.07, 0.05),
            note(B5, 0.07, 0.05),
            note(B5, 0.07, 0.07),
            note(E5, 0.36),
        ]
    ),
    # Game starts / opponent found: ready, ready, go.
    "round_created": phrase([note(E5, 0.08, 0.09), note(E5, 0.08, 0.09), note(E6, 0.3)]),
    # Private chat message: a soft two-tone chime.
    "message": phrase([note(D6, 0.06), note(G6, 0.16)], peak=0.4),
}


def write(name, samples):
    with wave.open(str(OUT / f"{name}.wav"), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(b"".join(struct.pack("<h", round(max(-1.0, min(1.0, s)) * 32767)) for s in samples))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, samples in SOUNDS.items():
        write(name, samples)
        print(f"{name}.wav  {len(samples) / RATE:.2f}s")
