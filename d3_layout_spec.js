// D3 layout & animation sketch (ES module)
import * as d3 from 'd3';

export function seedBloom(container, nodes, edges, {duration=1800}={}){
  const svg = d3.select(container).append('svg')
    .attr('width', '100%').attr('height', '100%')
    .attr('viewBox', '-400 -400 800 800');

  // Radial tree for projection (🌳)
  const tree = d3.tree()
    .size([2*Math.PI, 320])
    .separation((a,b)=> (a.parent==b.parent ? 1 : 2));

  const root = d3.hierarchy(nodes.find(n=>n.id==='magnolia'), d=>{
    const children = (d.children||[]).map(id => nodes.find(n=>n.id===id)).filter(Boolean);
    return children;
  });

  const radial = tree(root);
  const links = radial.links();
  const point = (d)=>{
    const r = d.y, a = d.x - Math.PI/2;
    return [Math.cos(a)*r, Math.sin(a)*r];
  };

  // Edges
  svg.append('g').selectAll('path').data(links).enter().append('path')
    .attr('d', d => {
      const [sx,sy] = point(d.source);
      const [tx,ty] = point(d.target);
      return `M${sx},${sy}C${sx},${sy} ${tx},${ty} ${tx},${ty}`;
    })
    .attr('fill','none')
    .attr('stroke','currentColor')
    .attr('stroke-opacity',0.3)
    .attr('stroke-width',1.2)
    .attr('stroke-dasharray', function(){ const l=this.getTotalLength(); return `${l} ${l}`; })
    .attr('stroke-dashoffset', function(){ return this.getTotalLength(); })
    .transition().duration(duration).ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);

  // Nodes
  const g = svg.append('g').selectAll('g').data(radial.descendants()).enter().append('g')
    .attr('transform', d=>{
      const [x,y]=point(d);
      return `translate(${x},${y})`;
    });

  g.append('circle').attr('r', 4).attr('fill','currentColor').attr('opacity',0)
    .transition().delay((d,i)=>i*30).duration(500).attr('opacity',1);

  g.append('text').attr('dy','-0.6em').attr('text-anchor','middle')
    .text(d=>d.data.label||d.data.name)
    .attr('opacity',0)
    .transition().delay((d,i)=>200+i*25).duration(600).attr('opacity',0.9);
}

// Atlas Lens overlay
export function atlasLens(svg, {potentialNode='circle', projectionNode='tree'}){
  // Show latent edges as dotted arcs when potential is toggled
  // Implementation detail: for non-children relations, render faint bezier arcs between matching nodes
}
