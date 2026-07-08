// "Biology Orb" eye — native three.js port of the reference scene (no runtime, no
// iframe). Split from webgl.js to keep files reviewable. See webgl.js for the
// shared canvas layers; this module owns the steps-section eye scene.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ========================================================= eye ("Biology Orb")
   Native three.js port of the reference biology scene — no external runtime, no
   iframe. Assets (eye.glb + hex ktx2 maps + env webp + draco/basis transcoders)
   ship with the site (copied to dist/ from ../web at build time).
   Composition: Draco glass ball (transmission shell, hex normal/ao) + two
   uncompressed iris fiber line meshes with a looping strand-reveal shader.
   Baked Theatre.js values are hardcoded below; scroll scrubs the group pose
   between the two baked orientations, pointer adds tilt + fiber brightness. */

function makeHexTexture() {
  const R = 18;
  const w = Math.round(Math.sqrt(3) * R * 6); // 6 columns
  const h = Math.round(1.5 * R * 8); // 8 rows
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.6;
  const hw = Math.sqrt(3) * R;
  for (let row = -1; row < 10; row++) {
    for (let col = -1; col < 8; col++) {
      const cx = col * hw + (row % 2 ? hw / 2 : 0);
      const cy = row * 1.5 * R;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const x = cx + R * Math.cos(a);
        const y = cy + R * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function initEyeView() {
  const proxy = document.querySelector('[data-webgl="eye"]');
  if (!proxy) return;

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
  // transmission + fat fiber count is heavy — cap DPR lower than other views
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, 0, 3.2);

  const dracoLoader = new DRACOLoader().setDecoderPath("/draco/");
  const ktx2Loader = new KTX2Loader().setTranscoderPath("/basis/").detectSupport(renderer);
  const gltfLoader = new GLTFLoader().setDRACOLoader(dracoLoader).setKTX2Loader(ktx2Loader);

  // Strand palette matched to the rendered biology eye: mint dominant,
  // warm cream cores, pale teal-blue accents, most of every strand lit.
  const IRIS = {
    color1: new THREE.Color(0.42, 1.0, 0.76).multiplyScalar(1.7),
    color2: new THREE.Color(1.0, 0.8, 0.52).multiplyScalar(1.5),
    color3: new THREE.Color(0.55, 0.85, 0.92).multiplyScalar(1.25),
    fillLength: 0.78,
    speed: 0.2,
    fillRepeat: 2.0,
  };

  const irisUniforms = {
    uTime: { value: 0 },
    uPointerBoost: { value: 0 },
    uColor1: { value: IRIS.color1 },
    uColor2: { value: IRIS.color2 },
    uColor3: { value: IRIS.color3 },
    uFillLength: { value: IRIS.fillLength },
    uFillRepeat: { value: IRIS.fillRepeat },
    uSpeed: { value: IRIS.speed },
  };

  const irisMaterial = new THREE.ShaderMaterial({
    uniforms: irisUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float _progress;
      attribute float _random1;
      attribute float _random2;
      varying float vProgress;
      varying float vRandom1;
      varying float vRandom2;
      void main() {
        vProgress = _progress;
        vRandom1 = _random1;
        vRandom2 = _random2;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uPointerBoost;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uFillLength;
      uniform float uFillRepeat;
      uniform float uSpeed;
      varying float vProgress;
      varying float vRandom1;
      varying float vRandom2;
      void main() {
        // looping reveal along each strand (source loopingThreshold behaviour)
        float t = fract(vProgress * uFillRepeat + vRandom2 - uTime * uSpeed);
        float fill = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(uFillLength - 0.12, uFillLength, t));
        // soft enlarged pupil: fade strand roots out gradually
        fill *= smoothstep(0.05, 0.2, vProgress);
        // tips dissolve softly instead of cutting
        fill *= 1.0 - smoothstep(0.7, 1.0, vProgress) * 0.65;
        if (fill < 0.01) discard;
        // color travels ALONG the strand like the source render:
        // warm cream core near the pupil, mint/teal toward the tips
        vec3 color = mix(uColor2, uColor1, smoothstep(0.08, 0.72, vProgress));
        color = mix(color, uColor3, vRandom1 * 0.4);
        color *= (0.85 + uPointerBoost);
        // ShaderMaterial bypasses renderer tone mapping; Reinhard keeps the
        // additive accumulation from clamping to flat white.
        float peak = max(max(color.r, color.g), color.b);
        color /= (1.0 + peak * 0.32);
        gl_FragColor = vec4(color, min(1.0, fill * 0.52));
      }
    `,
  });

  const group = new THREE.Group();
  scene.add(group);

  // Dark vignette between the panorama and the ball — the source composition
  // reads as a deep-blue core behind the eye with the colorful environment
  // around it; without this the fibers lose their contrast.
  {
    const size = 256;
    const canvas2d = document.createElement("canvas");
    canvas2d.width = canvas2d.height = size;
    const ctx = canvas2d.getContext("2d");
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const fade = t < 0.42 ? 1 : t >= 0.85 ? 0 : Math.pow(1 - (t - 0.42) / 0.43, 2);
      grad.addColorStop(t, `rgba(16, 26, 66, ${(0.9 * fade).toFixed(3)})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const haloTexture = new THREE.CanvasTexture(canvas2d);
    haloTexture.colorSpace = THREE.SRGBColorSpace;
    const haloMaterial = new THREE.MeshBasicMaterial({
      map: haloTexture,
      transparent: true,
      depthWrite: false,
    });
    haloMaterial.toneMapped = false;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), haloMaterial);
    halo.position.z = -0.9;
    halo.renderOrder = -1;
    scene.add(halo);
  }

  // Source environment: the biology section renders an equirect glacier-
  // sunset panorama as the scene background, softly blurred — that's where
  // the magenta/blue marbled atmosphere comes from. Same asset, same trick.
  new THREE.TextureLoader().load("/webgl/textures/eye-env.webp", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
    scene.backgroundBlurriness = 0.45;
    scene.backgroundIntensity = 0.62;
    scene.backgroundRotation = new THREE.Euler(0, Math.PI * 1.75, 0.15);
  });

  // Base pose = iris facing the viewer (calibrated from the baked Theatre.js
  // focus keyframe); the pointer steers yaw/pitch on top so the eye follows
  // the cursor. Scroll adds a gentle roll.
  const BASE = new THREE.Euler(0.82, 1.46, 0.73);
  let scrollProgress = 0;
  const gaze = { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0 };
  const cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  const startLoading = () => gltfLoader.load("/webgl/models/eye.glb", (gltf) => {
    gltf.scene.traverse((node) => {
      if (node.name === "ball" && node.isMesh) {
        // Fresnel rim shell instead of physical transmission: three.js only
        // renders OPAQUE objects into its transmission buffer, so the
        // transparent iris fibers inside would never show through a real
        // transmissive shell (it reads as a flat white disc). A rim-lit glass
        // shell keeps the source's teal-sheen/violet-glow impression, works
        // over any page background, and is far cheaper.
        node.material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uSheen: { value: new THREE.Color(0.259, 1, 0.804) },
            uGlow: { value: new THREE.Color(0.835, 0.541, 0.973) },
          },
          vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vView = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }
          `,
          fragmentShader: /* glsl */ `
            uniform vec3 uSheen;
            uniform vec3 uGlow;
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
              // faint core so the fibers glow against the dark backdrop;
              // teal glass rim with an iridescent pink lean on the upper edge
              vec3 rim = mix(uSheen, uGlow, smoothstep(-0.2, 0.9, vNormal.y) * 0.55);
              vec3 color = mix(uGlow * 0.45, rim, fresnel);
              float alpha = 0.05 + fresnel * 0.6;
              gl_FragColor = vec4(color, alpha);
            }
          `,
        });
        node.renderOrder = 2;
        // hex lattice overlay — the source ball carries a hex normal/ao map
        // that reads as a glowing wireframe shell; a tiling hex line texture
        // on a slightly inflated copy of the same mesh recreates it.
        const hexTexture = makeHexTexture();
        hexTexture.wrapS = hexTexture.wrapT = THREE.RepeatWrapping;
        hexTexture.repeat.set(7.26, 4.3);
        const hexShell = new THREE.Mesh(
          node.geometry,
          new THREE.MeshBasicMaterial({
            map: hexTexture,
            color: new THREE.Color(0.62, 1.0, 0.9),
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        hexShell.scale.setScalar(1.004);
        hexShell.renderOrder = 3;
        node.add(hexShell);
      } else if (node.isLineSegments || node.isLine) {
        // GLTFLoader may surface custom attrs as _PROGRESS or _progress
        // depending on version; normalize to the lowercase names the shader
        // declares, and synthesize fallbacks if the attrs are missing.
        const geometry = node.geometry;
        for (const name of ["_PROGRESS", "_RANDOM1", "_RANDOM2"]) {
          const lower = name.toLowerCase();
          if (!geometry.getAttribute(lower) && geometry.getAttribute(name)) {
            geometry.setAttribute(lower, geometry.getAttribute(name));
          }
        }
        if (!geometry.getAttribute("_progress")) {
          const count = geometry.getAttribute("position").count;
          const progress = new Float32Array(count);
          const random1 = new Float32Array(count);
          const random2 = new Float32Array(count);
          for (let i = 0; i < count; i++) {
            progress[i] = (i % 240) / 240;
            const h = Math.sin(i * 12.9898) * 43758.5453;
            random1[i] = h - Math.floor(h);
            const h2 = Math.sin(i * 78.233) * 12543.2341;
            random2[i] = h2 - Math.floor(h2);
          }
          geometry.setAttribute("_progress", new THREE.BufferAttribute(progress, 1));
          geometry.setAttribute("_random1", new THREE.BufferAttribute(random1, 1));
          geometry.setAttribute("_random2", new THREE.BufferAttribute(random2, 1));
        }
        node.material = irisMaterial;
      }
    });

    // center + unit-scale, mirroring the other model views
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray()) || 1;
    gltf.scene.position.sub(center);
    const holder = new THREE.Group();
    holder.add(gltf.scene);
    holder.scale.setScalar(1.6 / maxDim);
    group.add(holder);
  });

  // Defer the 0.9 MB model + Draco decoder until the section approaches.
  if ("IntersectionObserver" in window) {
    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startLoading();
          loadObserver.disconnect();
        }
      },
      { rootMargin: "600px" }
    );
    loadObserver.observe(proxy);
  } else {
    startLoading();
  }

  // scroll scrub across the steps section
  const section = proxy.closest("section") ?? proxy;
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => {
      scrollProgress = self.progress;
    },
  });

  window.addEventListener("pointermove", (e) => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
  });

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
    if (!visible || document.hidden) return;
    const delta = Math.min(clock.getDelta(), 0.05);
    irisUniforms.uTime.value += delta;

    // Aim the iris at the cursor: offset is measured from the eye's own
    // on-screen centre, so the gaze tracks wherever the pointer sits.
    const rect = proxy.getBoundingClientRect();
    const dx = (cursor.x - (rect.left + rect.width / 2)) / window.innerWidth;
    const dy = (cursor.y - (rect.top + rect.height / 2)) / window.innerHeight;
    gaze.targetYaw = THREE.MathUtils.clamp(dx * 2.4, -0.85, 0.85);
    gaze.targetPitch = THREE.MathUtils.clamp(dy * 2.0, -0.7, 0.7);
    gaze.yaw += (gaze.targetYaw - gaze.yaw) * 0.08;
    gaze.pitch += (gaze.targetPitch - gaze.pitch) * 0.08;
    irisUniforms.uPointerBoost.value = Math.min(
      0.5,
      Math.hypot(gaze.targetYaw - gaze.yaw, gaze.targetPitch - gaze.pitch) * 3
    );

    group.rotation.set(
      BASE.x + gaze.pitch,
      BASE.y + gaze.yaw,
      BASE.z + scrollProgress * 0.25
    );
    renderer.render(scene, camera);
  });
}

