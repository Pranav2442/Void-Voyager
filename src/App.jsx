import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Github } from 'lucide-react';

const GoogleAnalytics = () => {
  useEffect(() => {
    if (!import.meta.env.VITE_GA_ID) {
      console.log("issues with GA");
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${
      import.meta.env.VITE_GA_ID
    }`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", import.meta.env.VITE_GA_ID);
  }, []);

  return null;
};

const VoidVoyager = () => {
  const mountRef = useRef(null);
  const [showPlanets, setShowPlanets] = useState(true);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showMoons, setShowMoons] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [planetLabels, setPlanetLabels] = useState({});
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [controlsOpen, setControlsOpen] = useState(true);
  
  const hoveredPlanetRef = useRef(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const planetsRef = useRef({});
  const orbitsRef = useRef([]);
  const moonsRef = useRef({});
  const starsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const animationSpeedRef = useRef(1);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const pointerMoveTimeoutRef = useRef(null);
  
  const visibilityRef = useRef({
    showPlanets: true,
    showOrbits: true,
    showMoons: true
  });
  
  useEffect(() => {
    visibilityRef.current = {
      showPlanets,
      showOrbits,
      showMoons
    };
  }, [showPlanets, showOrbits, showMoons]);
  
  useEffect(() => {
    animationSpeedRef.current = speedMultiplier;
  }, [speedMultiplier]);
  
  useEffect(() => {
    if (!planetsRef.current) return;
    
    Object.values(planetsRef.current).forEach(planet => {
      if (planet.label) planet.label.visible = false;
    });
    
    if (selectedPlanet && planetsRef.current[selectedPlanet] && planetsRef.current[selectedPlanet].label) {
      planetsRef.current[selectedPlanet].label.visible = true;
    }
  }, [selectedPlanet]);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  const handlePointerMove = useCallback((event) => {
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    
    if (hoveredPlanetRef.current) {
      const tooltipElement = document.getElementById('planet-tooltip');
      if (tooltipElement) {
        tooltipElement.style.left = `${clientX + 15}px`;
        tooltipElement.style.top = `${clientY - 15}px`;
      }
    }
    
    if (pointerMoveTimeoutRef.current) {
      clearTimeout(pointerMoveTimeoutRef.current);
    }
    
    pointerMoveTimeoutRef.current = setTimeout(() => {
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      const x = ((clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      const y = -((clientY - rect.top) / canvas.clientHeight) * 2 + 1;
      
      mousePositionRef.current = {
        x: clientX,
        y: clientY
      };
      
      if (cameraRef.current && raycasterRef.current && sceneRef.current) {
        raycasterRef.current.setFromCamera({ x, y }, cameraRef.current);
        
        const planetMeshes = [];
        
        if (planetsRef.current) {
          Object.entries(planetsRef.current).forEach(([name, planet]) => {
            if (planet.mesh) {
              planetMeshes.push(planet.mesh);
              planet.mesh.userData.planetName = name;
            }
          });
        }
        
        const intersects = raycasterRef.current.intersectObjects(planetMeshes);
        
        const newHoveredPlanet = intersects.length > 0 ? intersects[0].object.userData.planetName : null;
        
        if (hoveredPlanetRef.current !== newHoveredPlanet) {
          hoveredPlanetRef.current = newHoveredPlanet;
          setHoveredPlanet(newHoveredPlanet);
        }
      }
    }, 60);
  }, []);
  
  const handlePointerUp = useCallback((event) => {
    const currentHoveredPlanet = hoveredPlanetRef.current;
    if (currentHoveredPlanet) {
      setSelectedPlanet(currentHoveredPlanet);
      focusOnPlanet(currentHoveredPlanet);
    }
  }, []);
  
  const animationIdRef = useRef(null);
  const focusAnimationIdRef = useRef(null);
  
  useEffect(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    
    if (focusAnimationIdRef.current) {
      cancelAnimationFrame(focusAnimationIdRef.current);
    }
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const isLowPerformance = false;
    const planetSegments = isLowPerformance ? 32 : 64;
    const starCount = isMobile ? 1500 : 8000;
    
    const fov = isMobile ? 85 : 75;
    const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 30, 100);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance",
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000);
    
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    
    if (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    const canvasElement = renderer.domElement;
    
    canvasElement.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvasElement.addEventListener('pointerup', handlePointerUp, { passive: true });
    
    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);
    
    const sunLight = new THREE.PointLight(0xffffff, 2.5, 0, 1);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0x707070, 0x505050, 0.7);
    scene.add(hemisphereLight);
    
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.rotateSpeed = isMobile ? 0.5 : 1;
    orbitControls.zoomSpeed = isMobile ? 0.7 : 1;
    orbitControls.minDistance = 15;
    orbitControls.maxDistance = 300;
    controlsRef.current = orbitControls;
    
    const sunGeometry = new THREE.SphereGeometry(10, isLowPerformance ? 32 : 64, isLowPerformance ? 32 : 64);
    
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        vec3 colorA = vec3(1.0, 0.9, 0.3);
        vec3 colorB = vec3(1.0, 0.5, 0.0);
        vec3 colorC = vec3(1.0, 0.2, 0.0);
        
        void main() {
          float pulse = sin(time * 2.0) * 0.05 + 0.95;
          
          float noise1 = sin(vPosition.x * 3.0 + time) * sin(vPosition.y * 2.0 + time) * sin(vPosition.z * 5.0 + time);
          float noise2 = cos(vPosition.z * 4.0 + time * 1.5) * sin(vPosition.x * 6.0 + time * 0.5);
          
          float mixVal1 = clamp(noise1 * 0.5 + 0.5, 0.0, 1.0);
          float mixVal2 = clamp(noise2 * 0.5 + 0.5, 0.0, 1.0);
          
          vec3 color = mix(colorA, colorB, mixVal1);
          color = mix(color, colorC, mixVal2 * 0.7);
          
          color *= pulse;
          
          float edgeBrightness = pow(0.5 + 0.5 * noise1, 2.0);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    const sunGlowGeometry = new THREE.SphereGeometry(16, isLowPerformance ? 32 : 64, isLowPerformance ? 32 : 64);
    const sunGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        
        vec3 glowColorInner = vec3(1.0, 0.8, 0.3);
        vec3 glowColorOuter = vec3(1.0, 0.4, 0.0);
        
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float pulse = sin(time * 1.5) * 0.1 + 0.9;
          vec3 glow = mix(glowColorInner, glowColorOuter, intensity) * pulse;
          gl_FragColor = vec4(glow, intensity * 0.7);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    scene.add(sunGlow);
    
    const planetData = [
      { 
        name: "Mercury", 
        radius: 1.5,
        distance: 28,
        color: 0xD0B8AE,
        emissive: 0x3A3A3F,
        roughness: 0.6,
        metalness: 0.7,
        speed: 0.004, 
        tilt: 0.034, 
        description: "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has a cratered surface similar to our Moon.",
        moons: [] 
      },
      { 
        name: "Venus", 
        radius: 2.3,
        distance: 38,
        color: 0xF5E79B,
        emissive: 0x3A2F1A,
        roughness: 0.5,
        metalness: 0.1,
        speed: 0.0035, 
        tilt: 0.002, 
        description: "Venus is the hottest planet in our Solar System, with a thick, toxic atmosphere that traps heat. It has extreme greenhouse effect.",
        atmosphere: true,
        atmosphereColor: 0xF5E3BF,
        moons: [] 
      },
      { 
        name: "Earth", 
        radius: 2.2,
        distance: 50, 
        color: 0x2BA3D8,
        emissive: 0x1A3A5A,
        roughness: 0.4,
        metalness: 0.1,
        speed: 0.003, 
        tilt: 0.41, 
        atmosphere: true,
        atmosphereColor: 0x8CD9FF,
        description: "Earth is our home planet, the only known place in the universe with life. It has liquid water, an atmosphere, and a protective magnetic field.",
        moons: [
          { name: "Moon", radius: 0.7, distance: 5, color: 0xF5F5F5, emissive: 0x323232, roughness: 0.8, metalness: 0.1, speed: 0.015 }
        ]
      },
      { 
        name: "Mars", 
        radius: 1.5,
        distance: 60, 
        color: 0xF67C3C,
        emissive: 0x522B1A,
        roughness: 0.7,
        metalness: 0.0,
        speed: 0.0024, 
        tilt: 0.44, 
        atmosphere: !isLowPerformance,
        atmosphereColor: 0xF6B588,
        description: "Mars is known as the Red Planet due to iron oxide (rust) on its surface. It has polar ice caps and was once more Earth-like with flowing water.",
        moons: isLowPerformance ? [] : [
          { name: "Phobos", radius: 0.4, distance: 3.5, color: 0xD0C7A9, emissive: 0x333328, roughness: 0.9, metalness: 0.1, speed: 0.02 },
          { name: "Deimos", radius: 0.3, distance: 4.5, color: 0xD4CDC3, emissive: 0x333328, roughness: 0.9, metalness: 0.1, speed: 0.015 }
        ]
      },
      { 
        name: "Jupiter", 
        radius: 4.5,
        distance: 80, 
        color: 0xF4B87D,
        emissive: 0x4D3419,
        roughness: 0.5,
        metalness: 0.1,
        speed: 0.0013, 
        tilt: 0.05,
        bands: true,
        description: "Jupiter is the largest planet in our Solar System. It's a gas giant with a distinctive Great Red Spot, which is a giant, persistent storm.",
        moons: isLowPerformance ? [
          { name: "Ganymede", radius: 0.9, distance: 10, color: 0xF3F3F3, emissive: 0x323232, roughness: 0.7, metalness: 0.2, speed: 0.015 }
        ] : [
          { name: "Io", radius: 0.7, distance: 6.5, color: 0xF1DF5A, emissive: 0x4D451C, roughness: 0.6, metalness: 0.2, speed: 0.02 },
          { name: "Europa", radius: 0.6, distance: 8.5, color: 0xF5F5FA, emissive: 0x353542, roughness: 0.4, metalness: 0.3, speed: 0.018 },
          { name: "Ganymede", radius: 0.9, distance: 10.5, color: 0xF3F3F3, emissive: 0x323232, roughness: 0.7, metalness: 0.2, speed: 0.015 },
          { name: "Callisto", radius: 0.8, distance: 12.5, color: 0xA4A09B, emissive: 0x323232, roughness: 0.8, metalness: 0.1, speed: 0.01 }
        ]
      },
      { 
        name: "Saturn", 
        radius: 4,
        distance: 110, 
        color: 0xF9DF96,
        emissive: 0x4D421F,
        roughness: 0.5,
        metalness: 0.2,
        speed: 0.0009, 
        tilt: 0.47,
        bands: true,
        description: "Saturn is famous for its stunning ring system. It's a gas giant composed mainly of hydrogen and helium.",
        rings: true,
        moons: isLowPerformance ? [
          { name: "Titan", radius: 0.9, distance: 11, color: 0xFFDB68, emissive: 0x433A1D, roughness: 0.6, metalness: 0.2, speed: 0.01 }
        ] : [
          { name: "Titan", radius: 0.9, distance: 11, color: 0xFFDB68, emissive: 0x433A1D, roughness: 0.6, metalness: 0.2, speed: 0.01 },
          { name: "Enceladus", radius: 0.5, distance: 8, color: 0xFFFFFF, emissive: 0x323239, roughness: 0.3, metalness: 0.4, speed: 0.015 }
        ]
      },
      { 
        name: "Uranus", 
        radius: 2.8,
        distance: 140, 
        color: 0x4BE2EE,
        emissive: 0x194D4E,
        roughness: 0.5,
        metalness: 0.3,
        speed: 0.0006, 
        tilt: 1.71,
        atmosphere: !isLowPerformance,
        atmosphereColor: 0x99FAFE,
        description: "Uranus is an ice giant with a unique feature - it rotates on its side, likely due to a massive collision in its early history.",
        moons: isLowPerformance ? [] : [
          { name: "Titania", radius: 0.6, distance: 6.5, color: 0xD4D4D4, emissive: 0x323232, roughness: 0.7, metalness: 0.1, speed: 0.013 },
          { name: "Oberon", radius: 0.55, distance: 8.5, color: 0x929292, emissive: 0x323232, roughness: 0.8, metalness: 0.1, speed: 0.01 }
        ]
      },
      { 
        name: "Neptune", 
        radius: 2.8,
        distance: 170, 
        color: 0x2B5DFE,
        emissive: 0x17265D,
        roughness: 0.5,
        metalness: 0.3,
        speed: 0.0005, 
        tilt: 0.49,
        atmosphere: !isLowPerformance,
        atmosphereColor: 0x6FA3FA,
        description: "Neptune is the farthest planet from the Sun. It's an ice giant with the strongest winds in the Solar System, reaching speeds of 2,100 km/h.",
        moons: isLowPerformance ? [] : [
          { name: "Triton", radius: 0.7, distance: 7.5, color: 0xFFFFFF, emissive: 0x32323B, roughness: 0.6, metalness: 0.2, speed: 0.012 }
        ]
      }
    ];
    
    const planets = {};
    const orbits = [];
    const moons = {};
    
    const createOrbitMaterial = (color = 0x50A0FF) => {
      return new THREE.MeshBasicMaterial({ 
        color: color, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
    };
    
    planetData.forEach(planet => {
      const orbitGeometry = new THREE.RingGeometry(planet.distance - 0.2, planet.distance + 0.2, isLowPerformance ? 64 : 128);
      const orbitMaterial = createOrbitMaterial();
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
      orbits.push(orbit);
      
      const planetGeometry = new THREE.SphereGeometry(planet.radius, planetSegments, planetSegments);
      
      let planetMaterial;
      
      if (planet.bands && !isLowPerformance) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            baseColor: { value: new THREE.Color(planet.color) },
            emissiveColor: { value: new THREE.Color(planet.emissive || 0x000000) },
            time: { value: 0 },
            roughness: { value: planet.roughness || 0.7 },
            metalness: { value: planet.metalness || 0.1 }
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              vUv = uv;
              vNormal = normalize(normalMatrix * normal);
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 emissiveColor;
            uniform float time;
            uniform float roughness;
            uniform float metalness;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              float latitude = vPosition.y * 20.0;
              float band = sin(latitude + time * 0.2);
              
              float flow = sin(vUv.y * 50.0 + time * 0.5 + sin(vUv.y * 20.0) * 5.0) * 0.5 + 0.5;
              
              vec3 bandColor = baseColor * (0.9 + band * 0.2);
              vec3 darkBandColor = baseColor * 0.8;
              vec3 finalColor = mix(darkBandColor, bandColor, flow);
              
              finalColor *= 0.85 + 0.25 * sin(vUv.x * 30.0 + time);
              
              finalColor += emissiveColor * 0.3;
              
              float edgeSoftness = max(0.3, dot(vNormal, vec3(0.0, 0.0, 1.0)));
              finalColor *= edgeSoftness * 1.3;
              
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `
        });
      } else {
        planetMaterial = new THREE.MeshStandardMaterial({
          color: planet.color,
          roughness: planet.roughness || 0.7,
          metalness: planet.metalness || 0.1,
          emissive: new THREE.Color(planet.emissive || 0x000000),
          emissiveIntensity: 0.4,
          flatShading: false,
          envMapIntensity: 0.9
        });
      }
      
      const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
      
      const planetContainer = new THREE.Object3D();
      planetContainer.rotation.x = planet.tilt;
      
      const angle = Math.random() * Math.PI * 2;
      const x = planet.distance * Math.cos(angle);
      const z = planet.distance * Math.sin(angle);
      
      planetContainer.position.set(x, 0, z);
      
      planetContainer.add(planetMesh);
      scene.add(planetContainer);
      
      if (planet.atmosphere) {
        const atmosphereGeometry = new THREE.SphereGeometry(planet.radius * 1.1, planetSegments, planetSegments);
        
        if (!isLowPerformance) {
          const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
              atmosphereColor: { value: new THREE.Color(planet.atmosphereColor || 0x0088ff) },
              glowColor: { value: new THREE.Color(planet.atmosphereColor || 0x0088ff).multiplyScalar(1.6) },
              time: { value: 0 }
            },
            vertexShader: `
              varying vec3 vNormal;
              varying vec2 vUv;
              
              void main() {
                vNormal = normalize(normalMatrix * normal);
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 atmosphereColor;
              uniform vec3 glowColor;
              uniform float time;
              varying vec3 vNormal;
              varying vec2 vUv;
              
              void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 1.5);
                float glowPulse = 0.96 + sin(time * 0.5) * 0.06;
                
                float clouds = sin(vUv.y * 10.0 + time * 0.1) * sin(vUv.x * 8.0 + time * 0.2) * 0.15;
                
                vec3 glow = mix(atmosphereColor, glowColor, intensity) * glowPulse;
                
                float edgeSoftness = smoothstep(0.0, 0.4, intensity);
                float alpha = edgeSoftness * (0.5 + clouds);
                
                gl_FragColor = vec4(glow, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
          });
          const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
          planetMesh.add(atmosphere);
        } else {
          const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: planet.atmosphereColor || 0x0088ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
          });
          const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
          planetMesh.add(atmosphere);
        }
      }
      
      planets[planet.name] = {
        mesh: planetMesh,
        container: planetContainer,
        data: planet,
        angle: angle
      };
      
      const planetMoons = [];
      if (planet.moons && planet.moons.length > 0) {
        planet.moons.forEach(moon => {
          const moonGeometry = new THREE.SphereGeometry(moon.radius, planetSegments / 2, planetSegments / 2);
          const moonMaterial = new THREE.MeshStandardMaterial({
            color: moon.color,
            roughness: 0.7,
            metalness: 0.2,
            emissive: new THREE.Color(moon.emissive || 0x222222),
            emissiveIntensity: 0.3,
            flatShading: false
          });
          const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
          
          const moonOrbitGeometry = new THREE.RingGeometry(moon.distance - 0.1, moon.distance + 0.1, isLowPerformance ? 32 : 64);
          const moonOrbitMaterial = createOrbitMaterial(0x70A0FF);
          const moonOrbit = new THREE.Mesh(moonOrbitGeometry, moonOrbitMaterial);
          moonOrbit.rotation.x = Math.PI / 2;
          
          planetMesh.add(moonOrbit);
          planetMesh.add(moonMesh);
          
          planetMoons.push({
            mesh: moonMesh,
            orbit: moonOrbit,
            data: moon,
            angle: Math.random() * Math.PI * 2
          });
        });
      }
      
      moons[planet.name] = planetMoons;
    });
    
    if (planets["Saturn"] && planets["Saturn"].data.rings) {
      const saturnMesh = planets["Saturn"].mesh;
      
      if (isLowPerformance) {
        const ringGeometry = new THREE.RingGeometry(5, 10, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xFAE5C0,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
        });
        
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = Math.PI / 2;
        saturnMesh.add(ringMesh);
      } else {
        const ringGeometry = new THREE.RingGeometry(5, 10, 128, 8);
        
        const pos = ringGeometry.attributes.position;
        const v3 = new THREE.Vector3();
        const uv = [];
        
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const distance = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
          const normalizedDistance = (distance - 5) / (10 - 5);
          uv.push(normalizedDistance, 0);
        }
        
        ringGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        
        const ringMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 }
          },
          vertexShader: `
            varying vec2 vUv;
            
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            
            void main() {
              float r = smoothstep(0.0, 1.0, vUv.x);
              
              float bands = 
                  smoothstep(0.1, 0.2, vUv.x) -
                  smoothstep(0.3, 0.4, vUv.x) +
                  smoothstep(0.45, 0.55, vUv.x) -
                  smoothstep(0.6, 0.7, vUv.x) +
                  smoothstep(0.75, 0.8, vUv.x) -
                  smoothstep(0.85, 0.95, vUv.x);
                  
              float noise = sin(vUv.x * 100.0 + time * 0.2) * 0.5 + 0.5;
              float detail = sin(vUv.x * 200.0) * 0.5 + 0.5;
              
              vec3 inner = vec3(0.98, 0.88, 0.65);
              vec3 middle = vec3(0.99, 0.93, 0.75);
              vec3 outer = vec3(0.95, 0.85, 0.55);
              
              vec3 color = mix(inner, middle, r);
              color = mix(color, outer, r * r);
              
              color = mix(color * 0.75, color * 1.25, bands * noise * detail);
              
              float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
              
              float alpha = mix(0.85, 0.35, r) * (0.85 + 0.25 * bands) * edgeFade;
              
              if (vUv.x > 0.42 && vUv.x < 0.48) {
                alpha *= 0.3;
              }
              
              gl_FragColor = vec4(color, alpha);
            }
          `,
          side: THREE.DoubleSide,
          transparent: true,
          blending: THREE.AdditiveBlending
        });
        
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = Math.PI / 2;
        saturnMesh.add(ringMesh);
      }
    }
    
    const createStarField = () => {
      const stars = new THREE.Group();
      
      if (isLowPerformance) {
        const starGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        
        for (let i = 0; i < 1500; i++) {
          const x = (Math.random() - 0.5) * 2000;
          const y = (Math.random() - 0.5) * 2000;
          const z = (Math.random() - 0.5) * 2000;
          vertices.push(x, y, z);
          
          const r = Math.random() * 0.3 + 0.7;
          const g = Math.random() * 0.3 + 0.7;
          const b = Math.random() * 0.3 + 0.7;
          colors.push(r, g, b);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.beginPath();
        ctx.arc(16, 16, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(240, 240, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(220, 220, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        const starTexture = new THREE.CanvasTexture(canvas);
        
        const starMaterial = new THREE.PointsMaterial({
          size: 2.5,
          map: starTexture,
          transparent: true,
          alphaTest: 0.01,
          sizeAttenuation: true,
          vertexColors: true
        });
        
        const starPoints = new THREE.Points(starGeometry, starMaterial);
        stars.add(starPoints);
      } else {
        const distantStarTexture = createCircularStarTexture();
        
        const distantStarGeometry = new THREE.BufferGeometry();
        const distantStarVertices = [];
        const distantStarColors = [];
        
        for (let i = 0; i < 5000; i++) {
          const x = (Math.random() - 0.5) * 2000;
          const y = (Math.random() - 0.5) * 2000;
          const z = (Math.random() - 0.5) * 2000;
          distantStarVertices.push(x, y, z);
          
          let r, g, b;
          
          const colorType = Math.random();
          if (colorType < 0.1) {
            r = 0.9 + Math.random() * 0.1;
            g = 0.4 + Math.random() * 0.3;
            b = 0.3 + Math.random() * 0.3;
          } else if (colorType < 0.25) {
            r = 0.9 + Math.random() * 0.1;
            g = 0.8 + Math.random() * 0.2;
            b = 0.3 + Math.random() * 0.3;
          } else if (colorType < 0.4) {
            r = 0.6 + Math.random() * 0.2;
            g = 0.7 + Math.random() * 0.2;
            b = 0.9 + Math.random() * 0.1;
          } else if (colorType < 0.5) {
            r = 0.9 + Math.random() * 0.1;
            g = 0.9 + Math.random() * 0.1;
            b = 0.9 + Math.random() * 0.1;
          } else {
            const base = 0.7 + Math.random() * 0.3;
            r = base - Math.random() * 0.1;
            g = base - Math.random() * 0.1;
            b = base + Math.random() * 0.1;
          }
          
          distantStarColors.push(r, g, b);
        }
        
        distantStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(distantStarVertices, 3));
        distantStarGeometry.setAttribute('color', new THREE.Float32BufferAttribute(distantStarColors, 3));
        
        const distantStarMaterial = new THREE.PointsMaterial({
          size: 1.8,
          map: distantStarTexture,
          transparent: true,
          alphaTest: 0.01,
          sizeAttenuation: true,
          vertexColors: true
        });
        
        const distantStars = new THREE.Points(distantStarGeometry, distantStarMaterial);
        stars.add(distantStars);
        
        const midStarGeometry = new THREE.BufferGeometry();
        const midStarVertices = [];
        const midStarColors = [];
        
        for (let i = 0; i < 2500; i++) {
          const x = (Math.random() - 0.5) * 1500;
          const y = (Math.random() - 0.5) * 1500;
          const z = (Math.random() - 0.5) * 1500;
          midStarVertices.push(x, y, z);
          
          let r, g, b;
          
          const colorType = Math.random();
          if (colorType < 0.12) {
            r = 0.95 + Math.random() * 0.05;
            g = 0.3 + Math.random() * 0.2;
            b = 0.2 + Math.random() * 0.1;
          } else if (colorType < 0.25) {
            r = 0.95 + Math.random() * 0.05;
            g = 0.6 + Math.random() * 0.2;
            b = 0.2 + Math.random() * 0.2;
          } else if (colorType < 0.4) {
            r = 0.4 + Math.random() * 0.2;
            g = 0.5 + Math.random() * 0.3;
            b = 0.95 + Math.random() * 0.05;
          } else if (colorType < 0.5) {
            r = 0.7 + Math.random() * 0.2;
            g = 0.8 + Math.random() * 0.2;
            b = 0.95 + Math.random() * 0.05;
          } else if (colorType < 0.6) {
            r = 0.9 + Math.random() * 0.1;
            g = 0.9 + Math.random() * 0.1;
            b = 0.6 + Math.random() * 0.2;
          } else {
            const base = 0.8 + Math.random() * 0.2;
            r = base + (Math.random() - 0.5) * 0.1;
            g = base + (Math.random() - 0.5) * 0.1;
            b = base + (Math.random() - 0.5) * 0.1;
          }
          
          midStarColors.push(r, g, b);
        }
        
        midStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(midStarVertices, 3));
        midStarGeometry.setAttribute('color', new THREE.Float32BufferAttribute(midStarColors, 3));
        
        const midStarMaterial = new THREE.PointsMaterial({
          size: 2.5,
          map: distantStarTexture,
          transparent: true,
          alphaTest: 0.01,
          sizeAttenuation: true,
          vertexColors: true
        });
        
        const midStars = new THREE.Points(midStarGeometry, midStarMaterial);
        stars.add(midStars);
        
        for (let i = 0; i < 250; i++) {
          const radius = Math.random() * 0.4 + 0.1;
          const geometry = new THREE.SphereGeometry(radius, 8, 8);
          
          let color;
          const starType = Math.random();
          
          if (starType < 0.1) {
            color = new THREE.Color(0.9 + Math.random() * 0.1, 0.2 + Math.random() * 0.2, 0.1 + Math.random() * 0.1);
          } else if (starType < 0.2) {
            color = new THREE.Color(0.9 + Math.random() * 0.1, 0.5 + Math.random() * 0.2, 0.1 + Math.random() * 0.1);
          } else if (starType < 0.3) {
            color = new THREE.Color(0.9 + Math.random() * 0.1, 0.8 + Math.random() * 0.2, 0.3 + Math.random() * 0.2);
          } else if (starType < 0.45) {
            const base = 0.9 + Math.random() * 0.1;
            color = new THREE.Color(base, base, base);
          } else if (starType < 0.6) {
            color = new THREE.Color(0.7 + Math.random() * 0.2, 0.8 + Math.random() * 0.2, 0.9 + Math.random() * 0.1);
          } else if (starType < 0.7) {
            color = new THREE.Color(0.4 + Math.random() * 0.3, 0.6 + Math.random() * 0.2, 0.9 + Math.random() * 0.1);
          } else {
            color = new THREE.Color(0.6 + Math.random() * 0.2, 0.4 + Math.random() * 0.2, 0.9 + Math.random() * 0.1);
          }
          
          const material = new THREE.MeshBasicMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
          });
          
          const star = new THREE.Mesh(geometry, material);
          
          const x = (Math.random() - 0.5) * 800;
          const y = (Math.random() - 0.5) * 800;
          const z = (Math.random() - 0.5) * 800;
          star.position.set(x, y, z);
          
          stars.add(star);
        }
      }
      
      scene.add(stars);
      starsRef.current = stars;
    };
    
    function createCircularStarTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
      
      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    }
    
    createStarField();
    
    if (!isLowPerformance) {
      const createNebula = () => {
        const nebulaMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 }
          },
          vertexShader: `
            varying vec3 vPosition;
            
            void main() {
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float time;
            varying vec3 vPosition;
            
            float noise(vec3 p) {
              return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
            }
            
            void main() {
              float dist = length(vPosition);
              
              float n = noise(vPosition * 0.01 + time * 0.0001);
              float n2 = noise(vPosition * 0.02 - time * 0.0002);
              
              vec3 color1 = vec3(0.1, 0.2, 0.5);
              vec3 color2 = vec3(0.5, 0.1, 0.5);
              vec3 color3 = vec3(0.1, 0.1, 0.3);
              
              vec3 finalColor = mix(color1, color2, n);
              finalColor = mix(finalColor, color3, n2);
              
              float alpha = smoothstep(1000.0, 500.0, dist) * 0.07;
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `,
          transparent: true,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending
        });
        
        const nebulaGeometry = new THREE.SphereGeometry(1000, 32, 32);
        const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        scene.add(nebula);
      };
      
      createNebula();
    }
    
    const createPlanetLabels = () => {
      Object.entries(planets).forEach(([name, planet]) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.font = 'Bold 40px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'rgba(255, 255, 255, 1.0)';
        context.fillText(name, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        const labelScale = planet.data.radius * 4;
        sprite.scale.set(labelScale, labelScale/2, 1);
        sprite.position.set(0, planet.data.radius * 2.2, 0);
        sprite.visible = false;
        
        planet.mesh.add(sprite);
        planet.label = sprite;
      });
    };
    
    createPlanetLabels();
    
    planetsRef.current = planets;
    orbitsRef.current = orbits;
    moonsRef.current = moons;
    
    const clock = new THREE.Clock();
    let frameSkip = 0;
    
    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      animationIdRef.current = animationId;
      
      const now = performance.now();
      const delta = clock.getDelta();
      
      if (isLowPerformance) {
        frameSkip = (frameSkip + 1) % 2;
        if (frameSkip !== 0) {
          return;
        }
      }
      
      if (sunMaterial && sunMaterial.uniforms && sunMaterial.uniforms.time) {
        sunMaterial.uniforms.time.value += delta;
      }
      
      if (sunGlow && sunGlow.material && sunGlow.material.uniforms && sunGlow.material.uniforms.time) {
        sunGlow.material.uniforms.time.value += delta;
      }
      
      Object.values(planetsRef.current).forEach(planet => {
        if (planet.mesh && planet.mesh.material && planet.mesh.material.uniforms && planet.mesh.material.uniforms.time) {
          planet.mesh.material.uniforms.time.value += delta;
        }
        
        planet.mesh.children.forEach(child => {
          if (child.material && child.material.uniforms && child.material.uniforms.time) {
            child.material.uniforms.time.value += delta;
          }
        });
      });
      
      if (planets["Saturn"] && planets["Saturn"].mesh) {
        planets["Saturn"].mesh.children.forEach(child => {
          if (child.material && child.material.uniforms && child.material.uniforms.time) {
            child.material.uniforms.time.value += delta;
          }
        });
      }
      
      const currentSpeed = animationSpeedRef.current;
      
      const visibility = visibilityRef.current;
      
      if (orbitsRef.current) {
        orbitsRef.current.forEach(orbit => {
          orbit.visible = visibility.showOrbits;
        });
      }
      
      Object.values(planets).forEach(planet => {
        planet.container.visible = visibility.showPlanets;
        
        planet.angle += planet.data.speed * currentSpeed;
        
        const distance = planet.data.distance;
        const eccentricity = 0.05;
        const a = distance;
        const b = distance * Math.sqrt(1 - eccentricity * eccentricity);
        
        const x = a * Math.cos(planet.angle);
        const z = b * Math.sin(planet.angle);
        
        planet.container.position.set(x, 0, z);
        
        planet.mesh.rotation.y += planet.data.speed * 5 * currentSpeed;
      });
      
      Object.entries(moons).forEach(([planetName, planetMoons]) => {
        if (Array.isArray(planetMoons)) {
          planetMoons.forEach(moon => {
            if (moon.mesh) {
              moon.mesh.visible = visibility.showMoons;
            }
            if (moon.orbit) {
              moon.orbit.visible = visibility.showOrbits && visibility.showMoons;
            }
            
            moon.angle += moon.data.speed * currentSpeed;
            
            const distance = moon.data.distance;
            const eccentricity = 0.02;
            const a = distance;
            const b = distance * Math.sqrt(1 - eccentricity * eccentricity);
            
            const x = a * Math.cos(moon.angle);
            const z = b * Math.sin(moon.angle);
            
            if (moon && moon.mesh) {
              moon.mesh.position.x = x;
              moon.mesh.position.z = z;
              
              moon.mesh.rotation.y += moon.data.speed * 3 * currentSpeed;
            }
          });
        }
      });
      
      controlsRef.current.update();
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (canvasElement) {
        canvasElement.removeEventListener('pointermove', handlePointerMove);
        canvasElement.removeEventListener('pointerup', handlePointerUp);
      }
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      if (focusAnimationIdRef.current) {
        cancelAnimationFrame(focusAnimationIdRef.current);
        focusAnimationIdRef.current = null;
      }
      
      if (pointerMoveTimeoutRef.current) {
        clearTimeout(pointerMoveTimeoutRef.current);
      }
      
      scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
      
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isMobile, handlePointerMove, handlePointerUp]);
  
  const focusOnPlanet = useCallback((planetName) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    if (focusAnimationIdRef.current) {
      cancelAnimationFrame(focusAnimationIdRef.current);
    }
    
    const planet = planetName ? planetsRef.current[planetName] : null;
    
    const targetPos = new THREE.Vector3();
    
    if (planet) {
      targetPos.copy(planet.container.position);
      
      if (planet.mesh) {
        const meshOffset = new THREE.Vector3();
        planet.mesh.getWorldPosition(meshOffset);
        planet.container.getWorldPosition(targetPos);
      }
    } else {
      targetPos.set(0, 0, 0);
    }
    
    const distance = planet ? planet.data.radius * 15 : 100;
    
    const offset = new THREE.Vector3(distance, distance * 0.7, distance);
    
    const startPos = cameraRef.current.position.clone();
    const startTarget = controlsRef.current.target.clone();
    
    const endPos = planet 
      ? new THREE.Vector3().addVectors(targetPos, offset)
      : new THREE.Vector3(0, 30, 100);
    
    let frame = 0;
    const totalFrames = 100;
    
    const animateCamera = () => {
      if (frame <= totalFrames) {
        const progress = frame / totalFrames;
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        cameraRef.current.position.lerpVectors(startPos, endPos, easeOutCubic);
        
        const currentTarget = new THREE.Vector3().lerpVectors(startTarget, targetPos, easeOutCubic);
        controlsRef.current.target.copy(currentTarget);
        
        controlsRef.current.update();
        
        if (rendererRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        frame++;
        focusAnimationIdRef.current = requestAnimationFrame(animateCamera);
      }
    };
    
    animateCamera();
  }, []);
  
  const toggleControlPanel = () => {
    setControlsOpen(!controlsOpen);
  };
  
  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <GoogleAnalytics/>
      <div ref={mountRef} className="w-full h-full" />
      
      {hoveredPlanet && (
        <div 
          id="planet-tooltip"
          className="absolute bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium z-50 pointer-events-none transform-gpu"
          style={{
            left: mousePositionRef.current.x + 15,
            top: mousePositionRef.current.y - 15,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5), 0 0 10px rgba(100, 200, 255, 0.3)',
            opacity: 0.9,
            transition: 'opacity 0.2s ease, transform 0.1s ease-out',
          }}
        >
          <span className="whitespace-nowrap">{hoveredPlanet}</span>
        </div>
      )}
      
      {isMobile && (
        <div className="absolute top-4 right-4 z-30">
          <button 
            onClick={toggleControlPanel} 
            className="bg-gray-800 bg-opacity-80 text-white h-12 w-12 rounded-full flex items-center justify-center shadow-lg border border-blue-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={controlsOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      )}
      
      <div 
        className={`absolute ${isMobile ? 'top-4 left-4 right-20 max-w-xs' : 'top-4 left-4 max-w-xs'} 
                   bg-gray-900 bg-opacity-60 ${isMobile ? 'p-3' : 'p-5'} rounded-2xl text-white shadow-xl backdrop-filter backdrop-blur-lg 
                   border-t border-l border-r border-blue-500/50 border-b transition-all duration-300 transform z-20
                   ${isMobile && !controlsOpen ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
        style={{
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(30, 120, 255, 0.4)',
          background: 'linear-gradient(135deg, rgba(23, 25, 35, 0.8), rgba(15, 17, 25, 0.9))'
        }}
      >
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-3' : 'mb-5'} text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500`}>
          Void Voyager
        </h2>
        
        <div className={`${isMobile ? 'space-y-2' : 'space-y-4'}`}>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-300 transition-colors duration-200 group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showPlanets}
                  onChange={(e) => setShowPlanets(e.target.checked)}
                  className="opacity-0 absolute h-5 w-5"
                />
                <div className={`border-2 rounded-md h-5 w-5 flex flex-shrink-0 justify-center items-center
                                ${showPlanets ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent' : 'border-blue-400/50 bg-gray-800/50'}`}>
                  <svg className={`h-3 w-3 text-white ${showPlanets ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-medium group-hover:text-blue-300 transition-colors">Planets</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-300 transition-colors duration-200 group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showOrbits}
                  onChange={(e) => setShowOrbits(e.target.checked)}
                  className="opacity-0 absolute h-5 w-5"
                />
                <div className={`border-2 rounded-md h-5 w-5 flex flex-shrink-0 justify-center items-center
                                ${showOrbits ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent' : 'border-blue-400/50 bg-gray-800/50'}`}>
                  <svg className={`h-3 w-3 text-white ${showOrbits ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-medium group-hover:text-blue-300 transition-colors">Orbits</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-300 transition-colors duration-200 group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showMoons}
                  onChange={(e) => setShowMoons(e.target.checked)}
                  className="opacity-0 absolute h-5 w-5"
                />
                <div className={`border-2 rounded-md h-5 w-5 flex flex-shrink-0 justify-center items-center
                                ${showMoons ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent' : 'border-blue-400/50 bg-gray-800/50'}`}>
                  <svg className={`h-3 w-3 text-white ${showMoons ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-medium group-hover:text-blue-300 transition-colors">Moons</span>
            </label>
          </div>
        </div>
        
        <div className={`${isMobile ? 'mt-3' : 'mt-5'}`}>
          <p className="text-xs font-medium text-blue-300 mb-1 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Orbital Speed
          </p>
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="relative w-full">
              <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" 
                  style={{ width: `${(speedMultiplier / 3) * 100}%` }}
                ></div>
              </div>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.1"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </div>
        </div>
        
        <div className={`${isMobile ? 'mt-3' : 'mt-5'}`}>
          <p className="text-xs font-medium text-blue-300 mb-1 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Focus Planet
          </p>
          <div className="relative">
            <select
              value={selectedPlanet || ""}
              onChange={(e) => {
                const planet = e.target.value || null;
                setSelectedPlanet(planet);
                focusOnPlanet(planet);
                if (isMobile) {
                  setControlsOpen(false);
                }
              }}
              className="bg-gray-800/70 text-white text-sm p-3 pr-10 rounded-xl w-full border border-blue-500/30 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 appearance-none"
              style={{
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
            >
              <option value="">Solar System</option>
              <option value="Mercury">Mercury</option>
              <option value="Venus">Venus</option>
              <option value="Earth">Earth</option>
              <option value="Mars">Mars</option>
              <option value="Jupiter">Jupiter</option>
              <option value="Saturn">Saturn</option>
              <option value="Uranus">Uranus</option>
              <option value="Neptune">Neptune</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {!isMobile && (
          <div className="mt-2 text-xs text-gray-300 border-t border-gray-700 pt-2">
            <p className="flex items-center justify-center">
              <span className="inline-flex items-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg> 
                Drag to rotate
              </span>
              <span className="inline-flex items-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg> 
                Scroll to zoom
              </span>
              <span className="inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg> 
                Tap planet to select
              </span>
            </p>
          </div>
        )}
        
        <div className={`${isMobile ? 'mt-3 text-xs' : 'mt-4 text-xs'} text-center border-t border-gray-700 ${isMobile ? 'pt-2' : 'pt-3'} flex items-center justify-center space-x-2`}>
          <span>Made with ❤️ by <a href="https://pranavpawar.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Pranav</a></span>
          <a href="https://github.com/Pranav2442" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
            <Github size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default VoidVoyager;