import * as THREE from 'three';

/**
 * A night-time city block built from primitives: a road with moving car
 * lights, two raised pavements painted with rental slots, lit food stalls on
 * the taken slots, street lamps, a row of buildings with lit windows, embers
 * drifting up from the stalls and a floating "licensed" marker.
 *
 * Everything that animates is returned through `update(t)`, so the React
 * wrapper only owns the renderer, camera and loop. Lighting follows ThreeUI
 * Community's night scenes (warm point lights under a cool hemisphere, fog
 * into the background, bloom on emissive bulbs).
 */

export const BRAND = {
  ink: 0x0e1013,
  chili: 0xe4441f,
  turmeric: 0xf5a000,
  leaf: 0x0b8a4b,
  leafGlow: 0x3ccb7f,
  warm: 0xffb45a,
} as const;

const ROAD_LENGTH = 70;
const ROAD_HALF = 3.6;
const WALK_WIDTH = 4.2;
const WALK_HEIGHT = 0.22;
const SLOT_SPACING = 3.3;
const SLOT_COUNT = 9;

type Built = {
  scene: THREE.Scene;
  update: (t: number) => void;
  dispose: () => void;
};

/** Canvas-drawn textures keep the scene free of image downloads. */
function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function stripes(color: string) {
  return canvasTexture(64, 64, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#f4efe6' : color;
      ctx.fillRect(i * 8, 0, 8, 64);
    }
  });
}

function windows(seed: number) {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 128, 256);
    for (let y = 8; y < 248; y += 22) {
      for (let x = 8; x < 120; x += 20) {
        if (rand() > 0.3) continue;
        const warm = rand() > 0.25;
        ctx.fillStyle = warm
          ? `rgba(255,${170 + Math.floor(rand() * 50)},90,${0.55 + rand() * 0.45})`
          : 'rgba(150,200,255,0.6)';
        ctx.fillRect(x, y, 11, 13);
      }
    }
  });
}

function glowDot() {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,200,120,0.8)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

export function buildStreetScene({ shadows }: { shadows: boolean }): Built {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BRAND.ink);
  scene.fog = new THREE.Fog(BRAND.ink, 22, 62);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };
  const animations: ((t: number) => void)[] = [];

  // --- Lights ------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x5d6f96, 0x120c08, 0.55));
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0.55);
  moon.position.set(-12, 22, 10);
  if (shadows) {
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -26;
    moon.shadow.camera.right = 26;
    moon.shadow.camera.top = 16;
    moon.shadow.camera.bottom = -16;
    moon.shadow.bias = -0.0005;
  }
  scene.add(moon);

  // --- Ground, road, pavements ------------------------------------------
  const ground = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(200, 200)),
    keep(new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 1 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = shadows;
  scene.add(ground);

  const road = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_HALF * 2)),
    keep(new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.55, metalness: 0.15 })),
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = shadows;
  scene.add(road);

  const dashGeo = keep(new THREE.PlaneGeometry(1.6, 0.14));
  const dashMat = keep(
    new THREE.MeshBasicMaterial({ color: 0xd9d4c7, transparent: true, opacity: 0.55 }),
  );
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, 24);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 24; i++) {
    m.compose(
      new THREE.Vector3(-ROAD_LENGTH / 2 + i * 3 + 1, 0.01, 0),
      q,
      new THREE.Vector3(1, 1, 1),
    );
    dashes.setMatrixAt(i, m);
  }
  scene.add(dashes);

  const walkGeo = keep(new THREE.BoxGeometry(ROAD_LENGTH, WALK_HEIGHT, WALK_WIDTH));
  const walkMat = keep(new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.9 }));
  const kerbGeo = keep(new THREE.BoxGeometry(ROAD_LENGTH, WALK_HEIGHT + 0.02, 0.18));
  const kerbMat = keep(new THREE.MeshStandardMaterial({ color: 0x565a62, roughness: 0.8 }));
  for (const side of [1, -1]) {
    const z = side * (ROAD_HALF + WALK_WIDTH / 2);
    const walk = new THREE.Mesh(walkGeo, walkMat);
    walk.position.set(0, WALK_HEIGHT / 2, z);
    walk.receiveShadow = shadows;
    scene.add(walk);
    const kerb = new THREE.Mesh(kerbGeo, kerbMat);
    kerb.position.set(0, (WALK_HEIGHT + 0.02) / 2, side * (ROAD_HALF + 0.09));
    scene.add(kerb);
  }

  // --- Slots and stalls --------------------------------------------------
  const lineGeoLong = keep(new THREE.BoxGeometry(2.6, 0.02, 0.07));
  const lineGeoShort = keep(new THREE.BoxGeometry(0.07, 0.02, 2.1));
  const freeMat = keep(
    new THREE.MeshStandardMaterial({
      color: BRAND.turmeric,
      emissive: BRAND.turmeric,
      emissiveIntensity: 1.2,
    }),
  );
  const takenMat = keep(
    new THREE.MeshStandardMaterial({
      color: BRAND.chili,
      emissive: BRAND.chili,
      emissiveIntensity: 0.35,
    }),
  );
  const freeFill = keep(
    new THREE.MeshBasicMaterial({
      color: BRAND.turmeric,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  );
  const fillGeo = keep(new THREE.PlaneGeometry(2.6, 2.1));

  const counterGeo = keep(new THREE.BoxGeometry(1.7, 0.85, 1));
  const canopyGeo = keep(new THREE.BoxGeometry(2.2, 0.07, 1.55));
  const poleGeo = keep(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6));
  const bulbGeo = keep(new THREE.SphereGeometry(0.11, 12, 8));
  const stoolGeo = keep(new THREE.CylinderGeometry(0.16, 0.16, 0.38, 10));
  const poleMat = keep(
    new THREE.MeshStandardMaterial({ color: 0x9a9da4, metalness: 0.7, roughness: 0.3 }),
  );
  const bulbMat = keep(new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  const stoolMat = keep(new THREE.MeshStandardMaterial({ color: 0x2f7de1, roughness: 0.6 }));
  const counterColors = [0xc9a27a, 0xe8e2d6, 0x8a5a3c, 0xd9cbb3];
  const counterMats = counterColors.map((c) =>
    keep(new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })),
  );
  const canopyMats = ['#e4441f', '#f5a000', '#0b8a4b', '#c7371a'].map((c) => {
    const map = keep(stripes(c));
    return keep(new THREE.MeshStandardMaterial({ map, roughness: 0.8 }));
  });

  // Which slots have a vendor, per side. The remaining ones pulse as "free".
  const taken: Record<number, boolean[]> = {
    1: [true, false, true, true, false, true, true, false, true],
    [-1]: [true, true, false, true, true, true, false, true, true],
  };
  const stallPositions: THREE.Vector3[] = [];
  let featured: THREE.Vector3 | null = null;
  let stallIndex = 0;

  for (const side of [1, -1] as const) {
    const z = side * (ROAD_HALF + 0.35 + 1.05);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = (i - (SLOT_COUNT - 1) / 2) * SLOT_SPACING;
      const isTaken = taken[side]?.[i] ?? false;
      const mat = isTaken ? takenMat : freeMat;
      const y = WALK_HEIGHT + 0.012;
      for (const dz of [-1.05, 1.05]) {
        const line = new THREE.Mesh(lineGeoLong, mat);
        line.position.set(x, y, z + dz);
        scene.add(line);
      }
      for (const dx of [-1.3, 1.3]) {
        const line = new THREE.Mesh(lineGeoShort, mat);
        line.position.set(x + dx, y, z);
        scene.add(line);
      }

      if (!isTaken) {
        const fill = new THREE.Mesh(fillGeo, freeFill);
        fill.rotation.x = -Math.PI / 2;
        fill.position.set(x, y, z);
        scene.add(fill);
        continue;
      }

      const stall = new THREE.Group();
      stall.position.set(x, WALK_HEIGHT, z);
      // Stalls face the road.
      stall.rotation.y = side === 1 ? Math.PI : 0;

      const counter = new THREE.Mesh(counterGeo, counterMats[stallIndex % counterMats.length]);
      counter.position.y = 0.425;
      counter.castShadow = shadows;
      counter.receiveShadow = shadows;
      stall.add(counter);

      const canopy = new THREE.Mesh(canopyGeo, canopyMats[stallIndex % canopyMats.length]);
      canopy.position.set(0, 1.95, -0.1);
      canopy.rotation.x = 0.16;
      canopy.castShadow = shadows;
      stall.add(canopy);

      for (const px of [-1, 1]) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(px * 1.02, 0.95, -0.7);
        stall.add(pole);
      }

      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, 1.72, 0.05);
      stall.add(bulb);

      for (const sx of [-0.55, 0.55]) {
        const stool = new THREE.Mesh(stoolGeo, stoolMat);
        stool.position.set(sx, 0.19, 1.05);
        stool.castShadow = shadows;
        stall.add(stool);
      }

      scene.add(stall);
      stallPositions.push(new THREE.Vector3(x, WALK_HEIGHT + 1.7, z));
      if (side === 1 && i === 3) featured = new THREE.Vector3(x, WALK_HEIGHT, z);
      stallIndex++;
    }
  }

  // A handful of real lights on stalls nearest the camera; the rest rely on bloom.
  stallPositions
    .filter((p) => p.z > 0)
    .slice(1, 5)
    .forEach((p) => {
      const light = new THREE.PointLight(BRAND.warm, 3.2, 6, 1.8);
      light.position.copy(p);
      scene.add(light);
    });

  animations.push((t) => {
    freeMat.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.6;
    freeFill.opacity = 0.06 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.1;
  });

  // --- Street lamps -----------------------------------------------------
  const lampPoleGeo = keep(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8));
  const lampArmGeo = keep(new THREE.BoxGeometry(1.1, 0.07, 0.07));
  const lampHeadGeo = keep(new THREE.BoxGeometry(0.5, 0.1, 0.24));
  const lampPoleMat = keep(
    new THREE.MeshStandardMaterial({ color: 0x3b3f46, metalness: 0.6, roughness: 0.4 }),
  );
  const lampLightMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
  for (const x of [-15, -5, 5, 15]) {
    const z = -(ROAD_HALF + 0.45);
    const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
    pole.position.set(x, WALK_HEIGHT + 2.3, z);
    pole.castShadow = shadows;
    scene.add(pole);
    const arm = new THREE.Mesh(lampArmGeo, lampPoleMat);
    arm.position.set(x, WALK_HEIGHT + 4.55, z + 0.5);
    arm.rotation.y = Math.PI / 2;
    scene.add(arm);
    const head = new THREE.Mesh(lampHeadGeo, lampLightMat);
    head.position.set(x, WALK_HEIGHT + 4.5, z + 1);
    head.rotation.y = Math.PI / 2;
    scene.add(head);
    const light = new THREE.PointLight(0xffe2b8, 9, 11, 1.6);
    light.position.set(x, WALK_HEIGHT + 4.2, z + 1);
    scene.add(light);
  }

  // --- Buildings ----------------------------------------------------------
  const buildingGeo = keep(new THREE.BoxGeometry(1, 1, 1));
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let cursor = -ROAD_LENGTH / 2;
  let b = 0;
  while (cursor < ROAD_LENGTH / 2) {
    const width = 3 + rand() * 3.5;
    const height = 4 + rand() * 9;
    const depth = 4 + rand() * 3;
    const map = keep(windows(11 + b * 31));
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(Math.max(1, Math.round(width / 1.6)), Math.max(1, Math.round(height / 2.6)));
    const mat = keep(
      new THREE.MeshStandardMaterial({
        color: 0x1a1d23 + Math.floor(rand() * 3) * 0x020202,
        roughness: 0.85,
        emissive: 0xffffff,
        emissiveMap: map,
        emissiveIntensity: 0.55,
      }),
    );
    const building = new THREE.Mesh(buildingGeo, mat);
    building.scale.set(width - 0.25, height, depth);
    building.position.set(
      cursor + width / 2,
      height / 2,
      -(ROAD_HALF + WALK_WIDTH + depth / 2 + 0.4),
    );
    building.castShadow = shadows;
    scene.add(building);
    cursor += width;
    b++;
  }

  // --- Moving car lights --------------------------------------------------
  const carGeo = keep(new THREE.BoxGeometry(1.4, 0.09, 0.09));
  const headMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff6e0 }));
  const tailMat = keep(new THREE.MeshBasicMaterial({ color: 0xff3a24 }));
  const CARS = 7;
  const heads = new THREE.InstancedMesh(carGeo, headMat, CARS * 2);
  const tails = new THREE.InstancedMesh(carGeo, tailMat, CARS * 2);
  const carSeeds = Array.from({ length: CARS }, (_, i) => ({
    offset: (i / CARS) * ROAD_LENGTH + rand() * 4,
    speed: 7 + rand() * 5,
  }));
  scene.add(heads, tails);
  animations.push((t) => {
    const unit = new THREE.Vector3(1, 1, 1);
    const none = new THREE.Quaternion();
    carSeeds.forEach((car, i) => {
      // Lane toward the camera side moves +x; far lane moves -x.
      const a = ((car.offset + t * car.speed) % ROAD_LENGTH) - ROAD_LENGTH / 2;
      const bx = -(((car.offset * 1.3 + t * car.speed * 0.9) % ROAD_LENGTH) - ROAD_LENGTH / 2);
      for (const [k, dz] of [
        [0, -0.55],
        [1, 0.55],
      ] as const) {
        m.compose(new THREE.Vector3(a, 0.35, 1.8 + dz * 0.6), none, unit);
        heads.setMatrixAt(i * 2 + k, m);
        m.compose(new THREE.Vector3(bx, 0.35, -1.8 + dz * 0.6), none, unit);
        tails.setMatrixAt(i * 2 + k, m);
      }
    });
    heads.instanceMatrix.needsUpdate = true;
    tails.instanceMatrix.needsUpdate = true;
  });

  // --- Embers rising from the stalls --------------------------------------
  const EMBERS = 260;
  const emberPositions = new Float32Array(EMBERS * 3);
  const emberData = Array.from({ length: EMBERS }, () => {
    const origin =
      stallPositions[Math.floor(rand() * stallPositions.length)] ?? new THREE.Vector3(0, 2, 2);
    return {
      x: origin.x + (rand() - 0.5) * 1.8,
      z: origin.z + (rand() - 0.5) * 1.2,
      y0: origin.y - 0.4,
      phase: rand() * 10,
      speed: 0.35 + rand() * 0.6,
      sway: 0.2 + rand() * 0.4,
    };
  });
  const emberGeo = keep(new THREE.BufferGeometry());
  const emberAttr = new THREE.BufferAttribute(emberPositions, 3);
  emberGeo.setAttribute('position', emberAttr);
  const emberMat = keep(
    new THREE.PointsMaterial({
      size: 0.16,
      map: keep(glowDot()),
      color: 0xffc27a,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  scene.add(new THREE.Points(emberGeo, emberMat));
  animations.push((t) => {
    emberData.forEach((e, i) => {
      const life = (t * e.speed + e.phase) % 4.5;
      emberPositions[i * 3] = e.x + Math.sin(t * 0.8 + e.phase) * e.sway;
      emberPositions[i * 3 + 1] = e.y0 + life * 1.1;
      emberPositions[i * 3 + 2] = e.z + Math.cos(t * 0.6 + e.phase) * e.sway * 0.5;
    });
    emberAttr.needsUpdate = true;
  });

  // --- "Licensed" marker over the featured stall ----------------------------
  if (featured) {
    const marker = new THREE.Group();
    marker.position.set(featured.x, featured.y + 3.1, featured.z);
    const markerMat = keep(
      new THREE.MeshStandardMaterial({
        color: BRAND.leafGlow,
        emissive: BRAND.leafGlow,
        emissiveIntensity: 2.6,
      }),
    );
    const cone = new THREE.Mesh(keep(new THREE.ConeGeometry(0.34, 0.8, 24)), markerMat);
    cone.rotation.x = Math.PI;
    marker.add(cone);
    const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.36, 24, 16)), markerMat);
    head.position.y = 0.5;
    marker.add(head);
    scene.add(marker);

    const ringMat = keep(
      new THREE.MeshBasicMaterial({
        color: BRAND.leafGlow,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.9, 1.05, 48)), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(featured.x, WALK_HEIGHT + 0.03, featured.z);
    scene.add(ring);

    animations.push((t) => {
      marker.position.y = featured!.y + 3.1 + Math.sin(t * 1.6) * 0.18;
      marker.rotation.y = t * 1.2;
      const pulse = (t * 0.6) % 1;
      ring.scale.setScalar(1 + pulse * 1.6);
      ringMat.opacity = 0.8 * (1 - pulse);
    });
  }

  return {
    scene,
    update: (t) => animations.forEach((step) => step(t)),
    dispose: () => {
      disposables.forEach((item) => item.dispose());
      dashes.dispose();
      heads.dispose();
      tails.dispose();
    },
  };
}
