declare module '@react-three/fiber' {
  export const Canvas: any;
  export const useFrame: any;
}

declare module 'three' {
  export const THREE: any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      directionalLight: any;
      mesh: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
    }
  }
}
