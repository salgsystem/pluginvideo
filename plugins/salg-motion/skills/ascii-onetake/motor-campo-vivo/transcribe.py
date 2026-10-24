import json, sys
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, info = m.transcribe(src, language="pt", word_timestamps=True, vad_filter=True)
words = []
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text.strip()}")
    for w in s.words:
        words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
json.dump(words, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
