import Color from "color";

import { useAppSelector } from "./hooks";
import type { ResumeConfig } from "./resumeConfig";
import {
  selectBackgroundColor,
  selectForegroundColor,
  selectHighlightColor,
} from "./resumeConfigSlice";

export const useResume = (): ResumeConfig => {
  const foregroundColor = useAppSelector(selectForegroundColor);
  const backgroundColor = useAppSelector(selectBackgroundColor);
  const highlightColor = useAppSelector(selectHighlightColor);

  return {
    foregroundColor: Color(foregroundColor),
    backgroundColor: Color(backgroundColor),
    highlightColor: Color(highlightColor),
  };
};
