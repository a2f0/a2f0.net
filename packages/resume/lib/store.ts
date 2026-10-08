import { configureStore } from "@reduxjs/toolkit";

import resumeReducer from "./resumeConfigSlice";

export const store = configureStore({
  reducer: {
    resume: resumeReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
