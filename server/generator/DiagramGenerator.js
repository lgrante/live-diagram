"use strict";

const dagre = require('dagre');
const { CONFIG, THEMES } = require('../config');
const { ModalManager } = require('./ModalManager');
const { NodeContentGenerator } = require('./NodeContentGenerator');
const { ShapeBuilder } = require('./ShapeBuilder');

/**
 * DiagramGenerator
 * Orchestrates Dagre graph creation and full SVG rendering from input data.
 */
class DiagramGenerator {
  /**
   * @param {'light'|'dark'} theme
   * @param {'TB'|'BT'|'LR'|'RL'} layout
   */
  constructor(theme = 'light', layout = 'TB') {
    this.themeColors = THEMES[theme] || THEMES.light;
    this.layout = layout;
    this.modalManager = new ModalManager();
    this.nodeGenerator = new NodeContentGenerator(this.themeColors, this.modalManager);
  }

  /** Generate SVG string from data. */
  generateSVG(diagramData) {
    const graph = this.createGraph(diagramData);
    dagre.layout(graph);
    return this.renderSVG(graph);
  }

  /** Build Dagre graph with clusters, nodes, and edges. */
  createGraph(diagramData) {
    const graph = new dagre.graphlib.Graph({ compound: true });
    graph.setGraph({ ...CONFIG.layoutDefaults, rankdir: this.layout });
    graph.setDefaultEdgeLabel(() => ({}));
    this.createGroups(graph, diagramData);
    this.addNodes(graph, diagramData);
    this.addEdges(graph, diagramData);
    return graph;
  }

  /** Define clusters for groups. */
  createGroups(graph, diagramData) {
    const groups = [...new Set(diagramData.elements.filter(e => e.group).map(e => e.group))];
    groups.forEach(group => {
      graph.setNode(group, { label: group, clusterLabelPos: 'top', style: `fill:${this.themeColors.clusterBg};stroke:${this.themeColors.border}` });
    });
  }

  /** Add node vertices. */
  addNodes(graph, diagramData) {
    diagramData.elements.forEach(element => {
      const { svg, width, height } = this.nodeGenerator.generateContent(element);
      element.generatedSvg = svg;
      graph.setNode(element.id, { label: element.title, width, height, ...element });
      if (element.group) graph.setParent(element.id, element.group);
    });
  }

  /** Add edges. */
  addEdges(graph, diagramData) {
    diagramData.relations.forEach(relation => {
      const edgeProps = { ...relation };
      if ((relation.title || relation.content_list) && !relation.width) {
        edgeProps.width = 180; edgeProps.height = 50;
      }
      graph.setEdge(relation.from, relation.to, edgeProps);
    });
  }

  /** Render final SVG string. */
  renderSVG(graph) {
    const graphWidth = graph.graph().width || 1200;
    const graphHeight = graph.graph().height || 800;
    let svg = this.generateSVGHeader(graphWidth, graphHeight);
    svg += this.generateStylesAndScripts();
    svg += '<g transform="translate(25, 25)">';
    svg += this.renderClusters(graph);
    svg += this.renderEdges(graph);
    svg += this.renderNodes(graph);
    svg += '</g>';
    svg += `<foreignObject x="0" y="0" width="100%" height="100%" style="pointer-events:none;">${this.modalManager.generateModalsHTML(this.themeColors)}</foreignObject>`;
    svg += '</svg>';
    return svg;
  }

  /** SVG header */
  generateSVGHeader(width, height) {
    return `<svg width="${width + 50}" height="${height + 50}" xmlns="http://www.w3.org/2000/svg" style="background-color:${this.themeColors.background};font-family:${CONFIG.fontFamily};">`;
  }

  /** Styles and scripts injected inside <defs>. */
  generateStylesAndScripts() {
    return `<defs><style type="text/css"><![CDATA[.edge-label{font-size:11px;fill:${this.themeColors.textFaded};text-anchor:middle;dominant-baseline:middle}.cluster-label{fill:${this.themeColors.text};font-weight:700}${this.modalManager.generateModalCSS(this.themeColors)}]]></style><script type="application/javascript"><![CDATA[${this.modalManager.generateModalJS()}]]></script><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${this.themeColors.arrow}"/></marker></defs>`;
  }

  /** Render cluster rectangles. */
  renderClusters(graph) {
    let svg = '';
    graph.nodes().forEach(nodeId => {
      const node = graph.node(nodeId);
      if (node.clusterLabelPos) {
        const x = node.x - node.width / 2;
        const y = node.y - node.height / 2;
        svg += `<g transform="translate(${x},${y})"><rect width="${node.width}" height="${node.height}" rx="${CONFIG.borderRadius}" ry="${CONFIG.borderRadius}" fill="${this.themeColors.clusterBg}" stroke="${this.themeColors.border}" stroke-width="1.5"/><text x="15" y="25" class="cluster-label">${node.label}</text></g>`;
      }
    });
    return svg;
  }

  /** Render edges */
  renderEdges(graph) {
    let svg = '';
    graph.edges().forEach(e => {
      const edge = graph.edge(e);
      const pathData = edge.points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');
      let strokeStyle = '';
      if (edge.style === 'dashed') strokeStyle = 'stroke-dasharray="5, 5"';
      if (edge.style === 'dotted') strokeStyle = 'stroke-dasharray="2, 3"';
      const strokeColor = edge.color || this.themeColors.border;
      svg += `<path d="${pathData}" stroke="${strokeColor}" stroke-width="2" fill="none" marker-end="url(#arrow)" ${strokeStyle}/>`;
      svg += this.renderEdgeLabel(edge);
    });
    return svg;
  }

  /** Render edge label */
  renderEdgeLabel(edge) {
    const x = edge.x - (edge.width || 0) / 2;
    const y = edge.y - (edge.height || 0) / 2;
    if (edge.content_list || edge.title) {
      const labelHtml = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};color:${this.themeColors.text};padding:10px;height:100%;width:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;background-color:${this.themeColors.api};border:1px solid ${this.themeColors.border};border-radius:${CONFIG.borderRadius}px;"><div>${edge.title ? `<h4 style='text-align:center;margin:0 0 8px 0;font-weight:600;'>${edge.title}</h4>` : ''}</div></div>`;
      return `<g transform="translate(${x},${y})"><foreignObject width="${edge.width}" height="${edge.height}">${labelHtml}</foreignObject></g>`;
    }
    return '';
  }

  /** Render nodes */
  renderNodes(graph) {
    let svg = '';
    graph.nodes().forEach(nodeId => {
      const node = graph.node(nodeId);
      if (!node.clusterLabelPos) {
        const x = node.x - node.width / 2;
        const y = node.y - node.height / 2;
        const type = node.type || 'default';
        const fillColor = this.themeColors[type] || this.themeColors.default;
        const borderColor = this.themeColors.border;
        const shapeSpec = node.shape || { type: 'rect' };
        const shapeSvg = ShapeBuilder.buildShapeSvg(shapeSpec, node.width, node.height, fillColor, borderColor, CONFIG.borderRadius);
        const onClick = `onclick="if(window.openEditorForElement){window.openEditorForElement('${node.id}')}"`;
        const cursor = `style="cursor:pointer"`;
        const aria = `role="button" aria-label="Open editor for ${node.id}"`;
        svg += `\n<g transform="translate(${x},${y})" ${onClick} ${cursor} ${aria}>${shapeSvg}${node.generatedSvg}</g>`;
      }
    });
    return svg;
  }
}

module.exports = { DiagramGenerator };


