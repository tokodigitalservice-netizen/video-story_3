import React, { useEffect, useState, useRef } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import type { OverlayConfig } from "./types/overlay";

/**
 * 設定ファイルの「ファイル名」を解決する。
 *  1. URLパラメータ ?config=xxx
 *  2. 環境変数 VITE_OVERLAY_CONFIG
 *  3. フォールバック "main.json"
 */
function resolveConfigFileName(): string {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("config") ??
    import.meta.env.VITE_OVERLAY_CONFIG ??
    "main.json"
  );
}

/**
 * Cloudflare Workers エンドポイントから設定JSONをフェッチして返す。
 *
 * 環境変数:
 *   VITE_CF_ENDPOINT  … Cloudflare Workers のベースURL（必須）
 *                        例: https://my-worker.example.workers.dev
 *   VITE_CF_BASE_PATH … バケット内の固定フォルダパス（省略可）
 *                        例: videos/2024
 *
 * 実際のリクエスト先: {VITE_CF_ENDPOINT}/{VITE_CF_BASE_PATH}/{fileName}
 */
async function fetchConfigFromCloud(fileName: string): Promise<OverlayConfig> {
  const endpoint = import.meta.env.VITE_CF_ENDPOINT;
  const basePath = import.meta.env.VITE_CF_BASE_PATH ?? "";

  if (!endpoint) {
    throw new Error(
      "環境変数 VITE_CF_ENDPOINT が未設定です。Cloudflare Workers のエンドポイントを指定してください。"
    );
  }

  // 各パーツの前後スラッシュを正規化して結合
  const parts = [
    endpoint.replace(/\/$/, ""),
    basePath.replace(/^\/|\/$/g, ""),
    fileName.replace(/^\//, ""),
  ].filter(Boolean);

  const url = parts.join("/");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`設定ファイルの取得に失敗しました (HTTP ${res.status}): ${url}`);
  }

  return res.json() as Promise<OverlayConfig>;
}

// ── ローディングスピナー ──────────────────────────────────────
const LoadingSpinner: React.FC = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100vw",
    height: "100vh",
    background: "#000",
  }}>
    <div style={{
      width: 48,
      height: 48,
      border: "4px solid rgba(255,255,255,0.15)",
      borderTop: "4px solid #fff",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const App: React.FC = () => {
  const [config, setConfig] = useState<OverlayConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // コンポーネントアンマウント時にフェッチ結果を捨てるためのフラグ
    let cancelled = false;

    const fileName = resolveConfigFileName();

    fetchConfigFromCloud(fileName)
      .then((cfg) => {
        if (!cancelled) setConfig(cfg);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── 親ページからの resume を受信（孫モーダルを閉じたとき再生再開） ──
  // pause は OverlayButton 側で自己制御するためここでは受け取らない
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      const video = videoElRef.current;
      if (!video) return;

      if (data.type === "resume") video.play();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (error) {
    return (
      <div style={{ padding: 24, color: "red" }}>
        <strong>設定ファイルの読み込みエラー</strong>
        <pre>{error}</pre>
      </div>
    );
  }

  const isLoading = !config || !videoReady;

  return (
    <main>
      {isLoading && <LoadingSpinner />}
      {config && (
        <div style={{ visibility: isLoading ? "hidden" : "visible" }}>
          <VideoPlayer
            config={config}
            videoElRef={videoElRef}
            onVideoReady={() => setVideoReady(true)}
          />
        </div>
      )}
    </main>
  );
};

export default App;