// 3D Sculpture Module
let meshes = [];

// Coral generation settings
const coralSettings = {
  // Base settings
  baseSize: { width: 5, height: 1, depth: 5 },
  
  // Branching settings
  maxDepth: 5,                    // Maximum recursion depth
  maxBranches: 3,                 // Maximum branches per node
  branchProbability: 0.7,         // Probability of creating a branch (0-1)
  minCubesBeforeSplit: 2,         // Minimum cubes before a branch can split into two
  splitProbability: 0.4,          // Probability of splitting into two branches
  
  // Size settings
  initialSize: 3,               // Size of first branch (cm)
  sizeDecay: 0.9,                // Size multiplier per level (0-1)
  sizeVariation: 0.2,             // Random size variation (±%)
  
  // Growth settings
  branchLength: 1.5,              // Base length of branches (cm)
  lengthVariation: 0.4,           // Random length variation (±%)
  
  // Angle settings
  baseAngle: 35,                   // Base upward angle (degrees)
  angleVariation: 25,              // Random angle variation (±degrees)
  twistVariation: 30,              // Random twist variation (±degrees)
  
  // Position settings
  positionVariation: 0.0           // Random position offset variation (cm)
};

function createGeometries() {
  meshes = [];
  
  // Create base
  // In p5.js WEBGL: X=right, Y=up, Z=depth
  meshes.push({
    type: 'box',
    x: 0,
    y: coralSettings.baseSize.height / 2, // Half height up (Y is vertical)
    z: 0, // Depth position
    width: coralSettings.baseSize.width,
    height: coralSettings.baseSize.height,
    depth: coralSettings.baseSize.depth,
    rotation: [0, 0, 0]
  });
  
  // Helper function for random values
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randSign = () => Math.random() < 0.5 ? -1 : 1;
  
  // Start growing coral from center of base
  // In p5.js WEBGL: X=right, Y=up, Z=depth (forward)
  const baseY = coralSettings.baseSize.height; // Top of base
  const startPos = { x: 0, y: baseY, z: 0 };
  const startDir = { x: 0, y: 1, z: 0 }; // Upward direction (positive Y is up in p5.js WEBGL)
  
  // Generate coral branches recursively
  // Parameters: position, direction, size, depth, baseRotation, cubesInBranch
  generateBranch(startPos, startDir, coralSettings.initialSize, 0, 0, 0);
  
  function generateBranch(pos, dir, size, depth, baseRotation, cubesInBranch) {
    if (depth >= coralSettings.maxDepth || size < 0.3) {
      return; // Stop recursion
    }
    
    // Calculate branch length - make it shorter than cube size to ensure overlap
    // Use 60-80% of cube size so cubes overlap
    const overlapRatio = rand(0.6, 0.8);
    const length = size * overlapRatio * (1 + rand(-coralSettings.lengthVariation, coralSettings.lengthVariation));
    
    // Add size variation
    const actualSize = size * (1 + rand(-coralSettings.sizeVariation, coralSettings.sizeVariation));
    
    // Calculate new position along the branch direction
    // Place cube so it overlaps with previous position
    const newPos = {
      x: pos.x + dir.x * length,
      y: pos.y + dir.y * length,
      z: pos.z + dir.z * length
    };
    
    // Add small position variation for organic look (but keep it minimal to maintain overlap)
    // Variation should be in horizontal plane (X and Z), not vertical (Y)
    const posVariation = coralSettings.positionVariation * size * 0.3; // Reduced variation
    newPos.x += rand(-posVariation, posVariation);
    newPos.z += rand(-posVariation, posVariation); // Z is depth, not Y
    
    // Randomly choose geometry type: box, sphere, or cylinder
    const geometryTypes = ['box', 'sphere', 'cylinder'];
    const geometryType = geometryTypes[Math.floor(Math.random() * geometryTypes.length)];
    
    // Create mesh based on selected type
    let meshData = {
      type: geometryType,
      x: newPos.x,
      y: newPos.y,
      z: newPos.z,
      rotation: [
        baseRotation + rand(-coralSettings.twistVariation, coralSettings.twistVariation),
        rand(-coralSettings.angleVariation, coralSettings.angleVariation),
        rand(-coralSettings.angleVariation, coralSettings.angleVariation)
      ]
    };
    
    // Set size properties based on geometry type
    if (geometryType === 'box') {
      meshData.width = actualSize;
      meshData.height = actualSize;
      meshData.depth = actualSize;
    } else if (geometryType === 'sphere') {
      meshData.radius = actualSize / 2; // Radius is half the size
    } else if (geometryType === 'cylinder') {
      meshData.radius = actualSize / 2; // Radius is half the size
      meshData.height = actualSize * rand(1.0, 1.5); // Cylinders can be taller
    }
    
    meshes.push(meshData);
    
    // Increment cubes in this branch
    cubesInBranch++;
    
    // Check if branch should split into two
    let numBranches = 1; // Default: continue as single branch
    if (cubesInBranch >= coralSettings.minCubesBeforeSplit && 
        Math.random() < coralSettings.splitProbability) {
      numBranches = 2; // Split into two branches
    } else {
      // Normal branching logic
      numBranches = Math.floor(rand(1, coralSettings.maxBranches + 1));
    }
    
    // Generate child branches
    for (let i = 0; i < numBranches; i++) {
      if (Math.random() < coralSettings.branchProbability || numBranches === 2) {
        // Calculate new direction - ensure it grows upward with controlled deviation
        // Angle is measured from vertical (Y axis in p5.js)
        const angle = coralSettings.baseAngle + rand(-coralSettings.angleVariation, coralSettings.angleVariation);
        const twist = rand(0, 360); // Rotation around vertical axis
        
        // Convert angle to direction vector
        // angle=0 means straight up (y=-1 in p5.js), angle=90 means horizontal (y=0)
        const radAngle = angle * Math.PI / 180;
        const radTwist = twist * Math.PI / 180;
        
        // Direction vector: grows upward (positive Y in p5.js WEBGL) with angle deviation
        // In p5.js WEBGL: X=right, Y=up (positive is up), Z=depth
        const newDir = {
          x: Math.sin(radAngle) * Math.cos(radTwist),
          y: Math.cos(radAngle), // Positive Y is up in p5.js WEBGL
          z: Math.sin(radAngle) * Math.sin(radTwist)
        };
        
        // Normalize direction vector
        const dirLength = Math.sqrt(newDir.x**2 + newDir.y**2 + newDir.z**2);
        newDir.x /= dirLength;
        newDir.y /= dirLength;
        newDir.z /= dirLength;
        
        // Recursively generate branch
        const newSize = size * coralSettings.sizeDecay;
        const newRotation = baseRotation + rand(-coralSettings.twistVariation, coralSettings.twistVariation);
        
        // If splitting, reset cubesInBranch; otherwise continue counting
        const newCubesInBranch = (numBranches === 2) ? 0 : cubesInBranch;
        generateBranch(newPos, newDir, newSize, depth + 1, newRotation, newCubesInBranch);
      }
    }
  }
}

function renderGeometries() {
  // Set material (shared for all meshes)
  fill(255, 255, 255);
  noStroke();

  // Render all meshes
  for (let mesh of meshes) {
    push();
    translate(mesh.x * 50, mesh.y * 50, mesh.z * 50); // Convert cm to p5 units (1cm = 50 units)
    
    // Apply rotation
    if (mesh.rotation) {
      rotateX(mesh.rotation[0] * PI / 180);
      rotateY(mesh.rotation[1] * PI / 180);
      rotateZ(mesh.rotation[2] * PI / 180);
    }
    
    // Render based on geometry type
    switch (mesh.type) {
      case 'box':
        box(mesh.width * 50, mesh.height * 50, mesh.depth * 50);
        break;
      case 'sphere':
        sphere(mesh.radius * 50);
        break;
      case 'cylinder':
        cylinder(mesh.radius * 50, mesh.height * 50);
        break;
      default:
        box(mesh.width * 50, mesh.height * 50, mesh.depth * 50);
    }
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
