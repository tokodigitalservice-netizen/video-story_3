// ============================================================
// 呼び出し側コンポーネント例（VideoOverlay.tsx）
// ============================================================
//
// main.json を fetch して buttonGroups を渡すだけで動作する。
// visible 判定: showAt <= currentTime < hideAt

import React, { useEffect, useRef, useState } from "react";
import { OverlayButtonGroup } from "./OverlayButton";
import type { OverlayConfig } from "./OverlayButton";

export const VideoOverlay: React.FC<{ configUrl: string }> = ({ configUrl }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [config, setConfig] = useState<OverlayConfig | null>(null);

  // コンフィグ読み込み
  useEffect(() => {
    fetch(configUrl)
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error);
  }, [configUrl]);

  // 再生時間の追跡
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  if (!config) return null;

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={videoRef}
        src={config.videoSrc}
        style={{ width: "100%", display: "block" }}
        controls
      />

      {config.buttonGroups.map((group, i) => {
        const visible =
          currentTime >= group.showAt &&
          (group.hideAt === undefined || currentTime < group.hideAt);

        return (
          <OverlayButtonGroup
            key={i}
            group={group}
            visible={visible}
            videoRef={videoRef}
          />
        );
      })}
    </div>
  );
};

// ============================================================
// main.json の構造（参考）
// ============================================================
//
// {
//   "version": "2.0",
//   "videoSrc": "https://...",
//   "buttonGroups": [
//     {
//       "showAt": 9,          ← 表示開始秒
//       "hideAt": 19,         ← 非表示秒（省略可）
//       "top": 74,            ← 縦位置 %（グループで一括指定）
//       "buttons": [          ← 2つ → 自動で [25%, 75%] に配置
//         {
//           "id": "btn-intro-cta-left",
//           "label": "",
//           "href": "...",
//           "modalConfig": "/sub.json",
//           "type": "modal",
//           "target": "_blank",
//           "analyticsLabel": "intro_cta_left",
//           "style": {
//             "backgroundImage": "url('1.png')",
//             "width": "35vw%",   ← calc(var(--vw) * 0.35) に変換される
//             "height": "35vh%",
//             ...
//           }
//         },
//         { ... }
//       ]
//     }
//   ]
// }
