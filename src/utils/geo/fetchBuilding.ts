import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';
import { cleanAndStandardize, latLonToMeters, ensureCCW } from './geoShared';
import { fetchRoadsGeometry } from './fetchRoads';

// Export for siblings
export { fetchTerrainGeometry } from './fetchTerrain';

export const fetchBuildingsGeometry = async (
    centerLat: number, 
    centerLon: number, 
    radiusKM: number = 0.2,
    setStatus?: (msg: string) => void,
    options: { enableRoads?: boolean } = {}
) => {
    if (setStatus) setStatus("Connecting...");
    
    // 1. BASEPLATE
    const baseGeom = new THREE.BoxGeometry(100, 2, 100);
    baseGeom.translate(0, -1, 0); 
    const finalBase = cleanAndStandardize(baseGeom);

    const fetchRadius = radiusKM * 1.5; 
    const latOffset = fetchRadius / 111;
    const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));
    const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;

    // QUERY UPDATE: We now specifically ask for relations (complex buildings) and their members
    // Note: Parsing relations manually is hard. 
    // For this snippet, we will stick to 'way' but process 'building:part' which adds detail.
    const query = `
      [out:json][timeout:25];
      (
        way["building"](${bbox});
        way["building:part"](${bbox});
      );
      out geom;
    `;

    const API_URL = "https://overpass.kumi.systems/api/interpreter"; 
    
    if (setStatus) setStatus("Downloading Map Data...");

    let data;
    try {
        const res = await fetch(`${API_URL}?data=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("API Error");
        data = await res.json();
    } catch (err) {
        return { buildings: null, base: finalBase };
    }

    if (setStatus) setStatus("Trimming & Building...");

    const CLIP_BOX: any = [[[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]]];
    
    // Filter for ways with geometry
    const elements = data.elements.filter((el: any) => (el.type === 'way' && el.geometry));
    if (elements.length === 0) return { buildings: null, base: finalBase };

    const buildingGeometries: THREE.BufferGeometry[] = [];
    const scale = 50 / (radiusKM * 1000); 

    // --- PARALLEL TASKS ---
    let mergedRoadsPromise: Promise<THREE.BufferGeometry | null> = Promise.resolve(null);
    if (options.enableRoads) {
        if (setStatus) setStatus("Fetching Road Network...");
        mergedRoadsPromise = fetchRoadsGeometry(centerLat, centerLon, radiusKM);
    }
    // ----------------------

    elements.forEach((el: any) => {
        try {
            // -- 1. CHECK FOR SPECIAL TAGS (MODEL SUBSTITUTION HOOK) --
            // If you want a Ferris Wheel, check tags here and load a GLB instead.
            // if (el.tags?.attraction === 'ferris_wheel') { loadGLB(...); return; }

            // -- 2. PARSE HEIGHTS --
            let height = 12;
            let minHeight = 0;

            if (el.tags) {
                if (el.tags.height) {
                    height = parseFloat(el.tags.height);
                } else if (el.tags['building:levels']) {
                    height = parseFloat(el.tags['building:levels']) * 3.5;
                }

                if (el.tags.min_height) {
                    minHeight = parseFloat(el.tags.min_height);
                } else if (el.tags['building:min_level']) {
                    minHeight = parseFloat(el.tags['building:min_level']) * 3.5;
                }
            }

            if (height <= minHeight) return;

            // -- 3. CONVERT COORDINATES --
            const rawPoints: [number, number][] = [];
            el.geometry.forEach((node: any) => {
                const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                rawPoints.push([pt.x * scale, pt.y * scale]);
            });

            if (rawPoints.length < 3) return;

            // Close the loop
            const first = rawPoints[0];
            const last = rawPoints[rawPoints.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) rawPoints.push([first[0], first[1]]);

            const fixedRing = ensureCCW(rawPoints);
            const intersection = polygonClipping.intersection([fixedRing], CLIP_BOX);
            
            // -- 4. BUILD SHAPE WITH HOLES (THE FIX) --
            intersection.forEach((poly) => {
                // poly is [Outer, Hole, Hole...]
                if (poly.length === 0) return;

                const outerRing = poly[0];
                const shape = new THREE.Shape();

                // Draw Outer
                shape.moveTo(outerRing[0][0], outerRing[0][1]);
                for (let i = 1; i < outerRing.length; i++) shape.lineTo(outerRing[i][0], outerRing[i][1]);

                // Draw Holes (if any exist)
                for (let k = 1; k < poly.length; k++) {
                    const holeRing = poly[k];
                    if (holeRing.length < 3) continue;
                    const holePath = new THREE.Path();
                    holePath.moveTo(holeRing[0][0], holeRing[0][1]);
                    for (let j = 1; j < holeRing.length; j++) holePath.lineTo(holeRing[j][0], holeRing[j][1]);
                    shape.holes.push(holePath);
                }
                
                const extrudeSettings = { steps: 1, depth: (height - minHeight) * scale, bevelEnabled: false };
                const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                
                if (!geom.attributes.position || geom.attributes.position.count === 0) return;

                geom.rotateX(-Math.PI / 2); 
                geom.translate(0, minHeight * scale, 0); 
                
                buildingGeometries.push(cleanAndStandardize(geom));
            });
        } catch (e) {
            // robust error handling prevents one bad building from crashing the map
        }
    });

    let finalBuildings = null;
    if (buildingGeometries.length > 0) {
        try {
            finalBuildings = BufferGeometryUtils.mergeGeometries(buildingGeometries);
            buildingGeometries.forEach(g => g.dispose()); 
        } catch (e) {
            console.error("Merge failed", e);
        }
    }

    const roads = await mergedRoadsPromise;

    return { 
        buildings: finalBuildings, 
        base: finalBase,
        roads: roads
    };
};
