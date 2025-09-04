/* Magnolia Map — v2.1 compatibility: fetch JSON instead of import assertions */
const container = document.getElementById('viz');
const panelTitle = document.getElementById('panel-title');
const panelContent = document.getElementById('panel-content');
const togglePotential = document.getElementById('togglePotential');
const toggleProjection = document.getElementById('toggleProjection');
const meaningDial = document.getElementById('meaningDial');

let svg, gLinks, gNodes, gLatent;
let state = {
  potential: false,
  projection: true,
  meaning: parseFloat(meaningDial?.value || '0.4'),
};

function nodeById(id, nodes) { return nodes.find(n => n.id === id); }

function buildHierarchy(nodes, rootId='magnolia'){
  const rootNode = nodeById(rootId, nodes) || nodes[0];
  if(!rootNode){ throw new Error('No nodes in dataset'); }
  const map = new Map(nodes.map(n => [n.id, n]));
  function children(n){
    const kids = (n.children || []).map(id => map.get(id)).filter(Boolean);
    return kids;
  }
  return d3.hierarchy(rootNode, children);
}

function initSVG(){
  container.innerHTML = '';
  svg = d3.select(container).append('svg')
    .attr('viewBox', '-420 -420 840 840');
  gLatent = svg.append('g').attr('class','latent-layer');
  gLinks  = svg.append('g').attr('class','links');
  gNodes  = svg.append('g').attr('class','nodes');
}

function renderTree(nodes){
  const root = buildHierarchy(nodes);
  const tree = d3.tree().size([2*Math.PI, 340]).separation((a,b)=> (a.parent==b.parent ? 1 : 2));
  const radial = tree(root);
  const point = (d)=>{
    const r = d.y, a = d.x - Math.PI/2;
    return [Math.cos(a)*r, Math.sin(a)*r];
  };

  const linkSel = gLinks.selectAll('path').data(radial.links(), d=> d.target.data.id);
  linkSel.join(
    enter => enter.append('path')
      .attr('class','edge')
      .attr('fill','none')
      .attr('stroke','currentColor')
      .attr('stroke-opacity',0.35)
      .attr('stroke-width',1.2)
      .attr('d', d => {
        const [sx,sy] = point(d.source); const [tx,ty] = point(d.target);
        return `M${sx},${sy}C${sx},${sy} ${tx},${ty} ${tx},${ty}`;
      })
      .attr('stroke-dasharray', function(){ const l=this.getTotalLength(); return `${l} ${l}`; })
      .attr('stroke-dashoffset', function(){ return this.getTotalLength(); })
      .transition().duration(1200).ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0),
    update => update,
    exit => exit.remove()
  );

  const nodeSel = gNodes.selectAll('g.node').data(radial.descendants(), d=> d.data.id);
  const nodeEnter = nodeSel.enter().append('g').attr('class','node')
    .attr('transform', d=> { const [x,y]=point(d); return `translate(${x},${y})`; })
    .style('cursor','pointer')
    .on('click', (_,d)=> openPanel(d.data));

  nodeEnter.append('circle').attr('r', 4).attr('fill','currentColor').attr('opacity',0)
    .transition().delay((d,i)=>i*20).duration(500).attr('opacity',1);

  nodeEnter.append('text').attr('dy','-0.6em').attr('text-anchor','middle')
    .text(d=> (d.data.label || d.data.name))
    .attr('opacity',0)
    .transition().delay((d,i)=>150+i*18).duration(500).attr('opacity',0.95);
}

function openPanel(node){
  const title = node.label || node.name || 'Node';
  panelTitle.textContent = `${node.glyph ? node.glyph + ' ' : ''}${title}`;
  const layers = node.layers || {};
  const cp = node.codepoint ? `<div class="panel-meta">Codepoint: ${node.codepoint}</div>` : '';
  let layerList = '<ul class="panel-list">';
  for(const k of ['physical','psychological','spiritual']){
    if(layers[k]) layerList += `<li><strong>${k[0].toUpperCase()+k.slice(1)}</strong>: ${layers[k]}</li>`;
  }
  layerList += '</ul>';
  panelContent.innerHTML = `${cp}${layerList}`;
}

function latentEdges(nodes, meaning=0.4){
  gLatent.selectAll('*').remove();
  if(!state.potential) return;

  const map = new Map(nodes.map(n=>[n.id,n]));
  const positions = new Map();
  gNodes.selectAll('g.node').each(function(d){
    const m = d3.select(this).attr('transform');
    const match = /translate\(([-0-9.]+),([-0-9.]+)\)/.exec(m);
    if(match){ positions.set(d.data.id, [parseFloat(match[1]), parseFloat(match[2])]); }
  });

  const edges = [];
  nodes.forEach(n=>{
    const rels = (n.relations && n.relations.corresponds_to) ? n.relations.corresponds_to : [];
    rels.forEach(rid => { if(map.has(rid) && n.id < rid){ edges.push([n.id, rid]); } });
  });

  const take = Math.max(1, Math.floor(edges.length * meaning));
  const sample = edges.slice(0, take);

  gLatent.selectAll('path').data(sample).enter().append('path')
    .attr('class','edge latent')
    .attr('fill','none')
    .attr('stroke','currentColor')
    .attr('stroke-width',1)
    .attr('d', d => {
      const a = positions.get(d[0]); const b = positions.get(d[1]);
      if(!a || !b) return null;
      const [sx,sy] = a; const [tx,ty] = b;
      const mx = (sx+tx)/2, my = (sy+ty)/2 - 30;
      return `M${sx},${sy} Q ${mx},${my} ${tx},${ty}`;
    })
    .attr('stroke-opacity',0)
    .transition().duration(600).attr('stroke-opacity',0.5);
}

async function boot(){
  try{
    const res = await fetch('./magnolia_seed.json', {cache:'no-store'});
    if(!res.ok) throw new Error(`Failed to load magnolia_seed.json (${res.status})`);
    const data = await res.json();
    const nodes = data.nodes || [];
    if(!nodes.length){ throw new Error('magnolia_seed.json has no nodes'); }
    initSVG();
    renderTree(nodes);
    openPanel(nodes.find(n=> n.id==='magnolia') || nodes[0]);
    latentEdges(nodes, state.meaning);

    // toggles
    togglePotential?.addEventListener('click', ()=>{
      state.potential = !state.potential;
      togglePotential.setAttribute('aria-pressed', String(state.potential));
      d3.select('.credit-chip').text(`Atlas UB — Lens: ${state.potential ? 'Potential (⭕) active' : 'Projection (🌳) active'}`);
      latentEdges(nodes, state.meaning);
    });
    toggleProjection?.addEventListener('click', ()=>{
      state.projection = !state.projection;
      toggleProjection.setAttribute('aria-pressed', String(state.projection));
      gLinks.selectAll('path').attr('stroke-dasharray', function(){ const l=this.getTotalLength(); return `${l} ${l}`; })
        .attr('stroke-dashoffset', function(){ return this.getTotalLength(); })
        .transition().duration(1000).ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    });
    meaningDial?.addEventListener('input', (e)=>{
      state.meaning = parseFloat(e.target.value);
      latentEdges(nodes, state.meaning);
    });
  }catch(err){
    console.error(err);
    panelTitle.textContent = "Setup error";
    panelContent.innerHTML = `<p>There was a problem loading the dataset.</p><pre style="white-space:pre-wrap;background:#f7f7f7;border:1px solid #eee;padding:8px;border-radius:8px;">${String(err)}</pre>`;
  }
}
boot();
