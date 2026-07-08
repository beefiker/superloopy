// Superloopy — landing WebGL source-port.
// Two layers:
//   1. Fixed transparent canvas behind the page (source: .webgl, z-index:-1)
//      carrying the full-screen dot-grid shader with mouse-trail texture
//      (source GLSL, verbatim).
//   2. Per-section transparent canvases inside each DOM proxy div for the
//      GLTF scenes (the source tunnels these into one canvas behind the DOM,
//      but its gradient sections would occlude a z:-1 canvas here — separate
//      in-flow canvases reproduce the exact same visual stacking):
//        circles.gltf  → loops band, baked clip scrubbed by scroll
//        saw_small.gltf → steps, autonomous spin + scroll velocity
//        star.gltf     → footer, looping baked clip

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initEyeView } from "./eye-scene.js";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rootEl = document.querySelector("[data-webgl-root]");

if (!reducedMotion && window.WebGLRenderingContext) {
  try {
    initDotGrid(rootEl);
  } catch {
    rootEl?.remove();
  }
  try {
    initModelViews();
  } catch {
    /* page works without the model layers */
  }
  try {
    initEyeView();
  } catch {
    /* static layout stays if the eye scene can't start */
  }
}

/* ====================================================== dot-grid background */

function initDotGrid(rootEl) {
  if (!rootEl) return;
  const renderer = new THREE.WebGLRenderer({
    precision: "highp",
    powerPreference: "high-performance",
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  rootEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  /* mouse-trail touch texture — source config:
     size 173, radius .19, maxAge 1720ms, intensity .17 + idle noise drift */
  const TRAIL = { size: 173, radius: 0.19, maxAge: 1720, intensity: 0.17 };
  const trailCanvas = document.createElement("canvas");
  trailCanvas.width = trailCanvas.height = TRAIL.size;
  const trailCtx = trailCanvas.getContext("2d");
  trailCtx.fillStyle = "black";
  trailCtx.fillRect(0, 0, TRAIL.size, TRAIL.size);
  const trailTexture = new THREE.CanvasTexture(trailCanvas);
  const trailPoints = [];
  let idleAngle = 0;
  let lastMove = 0;

  function addTrailPoint(x, y) {
    const last = trailPoints[trailPoints.length - 1];
    if (last && Math.hypot(last.x - x, last.y - y) < 0.01) return;
    trailPoints.push({ x, y, age: 0 });
  }

  window.addEventListener("pointermove", (e) => {
    lastMove = performance.now();
    addTrailPoint(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  });

  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  function updateTrail(deltaMs) {
    if (performance.now() - lastMove > 900) {
      idleAngle += 0.003 * deltaMs * 0.06;
      addTrailPoint(
        0.5 + 0.33 * Math.sin(idleAngle) * Math.cos(idleAngle * 0.63),
        0.5 + 0.33 * Math.cos(idleAngle * 0.87)
      );
    }
    trailCtx.fillStyle = "black";
    trailCtx.fillRect(0, 0, TRAIL.size, TRAIL.size);
    for (let i = trailPoints.length - 1; i >= 0; i--) {
      const p = trailPoints[i];
      p.age += deltaMs;
      if (p.age > TRAIL.maxAge) {
        trailPoints.splice(i, 1);
        continue;
      }
      const life = 1 - p.age / TRAIL.maxAge;
      const alpha = easeOutQuart(life) * TRAIL.intensity;
      const r = TRAIL.radius * TRAIL.size;
      const cx = p.x * TRAIL.size;
      const cy = (1 - p.y) * TRAIL.size;
      const grad = trailCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      trailCtx.fillStyle = grad;
      trailCtx.beginPath();
      trailCtx.arc(cx, cy, r, 0, Math.PI * 2);
      trailCtx.fill();
    }
    trailTexture.needsUpdate = true;
  }

  /* dot-grid shader — source GLSL, verbatim (layout chunk module 9673) */
  const dotMaterial = new THREE.ShaderMaterial({
    uniforms: {
      resolution: { value: new THREE.Vector2() },
      mouseTrail: { value: trailTexture },
      dpr: { value: renderer.getPixelRatio() },
      dotSpacing: { value: 40 },
      dotSize: { value: 1 },
      dotAlpha: { value: 0.1 },
      overlayColor: { value: new THREE.Color("#F0F0F0") },
      trailColor: { value: new THREE.Color("#f4ecf9") },
      dotColor: { value: new THREE.Color("#000") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 resolution;
      uniform float dpr;
      uniform float dotSpacing;
      uniform float dotSize;
      uniform sampler2D mouseTrail;
      uniform vec3 trailColor;
      uniform vec3 overlayColor;
      uniform vec3 dotColor;
      uniform float dotAlpha;

      vec2 coverUv(vec2 uv) {
        vec2 s = resolution.xy / max(resolution.x, resolution.y);
        vec2 newUv = (uv - 0.5) * s + 0.5;
        return clamp(newUv, 0.0, 1.0);
      }

      float sdfCircle(vec2 p, float r) {
        return length(p - 0.5) - r;
      }

      void main() {
        vec2 screenUv = gl_FragCoord.xy / resolution;
        vec2 uv = coverUv(screenUv);

        vec2 gridPos = mod(gl_FragCoord.xy, vec2(dotSpacing * dpr)) - vec2(dotSpacing * dpr) / 2.0;

        float trail = texture2D(mouseTrail, uv).r;

        float dynamicDotSize = mix(dotSize, dotSize * 2.0, trail * 1.25);

        float dist = sdfCircle(gridPos, dynamicDotSize * dpr);
        float dotMask = step(dist, 0.0);

        vec3 baseColor = overlayColor * 1.05;
        vec3 activeDotColor = mix(dotColor, trailColor * dynamicDotSize, trail);
        vec4 color = mix(vec4(baseColor, 1.0), vec4(activeDotColor, dotAlpha), dotMask);

        gl_FragColor = mix(color, vec4(trailColor, 1.0), trail);
      }
    `,
  });
  const dotPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dotMaterial);
  scene.add(dotPlane);

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    dotMaterial.uniforms.resolution.value.copy(size);
    dotMaterial.uniforms.dpr.value = renderer.getPixelRatio();
  }
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  gsap.ticker.add(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    updateTrail(delta * 1000);
    renderer.render(scene, camera);
  });
}

/* ========================================================== model views */

function initModelViews() {
  const loader = new GLTFLoader();

  function normalize(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    object3d.position.sub(center);
    const holder = new THREE.Group();
    holder.add(object3d);
    holder.scale.setScalar(1 / maxDim);
    return holder;
  }

  function createView({ selector, url, cameraZ, zoom, setup }) {
    const proxy = document.querySelector(selector);
    if (!proxy) return;

    // Defer the model download until the section approaches the viewport —
    // circles + star together are ~3 MB that shouldn't block initial load.
    const startLoading = () => loader.load(url, (gltf) => {
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          precision: "highp",
          powerPreference: "high-performance",
          antialias: true,
          alpha: true,
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      Object.assign(renderer.domElement.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      });
      proxy.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      // Source per-view cameras: circles zoom 1.35 pos(0,0,2); star zoom 1
      // pos(0,0,2.1); saw zoom 1.9.
      const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
      camera.position.set(0, 0, cameraZ);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();

      const inner = normalize(gltf.scene);
      const group = new THREE.Group();
      group.add(inner);
      scene.add(group);

      const view = { proxy, scene, camera, renderer, group, inner, mixer: null, update: null };
      setup(view, gltf);

      function resize() {
        const rect = proxy.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", resize);
      resize();

      let visible = false;
      new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
        },
        { rootMargin: "100px" }
      ).observe(proxy);

      const clock = new THREE.Clock();
      gsap.ticker.add(() => {
        if (!visible) return;
        const delta = Math.min(clock.getDelta(), 0.05);
        if (view.update) view.update(delta);
        // scrubbed mixers are driven by ScrollTrigger; looping ones by delta
        if (view.mixer && !view.scrub) view.mixer.update(delta);
        renderer.render(scene, camera);
      });
    });

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            startLoading();
            io.disconnect();
          }
        },
        { rootMargin: "600px" }
      );
      io.observe(proxy);
    } else {
      startLoading();
    }
  }

  // circles.gltf — loops band, clip scrubbed over the 300svh pin track
  createView({
    selector: '[data-webgl="circles"]',
    url: "/models/circles.gltf",
    cameraZ: 2,
    zoom: 1.35,
    setup(view, gltf) {
      // Superloopy hot-pink palette (legacy model parity: base #ff69b4)
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ff69b4"),
        roughness: 0.62,
        metalness: 0.75,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      gltf.scene.traverse((node) => {
        if (node.isMesh) node.material = material;
      });
      view.scene.add(new THREE.AmbientLight("#ffffff", 1.6));
      const p1 = new THREE.PointLight("#ffffff", 8, 0, 1);
      p1.position.set(2, 2, 3);
      const p2 = new THREE.PointLight("#df1178", 6, 0, 1);
      p2.position.set(-2, -1.5, 2);
      view.scene.add(p1, p2);

      const clip = gltf.animations[0];
      if (clip) {
        view.scrub = true;
        view.mixer = new THREE.AnimationMixer(gltf.scene);
        const action = view.mixer.clipAction(clip);
        action.play();
        const track = document.querySelector("[data-loops-track]");
        ScrollTrigger.create({
          trigger: track ?? view.proxy,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => {
            view.mixer.setTime(self.progress * clip.duration * 0.999);
          },
        });
      }
      // gentle idle rotation on top of the baked clip
      view.update = () => {
        view.group.rotation.z += 0.0004;
      };
    },
  });

  // star.gltf — footer, baked clip loops autonomously
  createView({
    selector: '[data-webgl="star"]',
    url: "/models/star.gltf",
    cameraZ: 2.1,
    zoom: 1,
    setup(view, gltf) {
      const starMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#2450ff"),
        roughness: 0.6,
        metalness: 0.85,
      });
      const restMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#dfe4ff"),
        roughness: 0.6,
        metalness: 0.85,
      });
      gltf.scene.traverse((node) => {
        if (node.isMesh) {
          node.material = node.name === "Star" ? starMaterial : restMaterial;
        }
      });
      view.scene.add(new THREE.AmbientLight("#ffffff", 1.4));
      const front = new THREE.PointLight("#6e73b4", 10, 0, 1);
      front.position.set(1, 1.2, 3);
      const back = new THREE.PointLight("#0055ff", 10, 0, 1);
      back.position.set(-1.2, -0.6, -3);
      view.scene.add(front, back);

      const clip = gltf.animations[0];
      if (clip) {
        view.mixer = new THREE.AnimationMixer(gltf.scene);
        view.mixer.clipAction(clip).play();
      }
    },
  });
}
