import { useState, useEffect, RefObject } from "react";

export interface VideoRect {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  ready: boolean; // メタデータ読み込み完了フラグ
}

/**
 * object-fit: contain の黒帯を除いた動画の実描画領域を返すフック。
 * ウィンドウ・コンテナのリサイズ時も自動で再計算する。
 */
export function useVideoRect(
  videoRef: RefObject<HTMLVideoElement | null>
): VideoRect {
  const [rect, setRect] = useState<VideoRect>({
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
    ready: false,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const calc = () => {
      const containerW = video.clientWidth;
      const containerH = video.clientHeight;
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      if (!videoW || !videoH || !containerW || !containerH) return;

      const containerAspect = containerW / containerH;
      const videoAspect = videoW / videoH;

      let renderW: number;
      let renderH: number;

      if (videoAspect > containerAspect) {
        // 横に合わせる → 上下に黒帯
        renderW = containerW;
        renderH = containerW / videoAspect;
      } else {
        // 縦に合わせる → 左右に黒帯
        renderH = containerH;
        renderW = containerH * videoAspect;
      }

      setRect({
        offsetX: (containerW - renderW) / 2,
        offsetY: (containerH - renderH) / 2,
        width: renderW,
        height: renderH,
        ready: true,
      });
    };

    video.addEventListener("loadedmetadata", calc);
    const ro = new ResizeObserver(calc);
    ro.observe(video);

    if (video.readyState >= 1) calc();

    return () => {
      video.removeEventListener("loadedmetadata", calc);
      ro.disconnect();
    };
  }, [videoRef]);

  return rect;
}