import { useState, useEffect } from "react";
import type { ButtonGroup } from "../components/OverlayButton";

export const useVideoOverlay = (
  videoRef: React.RefObject<HTMLVideoElement>,
  buttonGroups: ButtonGroup[]
) => {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const newVisibleIds = new Set<string>();

      buttonGroups.forEach(group => {
        const groupVisible =
          currentTime >= group.showAt &&
          (group.hideAt === undefined || currentTime < group.hideAt);
        if (groupVisible) {
          group.buttons.forEach(btn => {
            if (btn.id) newVisibleIds.add(btn.id);
          });
        }
      });

      setVisibleIds(newVisibleIds);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [videoRef, buttonGroups]);

  return visibleIds;
};