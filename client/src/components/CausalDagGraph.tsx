/**
 * CausalDagGraph — D3 force-directed visualization of a causal DAG.
 *
 * Nodes are colored by type (treatment/outcome/confounder/mediator/collider/instrument).
 * Directed edges are drawn with arrowheads; backdoor edges are red.
 * Clicking a node shows its description tooltip.
 * Zoom + pan via d3-zoom.
 */

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// ── Types ────────────────────────────────────────────────────────────────────

interface DagNode {
  id: number;
  nodeType: string;
  label: string;
  description?: string | null;
  positionX?: string | null;
  positionY?: string | null;
}

interface DagEdge {
  id: number;
  fromNodeId: number;
  toNodeId: number;
  edgeType: string;
  isBackdoor: boolean;
  estimatedAce?: string | null;
  aceUnit?: string | null;
  evidenceGrade?: string | null;
}

interface Props {
  nodes: DagNode[];
  edges: DagEdge[];
  width?: number;
  height?: number;
}

// ── Color map ────────────────────────────────────────────────────────────────

const NODE_FILL: Record<string, string> = {
  treatment:   "#3b82f6", // blue
  outcome:     "#22c55e", // green
  confounder:  "#f59e0b", // amber
  mediator:    "#a855f7", // purple
  collider:    "#ef4444", // red
  instrument:  "#06b6d4", // cyan
  exposure:    "#f97316", // orange
};

const NODE_STROKE: Record<string, string> = {
  treatment:   "#1d4ed8",
  outcome:     "#15803d",
  confounder:  "#b45309",
  mediator:    "#7e22ce",
  collider:    "#b91c1c",
  instrument:  "#0e7490",
  exposure:    "#c2410c",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function CausalDagGraph({ nodes, edges, width = 800, height = 480 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ label: string; desc: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ── Defs: arrowheads ────────────────────────────────────────────────────
    const defs = svg.append("defs");

    const addArrow = (id: string, color: string) => {
      defs.append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    };

    addArrow("arrow-normal", "#94a3b8");
    addArrow("arrow-backdoor", "#ef4444");

    // ── Zoom container ──────────────────────────────────────────────────────
    const g = svg.append("g").attr("class", "zoom-container");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setTooltip(null);
      });

    svg.call(zoom);

    // ── Build simulation data ───────────────────────────────────────────────
    type SimNode = d3.SimulationNodeDatum & DagNode & { x: number; y: number };
    type SimLink = d3.SimulationLinkDatum<SimNode> & DagEdge;

    const simNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: n.positionX ? parseFloat(n.positionX) : Math.random() * width,
      y: n.positionY ? parseFloat(n.positionY) : Math.random() * height,
    }));

    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .filter((e) => nodeById.has(e.fromNodeId) && nodeById.has(e.toNodeId))
      .map((e) => ({
        ...e,
        source: nodeById.get(e.fromNodeId)!,
        target: nodeById.get(e.toNodeId)!,
      }));

    // ── Force simulation ────────────────────────────────────────────────────
    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(120)
        .strength(0.6))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(40));

    // ── Draw edges ──────────────────────────────────────────────────────────
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d) => d.isBackdoor ? "#ef4444" : "#94a3b8")
      .attr("stroke-width", (d) => d.isBackdoor ? 2 : 1.5)
      .attr("stroke-dasharray", (d) => d.edgeType === "indirect" ? "5,3" : null)
      .attr("marker-end", (d) => d.isBackdoor ? "url(#arrow-backdoor)" : "url(#arrow-normal)");

    // ── Edge ACE labels ─────────────────────────────────────────────────────
    const edgeLabel = g.append("g")
      .attr("class", "edge-labels")
      .selectAll("text")
      .data(simLinks.filter((d) => d.estimatedAce))
      .join("text")
      .attr("font-size", 9)
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .text((d) => `ACE=${d.estimatedAce}${d.aceUnit ? ` ${d.aceUnit}` : ""}`);

    // ── Draw nodes ──────────────────────────────────────────────────────────
    const nodeGroup = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x; d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          }) as any
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          label: d.label,
          desc: d.description || `Type: ${d.nodeType}`,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      });

    // Node circle
    nodeGroup.append("circle")
      .attr("r", 20)
      .attr("fill", (d) => NODE_FILL[d.nodeType] ?? "#94a3b8")
      .attr("stroke", (d) => NODE_STROKE[d.nodeType] ?? "#64748b")
      .attr("stroke-width", 2)
      .attr("fill-opacity", 0.85);

    // Node label
    nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 32)
      .attr("font-size", 10)
      .attr("fill", "#1e293b")
      .attr("font-weight", "500")
      .text((d) => d.label.length > 16 ? d.label.slice(0, 14) + "…" : d.label);

    // Node type icon (first letter)
    nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 11)
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .text((d) => d.nodeType[0].toUpperCase());

    // ── Dismiss tooltip on svg click ────────────────────────────────────────
    svg.on("click", () => setTooltip(null));

    // ── Simulation tick ─────────────────────────────────────────────────────
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x)
        .attr("y1", (d) => (d.source as SimNode).y)
        .attr("x2", (d) => (d.target as SimNode).x)
        .attr("y2", (d) => (d.target as SimNode).y);

      edgeLabel
        .attr("x", (d) => ((d.source as SimNode).x + (d.target as SimNode).x) / 2)
        .attr("y", (d) => ((d.source as SimNode).y + (d.target as SimNode).y) / 2 - 5);

      nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, width, height]);

  return (
    <div className="relative rounded-lg border bg-slate-50/50 overflow-hidden" style={{ height }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-white/90 border rounded-lg px-3 py-2 text-xs space-y-1 shadow-sm">
        {Object.entries(NODE_FILL).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border" style={{ background: color }} />
            <span className="capitalize text-slate-600">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t mt-1">
          <span className="inline-block w-6 border-t-2 border-red-400 border-dashed" />
          <span className="text-slate-600">Backdoor path</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-white border rounded-lg shadow-lg px-3 py-2 text-xs max-w-xs z-10 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="font-semibold text-slate-800 mb-1">{tooltip.label}</div>
          <div className="text-slate-600">{tooltip.desc}</div>
        </div>
      )}

      {/* Hint */}
      <div className="absolute bottom-2 right-3 text-xs text-slate-400">
        Drag nodes · Scroll to zoom · Click node for details
      </div>
    </div>
  );
}
