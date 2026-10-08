import { createSlice, type PayloadAction, type Slice } from "@reduxjs/toolkit";
import Color from "color";

import { resumeConfiguration } from "@a2f0/shared/configuration";

const { darkForegroundColor, darkBackgroundColor, darkHighlightColor } =
  resumeConfiguration;

interface ResumeConfigState {
  foregroundColor: string;
  backgroundColor: string;
  highlightColor: string;
  scale: number;
}

// The store's state as the selectors read it. The store imports this slice,
// so naming its RootState here would close an import cycle.
interface ResumeRootState {
  resume: ResumeConfigState;
}

const initialState: ResumeConfigState = {
  foregroundColor: darkForegroundColor,
  backgroundColor: darkBackgroundColor,
  highlightColor: darkHighlightColor,
  scale: 1.5,
};

const resumeConfigSlice: Slice<ResumeConfigState> = createSlice({
  name: "resume",
  initialState,
  reducers: {
    setForegroundColor: (state, action: PayloadAction<string>) => {
      state.foregroundColor = Color(action.payload).hex();
    },
    setBackgroundColor: (state, action: PayloadAction<string>) => {
      state.backgroundColor = Color(action.payload).hex();
    },
    setHighlightColor: (state, action: PayloadAction<string>) => {
      state.highlightColor = Color(action.payload).hex();
    },
    setScale: (state, action: PayloadAction<number>) => {
      state.scale = action.payload;
    },
  },
});

export const {
  setBackgroundColor,
  setForegroundColor,
  setHighlightColor,
  setScale,
} = resumeConfigSlice.actions;

export const selectForegroundColor = (state: ResumeRootState) => {
  return state.resume.foregroundColor;
};

export const selectBackgroundColor = (state: ResumeRootState) => {
  return state.resume.backgroundColor;
};

export const selectHighlightColor = (state: ResumeRootState) => {
  return state.resume.highlightColor;
};

export const selectScale = (state: ResumeRootState) => {
  return state.resume.scale;
};

export default resumeConfigSlice.reducer;
