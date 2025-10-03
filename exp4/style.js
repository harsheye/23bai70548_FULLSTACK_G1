/* General page styling */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: #f4f6f9;
  color: #333;
}

/* App container */
.drawing-tool-app {
  max-width: 700px;
  margin: auto;
  text-align: center;
}

/* Heading */
.drawing-tool-app h1 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #2c3e50;
}

/* Controls */
.canvas-controls {
  margin-bottom: 15px;
}

.canvas-controls button {
  padding: 8px 16px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #3498db;
  color: white;
  transition: background 0.3s ease;
}

.canvas-controls button:hover {
  background: #217dbb;
}

/* SVG Canvas */
#canvas {
  border: 2px dashed #ccc;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0px 4px 10px rgba(0,0,0,0.05);
  cursor: crosshair;
  outline: none;
}
