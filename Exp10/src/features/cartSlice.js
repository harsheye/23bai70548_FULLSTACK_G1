import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: [],
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const existing = state.find(i => i.id === item.id);
      if (existing) existing.quantity += 1;
      else state.push({ ...item, quantity: 1 });
    },
    removeFromCart: (state, action) => {
      return state.filter(item => item.id !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.find(i => i.id === id);
      if (item) item.quantity = quantity;
    }
  }
});

export const { addToCart, removeFromCart, updateQuantity } = cartSlice.actions;
export default cartSlice.reducer;
