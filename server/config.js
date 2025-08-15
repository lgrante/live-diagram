"use strict";

/**
 * Global visual configuration and themes for the diagram generator.
 * The palettes are intentionally sober, with a GitHub-like dark theme.
 */

/**
 * CONFIG: layout and typography defaults used across the generator.
 * @type {{fontFamily: string, titleFontSize: number, lineHeight: number, padding: number, borderRadius: number, layoutDefaults: {rankdir: string, nodesep: number, ranksep: number}}}
 */
const CONFIG = {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    titleFontSize: 16,
    lineHeight: 1.4,
    padding: 20,
    borderRadius: 8,
    layoutDefaults: { rankdir: 'TB', nodesep: 50, ranksep: 70 }
};

/**
 * THEMES: Light and Dark palettes used by the server to render SVGs.
 * Keep in sync with client-side CSS for a coherent experience.
 */
const THEMES = {
    // Aligné sur les tokens décrits dans regles_de_couleur...
    light: {
        background: '#ffffff',
        text: '#111827',          // gray-900
        textFaded: '#6b7280',      // gray-500
        border: '#e5e7eb',         // gray-200
        arrow: '#6b7280',          // neutral arrow
        default: '#ffffff',
        person: '#e0f2fe',         // sky-100
        system: '#dcfce7',         // green-100
        database: '#fef9c3',       // yellow-100
        api: '#fae8ff',            // purple-100
        tableau: '#f3f4f6',        // gray-100
        hover: '#eef2f7',          // light hover
        clusterBg: '#f9fafb',      // gray-50
        modalBg: '#ffffff',
        modalShadow: 'rgba(0,0,0,0.10)'
    },
    dark: {
        background: '#0d1117',
        text: '#e5e7eb',           // near gray-50
        textFaded: '#9ca3af',      // gray-400
        border: '#30363d',
        arrow: '#8b949e',
        default: '#161b22',
        person: '#0b2f53',
        system: '#113227',
        database: '#3b2f0b',
        api: '#2b213a',
        tableau: '#1f242d',
        hover: '#21262d',
        clusterBg: '#161b22',
        modalBg: '#161b22',
        modalShadow: 'rgba(0,0,0,0.45)'
    }
};

module.exports = { CONFIG, THEMES };


