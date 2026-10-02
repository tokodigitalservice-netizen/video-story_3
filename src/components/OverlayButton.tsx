import React from "react";
import type { OverlayButton as OverlayButtonType, ButtonStyle } from "../types/overlay";
import styles from "./OverlayButton.module.css";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/**
 * 同じタイミングで出現するボタンをまとめたグループ。
 * - `showAt`  : 動画開始後の表示開始秒数
 * - `hideAt`  : 動画開始後の非表示秒数（省略時は動画終了まで表示）
 * - `top`     : 縦位置（画面高さに対する %）
 * - `buttons` : このタイミングで出現するボタンの配列
 *               横位置は自動均等配置されるため、各ボタンに left は不要
 */
export interface ButtonGroup {
  showAt: number;
  hideAt?: number;
  top: number;
  buttons: OverlayButtonType[];
}

/**
 * JSON の buttonGroups 配列全体を含むルート型。
 * VideoOverlay 等でコンフィグを丸ごと受け取る場合に使用する。
 */
export interface OverlayConfig {
  version?: string;
  title?: string;
  videoSrc: string;
  videoType?: string;
  buttonGroups: ButtonGroup[];
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * "20vw%" → calc(var(--vw) * 0.20)
 * "15vh%" → calc(var(--vh) * 0.15)
 *
 * fontSize 等でオブジェクト指定 { min, scale, max }（単位: px）が来た場合は
 * 動画実寸（--vw）を基準にした clamp() を組み立てる。
 *   { min: 8, scale: 0.018, max: 24 }
 *   → clamp(8px, calc(var(--vw) * 0.018), 24px)
 * ブラウザの vw/vh を直接使わないため、ウィンドウサイズを変えても
 * 動画に対する見た目の比率が常に一定になる。
 */
type ScaledSize = { min: number; scale: number; max: number; axis?: "vw" | "vh" };

function isScaledSize(value: unknown): value is ScaledSize {
  return (
    typeof value === "object" &&
    value !== null &&
    "min" in value &&
    "scale" in value &&
    "max" in value
  );
}

function resolveStyle(style: ButtonStyle | undefined): React.CSSProperties {
  if (!style) return {};
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(style)) {
    if (isScaledSize(value)) {
      const axisVar = value.axis === "vh" ? "--vh" : "--vw";
      result[key] = `clamp(${value.min}px, calc(var(${axisVar}) * ${value.scale}), ${value.max}px)`;
    } else if (typeof value === "string") {
      if (value.endsWith("vw%")) {
        result[key] = `calc(var(--vw) * ${parseFloat(value) / 100})`;
      } else if (value.endsWith("vh%")) {
        result[key] = `calc(var(--vh) * ${parseFloat(value) / 100})`;
      } else {
        result[key] = value;
      }
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as React.CSSProperties;
}

/**
 * n 個のボタンを画面中央基点で均等配置するときの left (%) を返す。
 *
 * 仕組み:
 *   スロット幅 = 100% / n
 *   i 番目の中心 = slotWidth * i + slotWidth / 2
 *               = slotWidth * (i + 0.5)
 *
 * 例) n=1 → [50%]
 *     n=2 → [25%, 75%]
 *     n=3 → [16.7%, 50%, 83.3%]
 */
function calcLeftPercents(n: number): number[] {
  const slotWidth = 100 / n;
  return Array.from({ length: n }, (_, i) => slotWidth * (i + 0.5));
}

// ---------------------------------------------------------------------------
// 単体ボタン（内部用）
// ---------------------------------------------------------------------------

interface SingleButtonProps {
  button: OverlayButtonType;
  visible: boolean;
  /** 親グループが計算した left (%) */
  leftPercent: number;
  /** 親グループが持つ top (%) */
  topPercent: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

const SingleButton: React.FC<SingleButtonProps> = ({
  button,
  visible,
  leftPercent,
  topPercent,
  videoRef,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (button.analyticsLabel) {
      console.info("[overlay click]", button.analyticsLabel);
    }

    if (button.type === "modal") {
      e.preventDefault();

      if (window.parent === window) {
        // 直リンク：新タブで開く（子は再生継続）
        const configPath = button.modalConfig ?? button.href;
        if (configPath) {
          const url = `https://video-story.pages.dev/?config=${encodeURIComponent(configPath)}`;
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } else {
        // iframe埋め込み（モーダル）：自分で pause してから親に委譲
        videoRef?.current?.pause();
        window.parent.postMessage(
          { type: "open-detail-modal", config: button.modalConfig },
          "*"
        );
      }
      return;
    }

    // type: "link"（デフォルト）
    if (button.target === "_self") {
      e.preventDefault();
      window.location.href = button.href ?? "";
    }
  };

  const resolvedStyle = resolveStyle(button.style);

  return (
    <a
      href={button.href ?? "#"}
      target={button.target ?? "_blank"}
      rel={button.target === "_blank" ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      className={[styles.btn, visible ? styles.visible : styles.hidden].join(" ")}
      style={{
        top: `${topPercent}%`,
        left: `${leftPercent}%`,
        ...resolvedStyle,
        transform: "translateX(-50%, -50%)", // 中心合わせ（resolvedStyleによる上書きを防ぐため最後に指定 Xだけでなく Y も中心合わせに）
      }}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      {button.label}
    </a>
  );
};

// ---------------------------------------------------------------------------
// グループコンポーネント（公開）
// ---------------------------------------------------------------------------

interface GroupProps {
  group: ButtonGroup;
  visible: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

/**
 * 同タイミングのボタン群を画面中央基点・均等配置でレンダリングする。
 * position は絶対値なので、親要素が `position: relative` であること。
 */
export const OverlayButtonGroup: React.FC<GroupProps> = ({
  group,
  visible,
  videoRef,
}) => {
  const lefts = calcLeftPercents(group.buttons.length);

  return (
    <>
      {group.buttons.map((button, i) => (
        <SingleButton
          key={button.analyticsLabel ?? i}
          button={button}
          visible={visible}
          leftPercent={lefts[i]}
          topPercent={group.top}
          videoRef={videoRef}
        />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// 後方互換：単体ボタン直接利用（既存コードが OverlayButton を参照している場合）
// ---------------------------------------------------------------------------

interface LegacyProps {
  button: OverlayButtonType;
  visible: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

/**
 * @deprecated グループ管理に移行してください。`OverlayButtonGroup` を使用してください。
 * position.left / position.top をそのまま使う後方互換ラッパー。
 */
export const OverlayButton: React.FC<LegacyProps> = ({ button, visible, videoRef }) => (
  <SingleButton
    button={button}
    visible={visible}
    leftPercent={button.position?.left ?? 50}
    topPercent={button.position?.top ?? 50}
    videoRef={videoRef}
  />
);