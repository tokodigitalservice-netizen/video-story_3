import React from "react";
import styles from "./EndedOverlay.module.css";

interface Props {
  onReplay: () => void;
}

export const EndedOverlay: React.FC<Props> = ({ onReplay }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <button className={styles.replayBtn} onClick={onReplay}>
          ↺ もう一度見る
        </button>
      </div>
    </div>
  );
};