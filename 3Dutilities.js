// 3D Utilities Module - JSCAD Integration
// Import JSCAD from CDN (will be loaded via script tag in HTML)

function booleanUnion(meshes) {
  if (!meshes || meshes.length === 0) {
    return null;
  }
  
  // Check if JSCAD is available
  if (typeof window.jscad === 'undefined') {
    console.error('JSCAD is not loaded. Please include JSCAD library.');
    return null;
  }
  
  const { primitives, booleans, transforms } = window.jscad;
  
  // Convert first mesh to JSCAD geometry
  let result = createJSCADGeometry(meshes[0]);
  
  // Perform union with remaining meshes
  for (let i = 1; i < meshes.length; i++) {
    const geometry = createJSCADGeometry(meshes[i]);
    result = booleans.union(result, geometry);
  }
  
  return result;
}

function createJSCADGeometry(mesh) {
  const { primitives, transforms } = window.jscad;
  
  // Create a sphere based on mesh properties
  // Assuming mesh has: x, y, z (position) and radius
  let geometry = primitives.sphere({
    radius: mesh.radius || 80,
    segments: 32
  });
  
  // Translate to mesh position
  if (mesh.x !== undefined || mesh.y !== undefined || mesh.z !== undefined) {
    geometry = transforms.translate(
      [mesh.x || 0, mesh.y || 0, mesh.z || 0],
      geometry
    );
  }
  
  return geometry;
}

function exportMesh(mesh) {
  if (!mesh) {
    console.error('No mesh provided for export');
    return;
  }
  
  // Check if JSCAD is available
  if (typeof window.jscad === 'undefined') {
    console.error('JSCAD is not loaded. Please include JSCAD library.');
    return;
  }
  
  // Check if JSCAD has built-in serialization
  if (window.jscad.io && window.jscad.io.stlSerializer) {
    try {
      const stlData = window.jscad.io.stlSerializer({ binary: false }, mesh);
      const blob = new Blob([stlData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sculpture.stl';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    } catch (error) {
      console.warn('JSCAD built-in serializer failed, using manual export:', error);
    }
  }
  
  // Use manual STL export
  exportSTLManually(mesh);
}

// Manual STL export as fallback
function exportSTLManually(mesh) {
  const { geometries } = window.jscad;
  
  // Convert JSCAD geometry to polygons
  const polygons = geometries.geom3.toPolygons(mesh);
  
  // Generate STL content
  let stlContent = 'solid sculpture\n';
  
  for (const polygon of polygons) {
    const vertices = polygon.vertices;
    if (vertices.length >= 3) {
      // Calculate normal (simplified)
      const v0 = vertices[0];
      const v1 = vertices[1];
      const v2 = vertices[2];
      
      const normal = calculateNormal(v0, v1, v2);
      
      stlContent += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
      stlContent += `    outer loop\n`;
      
      for (const vertex of vertices) {
        stlContent += `      vertex ${vertex[0]} ${vertex[1]} ${vertex[2]}\n`;
      }
      
      stlContent += `    endloop\n`;
      stlContent += `  endfacet\n`;
    }
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

function calculateNormal(v0, v1, v2) {
  const u = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
  const v = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
  
  const normal = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0]
  ];
  
  // Normalize
  const length = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
  return [normal[0]/length, normal[1]/length, normal[2]/length];
}
