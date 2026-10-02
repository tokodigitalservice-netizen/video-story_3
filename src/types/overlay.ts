/**
 * 制御JSONの型定義
 */

export type ButtonStyle = Record<string, string | number>;

export interface OverlayButton {
  id?: string;
  label: string;
  /**
   * "link"  : href に遷移（デフォルト）
   * "modal" : 親ページに postMessage で詳細動画モーダルを開かせる
   */
  type?: "link" | "modal";
  /** type: "link" の場合の遷移先URL */
  href?: string;
  target?: "_blank" | "_self";
  /** type: "modal" の場合の詳細動画設定ファイルパス */
  modalConfig?: string;
  /** @deprecated v2ではButtonGroupのtop/横位置は自動均等配置 */
  position?: {
    top: number;
    left: number;
  };
  style?: ButtonStyle;
  analyticsLabel?: string;
}

export interface ButtonGroup {
  showAt: number;
  hideAt?: number;
  top: number;
  buttons: OverlayButton[];
}

export interface OverlayConfig {
  version?: string;
  title?: string;
  videoSrc: string;
  videoType?: "cloudflare-stream" | "hls" | "mp4";
  buttonGroups: ButtonGroup[];
}