// First-party crew glass scene — faithful port of the glass-hero experiment:
// seeded Lloyd-relaxed Voronoi cells (regenerated until no edge < min), inset
// by gap/2, rounded, extruded with a bevel; decal MeshPhysicalMaterial
// (clearcoat + iridescence) + additive matcap sheen; hover = cell grow + tilt.
// World units match the source (stage height = 7) so its dial-kit defaults
// transfer verbatim. API: mountGlassPanes(stage, { animate }).

import * as THREE from "three";
import { Delaunay } from "d3-delaunay";

const CFG = {
  pieceCount: 6,
  relaxIterations: 4,
  minEdgeLength: 0.355,
  // source defaults are gap/radius .045 and depth .04, but our seams sit on a
  // light page background — widened, and the slab deepened so the beveled
  // edges catch the lights like the reference capture
  gap: 0.22,
  cornerRadius: 0.14,
  paneDepth: 0.12,
  panePadding: 0.26,
  seed: 7,
  glass: {
    ior: 2.14,
    thickness: 1.35,
    dispersion: 0.415,
    roughness: 0.41,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.59,
    envMapIntensity: 0,
    iridescence: 1,
    iridescenceIOR: 2.34,
    iridescenceThicknessRange: [80, 500],
    attenuationDistance: 4.7,
  },
  matcapStrength: 0.15,
  hover: { tilt: 0.36, cellPush: 1.04, ease: 4 },
};

const WORLD_H = 7; // stage height in world units, as in the source scene
const FOV = 28;

// crew images assigned to cells by descending area (dominant cell = crew-01)
const CREW_BY_AREA = ["crew-01", "crew-02", "crew-03", "crew-04", "crew-05", "crew-06"];

/* ------------------------------------------------------------- helpers */

// mulberry32 — deterministic seeds so the tessellation is stable per build
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lloydSeeds(width, height, count, seed, iterations) {
  const random = rng(seed);
  let points = Array.from({ length: count }, () => [
    random() * width - width / 2,
    random() * height - height / 2,
  ]);
  const bounds = [-width / 2, -height / 2, width / 2, height / 2];
  for (let i = 0; i < iterations; i++) {
    const voronoi = Delaunay.from(points).voronoi(bounds);
    points = points.map((point, cell) => {
      const polygon = voronoi.cellPolygon(cell);
      if (!polygon || polygon.length < 3) return point;
      let x = 0;
      let y = 0;
      for (const [px, py] of polygon) {
        x += px;
        y += py;
      }
      return [x / polygon.length, y / polygon.length];
    });
  }
  return points;
}

function minCellEdge(points, bounds) {
  const voronoi = Delaunay.from(points).voronoi(bounds);
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    const polygon = voronoi.cellPolygon(i);
    if (!polygon || polygon.length < 4) return 0;
    for (let j = 0; j < polygon.length - 1; j++) {
      min = Math.min(
        min,
        Math.hypot(polygon[j + 1][0] - polygon[j][0], polygon[j + 1][1] - polygon[j][1])
      );
    }
  }
  return min;
}

// Convex polygon inset: shift every edge inward by `amount`, intersect
// consecutive offset edges (Voronoi cells are always convex).
function insetConvex(points, amount) {
  const n = points.length;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    // inward normal for a CCW polygon = left of the edge direction
    const nx = -dy / len;
    const ny = dx / len;
    lines.push({
      px: a[0] + nx * amount,
      py: a[1] + ny * amount,
      dx,
      dy,
    });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n];
    const l2 = lines[i];
    const det = l1.dx * l2.dy - l1.dy * l2.dx;
    if (Math.abs(det) < 1e-9) continue;
    const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / det;
    out.push([l1.px + l1.dx * t, l1.py + l1.dy * t]);
  }
  return out.length >= 3 ? out : null;
}

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function roundedShape(points, radius) {
  const n = points.length;
  const shape = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    const v1x = curr[0] - prev[0];
    const v1y = curr[1] - prev[1];
    const v2x = next[0] - curr[0];
    const v2y = next[1] - curr[1];
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const r = Math.min(radius, 0.49 * l1, 0.49 * l2);
    const pA = [curr[0] - (v1x / l1) * r, curr[1] - (v1y / l1) * r];
    const pB = [curr[0] + (v2x / l2) * r, curr[1] + (v2y / l2) * r];
    if (i === 0) shape.moveTo(pA[0], pA[1]);
    else shape.lineTo(pA[0], pA[1]);
    shape.quadraticCurveTo(curr[0], curr[1], pB[0], pB[1]);
  }
  shape.closePath();
  return shape;
}

// Source `AI`: planar bbox UVs with aspect-preserving cover crop.
function applyBoxUv(geometry, imageAspect) {
  const pos = geometry.getAttribute("position");
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minX = Math.min(minX, pos.getX(i));
    minY = Math.min(minY, pos.getY(i));
    maxX = Math.max(maxX, pos.getX(i));
    maxY = Math.max(maxY, pos.getY(i));
  }
  const w = Math.max(1e-6, maxX - minX);
  const h = Math.max(1e-6, maxY - minY);
  const paneAspect = w / h;
  let sx = 1;
  let ox = 0;
  let sy = 1;
  let oy = 0;
  if (imageAspect > paneAspect) {
    sx = paneAspect / imageAspect;
    ox = (1 - sx) / 2;
  } else {
    sy = imageAspect / paneAspect;
    oy = (1 - sy) / 2;
  }
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = ((pos.getX(i) - minX) / w) * sx + ox;
    uv[i * 2 + 1] = ((pos.getY(i) - minY) / h) * sy + oy;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// Source iridescence thickness map: 256px diagonal gradient + radial hotspot.
function makeIridescenceThicknessMap(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const linear = ctx.createLinearGradient(0, 0, size, size);
  linear.addColorStop(0, "#202020");
  linear.addColorStop(0.5, "#a0a0a0");
  linear.addColorStop(1, "#f0f0f0");
  ctx.fillStyle = linear;
  ctx.fillRect(0, 0, size, size);
  const radial = ctx.createRadialGradient(0.3 * size, 0.4 * size, 0, 0.3 * size, 0.4 * size, 0.9 * size);
  radial.addColorStop(0, "rgba(255,255,255,0.4)");
  radial.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/* ----------------------------------------------------------- component */

export async function mountGlassPanes(stage, { animate = true } = {}) {
  const images = [...stage.querySelectorAll(".pane img")];
  if (!images.length) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "glass-stage__scene";
  canvas.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = WORLD_H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  // Source light rig (world units), softened so clearcoat highlights don't blow out.
  const keyLight = new THREE.PointLight("#ffffff", 2.2, 0, 1);
  keyLight.position.set(2, 3, 4);
  const fillLight = new THREE.PointLight("#ccddff", 1.4, 0, 1);
  fillLight.position.set(0, -3, 2);
  scene.add(keyLight, fillLight, new THREE.AmbientLight("#ffffff", 0.7));

  const textureLoader = new THREE.TextureLoader();
  const loadTexture = (url) =>
    new Promise((resolve) => textureLoader.load(url, resolve, undefined, () => resolve(null)));

  const matcap = await loadTexture("/matcaps/1.webp");
  const iridescenceMap = makeIridescenceThicknessMap();

  // crew name -> texture from the fallback grid images
  const crewTextures = {};
  for (const image of images) {
    const name = (image.currentSrc || image.src).split("/").pop()?.split(".")[0] || "";
    const key = CREW_BY_AREA.find((crew) => name.includes(crew));
    if (!key || crewTextures[key]) continue;
    const texture = await loadTexture(image.currentSrc || image.src);
    if (!texture) continue;
    texture.colorSpace = THREE.SRGBColorSpace;
    crewTextures[key] = texture;
  }
  if (!Object.keys(crewTextures).length) {
    renderer.dispose();
    return null;
  }

  const group = new THREE.Group();
  scene.add(group);

  const state = {
    width: 0,
    height: 0,
    worldW: 0,
    running: false,
    destroyed: false,
    frame: 0,
    start: performance.now(),
    pointer: { x: 0, y: 0, inside: false },
    tiltX: 0,
    tiltY: 0,
  };

  let panes = [];
  let cellPolygons = []; // world-space polygons for hover hit-testing

  function buildTessellation() {
    // dispose previous build
    for (const pane of panes) {
      pane.glassMesh.geometry.dispose();
      pane.glassMesh.material.dispose();
      pane.sheenMesh.material.dispose();
      group.remove(pane.holder);
    }
    panes = [];
    cellPolygons = [];

    const W = state.worldW - 2 * CFG.panePadding;
    const H = WORLD_H - 2 * CFG.panePadding;
    const bounds = [-W / 2, -H / 2, W / 2, H / 2];

    // seed retry loop until no cell edge is shorter than minEdgeLength
    let seeds = lloydSeeds(W, H, CFG.pieceCount, CFG.seed, CFG.relaxIterations);
    for (let attempt = 1; attempt < 30 && minCellEdge(seeds, bounds) < CFG.minEdgeLength; attempt++) {
      seeds = lloydSeeds(W, H, CFG.pieceCount, CFG.seed + 1009 * attempt, CFG.relaxIterations);
    }

    const voronoi = Delaunay.from(seeds).voronoi(bounds);
    const cells = [];
    for (let i = 0; i < seeds.length; i++) {
      const polygon = voronoi.cellPolygon(i);
      if (!polygon) continue;
      let ring = polygon.slice(0, -1);
      if (signedArea(ring) < 0) ring = ring.reverse();
      const inset = insetConvex(ring, CFG.gap / 2);
      if (!inset) continue;
      let minEdge = Infinity;
      for (let j = 0; j < inset.length; j++) {
        const a = inset[j];
        const b = inset[(j + 1) % inset.length];
        minEdge = Math.min(minEdge, Math.hypot(b[0] - a[0], b[1] - a[1]));
      }
      cells.push({ points: inset, minEdge, area: Math.abs(signedArea(inset)) });
    }
    const radius = Math.min(CFG.cornerRadius, 0.49 * Math.min(...cells.map((c) => c.minEdge)));

    // dominant cell gets luffy, then by descending area
    const byArea = [...cells].sort((a, b) => b.area - a.area);
    byArea.forEach((cell, rank) => {
      cell.crew = CREW_BY_AREA[rank % CREW_BY_AREA.length];
    });

    for (const cell of cells) {
      const texture = crewTextures[cell.crew];
      if (!texture) continue;
      let cx = 0;
      let cy = 0;
      for (const [x, y] of cell.points) {
        cx += x;
        cy += y;
      }
      cx /= cell.points.length;
      cy /= cell.points.length;
      const local = cell.points.map(([x, y]) => [x - cx, y - cy]);

      const geometry = new THREE.ExtrudeGeometry(roundedShape(local, radius), {
        depth: CFG.paneDepth,
        bevelEnabled: true,
        bevelThickness: 0.25 * CFG.paneDepth,
        bevelSize: 0.25 * CFG.paneDepth,
        bevelSegments: 6,
        curveSegments: 24,
      });
      const imageAspect = texture.image.naturalWidth / texture.image.naturalHeight;
      applyBoxUv(geometry, imageAspect);

      const glass = new THREE.MeshPhysicalMaterial({
        map: texture,
        color: "#ffffff",
        transmission: 0, // decal mode: hero image on the glass
        thickness: CFG.glass.thickness,
        ior: CFG.glass.ior,
        dispersion: CFG.glass.dispersion,
        roughness: CFG.glass.roughness,
        metalness: CFG.glass.metalness,
        clearcoat: CFG.glass.clearcoat,
        clearcoatRoughness: CFG.glass.clearcoatRoughness,
        specularIntensity: 1,
        specularColor: "#ffffff",
        attenuationDistance: CFG.glass.attenuationDistance,
        envMapIntensity: CFG.glass.envMapIntensity,
        iridescence: CFG.glass.iridescence,
        iridescenceIOR: CFG.glass.iridescenceIOR,
        iridescenceThicknessMap: iridescenceMap,
        iridescenceThicknessRange: CFG.glass.iridescenceThicknessRange,
        side: THREE.DoubleSide,
      });
      const glassMesh = new THREE.Mesh(geometry, glass);

      const sheen = new THREE.MeshMatcapMaterial({
        matcap,
        transparent: true,
        opacity: CFG.matcapStrength,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const sheenMesh = new THREE.Mesh(geometry, sheen);

      const holder = new THREE.Group();
      holder.position.set(cx, cy, 0);
      holder.add(glassMesh, sheenMesh);
      group.add(holder);

      panes.push({ holder, glassMesh, sheenMesh, sheen, cx, cy, hover: 0 });
      cellPolygons.push({ points: cell.points, pane: panes[panes.length - 1] });
    }
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.width = rect.width;
    state.height = rect.height;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    const worldW = WORLD_H * camera.aspect;
    if (Math.abs(worldW - state.worldW) > 1e-3) {
      state.worldW = worldW;
      buildTessellation();
    }
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function draw(now) {
    state.frame = 0;
    if (state.destroyed || !state.width) return;
    const time = (now - state.start) / 1000;
    const ease = 1 - Math.exp(-CFG.hover.ease * (1 / 60));

    // gentle whole-group pointer tilt (keeps the panes alive as one sheet)
    const targetTiltY = state.pointer.inside ? state.pointer.x * 0.06 : 0;
    const targetTiltX = state.pointer.inside ? state.pointer.y * 0.05 : 0;
    state.tiltY += (targetTiltY - state.tiltY) * 0.05;
    state.tiltX += (targetTiltX - state.tiltX) * 0.05;
    group.rotation.y = state.tiltY;
    group.rotation.x = state.tiltX;

    for (let i = 0; i < panes.length; i++) {
      const pane = panes[i];
      const target = pane.hoverTarget ?? 0;
      pane.hover += (target - pane.hover) * ease;

      // focus hover: pane grows + tilts toward the cursor, sheen brightens
      const scale = 1 + (CFG.hover.cellPush - 1) * pane.hover;
      pane.holder.scale.setScalar(scale);
      pane.holder.position.z = pane.hover * 0.12;
      const dx = state.pointer.wx !== undefined ? state.pointer.wx - pane.cx : 0;
      const dy = state.pointer.wy !== undefined ? state.pointer.wy - pane.cy : 0;
      pane.holder.rotation.y = pane.hover * CFG.hover.tilt * Math.max(-1, Math.min(1, dx));
      pane.holder.rotation.x = pane.hover * CFG.hover.tilt * -Math.max(-1, Math.min(1, dy));
      pane.sheen.opacity = CFG.matcapStrength * (1 + pane.hover * 1.6);

      // idle drift, subtle so seams stay coherent
      pane.holder.position.x = pane.cx + Math.sin(time * 0.35 + i * 1.7) * 0.015;
      pane.holder.position.y = pane.cy + Math.cos(time * 0.3 + i * 2.1) * 0.015;
    }

    renderer.render(scene, camera);
    if (state.running) state.frame = requestAnimationFrame(draw);
  }

  function setRunning(running) {
    if (state.destroyed || state.running === running) return;
    state.running = running;
    if (running && !state.frame) state.frame = requestAnimationFrame(draw);
  }

  function onPointerMove(event) {
    const rect = stage.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / Math.max(1, rect.width);
    const ny = (event.clientY - rect.top) / Math.max(1, rect.height);
    state.pointer.x = nx * 2 - 1;
    state.pointer.y = ny * 2 - 1;
    state.pointer.inside = true;
    // to world coords (y up)
    const wx = (nx - 0.5) * state.worldW;
    const wy = (0.5 - ny) * WORLD_H;
    state.pointer.wx = wx;
    state.pointer.wy = wy;
    for (const cell of cellPolygons) {
      cell.pane.hoverTarget = pointInPolygon(wx, wy, cell.points) ? 1 : 0;
    }
  }

  function onPointerLeave() {
    state.pointer.inside = false;
    for (const pane of panes) pane.hoverTarget = 0;
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!state.running) state.frame = state.frame || requestAnimationFrame(draw);
  });
  const visibility = new IntersectionObserver(
    (entries) => {
      setRunning(entries.some((entry) => entry.isIntersecting));
    },
    { rootMargin: "120px" }
  );

  stage.append(canvas);
  resize();
  resizeObserver.observe(stage);
  if (animate) {
    visibility.observe(stage);
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave, { passive: true });
    setRunning(true);
  } else {
    // Reduced motion: one still frame; ResizeObserver redraws on layout changes.
    state.frame = requestAnimationFrame(draw);
  }
  stage.classList.add("is-scene-live");

  return {
    destroy() {
      state.destroyed = true;
      state.running = false;
      if (state.frame) cancelAnimationFrame(state.frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      for (const pane of panes) {
        pane.glassMesh.geometry.dispose();
        pane.glassMesh.material.dispose();
        pane.sheenMesh.material.dispose();
      }
      for (const texture of Object.values(crewTextures)) texture.dispose();
      matcap?.dispose();
      iridescenceMap.dispose();
      renderer.dispose();
      canvas.remove();
      stage.classList.remove("is-scene-live");
    },
  };
}
