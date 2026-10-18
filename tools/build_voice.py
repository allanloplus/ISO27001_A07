"""產生互動闖關版（zone-game）與自由探索版（zone-explore）的對白語音。
用法：python3 tools/build_voice.py [zone-game|zone-explore]   （不加參數則兩版都產生；需 pip install edge-tts，以及 ffmpeg、node）
讀取 missions.js／spots.js 的所有對白，以與主課程相同的聲線產生語音，
輸出 <版本>/voice/*.mp3 與對照表 <版本>/voice.js。
"""
import asyncio, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_audio import ROOT, tts  # noqa: E402  與主課程共用語音設定與快取

COLLECT = {
    "zone-game": ("const {INTRO,FINALE,MISSIONS}=require('./missions.js');const L=[...INTRO,...FINALE];"
                  "for(const m of MISSIONS){L.push(...(m.intro||[]),...(m.outro||[]));"
                  "for(const s of m.steps)for(const it of s.run)if(it.talk)L.push(...it.talk);}"
                  "console.log(JSON.stringify(L))"),
    "zone-explore": ("const {EXPLORE_INTRO,ZONES_INFO,SPOTS}=require('./spots.js');const L=[...EXPLORE_INTRO];"
                     "for(const z in ZONES_INFO)L.push(...ZONES_INFO[z].lines);for(const s of SPOTS)L.push(...s.lines);"
                     "console.log(JSON.stringify(L))"),
}


async def build(name):
    game = os.path.join(ROOT, name)
    out_dir = os.path.join(game, "voice")
    lines, seen = [], set()
    for l in json.loads(subprocess.check_output(["node", "-e", COLLECT[name]], cwd=game)):
        key = l["s"] + "|" + l["t"]
        if key not in seen:
            seen.add(key)
            lines.append(l)
    sem = asyncio.Semaphore(6)
    wavs = await asyncio.gather(*(tts(l, sem) for l in lines))
    os.makedirs(out_dir, exist_ok=True)
    mapping = {}
    for l, wav in zip(lines, wavs):
        mp3 = os.path.splitext(os.path.basename(wav))[0] + ".mp3"
        dst = os.path.join(out_dir, mp3)
        if not os.path.exists(dst):  # 用去頭尾靜音後的音檔，對白一出現就開始說話
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "48k", dst], check=True)
        mapping[l["s"] + "|" + l["t"]] = "voice/" + mp3
    keep = {os.path.basename(v) for v in mapping.values()}
    for f in os.listdir(out_dir):
        if f.endswith(".mp3") and f not in keep:
            os.remove(os.path.join(out_dir, f))
    with open(os.path.join(game, "voice.js"), "w", encoding="utf-8") as f:
        f.write("// 由 tools/build_voice.py 自動產生：對白（說話者|台詞）→ 語音檔\n")
        f.write("const VOICE = " + json.dumps(mapping, ensure_ascii=False, indent=0) + ";\n")
    print(f"{name}: lines={len(lines)} files={len(keep)}")


async def main():
    targets = [a.strip("/") for a in sys.argv[1:]] or list(COLLECT)
    for name in targets:
        await build(name)


if __name__ == "__main__":
    asyncio.run(main())
