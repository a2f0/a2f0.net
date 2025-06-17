import type Color from "color";

export interface ResumeConfig {
  foregroundColor: ReturnType<typeof Color>;
  backgroundColor: ReturnType<typeof Color>;
  highlightColor: ReturnType<typeof Color>;
}
