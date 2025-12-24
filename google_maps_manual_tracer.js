// ==============================================================================
// 🎯 GOOGLE MAPS MANUAL BOUNDARY TRACER
// ==============================================================================
//
// Since Google doesn't expose polygon coordinates directly, this tool lets you
// CLICK on the map to trace the boundary yourself.
//
// HOW TO USE:
// 1. Paste this script in the console
// 2. Click "Start Tracing" or run startTrace()
// 3. Click along the pink boundary to add points
// 4. Run getBoundary() when done
//
// ==============================================================================

(function() {
    'use strict';
    
    console.clear();
    console.log('%c🎯 Google Maps Manual Boundary Tracer', 'font-size: 20px; font-weight: bold; color: #4285f4;');
    
    // Storage
    window.TRACE = {
        points: [],
        isTracing: false,
        markers: []
    };
    
    // Create control panel
    const panel = document.createElement('div');
    panel.id = 'trace-panel';
    panel.innerHTML = `
        <div style="
            position: fixed;
            top: 80px;
            right: 20px;
            background: #1a1a2e;
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            z-index: 99999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 200px;
        ">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">
                🎯 Boundary Tracer
            </div>
            <div id="trace-status" style="margin-bottom: 10px; padding: 8px; background: #2d2d44; border-radius: 6px;">
                Points: <span id="point-count">0</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button id="btn-start" style="
                    padding: 8px 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">▶ Start</button>
                <button id="btn-stop" style="
                    padding: 8px 16px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">⏹ Stop</button>
                <button id="btn-undo" style="
                    padding: 8px 16px;
                    background: #ff9800;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">↩ Undo</button>
                <button id="btn-clear" style="
                    padding: 8px 16px;
                    background: #9e9e9e;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">🗑 Clear</button>
                <button id="btn-export" style="
                    padding: 8px 16px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">📋 Export</button>
            </div>
            <div id="trace-coords" style="
                margin-top: 10px;
                max-height: 150px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 11px;
                background: #0d0d1a;
                padding: 8px;
                border-radius: 6px;
                display: none;
            "></div>
        </div>
    `;
    document.body.appendChild(panel);
    
    // Get map container
    function getMapContainer() {
        return document.querySelector('#scene') || 
               document.querySelector('[data-id="scene"]') ||
               document.querySelector('.widget-scene') ||
               document.querySelector('canvas')?.parentElement;
    }
    
    // Convert pixel to lat/lng (approximate based on viewport)
    function pixelToLatLng(x, y) {
        // Get current map center and zoom from URL
        const url = window.location.href;
        const match = url.match(/@([-\d.]+),([-\d.]+),([\d.]+)z/);
        
        if (!match) {
            console.log('Could not parse map coordinates from URL');
            return null;
        }
        
        const centerLat = parseFloat(match[1]);
        const centerLng = parseFloat(match[2]);
        const zoom = parseFloat(match[3]);
        
        // Get map container dimensions
        const container = getMapContainer();
        if (!container) return null;
        
        const rect = container.getBoundingClientRect();
        const mapWidth = rect.width;
        const mapHeight = rect.height;
        
        // Calculate meters per pixel at this zoom level
        // At zoom 0, the world is 256 pixels wide = 40075km
        const metersPerPixel = 40075016.686 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom + 8);
        
        // Offset from center in pixels
        const offsetX = x - rect.left - mapWidth / 2;
        const offsetY = rect.top + mapHeight / 2 - y;
        
        // Convert to degrees (approximate)
        const lng = centerLng + (offsetX * metersPerPixel) / (111320 * Math.cos(centerLat * Math.PI / 180));
        const lat = centerLat + (offsetY * metersPerPixel) / 110540;
        
        return { lat, lng };
    }
    
    // Add visual marker
    function addMarker(x, y, index) {
        const marker = document.createElement('div');
        marker.className = 'trace-marker';
        marker.style.cssText = `
            position: fixed;
            left: ${x - 6}px;
            top: ${y - 6}px;
            width: 12px;
            height: 12px;
            background: #ff4444;
            border: 2px solid white;
            border-radius: 50%;
            z-index: 99998;
            pointer-events: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `;
        
        const label = document.createElement('div');
        label.style.cssText = `
            position: fixed;
            left: ${x + 8}px;
            top: ${y - 8}px;
            background: #333;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            z-index: 99998;
            pointer-events: none;
        `;
        label.textContent = index + 1;
        
        document.body.appendChild(marker);
        document.body.appendChild(label);
        window.TRACE.markers.push(marker, label);
    }
    
    // Clear markers
    function clearMarkers() {
        window.TRACE.markers.forEach(m => m.remove());
        window.TRACE.markers = [];
    }
    
    // Update display
    function updateDisplay() {
        document.getElementById('point-count').textContent = window.TRACE.points.length;
        
        const coordsDiv = document.getElementById('trace-coords');
        if (window.TRACE.points.length > 0) {
            coordsDiv.style.display = 'block';
            coordsDiv.innerHTML = window.TRACE.points
                .map((p, i) => `${i + 1}. [${p.lng.toFixed(6)}, ${p.lat.toFixed(6)}]`)
                .join('<br>');
        } else {
            coordsDiv.style.display = 'none';
        }
    }
    
    // Click handler
    function handleClick(e) {
        if (!window.TRACE.isTracing) return;
        
        // Ignore clicks on the panel
        if (e.target.closest('#trace-panel')) return;
        
        const coords = pixelToLatLng(e.clientX, e.clientY);
        if (!coords) return;
        
        window.TRACE.points.push(coords);
        addMarker(e.clientX, e.clientY, window.TRACE.points.length - 1);
        updateDisplay();
        
        console.log(`📍 Point ${window.TRACE.points.length}: [${coords.lng.toFixed(6)}, ${coords.lat.toFixed(6)}]`);
    }
    
    // Button handlers
    document.getElementById('btn-start').onclick = () => {
        window.TRACE.isTracing = true;
        document.getElementById('btn-start').style.background = '#45a049';
        console.log('%c▶ Tracing started! Click on the map to add points.', 'color: #4CAF50; font-weight: bold;');
    };
    
    document.getElementById('btn-stop').onclick = () => {
        window.TRACE.isTracing = false;
        document.getElementById('btn-start').style.background = '#4CAF50';
        console.log('%c⏹ Tracing stopped.', 'color: #f44336;');
    };
    
    document.getElementById('btn-undo').onclick = () => {
        if (window.TRACE.points.length > 0) {
            window.TRACE.points.pop();
            const marker = window.TRACE.markers.pop();
            const label = window.TRACE.markers.pop();
            if (marker) marker.remove();
            if (label) label.remove();
            updateDisplay();
            console.log('↩ Last point removed');
        }
    };
    
    document.getElementById('btn-clear').onclick = () => {
        window.TRACE.points = [];
        clearMarkers();
        updateDisplay();
        console.log('🗑 All points cleared');
    };
    
    document.getElementById('btn-export').onclick = () => {
        getBoundary();
    };
    
    // Add click listener
    document.addEventListener('click', handleClick, true);
    
    // Export function
    window.getBoundary = function(format = 'geojson') {
        const points = window.TRACE.points;
        
        if (points.length < 3) {
            console.log('%c❌ Need at least 3 points to create a polygon', 'color: #f44336');
            return null;
        }
        
        // Create coordinate array [lng, lat]
        const coords = points.map(p => [p.lng, p.lat]);
        
        // Close the polygon
        if (coords[0][0] !== coords[coords.length-1][0] || 
            coords[0][1] !== coords[coords.length-1][1]) {
            coords.push([...coords[0]]);
        }
        
        if (format === 'google') {
            const result = coords.map(c => ({ lat: c[1], lng: c[0] }));
            console.log('%c📋 Google Maps Format:', 'font-weight: bold; color: #4285f4;');
            console.log(JSON.stringify(result, null, 2));
            navigator.clipboard.writeText(JSON.stringify(result, null, 2));
            console.log('%c✅ Copied to clipboard!', 'color: #4CAF50;');
            return result;
        }
        
        if (format === 'leaflet') {
            const result = coords.map(c => [c[1], c[0]]);
            console.log('%c📋 Leaflet Format:', 'font-weight: bold; color: #4285f4;');
            console.log(JSON.stringify(result, null, 2));
            navigator.clipboard.writeText(JSON.stringify(result, null, 2));
            console.log('%c✅ Copied to clipboard!', 'color: #4CAF50;');
            return result;
        }
        
        if (format === 'array') {
            console.log('%c📋 Array Format:', 'font-weight: bold; color: #4285f4;');
            console.log(JSON.stringify(coords, null, 2));
            navigator.clipboard.writeText(JSON.stringify(coords, null, 2));
            console.log('%c✅ Copied to clipboard!', 'color: #4CAF50;');
            return coords;
        }
        
        // Default: GeoJSON
        const geojson = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                properties: {
                    name: "Traced Boundary",
                    pointCount: coords.length,
                    source: "Manual trace on Google Maps",
                    createdAt: new Date().toISOString()
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [coords]
                }
            }]
        };
        
        console.log('%c📋 GeoJSON:', 'font-weight: bold; color: #4285f4;');
        console.log(JSON.stringify(geojson, null, 2));
        navigator.clipboard.writeText(JSON.stringify(geojson, null, 2));
        console.log('%c✅ Copied to clipboard!', 'color: #4CAF50;');
        return geojson;
    };
    
    window.downloadBoundary = function() {
        const data = getBoundary();
        if (!data) return;
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'traced_boundary.geojson';
        a.click();
        console.log('%c✅ Downloaded!', 'color: #4CAF50;');
    };
    
    window.startTrace = () => document.getElementById('btn-start').click();
    window.stopTrace = () => document.getElementById('btn-stop').click();
    
    // Instructions
    console.log('');
    console.log('%c📌 HOW TO USE:', 'font-weight: bold;');
    console.log('1. Click the green "▶ Start" button (or run startTrace())');
    console.log('2. Click along the pink boundary on the map');
    console.log('3. Add points clockwise or counter-clockwise');
    console.log('4. Click "📋 Export" or run getBoundary()');
    console.log('');
    console.log('%c📌 TIPS:', 'font-weight: bold;');
    console.log('• Zoom in for more precision');
    console.log('• Use "↩ Undo" to remove the last point');
    console.log('• Add more points on curves for smoother boundary');
    console.log('');
    console.log('%c✅ Ready! Click "Start" to begin tracing.', 'color: #4CAF50; font-weight: bold;');
    
})();
