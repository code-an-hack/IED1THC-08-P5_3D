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
  
  const { primitives, booleans, transforms, geometries } = window.jscad;
  
  try {
    console.log('=== Starting Boolean Union ===');
    console.log(`Number of meshes: ${meshes.length}`);
    
    // Convert all meshes to JSCAD geometry first
    const jscadMeshes = [];
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      console.log(`\n=== Mesh ${i} ===`);
      console.log(`p5.js position: (${mesh.x}, ${mesh.y}, ${mesh.z}) cm`);
      console.log(`p5.js size:`, mesh.type === 'box' ? `(${mesh.width}, ${mesh.height}, ${mesh.depth}) cm` : `radius ${mesh.radius} cm`);
      
      const geometry = createJSCADGeometry(mesh);
      jscadMeshes.push(geometry);
      
      // Calculate expected JSCAD bounds
      if (mesh.type === 'box') {
        const halfW = (mesh.width || 1) * 5; // half size in mm
        const halfD = (mesh.depth || 1) * 5;
        const halfH = (mesh.height || 1) * 5;
        const jscadX = (mesh.x || 0) * 10;
        const jscadY = (mesh.z || 0) * 10;
        const jscadZ = (mesh.y || 0) * 10;
        console.log(`Expected JSCAD bounds: X[${jscadX-halfW} to ${jscadX+halfW}], Y[${jscadY-halfD} to ${jscadY+halfD}], Z[${jscadZ-halfH} to ${jscadZ+halfH}] mm`);
      }
    }
    
    // Start with first mesh
    let result = jscadMeshes[0];
    console.log(`Starting union with ${jscadMeshes.length} meshes`);
    
    // Perform union with remaining meshes
    for (let i = 1; i < jscadMeshes.length; i++) {
      try {
        console.log(`Unioning mesh ${i}...`);
        result = booleans.union(result, jscadMeshes[i]);
        console.log(`Union ${i} successful`);
        
        // Retessellate after union to ensure proper faces
        if (geometries.geom3 && geometries.geom3.retessellate) {
          result = geometries.geom3.retessellate(result);
        }
      } catch (error) {
        console.error(`Boolean union failed for mesh ${i}:`, error);
        throw error;
      }
    }
    
    // Final retessellation
    if (geometries.geom3 && geometries.geom3.retessellate) {
      result = geometries.geom3.retessellate(result);
    }
    
    const finalPolygons = geometries.geom3.toPolygons(result);
    console.log(`Final union has ${finalPolygons.length} polygons`);
    console.log('=== Boolean Union Complete ===');
    
    return result;
  } catch (error) {
    console.error('Boolean union failed:', error);
    return null;
  }
}


function createJSCADGeometry(mesh) {
  const { primitives, transforms } = window.jscad;
  
  let geometry;
  
  // Create geometry based on type
  switch (mesh.type) {
    case 'sphere':
      geometry = primitives.sphere({
        radius: (mesh.radius || 1) * 10, // Convert cm to mm
        segments: 32
      });
      break;
      
    case 'box':
      // p5.js box(width, height, depth) = box(xSize, ySize, zSize)
      // JSCAD cuboid({size: [x, y, z]})
      // So: JSCAD[x, y, z] = p5[width, depth, height] = p5[xSize, zSize, ySize]
      geometry = primitives.cuboid({
        size: [(mesh.width || 1) * 10, (mesh.depth || 1) * 10, (mesh.height || 1) * 10]
      });
      break;
      
    case 'cylinder':
      geometry = primitives.cylinder({
        radius: (mesh.radius || 1) * 10, // Convert cm to mm
        height: (mesh.height || 1) * 10, // Convert cm to mm
        segments: 32
      });
      break;
      
    default:
      // Default to sphere
      geometry = primitives.sphere({
        radius: mesh.radius || 1,
        segments: 32
      });
  }
  
  // Apply rotation BEFORE translation (order matters!)
  // Use ZYX order (same as p5.js: rotateZ, rotateY, rotateX)
  if (mesh.rotation) {
    // Apply rotations in reverse order to match p5.js behavior
    if (mesh.rotation[2] !== 0) {
      geometry = transforms.rotateZ(mesh.rotation[2] * Math.PI / 180, geometry);
    }
    if (mesh.rotation[1] !== 0) {
      geometry = transforms.rotateY(mesh.rotation[1] * Math.PI / 180, geometry);
    }
    if (mesh.rotation[0] !== 0) {
      geometry = transforms.rotateX(mesh.rotation[0] * Math.PI / 180, geometry);
    }
  }
  
  // Translate to mesh position (convert cm to mm for JSCAD: 1cm = 10mm)
  // CRITICAL: p5.js WEBGL uses Y-up, JSCAD uses Z-up
  // p5.js: X=right, Y=up, Z=forward (positive Z goes into screen/away from camera)
  // JSCAD: X=right, Y=forward, Z=up
  // Conversion: JSCAD[X, Y, Z] = p5[X, Z, Y]
  // BUT: p5.js box() center is at origin, JSCAD cuboid() center is also at origin
  // So translation should directly map: p5(x,y,z) -> JSCAD(x, z, y)
  if (mesh.x !== undefined || mesh.y !== undefined || mesh.z !== undefined) {
    const jscadX = (mesh.x || 0) * 10;  // X stays X
    const jscadY = (mesh.z || 0) * 10;  // p5 Z (forward) -> JSCAD Y (forward)
    const jscadZ = (mesh.y || 0) * 10;  // p5 Y (up) -> JSCAD Z (up)
    
    console.log(`Converting p5(${mesh.x}, ${mesh.y}, ${mesh.z}) -> JSCAD(${jscadX/10}, ${jscadY/10}, ${jscadZ/10})`);
    
    geometry = transforms.translate([jscadX, jscadY, jscadZ], geometry);
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
  
  try {
    // Convert JSCAD geometry to polygons
    const polygons = geometries.geom3.toPolygons(mesh);
    
    if (!polygons || polygons.length === 0) {
      console.error('No polygons found in mesh');
      return;
    }
    
    console.log(`Exporting ${polygons.length} polygons`);
    
    // Generate STL content
    let stlContent = 'solid sculpture\n';
    
    for (const polygon of polygons) {
      const vertices = polygon.vertices;
      if (!vertices || vertices.length < 3) continue;
      
      // Use polygon's plane normal if available, otherwise calculate
      let normal;
      if (polygon.plane && polygon.plane.normal) {
        normal = polygon.plane.normal;
      } else {
        // Calculate normal from first three vertices
        const v0 = vertices[0];
        const v1 = vertices[1];
        const v2 = vertices[2];
        normal = calculateNormal(v0, v1, v2);
      }
      
      // Triangulate polygon if it has more than 3 vertices
      if (vertices.length === 3) {
        // Triangle - write directly
        stlContent += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
        stlContent += `    outer loop\n`;
        for (const vertex of vertices) {
          stlContent += `      vertex ${vertex[0]} ${vertex[1]} ${vertex[2]}\n`;
        }
        stlContent += `    endloop\n`;
        stlContent += `  endfacet\n`;
      } else {
        // Polygon with more than 3 vertices - triangulate using fan method
        const v0 = vertices[0];
        for (let i = 1; i < vertices.length - 1; i++) {
          const v1 = vertices[i];
          const v2 = vertices[i + 1];
          
          // Recalculate normal for this triangle
          const triNormal = calculateNormal(v0, v1, v2);
          
          stlContent += `  facet normal ${triNormal[0]} ${triNormal[1]} ${triNormal[2]}\n`;
          stlContent += `    outer loop\n`;
          stlContent += `      vertex ${v0[0]} ${v0[1]} ${v0[2]}\n`;
          stlContent += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
          stlContent += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
          stlContent += `    endloop\n`;
          stlContent += `  endfacet\n`;
        }
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
  } catch (error) {
    console.error('Error exporting STL:', error);
  }
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
