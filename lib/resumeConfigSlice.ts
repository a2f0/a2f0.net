import {createSlice, PayloadAction, Slice} from '@reduxjs/toolkit';
import Color from 'color';

import {resumeConfiguration} from '../configuration';
import {RootState} from './store';

const {darkForegroundColor, darkBackgroundColor, darkHighlightColor} =
  resumeConfiguration;

export interface ResumeConfigState {
  foregroundColor: string;
  backgroundColor: string;
  highlightColor: string;
  scale: number;
}

const initialState: ResumeConfigState = {
  foregroundColor: darkForegroundColor,
  backgroundColor: darkBackgroundColor,
  highlightColor: darkHighlightColor,
  scale: 1.5,
};

export const resumeConfigSlice: Slice<ResumeConfigState> = createSlice({
  name: 'resume',
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

export const selectForegroundColor = (state: RootState) => {
  return state.resume.foregroundColor;
};

export const selectBackgroundColor = (state: RootState) => {
  return state.resume.backgroundColor;
};

export const selectHighlightColor = (state: RootState) => {
  return state.resume.highlightColor;
};

export const selectScale = (state: RootState) => {
  return state.resume.scale;
};

export default resumeConfigSlice.reducer;
