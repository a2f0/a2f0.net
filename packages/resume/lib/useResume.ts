import { type ResumeConfig, toResumeConfig } from "@a2f0/shared/resumeConfig";

import { useAppSelector } from "./hooks";
import {
  selectBackgroundColor,
  selectForegroundColor,
  selectHighlightColor,
} from "./resumeConfigSlice";

export const useResume = (): ResumeConfig => {
  const foregroundColor = useAppSelector(selectForegroundColor);
  const backgroundColor = useAppSelector(selectBackgroundColor);
  const highlightColor = useAppSelector(selectHighlightColor);

  return toResumeConfig({ foregroundColor, backgroundColor, highlightColor });
};
