"""產生旁白語音（edge-tts 台灣中文聲線）、合併成單一音軌，並輸出時間軸 timing.js。
用法：python3 tools/build_audio.py   （需 pip install edge-tts，以及 ffmpeg）
"""
import asyncio, json, os, re, ssl, subprocess, wave, hashlib

import edge_tts
import edge_tts.communicate as _c

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "build", "tts")
CA = os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt"
if os.path.exists(CA):  # 讓 edge-tts 信任環境中的 proxy CA
    _c._SSL_CTX = ssl.create_default_context(cafile=CA)

VOICES = {
    "A": dict(voice="zh-TW-YunJheNeural", rate="+4%", pitch="+0Hz"),   # Allan：台灣男聲
    "R": dict(voice="zh-TW-HsiaoYuNeural", rate="+10%", pitch="+28Hz"),  # 阿拉蕾：活潑女聲
}
SR = 24000
PRE, GAP, POST = 0.8, 0.35, 1.0   # 場景開頭、句間、場景結尾留白（秒）


def speakable(t):
    t = t.replace("ISO 27001", "ISO 兩七零零一").replace("ISMS", "I S M S").replace("PIMS", "P I M S")
    t = t.replace("NAS", "N A S").replace("MDM", "M D M").replace("～", "，")
    return re.sub(r"\s+", " ", t)


def load_scenes():
    out = subprocess.check_output(["node", "-e", "const {SCENES}=require('./scenes.js');console.log(JSON.stringify(SCENES))"], cwd=ROOT)
    return json.loads(out)


async def tts(line, sem):
    v = VOICES[line["s"]]
    text = speakable(line["t"])
    key = hashlib.sha1(json.dumps([v, text], ensure_ascii=False).encode()).hexdigest()[:16]
    mp3 = os.path.join(CACHE, key + ".mp3")
    wav = os.path.join(CACHE, key + ".wav")
    if not os.path.exists(wav):
        async with sem:
            for attempt in range(4):
                try:
                    await edge_tts.Communicate(text, v["voice"], rate=v["rate"], pitch=v["pitch"]).save(mp3)
                    break
                except Exception as e:  # 網路偶發錯誤重試
                    if attempt == 3:
                        raise
                    await asyncio.sleep(2 ** attempt)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", str(SR),
                        "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                        wav], check=True)
    return wav


async def main():
    os.makedirs(CACHE, exist_ok=True)
    scenes = load_scenes()
    sem = asyncio.Semaphore(6)
    lines = [l for sc in scenes for l in sc["lines"]]
    wavs = await asyncio.gather(*(tts(l, sem) for l in lines))
    pcm = bytearray()
    sil = lambda sec: b"\x00\x00" * int(round(sec * SR))
    timing, k = [], 0
    for sc in scenes:
        start = len(pcm) / 2 / SR
        pcm += sil(PRE)
        lt = []
        for i, _ in enumerate(sc["lines"]):
            if i:
                pcm += sil(GAP)
            with wave.open(wavs[k]) as w:
                data = w.readframes(w.getnframes())
            ls = len(pcm) / 2 / SR
            pcm += data
            lt.append([round(ls, 3), round(len(pcm) / 2 / SR, 3)])
            k += 1
        pcm += sil(POST)
        timing.append({"start": round(start, 3), "end": round(len(pcm) / 2 / SR, 3), "lines": lt})
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    full = os.path.join(ROOT, "build", "narration.wav")
    with wave.open(full, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", full, "-c:a", "libmp3lame", "-b:a", "64k",
                    os.path.join(ROOT, "narration.mp3")], check=True)
    with open(os.path.join(ROOT, "timing.js"), "w", encoding="utf-8") as f:
        f.write("// 由 tools/build_audio.py 自動產生：每個場景與每句旁白在音軌中的起訖秒數\n")
        f.write("const TIMING = " + json.dumps(timing) + ";\n")
        f.write("if (typeof module !== 'undefined') module.exports = { TIMING };\n")
    print(f"lines={len(lines)} total={timing[-1]['end']:.1f}s")

asyncio.run(main())
