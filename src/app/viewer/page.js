"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { useControls } from "leva";

const DEFAULT_MODEL_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb";

useGLTF.preload(DEFAULT_MODEL_URL);

function disposeModel(scene) {
  scene.traverse((object) => {
    if (!object.isMesh) return;

    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}

function Model({ src, materialSettings }) {
  const { scene } = useGLTF(src);

  useEffect(() => {
    scene.traverse((object) => {
      if (!object.isMesh) return;

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!material) return;
        material.color.set(materialSettings.color);
        material.metalness = materialSettings.metalness;
        material.roughness = materialSettings.roughness;
        material.wireframe = materialSettings.wireframe;
        material.needsUpdate = true;
      });
    });
  }, [materialSettings, scene]);

  useEffect(() => () => disposeModel(scene), [scene]);

  return <primitive object={scene} dispose={null} />;
}

function LoadingFallback() {
  return (
    <Html center>
      <p className="whitespace-nowrap rounded-md bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
        Loading model...
      </p>
    </Html>
  );
}

function ViewerCanvas({ modelUrl, reducedMotion, onDrop }) {
  const materialSettings = useControls("Material", {
    color: { value: "#d7e3f4", label: "Color" },
    metalness: { value: 0.7, min: 0, max: 1, step: 0.01, label: "Metalness" },
    roughness: { value: 0.28, min: 0, max: 1, step: 0.01, label: "Roughness" },
    wireframe: { value: false, label: "Wireframe" },
  });
  const { autoRotateSpeed } = useControls("Camera", {
    autoRotateSpeed: { value: 1.5, min: 0, max: 10, step: 0.1, label: "Auto-rotate speed" },
  });

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file?.name.toLowerCase().endsWith(".glb")) onDrop(file);
  };

  return (
    <div
      className="relative h-[70vh] min-h-[22rem] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 42 }}>
        <color attach="background" args={["#111827"]} />
        <Suspense fallback={<LoadingFallback />}>
          <Stage environment="city" intensity={0.8} shadows="contact" adjustCamera={1.2}>
            <Model key={modelUrl} src={modelUrl} materialSettings={materialSettings} />
          </Stage>
        </Suspense>
        <OrbitControls
          makeDefault
          autoRotate={!reducedMotion}
          autoRotateSpeed={autoRotateSpeed}
          enableDamping
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-slate-950/70 px-3 py-1.5 text-xs text-slate-200">
        Drop a .glb file to replace the model
      </div>
    </div>
  );
}

const LazyViewerCanvas = dynamic(() => Promise.resolve(ViewerCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] min-h-[22rem] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-950 text-sm text-slate-200">
      Loading viewer...
    </div>
  ),
});

export default function ViewerPage() {
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL_URL);
  const [reducedMotion, setReducedMotion] = useState(false);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const handleDrop = (file) => {
    const nextObjectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = nextObjectUrl;
    setModelUrl(nextObjectUrl);
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">3D Model Viewer</h1>
        <p className="max-w-2xl text-base text-slate-600">
          Drag and drop a .glb file anywhere on the canvas to view it, or use the default model below.
        </p>
      </header>

      {reducedMotion && (
        <p className="text-xs font-medium text-slate-500">Reduced motion enabled — auto-rotation disabled</p>
      )}

      <LazyViewerCanvas modelUrl={modelUrl} reducedMotion={reducedMotion} onDrop={handleDrop} />
    </section>
  );
}