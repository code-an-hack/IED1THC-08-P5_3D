function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Create geometries
  createGeometries();
}

function draw() {
  background(20);
  
  // Apply orbit controls
  updateOrbitControls();

  // Lighting
  ambientLight(100);
  directionalLight(255, 255, 255, 0.5, 0.5, -1);

  // Render geometries
  renderGeometries();
}