"use strict";

const { CONFIG } = require('../config');

/**
 * ShapeBuilder
 * Produces SVG shapes around nodes.
 */
class ShapeBuilder {
  /**
   * Build a shape SVG snippet.
   * @param {{type?: string, radius?: number, rotation?: number, sides?: number, points?: number[][], orientation?: string, skew?: number, head?: number}} shape
   * @param {number} width
   * @param {number} height
   * @param {string} fill
   * @param {string} stroke
   * @param {number} defaultRadius
   * @returns {string}
   */
  static buildShapeSvg(shape, width, height, fill, stroke, defaultRadius) {
    const type = (shape && shape.type) ? String(shape.type).toLowerCase() : 'rect';
    switch (type) {
      case 'rounded':
      case 'rounded-rect':
        return `<rect width="${width}" height="${height}" rx="${shape.radius ?? defaultRadius}" ry="${shape.radius ?? defaultRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
      case 'rect':
        return `<rect width="${width}" height="${height}" rx="${shape.radius ?? defaultRadius}" ry="${shape.radius ?? defaultRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
      default:
        return `<rect width="${width}" height="${height}" rx="${CONFIG.borderRadius}" ry="${CONFIG.borderRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    }
  }
}

module.exports = { ShapeBuilder };


