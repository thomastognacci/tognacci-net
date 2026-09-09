import { convexHull, getContact, type Point2 } from './collision';
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
  const resetButton =
    document.querySelector<HTMLButtonElement>('#reset-positions');
  if (!container || !resetButton) return;
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 2, -2, 0.1, 100);
  camera.position.z = 10;
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
    const body = group.children[0] as THREE.Mesh<THREE.BufferGeometry>;
    const positions = body.geometry.getAttribute('position');
    const unique = new Map<string, THREE.Vector3>();
    for (let i = 0; i < positions.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positions, i);
      const key = `${vertex.x.toFixed(6)},${vertex.y.toFixed(6)},${vertex.z.toFixed(6)}`;
      unique.set(key, vertex);
    }
    return {
      group,
      vertices: [...unique.values()],
      hull: [] as Point2[],
      link,
      index,
      slot: link.closest<HTMLElement>('.social-slot')!,
      localBounds: new THREE.Box3().setFromObject(group),
      hover: false,
      focused: false,
      floating: false,
      suppressClick: false,
      x: 0,
      y: 0,
      homeX: 0,
      homeY: 0,
      vx: 0,
      vy: 0,
      scale: 1,
      halfWidth: 100,
      halfHeight: 100,
    };
  });
  type Item = (typeof objects)[number];
  type Drag = {
    item: Item;
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    moved: boolean;
  };
  let drag: Drag | null = null;
  let frame = 0;
  let contextLost = false;
  let stageVisible = true;
  let elapsed = 0;
  let previous = 0;
  let width = 0;
  let height = 0;
  let pointerX = 0;
  let pointerY = 0;
  const finePointer = window.matchMedia('(pointer: fine)');
  const transformedBounds = new THREE.Box3();
  const size = new THREE.Vector3();

  function contain(item: Item, bounce = false) {
    const left = item.halfWidth + 10;
    const right = Math.max(left, width - left);
    const top = item.halfHeight + 10;
    const bottom = Math.max(top, height - top);
    if (item.x < left || item.x > right) {
      item.x = THREE.MathUtils.clamp(item.x, left, right);
      if (bounce)
        item.vx =
          item.x === left
            ? Math.abs(item.vx) * 0.65
            : -Math.abs(item.vx) * 0.65;
    }
    if (item.y < top || item.y > bottom) {
      item.y = THREE.MathUtils.clamp(item.y, top, bottom);
      if (bounce)
        item.vy =
          item.y === top ? Math.abs(item.vy) * 0.65 : -Math.abs(item.vy) * 0.65;
    }
  }

  function resolveCollisions() {
    const held = (item: Item) =>
      drag?.item === item || item.hover || item.focused;
    // A few passes settle chains of contacts, including contacts near a wall.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const a = objects[i];
          const b = objects[j];
          if (!a.floating && !b.floating) continue;
          // An untouched icon scrolled off the page should stay at its home.
          if (
            [a, b].some(
              (item) =>
                !item.floating &&
                (item.y + item.halfHeight < 0 ||
                  item.y - item.halfHeight > height),
            )
          )
            continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const overlapX = a.halfWidth + b.halfWidth - Math.abs(dx);
          const overlapY = a.halfHeight + b.halfHeight - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;
          const contact = getContact(a, b);
          if (!contact) continue;
          const massA = held(a) ? 0 : 1;
          const massB = held(b) ? 0 : 1;
          const totalMass = massA + massB;
          if (!totalMass) continue;
          const { nx, ny, depth } = contact;
          const separation = (depth + 0.25) / totalMass;
          for (const [item, mass, direction] of [
            [a, massA, -1],
            [b, massB, 1],
          ] as const) {
            if (!mass) continue;
            item.floating = true;
            item.x += nx * separation * direction;
            item.y += ny * separation * direction;
          }
          // A grabbed icon pushes its neighbour but is not moved by the impact.
          const avx = massA || drag?.item === a ? a.vx : 0;
          const avy = massA || drag?.item === a ? a.vy : 0;
          const bvx = massB || drag?.item === b ? b.vx : 0;
          const bvy = massB || drag?.item === b ? b.vy : 0;
          const closingSpeed = (bvx - avx) * nx + (bvy - avy) * ny;
          if (closingSpeed < 0) {
            const impulse = (-(1 + 0.45) * closingSpeed) / totalMass;
            a.vx -= impulse * nx * massA;
            a.vy -= impulse * ny * massA;
            b.vx += impulse * nx * massB;
            b.vy += impulse * ny * massB;
            for (const item of [a, b]) {
              item.vx = THREE.MathUtils.clamp(item.vx, -1000, 1000);
              item.vy = THREE.MathUtils.clamp(item.vy, -1000, 1000);
            }
          }
          resetButton?.removeAttribute('hidden');
        }
      }
      for (const item of objects) if (item.floating) contain(item, true);
    }
  }

  function draw(now = 0) {
    frame = 0;
    if (contextLost) return;
    const paused = isPaused();
    const dt =
      !paused && previous ? Math.min((now - previous) / 1000, 0.04) : 0;
    elapsed += dt;
    previous = now;
    for (const item of objects) {
      const { group, index } = item;
      const phase = elapsed * 0.7 + index * 2.1;
      group.position.set(0, 0, 0);
      group.rotation.set(
        0.13 + Math.sin(phase * 0.7) * 0.05 + (paused ? 0 : pointerY * 0.07),
        baseRotationY[index] +
          Math.cos(phase * 0.8) * 0.09 +
          (paused ? 0 : pointerX * 0.12),
        baseRotationZ[index] + Math.sin(phase) * 0.045,
      );
      group.scale.setScalar(item.scale * (item.hover && !paused ? 1.04 : 1));
      group.updateMatrix();
      const matrix = group.matrix.elements;
      item.hull = convexHull(
        item.vertices.map((vertex) => ({
          x:
            (matrix[0] * vertex.x +
              matrix[4] * vertex.y +
              matrix[8] * vertex.z) *
            100,
          y:
            -(
              matrix[1] * vertex.x +
              matrix[5] * vertex.y +
              matrix[9] * vertex.z
            ) * 100,
        })),
      );
      transformedBounds
        .copy(item.localBounds)
        .applyMatrix4(group.matrix)
        .getSize(size);
      item.halfWidth = size.x * 50 + 3;
      item.halfHeight = size.y * 50 + 3;
      if (item.floating) {
        if (!paused && drag?.item !== item && !item.hover && !item.focused) {
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          const damping = Math.exp(-0.55 * dt);
          item.vx *= damping;
          item.vy *= damping;
          if (Math.hypot(item.vx, item.vy) < 2) item.vx = item.vy = 0;
        }
        contain(item, true);
      } else {
        item.x = item.homeX;
        item.y = item.homeY + Math.sin(phase) * 7;
      }
    }
    if (!paused) resolveCollisions();
    for (const item of objects) {
      item.group.position.set(
        (item.x - width / 2) / 100,
        (height / 2 - item.y) / 100,
        0,
      );
      // The real HTML link travels with the mesh; keyboard navigation stays native.
      item.link.style.width = `${item.halfWidth * 2}px`;
      item.link.style.height = `${item.halfHeight * 2}px`;
      item.link.style.transform = `translate3d(${item.x - item.halfWidth}px, ${item.y - item.halfHeight}px, 0)`;
    }
    renderer.render(scene, camera);
    if (
      !paused &&
      !document.hidden &&
      (stageVisible || objects.some((item) => item.floating))
    )
      frame = requestAnimationFrame(draw);
  }
  function requestFrame() {
    if (!frame && !contextLost && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function measure() {
    const nextWidth = document.documentElement.clientWidth;
    const nextHeight = innerHeight;
    if (width !== nextWidth || height !== nextHeight)
      renderer.setSize(nextWidth, nextHeight);
    width = nextWidth;
    height = nextHeight;
    camera.left = -width / 200;
    camera.right = width / 200;
    camera.top = height / 200;
    camera.bottom = -height / 200;
    camera.updateProjectionMatrix();
    for (const item of objects) {
      const rect = item.slot.getBoundingClientRect();
      item.homeX = rect.left + rect.width / 2;
      item.homeY = rect.top + rect.height / 2;
      item.scale = Math.min(1, rect.width / 240, width / 280, height / 280);
    }
  }
  function finishDrag(cancelled = false) {
    if (!drag) return;
    const { item, pointerId, moved, lastTime } = drag;
    drag = null;
    item.link.classList.remove('is-dragging');
    item.suppressClick = moved;
    if (cancelled || isPaused() || performance.now() - lastTime > 120)
      item.vx = item.vy = 0;
    if (item.link.hasPointerCapture(pointerId))
      item.link.releasePointerCapture(pointerId);
    // Pointer capture can leave :hover on the released link until the next move.
    item.hover = false;
    requestFrame();
  }

  for (const item of objects) {
    const { link } = item;
    link.addEventListener('pointerenter', () => {
      item.hover = true;
      requestFrame();
    });
    link.addEventListener('pointerleave', () => {
      item.hover = false;
      requestFrame();
    });
    link.addEventListener('focus', () => {
      item.focused = true;
      if (!item.floating) {
        const rect = item.slot.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > height) {
          item.slot.scrollIntoView({ block: 'center', behavior: 'instant' });
          measure();
        }
      }
      requestFrame();
    });
    link.addEventListener('blur', () => {
      item.focused = false;
      requestFrame();
    });
    link.addEventListener('dragstart', (event) => event.preventDefault());
    link.addEventListener('pointerdown', (event) => {
      if (
        event.button !== 0 ||
        event.pointerType !== 'mouse' ||
        drag ||
        contextLost
      )
        return;
      event.preventDefault();
      item.suppressClick = false;
      item.vx = item.vy = 0;
      drag = {
        item,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - item.x,
        offsetY: event.clientY - item.y,
        lastX: item.x,
        lastY: item.y,
        lastTime: performance.now(),
        moved: false,
      };
      link.setPointerCapture(event.pointerId);
    });
    link.addEventListener('pointermove', (event) => {
      if (!drag || drag.item !== item || drag.pointerId !== event.pointerId)
        return;
      if (
        !drag.moved &&
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6
      )
        return;
      if (!drag.moved) {
        drag.moved = true;
        link.blur();
        item.floating = true;
        link.classList.add('is-dragging');
        resetButton.hidden = false;
      }
      event.preventDefault();
      item.x = event.clientX - drag.offsetX;
      item.y = event.clientY - drag.offsetY;
      contain(item);
      const now = performance.now();
      const dt = Math.max((now - drag.lastTime) / 1000, 0.008);
      item.vx =
        0.35 * item.vx +
        0.65 * THREE.MathUtils.clamp((item.x - drag.lastX) / dt, -1000, 1000);
      item.vy =
        0.35 * item.vy +
        0.65 * THREE.MathUtils.clamp((item.y - drag.lastY) / dt, -1000, 1000);
      drag.lastX = item.x;
      drag.lastY = item.y;
      drag.lastTime = now;
      requestFrame();
    });
    link.addEventListener('pointerup', (event) => {
      if (drag?.pointerId === event.pointerId) finishDrag();
    });
    link.addEventListener('pointercancel', () => finishDrag(true));
    link.addEventListener('lostpointercapture', () => {
      if (drag?.item === item) finishDrag(true);
    });
    link.addEventListener('click', (event) => {
      if (item.suppressClick && event.detail !== 0) {
        event.preventDefault();
        item.suppressClick = false;
      }
    });
  }
  resetButton.addEventListener('click', () => {
    finishDrag(true);
    for (const item of objects) {
      item.floating = false;
      item.vx = item.vy = 0;
    }
    measure();
    requestFrame();
    resetButton.hidden = true;
    document
      .querySelector<HTMLButtonElement>('#motion-toggle')
      ?.focus({ preventScroll: true });
  });
  const resizeObserver = new ResizeObserver(() => {
    measure();
    requestFrame();
  });
  resizeObserver.observe(document.documentElement);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    stageVisible = entry.isIntersecting;
    previous = 0;
    requestFrame();
  });
  intersectionObserver.observe(container.parentElement!);
  window.addEventListener(
    'scroll',
    () => {
      measure();
      requestFrame();
    },
    { passive: true },
  );
  window.addEventListener('resize', () => {
    measure();
    requestFrame();
  });
  window.addEventListener(
    'pointermove',
    (event) => {
      if (!finePointer.matches || isPaused()) return;
      pointerX = event.clientX / width - 0.5;
      pointerY = event.clientY / height - 0.5;
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    pointerX = pointerY = 0;
  });
  window.addEventListener('blur', () => finishDrag(true));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finishDrag(true);
  });
  document.addEventListener('visibilitychange', () => {
    previous = 0;
    if (document.hidden) {
      finishDrag(true);
      cancelAnimationFrame(frame);
      frame = 0;
    } else requestFrame();
  });
  window.addEventListener('motionchange', () => {
    previous = 0;
    if (isPaused()) {
      finishDrag(true);
      for (const item of objects) item.vx = item.vy = 0;
    }
    requestFrame();
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    finishDrag(true);
    contextLost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    document.documentElement.classList.remove('scene-ready');
    resetButton.hidden = true;
    for (const item of objects) {
      item.link.removeAttribute('style');
      item.floating = false;
    }
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    measure();
    requestFrame();
    document.documentElement.classList.add('scene-ready');
  });
  measure();
  draw();
  document.documentElement.classList.add('scene-ready');
}
