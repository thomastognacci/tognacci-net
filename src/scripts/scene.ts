import { convexHull, getContact, type Point2 } from './collision';
import { angularVelocityFromThrow } from './throw-motion';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const baseRotationY = [-0.3, 0.22, -0.2];
const baseRotationZ = [-0.16, 0.15, -0.14];
const svgLoader = new SVGLoader();
type ObjectId = 'linkedin' | 'github' | 'email';
type RenderProfile = {
  mobile: boolean;
  geometrySegments: number;
  curveSegments: number;
  bevelSegments: number;
};

const githubPath =
  'M16.29,0a16.29,16.29,0,0,0-5.15,31.75c.81.15,1.11-.35,1.11-.79s0-1.41,0-2.77C7.7,29.18,6.74,26,6.74,26a4.31,4.31,0,0,0-1.81-2.38c-1.48-1,.11-1,.11-1a3.42,3.42,0,0,1,2.5,1.68,3.47,3.47,0,0,0,4.74,1.35,3.48,3.48,0,0,1,1-2.18C9.7,23.08,5.9,21.68,5.9,15.44a6.3,6.3,0,0,1,1.68-4.37,5.86,5.86,0,0,1,.16-4.31s1.37-.44,4.48,1.67a15.44,15.44,0,0,1,8.16,0c3.11-2.11,4.48-1.67,4.48-1.67A5.85,5.85,0,0,1,25,11.07a6.29,6.29,0,0,1,1.67,4.37c0,6.26-3.81,7.63-7.44,8a3.89,3.89,0,0,1,1.11,3c0,2.18,0,3.93,0,4.47s.29.94,1.12.78A16.29,16.29,0,0,0,16.29,0Z';

function material(color: string, profile: RenderProfile) {
  if (profile.mobile) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.12,
    });
  }
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
  profile: RenderProfile,
  radius = 0.22,
) {
  return new THREE.Mesh(
    new RoundedBoxGeometry(
      width,
      height,
      depth,
      profile.geometrySegments,
      radius,
    ),
    material(color, profile),
  );
}

function addMark(
  group: THREE.Group,
  path: string,
  sourceSize: number,
  size: number,
  profile: RenderProfile,
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
        bevelSegments: profile.bevelSegments,
        steps: 1,
        curveSegments: profile.curveSegments,
      }),
      material('#f9f3ff', profile),
    );
    mark.add(mesh);
  }
  const scale = size / sourceSize;
  mark.scale.set(scale, -scale, scale);
  mark.position.set(-size / 2, size / 2, 0.31);
  group.add(mark);
}

function collisionVertices(group: THREE.Group) {
  const body = group.children[0] as THREE.Mesh<THREE.BufferGeometry>;
  const positions = body.geometry.getAttribute('position');
  const unique = new Map<string, THREE.Vector3>();
  for (let i = 0; i < positions.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(positions, i);
    const key = `${vertex.x.toFixed(6)},${vertex.y.toFixed(6)},${vertex.z.toFixed(6)}`;
    unique.set(key, vertex);
  }
  return [...unique.values()];
}

function createObject(id: ObjectId, profile: RenderProfile) {
  const group = new THREE.Group();
  let dimensions: [number, number, number];
  if (id === 'linkedin') {
    dimensions = [1.62, 1.62, 0.53];
    group.add(roundedBox(...dimensions, '#448ce9', profile, 0.26));
    addMark(
      group,
      'M9 35H27V91H9Z M18 8A10 10 0 1 1 17.99 28A10 10 0 1 1 18 8 M38 35H56V43C62 29 91 29 91 55V91H73V59C73 44 56 46 56 60V91H38Z',
      100,
      1.25,
      profile,
    );
  } else if (id === 'github') {
    dimensions = [1.7, 1.7, 0.57];
    group.add(roundedBox(...dimensions, '#a774eb', profile, 0.37));
    addMark(group, githubPath, 32.58, 1.15, profile);
  } else {
    dimensions = [1.92, 1.37, 0.48];
    group.add(roundedBox(...dimensions, '#ffb395', profile, 0.18));
    // Rounded seams give the envelope a folded, tactile surface.
    const seamMaterial = material('#db826e', profile);
    const seam = (points: THREE.Vector3[], radius: number) => {
      const curve = new THREE.CatmullRomCurve3(points);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(
            curve,
            profile.mobile ? 20 : 30,
            radius,
            6,
            false,
          ),
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
  return { group, vertices: collisionVertices(group) };
}

export function createScene(isPaused: () => boolean) {
  const container = document.querySelector<HTMLElement>('#scene');
  const contentElement = document.querySelector<HTMLElement>('main');
  const backgroundElement = document.querySelector<HTMLElement>('.universe');
  const resetButton =
    document.querySelector<HTMLButtonElement>('#reset-positions');
  if (!container || !contentElement || !resetButton) return false;
  const content = contentElement;
  const stageElement = container.parentElement;
  const mobile = window.matchMedia(
    '(hover: none) and (pointer: coarse)',
  ).matches;
  const profile: RenderProfile = {
    mobile,
    geometrySegments: mobile ? 4 : 5,
    curveSegments: mobile ? 10 : 16,
    bevelSegments: 2,
  };
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      // Keep MSAA enabled on the mobile profile. On current iPhones this
      // profile deliberately renders at the display's native Retina ratio.
      antialias: true,
      powerPreference: mobile ? 'high-performance' : 'low-power',
      precision: mobile ? 'mediump' : 'highp',
    });
  } catch {
    return false;
  }
  renderer.setPixelRatio(
    mobile ? window.devicePixelRatio : Math.min(window.devicePixelRatio, 1.75),
  );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);
  document.documentElement.classList.toggle('scene-mobile', mobile);
  if (mobile) document.body.appendChild(container);
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
    const { group, vertices } = createObject(id, profile);
    scene.add(group);
    return {
      group,
      vertices,
      hull: [] as Point2[],
      link,
      index,
      slot: link.closest<HTMLElement>('.social-slot')!,
      focused: false,
      floating: false,
      suppressClick: false,
      x: 0,
      y: 0,
      homeX: 0,
      homeY: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      scale: 1,
      halfWidth: 100,
      halfHeight: 100,
      hullMinX: -100,
      hullMaxX: 100,
      hullMinY: -100,
      hullMaxY: 100,
      linkX: NaN,
      linkY: NaN,
      linkSize: NaN,
    };
  });
  type Item = (typeof objects)[number];
  if (mobile) {
    // Let WebKit scroll the touch targets natively. Fixed elements whose
    // transforms are updated from scrollY can drift behind Safari's visual
    // viewport during momentum scrolling.
    for (const item of objects)
      stageElement?.parentElement?.insertBefore(item.link, stageElement);
  }
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
  let documentHeight = 0;
  let pointerX = 0;
  let pointerY = 0;
  let hasInteracted = false;
  let mobileIdleStrength = mobile ? 1 : 0;
  const finePointer = window.matchMedia('(pointer: fine)');
  function contain(item: Item, bounce = false) {
    const left = -item.hullMinX;
    const right = Math.max(left, width - item.hullMaxX);
    const top = -item.hullMinY;
    const bottom = Math.max(top, documentHeight - item.hullMaxY);
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
    const held = (item: Item) => drag?.item === item || item.focused;
    // A few passes settle chains of contacts, including contacts near a wall.
    for (let pass = 0; pass < 4; pass++) {
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
                (item.y + item.halfHeight < scrollY ||
                  item.y - item.halfHeight > scrollY + height),
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
    const renderHeight = mobile ? documentHeight : height;
    const dt =
      !paused && previous ? Math.min((now - previous) / 1000, 0.04) : 0;
    elapsed += dt;
    previous = now;
    const mobileIdleTarget = mobile && !paused ? (hasInteracted ? 0.25 : 1) : 0;
    if (paused) mobileIdleStrength = 0;
    else if (dt)
      mobileIdleStrength = THREE.MathUtils.damp(
        mobileIdleStrength,
        mobileIdleTarget,
        8,
        dt,
      );
    for (const item of objects) {
      const { group, index } = item;
      const phase = elapsed * 0.7 + index * 2.1;
      const idleRotationScale = 1 + mobileIdleStrength * 0.6;
      if (item.floating && !paused && drag?.item !== item && !item.focused) {
        item.angularVelocity *= Math.exp(-1.4 * dt);
        if (Math.abs(item.angularVelocity) < 0.01) item.angularVelocity = 0;
        item.angle += item.angularVelocity * dt;
      }
      group.position.set(0, 0, 0);
      group.rotation.set(
        0.13 +
          Math.sin(phase * 0.7) * 0.05 * idleRotationScale +
          (paused ? 0 : pointerY * 0.07),
        baseRotationY[index] +
          Math.cos(phase * 0.8) * 0.09 * idleRotationScale +
          (paused ? 0 : pointerX * 0.12),
        baseRotationZ[index] +
          Math.sin(phase) * 0.045 * idleRotationScale +
          item.angle,
      );
      group.scale.setScalar(item.scale);
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
      item.hullMinX = Infinity;
      item.hullMaxX = -Infinity;
      item.hullMinY = Infinity;
      item.hullMaxY = -Infinity;
      for (const point of item.hull) {
        item.hullMinX = Math.min(item.hullMinX, point.x);
        item.hullMaxX = Math.max(item.hullMaxX, point.x);
        item.hullMinY = Math.min(item.hullMinY, point.y);
        item.hullMaxY = Math.max(item.hullMaxY, point.y);
      }
      // The broad phase measures from the mesh origin, so retain the farther
      // extent when a projected hull is asymmetric.
      item.halfWidth = Math.max(-item.hullMinX, item.hullMaxX);
      item.halfHeight = Math.max(-item.hullMinY, item.hullMaxY);
      if (item.floating) {
        if (!paused && drag?.item !== item && !item.focused) {
          const damping = Math.exp(-0.55 * dt);
          item.vx *= damping;
          item.vy *= damping;
          if (Math.hypot(item.vx, item.vy) < 2) item.vx = item.vy = 0;
          item.x += item.vx * dt;
          item.y += item.vy * dt;
        }
        contain(item, true);
      } else {
        item.x = item.homeX;
        // Keep touch targets still while the mesh itself rotates. A moving link
        // can make WebKit cancel an otherwise valid tap.
        item.y = item.homeY + (mobile ? 0 : Math.sin(phase) * 7);
      }
    }
    let hasFloating = objects.some((item) => item.floating);
    if (!paused && hasFloating) resolveCollisions();
    hasFloating = objects.some((item) => item.floating);
    for (const item of objects) {
      // Give mobile meshes a zero-gravity drift: visible before discovery,
      // subtle after interaction, and absent while an icon follows the finger.
      // HTML hit targets stay anchored so Safari taps remain reliable.
      const idleX =
        mobile && drag?.item !== item
          ? Math.cos(elapsed * 0.62 + item.index * 2.35) *
            0.04 *
            mobileIdleStrength
          : 0;
      const idleY =
        mobile && drag?.item !== item
          ? Math.sin(elapsed * 0.78 + item.index * 2.1) *
            0.075 *
            mobileIdleStrength
          : 0;
      item.group.position.set(
        (item.x - width / 2) / 100 + idleX,
        (renderHeight / 2 - (mobile ? item.y : item.y - scrollY)) / 100 + idleY,
        0,
      );
      // The real HTML link travels with the mesh; keyboard navigation stays native.
      if (mobile) {
        const hitSize = Math.max(44, item.scale * 200);
        const linkX = item.x - hitSize / 2;
        const linkY = item.y - hitSize / 2;
        if (
          item.linkX !== linkX ||
          item.linkY !== linkY ||
          item.linkSize !== hitSize
        ) {
          item.link.style.width = `${hitSize}px`;
          item.link.style.height = `${hitSize}px`;
          item.link.style.transform = `translate3d(${linkX}px, ${linkY}px, 0)`;
          item.linkX = linkX;
          item.linkY = linkY;
          item.linkSize = hitSize;
        }
      } else {
        item.link.style.width = `${item.hullMaxX - item.hullMinX}px`;
        item.link.style.height = `${item.hullMaxY - item.hullMinY}px`;
        item.link.style.transform = `translate3d(${item.x + item.hullMinX}px, ${item.y - scrollY + item.hullMinY}px, 0)`;
      }
    }
    if (!hasFloating) resetButton?.setAttribute('hidden', '');
    if (mobile) {
      const visibleTop = THREE.MathUtils.clamp(
        scrollY,
        0,
        Math.max(0, documentHeight - height),
      );
      const visibleHeight = Math.min(height, documentHeight - visibleTop);
      renderer.setScissor(
        0,
        Math.floor(documentHeight - visibleTop - visibleHeight),
        Math.ceil(width),
        Math.ceil(visibleHeight),
      );
      renderer.setScissorTest(true);
    }
    renderer.render(scene, camera);
    if (!paused && !document.hidden && (stageVisible || hasFloating))
      frame = requestAnimationFrame(draw);
  }
  function requestFrame() {
    if (!frame && !contextLost && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function measure() {
    const nextWidth = document.documentElement.clientWidth;
    const nextHeight = innerHeight;
    const contentBottom = Math.max(
      content.getBoundingClientRect().bottom,
      backgroundElement?.getBoundingClientRect().bottom ?? 0,
    );
    const nextDocumentHeight = mobile
      ? Math.max(nextHeight, Math.ceil(contentBottom + scrollY))
      : document.documentElement.scrollHeight;
    const nextRenderHeight = mobile ? nextDocumentHeight : nextHeight;
    if (
      width !== nextWidth ||
      height !== nextHeight ||
      documentHeight !== nextDocumentHeight
    )
      renderer.setSize(nextWidth, nextRenderHeight);
    width = nextWidth;
    height = nextHeight;
    documentHeight = nextDocumentHeight;
    if (mobile) container?.style.setProperty('height', `${documentHeight}px`);
    camera.left = -width / 200;
    camera.right = width / 200;
    camera.top = nextRenderHeight / 200;
    camera.bottom = -nextRenderHeight / 200;
    camera.updateProjectionMatrix();
    for (const item of objects) {
      const rect = item.slot.getBoundingClientRect();
      item.homeX = rect.left + rect.width / 2;
      item.homeY = rect.top + scrollY + rect.height / 2;
      const nextScale = Math.min(
        1,
        rect.width / 240,
        width / 280,
        height / 280,
      );
      if (item.scale !== nextScale) {
        item.scale = nextScale;
        item.linkX = item.linkY = item.linkSize = NaN;
      }
    }
  }
  function finishDrag(cancelled = false) {
    if (!drag) return;
    const { item, pointerId, moved, lastTime } = drag;
    drag = null;
    item.link.classList.remove('is-dragging');
    item.suppressClick = moved;
    if (cancelled || isPaused() || performance.now() - lastTime > 120) {
      item.vx = item.vy = 0;
      item.angularVelocity = 0;
    }
    if (item.link.hasPointerCapture(pointerId))
      item.link.releasePointerCapture(pointerId);
    requestFrame();
  }

  for (const item of objects) {
    const { link } = item;
    link.addEventListener('focus', () => {
      item.focused = true;
      if (item.floating) {
        if (
          item.y - item.halfHeight < scrollY ||
          item.y + item.halfHeight > scrollY + height
        ) {
          window.scrollTo({
            top: Math.max(0, item.y - height / 2),
            behavior: 'instant',
          });
          measure();
        }
      } else {
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
      if (event.button !== 0 || drag || contextLost) return;
      // WebKit needs the default touch start to synthesize a link click on tap.
      // CSS touch-action reserves drags without cancelling that activation.
      if (event.pointerType === 'mouse') event.preventDefault();
      hasInteracted = true;
      item.suppressClick = false;
      item.vx = item.vy = 0;
      item.angularVelocity = 0;
      drag = {
        item,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - item.x,
        offsetY: event.clientY + scrollY - item.y,
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
      item.y = event.clientY + scrollY - drag.offsetY;
      contain(item);
      const now = performance.now();
      const dt = Math.max((now - drag.lastTime) / 1000, 0.008);
      item.vx =
        0.35 * item.vx +
        0.65 * THREE.MathUtils.clamp((item.x - drag.lastX) / dt, -1000, 1000);
      item.vy =
        0.35 * item.vy +
        0.65 * THREE.MathUtils.clamp((item.y - drag.lastY) / dt, -1000, 1000);
      item.angularVelocity =
        0.35 * item.angularVelocity +
        0.65 *
          angularVelocityFromThrow(
            drag.offsetX,
            drag.offsetY,
            item.vx,
            item.vy,
          );
      drag.lastX = item.x;
      drag.lastY = item.y;
      drag.lastTime = now;
      requestFrame();
    });
    link.addEventListener('pointerup', (event) => {
      if (drag?.pointerId === event.pointerId) finishDrag();
    });
    link.addEventListener('pointercancel', (event) => {
      if (drag?.pointerId === event.pointerId) finishDrag(true);
    });
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
      item.angle = item.angularVelocity = 0;
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
  intersectionObserver.observe(stageElement!);
  window.addEventListener(
    'scroll',
    () => {
      // Scroll changes the native document layers; keep the animation loop
      // alive so the mesh continues rotating during the gesture.
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
      for (const item of objects) {
        item.vx = item.vy = 0;
        item.angularVelocity = 0;
      }
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
    if (mobile) window.dispatchEvent(new Event('scenefallback'));
    resetButton.hidden = true;
    for (const item of objects) {
      item.link.removeAttribute('style');
      item.linkX = item.linkY = item.linkSize = NaN;
      if (mobile) item.slot.appendChild(item.link);
      item.floating = false;
      item.angle = item.angularVelocity = 0;
    }
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    document.documentElement.classList.add('scene-ready');
    measure();
    requestFrame();
  });
  document.documentElement.classList.add('scene-ready');
  measure();
  draw();
  return true;
}
