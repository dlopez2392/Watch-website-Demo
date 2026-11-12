import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import HeroScene, { CAMERA_FOV, CAMERA_Z, type HeroSceneProps } from './HeroScene';
import { pickTier } from './Stage';

export default function HeroCanvas({ active, frozen }: { active: boolean; frozen?: HeroSceneProps['frozen'] }) {
  const [tier] = useState(() => pickTier(window.innerWidth, window.innerHeight));
  return (
    <Canvas
      dpr={tier.dpr}
      frameloop={active ? 'always' : 'never'}
      shadows="variance"
      gl={{ alpha: true, antialias: tier.level === 'low', powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: !!frozen }}
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 70, far: 700 }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <HeroScene tier={tier} frozen={frozen} />
    </Canvas>
  );
}
