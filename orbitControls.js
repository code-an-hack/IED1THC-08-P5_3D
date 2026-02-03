// Orbit Controls Module
let angleX = Math.PI; // Start with a slight downward angle (30 degrees)
let angleY = 0;
let zoom = 300;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function updateOrbitControls() {
  // Orbit controls with mouse
  if (isDragging) {
    angleY += (mouseX - lastMouseX) * 0.01;
    angleX += (mouseY - lastMouseY) * 0.01;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
  
  // Apply camera transform (zoom and rotation)
  // Use proper rotation order for full 3D orbit
  translate(0, 0, -zoom);
  rotateX(angleX);
  rotateY(angleY);
}

// p5.js event handlers
function mousePressed() {
  isDragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseReleased() {
  isDragging = false;
}

function mouseWheel(event) {
  // Zoom with scroll
  zoom += event.delta * 0.5;
  zoom = constrain(zoom, 100, 1000);
  return false; // Prevent default scrolling
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
