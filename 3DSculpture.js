// 3D Sculpture Module
let meshes = [];

function createGeometries() {
  // Store geometry data (position and size)
  meshes = [
    {
      x: -50,
      y: 0,
      z: 0,
      radius: 80
    },
    {
      x: 50,
      y: 0,
      z: 0,
      radius: 80
    }
  ];
}

function renderGeometries() {
  // Set material (shared for all meshes)
  fill(255, 255, 255);
  noStroke();

  // Render all meshes
  for (let mesh of meshes) {
    push();
    translate(mesh.x, mesh.y, mesh.z);
    sphere(mesh.radius);
    pop();
  }
}

function keyPressed() {
  // When Space is pressed, perform boolean union and export
  if (key === ' ' || keyCode === 32) {
    const unionMesh = booleanUnion(meshes);
    if (unionMesh) {
      exportMesh(unionMesh);
    }
  }
}
