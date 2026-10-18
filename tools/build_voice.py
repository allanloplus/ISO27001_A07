"""產生互動闖關版（zone-game）的對白語音。
用法：python3 tools/build_voice.py   （需 pip install edge-tts，以及 ffmpeg、node）
讀取 zone-game/missions.js 的所有對白，以與主課程相同的聲線產生語音，
輸出 zone-game/voice/*.mp3 與對照表 zone-game/voice.js。
"""
import asyncio, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_audio import ROOT, tts  # noqa: E402  與主課程共用語音設定與快取

GAME = os.path.join(ROOT, "zone-game")
OUT = os.path.join(GAME, "voice")
COLLECT = ("const {INTRO,FINALE,MISSIONS}=require('./missions.js');const L=[...INTRO,...FINALE];"
           "for(const m of MISSIONS){L.push(...(m.intro||[]),...(m.outro||[]));"
           "for(const s of m.steps)for(const it of s.run)if(it.talk)L.push(...it.talk);}"
           "console.log(JSON.stringify(L))")


async def main():
    lines, seen = [], set()
    for l in json.loads(subprocess.check_output(["node", "-e", COLLECT], cwd=GAME)):
        key = l["s"] + "|" + l["t"]
        if key not in seen:
            seen.add(key)
            lines.append(l)
    sem = asyncio.Semaphore(6)
    wavs = await asyncio.gather(*(tts(l, sem) for l in lines))
    os.makedirs(OUT, exist_ok=True)
    mapping = {}
    for l, wav in zip(lines, wavs):
        name = os.path.splitext(os.path.basename(wav))[0] + ".mp3"
        dst = os.path.join(OUT, name)
        if not os.path.exists(dst):  # 用去頭尾靜音後的音檔，對白一出現就開始說話
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "48k", dst], check=True)
        mapping[l["s"] + "|" + l["t"]] = "voice/" + name
    keep = {os.path.basename(v) for v in mapping.values()}
    for f in os.listdir(OUT):
        if f.endswith(".mp3") and f not in keep:
            os.remove(os.path.join(OUT, f))
    with open(os.path.join(GAME, "voice.js"), "w", encoding="utf-8") as f:
        f.write("// 由 tools/build_voice.py 自動產生：對白（說話者|台詞）→ 語音檔\n")
        f.write("const VOICE = " + json.dumps(mapping, ensure_ascii=False, indent=0) + ";\n")
    print(f"lines={len(lines)} files={len(keep)}")


if __name__ == "__main__":
    asyncio.run(main())
