import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  type: string;
  level: string;
  material: string;
  connections: string[];
}

interface Link {
  source: string;
  target: string;
}

interface ForceGraphProps {
  nodes: Node[];
  selectedType: string | null;
  colorMap: { [key: string]: string };
  onNodeSelect: (id: string | null) => void;
}

const ForceGraph: React.FC<ForceGraphProps> = ({
  nodes,
  selectedType,
  colorMap,
  onNodeSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulation = useRef<d3.Simulation<Node, Link> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [collisionWaves, setCollisionWaves] = useState<Array<{
    x: number;
    y: number;
    radius: number;
    startTime: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const links: Link[] = [];
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        links.push({
          source: node.id,
          target: targetId
        });
      });
    });

    simulation.current = d3.forceSimulation<Node>(nodes as Node[])
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(70).strength(0.2))
      .force("charge", d3.forceManyBody().strength(-80).distanceMax(300))
      .force("x", d3.forceX<Node>(width / 2).strength(0.03))
      .force("y", d3.forceY<Node>(height / 2).strength(0.03))
      .force("collide", d3.forceCollide().radius(30).strength(0.5).iterations(3));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    filter.append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const links_g = g.append("g").attr("class", "links");
    const links_elements = links_g
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#2a2a2a")
      .attr("stroke-width", d => {
        const sourceType = (d.source as Node).type;
        const targetType = (d.target as Node).type;
        return sourceType === targetType ? 1 : 0.5;
      })
      .attr("stroke-opacity", 0.2);

    const nodes_g = g.append("g").attr("class", "nodes");
    const nodeGroups = nodes_g
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", d => `node ${d.type}`)
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", (event, d) => {
          if (!event.active && simulation.current) {
            simulation.current.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;

          nodes.forEach(otherNode => {
            if (otherNode !== d) {
              const dx = otherNode.x! - d.x!;
              const dy = otherNode.y! - d.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minDistance = 60;

              if (distance < minDistance) {
                setCollisionWaves(waves => [...waves, {
                  x: (d.x! + otherNode.x!) / 2,
                  y: (d.y! + otherNode.y!) / 2,
                  radius: 50,
                  startTime: performance.now(),
                  color: colorMap[d.type] || '#666'
                }]);

                const angle = Math.atan2(dy, dx);
                const bounceForce = 5;
                otherNode.vx = Math.cos(angle) * bounceForce;
                otherNode.vy = Math.sin(angle) * bounceForce;
              }
            }
          });
        })
        .on("end", (event, d) => {
          if (!event.active && simulation.current) {
            simulation.current.alphaTarget(0);
          }
          d.fx = null;
          d.fy = null;
        }) as any);

    nodeGroups.append("path")
      .attr("d", d => {
        const size = d.type === 'IFCBUILDINGSTOREY' ? 20 : 15;
        return `M0,-${size} L${size * 0.866},-${size/2} L${size * 0.866},${size/2} L0,${size} L-${size * 0.866},${size/2} L-${size * 0.866},-${size/2} Z`;
      })
      .attr("fill", d => colorMap[d.type] || "#666")
      .attr("fill-opacity", 0.2)
      .attr("stroke", d => colorMap[d.type] || "#666")
      .attr("stroke-width", 1.5)
      .style("filter", "url(#glow)");

    nodeGroups.append("text")
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .attr("fill", d => colorMap[d.type] || "#666")
      .style("font-size", "8px")
      .style("pointer-events", "none")
      .text(d => d.type.replace('IFC', ''));

    let tickCount = 0;
    simulation.current.on("tick", () => {
      tickCount++;
      if (tickCount % 2 === 0) {
        nodeGroups.attr("transform", d => `translate(${d.x},${d.y})`);
        
        links_elements
          .attr("x1", d => (d.source as Node).x!)
          .attr("y1", d => (d.source as Node).y!)
          .attr("x2", d => (d.target as Node).x!)
          .attr("y2", d => (d.target as Node).y!);
      }
    });

    return () => {
      if (simulation.current) simulation.current.stop();
    };
  }, [nodes]);

  useEffect(() => {
    if (!simulation.current || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    
    // Time for a bird's eye view! 
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>();
    const g = svg.select("g");
    
    // Where's everyone hanging out?
    const partyPeople = simulation.current.nodes();
    const danceFloor = {
      minX: d3.min(partyPeople, d => d.x!) || 0,
      maxX: d3.max(partyPeople, d => d.x!) || width,
      minY: d3.min(partyPeople, d => d.y!) || 0,
      maxY: d3.max(partyPeople, d => d.y!) || height
    };
    
    // Make room for dancing! 
    const personalSpace = 50;
    const floorWidth = danceFloor.maxX - danceFloor.minX + personalSpace * 2;
    const floorHeight = danceFloor.maxY - danceFloor.minY + personalSpace * 2;
    
    // How far should we step back to see everyone?
    const zoomLevel = Math.min(
      width / floorWidth,
      height / floorHeight,
      1 // Don't get too close!
    ) * 0.85; // Leave some breathing room
    
    // Where's the DJ booth? (center of the action)
    const djBoothX = (danceFloor.minX + danceFloor.maxX) / 2;
    const djBoothY = (danceFloor.minY + danceFloor.maxY) / 2;
    
    // Let's get this party started! 
    const cameraMove = d3.zoomIdentity
      .translate(width / 2 - djBoothX * zoomLevel, height / 2 - djBoothY * zoomLevel)
      .scale(zoomLevel);

    // First, let's see who's here
    svg.transition()
      .duration(1500)
      .ease(d3.easeCubicInOut)
      .call(zoomBehavior.transform, cameraMove)
      .on("end", () => {
        if (selectedType) {
          // Everyone spread out!
          simulation.current!
            .force("x", d3.forceX<Node>(width / 2).strength(0.01))
            .force("y", d3.forceY<Node>(height / 2).strength(0.01))
            .force("charge", d3.forceManyBody().strength(-150).distanceMax(300))
            .force("collide", d3.forceCollide().radius(35).strength(0.8).iterations(4));

          simulation.current!.alpha(0.4).restart();

          // VIP section time! 
          setTimeout(() => {
            // Add some gentle swaying for selected nodes
            const t = Date.now();
            simulation.current!
              .force("x", d3.forceX<Node>(d => {
                if (d.type === selectedType) {
                  // Make selected nodes sway gently
                  return width / 2 + Math.sin((t + d.id.length * 1000) / 2000) * 20;
                }
                return width / 2;
              }).strength(d => d.type === selectedType ? 0.3 : 0.02))
              .force("y", d3.forceY<Node>(d => {
                if (d.type === selectedType) {
                  // Add slight vertical movement too
                  return height / 2 + Math.cos((t + d.id.length * 1000) / 2000) * 10;
                }
                return height / 2;
              }).strength(d => d.type === selectedType ? 0.3 : 0.02))
              .force("charge", d3.forceManyBody().strength(d => {
                if (d.type === selectedType) {
                  // VIPs stick together
                  return -30;
                }
                // Others keep their distance
                return -100;
              }).distanceMax(300))
              .force("collide", d3.forceCollide().radius(d => {
                if (d.type === selectedType) {
                  // VIPs get cozy
                  return 25;
                }
                // Others maintain personal space
                return 35;
              }).strength(0.9).iterations(4));

            simulation.current!.alpha(0.6).restart();

            // Zoom in on the action with a gentle ease
            setTimeout(() => {
              svg.transition()
                .duration(2500)
                .ease(d3.easeCubicInOut)
                .call(zoomBehavior.transform, d3.zoomIdentity.scale(1.1));
            }, 800);
          }, 1500);
        } else {
          // Back to mingling!
          simulation.current!
            .force("x", d3.forceX<Node>(width / 2).strength(0.03))
            .force("y", d3.forceY<Node>(height / 2).strength(0.03))
            .force("charge", d3.forceManyBody().strength(-80).distanceMax(300))
            .force("collide", d3.forceCollide().radius(30).strength(0.5).iterations(3));

          simulation.current!.alpha(0.3).restart();
          
          // Everyone can see everyone again
          svg.transition()
            .duration(2000)
            .ease(d3.easeCubicInOut)
            .call(zoomBehavior.transform, d3.zoomIdentity);
        }
      });

    // Fade the wallflowers with a gentler touch
    svg.selectAll("g.node")
      .transition()
      .duration(2500)
      .ease(d3.easeCubicInOut)
      .attr("opacity", d => d.type === selectedType || !selectedType ? 1 : 0.15);

    // And their connections
    svg.selectAll("line")
      .transition()
      .duration(2500)
      .ease(d3.easeCubicInOut)
      .attr("opacity", d => {
        const source = d.source as Node;
        const target = d.target as Node;
        if (!selectedType) return 0.2;
        return (source.type === selectedType || target.type === selectedType) ? 0.4 : 0.05;
      });

  }, [selectedType]);

  useEffect(() => {
    let animationFrameId: number;
    const waves = collisionWaves;

    const animate = (timestamp: number) => {
      const waveDuration = 1000; 
      const updatedWaves = waves.filter(wave => {
        const elapsed = timestamp - wave.startTime;
        return elapsed < waveDuration;
      });

      if (svgRef.current) {
        const waveElements = d3.select(svgRef.current)
          .selectAll('.collision-wave')
          .data(updatedWaves, (d: any) => d.startTime);

        waveElements.enter()
          .append('circle')
          .attr('class', 'collision-wave')
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
          .style('fill', 'none')
          .style('stroke', d => d.color)
          .style('stroke-width', '2px');

        waveElements
          .attr('r', d => {
            const elapsed = timestamp - d.startTime;
            const progress = elapsed / waveDuration;
            return d.radius * progress;
          })
          .style('stroke-opacity', d => {
            const elapsed = timestamp - d.startTime;
            const progress = elapsed / waveDuration;
            return 1 - progress;
          });

        waveElements.exit().remove();
      }

      setCollisionWaves(updatedWaves);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [collisionWaves]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100vh',
        background: 'transparent'
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onNodeSelect(null);
        }
      }}
    />
  );
};

export default ForceGraph;
