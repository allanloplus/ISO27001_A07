# ISO 27001:2022 實體安全（Physical security）動畫教學簡報

以 ISO/IEC 27001:2022 附錄A 控制屬性「運作流程（Operational capabilities）＝實體安全」為範圍，
涵蓋 **區域安全 7.1～7.6** 與 **設備安全 5.37、6.7、7.7～7.14**，從三個面向講解：

1. **ISMS 作業重點**：區域安全、設備安全逐條重點＋兩個管理實務案例（裝修期間機房門被撐開、業務筆電車上失竊）
2. **稽核查核重點**：稽核員四個工具、逐條查核清單、私房查核技巧、「追一台硬碟的一生」
3. **常見的缺失**：TOP 10 常見缺失、不符合事項寫法範例（以 7.14 為例）、隨堂測驗與總結

由 Q 版講師 **Allan Lo**（台灣男聲）主講，助教 **阿拉蕾** 串場，全長約 13 分鐘。

## 檔案

| 檔案 | 說明 |
|---|---|
| `video/ISO27001_實體安全_動畫簡報.mp4` | 完整教學影片（1280×720，含旁白） |
| `index.html` | 互動播放版：可暫停、拖曳進度、章節跳轉（需與下列檔案放在同一資料夾，用瀏覽器開啟） |
| `scenes.js` | 場景內容與旁白腳本（修改講稿就改這裡） |
| `timing.js` / `narration.mp3` | 由腳本自動產生的時間軸與旁白音軌 |
| `tools/build_audio.py` | 以 edge-tts 產生語音（Allan：`zh-TW-YunJheNeural`；阿拉蕾：`zh-TW-HsiaoYuNeural`） |
| `tools/render_video.cjs` | 用 Playwright 逐格渲染並以 ffmpeg 合成 MP4 |

## 修改講稿後重新產生

```bash
pip install edge-tts                      # 需要 ffmpeg、node 與 playwright
python3 tools/build_audio.py              # 重新產生旁白與 timing.js
python3 -m http.server 8765 &             # 本機提供檔案
node tools/render_video.cjs http://localhost:8765/index.html video/輸出.mp4 15
```

`scenes.js` 每句台詞的欄位：`s` 說話者（`A` Allan／`R` 阿拉蕾）、`t` 台詞、`r` 顯示到第幾個項目、`h` 強調第幾個項目、`e` 表情（`wow`／`think`）。

> 角色為原創 Q 版插畫；「阿拉蕾」為助教暱稱，造型未複製任何既有動畫角色。
