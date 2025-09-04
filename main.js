import { seedBloom } from './d3_layout_spec.js';

async function loadData(){
  const res = await fetch('./magnolia_seed.json');
  return await res.json();
}

function attachPanelHandlers(svg){
  // Placeholder: hook up click/hover to show node details in the side panel
}

(async function init(){
  const data = await loadData();
  const container = document.getElementById('viz');
  // Create a minimal node/edge set just for the radial projection
  // Our seedBloom reads from the 'magnolia' node's children recursively
  seedBloom(container, data.nodes, []);

  // Toggles (visual only placeholders for now)
  const pot = document.getElementById('togglePotential');
  const proj = document.getElementById('toggleProjection');
  pot.addEventListener('click', ()=>{
    document.querySelector('.credit-chip').textContent = 'Atlas UB — Lens: Potential (⭕) active';
  });
  proj.addEventListener('click', ()=>{
    document.querySelector('.credit-chip').textContent = 'Atlas UB — Lens: Projection (🌳) active';
  });
})();
