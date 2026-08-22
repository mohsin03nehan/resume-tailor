"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";

export default function ShaderHero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas instanceof HTMLCanvasElement)) {
      return () => {};
    }

    let renderer;
    let geometry;
    let material;
    let animationFrame;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#0B0A0F");
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.z = 7;
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });

    // 3,200 points keeps the cloud detailed while staying comfortable on phones and mid-range laptops.
    const particleCount = 3200;
    const viewHalfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
    const viewHalfWidth = viewHalfHeight * (canvas.clientWidth / Math.max(1, canvas.clientHeight));
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const randomColor = new THREE.Color();
    const blue = new THREE.Color("#7DD3FC");
    const white = new THREE.Color("#FFFFFF");

    // Fill the camera's rectangular view with an organic cloud rather than a circular or grid-like cluster.
    for (let index = 0; index < particleCount; index += 1) {
      const vertical = Math.random() * 2 - 1;
      const pointIndex = index * 3;
      const x = (Math.random() * 2 - 1) * viewHalfWidth * 0.97;
      const y = vertical * viewHalfHeight * 0.97;
      const z = (Math.random() * 2 - 1) * 1.7;

      basePositions[pointIndex] = x;
      basePositions[pointIndex + 1] = y;
      basePositions[pointIndex + 2] = z;
      positions[pointIndex] = x;
      positions[pointIndex + 1] = y;
      positions[pointIndex + 2] = z;

      randomColor.copy(blue).lerp(white, Math.pow(Math.random(), 3));
      colors[pointIndex] = randomColor.r;
      colors[pointIndex + 1] = randomColor.g;
      colors[pointIndex + 2] = randomColor.b;
    }

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    material = new THREE.PointsMaterial({
      size: 0.035,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mouse = new THREE.Vector2();
    const easedMouse = new THREE.Vector2();
    const mouseTarget = { x: 0, y: 0 };
    let hasMousePosition = false;
    const easeMouseX = gsap.quickTo(mouseTarget, "x", { duration: 0.55, ease: "power2.out" });
    const easeMouseY = gsap.quickTo(mouseTarget, "y", { duration: 0.55, ease: "power2.out" });
    let isVisible = document.visibilityState !== "hidden";
    let startTime;

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
    };

    const render = (elapsedSeconds = 0) => {
      if (!reducedMotion.matches) {
        easedMouse.x += (mouseTarget.x - easedMouse.x) * 0.08;
        easedMouse.y += (mouseTarget.y - easedMouse.y) * 0.08;

        // NDC coordinates map to the rectangular cloud. A quadratic inverse-distance force pushes nearby
        // particles away, while lerping toward the target lets them return smoothly to basePositions.
        for (let index = 0; index < particleCount; index += 1) {
          const pointIndex = index * 3;
          const baseX = basePositions[pointIndex];
          const baseY = basePositions[pointIndex + 1];
          let targetX = baseX;
          let targetY = baseY;

          if (hasMousePosition) {
            const mouseX = easedMouse.x * viewHalfWidth;
            const mouseY = easedMouse.y * viewHalfHeight;
            const awayX = baseX - mouseX;
            const awayY = baseY - mouseY;
            const distance = Math.sqrt(awayX * awayX + awayY * awayY);
            const safeDistance = Math.max(distance, 0.08);
            const influence = Math.pow(Math.max(0, 1 - distance / 2.8), 2);
            const repulsion = (influence * 0.42) / safeDistance;

            targetX = baseX + awayX * repulsion;
            targetY = baseY + awayY * repulsion;
          }

          positions[pointIndex] += (targetX - positions[pointIndex]) * 0.12;
          positions[pointIndex + 1] += (targetY - positions[pointIndex + 1]) * 0.12;
        }
        geometry.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };

    // The RAF loop drives both the calm cloud motion and the eased particle response.
    const animate = (now) => {
      if (!isVisible) {
        animationFrame = undefined;
        return;
      }
      if (startTime === undefined) startTime = now;
      render((now - startTime) / 1000);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMouseMove = (event) => {
      const bounds = canvas.getBoundingClientRect();
      mouse.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -(((event.clientY - bounds.top) / bounds.height) * 2 - 1),
      );
      hasMousePosition = true;
      easeMouseX(mouse.x);
      easeMouseY(mouse.y);
    };

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState !== "hidden";
      if (!isVisible && animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      } else if (isVisible && !reducedMotion.matches && animationFrame === undefined) {
        startTime = undefined;
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    resize();
    render();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (!reducedMotion.matches) {
      window.addEventListener("mousemove", handleMouseMove);
      if (isVisible) animationFrame = window.requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
    } catch (error) {
      console.warn("ShaderHero could not initialize its Three.js renderer.", error);
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      return () => {};
    }
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 z-0 h-full w-full" />;
}