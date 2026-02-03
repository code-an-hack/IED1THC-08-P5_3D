// 3D Sculpture Module - Pottery-style generation
let meshes = [];

// Sculpture settings
const sculptureSettings = {
  // Base settings
  baseRadius: 2,              // Base radius in cm
  baseHeight: 2,               // Base height in cm
  
  // Profile generation
  height: 10,                    // Total height in cm
  segments: 100,                // Number of vertical segments
  rotations: 64,                 // Number of rotations around vertical axis
  noiseAngles: 10,               // Number of noise curves to compute (distributed around 360°)
  
  // Perlin noise settings
  noiseScale: 3,              // Scale of noise (lower = smoother)
  noiseStrength: 5,           // Strength of noise variation (cm)
  
  // Shape variation
  radiusVariation: 0.3,         // Random radius variation
  twistAmount: 0.0              // Amount of twist along height
};

function createGeometries() {
  meshes = [];
  
  // Step 1: Compute N noise curves using different Perlin noise samplings
  const noiseCurves = generateNoiseCurves();
  
  // Step 2: Extrude curves around vertical axis (each curve covers its angular range)
  const vertices = extrudeCurvesAroundAxis(noiseCurves);
  
  // Step 3: Create mesh from vertices (with top and bottom caps)
  createMeshFromVertices(vertices);
}

function generateNoiseCurves() {
  const { height, segments, noiseScale, noiseStrength, baseRadius, noiseAngles } = sculptureSettings;
  const curves = [];
  
  // Generate N noise curves, each with different Perlin noise sampling
  for (let curveIndex = 0; curveIndex < noiseAngles; curveIndex++) {
    const curve = [];
    
    // Generate base point
    curve.push({
      y: 0,
      radius: baseRadius
    });
    
    // Generate points along height using Perlin noise
    // Use curveIndex to get different noise sampling
    for (let i = 1; i <= segments; i++) {
      const t = i / segments; // 0 to 1
      const y = t * height;
      
      // Use Perlin noise for radius variation
      // Different curveIndex gives different noise sampling
      const noiseX = t * noiseScale;
      const noiseY = curveIndex * 10; // Different Y offset for each curve
      
      // Get noise value (0 to 1)
      const noiseValue = noise(noiseX, noiseY);
      
      // Map noise to radius variation
      const radiusVariation = (noiseValue - 0.5) * noiseStrength;
      
      // Calculate radius with variation
      // Start wider, narrow in middle, widen at top (pottery-like)
      const baseRadiusCurve = baseRadius * (1 - t * 0.3) + baseRadius * t * 0.2;
      const radius = baseRadiusCurve + radiusVariation;
      
      curve.push({
        y: y,
        radius: Math.max(0.5, radius) // Ensure minimum radius
      });
    }
    
    curves.push(curve);
  }
  
  return curves;
}

function extrudeCurvesAroundAxis(noiseCurves) {
  const { rotations, noiseAngles, segments } = sculptureSettings;
  const vertices = [];
  
  // Calculate angular range per curve
  const angleRangePerCurve = TWO_PI / noiseAngles;
  
  // IMPORTANT: Create vertices ring-by-ring (not rotation-by-rotation)
  // Each ring has (rotations + 1) points
  const pointsPerRing = rotations + 1;
  const numRings = segments + 1; // +1 for base
  
  // For each ring (height level)
  for (let ring = 0; ring < numRings; ring++) {
    // For each rotation step in this ring
    for (let r = 0; r <= rotations; r++) {
      const rotationAngle = (r / rotations) * TWO_PI;
      
      // Determine which curves to interpolate between
      // Find the two curves that bracket this angle
      let curveIndex1, curveIndex2, t;
      
      // Calculate which curve segment we're in
      const normalizedAngle = rotationAngle / angleRangePerCurve;
      curveIndex1 = Math.floor(normalizedAngle) % noiseAngles;
      curveIndex2 = (curveIndex1 + 1) % noiseAngles;
      
      // Calculate linear interpolation factor (0 to 1)
      const linearT = normalizedAngle - Math.floor(normalizedAngle);
      
      // Convert to Gaussian interpolation for smoother transitions
      // Use Gaussian blending: weight for curve1 decreases smoothly as we move from 0 to 1
      // Gaussian function centered at 0, so we get smooth falloff
      const sigma = 0.25; // Controls the width of the transition (lower = sharper, higher = smoother)
      
      // Calculate Gaussian weights for both curves
      // Curve1 weight: Gaussian centered at 0 (peaks at linearT=0)
      const weight1 = Math.exp(-Math.pow(linearT / sigma, 2));
      // Curve2 weight: Gaussian centered at 1 (peaks at linearT=1)
      const weight2 = Math.exp(-Math.pow((1 - linearT) / sigma, 2));
      
      // Normalize weights so they sum to 1
      const totalWeight = weight1 + weight2;
      t = weight2 / totalWeight; // Interpolation factor for curve2 (0 to 1)
      
      // Get both curves
      const curve1 = noiseCurves[curveIndex1];
      const curve2 = noiseCurves[curveIndex2];
      
      // Get points from both curves at this ring level
      const point1 = curve1[ring];
      const point2 = curve2[ring];
      
      // Interpolate radius between the two curves using Gaussian weight
      const radius = point1.radius * (1 - t) + point2.radius * t;
      const y = point1.y; // Y is the same for both
      
      // Add twist along height
      const twist = (y / sculptureSettings.height) * sculptureSettings.twistAmount * TWO_PI;
      const finalAngle = rotationAngle + twist;
      
      // Calculate X and Z from radius and angle
      const x = Math.cos(finalAngle) * radius;
      const z = Math.sin(finalAngle) * radius;
      
      vertices.push({ x, y, z });
    }
  }
  
  return vertices;
}

function createMeshFromVertices(vertices) {
  const { segments, rotations } = sculptureSettings;
  const numRings = segments + 1; // +1 for base
  const pointsPerRing = rotations + 1;
  
  // Create faces (triangles) to form the mesh
  const faces = [];
  
  // Create bottom cap (base)
  // Add center vertex at bottom
  const bottomCenterIndex = vertices.length;
  vertices.push({ x: 0, y: 0, z: 0 });
  
  // Create triangles fanning from center to bottom ring (indices 0 to pointsPerRing-1)
  for (let point = 0; point < pointsPerRing - 1; point++) {
    const i1 = bottomCenterIndex;
    const i2 = point;     // Current point
    const i3 = point + 1; // Next point
    faces.push([i1, i2, i3]);
  }
  // Close the bottom cap (connect last point back to first)
  faces.push([bottomCenterIndex, pointsPerRing - 1, 0]);
  
  // Create faces for each ring segment (sides)
  // Ensure consistent winding order (counter-clockwise when viewed from outside)
  for (let ring = 0; ring < numRings - 1; ring++) {
    for (let point = 0; point < pointsPerRing - 1; point++) {
      const i1 = ring * pointsPerRing + point;
      const i2 = ring * pointsPerRing + (point + 1);
      const i3 = (ring + 1) * pointsPerRing + point;
      const i4 = (ring + 1) * pointsPerRing + (point + 1);
      
      // First triangle: i1 -> i2 -> i3 (counter-clockwise)
      faces.push([i1, i2, i3]);
      // Second triangle: i2 -> i4 -> i3 (counter-clockwise)
      faces.push([i2, i4, i3]);
    }
    
    // Close the ring (connect last point to first)
    const i1 = ring * pointsPerRing + (pointsPerRing - 1);
    const i2 = ring * pointsPerRing; // First point of ring
    const i3 = (ring + 1) * pointsPerRing + (pointsPerRing - 1);
    const i4 = (ring + 1) * pointsPerRing; // First point of next ring
    
    // First triangle: i1 -> i2 -> i3
    faces.push([i1, i2, i3]);
    // Second triangle: i2 -> i4 -> i3
    faces.push([i2, i4, i3]);
  }
  
  // Create top cap
  // Add center vertex at top
  const topCenterIndex = vertices.length;
  const topY = vertices[vertices.length - pointsPerRing].y; // Y of top ring
  vertices.push({ x: 0, y: topY, z: 0 });
  
  // Create triangles fanning from center to top ring
  const topRingStart = (numRings - 1) * pointsPerRing;
  for (let point = 0; point < pointsPerRing - 1; point++) {
    const i1 = topCenterIndex;
    const i2 = topRingStart + point;     // Current point
    const i3 = topRingStart + point + 1; // Next point
    faces.push([i1, i2, i3]);
  }
  // Close the top cap
  faces.push([topCenterIndex, topRingStart + pointsPerRing - 1, topRingStart]);
  
  // Store mesh data
  meshes.push({
    type: 'custom',
    vertices: vertices,
    faces: faces
  });
}

function renderGeometries() {
  // Set material
  fill(255, 255, 255);
  noStroke();
  
  // Render all meshes
  for (let mesh of meshes) {
    if (mesh.type === 'custom') {
      renderCustomMesh(mesh);
    }
  }
}

function renderCustomMesh(mesh) {
  const { vertices, faces } = mesh;
  
  // Render using beginShape/endShape
  for (let face of faces) {
    beginShape(TRIANGLES);
    for (let i = 0; i < 3; i++) {
      const v = vertices[face[i]];
      vertex(v.x * 50, v.y * 50, v.z * 50); // Convert cm to p5 units
    }
    endShape();
  }
}

function keyPressed() {
  // When Space is pressed, export all meshes
  if (key === ' ' || keyCode === 32) {
    exportAllMeshes();
  }
}

function exportAllMeshes() {
  // Export all meshes without boolean union
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    if (mesh.type === 'custom') {
      exportCustomMesh(mesh, i);
    }
  }
}

function exportCustomMesh(mesh, index) {
  // Export custom mesh directly as STL
  const { vertices, faces } = mesh;
  
  console.log(`Exporting mesh with ${vertices.length} vertices and ${faces.length} faces`);
  
  // Generate STL content directly from vertices and faces
  let stlContent = 'solid sculpture\n';
  
  for (const face of faces) {
    if (face.length !== 3) continue; // Only triangles
    
    // Get vertices for this triangle
    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    const v2 = vertices[face[2]];
    
    // Calculate normal
    const normal = calculateTriangleNormal(v0, v1, v2);
    
    // Convert to mm and JSCAD coordinate system (X, Z, Y)
    const v0_mm = [v0.x * 10, v0.z * 10, v0.y * 10];
    const v1_mm = [v1.x * 10, v1.z * 10, v1.y * 10];
    const v2_mm = [v2.x * 10, v2.z * 10, v2.y * 10];
    
    // Convert normal to JSCAD coordinate system
    const normal_mm = [normal.x, normal.z, normal.y];
    
    // Write facet
    stlContent += `  facet normal ${normal_mm[0]} ${normal_mm[1]} ${normal_mm[2]}\n`;
    stlContent += `    outer loop\n`;
    stlContent += `      vertex ${v0_mm[0]} ${v0_mm[1]} ${v0_mm[2]}\n`;
    stlContent += `      vertex ${v1_mm[0]} ${v1_mm[1]} ${v1_mm[2]}\n`;
    stlContent += `      vertex ${v2_mm[0]} ${v2_mm[1]} ${v2_mm[2]}\n`;
    stlContent += `    endloop\n`;
    stlContent += `  endfacet\n`;
  }
  
  stlContent += 'endsolid sculpture\n';
  
  // Download
  const blob = new Blob([stlContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sculpture.stl';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function calculateTriangleNormal(v0, v1, v2) {
  // Calculate two edge vectors
  const edge1 = {
    x: v1.x - v0.x,
    y: v1.y - v0.y,
    z: v1.z - v0.z
  };
  
  const edge2 = {
    x: v2.x - v0.x,
    y: v2.y - v0.y,
    z: v2.z - v0.z
  };
  
  // Cross product: edge1 × edge2
  const normal = {
    x: edge1.y * edge2.z - edge1.z * edge2.y,
    y: edge1.z * edge2.x - edge1.x * edge2.z,
    z: edge1.x * edge2.y - edge1.y * edge2.x
  };
  
  // Normalize
  const length = Math.sqrt(normal.x**2 + normal.y**2 + normal.z**2);
  if (length > 0.0001) {
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
  }
  
  return normal;
}
