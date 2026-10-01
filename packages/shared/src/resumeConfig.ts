import Color from "color";

export interface ResumeConfig {
  foregroundColor: ReturnType<typeof Color>;
  backgroundColor: ReturnType<typeof Color>;
  highlightColor: ReturnType<typeof Color>;
}

/** The resume colors as hex strings, the form app state keeps them in. */
export interface ResumeColors {
  foregroundColor: string;
  backgroundColor: string;
  highlightColor: string;
}

export const toResumeConfig = ({
  foregroundColor,
  backgroundColor,
  highlightColor,
}: ResumeColors): ResumeConfig => ({
  foregroundColor: Color(foregroundColor),
  backgroundColor: Color(backgroundColor),
  highlightColor: Color(highlightColor),
});
