import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import logs from '../data/logs';

export const fetchLogs = createAsyncThunk(
    "logs/fetchLogs",
    async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return logs;
    }
)

const logSlice = createSlice({
    name: "logs", 
    initialState: {
        data: [],
        status: "idle",
        error: null,
    }, 
    reducers: {
        refreshLogs: (state) => {
            state.status = "loading";
            state.error = null;
        }
    }, 
    extraReducers:(builder) => {
        builder
        .addCase(fetchLogs.pending, (state) => {
            state.status = "loading"; 
        } ).addCase(fetchLogs.fulfilled, (state, action) => {
            state.status = "success"; 
            state.data = action.payload; 
        }).addCase(fetchLogs.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error.message;
        })
    }
})

export const { refreshLogs } = logSlice.actions;
export default logSlice.reducer;