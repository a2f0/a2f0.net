import {type Action, configureStore, type ThunkAction} from '@reduxjs/toolkit';

import resumeReducer from './resumeConfigSlice';

export const store = configureStore({
  reducer: {
    resume: resumeReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
