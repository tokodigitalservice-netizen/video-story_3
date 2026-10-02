import React, { useRef, useState, useEffect, RefObject } from "react";
import { OverlayButtonGroup } from "./OverlayButton";
import { EndedOverlay } from "./EndedOverlay";
import { useVideoOverlay } from "../hooks/useVideoOverlay";
import { useVideoRect } from "../hooks/useVideoRect";
import type { OverlayConfig } from "../types/overlay";
import styles from "./VideoPlayer.module.css";

interface Props {
  config: OverlayConfig;
  videoElRef?: RefObject<HTMLVideoElement | null>;
  onVideoReady?: () => void;
}

export const VideoPlayer: React.FC<Props> = ({ config, videoElRef, onVideoReady }) => {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (videoElRef ?? internalRef) as RefObject<HTMLVideoElement>;
  const visibleIds = useVideoOverlay(videoRef, config.buttonGroups);
  const videoRect = useVideoRect(videoRef);
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [metaReady, setMetaReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => setMetaReady(true);
    if (video.readyState >= 1) {
      setMetaReady(true);
    } else {
      video.addEventListener("loadedmetadata", onMeta, { once: true });
      return () => video.removeEventListener("loadedmetadata", onMeta);
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onVideoReady) return;
    if (video.readyState >= 1) {
      onVideoReady();
    } else {
      video.addEventListener("loadedmetadata", onVideoReady, { once: true });
      return () => video.removeEventListener("loadedmetadata", onVideoReady);
    }
  }, [videoRef, onVideoReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => {
      setPlaying(true);
      // ネイティブの再生ボタン・postMessage("resume")・独自ボタンなど、
      // 再開手段を問わず "play" イベントは必ず発火するのでここで確実に消す
      setEnded(false);
    };
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    setEnded(false);
    video.currentTime = 0;
    video.play();
  };
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);

    // 画面サイズ変更を通知してボタン位置を再計算させる
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
  };

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}>
      <video
        ref={videoRef}
        controls={!playing && !isFullscreen}
        src={config.videoSrc}
        className={styles.video}
        onEnded={() => setEnded(true)}
        playsInline
        webkit-playsinline="true"
      />

      {/* 常に最前面に置く透明クリックレイヤー（再生中のみ）。ボタンより下のz-indexにする */}
      {playing && !ended && videoRect.ready && (
        <div
          style={{
            position: "absolute",
            left: videoRect.offsetX,
            top: videoRect.offsetY,
            width: videoRect.width,
            height: videoRect.height,
            zIndex: 1,
          }}
          onClick={togglePlay}
        />
      )}

      {/* 再生ボタン：未再生・一時停止中のみ表示 */}
      {metaReady && !playing && !ended && videoRect.ready && (
        <div
          className={styles.playOverlay}
          style={{
            left: videoRect.offsetX,
            top: videoRect.offsetY,
            width: videoRect.width,
            height: videoRect.height,
            zIndex: 2,
          }}
          onClick={togglePlay}
        >
          <div className={styles.playButton}>▶</div>
        </div>
      )}

      {/* オーバーレイボタン群：z-indexを透明レイヤーより上に */}
      {videoRect.ready && (() => {
        const padX = videoRect.width * 0.10;
        const buttonAreaW = videoRect.width - padX * 2;
        return (
          <div
            className={styles.overlayLayer}
            style={{
              left: videoRect.offsetX + padX,
              top: videoRect.offsetY,
              width: buttonAreaW,
              height: videoRect.height,
              ["--vw" as string]: `${buttonAreaW}px`,
              ["--vh" as string]: `${videoRect.height}px`,
              zIndex: 3,
              pointerEvents: "none", // コンテナ自体はクリック透過
            }}
          >
            {ended && <EndedOverlay onReplay={handleReplay} />}
            {!ended && config.buttonGroups.map((group, i) => {
              const visible = visibleIds.has(
                group.buttons.find(btn => btn.id)?.id ?? ""
              );
              return (
                <div key={i} style={{ pointerEvents: "auto" }}>
                  <OverlayButtonGroup
                    group={group}
                    visible={visible}
                    videoRef={videoRef}
                  />
                </div>
              );
            })}
          </div>
        );
      })()}
      <button
        type="button"
        className={styles.fullscreenBtn}
        onClick={toggleFullscreen}
      >
        {isFullscreen ? '元のサイズに戻す' : '全画面表示'}
      </button>
    </div>
  );
};
