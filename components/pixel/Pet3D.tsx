import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as THREE from "three";
import type { Pet } from "@/lib/data";
import { colors } from "@/lib/theme";
import { equippedCosmetics } from "./PixelPet";
import { headSpriteForPet } from "./breedSprites";
import { placementFor } from "./cosmeticSprites";
import type { Sprite } from "./PixelSprite";

/**
 * A REAL 3D, Minecraft-style voxel pet, rendered with three.js through expo-gl.
 * Every opaque pixel of the pet's sprite becomes a cube extruded a few voxels
 * deep, so the flat pixel art turns into a chunky blocky figure. It idles with a
 * slow spin and responds to drag. Always on — there is no "3D mode" toggle; the
 * pet page just shows the pet like this.
 */

const DEPTH = 3; // how many voxels thick the extrusion is

type Voxel = { x: number; y: number; color: THREE.Color };

/** Flatten a sprite (+ its cosmetics) into a single voxel grid. */
function spriteVoxels(sprite: Sprite, overlays: { sprite: Sprite; left: number; top: number; scale: number }[]): {
  voxels: Voxel[];
  w: number;
  h: number;
} {
  const h = sprite.rows.length;
  const w = sprite.rows[0]?.length ?? 0;
  // Grid keyed by "x,y" so overlays (hats, glasses) paint over the body.
  const grid = new Map<string, string>();
  const paint = (rows: string[], palette: Record<string, string>, offX: number, offY: number) => {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const color = palette[ch];
        if (!color || ch === " " || ch === ".") continue;
        grid.set(`${Math.round(x + offX)},${Math.round(y + offY)}`, color);
      }
    }
  };
  paint(sprite.rows, sprite.palette, 0, 0);
  for (const o of overlays) {
    // Cosmetics are authored against a 16px face box at the sprite top; map their
    // fractional placement onto the body grid.
    paint(o.sprite.rows, o.sprite.palette, o.left, o.top);
  }
  const voxels: Voxel[] = [];
  for (const [key, color] of grid) {
    const [x, y] = key.split(",").map(Number);
    voxels.push({ x, y, color: new THREE.Color(color) });
  }
  return { voxels, w, h };
}

/** Builds a fresh voxel InstancedMesh for a pet's current head + cosmetics. */
function buildPetMesh(pet: Pet): { mesh: THREE.InstancedMesh; fit: number } {
  const head = headSpriteForPet(pet);
  const hw = head.rows[0]?.length ?? 16;
  const hh = head.rows.length;
  const overlays = equippedCosmetics(pet).map(({ cos }) => {
    const place = placementFor(cos, pet.species);
    return {
      sprite: cos.sprite,
      left: place.left * hw,
      top: place.top * hh,
      scale: place.widthFrac,
    };
  });
  const { voxels, w, h } = spriteVoxels(head, overlays);

  const geo = new THREE.BoxGeometry(1, 1, DEPTH);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, voxels.length);
  const dummy = new THREE.Object3D();
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  voxels.forEach((v, i) => {
    dummy.position.set(v.x - cx, cy - v.y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, v.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return { mesh, fit: 15 / Math.max(w, h) };
}

export default function Pet3D({ pet, size }: { pet: Pet; size: number }) {
  // Rotation state the gesture writes (on the JS thread — see runOnJS below) and
  // the render loop reads. Plain refs so mutations never trigger re-renders.
  const rotY = useRef(0);
  const rotX = useRef(0);
  const idleSpin = useRef(0.6); // constant idle spin (rad/s)
  const dragging = useRef(false);
  const grabX = useRef(0);
  const grabY = useRef(0);
  // Coin-spin: a flick gives yaw a velocity that friction bleeds back down to the
  // idle spin. `velY` is sampled during the drag from the last two move events.
  const velY = useRef(0.6);
  const lastYaw = useRef(0);
  const lastMoveT = useRef(0);
  const rafRef = useRef<number | null>(null);
  // Scene refs so the model can be rebuilt when cosmetics change without
  // recreating the whole GL context.
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRef = useRef<THREE.InstancedMesh | null>(null);

  // Signature of the pet identity + species + breed + equipped cosmetics →
  // rebuild the voxel mesh in place whenever it changes: switch pets → the
  // model swaps to that pet; put a hat on → the 3D model wears it.
  const equipSig = `${pet.id}|${pet.species}|${pet.breed}|${Object.entries(pet.equipped)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join(",")}`;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    if (meshRef.current) {
      group.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
    }
    const { mesh, fit } = buildPetMesh(pet);
    group.add(mesh);
    group.scale.setScalar(fit);
    meshRef.current = mesh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipSig]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // runOnJS(true): run the gesture callbacks on the JS thread so they can mutate
  // the JS refs the GL render loop reads (a UI-thread worklet can't).
  const pan = Gesture.Pan()
    .runOnJS(true)
    // Require real movement before claiming the touch. Without this the pan
    // activated on contact and swallowed taps meant for controls layered over
    // the pet (the cosmetic slot buttons), so they registered inconsistently.
    .minDistance(8)
    .onBegin(() => {
      dragging.current = true;
      grabX.current = rotY.current;
      grabY.current = rotX.current;
      lastYaw.current = rotY.current;
      lastMoveT.current = Date.now();
    })
    .onUpdate((e) => {
      // Map horizontal drag → yaw, vertical drag → pitch (clamped).
      const nextYaw = grabX.current + e.translationX * 0.012;
      // Sample yaw velocity so releasing becomes a coin-flick spin.
      const now = Date.now();
      const dt = (now - lastMoveT.current) / 1000;
      if (dt > 0) velY.current = (nextYaw - lastYaw.current) / dt;
      lastYaw.current = nextYaw;
      lastMoveT.current = now;
      rotY.current = nextYaw;
      rotX.current = Math.max(-0.6, Math.min(0.6, grabY.current + e.translationY * 0.012));
    })
    .onFinalize(() => {
      dragging.current = false;
      // Clamp so a hard flick can't spin absurdly fast.
      velY.current = Math.max(-14, Math.min(14, velY.current));
    });

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    // expo-three's Renderer extends THREE.WebGLRenderer at runtime; its shipped
    // types are thin, so treat it as the three renderer it actually is.
    const renderer = new Renderer({ gl, alpha: true }) as unknown as THREE.WebGLRenderer;
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000);
    camera.position.set(0, 0, 34);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 10, 12);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfb8ff, 0.35);
    rim.position.set(-8, -4, -6);
    scene.add(rim);

    // Build the voxel model from the pet's HEAD sprite + cosmetics and keep the
    // group/mesh in refs so the equip effect can swap it in later.
    const group = new THREE.Group();
    const { mesh, fit } = buildPetMesh(pet);
    group.scale.setScalar(fit);
    group.add(mesh);
    scene.add(group);
    groupRef.current = group;
    meshRef.current = mesh;

    let last = 0;
    const render = (t: number) => {
      rafRef.current = requestAnimationFrame(render);
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      if (!dragging.current) {
        // Coin-spin: friction bleeds the flick velocity back down to the idle
        // spin, so a flick spins fast then eases into the constant gentle spin.
        velY.current += (idleSpin.current - velY.current) * Math.min(1, dt * 1.4);
        rotY.current += velY.current * dt;
        // Ease pitch back to level.
        rotX.current += (0 - rotX.current) * Math.min(1, dt * 3);
      }
      group.rotation.y = rotY.current;
      group.rotation.x = rotX.current;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render(0);
  };

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.shadow, { width: size * 0.5, left: size * 0.25 }]} />
      <GestureDetector gesture={pan}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  shadow: {
    position: "absolute",
    bottom: 2,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.sep,
  },
});
