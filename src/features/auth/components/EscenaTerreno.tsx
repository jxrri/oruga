/**
 * Escena del login: terreno de obra con curvas de nivel (shader) y balizas amarillas que recorren el patio,
 * una por activo. Se carga perezosa; se pausa con la pestaña oculta; DPR acotado.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TemaResuelto } from '@/shared/hooks/useAplicarTema';

/** Relieve determinista: ondulaciones suaves y un foso de excavación. */
const altura = (x: number, z: number) => {
  const ondas =
    Math.sin(x * 0.17) * Math.cos(z * 0.14) * 1.7 +
    Math.sin(x * 0.07 + z * 0.1) * 2.3 +
    Math.cos(x * 0.31 - z * 0.26) * 0.45 +
    Math.sin(x * 0.55 + z * 0.43) * 0.16;
  const r2 = (x - 4) ** 2 + (z + 3) ** 2;
  return ondas - 3.4 * Math.exp(-r2 / 26);
};

const VERTICE = /* glsl */ `
  varying float vAltura;
  varying float vDist;
  void main() {
    vAltura = position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENTO = /* glsl */ `
  uniform vec3 uLinea;
  uniform vec4 uRelleno;
  varying float vAltura;
  varying float vDist;
  float curva(float h, float grosor) {
    float f = abs(fract(h - 0.5) - 0.5) / fwidth(h);
    return 1.0 - min(f / grosor, 1.0);
  }
  void main() {
    float menor = curva(vAltura * 2.0, 1.0) * 0.42;
    float mayor = curva(vAltura * 0.4, 1.5) * 0.95;
    float linea = max(menor, mayor);
    float lejania = 1.0 - smoothstep(14.0, 34.0, vDist);
    float alfa = max(linea, uRelleno.a) * lejania;
    gl_FragColor = vec4(mix(uRelleno.rgb, uLinea, linea), alfa);
    #include <colorspace_fragment>
  }
`;

const BALIZAS = [
  { cx: -6, cz: 2, rx: 3.5, rz: 2.2, w: 0.9, p: 0 },
  { cx: 3, cz: -3, rx: 2.4, rz: 3, w: 0.7, p: 1.7 },
  { cx: 7, cz: 4, rx: 3, rz: 1.6, w: 1.1, p: 3.1 },
  { cx: -2, cz: -7, rx: 4, rz: 2, w: 0.6, p: 4.4 },
  { cx: 0, cz: 6, rx: 2.6, rz: 1.8, w: 0.8, p: 5.6 },
  { cx: 10, cz: -6, rx: 2, rz: 2.6, w: 1, p: 2.4 },
];
const ALTO_BALIZA = 0.7;

const leerVar = (nombre: string) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

function Terreno({ tema }: { tema: TemaResuelto }) {
  const geometria = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 46, 220, 170);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) pos.setY(i, altura(pos.getX(i), pos.getZ(i)));
    g.computeBoundingSphere();
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTICE,
        fragmentShader: FRAGMENTO,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uLinea: { value: new THREE.Color() },
          uRelleno: { value: new THREE.Vector4() },
        },
      }),
    [],
  );

  // Efecto pasivo: corre después de que useAplicarTema cambió data-tema, así lee los tokens nuevos.
  useEffect(() => {
    material.uniforms.uLinea!.value.set(leerVar(tema === 'oscuro' ? '--ink-2' : '--ink-3'));
    const relleno = new THREE.Color(leerVar('--panel'));
    material.uniforms.uRelleno!.value.set(relleno.r, relleno.g, relleno.b, tema === 'oscuro' ? 0.5 : 0.35);
  }, [tema, material]);

  useEffect(
    () => () => {
      geometria.dispose();
      material.dispose();
    },
    [geometria, material],
  );

  return <mesh geometry={geometria} material={material} />;
}

function Balizas({ tema }: { tema: TemaResuelto }) {
  const grupos = useRef<(THREE.Group | null)[]>([]);
  const nucleo = useMemo(() => new THREE.MeshBasicMaterial(), []);
  const marca = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75, depthWrite: false }), []);

  useEffect(() => {
    nucleo.color.set(leerVar('--accent'));
    marca.color.set(leerVar(tema === 'oscuro' ? '--accent' : '--accent-fg'));
  }, [tema, nucleo, marca]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.07;
    BALIZAS.forEach((b, i) => {
      const g = grupos.current[i];
      if (!g) return;
      const a = b.w * t + b.p;
      const x = b.cx + b.rx * Math.sin(a);
      const z = b.cz + b.rz * Math.sin(2 * a) * 0.6;
      g.position.set(x, altura(x, z), z);
    });
  });

  return (
    <>
      {BALIZAS.map((b, i) => (
        <group key={b.p} ref={(g) => void (grupos.current[i] = g)}>
          <mesh position={[0, ALTO_BALIZA, 0]} material={nucleo}>
            <sphereGeometry args={[0.17, 20, 14]} />
          </mesh>
          <mesh position={[0, ALTO_BALIZA / 2, 0]} material={marca}>
            <cylinderGeometry args={[0.018, 0.018, ALTO_BALIZA, 6]} />
          </mesh>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={marca}>
            <ringGeometry args={[0.34, 0.42, 40]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Deriva lenta de la cámara alrededor de un punto fijo del patio. */
function Camara() {
  const foco = useMemo(() => new THREE.Vector3(2, -1.5, -2), []);
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    camera.position.set(Math.sin(t * 0.045) * 2.2, 12.5 + Math.sin(t * 0.06) * 0.5, 18 + Math.cos(t * 0.04) * 1.2);
    camera.lookAt(foco);
  });
  return null;
}

const suscribirVisibilidad = (avisar: () => void) => {
  document.addEventListener('visibilitychange', avisar);
  return () => document.removeEventListener('visibilitychange', avisar);
};

export default function EscenaTerreno({ tema, alListo }: { tema: TemaResuelto; alListo: () => void }) {
  const visible = useSyncExternalStore(suscribirVisibilidad, () => document.visibilityState === 'visible');
  return (
    <Canvas
      frameloop={visible ? 'always' : 'never'}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ fov: 38, near: 0.1, far: 80, position: [0, 12.5, 18] }}
      onCreated={() => requestAnimationFrame(alListo)}
    >
      <Terreno tema={tema} />
      <Balizas tema={tema} />
      <Camara />
    </Canvas>
  );
}
