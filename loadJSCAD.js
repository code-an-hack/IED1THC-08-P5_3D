// Load JSCAD and make it globally available
// Using esm.sh which handles CORS properly
async function loadJSCAD() {
  const sources = [
    'https://esm.sh/@jscad/modeling@2.11.0',
    'https://cdn.skypack.dev/@jscad/modeling@2.11.0',
    'https://esm.run/@jscad/modeling@2.11.0'
  ];
  
  for (const source of sources) {
    try {
      const jscad = await import(source);
      window.jscad = jscad;
      window.dispatchEvent(new Event('jscadLoaded'));
      console.log('JSCAD loaded successfully from:', source);
      return;
    } catch (error) {
      console.warn('Failed to load JSCAD from:', source, error);
    }
  }
  
  console.error('Failed to load JSCAD from all sources');
}

loadJSCAD();
