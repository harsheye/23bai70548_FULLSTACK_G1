import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart, updateQuantity } from './features/cartSlice';

function App() {
  const cart = useSelector(state => state.cart);
  const dispatch = useDispatch();

  const handleAdd = () => {
    const newItem = { id: Date.now(), name: 'Product ' + Date.now() };
    dispatch(addToCart(newItem));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🛒 Redux Cart Example</h2>
      <button onClick={handleAdd}>Add Random Item</button>
      <ul>
        {cart.map(item => (
          <li key={item.id}>
            {item.name} — Qty: {item.quantity}
            <button onClick={() => dispatch(removeFromCart(item.id))}>Remove</button>
            <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}>+</button>
            <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))} disabled={item.quantity <= 1}>-</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
