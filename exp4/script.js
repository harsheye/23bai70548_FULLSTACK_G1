const svg = document.getElementById('canvas');
let drawings = [];

// Draw circle on canvas click/tap
svg.addEventListener('mousedown', drawCircle);
svg.addEventListener('touchstart', drawCircleTouch, { passive: false });

function drawCircle(e) {
  const { offsetX, offsetY } = e;
  addCircle(offsetX, offsetY);
}

function drawCircleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = svg.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  addCircle(x, y);
}

function addCircle(x, y) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', x);
  circle.setAttribute('cy', y);
  circle.setAttribute('r', '8');
  circle.setAttribute('fill', '#3498db');
  circle.setAttribute('stroke', '#217dbb');
  circle.setAttribute('stroke-width', '2');
  svg.appendChild(circle);
  drawings.push(circle);
}

// Undo last drawing
function undo() {
  const last = drawings.pop();
  if (last) {
    svg.removeChild(last);
  }
}

// Keyboard shortcut for undo (Ctrl+Z)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    undo();
  }
});

