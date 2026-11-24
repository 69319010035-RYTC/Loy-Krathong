import { OrbitControls, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

export interface FloatingLantern {
  id: string
  name: string
  x: number
  z: number
  hue: number
  drifting?: boolean
}

export interface FireworkBurstData {
  id: number
  x: number
  y: number
  z: number
  hue: number
}

export type GraphicsQuality = 'performance' | 'balanced' | 'cinematic'

interface FestivalSceneProps {
  lanterns: FloatingLantern[]
  fireworks: FireworkBurstData[]
  quality: GraphicsQuality
  cameraKeys: string[]
  cameraResetToken: number
  extraSkyLanterns: number
  onLanternSelect?: (id: string) => void
  freeCamera: boolean
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

function AdaptiveResolution({ quality }: { quality: GraphicsQuality }) {
  const { gl, setDpr } = useThree()
  const currentDpr = useRef(gl.getPixelRatio())
  const elapsed = useRef(0)
  const frames = useRef(0)
  const limits = quality === 'cinematic'
    ? { min: 0.78, max: 1.3 }
    : quality === 'balanced'
      ? { min: 0.72, max: 1.12 }
      : { min: 0.65, max: 0.9 }

  useEffect(() => {
    currentDpr.current = Math.min(limits.max, Math.max(limits.min, gl.getPixelRatio()))
    setDpr(currentDpr.current)
    elapsed.current = 0
    frames.current = 0
  }, [gl, limits.max, limits.min, setDpr])

  useFrame((_, delta) => {
    elapsed.current += delta
    frames.current += 1
    if (elapsed.current < 1.4) return

    const fps = frames.current / elapsed.current
    const nextDpr = fps < 48
      ? Math.max(limits.min, currentDpr.current - 0.14)
      : fps > 57
        ? Math.min(limits.max, currentDpr.current + 0.05)
        : currentDpr.current

    if (nextDpr !== currentDpr.current) {
      currentDpr.current = nextDpr
      setDpr(nextDpr)
    }
    elapsed.current = 0
    frames.current = 0
  })

  return null
}

const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 displaced = position;
    float wave = sin(position.x * 1.15 + uTime * 0.72) * 0.035
      + cos(position.y * 1.4 - uTime * 0.54) * 0.028;
    displaced.z += wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const waterFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    float ribbons = sin((vUv.x * 18.0 + vUv.y * 4.0) + uTime * 0.7)
      * cos(vUv.y * 52.0 - uTime * 0.9);
    float glimmer = smoothstep(0.38, 0.92, ribbons) * 0.38;
    vec3 deep = vec3(0.035, 0.19, 0.33);
    vec3 teal = vec3(0.055, 0.32, 0.43);
    vec3 water = mix(deep, teal, vUv.y * 0.72 + 0.1);
    water += vec3(0.52, 0.34, 0.18) * glimmer;
    water += vec3(0.08, 0.19, 0.24) * vWave * 3.0;
    gl_FragColor = vec4(water, 1.0);
  }
`

function Water() {
  const material = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 3]} receiveShadow>
      <planeGeometry args={[112, 96, 64, 48]} />
      <shaderMaterial
        ref={material}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
      />
    </mesh>
  )
}

function Moon() {
  return (
    <group position={[5.2, 8.5, -12]}>
      <mesh>
        <sphereGeometry args={[1.15, 32, 32]} />
        <meshBasicMaterial color="#f6dfad" />
      </mesh>
      <mesh position={[0, 0, -0.18]}>
        <sphereGeometry args={[1.55, 24, 24]} />
        <meshBasicMaterial color="#e7b969" transparent opacity={0.1} />
      </mesh>
      <pointLight color="#f5d69c" intensity={18} distance={20} />
    </group>
  )
}

function StarField() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(360 * 3)
    for (let index = 0; index < 360; index += 1) {
      positions[index * 3] = (seededUnit(index * 3 + 1) - 0.5) * 36
      positions[index * 3 + 1] = seededUnit(index * 3 + 2) * 14 + 2
      positions[index * 3 + 2] = -18 - seededUnit(index * 3 + 3) * 12
    }
    const nextGeometry = new THREE.BufferGeometry()
    nextGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return nextGeometry
  }, [])

  return (
    <points geometry={geometry}>
      <pointsMaterial color="#ffe7bc" size={0.055} sizeAttenuation transparent opacity={0.8} />
    </points>
  )
}

function Temple() {
  return (
    <group position={[0, 0, -8.7]} scale={[1.18, 1.12, 1.12]}>
      <mesh position={[0, 0.12, 2.45]}>
        <boxGeometry args={[3.8, 0.18, 1.25]} />
        <meshStandardMaterial color="#9c7047" roughness={0.88} />
      </mesh>
      {[-1.2, 0, 1.2].map((x) => (
        <mesh key={`stair-${x}`} position={[x, 0.07, 3.12]}>
          <boxGeometry args={[1.05, 0.12, 0.42]} />
          <meshStandardMaterial color="#d2aa68" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.3, 0.48, 4.4]} />
        <meshStandardMaterial color="#8f5e3d" roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.52, -0.08]} castShadow>
        <boxGeometry args={[3.65, 2.45, 2.85]} />
        <meshStandardMaterial color="#a96a43" roughness={0.82} />
      </mesh>
      {[-1.4, -0.72, 0, 0.72, 1.4].map((x) => (
        <mesh key={`temple-pillar-${x}`} position={[x, 1.45, 1.49]} castShadow>
          <cylinderGeometry args={[0.075, 0.1, 2.2, 8]} />
          <meshStandardMaterial color="#e7c77f" metalness={0.22} roughness={0.54} />
        </mesh>
      ))}
      <mesh position={[0, 2.79, 1.48]}>
        <boxGeometry args={[3.8, 0.18, 0.12]} />
        <meshStandardMaterial color="#e5bd70" metalness={0.26} roughness={0.48} />
      </mesh>
      <mesh position={[0, 2.86, 0.1]}>
        <boxGeometry args={[3.5, 0.14, 2.5]} />
        <meshStandardMaterial color="#d7a65a" metalness={0.48} roughness={0.42} />
      </mesh>
      {[-1.28, 1.28].map((x) => (
        <group key={x} position={[x, 0.9, 1.18]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.13, 1.6, 8]} />
            <meshStandardMaterial color="#e8c77d" metalness={0.25} roughness={0.54} />
          </mesh>
          <mesh position={[0, 0.84, 0]}>
            <coneGeometry args={[0.2, 0.42, 5]} />
            <meshStandardMaterial color="#e8c77d" metalness={0.35} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2].map((tier) => {
        const width = 4.8 - tier * 0.98
        const height = 0.9 - tier * 0.1
        const y = 2.95 + tier * 0.82
        return (
          <group key={tier} position={[0, y, 0]}>
            <mesh position={[0, -0.08, 0]} castShadow>
              <boxGeometry args={[width, 0.16, 3.35 - tier * 0.62]} />
              <meshStandardMaterial color="#d7a65a" metalness={0.42} roughness={0.48} />
            </mesh>
            <mesh castShadow>
              <coneGeometry args={[width * 0.56, height, 4]} />
              <meshStandardMaterial color={tier === 0 ? '#a84e38' : '#bc6742'} roughness={0.68} />
            </mesh>
            <mesh position={[0, height * 0.12, 0]}>
              <coneGeometry args={[width * 0.19, height * 0.88, 4]} />
              <meshStandardMaterial color="#e4bc70" metalness={0.28} roughness={0.48} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 5.65, 0]}>
        <coneGeometry args={[0.38, 1.15, 6]} />
        <meshStandardMaterial color="#e4bc70" metalness={0.4} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.82, 1.34]}>
        <boxGeometry args={[1.1, 1.75, 0.08]} />
        <meshStandardMaterial color="#412d2c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.12, 1.39]}>
        <boxGeometry args={[0.23, 1.1, 0.1]} />
        <meshStandardMaterial color="#bd8a52" emissive="#d39b4d" emissiveIntensity={0.28} />
      </mesh>
      <pointLight position={[0, 3.2, 2.3]} color="#ffb34e" intensity={4.5} distance={10} />
    </group>
  )
}

function MarketStall({ position, canopy, quality: _quality }: { position: [number, number, number]; canopy: string; quality: GraphicsQuality }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.66, 0]} castShadow>
        <boxGeometry args={[2.32, 1.22, 1.55]} />
        <meshStandardMaterial color="#75472f" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.23, 0.82]} castShadow>
        <boxGeometry args={[2.05, 0.42, 0.12]} />
        <meshStandardMaterial color="#bd8a52" roughness={0.72} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`stall-roof-${side}`} position={[0, 1.85, side * 0.48]} rotation={[side * -0.31, 0, 0]} castShadow>
          <boxGeometry args={[2.92, 0.16, 1.25]} />
          <meshStandardMaterial color={canopy} roughness={0.72} />
        </mesh>
      ))}
      <mesh position={[0, 1.79, 0]}>
        <boxGeometry args={[2.58, 0.1, 0.12]} />
        <meshStandardMaterial color="#e3bd76" roughness={0.64} />
      </mesh>
      {[-1.08, 1.08].flatMap((x) => [-0.62, 0.62].map((z) => (
        <mesh key={`stall-post-${x}-${z}`} position={[x, 0.88, z]}>
          <cylinderGeometry args={[0.045, 0.065, 1.76, 8]} />
          <meshStandardMaterial color="#d1a96c" metalness={0.18} roughness={0.58} />
        </mesh>
      )))}
      {[-0.7, 0, 0.7].map((x, index) => (
        <group key={`stall-goods-${x}`} position={[x, 1.52, 0.74]}>
          <mesh>
            <sphereGeometry args={[0.18, 10, 8]} />
            <meshStandardMaterial color={['#f0ae4f', '#df6c45', '#76a77b'][index]} emissive={['#ae5c21', '#852b23', '#32593c'][index]} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.22, 0.17, 0.15, 8]} />
            <meshStandardMaterial color="#9b653b" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.05, 0.05]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#ffcc72" emissive="#ff9c40" emissiveIntensity={1.7} toneMapped={false} />
      </mesh>
    </group>
  )
}

function FestivalGround() {
  return (
    <group>
      <mesh position={[0, -0.31, -14.75]} receiveShadow>
        <boxGeometry args={[60, 0.38, 26.5]} />
        <meshStandardMaterial color="#77714e" roughness={0.98} />
      </mesh>
      <mesh position={[0, -0.085, -14.75]}>
        <boxGeometry args={[58.8, 0.08, 25.3]} />
        <meshStandardMaterial color="#8e8059" roughness={0.98} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`lake-side-bank-${side}`} position={[side * 25, -0.31, 5.75]} receiveShadow>
          <boxGeometry args={[10, 0.38, 14.5]} />
          <meshStandardMaterial color="#77714e" roughness={0.98} />
        </mesh>
      ))}
      <mesh position={[0, -0.31, 16]} receiveShadow>
        <boxGeometry args={[60, 0.38, 6]} />
        <meshStandardMaterial color="#77714e" roughness={0.98} />
      </mesh>
      <mesh position={[0, -0.085, 16]}>
        <boxGeometry args={[58.8, 0.08, 4.8]} />
        <meshStandardMaterial color="#8e8059" roughness={0.98} />
      </mesh>
      <mesh position={[0, -0.025, 0.25]}>
        <boxGeometry args={[60, 0.16, 1.1]} />
        <meshStandardMaterial color="#967a50" roughness={0.88} />
      </mesh>
    </group>
  )
}

function FarBankMarket({ quality }: { quality: GraphicsQuality }) {
  const stalls: Array<{ x: number; color: string }> = [
    { x: -15, color: '#b34e39' },
    { x: -8, color: '#d09a4d' },
    { x: 0, color: '#4e8980' },
    { x: 8, color: '#8a6386' },
    { x: 15, color: '#bd684b' },
  ]
  return (
    <group>
      {stalls.map(({ x, color }) => <MarketStall key={`far-bank-stall-${x}`} position={[x, 0, 16.3]} canopy={color} quality={quality} />)}
      {Array.from({ length: 11 }, (_, index) => {
        const x = -18 + index * 3.6
        return (
          <group key={`far-bank-light-${index}`} position={[x, 0, 13.8]}>
            <mesh position={[0, 1.25, 0]}>
              <cylinderGeometry args={[0.04, 0.06, 2.5, 7]} />
              <meshStandardMaterial color="#765238" roughness={0.86} />
            </mesh>
            <mesh position={[0, 2.55, 0]}>
              <sphereGeometry args={[0.13, 9, 8]} />
              <meshStandardMaterial color="#ffd47b" emissive="#ffad48" emissiveIntensity={2} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function FestivalStreet({ quality }: { quality: GraphicsQuality }) {
  return (
    <group>
      <mesh position={[0, -0.19, -4.1]} receiveShadow>
        <boxGeometry args={[40, 0.24, 6.4]} />
        <meshStandardMaterial color="#302a2b" roughness={1} />
      </mesh>
      <mesh position={[0, -0.045, -4.15]}>
        <boxGeometry args={[35, 0.03, 0.08]} />
        <meshBasicMaterial color="#b7864d" transparent opacity={0.28} />
      </mesh>
      <MarketStall position={[-6.5, 0, -4.3]} canopy="#b34e39" quality={quality} />
      <MarketStall position={[6.5, 0, -4.3]} canopy="#337a73" quality={quality} />
      <MarketStall position={[-9.5, 0, -4.8]} canopy="#cf9350" quality={quality} />
      <MarketStall position={[9.5, 0, -4.8]} canopy="#7b597e" quality={quality} />
      <MarketStall position={[-10.5, 0, -5.1]} canopy="#648650" quality={quality} />
      <MarketStall position={[10.5, 0, -5.1]} canopy="#b76455" quality={quality} />
      <MarketStall position={[-10.5, 0, -2.9]} canopy="#517d91" quality={quality} />
      <MarketStall position={[10.5, 0, -2.9]} canopy="#c78e4c" quality={quality} />
      {Array.from({ length: 20 }, (_, index) => {
        const x = -9.2 + index * 0.97
        return (
          <group key={index} position={[x, 3.1 + (index % 2) * 0.35, -3.1]}>
            <mesh position={[0, 0.55, 0]}>
              <sphereGeometry args={[0.24, 16, 16]} />
              <meshStandardMaterial color={index % 2 ? '#f5b954' : '#e98c61'} emissive={index % 2 ? '#e08b2c' : '#9d3e2e'} emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.35, 6]} />
              <meshStandardMaterial color="#d6ad70" />
            </mesh>
          </group>
        )
      })}
      {Array.from({ length: 18 }, (_, index) => {
        const x = -8.5 + index
        return (
          <mesh key={`flag-${index}`} position={[x, 2.45 + Math.sin(index * 0.55) * 0.45, -1.65]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.2, 0.52, 3]} />
            <meshStandardMaterial color={['#d95f45', '#e3b65e', '#51877b'][index % 3]} roughness={0.75} />
          </mesh>
        )
      })}
    </group>
  )
}

function RiverBridge({ quality: _quality }: { quality: GraphicsQuality }) {
  const planks = useMemo(() => Array.from({ length: 25 }, (_, index) => {
    const x = -8.4 + index * 0.7
    const arch = Math.max(0, 1 - (x * x) / 42)
    return { x, y: 0.34 + arch * 0.5 }
  }), [])

  return (
    <group position={[0, 0, 12.5]}>
      {planks.map(({ x, y }, index) => (
        <mesh key={`plank-${index}`} position={[x, y, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.66, 0.12, 1.65]} />
          <meshStandardMaterial color={index % 2 ? '#72513c' : '#806047'} roughness={0.88} />
        </mesh>
      ))}
      {[-0.74, 0.74].map((z) => (
        <group key={z}>
          {planks.filter((_, index) => index % 3 === 0).map(({ x, y }, index) => (
            <group key={`post-${index}`} position={[x, y + 0.48, z]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.07, 0.085, 0.9, 8]} />
                <meshStandardMaterial color="#b58a54" roughness={0.72} />
              </mesh>
              <mesh position={[0, 0.48, 0]}>
                <sphereGeometry args={[0.12, 10, 10]} />
                <meshStandardMaterial color="#f0c77d" emissive="#d78a3e" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.91, z]}>
            <boxGeometry args={[17.4, 0.12, 0.1]} />
            <meshStandardMaterial color="#a97a4e" roughness={0.76} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`bridge-rest-stop-${side}`} position={[side * 10.2, 0, 0]}>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[3.5, 0.18, 2.35]} />
            <meshStandardMaterial color="#9b754f" roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.68, -0.56]}>
            <boxGeometry args={[1.65, 0.16, 0.48]} />
            <meshStandardMaterial color="#714b36" roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.02, -0.78]}>
            <boxGeometry args={[1.65, 0.62, 0.12]} />
            <meshStandardMaterial color="#8a6040" roughness={0.84} />
          </mesh>
          {[-0.64, 0.64].map((x) => (
            <mesh key={`bench-leg-${x}`} position={[x, 0.46, -0.56]}>
              <boxGeometry args={[0.1, 0.42, 0.1]} />
              <meshStandardMaterial color="#563b30" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[1.15, 1.34, 0.48]}>
            <cylinderGeometry args={[0.055, 0.08, 2.45, 8]} />
            <meshStandardMaterial color="#65452f" roughness={0.84} />
          </mesh>
          <mesh position={[1.15, 2.62, 0.48]}>
            <sphereGeometry args={[0.17, 10, 8]} />
            <meshStandardMaterial color="#ffc96f" emissive="#ff9c40" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function BridgeApproaches() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={`bridge-approach-${side}`} position={[side * 14.2, 0, 6.7]} rotation={[0, side === 1 ? -2.36 : -0.78, 0]}>
          <mesh position={[0, 0.26, 0]} receiveShadow>
            <boxGeometry args={[17.3, 0.18, 2.5]} />
            <meshStandardMaterial color="#74533b" roughness={0.88} />
          </mesh>
          {[-1, 1].map((railSide) => (
            <group key={`approach-rail-${railSide}`} position={[0, 0, railSide * 1.04]}>
              <mesh position={[0, 0.85, 0]}>
                <boxGeometry args={[17.3, 0.1, 0.1]} />
                <meshStandardMaterial color="#b18a58" roughness={0.78} />
              </mesh>
              {[-7, -3.5, 0, 3.5, 7].map((x) => (
                <group key={`approach-post-${x}`} position={[x, 0.63, 0]}>
                  <mesh>
                    <cylinderGeometry args={[0.045, 0.065, 1.25, 7]} />
                    <meshStandardMaterial color="#795539" roughness={0.84} />
                  </mesh>
                  <mesh position={[0, 0.68, 0]}>
                    <sphereGeometry args={[0.11, 8, 8]} />
                    <meshStandardMaterial color="#ffd47b" emissive="#ffad48" emissiveIntensity={1.8} toneMapped={false} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

function FireworkLaunchRaft({ quality: _quality }: { quality: GraphicsQuality }) {
  return (
    <group position={[18, 0, -6.5]}>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[7.2, 0.32, 4.8]} />
        <meshStandardMaterial color="#75523a" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[6.9, 0.1, 4.5]} />
        <meshStandardMaterial color="#aa8153" roughness={0.78} />
      </mesh>
      {[-2.35, 0, 2.35].map((x, index) => (
        <group key={`firework-mortar-${index}`} position={[x, 0.2, 0]}>
          <mesh rotation={[0.06, 0, index === 1 ? 0 : (index - 1) * 0.045]}>
            <cylinderGeometry args={[0.22, 0.3, 0.88, 8, 1, true]} />
            <meshStandardMaterial color="#4b3935" roughness={0.78} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.46, 0]}>
            <torusGeometry args={[0.23, 0.045, 6, 12]} />
            <meshStandardMaterial color="#d9ad68" metalness={0.25} roughness={0.48} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.075, 8, 8]} />
            <meshStandardMaterial color="#ffc86f" emissive="#ff923f" emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[-3.1, 3.1].flatMap((x) => [-1.9, 1.9].map((z) => (
        <group key={`launch-raft-lamp-${x}-${z}`} position={[x, 0.18, z]}>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 1.24, 7]} />
            <meshStandardMaterial color="#704b34" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.29, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color="#ffd47b" emissive="#ffad48" emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
        </group>
      )))}
    </group>
  )
}

function RiversidePromenade({ quality: _quality }: { quality: GraphicsQuality }) {
  return (
    <group>
      <mesh position={[0, -0.12, -1.95]} receiveShadow>
        <boxGeometry args={[42, 0.28, 4.8]} />
        <meshStandardMaterial color="#705342" roughness={0.92} />
      </mesh>
      {[-0.42, -1.08, -1.74].map((z, index) => (
        <mesh key={z} position={[0, -0.015 - index * 0.045, z]} receiveShadow>
          <boxGeometry args={[41.6, 0.12, 0.56]} />
          <meshStandardMaterial color={index === 0 ? '#a8784f' : '#806047'} roughness={0.86} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, -4.02]}>
        <boxGeometry args={[41.8, 0.12, 0.16]} />
        <meshStandardMaterial color="#b68a58" emissive="#8c542d" emissiveIntensity={0.28} roughness={0.72} />
      </mesh>
      {Array.from({ length: 37 }, (_, index) => {
        const x = -18 + index
        const hasLantern = index % 2 === 0
        return (
          <group key={`river-lamp-${index}`} position={[x, 0, -3.72]}>
            <mesh position={[0, 1.28, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.07, 2.56, 8]} />
              <meshStandardMaterial color="#65432f" roughness={0.84} />
            </mesh>
            <mesh position={[0, 2.62, 0]}>
              <sphereGeometry args={[hasLantern ? 0.13 : 0.09, 12, 12]} />
              <meshStandardMaterial color="#ffc56d" emissive="#ff9b39" emissiveIntensity={2.2} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function PalmTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.15, 0]} rotation={[0, 0, -0.07]} castShadow>
        <cylinderGeometry args={[0.22, 0.38, 4.5, 9]} />
        <meshStandardMaterial color="#80563a" roughness={0.92} />
      </mesh>
      <mesh position={[0, 4.38, 0]}>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial color="#4c6c3e" roughness={0.9} />
      </mesh>
      {Array.from({ length: 9 }, (_, index) => {
        const angle = (index / 9) * Math.PI * 2
        return (
          <group key={`frond-${index}`} position={[0, 4.35, 0]} rotation={[0.18, angle, -0.38]}>
            <mesh position={[0, -0.92, 0]} rotation={[0.08, 0, -2.18]}>
              <coneGeometry args={[0.28, 3.15, 5]} />
              <meshStandardMaterial color={index % 2 ? '#5d9651' : '#76a95b'} emissive="#214425" emissiveIntensity={0.2} roughness={0.88} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function BeachUmbrella({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 2.3, 8]} />
        <meshStandardMaterial color="#806348" roughness={0.86} />
      </mesh>
      <mesh position={[0, 2.25, 0]} scale={[1.18, 0.3, 1.18]}>
        <sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="#f0e9d8" roughness={0.86} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.24, 0]}>
        <torusGeometry args={[1.12, 0.045, 6, 18]} />
        <meshStandardMaterial color="#c5a984" roughness={0.76} />
      </mesh>
    </group>
  )
}

function FestivalBeach() {
  return (
    <group>
      <mesh position={[-6, -0.16, -8.25]} receiveShadow>
        <boxGeometry args={[22, 0.3, 7]} />
        <meshStandardMaterial color="#b49a70" roughness={0.98} />
      </mesh>
      <mesh position={[-11.7, 0.015, -8.3]}>
        <boxGeometry args={[10.2, 0.08, 6.7]} />
        <meshStandardMaterial color="#687d4d" roughness={1} />
      </mesh>
      <PalmTree position={[-15.1, 0, -9.1]} scale={0.82} />
      <PalmTree position={[-12.6, 0, -10.4]} scale={0.72} />
      <PalmTree position={[-16, 0, -6.8]} scale={0.68} />
      {[-9.4, -7.15, -4.9, -2.65].map((x, index) => (
        <BeachUmbrella key={`beach-umbrella-${index}`} position={[x, 0, -10.1]} />
      ))}
    </group>
  )
}

function RiversideChedi({ quality: _quality }: { quality: GraphicsQuality }) {
  const gold = '#e5b45e'
  const brightGold = '#f3cf7a'
  return (
    <group position={[10.6, 0, -8.7]}>
      <mesh position={[0, -0.015, 0]} receiveShadow>
        <boxGeometry args={[5.2, 0.18, 4.8]} />
        <meshStandardMaterial color="#c6a575" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3].map((step) => (
        <mesh key={`island-step-${step}`} position={[0, 0.02 + step * 0.1, 2.42 + step * 0.43]} castShadow receiveShadow>
          <boxGeometry args={[2.8 - step * 0.28, 0.18, 0.48]} />
          <meshStandardMaterial color={step % 2 ? '#c29a61' : '#d8b77c'} roughness={0.84} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[3.5, 0.4, 3.2]} />
        <meshStandardMaterial color="#875339" roughness={0.8} />
      </mesh>
      <group position={[2.65, 0.05, -0.55]} scale={0.62}>
        {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
          <mesh key={`sala-post-${x}-${z}`} position={[x, 1.1, z]}>
            <cylinderGeometry args={[0.09, 0.12, 2.2, 8]} />
            <meshStandardMaterial color="#8f5b3e" roughness={0.82} />
          </mesh>
        )))}
        <mesh position={[0, 2.1, 0]}>
          <boxGeometry args={[2.9, 0.18, 2.9]} />
          <meshStandardMaterial color="#e4c27c" roughness={0.68} />
        </mesh>
        <mesh position={[0, 2.56, 0]}>
          <coneGeometry args={[2.05, 1, 4]} />
          <meshStandardMaterial color="#c85b59" roughness={0.72} />
        </mesh>
        <mesh position={[0, 3.12, 0]}>
          <coneGeometry args={[0.42, 0.55, 6]} />
          <meshStandardMaterial color="#e3bd70" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[1.42, 1.58, 0.42, 12]} />
        <meshStandardMaterial color={gold} metalness={0.35} roughness={0.5} emissive="#a6531c" emissiveIntensity={0.24} />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow>
        <cylinderGeometry args={[1.18, 1.38, 0.82, 12]} />
        <meshStandardMaterial color="#d89449" metalness={0.22} roughness={0.58} />
      </mesh>
      <mesh position={[0, 2.08, 0]} castShadow>
        <cylinderGeometry args={[0.86, 1.18, 1.05, 12]} />
        <meshStandardMaterial color="#c47a3e" roughness={0.68} />
      </mesh>
      {[0, 1, 2].map((tier) => (
        <group key={`chedi-tier-${tier}`} position={[0, 2.74 + tier * 0.62, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.9 - tier * 0.18, 0.82, 10]} />
            <meshStandardMaterial color={tier === 0 ? gold : brightGold} metalness={0.36} roughness={0.42} emissive="#b76a22" emissiveIntensity={0.28} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <torusGeometry args={[0.73 - tier * 0.16, 0.055, 8, 24]} />
            <meshStandardMaterial color="#ffe29a" emissive="#e39b3d" emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.13, 0]} castShadow>
        <coneGeometry args={[0.34, 2.35, 8]} />
        <meshStandardMaterial color={brightGold} metalness={0.42} roughness={0.36} emissive="#c67b28" emissiveIntensity={0.42} />
      </mesh>
      <mesh position={[0, 6.37, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#fff0ad" toneMapped={false} />
      </mesh>
    </group>
  )
}

function FloatingMarketDistrict({ quality }: { quality: GraphicsQuality }) {
  return (
    <group position={[-20, 0, -15]}>
      <mesh position={[0, -0.13, 0]} receiveShadow>
        <boxGeometry args={[13.5, 0.32, 11.8]} />
        <meshStandardMaterial color="#896847" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[13, 0.08, 11.3]} />
        <meshStandardMaterial color="#b59a6a" roughness={0.96} />
      </mesh>
      <mesh position={[5.8, 0.1, 0]}>
        <boxGeometry args={[3.8, 0.18, 1.65]} />
        <meshStandardMaterial color="#866044" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`market-rail-${side}`} position={[5.8, 0.53, side * 0.72]}>
          <boxGeometry args={[3.8, 0.08, 0.09]} />
          <meshStandardMaterial color="#d2aa70" roughness={0.78} />
        </mesh>
      ))}
      <MarketStall position={[-3, 0.28, -0.8]} canopy="#c65d43" quality={quality} />
      <MarketStall position={[0, 0.28, -1.6]} canopy="#d59b49" quality={quality} />
      <MarketStall position={[3, 0.28, -0.8]} canopy="#4e8d83" quality={quality} />
      {[-4.5, -1.5, 1.5, 4.5].map((x, index) => (
        <group key={`floating-market-lantern-${index}`} position={[x, 0.25, 3.2]}>
          <mesh position={[0, 1.65, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 3.3, 7]} />
            <meshStandardMaterial color="#78553a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 3.3, 0]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color="#ffc96f" emissive="#ff9c40" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function LanternGardenDistrict({ quality: _quality }: { quality: GraphicsQuality }) {
  return (
    <group position={[22, 0, -15]}>
      <mesh position={[0, -0.14, 0]} receiveShadow>
        <boxGeometry args={[13.2, 0.3, 12]} />
        <meshStandardMaterial color="#8a7049" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[12.8, 0.08, 11.6]} />
        <meshStandardMaterial color="#667b4c" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.27, 0.5]}>
        <cylinderGeometry args={[1.75, 1.85, 0.12, 16]} />
        <meshStandardMaterial color="#5f91a0" metalness={0.15} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.34, 0.5]}>
        <torusGeometry args={[1.86, 0.11, 6, 20]} />
        <meshStandardMaterial color="#d9bd7a" roughness={0.72} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <group key={`garden-lotus-${index}`} position={[Math.cos(angle) * 1.05, 0.44, 0.5 + Math.sin(angle) * 1.05]} rotation={[0.18, angle, -0.2]}>
            <mesh position={[0, 0.12, 0]}>
              <coneGeometry args={[0.18, 0.4, 5]} />
              <meshStandardMaterial color={index % 2 ? '#f2b1ad' : '#f1d29a'} emissive="#9e4f43" emissiveIntensity={0.15} />
            </mesh>
          </group>
        )
      })}
      <PalmTree position={[-3.8, 0.2, -2.5]} scale={0.48} />
      <PalmTree position={[3.9, 0.2, -2.2]} scale={0.44} />
      {[-1, 1].flatMap((side) => [-1, 1].map((depth) => (
        <mesh key={`garden-pavilion-post-${side}-${depth}`} position={[side * 1.7, 1.3, -1.2 + depth * 1.4]}>
          <cylinderGeometry args={[0.07, 0.09, 2.5, 8]} />
          <meshStandardMaterial color="#8a6040" roughness={0.82} />
        </mesh>
      )))}
      <mesh position={[0, 2.52, -1.2]}>
        <boxGeometry args={[4.2, 0.16, 3.6]} />
        <meshStandardMaterial color="#e4c47d" roughness={0.66} />
      </mesh>
      <mesh position={[0, 2.95, -1.2]}>
        <coneGeometry args={[2.8, 0.9, 4]} />
        <meshStandardMaterial color="#8e5944" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.3, 4.2]}>
        <boxGeometry args={[2.4, 0.1, 0.4]} />
        <meshStandardMaterial color="#896344" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.6, 4.2]}>
        <boxGeometry args={[2.4, 0.08, 0.1]} />
        <meshStandardMaterial color="#c6a575" roughness={0.8} />
      </mesh>
    </group>
  )
}

function FestivalStageDistrict({ quality: _quality }: { quality: GraphicsQuality }) {
  return (
    <group position={[0, 0, -22]}>
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[17, 0.35, 14]} />
        <meshStandardMaterial color="#8b704e" roughness={0.9} />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={`stage-walkway-${index}`} position={[0, 0.34, 6.5 + index * 0.8]}>
          <boxGeometry args={[4.8, 0.16, 0.78]} />
          <meshStandardMaterial color={index % 2 ? '#896546' : '#a87d52'} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.52, -2.7]}>
        <boxGeometry args={[12.5, 0.55, 4.4]} />
        <meshStandardMaterial color="#573b34" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.84, -2.7]}>
        <boxGeometry args={[11.8, 0.12, 3.9]} />
        <meshStandardMaterial color="#d1a562" roughness={0.72} />
      </mesh>
      {[-5.2, 5.2].map((x) => (
        <group key={`stage-column-${x}`} position={[x, 0, -4.25]}>
          <mesh position={[0, 2.1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.26, 4.2, 8]} />
            <meshStandardMaterial color="#8d5d40" roughness={0.82} />
          </mesh>
          <mesh position={[0, 4.28, 0]}>
            <sphereGeometry args={[0.3, 12, 10]} />
            <meshStandardMaterial color="#ffd47b" emissive="#ffae46" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.25, -4.25]}>
        <boxGeometry args={[10.8, 0.32, 0.36]} />
        <meshStandardMaterial color="#d8af69" metalness={0.18} roughness={0.56} />
      </mesh>
      <mesh position={[0, 5.1, -4.25]}>
        <coneGeometry args={[3.1, 1.6, 4]} />
        <meshStandardMaterial color="#ad523e" roughness={0.72} />
      </mesh>
      {[-3.6, -1.8, 0, 1.8, 3.6].map((x, index) => (
        <mesh key={`stage-bulb-${index}`} position={[x, 3.25, -4]}>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshStandardMaterial color="#fff0ad" emissive="#ffae48" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function WalkingGuest({ index }: { index: number }) {
  const guest = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const baseX = -10.8 + (index % 12) * 1.96
  const z = -0.75 - Math.floor(index / 12) * 0.82
  const phase = index * 1.73
  const outfit = ['#d58466', '#779c92', '#c19a5e', '#9178a1', '#6c8caa'][index % 5]
  const skin = ['#dba982', '#b97d58', '#e3b895', '#c88d69'][index % 4]
  const hair = ['#30242a', '#211e23', '#46332d', '#302622'][index % 4]
  const trousers = ['#393644', '#3d4542', '#51413b', '#37404c'][index % 4]
  const height = 0.9 + (index % 3) * 0.055

  useFrame(({ clock }) => {
    if (!guest.current) return
    const time = clock.elapsedTime * 0.48 + phase
    const stride = Math.sin(time * 2.5)
    guest.current.position.x = baseX + Math.sin(time) * 0.72
    guest.current.position.y = Math.abs(stride) * 0.035
    guest.current.rotation.y = Math.cos(time) > 0 ? 0 : Math.PI
    if (leftArm.current) leftArm.current.rotation.x = stride * 0.32
    if (rightArm.current) rightArm.current.rotation.x = -stride * 0.32
    if (leftLeg.current) leftLeg.current.rotation.x = -stride * 0.3
    if (rightLeg.current) rightLeg.current.rotation.x = stride * 0.3
  })

  return (
    <group ref={guest} position={[baseX, 0, z]} scale={height * 0.72}>
      <group position={[0, 0.68, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <capsuleGeometry args={[0.19, 0.34, 3, 6]} />
          <meshStandardMaterial color={outfit} roughness={0.84} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.2, 0.29, 0.42, 7]} />
          <meshStandardMaterial color={index % 3 === 1 ? outfit : trousers} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 0.16, 7]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <sphereGeometry args={[0.17, 10, 8]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.73, -0.015]} scale={[1.02, 0.65, 0.92]}>
          <sphereGeometry args={[0.17, 8, 7]} />
          <meshStandardMaterial color={hair} roughness={0.96} />
        </mesh>
        <mesh position={[0, 0.06, 0.185]} rotation={[0, 0, index % 2 ? -0.42 : 0.42]}>
          <boxGeometry args={[0.09, 0.46, 0.035]} />
          <meshStandardMaterial color={index % 2 ? '#f0d093' : '#dcaa68'} roughness={0.78} />
        </mesh>
        <group ref={leftArm} position={[-0.22, 0.28, 0]}>
          <mesh position={[0, -0.2, 0]} rotation={[0, 0, 0.12]}>
            <capsuleGeometry args={[0.058, 0.25, 3, 5]} />
            <meshStandardMaterial color={outfit} roughness={0.86} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.22, 0.28, 0]}>
          <mesh position={[0, -0.2, 0]} rotation={[0, 0, -0.12]}>
            <capsuleGeometry args={[0.058, 0.25, 3, 5]} />
            <meshStandardMaterial color={outfit} roughness={0.86} />
          </mesh>
        </group>
        <group ref={leftLeg} position={[-0.1, -0.38, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.06, 0.055, 0.32, 6]} />
            <meshStandardMaterial color={trousers} roughness={0.9} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.1, -0.38, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.06, 0.055, 0.32, 6]} />
            <meshStandardMaterial color={trousers} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function SkyLantern({ index }: { index: number }) {
  const lantern = useRef<THREE.Group>(null)
  const x = (seededUnit(index + 41) - 0.5) * 24
  const z = -7 - seededUnit(index + 83) * 16
  const startY = 1 + seededUnit(index + 125) * 7
  const hue = 0.07 + seededUnit(index + 167) * 0.13
  const glow = useMemo(() => new THREE.Color().setHSL(hue, 0.76, 0.6), [hue])

  useFrame(({ clock }) => {
    if (!lantern.current) return
    const time = clock.elapsedTime * 0.13 + index * 0.61
    lantern.current.position.y = 1 + ((startY - 1 + time * 1.3) % 12)
    lantern.current.position.x = x + Math.sin(time * 0.8) * 0.65
    lantern.current.rotation.z = Math.sin(time) * 0.05
  })

  return (
    <group ref={lantern} position={[x, startY, z]}>
      <mesh>
        <cylinderGeometry args={[0.21, 0.31, 0.68, 9, 1, true]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.7} transparent opacity={0.88} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.34, 0]}>
        <torusGeometry args={[0.22, 0.025, 6, 12]} />
        <meshStandardMaterial color="#d9ad68" emissive="#ca8038" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, -0.19, 0]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial color="#fff3c1" />
      </mesh>
    </group>
  )
}

function FireworkBurst({ burst, quality }: { burst: FireworkBurstData; quality: GraphicsQuality }) {
  const [burstStarted, setBurstStarted] = useState(false)
  const rocket = useRef<THREE.Group>(null)
  const burstEffects = useRef<THREE.Group>(null)
  const flash = useRef<THREE.Mesh>(null)
  const flashMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const streaks = useRef<THREE.Mesh>(null)
  const streakMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const burstLight = useRef<THREE.PointLight>(null)
  const startedAt = useRef<number | null>(null)
  const fireworkColor = useMemo(() => new THREE.Color().setHSL(burst.hue, 0.9, 0.68), [burst.hue])
  const particleCount = quality === 'performance' ? 36 : quality === 'cinematic' ? 72 : 52
  const scratch = useMemo(() => ({
    view: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    perpendicular: new THREE.Vector3(),
    tail: new THREE.Vector3(),
    head: new THREE.Vector3(),
    tailLeft: new THREE.Vector3(),
    tailRight: new THREE.Vector3(),
    headLeft: new THREE.Vector3(),
    headRight: new THREE.Vector3(),
  }), [])
  const { streakGeometry, velocities } = useMemo(() => {
    const streakPositions = new Float32Array(particleCount * 18)
    const streakColors = new Float32Array(particleCount * 18)
    const nextVelocities = new Float32Array(particleCount * 3)
    const color = new THREE.Color()

    for (let index = 0; index < particleCount; index += 1) {
      const azimuth = seededUnit(burst.id * 211 + index * 3 + 1) * Math.PI * 2
      const vertical = 0.14 + seededUnit(burst.id * 223 + index * 3 + 2) * 0.86
      const horizontal = Math.sqrt(1 - vertical * vertical)
      const speed = 2 + seededUnit(burst.id * 227 + index * 3 + 3) * 3.3
      nextVelocities[index * 3] = horizontal * Math.cos(azimuth) * speed
      nextVelocities[index * 3 + 1] = vertical * speed
      nextVelocities[index * 3 + 2] = horizontal * Math.sin(azimuth) * speed
      color.setHSL((burst.hue + seededUnit(index + burst.id) * 0.045) % 1, 0.96, 0.68)
      for (let vertex = 0; vertex < 6; vertex += 1) {
        const brightness = vertex === 0 || vertex === 1 || vertex === 3 ? 0.3 : 1
        streakColors[index * 18 + vertex * 3] = color.r * brightness
        streakColors[index * 18 + vertex * 3 + 1] = color.g * brightness
        streakColors[index * 18 + vertex * 3 + 2] = color.b * brightness
      }
    }

    const nextStreakGeometry = new THREE.BufferGeometry()
    nextStreakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3))
    nextStreakGeometry.setAttribute('color', new THREE.BufferAttribute(streakColors, 3))
    return { streakGeometry: nextStreakGeometry, velocities: nextVelocities }
  }, [burst.hue, burst.id, particleCount])

  useEffect(() => {
    const launchTimer = window.setTimeout(() => setBurstStarted(true), 900)
    return () => window.clearTimeout(launchTimer)
  }, [])

  // oxlint-disable react/immutability -- Three.js particle buffers must be updated imperatively per frame.
  useFrame(({ clock, camera }) => {
    if (startedAt.current === null) startedAt.current = clock.elapsedTime
    const elapsed = clock.elapsedTime - startedAt.current
    const launchProgress = THREE.MathUtils.clamp(elapsed / 0.9, 0, 1)
    const burstElapsed = elapsed - 0.9
    const streakPositions = streakGeometry.attributes.position as THREE.BufferAttribute
    const time = Math.max(0, burstElapsed)
    const viewDirection = camera.getWorldDirection(scratch.view)
    const { tangent, perpendicular, tail, head, tailLeft, tailRight, headLeft, headRight } = scratch
    const cameraUp = camera.up

    if (rocket.current) {
      rocket.current.position.y = 0.35 + (burst.y - 0.35) * (1 - (1 - launchProgress) ** 2)
    }
    if (flash.current) {
      flash.current.visible = burstStarted && burstElapsed >= 0 && burstElapsed < 0.7
      flash.current.scale.setScalar(0.22 + Math.max(0, burstElapsed) * 0.72)
    }
    if (flashMaterial.current) flashMaterial.current.opacity = Math.max(0, 1 - burstElapsed / 0.7)

    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3
      const streakOffset = index * 18
      const trailTime = Math.max(0, time - 0.24)
      tail.set(
        velocities[offset] * trailTime,
        velocities[offset + 1] * trailTime - 0.42 * trailTime * trailTime,
        velocities[offset + 2] * trailTime,
      )
      head.set(
        velocities[offset] * time,
        velocities[offset + 1] * time - 0.42 * time * time,
        velocities[offset + 2] * time,
      )
      tangent.subVectors(head, tail).normalize()
      perpendicular.crossVectors(tangent, viewDirection).normalize()
      if (perpendicular.lengthSq() < 0.001) perpendicular.crossVectors(tangent, cameraUp).normalize()
      const tailWidth = 0.006
      const headWidth = 0.024
      tailLeft.copy(tail).addScaledVector(perpendicular, tailWidth)
      tailRight.copy(tail).addScaledVector(perpendicular, -tailWidth)
      headLeft.copy(head).addScaledVector(perpendicular, headWidth)
      headRight.copy(head).addScaledVector(perpendicular, -headWidth)
      const vertices = [tailLeft, tailRight, headRight, tailLeft, headRight, headLeft]
      for (let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex += 1) {
        const vertex = vertices[vertexIndex]
        const vertexOffset = streakOffset + vertexIndex * 3
        streakPositions.array[vertexOffset] = vertex.x
        streakPositions.array[vertexOffset + 1] = vertex.y
        streakPositions.array[vertexOffset + 2] = vertex.z
      }
    }
    streakPositions.needsUpdate = true
    if (streaks.current) streaks.current.visible = burstStarted && burstElapsed < 7
    if (streakMaterial.current) streakMaterial.current.opacity = burstStarted ? Math.max(0, 1 - burstElapsed / 7) : 0
    if (burstLight.current) burstLight.current.intensity = burstStarted ? Math.max(0, 22 - burstElapsed * 16) : 0
    if (ring.current) {
      ring.current.scale.setScalar(0.2 + Math.max(0, burstElapsed) * 0.72)
      ring.current.visible = burstStarted && burstElapsed > 0.12 && burstElapsed < 1.4
    }
    if (ringMaterial.current) ringMaterial.current.opacity = burstStarted ? Math.max(0, 0.78 - burstElapsed * 0.56) : 0
  })
  // oxlint-enable react/immutability

  return (
    <group position={[burst.x, 0, burst.z]}>
      <group ref={rocket} position={[0, 0.35, 0]} visible={!burstStarted}>
        <mesh>
          <coneGeometry args={[0.15, 0.42, 8]} />
          <meshBasicMaterial color={fireworkColor} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.035, 0.11, 0.85, 8]} />
          <meshBasicMaterial color={fireworkColor} transparent opacity={0.88} toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[0, -0.18 - index * 0.12, 0]} scale={1 - index * 0.14}>
            <sphereGeometry args={[0.075, 8, 8]} />
            <meshBasicMaterial color={fireworkColor} transparent opacity={0.78 - index * 0.14} />
          </mesh>
        ))}
        <pointLight color={fireworkColor} intensity={4} distance={7} />
      </group>
      <group ref={burstEffects} position={[0, burst.y, 0]} visible={burstStarted}>
        <mesh ref={flash} visible={false}>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial ref={flashMaterial} color="#fff3c2" transparent opacity={1} toneMapped={false} />
        </mesh>
        <mesh ref={streaks} geometry={streakGeometry} visible={burstStarted} frustumCulled={false}>
          <meshBasicMaterial ref={streakMaterial} vertexColors transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <pointLight ref={burstLight} color={fireworkColor} intensity={0} distance={24} />
        <mesh ref={ring} visible={false}>
          <torusGeometry args={[0.7, 0.045, 8, 48]} />
          <meshBasicMaterial ref={ringMaterial} color={fireworkColor} transparent opacity={0.78} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

function Fireworks({ bursts, quality }: { bursts: FireworkBurstData[]; quality: GraphicsQuality }) {
  return <>{bursts.map((burst) => <FireworkBurst key={burst.id} burst={burst} quality={quality} />)}</>
}

function Krathong({ lantern, onSelect }: { lantern: FloatingLantern; onSelect?: (id: string) => void }) {
  const krathong = useRef<THREE.Group>(null)
  const petalColor = useMemo(() => new THREE.Color().setHSL(lantern.hue, 0.58, 0.56), [lantern.hue])
  const nameTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 112
    const context = canvas.getContext('2d')

    if (context) {
      context.fillStyle = 'rgba(13, 26, 29, 0.86)'
      context.strokeStyle = 'rgba(255, 229, 177, 0.72)'
      context.lineWidth = 4
      context.beginPath()
      context.roundRect(3, 3, 506, 106, 52)
      context.fill()
      context.stroke()
      context.fillStyle = '#fff1ca'
      context.font = '600 46px "Noto Sans Thai", "Thonburi", sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(lantern.name, 256, 57, 450)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [lantern.name])

  useFrame(({ clock }, delta) => {
    if (!krathong.current) return
    const time = clock.elapsedTime + lantern.x * 2
    krathong.current.position.y = -0.29 + Math.sin(time * 1.45) * 0.022
    krathong.current.rotation.y = Math.sin(time * 0.45) * 0.22
    krathong.current.rotation.z = Math.sin(time) * 0.035
    if (lantern.drifting) krathong.current.position.z = Math.max(-1.7, krathong.current.position.z - delta * 0.24)
  })

  return (
    <group
      ref={krathong}
      position={[lantern.x, -0.29, lantern.z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.(lantern.id)
      }}
    >
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.38, 0.13, 9]} />
        <meshStandardMaterial color="#a96c3f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.44, 0.3, 0.07, 9]} />
        <meshStandardMaterial color="#d6a957" roughness={0.78} />
      </mesh>
      {Array.from({ length: 9 }, (_, index) => {
        const angle = (index / 9) * Math.PI * 2
        return (
          <mesh
            key={index}
            position={[Math.sin(angle) * 0.29, 0.19, Math.cos(angle) * 0.29]}
            rotation={[Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48]}
            castShadow
          >
            <coneGeometry args={[0.12, 0.42, 4]} />
            <meshStandardMaterial color={petalColor} roughness={0.7} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.055, 0.08, 0.22, 8]} />
        <meshStandardMaterial color="#f7cb72" emissive="#d6812c" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshBasicMaterial color="#fff4bf" />
      </mesh>
      <sprite position={[0, 0.64, 0]} scale={[1.04, 0.23, 1]}>
        <spriteMaterial map={nameTexture} transparent depthWrite={false} />
      </sprite>
    </group>
  )
}

function SmallRiverKrathong({ index }: { index: number }) {
  const raft = useRef<THREE.Group>(null)
  const row = Math.floor(index / 6)
  const column = index % 6
  const baseX = (row === 0 ? -15 : -15) + column * 6
  const baseZ = row === 0 ? 3.2 : 9.7
  const scale = 0.48 + seededUnit(index + 941) * 0.2
  const flower = useMemo(() => new THREE.Color().setHSL(0.08 + seededUnit(index + 73) * 0.12, 0.72, 0.62), [index])

  useFrame(({ clock }) => {
    if (!raft.current) return
    const time = clock.elapsedTime * 0.28 + index * 1.7
    raft.current.position.x = baseX + Math.sin(time) * 0.42
    raft.current.position.z = baseZ + Math.cos(time * 0.7) * 0.48
    raft.current.position.y = -0.12 + Math.sin(time * 1.8) * 0.035
    raft.current.rotation.y = Math.sin(time * 0.45) * 0.22
    raft.current.rotation.z = Math.sin(time) * 0.035
  })

  return (
    <group ref={raft} position={[baseX, -0.29, baseZ]} scale={scale}>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.42, 0.33, 0.1, 8]} />
        <meshStandardMaterial color="#9c633c" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.32, 0.27, 0.055, 8]} />
        <meshStandardMaterial color="#d6a959" roughness={0.8} />
      </mesh>
      {Array.from({ length: 7 }, (_, petal) => {
        const angle = (petal / 7) * Math.PI * 2
        return (
          <mesh key={`small-petal-${petal}`} position={[Math.sin(angle) * 0.2, 0.15, Math.cos(angle) * 0.2]} rotation={[Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4]}>
            <coneGeometry args={[0.08, 0.25, 4]} />
            <meshStandardMaterial color={flower} roughness={0.72} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshBasicMaterial color="#fff0ad" toneMapped={false} />
      </mesh>
    </group>
  )
}

function FestivalWorld({ lanterns, fireworks, quality, cameraKeys, cameraResetToken, extraSkyLanterns, onLanternSelect, freeCamera }: FestivalSceneProps) {
  const people = useMemo(() => Array.from({ length: 60 }, (_, index) => index), [])
  const [ambientFireworks, setAmbientFireworks] = useState<FireworkBurstData[]>([])
  const ambientFireworkId = useRef(0)
  const ambientFireworkTimes = useRef(new Map<number, number>())
  const controls = useRef<OrbitControlsImpl | null>(null)
  const pressedKeys = useRef(new Set<string>())
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const movement = useRef(new THREE.Vector3())
  const previousCameraPosition = useRef(new THREE.Vector3())
  const { camera } = useThree()
  const initialCameraPosition = useMemo(() => new THREE.Vector3(-18, 52, 78), [])
  const initialCameraTarget = useMemo(() => new THREE.Vector3(0, 4, 0), [])
  const cinematic = quality === 'cinematic'
  const performance = quality === 'performance'
  const initialLanterns = useMemo<FloatingLantern[]>(
    () => [
      { id: 'wish-1', name: 'สุขใจ', x: -3.5, z: 5.2, hue: 0.09 },
      { id: 'wish-2', name: 'สมหวัง', x: 2.5, z: 3.3, hue: 0.12 },
      { id: 'wish-3', name: 'แสงแห่งรัก', x: 0.7, z: 7.3, hue: 0.06 },
      { id: 'wish-4', name: 'โชคดี', x: -1.3, z: 1.4, hue: 0.15 },
      { id: 'wish-5', name: 'รอยยิ้ม', x: 4.3, z: 8.4, hue: 0.1 },
      { id: 'wish-6', name: 'ความสุข', x: -5.2, z: 9.5, hue: 0.13 },
    ],
    [],
  )

  useEffect(() => {
    const launchAmbientFirework = () => {
      const index = ambientFireworkId.current++
      const now = Date.now()
      const colors = [0.98, 0.88, 0.12, 0.56, 0.92]
      const id = -(index + 1)
      ambientFireworkTimes.current.set(id, now)
      const burst: FireworkBurstData = {
        id,
        x: (seededUnit(index + 301) - 0.5) * 15,
        y: 9 + seededUnit(index + 407) * 2,
        z: -5.4 - seededUnit(index + 503) * 2.2,
        hue: colors[index % colors.length],
      }
      setAmbientFireworks((current) => [
        ...current.filter((item) => now - (ambientFireworkTimes.current.get(item.id) ?? now) < 8200),
        burst,
      ].slice(-2))
    }

    const interval = window.setInterval(launchAmbientFirework, quality === 'performance' ? 7000 : quality === 'cinematic' ? 4200 : 5500)
    const firstLaunch = window.setTimeout(launchAmbientFirework, 450)
    const pruneInterval = window.setInterval(() => {
      const now = Date.now()
      ambientFireworkTimes.current.forEach((createdAt, id) => {
        if (now - createdAt >= 8200) ambientFireworkTimes.current.delete(id)
      })
      setAmbientFireworks((current) => {
        const active = current.filter((item) => ambientFireworkTimes.current.has(item.id))
        return active.length === current.length ? current : active
      })
    }, 1000)
    return () => {
      window.clearInterval(interval)
      window.clearInterval(pruneInterval)
      window.clearTimeout(firstLaunch)
    }
  }, [quality])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!freeCamera) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'shift'].includes(key)) {
        event.preventDefault()
        pressedKeys.current.add(key)
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => pressedKeys.current.delete(event.key.toLowerCase())
    const clearKeys = () => pressedKeys.current.clear()

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('blur', clearKeys)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('blur', clearKeys)
      clearKeys()
    }
  }, [freeCamera])

  useEffect(() => {
    if (!controls.current) return
    camera.position.copy(initialCameraPosition)
    controls.current.target.copy(initialCameraTarget)
    controls.current.update()
    pressedKeys.current.clear()
  }, [camera, cameraResetToken, initialCameraPosition, initialCameraTarget])

  // oxlint-disable react/immutability -- Three.js camera transforms are updated imperatively during Free Cam animation.
  useFrame((_, delta) => {
    if (!freeCamera || !controls.current) return
    const keys = pressedKeys.current
    const activeKeys = new Set([...keys, ...cameraKeys])
    if (!activeKeys.size) return

    camera.getWorldDirection(forward.current)
    forward.current.y = 0
    forward.current.normalize()
    right.current.crossVectors(forward.current, camera.up).normalize()
    movement.current.set(0, 0, 0)
    if (activeKeys.has('w') || activeKeys.has('arrowup')) movement.current.add(forward.current)
    if (activeKeys.has('s') || activeKeys.has('arrowdown')) movement.current.sub(forward.current)
    if (activeKeys.has('d') || activeKeys.has('arrowright')) movement.current.add(right.current)
    if (activeKeys.has('a') || activeKeys.has('arrowleft')) movement.current.sub(right.current)
    if (activeKeys.has('e')) movement.current.y += 1
    if (activeKeys.has('q')) movement.current.y -= 1
    if (movement.current.lengthSq() === 0) return
    movement.current.normalize().multiplyScalar(delta * (activeKeys.has('shift') ? 24 : 12))
    previousCameraPosition.current.copy(camera.position)
    camera.position.add(movement.current)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -82, 82)
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 4, 66)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -82, 76)
    movement.current.copy(camera.position).sub(previousCameraPosition.current)
    controls.current.target.add(movement.current)
    controls.current.update()
  })
  // oxlint-enable react/immutability

  return (
    <>
      <AdaptiveResolution quality={quality} />
      <color attach="background" args={['#0b3870']} />
      <fog attach="fog" args={['#0b3870', 76, 180]} />
      <ambientLight intensity={cinematic ? 1.2 : performance ? 1.3 : 1.26} color="#c0e0f6" />
      <directionalLight
        position={[-14, 22, 10]}
        intensity={cinematic ? 3.1 : performance ? 1.8 : 2.55}
        color="#fff0d3"
        castShadow={!performance}
        shadow-mapSize={[cinematic ? 2048 : 1024, cinematic ? 2048 : 1024]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-18}
        shadow-camera-far={100}
        shadow-bias={-0.00015}
      />
      <directionalLight position={[10, 12, -16]} intensity={cinematic ? 1.65 : 1.25} color="#80d1ff" />
      {cinematic && <directionalLight position={[0, 7, 18]} intensity={0.65} color="#f29d65" />}
      <group scale={2}>
        <Moon />
        <StarField />
        <Water />
        <FestivalGround />
        <FarBankMarket quality={quality} />
        <FestivalStreet quality={quality} />
        <RiversidePromenade quality={quality} />
        <FestivalBeach />
        <Temple />
        <RiversideChedi quality={quality} />
        <FloatingMarketDistrict quality={quality} />
        <LanternGardenDistrict quality={quality} />
        <RiverBridge quality={quality} />
        <BridgeApproaches />
        <FireworkLaunchRaft quality={quality} />
        <FestivalStageDistrict quality={quality} />
        <Sparkles key={quality} count={performance ? 35 : cinematic ? 120 : 80} scale={[40, 10, 52]} position={[0, 2.5, -2]} size={2} speed={0.24} color="#ffd98b" opacity={0.38} />
        {people.map((index) => <WalkingGuest key={index} index={index} />)}
        {Array.from({ length: 15 + Math.min(extraSkyLanterns, 20) }, (_, index) => <SkyLantern key={`sky-lantern-${index}`} index={index} />)}
        {initialLanterns.map((lantern) => <Krathong key={lantern.id} lantern={lantern} onSelect={onLanternSelect} />)}
        {lanterns.map((lantern) => <Krathong key={lantern.id} lantern={lantern} onSelect={onLanternSelect} />)}
        {Array.from({ length: performance ? 8 : cinematic ? 14 : 12 }, (_, index) => <SmallRiverKrathong key={`river-krathong-${index}`} index={index} />)}
        <Fireworks bursts={[...ambientFireworks, ...fireworks]} quality={quality} />
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={freeCamera}
        enableDamping
        dampingFactor={0.08}
        minDistance={freeCamera ? 18 : 36}
        maxDistance={freeCamera ? 140 : 100}
        minPolarAngle={freeCamera ? Math.PI / 10 : Math.PI / 3.4}
        maxPolarAngle={freeCamera ? Math.PI * 0.9 : Math.PI / 2.05}
        target={[0, 4, 0]}
      />
    </>
  )
}

export default function FestivalScene(props: FestivalSceneProps) {
  const dpr: [number, number] = props.quality === 'cinematic' ? [0.78, 1.3] : props.quality === 'performance' ? [0.65, 0.9] : [0.72, 1.12]
  return (
    <Canvas
      className="festival-canvas"
      camera={{ position: [-18, 52, 78], fov: 49, near: 0.1, far: 320 }}
      dpr={dpr}
      gl={{ antialias: props.quality !== 'performance', alpha: false, powerPreference: props.quality === 'performance' ? 'low-power' : 'high-performance' }}
      shadows={props.quality === 'cinematic'}
    >
      <FestivalWorld {...props} />
    </Canvas>
  )
}
