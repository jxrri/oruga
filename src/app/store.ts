import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '@/api/baseApi';
import auth from '@/features/auth/authSlice';
import filtros from '@/features/filtros/filtrosSlice';
import vistaTimeline from '@/features/planificador/vistaSlice';
import ui from './uiSlice';

export const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer, auth, filtros, vistaTimeline, ui },
  middleware: (gdm) => gdm().concat(api.middleware),
  devTools: { name: 'Oruga' },
});

setupListeners(store.dispatch);

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
