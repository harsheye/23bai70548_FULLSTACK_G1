import { configureStore } from '@reduxjs/toolkit';
import LogsReducer from './logSlice';

const store = configureStore({
    reducer: {
        logs: LogsReducer,
    }, 
});
export default store;