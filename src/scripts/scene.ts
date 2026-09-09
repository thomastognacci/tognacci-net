import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const baseRotationY = [-0.3, 0.22, -0.2];
const baseRotationZ = [-0.16, 0.15, -0.14];
const svgLoader = new SVGLoader();
type ObjectId = 'linkedin' | 'github' | 'email';

const githubPath =
  'M16.29,0a16.29,16.29,0,0,0-5.15,31.75c.81.15,1.11-.35,1.11-.79s0-1.41,0-2.77C7.7,29.18,6.74,26,6.74,26a4.31,4.31,0,0,0-1.81-2.38c-1.48-1,.11-1,.11-1a3.42,3.42,0,0,1,2.5,1.68,3.47,3.47,0,0,0,4.74,1.35,3.48,3.48,0,0,1,1-2.18C9.7,23.08,5.9,21.68,5.9,15.44a6.3,6.3,0,0,1,1.68-4.37,5.86,5.86,0,0,1,.16-4.31s1.37-.44,4.48,1.67a15.44,15.44,0,0,1,8.16,0c3.11-2.11,4.48-1.67,4.48-1.67A5.85,5.85,0,0,1,25,11.07a6.29,6.29,0,0,1,1.67,4.37c0,6.26-3.81,7.63-7.44,8a3.89,3.89,0,0,1,1.11,3c0,2.18,0,3.93,0,4.47s.29.94,1.12.78A16.29,16.29,0,0,0,16.29,0Z';

function material(color: string) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.25,
    metalness: 0.12,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
  });
}

function roundedBox(
  width: number,
  height: number,
  depth: number,
  color: string,
  radius = 0.22,
) {
  return new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, 5, radius),
    material(color),
  );
}

function addMark(
  group: THREE.Group,
  path: string,
  sourceSize: number,
  size: number,
) {
  const parsed = svgLoader.parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`,
  );
  const mark = new THREE.Group();
  for (const shape of parsed.paths[0].toShapes()) {
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 1,
        bevelEnabled: true,
        bevelThickness: 0.2,
        bevelSize: 0.1,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 16,
      }),
      material('#f9f3ff'),
    );
    mark.add(mesh);
  }
  const scale = size / sourceSize;
  mark.scale.set(scale, -scale, scale);
  mark.position.set(-size / 2, size / 2, 0.31);
  group.add(mark);
}

function createObject(id: ObjectId) {
  const group = new THREE.Group();
  if (id === 'linkedin') {
    group.add(roundedBox(1.62, 1.62, 0.53, '#448ce9', 0.26));
    addMark(
      group,
      'M9 35H27V91H9Z M18 8A10 10 0 1 1 17.99 28A10 10 0 1 1 18 8 M38 35H56V43C62 29 91 29 91 55V91H73V59C73 44 56 46 56 60V91H38Z',
      100,
      1.25,
    );
  } else if (id === 'github') {
    group.add(roundedBox(1.7, 1.7, 0.57, '#a774eb', 0.37));
    addMark(group, githubPath, 32.58, 1.15);
  } else {
    group.add(roundedBox(1.92, 1.37, 0.48, '#ffb395', 0.18));
    // Rounded seams give the envelope a folded, tactile surface.
    const seamMaterial = material('#db826e');
    const seam = (points: THREE.Vector3[], radius: number) => {
      const curve = new THREE.CatmullRomCurve3(points);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 30, radius, 6, false),
          seamMaterial,
        ),
      );
    };
    seam(
      [
        new THREE.Vector3(-0.82, 0.48, 0.245),
        new THREE.Vector3(0, -0.08, 0.285),
        new THREE.Vector3(0.82, 0.48, 0.245),
      ],
      0.027,
    );
    seam(
      [
        new THREE.Vector3(-0.82, -0.5, 0.245),
        new THREE.Vector3(-0.43, -0.12, 0.247),
      ],
      0.017,
    );
    seam(
      [
        new THREE.Vector3(0.82, -0.5, 0.245),
        new THREE.Vector3(0.43, -0.12, 0.247),
      ],
      0.017,
    );
  }
  return group;
}

export function createScene(isPaused: () => boolean) {
  const container = document.querySelector<HTMLElement>('#scene');
  if (!container) return;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 2, -2, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new THREE.HemisphereLight('#e8dfff', '#4a2d73', 2.5));
  const key = new THREE.DirectionalLight('#fff2eb', 5);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#adbcff', 4);
  rim.position.set(4, 1, -2);
  scene.add(rim);
  const objects = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('[data-object]'),
  ).map((link, index) => {
    const id = link.dataset.object;
    if (id !== 'linkedin' && id !== 'github' && id !== 'email')
      throw new Error('Unknown social object');
    const group = createObject(id);
    scene.add(group);
    const item = { group, link, index, hover: false, x: 0, y: 0, scale: 1 };
    for (const event of ['pointerenter', 'focus'])
      link.addEventListener(event, () => {
        item.hover = true;
        requestFrame();
      });
    for (const event of ['pointerleave', 'blur'])
      link.addEventListener(event, () => {
        item.hover = false;
        requestFrame();
      });
    return item;
  });
  let frame = 0;
  let visible = true;
  let elapsed = 0;
  let previous = 0;
  let pointerX = 0;
  let pointerY = 0;
  const finePointer = window.matchMedia('(pointer: fine)');
  function draw(now = 0) {
    frame = 0;
    const paused = isPaused();
    if (!paused && previous) elapsed += Math.min((now - previous) / 1000, 0.05);
    previous = now;
    for (const item of objects) {
      const { group, index } = item;
      const phase = elapsed * 0.7 + index * 2.1;
      group.position.set(
        item.x,
        item.y + (paused ? 0 : Math.sin(phase) * 0.07),
        0,
      );
      group.rotation.set(
        0.13 + (paused ? 0 : Math.sin(phase * 0.7) * 0.05 + pointerY * 0.07),
        baseRotationY[index] +
          (paused ? 0 : Math.cos(phase * 0.8) * 0.09 + pointerX * 0.12),
        baseRotationZ[index] + (paused ? 0 : Math.sin(phase) * 0.045),
      );
      group.scale.setScalar(item.scale * (item.hover && !paused ? 1.06 : 1));
    }
    renderer.render(scene, camera);
    if (!paused && visible && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function requestFrame() {
    if (!frame && visible && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function measure() {
    const rect = container!.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height);
    camera.left = -rect.width / 200;
    camera.right = rect.width / 200;
    camera.top = rect.height / 200;
    camera.bottom = -rect.height / 200;
    camera.updateProjectionMatrix();
    for (const item of objects) {
      const space = item.link
        .querySelector('.object-space')!
        .getBoundingClientRect();
      item.x =
        (space.left + space.width / 2 - rect.left - rect.width / 2) / 100;
      item.y =
        -(space.top + space.height / 2 - rect.top - rect.height / 2) / 100;
      item.scale = Math.min(1, space.width / 240);
    }
  }
  const resizeObserver = new ResizeObserver(() => {
    measure();
    requestFrame();
  });
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    previous = 0;
    requestFrame();
  });
  intersectionObserver.observe(container);
  container.parentElement!.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || isPaused()) return;
    const rect = container!.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
  });
  container.parentElement!.addEventListener('pointerleave', () => {
    pointerX = 0;
    pointerY = 0;
  });
  document.addEventListener('visibilitychange', () => {
    previous = 0;
    requestFrame();
  });
  window.addEventListener('motionchange', () => {
    previous = 0;
    requestFrame();
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    visible = false;
    document.documentElement.classList.remove('scene-ready');
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    visible = true;
    document.documentElement.classList.add('scene-ready');
    requestFrame();
  });
  measure();
  draw();
  document.documentElement.classList.add('scene-ready');
}
