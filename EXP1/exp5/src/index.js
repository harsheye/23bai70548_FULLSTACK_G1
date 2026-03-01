import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { AuthProvider } from "./context/AuthContext";
import { Provider } from "react-redux";
import store from "./store/store";
import './index.css';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div style={{ color: 'red', fontSize: 32, textAlign: 'center', margin: '2rem' }}>
      If you see this message, React is mounting!
    </div>
    <Provider store={store}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Provider>
  </StrictMode>,
);