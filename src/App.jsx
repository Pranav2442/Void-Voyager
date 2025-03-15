import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Github, Globe, Orbit, Moon, Rocket, CircleDashed } from "lucide-react";

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
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [showSpacecraft, setShowSpacecraft] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
  const pointerMoveTimeoutRef = useRef(null);
  const asteroidsRef = useRef([]);
  const asteroidBeltRef = useRef(null);
  const spacecraftRef = useRef({});
  const highlightAnimationRef = useRef(null);

  const visibilityRef = useRef({
    showPlanets: true,
    showOrbits: true,
    showMoons: true,
  });

  useEffect(() => {
    visibilityRef.current = {
      showPlanets,
      showOrbits,
      showMoons,
      showSpacecraft,
    };
  }, [showPlanets, showOrbits, showMoons, showSpacecraft]);

  useEffect(() => {
    animationSpeedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    if (!planetsRef.current) return;

    Object.values(planetsRef.current).forEach((planet) => {
      if (planet.label) planet.label.visible = false;
    });

    if (spacecraftRef.current) {
      Object.values(spacecraftRef.current).forEach((spacecraft) => {
        if (spacecraft.label) spacecraft.label.visible = false;
        if (spacecraft.highlightSphere)
          spacecraft.highlightSphere.visible = false;
      });
    }

    if (
      selectedPlanet &&
      planetsRef.current[selectedPlanet] &&
      planetsRef.current[selectedPlanet].label
    ) {
      planetsRef.current[selectedPlanet].label.visible = true;
    }

    if (
      selectedPlanet &&
      spacecraftRef.current &&
      spacecraftRef.current[selectedPlanet]
    ) {
      if (spacecraftRef.current[selectedPlanet].label) {
        spacecraftRef.current[selectedPlanet].label.visible = true;
      }

      if (spacecraftRef.current[selectedPlanet].highlightSphere) {
        spacecraftRef.current[selectedPlanet].highlightSphere.visible = true;

        const animateHighlight = () => {
          const time = performance.now() * 0.001;
          const scale = 1.0 + Math.sin(time * 2.0) * 0.2;

          if (
            spacecraftRef.current &&
            spacecraftRef.current[selectedPlanet] &&
            spacecraftRef.current[selectedPlanet].highlightSphere
          ) {
            spacecraftRef.current[selectedPlanet].highlightSphere.scale.set(
              scale,
              scale,
              scale
            );
          }

          highlightAnimationRef.current =
            requestAnimationFrame(animateHighlight);
        };

        if (highlightAnimationRef.current) {
          cancelAnimationFrame(highlightAnimationRef.current);
        }

        highlightAnimationRef.current = requestAnimationFrame(animateHighlight);
      }
    } else if (highlightAnimationRef.current) {
      cancelAnimationFrame(highlightAnimationRef.current);
      highlightAnimationRef.current = null;
    }
  }, [selectedPlanet]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handlePointerMove = useCallback((event) => {
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    if (hoveredPlanetRef.current) {
      const tooltipElement = document.getElementById("planet-tooltip");
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
        y: clientY,
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

        const newHoveredPlanet =
          intersects.length > 0
            ? intersects[0].object.userData.planetName
            : null;

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
    const planetSegments = isMobile ? 24 : 64;
    // const starCount = isMobile ? 1500 : 8000;

    const fov = isMobile ? 85 : 75;
    const camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 30, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(
      isMobile
        ? Math.min(window.devicePixelRatio, 1.5)
        : Math.min(window.devicePixelRatio, 2)
    );
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

    canvasElement.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    canvasElement.addEventListener("pointerup", handlePointerUp, {
      passive: true,
    });

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
    orbitControls.maxDistance = 800;
    controlsRef.current = orbitControls;

    const sunGeometry = new THREE.SphereGeometry(
      10,
      isLowPerformance ? 32 : 64,
      isLowPerformance ? 32 : 64
    );

    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
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
      `,
    });

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    const sunGlowGeometry = new THREE.SphereGeometry(
      16,
      isLowPerformance ? 32 : 64,
      isLowPerformance ? 32 : 64
    );
    const sunGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
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
      side: THREE.BackSide,
    });

    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    scene.add(sunGlow);

    const loadEarthTextures = () => {
      const textureURLs = {
        daymap:
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
        normalmap:
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
        specularmap:
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
        cloudmap:
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_2048.jpg",
        nightmap:
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.jpg",
        moonmap:
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg",
      };

      const textureLoader = new THREE.TextureLoader();
      const earthTextures = {};

      for (const [name, url] of Object.entries(textureURLs)) {
        const texture = textureLoader.load(url);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        earthTextures[name] = texture;
      }

      return earthTextures;
    };

    const planetData = [
      {
        name: "Mercury",
        radius: 1.5,
        distance: 20,
        color: 0xff7700,
        emissive: 0x552200,
        roughness: 0.8,
        metalness: 0.5,
        speed: 0.01245,
        tilt: 0.0006,
        eccentricity: 0.206,
        description:
          "Mercury is the smallest planet in the Solar System and the closest to the Sun. Its heavily cratered surface resembles our Moon. With extreme temperature variations, the dayside can reach 430°C while the nightside plunges to -180°C.",
        moons: [],
      },
      {
        name: "Venus",
        radius: 2.3,
        distance: 43,
        color: 0xf5e79b,
        emissive: 0x3a2f1a,
        roughness: 0.5,
        metalness: 0.1,
        speed: 0.00488,
        tilt: 3.1,
        eccentricity: 0.007,
        description:
          "Venus is the hottest planet in our Solar System, with a thick, toxic atmosphere that traps heat. It has extreme greenhouse effect.",
        atmosphere: true,
        atmosphereColor: 0xf5e3bf,
        customShader: true,
        moons: [],
      },
      {
        name: "Earth",
        radius: 2.2,
        distance: 55,
        color: 0x2ba3d8,
        emissive: 0x1a3a5a,
        roughness: 0.4,
        metalness: 0.1,
        speed: 0.003,
        tilt: 0.41,
        eccentricity: 0.017,
        atmosphere: true,
        atmosphereColor: 0x8cd9ff,
        textured: true,
        customShader: true,
        description:
          "Earth is our home planet, the only known place in the universe with life. It has liquid water, an atmosphere, and a protective magnetic field.",
        moons: [
          {
            name: "Moon",
            radius: 0.6,
            distance: 5,
            color: 0xf5f5f5,
            emissive: 0x323232,
            roughness: 0.8,
            metalness: 0.1,
            speed: 0.04,
            textured: true,
          },
        ],
      },
      {
        name: "Mars",
        radius: 1.5,
        distance: 71,
        color: 0xf67c3c,
        emissive: 0x522b1a,
        roughness: 0.7,
        metalness: 0.0,
        speed: 0.00159,
        tilt: 0.44,
        eccentricity: 0.093,
        atmosphere: true,
        atmosphereColor: 0xf6b588,
        customShader: true,
        description:
          "Mars is known as the Red Planet due to iron oxide (rust) on its surface. It has polar ice caps and was once more Earth-like with flowing water.",
        moons: [
          {
            name: "Phobos",
            radius: 0.2,
            distance: 2.5,
            color: 0xd0c7a9,
            emissive: 0x333328,
            roughness: 0.9,
            metalness: 0.1,
            speed: 0.45,
          },
          {
            name: "Deimos",
            radius: 0.15,
            distance: 4,
            color: 0xd4cdc3,
            emissive: 0x333328,
            roughness: 0.9,
            metalness: 0.1,
            speed: 0.1,
          },
        ],
      },
      {
        name: "Jupiter",
        radius: 5.2,
        distance: 116,
        color: 0xf4b87d,
        emissive: 0x4d3419,
        roughness: 0.5,
        metalness: 0.1,
        speed: 0.000253,
        tilt: 0.055,
        eccentricity: 0.049,
        bands: true,
        jupiterRealistic: true,
        description:
          "Jupiter is the largest planet in our Solar System. It's a gas giant with a distinctive Great Red Spot, which is a giant, persistent storm.",
        moons: [
          {
            name: "Io",
            radius: 0.7,
            distance: 7,
            color: 0xf1df5a,
            emissive: 0x4d451c,
            roughness: 0.6,
            metalness: 0.2,
            speed: 0.06,
          },
          {
            name: "Europa",
            radius: 0.6,
            distance: 9,
            color: 0xf5f5fa,
            emissive: 0x353542,
            roughness: 0.4,
            metalness: 0.3,
            speed: 0.03,
          },
          {
            name: "Ganymede",
            radius: 0.9,
            distance: 12,
            color: 0xf3f3f3,
            emissive: 0x323232,
            roughness: 0.7,
            metalness: 0.2,
            speed: 0.015,
          },
          {
            name: "Callisto",
            radius: 0.8,
            distance: 16,
            color: 0xa4a09b,
            emissive: 0x323232,
            roughness: 0.8,
            metalness: 0.1,
            speed: 0.007,
          },
        ],
      },
      {
        name: "Saturn",
        radius: 4,
        distance: 139,
        color: 0xf9df96,
        emissive: 0x4d421f,
        roughness: 0.5,
        metalness: 0.2,
        speed: 0.000102,
        tilt: 0.47,
        eccentricity: 0.054,
        bands: true,
        saturnRealistic: true,
        enhancedRings: true,
        description:
          "Saturn is famous for its stunning ring system. It's a gas giant composed mainly of hydrogen and helium.",
        rings: true,
        moons: [
          {
            name: "Titan",
            radius: 0.9,
            distance: 12,
            color: 0xffdb68,
            emissive: 0x433a1d,
            roughness: 0.6,
            metalness: 0.2,
            speed: 0.005,
          },
          {
            name: "Enceladus",
            radius: 0.3,
            distance: 7,
            color: 0xffffff,
            emissive: 0x323239,
            roughness: 0.3,
            metalness: 0.4,
            speed: 0.01,
          },
        ],
      },
      {
        name: "Uranus",
        radius: 2.8,
        distance: 164,
        color: 0x4be2ee,
        emissive: 0x194d4e,
        roughness: 0.5,
        metalness: 0.3,
        speed: 0.0000357,
        tilt: 1.71,
        eccentricity: 0.047,
        atmosphere: true,
        atmosphereColor: 0x99fafe,
        customShader: true,
        rings: true,
        description:
          "Uranus is an ice giant with a unique feature - it rotates on its side, likely due to a massive collision in its early history.",
        moons: [
          {
            name: "Titania",
            radius: 0.6,
            distance: 6.5,
            color: 0xd4d4d4,
            emissive: 0x323232,
            roughness: 0.7,
            metalness: 0.1,
            speed: 0.008,
          },
          {
            name: "Oberon",
            radius: 0.55,
            distance: 8.5,
            color: 0x929292,
            emissive: 0x323232,
            roughness: 0.8,
            metalness: 0.1,
            speed: 0.006,
          },
        ],
      },
      {
        name: "Neptune",
        radius: 2.8,
        distance: 180,
        color: 0x2b5dfe,
        emissive: 0x17265d,
        roughness: 0.5,
        metalness: 0.3,
        speed: 0.0000182,
        tilt: 0.49,
        eccentricity: 0.009,
        atmosphere: true,
        atmosphereColor: 0x6fa3fa,
        customShader: true,
        description:
          "Neptune is the farthest planet from the Sun. It's an ice giant with the strongest winds in the Solar System, reaching speeds of 2,100 km/h.",
        moons: [
          {
            name: "Triton",
            radius: 0.7,
            distance: 7.5,
            color: 0xffffff,
            emissive: 0x32323b,
            roughness: 0.6,
            metalness: 0.2,
            speed: 0.009,
          },
        ],
      },
    ];

    const spacecraftData = [
      {
        name: "Voyager 1",
        modelType: "voyager",
        startPlanet: null,
        startPosition: new THREE.Vector3(230, 40, 230),
        orbitType: "escape",
        escapeVector: new THREE.Vector3(0.5, 0.2, 0.5).normalize(),
        scale: 2.5,
        speed: 0.00015,
        distance: 230,
        angle: Math.PI * 0.7,
        description:
          "Launched in 1977, now in interstellar space, the furthest human-made object from Earth.",
      },
      {
        name: "Voyager 2",
        modelType: "voyager",
        startPlanet: null,
        startPosition: new THREE.Vector3(-210, -20, 200),
        orbitType: "escape",
        escapeVector: new THREE.Vector3(-0.6, -0.1, 0.7).normalize(),
        scale: 2.5,
        speed: 0.00014,
        distance: 210,
        angle: Math.PI * 1.3,
        description:
          "Launched in 1977, the only spacecraft to have visited Uranus and Neptune.",
      },
      {
        name: "New Horizons",
        modelType: "newHorizons",
        startPlanet: null,
        startPosition: new THREE.Vector3(120, 15, -180),
        orbitType: "escape",
        escapeVector: new THREE.Vector3(0.3, 0.1, -0.9).normalize(),
        scale: 2,
        speed: 0.00016,
        distance: 190,
        angle: Math.PI * 1.8,
        description: "Flew by Pluto in 2015, now exploring the Kuiper Belt.",
      },
      {
        name: "Parker Solar Probe",
        modelType: "parker",
        startPlanet: null,
        startPosition: new THREE.Vector3(-15, 0, 10),
        orbitType: "elliptical",
        orbitParams: {
          semiMajor: 18,
          semiMinor: 12,
          center: new THREE.Vector3(3, 0, 0),
          incline: 0.12,
          period: 5000,
        },
        scale: 1.0,
        speed: 0.015,
        angle: 0,
        description:
          "Studying the Sun's corona, the closest any spacecraft has been to the Sun.",
      },
      {
        name: "James Webb",
        modelType: "jwst",
        startPlanet: "Earth",
        orbitType: "l2",
        distance: 10,
        angle: Math.PI * 0.5,
        scale: 1.8,
        speed: 0.004,
        description:
          "Space telescope operating at L2, 1.5 million km from Earth.",
      },
      {
        name: "ISS",
        modelType: "iss",
        startPlanet: "Earth",
        orbitType: "planetary",
        distance: 2.8,
        scale: 0.3,
        speed: 0.05,
        angle: 0,
        height: 0.1,
        description:
          "International Space Station, continuously inhabited since 2000.",
      },
      {
        name: "Perseverance",
        modelType: "rover",
        startPlanet: "Mars",
        orbitType: "landed",
        landLocation: new THREE.Vector3(0.8, 0, 0.5).normalize(),
        scale: 0.4,
        description:
          "NASA rover that landed on Mars in 2021, searching for signs of ancient life.",
      },
      {
        name: "Cassini",
        modelType: "cassini",
        startPlanet: "Saturn",
        orbitType: "planetary",
        distance: 12,
        scale: 1.5,
        speed: 0.01,
        angle: Math.PI * 0.3,
        description:
          "Studied Saturn and its moons from 2004 to 2017 before its Grand Finale descent.",
      },
      {
        name: "Aditya L1",
        modelType: "adityaL1",
        startPlanet: null,
        orbitType: "l1",
        startPosition: new THREE.Vector3(35, 0, 0),
        distance: 15,
        scale: 1.2,
        speed: 0.003,
        angle: Math.PI * 0.1,
        description:
          "India's first space-based solar observatory positioned at the L1 Lagrangian point between Earth and Sun, studying solar corona, solar emissions, and solar winds.",
      },
      {
        name: "Mangalyaan",
        modelType: "mangalyaan",
        startPlanet: "Mars",
        orbitType: "planetary",
        distance: 6,
        scale: 0.8,
        speed: 0.008,
        angle: Math.PI * 0.7,
        description:
          "India's first interplanetary mission and the first Asian mission to reach Mars orbit. The Mars Orbiter Mission studies the Martian atmosphere and surface mineralogy.",
      },
    ];

    const planets = {};
    const orbits = [];
    const moons = {};

    const createOrbitMaterial = (color = 0x50a0ff) => {
      return new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });
    };

    const earthTextures = loadEarthTextures();

    planetData.forEach((planet) => {
      const orbitGeometry = new THREE.RingGeometry(
        planet.distance - 0.2,
        planet.distance + 0.2,
        isLowPerformance ? 64 : 128
      );
      const orbitMaterial = createOrbitMaterial();
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
      orbits.push(orbit);

      const planetGeometry = new THREE.SphereGeometry(
        planet.radius,
        planetSegments,
        planetSegments
      );

      let planetMaterial;

      if (planet.name === "Mercury" && planet.customShader) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            baseColor: { value: new THREE.Color(planet.color) },
            emissiveColor: {
              value: new THREE.Color(planet.emissive || 0x000000),
            },
            time: { value: 0 },
            roughness: { value: planet.roughness || 0.7 },
            metalness: { value: planet.metalness || 0.1 },
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
            
            // Noise function for crater generation
            float noise(vec2 n) {
              const vec2 d = vec2(0.0, 1.0);
              vec2 b = floor(n);
              vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
              return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
            }
            
            float rand(vec2 n) { 
              return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }
            
            void main() {
              // Base color adjusted by lighting
              vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
              float lightIntensity = max(0.1, dot(vNormal, lightDir));
              
              // Create crater effect
              float crater1 = smoothstep(0.4, 0.5, noise(vUv * 20.0));
              float crater2 = smoothstep(0.6, 0.7, noise(vUv * 10.0 + 5.0));
              float crater3 = smoothstep(0.5, 0.6, noise(vUv * 30.0 - 8.0));
              
              float craterEffect = crater1 * 0.3 + crater2 * 0.4 + crater3 * 0.3;
              
              // Surface variations
              float surfaceVariation = noise(vUv * 50.0) * 0.1;
              
              // Blend base color with crater and surface details
              vec3 surfaceColor = baseColor;
              surfaceColor = mix(surfaceColor, surfaceColor * 0.7, craterEffect);
              surfaceColor = mix(surfaceColor, surfaceColor * 1.1, surfaceVariation);
              
              // Apply lighting
              vec3 finalColor = surfaceColor * lightIntensity;
              finalColor += emissiveColor * 0.3;
              
              // Add subtle atmosphere at edges
              float atmosphereFactor = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.0) * 0.2;
              finalColor = mix(finalColor, vec3(0.6, 0.5, 0.4), atmosphereFactor);
              
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `,
        });
      } else if (planet.name === "Earth" && planet.textured) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            dayTexture: { value: earthTextures.daymap },
            normalTexture: { value: earthTextures.normalmap },
            specularTexture: { value: earthTextures.specularmap },
            sunDirection: { value: new THREE.Vector3(1, 0, 0) },
            normalScale: { value: new THREE.Vector2(0.85, 0.85) },
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
              vUv = uv;
              vNormal = normalize(normalMatrix * normal);
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vViewPosition = -mvPosition.xyz;
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform sampler2D dayTexture;
            uniform sampler2D normalTexture;
            uniform sampler2D specularTexture;
            uniform vec3 sunDirection;
            uniform vec2 normalScale;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
              vec3 normal = normalize(vNormal);
              vec3 sunDir = normalize(sunDirection);
              
              vec4 normalColor = texture2D(normalTexture, vUv);
              vec3 normalMap = normalColor.xyz * 2.0 - 1.0;
              normalMap.xy *= normalScale;
              
              vec3 finalNormal = normalize(normal + vec3(normalMap.x, normalMap.y, normalMap.z));
              
              float lightIntensity = max(0.1, dot(finalNormal, sunDir));
              
              vec4 dayColor = texture2D(dayTexture, vUv);
              vec4 specColor = texture2D(specularTexture, vUv);
              
              float specularIntensity = specColor.r;
              
              vec3 viewDirection = normalize(vViewPosition);
              vec3 halfVector = normalize(sunDir + viewDirection);
              float specularFactor = max(0.0, dot(finalNormal, halfVector));
              float specularValue = pow(specularFactor, 30.0) * specularIntensity;
              
              float dayFactor = smoothstep(-0.1, 0.1, dot(finalNormal, sunDir));
              
              vec3 diffuseColor = dayColor.rgb * (lightIntensity * 1.5);
              vec3 highlightColor = vec3(1.0, 0.98, 0.9) * specularValue;
              
              vec3 finalColor = diffuseColor + highlightColor;
              
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `,
        });
      } else if (planet.name === "Saturn" && planet.saturnRealistic) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            baseColor: { value: new THREE.Color(planet.color) },
            emissiveColor: {
              value: new THREE.Color(planet.emissive || 0x000000),
            },
            time: { value: 0 },
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
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float hash(vec3 p) {
              p = fract(p * vec3(443.8975, 397.2973, 491.1871));
              p += dot(p.zxy, p.yxz + 19.27);
              return fract(p.x * p.y * p.z);
            }
            
            float noise(vec3 p) {
              vec3 i = floor(p);
              vec3 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              
              float a = hash(i);
              float b = hash(i + vec3(1.0, 0.0, 0.0));
              float c = hash(i + vec3(0.0, 1.0, 0.0));
              float d = hash(i + vec3(1.0, 1.0, 0.0));
              float e = hash(i + vec3(0.0, 0.0, 1.0));
              float f2 = hash(i + vec3(1.0, 0.0, 1.0));
              float g = hash(i + vec3(0.0, 1.0, 1.0));
              float h = hash(i + vec3(1.0, 1.0, 1.0));
              
              return mix(
                mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
                mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
                f.z
              );
            }
            
            float fbm(vec3 p) {
              float value = 0.0;
              float amplitude = 0.5;
              float frequency = 1.0;
              
              for (int i = 0; i < 6; i++) {
                value += amplitude * noise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
              }
              
              return value;
            }
            
            void main() {
              vec3 nPos = normalize(vPosition);
              float lat = asin(nPos.y);
              float lon = atan(nPos.z, nPos.x);
              
              vec3 saturnBase = vec3(0.92, 0.87, 0.67);
              vec3 bandLight = vec3(0.96, 0.90, 0.72);
              vec3 bandDark = vec3(0.82, 0.73, 0.52);
              vec3 stormColor = vec3(0.98, 0.95, 0.82);
              vec3 shadowColor = vec3(0.65, 0.60, 0.45);
              
              float bandPattern = sin(lat * 14.0 + fbm(vec3(lon * 2.0, lat * 20.0, time * 0.05)) * 1.5);
              bandPattern = bandPattern * 0.5 + 0.5;
              
              bandPattern = mix(0.4, bandPattern, 0.6);
              
              float cloudDetail = fbm(vec3(lon * 4.0 + time * 0.02, lat * 10.0, time * 0.01));
              cloudDetail = cloudDetail * 0.5 + 0.5;
              
              float latFactor = cos(lat * 2.0);
              float flowSpeed = 0.03 * latFactor;
              float flowPattern = fbm(vec3(lon * 5.0 + time * flowSpeed, lat * 15.0, time * 0.01));
              
              float northPole = smoothstep(0.75, 0.95, lat);
              
              float hexFactor = 6.0;
              float hexAngle = atan(nPos.z, nPos.x);
              float hexPattern = cos(hexAngle * hexFactor + time * 0.1);
              hexPattern = smoothstep(0.0, 0.2, hexPattern) * northPole;
              
              float southPole = smoothstep(0.75, 0.95, -lat);
              float vortex = fbm(vec3(lon * 3.0 + time * 0.05, -lat * 5.0, time * 0.01)) * southPole;
              
              float storm1 = smoothstep(0.12, 0.05, length(vec2(lon - 1.5, (lat - 0.3) * 2.0)));
              float storm2 = smoothstep(0.10, 0.04, length(vec2(lon - 3.0, (lat + 0.4) * 1.8)));
              float allStorms = max(storm1, storm2);
              
              float ringShadow = 0.0;
              
              float tiltFactor = 0.47;
              
              float shadowY = nPos.y / tan(tiltFactor);
              float shadowX = nPos.x;
              float shadowZ = nPos.z;
              
              float shadowDist = sqrt(shadowX * shadowX + shadowZ * shadowZ);
              
              float innerShadow = smoothstep(0.8, 0.85, shadowDist);
              float outerShadow = 1.0 - smoothstep(1.3, 1.4, shadowDist);
              
              float equatorFactor = 1.0 - abs(lat) * 2.0;
              equatorFactor = max(0.0, equatorFactor);
              
              ringShadow = max(0.0, innerShadow * outerShadow * equatorFactor * 0.5);
              
              vec3 saturnColor = saturnBase;
              
              saturnColor = mix(bandDark, bandLight, bandPattern * cloudDetail);
              
              saturnColor = mix(saturnColor, mix(bandLight, bandDark, 0.5), cloudDetail * 0.3);
              
              saturnColor = mix(saturnColor, mix(bandLight, saturnColor, 0.7), flowPattern * 0.2);
              
              saturnColor = mix(saturnColor, mix(bandDark, bandLight, hexPattern), hexPattern * 0.3);
              
              saturnColor = mix(saturnColor, bandDark, vortex * 0.4);
              
              saturnColor = mix(saturnColor, stormColor, allStorms * 0.5);
              
              float detailNoise = fbm(vec3(lon * 30.0, lat * 40.0, time * 0.01));
              saturnColor = mix(saturnColor, mix(bandLight, bandDark, detailNoise), detailNoise * 0.1);
              
              saturnColor = mix(saturnColor, shadowColor, ringShadow);
              
              float limb = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
              saturnColor = mix(saturnColor, mix(bandDark, saturnBase, 0.5), limb * 0.4);
              
              float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.0);
              saturnColor += rim * vec3(0.8, 0.7, 0.5) * 0.2;
              
              float lightFactor = max(0.2, dot(vNormal, vec3(0.0, 0.0, 1.0)));
              saturnColor *= lightFactor * 1.3;
              
              saturnColor += emissiveColor * 0.12;
              
              gl_FragColor = vec4(saturnColor, 1.0);
            }
          `,
        });
      } else if (planet.name === "Jupiter" && planet.jupiterRealistic) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            baseColor: { value: new THREE.Color(planet.color) },
            emissiveColor: {
              value: new THREE.Color(planet.emissive || 0x000000),
            },
            time: { value: 0 },
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
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float hash(vec3 p) {
              p = fract(p * vec3(443.8975, 397.2973, 491.1871));
              p += dot(p.zxy, p.yxz + 19.27);
              return fract(p.x * p.y * p.z);
            }
            
            float noise(vec3 p) {
              vec3 i = floor(p);
              vec3 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              
              float a = hash(i);
              float b = hash(i + vec3(1.0, 0.0, 0.0));
              float c = hash(i + vec3(0.0, 1.0, 0.0));
              float d = hash(i + vec3(1.0, 1.0, 0.0));
              float e = hash(i + vec3(0.0, 0.0, 1.0));
              float f2 = hash(i + vec3(1.0, 0.0, 1.0));
              float g = hash(i + vec3(0.0, 1.0, 1.0));
              float h = hash(i + vec3(1.0, 1.0, 1.0));
              
              return mix(
                mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
                mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
                f.z
              );
            }
            
            float fbm(vec3 p) {
              float value = 0.0;
              float amplitude = 0.5;
              float frequency = 1.0;
              
              for (int i = 0; i < 6; i++) {
                value += amplitude * noise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
              }
              
              return value;
            }
            
            float voronoi(vec3 p) {
              vec3 b, r, g = floor(p);
              p = fract(p);
              float d = 1.0;
              
              for(int j = -1; j <= 1; j++) {
                for(int i = -1; i <= 1; i++) {
                  for(int k = -1; k <= 1; k++) {
                    b = vec3(float(i), float(j), float(k));
                    r = b - p + hash(g + b);
                    d = min(d, dot(r, r));
                  }
                }
              }
              
              return sqrt(d);
            }
            
            void main() {
              vec3 nPos = normalize(vPosition);
              float lat = asin(nPos.y);
              float lon = atan(nPos.z, nPos.x);
              
              vec3 darkBrown = vec3(0.48, 0.29, 0.15);
              vec3 mediumBrown = vec3(0.65, 0.45, 0.25);
              vec3 orangeTan = vec3(0.82, 0.58, 0.35);
              vec3 creamColor = vec3(0.92, 0.80, 0.55);
              vec3 redspotDark = vec3(0.72, 0.25, 0.12);
              vec3 redspotLight = vec3(0.85, 0.35, 0.15);
              vec3 stormWhite = vec3(0.95, 0.93, 0.85);
              
              float equator = smoothstep(0.05, -0.05, abs(lat));
              
              float NEB = smoothstep(0.15, 0.05, lat) - equator;
              float NTB = smoothstep(0.35, 0.25, lat) - smoothstep(0.45, 0.35, lat);
              float NNTB = smoothstep(0.6, 0.5, lat) - smoothstep(0.7, 0.6, lat);
              
              float SEB = smoothstep(0.05, 0.15, -lat) - equator;
              float STB = smoothstep(0.25, 0.35, -lat) - smoothstep(0.35, 0.45, -lat);
              float SSTB = smoothstep(0.5, 0.6, -lat) - smoothstep(0.6, 0.7, -lat);
              
              float timeScale = time * 0.1;
              float NEBflow = fbm(vec3(lon * 3.0 + timeScale * 0.3, lat * 30.0, timeScale * 0.5)) * NEB;
              float SEBflow = fbm(vec3(lon * 4.0 - timeScale * 0.4, lat * 35.0, timeScale * 0.6)) * SEB;
              float NTBflow = fbm(vec3(lon * 2.5 + timeScale * 0.2, lat * 25.0, timeScale * 0.3)) * NTB;
              float STBflow = fbm(vec3(lon * 3.5 - timeScale * 0.25, lat * 28.0, timeScale * 0.4)) * STB;
              
              float equatorTurbulence = fbm(vec3(lon * 6.0 + timeScale, lat * 50.0, timeScale * 0.1)) * 0.7 * equator;
              float NEBturbulence = fbm(vec3(lon * 8.0 + timeScale * 0.7, lat * 60.0, timeScale * 0.2)) * 0.8 * NEB;
              float SEBturbulence = fbm(vec3(lon * 9.0 - timeScale * 0.8, lat * 65.0, timeScale * 0.3)) * 0.8 * SEB;
              
              float grsLon = 0.6 + timeScale * 0.03;
              float grsLat = -0.22;
              
              vec2 grsPos = vec2(lon - grsLon, (lat - grsLat) * 2.5);
              float grsDistance = length(grsPos);
              
              float grsCore = smoothstep(0.35, 0.05, grsDistance);
              float grsEdge = smoothstep(0.45, 0.35, grsDistance) - grsCore;
              float grsOuter = smoothstep(0.55, 0.45, grsDistance) - grsEdge - grsCore;
              
              float grsDetail = fbm(vec3(
                grsPos.x * 10.0 + time * 0.05, 
                grsPos.y * 10.0, 
                time * 0.05
              )) * grsCore * 0.5;
              
              float oval1 = smoothstep(0.15, 0.05, length(vec2(lon - 2.3, (lat - 0.35) * 2.0)));
              float oval2 = smoothstep(0.12, 0.04, length(vec2(lon - (3.5 + sin(time * 0.1) * 0.2), (lat + 0.28) * 1.8)));
              float oval3 = smoothstep(0.14, 0.05, length(vec2(lon - 1.7, (lat - 0.4) * 1.9)));
              
              float allOvals = max(oval1, max(oval2, oval3));
              
              float smallVortices = 0.0;
              for (int i = 0; i < 8; i++) {
                float idx = float(i);
                float vortexLon = idx * 0.8 + sin(idx * 0.7 + time * 0.1) * 0.3;
                float vortexLat = mix(0.4, -0.4, fract(idx * 0.27)) + sin(idx * 0.9) * 0.1;
                float vortexSize = mix(0.03, 0.08, fract(idx * 0.543));
                
                smallVortices = max(
                  smallVortices, 
                  smoothstep(vortexSize, vortexSize * 0.4, length(vec2(lon - vortexLon, (lat - vortexLat) * 1.5)))
                );
              }
              
              float cellPattern = voronoi(vec3(lon * 20.0, lat * 20.0, time * 0.02));
              cellPattern = smoothstep(0.0, 0.3, cellPattern);
              
              float detailNoise = fbm(vec3(lon * 30.0, lat * 30.0, time * 0.01));
              
              vec3 jupiterColor = orangeTan;
              
              jupiterColor = mix(jupiterColor, darkBrown, NEB * 0.8);
              jupiterColor = mix(jupiterColor, darkBrown, SEB * 0.7);
              jupiterColor = mix(jupiterColor, mediumBrown, NTB * 0.7);
              jupiterColor = mix(jupiterColor, mediumBrown, STB * 0.7);
              jupiterColor = mix(jupiterColor, mediumBrown, NNTB * 0.6);
              jupiterColor = mix(jupiterColor, mediumBrown, SSTB * 0.6);
              
              jupiterColor = mix(jupiterColor, creamColor, equator * 0.4);
              
              jupiterColor = mix(jupiterColor, darkBrown, NEBflow * 0.3);
              jupiterColor = mix(jupiterColor, darkBrown, SEBflow * 0.3);
              jupiterColor = mix(jupiterColor, mix(darkBrown, orangeTan, 0.5), NTBflow * 0.2);
              jupiterColor = mix(jupiterColor, mix(darkBrown, orangeTan, 0.5), STBflow * 0.2);
              
              jupiterColor = mix(jupiterColor, orangeTan, equatorTurbulence * 0.5);
              jupiterColor = mix(jupiterColor, darkBrown, NEBturbulence * 0.5);
              jupiterColor = mix(jupiterColor, darkBrown, SEBturbulence * 0.5);
              
              jupiterColor = mix(jupiterColor, redspotDark, grsCore * 0.85);
              jupiterColor = mix(jupiterColor, redspotLight, grsEdge * 0.7);
              jupiterColor = mix(jupiterColor, mix(redspotLight, orangeTan, 0.6), grsOuter * 0.5);
              jupiterColor = mix(jupiterColor, vec3(0.85, 0.3, 0.1), grsDetail);
              
              jupiterColor = mix(jupiterColor, stormWhite, allOvals * 0.75);
              
              jupiterColor = mix(jupiterColor, stormWhite, smallVortices * 0.6);
              
              jupiterColor = mix(jupiterColor, creamColor, cellPattern * 0.15);
              
              jupiterColor = mix(jupiterColor, mix(orangeTan, darkBrown, 0.5), detailNoise * 0.15);
              
              float northPole = smoothstep(0.7, 0.85, lat);
              float southPole = smoothstep(0.7, 0.85, -lat);
              vec3 polarColor = mix(mediumBrown, darkBrown, 0.7);
              jupiterColor = mix(jupiterColor, polarColor, northPole);
              jupiterColor = mix(jupiterColor, polarColor, southPole);
              
              float limb = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.0);
              jupiterColor = mix(jupiterColor, mix(orangeTan, darkBrown, 0.5), limb * 0.5);
              
              float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
              jupiterColor += rim * vec3(0.7, 0.5, 0.3) * 0.3;
              
              jupiterColor += emissiveColor * 0.1;
              
              float lightFactor = max(0.2, dot(vNormal, vec3(0.0, 0.0, 1.0)));
              jupiterColor *= lightFactor * 1.4;
              
              gl_FragColor = vec4(jupiterColor, 1.0);
            }
          `,
        });
      } else if (planet.bands && !isLowPerformance) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            baseColor: { value: new THREE.Color(planet.color) },
            emissiveColor: {
              value: new THREE.Color(planet.emissive || 0x000000),
            },
            time: { value: 0 },
            roughness: { value: planet.roughness || 0.7 },
            metalness: { value: planet.metalness || 0.1 },
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
          `,
        });
      } else if (planet.name === "Mars" && planet.customShader) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(0xf67c3c) },
            polarColor: { value: new THREE.Color(0xffffff) },
            highlightColor: { value: new THREE.Color(0xe8c9a0) },
            lowlandColor: { value: new THREE.Color(0xba5536) },
            emissiveColor: { value: new THREE.Color(0x522b1a) },
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
            uniform float time;
            uniform vec3 baseColor;
            uniform vec3 polarColor;
            uniform vec3 highlightColor;
            uniform vec3 lowlandColor;
            uniform vec3 emissiveColor;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            // Perlin-like noise function for terrain features
            float hash(vec3 p) {
              p = fract(p * vec3(443.8975, 397.2973, 491.1871));
              p += dot(p.zxy, p.yxz + 19.27);
              return fract(p.x * p.y * p.z);
            }
            
            float noise(vec3 p) {
              vec3 i = floor(p);
              vec3 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              
              float a = hash(i);
              float b = hash(i + vec3(1.0, 0.0, 0.0));
              float c = hash(i + vec3(0.0, 1.0, 0.0));
              float d = hash(i + vec3(1.0, 1.0, 0.0));
              float e = hash(i + vec3(0.0, 0.0, 1.0));
              float f2 = hash(i + vec3(1.0, 0.0, 1.0));
              float g = hash(i + vec3(0.0, 1.0, 1.0));
              float h = hash(i + vec3(1.0, 1.0, 1.0));
              
              return mix(
                mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
                mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
                f.z
              );
            }
            
            // FBM (Fractal Brownian Motion) for realistic terrain
            float fbm(vec3 p) {
              float value = 0.0;
              float amplitude = 0.5;
              float frequency = 1.0;
              
              for (int i = 0; i < 4; i++) {
                value += amplitude * noise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
              }
              
              return value;
            }
            
            void main() {
              // Basic lighting
              vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
              float lightIntensity = max(0.2, dot(vNormal, lightDir));
              
              // Create polar ice caps
              float polarCap = smoothstep(0.85, 0.95, abs(vPosition.y / length(vPosition)));
              
              // Generate surface features
              float elevation = fbm(vPosition * 3.0 + vec3(time * 0.1)); // Slow rotation
              
              // Olympus Mons - large volcano
              float olympusDist = length(vec2(vUv.x - 0.4, vUv.y - 0.55) * 2.0);
              float olympus = smoothstep(0.2, 0.5, olympusDist);
              
              // Valles Marineris - large canyon system
              float vallesY = abs(vUv.y - 0.5) * 20.0;
              float vallesX = mod(vUv.x + time * 0.01, 1.0);
              float valles = smoothstep(0.0, 0.1, vallesY) * step(0.35, vallesX) * step(vallesX, 0.65);
              
              // Combine features
              vec3 surfaceColor = mix(lowlandColor, baseColor, elevation);
              surfaceColor = mix(surfaceColor, highlightColor, (1.0 - olympus) * 0.6);
              surfaceColor = mix(surfaceColor, lowlandColor * 0.8, (1.0 - valles) * 0.3);
              
              // Add dust storms that move over time
              float dustStorm = fbm(vec3(vUv * 10.0, time * 0.1));
              surfaceColor = mix(surfaceColor, vec3(0.9, 0.7, 0.5), dustStorm * 0.15);
              
              // Mix in polar caps
              surfaceColor = mix(surfaceColor, polarColor, polarCap);
              
              // Apply lighting
              vec3 finalColor = surfaceColor * lightIntensity;
              finalColor += emissiveColor * 0.15;
              
              // Add subtle atmospheric edge glow
              float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
              finalColor = mix(finalColor, vec3(0.9, 0.6, 0.5), pow(rim, 4.0) * 0.3);
              
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `,
        });
      } else if (planet.name === "Venus" && planet.customShader) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            resolution: { value: new THREE.Vector2(1024, 1024) },
            baseColor: { value: new THREE.Color(0xf5e79b) },
            cloudColor1: { value: new THREE.Color(0xf0d9a2) },
            cloudColor2: { value: new THREE.Color(0xebd293) },
            cloudColor3: { value: new THREE.Color(0xd1ba7d) },
            emissiveColor: { value: new THREE.Color(0x3a2f1a) },
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
            uniform float time;
            uniform vec2 resolution;
            uniform vec3 baseColor;
            uniform vec3 cloudColor1;
            uniform vec3 cloudColor2;
            uniform vec3 cloudColor3;
            uniform vec3 emissiveColor;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              
              return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            float fbm(vec2 p) {
              float value = 0.0;
              float amplitude = 0.5;
              float frequency = 1.0;
              
              for (int i = 0; i < 6; i++) {
                value += amplitude * noise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
              }
              
              return value;
            }
            
            void main() {
              vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
              float light = max(0.2, dot(vNormal, lightDir));
              
              float lat = asin(vPosition.y / length(vPosition));
              float lon = atan(vPosition.z, vPosition.x);
              
              vec2 cloudCoord1 = vec2(lon + time * 0.03, lat);
              vec2 cloudCoord2 = vec2(lon - time * 0.015, lat + time * 0.02);
              vec2 cloudCoord3 = vec2(lon + time * 0.02, lat - time * 0.01);
              
              float cloudPattern1 = fbm(cloudCoord1 * 2.0);
              float cloudPattern2 = fbm(cloudCoord2 * 4.0 + vec2(100.0, 100.0));
              float cloudPattern3 = fbm(cloudCoord3 * 6.0 + vec2(300.0, 200.0));
              
              float yBands = sin(lat * 10.0 + cloudPattern1 * 2.0) * 0.5 + 0.5;
              
              float vortex1 = length(vec2(lon, lat * 3.0) - vec2(0.5, 0.7)) * 2.0;
              float vortex2 = length(vec2(lon + time * 0.02, lat * 2.0) - vec2(2.0, -0.5)) * 3.0;
              
              float vortexPattern1 = smoothstep(0.5, 1.5, vortex1);
              float vortexPattern2 = smoothstep(0.4, 1.2, vortex2);
              
              float cloudDensity = cloudPattern1 * 0.5 + cloudPattern2 * 0.3 + cloudPattern3 * 0.2;
              cloudDensity = cloudDensity * (0.8 + yBands * 0.4) * vortexPattern1 * vortexPattern2;
              
              vec3 cloudColor = mix(cloudColor1, cloudColor2, cloudPattern1);
              cloudColor = mix(cloudColor, cloudColor3, cloudPattern2 * cloudPattern3);
              
              vec3 surfaceColor = mix(baseColor, cloudColor, cloudDensity);
              
              float equatorHighlight = pow(cos(lat), 4.0) * 0.1;
              surfaceColor += vec3(equatorHighlight);
              
              float rimLight = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0) * 0.3;
              vec3 rimColor = mix(vec3(1.0, 0.95, 0.8), vec3(0.9, 0.7, 0.3), cloudDensity);
              
              vec3 finalColor = surfaceColor * light * (1.0 + rimLight * rimColor);
              finalColor += emissiveColor * 0.2;
              
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `,
        });
      } else if (planet.name === "Neptune" && planet.customShader) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(0x2b5dfe) },
            darkColor: { value: new THREE.Color(0x1a3a8c) },
            brightColor: { value: new THREE.Color(0x6fa3fa) },
            spotColor: { value: new THREE.Color(0x173777) },
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
            uniform float time;
            uniform vec3 baseColor;
            uniform vec3 darkColor;
            uniform vec3 brightColor;
            uniform vec3 spotColor;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                         mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }
            
            float fbm(vec2 p) {
              float value = 0.0;
              float amplitude = 0.5;
              float frequency = 1.0;
              for (int i = 0; i < 6; i++) {
                value += amplitude * noise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
              }
              return value;
            }
            
            void main() {
              vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
              float light = max(0.3, dot(vNormal, lightDir));
              
              vec3 normalizedPos = normalize(vPosition);
              float lat = asin(normalizedPos.y);
              float lon = atan(normalizedPos.z, normalizedPos.x);
              
              // Create bands with varying speeds based on latitude
              float bandSpeed = cos(lat * 2.0) * 2.0;
              vec2 windOffset = vec2(time * 0.02 * bandSpeed, 0.0);
              
              // Create cloud bands
              float bandPattern = sin(lat * 20.0 + time * 0.1) * 0.5 + 0.5;
              bandPattern *= sin(lat * 10.0 - time * 0.05) * 0.5 + 0.5;
              
              // Cloud patterns with different speeds per latitude
              vec2 cloudUV = vec2(lon * 0.1, lat * 0.5) + windOffset;
              float cloudPattern1 = fbm(cloudUV * 5.0 + vec2(time * 0.03, 0.0));
              float cloudPattern2 = fbm(cloudUV * 10.0 - vec2(time * 0.02, 0.0));
              float cloudPattern3 = fbm(cloudUV * 20.0 + vec2(0.0, time * 0.01));
              
              float cloudMix = cloudPattern1 * 0.6 + cloudPattern2 * 0.3 + cloudPattern3 * 0.1;
              cloudMix = cloudMix * 0.8 + 0.2;
              
              // Create the Great Dark Spot
              float spotDist = length(vec2(lon, lat * 2.0) - vec2(0.4 + sin(time * 0.1) * 0.1, 0.2));
              float darkSpot = smoothstep(0.5, 0.1, spotDist);
              
              // Create smaller atmospheric storms
              float storm1 = smoothstep(0.3, 0.05, length(vec2(lon, lat * 2.0) - vec2(-0.8, -0.3)));
              float storm2 = smoothstep(0.2, 0.05, length(vec2(lon, lat * 2.0) - vec2(1.2, 0.5)));
              
              // Combine cloud features
              float stormFeatures = max(darkSpot, max(storm1, storm2));
              
              // Create atmospheric bands with turbulence
              float bandY = lat * 10.0;
              float turbulence = fbm(vec2(lon * 3.0 + time * 0.05, bandY));
              float bands = sin(bandY + turbulence * 2.0) * 0.5 + 0.5;
              
              // Combine all atmospheric features
              float mixFactor = cloudMix * (0.8 + bands * 0.4);
              
              // Color the planet based on features
              vec3 cloudColor = mix(baseColor, brightColor, cloudMix);
              vec3 bandColor = mix(baseColor, darkColor, bands * 0.5);
              vec3 surfaceColor = mix(bandColor, cloudColor, mixFactor);
              
              // Apply storm coloration
              surfaceColor = mix(surfaceColor, spotColor, darkSpot * 0.7);
              surfaceColor = mix(surfaceColor, brightColor, storm1 * 0.3);
              surfaceColor = mix(surfaceColor, brightColor, storm2 * 0.3);
              
              // Apply lighting
              vec3 finalColor = surfaceColor * light;
              
              // Add bright limb (edge) effects
              float limb = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.0);
              finalColor += limb * vec3(0.3, 0.5, 0.8) * 0.3;
              
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `,
        });
      } else if (planet.name === "Uranus" && planet.customShader) {
        planetMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(0x4be2ee) },
            atmosphereColor: { value: new THREE.Color(0x9af6ff) },
            polarColor: { value: new THREE.Color(0x73d0d8) },
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
            uniform float time;
            uniform vec3 baseColor;
            uniform vec3 atmosphereColor;
            uniform vec3 polarColor;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                         mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }
            
            float fbm(vec2 p) {
              float value = 0.0;
              float amplitude = 0.5;
              float frequency = 1.0;
              for (int i = 0; i < 5; i++) {
                value += amplitude * noise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
              }
              return value;
            }
            
            void main() {
              vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
              float light = max(0.3, dot(vNormal, lightDir));
              
              vec3 normalizedPos = normalize(vPosition);
              float lat = asin(normalizedPos.y);
              float lon = atan(normalizedPos.z, normalizedPos.x);
              
              // Create subtle bands (Uranus has very faint bands compared to other gas giants)
              float bandY = lat * 8.0;
              float bandNoise = fbm(vec2(lon * 2.0 + time * 0.01, bandY * 0.5)) * 0.1;
              float bands = sin(bandY + bandNoise) * 0.5 + 0.5;
              bands = pow(bands, 2.0) * 0.15; // Make bands very subtle
              
              // Create polar regions with slightly different coloration
              float polarRegion = smoothstep(0.6, 0.8, abs(lat) / 1.57);
              
              // Create extremely subtle cloud features
              float cloudPattern1 = fbm(vec2(lon * 3.0 + time * 0.003, lat * 2.0)) * 0.05;
              float cloudPattern2 = fbm(vec2(lon * 5.0 - time * 0.002, lat * 3.0 + time * 0.001)) * 0.03;
              
              // Create occasional discrete clouds (extremely rare on Uranus)
              float discreteCloud = 0.0;
              if (fbm(vec2(lon * 10.0, lat * 5.0 + time * 0.05)) > 0.75) {
                vec2 cloudPos = vec2(
                  hash(vec2(floor(time * 0.01), 1.0)) * 2.0 - 1.0,
                  hash(vec2(floor(time * 0.01), 2.0)) * 2.0 - 1.0
                );
                float cloudDist = length(vec2(lon, lat * 2.0) - cloudPos);
                discreteCloud = smoothstep(0.4, 0.1, cloudDist) * 0.08;
              }
              
              // Create seasonal variation based on the extreme axial tilt
              float season = sin(time * 0.1) * 0.5 + 0.5; // Full seasonal cycle
              float seasonalVariation = mix(1.0, 1.1, season * polarRegion);
              
              // Combine all features
              vec3 surfaceColor = mix(baseColor, atmosphereColor, bands + cloudPattern1 + cloudPattern2);
              surfaceColor = mix(surfaceColor, polarColor, polarRegion * 0.3);
              surfaceColor = mix(surfaceColor, atmosphereColor * 1.1, discreteCloud);
              surfaceColor *= seasonalVariation;
              
              // Apply lighting
              vec3 finalColor = surfaceColor * light;
              
              // Add limb darkening and subtle atmospheric haze
              float limb = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
              finalColor = mix(finalColor, atmosphereColor * 0.8, limb * 0.2);
              
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `,
        });
      } else {
        planetMaterial = new THREE.MeshStandardMaterial({
          color: planet.color,
          roughness: planet.roughness || 0.7,
          metalness: planet.metalness || 0.1,
          emissive: new THREE.Color(planet.emissive || 0x000000),
          emissiveIntensity: 0.4,
          flatShading: false,
          envMapIntensity: 0.9,
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

      if (planet.name === "Earth" && planet.textured) {
        const cloudGeometry = new THREE.SphereGeometry(
          planet.radius * 1.02,
          planetSegments,
          planetSegments
        );
        const cloudMaterial = new THREE.MeshStandardMaterial({
          map: earthTextures.cloudmap,
          transparent: true,
          opacity: 0.8,
          alphaMap: earthTextures.cloudmap,
          blending: THREE.CustomBlending,
          blendSrc: THREE.OneFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        });

        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        planetMesh.add(cloudMesh);

        const nightGeometry = new THREE.SphereGeometry(
          planet.radius * 1.001,
          planetSegments,
          planetSegments
        );
        const nightMaterial = new THREE.ShaderMaterial({
          uniforms: {
            nightTexture: { value: earthTextures.nightmap },
            sunDirection: { value: new THREE.Vector3(0, 0, 0) },
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vSunDir;
            uniform vec3 sunDirection;
            
            void main() {
              vUv = uv;
              vNormal = normalize(normalMatrix * normal);
              vSunDir = normalize(sunDirection);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D nightTexture;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vSunDir;
            
            void main() {
              float cosAngle = dot(vNormal, vSunDir);
              
              float twilightZone = smoothstep(-0.3, 0.0, cosAngle);
              float nightZone = 1.0 - twilightZone;
              
              vec3 nightColor = texture2D(nightTexture, vUv).rgb;
              
              float intensity = nightZone * (1.0 + abs(cosAngle) * 0.5);
              
              gl_FragColor = vec4(nightColor * intensity, intensity * 0.9);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
        });

        const nightMesh = new THREE.Mesh(nightGeometry, nightMaterial);
        planetMesh.add(nightMesh);

        planetMesh.userData.cloudMesh = cloudMesh;
        planetMesh.userData.nightMesh = nightMesh;
      }

      if (planet.atmosphere) {
        const atmosphereGeometry = new THREE.SphereGeometry(
          planet.radius * 1.1,
          planetSegments,
          planetSegments
        );

        if (planet.name === "Earth" && !isLowPerformance) {
          const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
              sunPosition: { value: new THREE.Vector3(0, 0, 0) },
              atmosphereColor: {
                value: new THREE.Color(planet.atmosphereColor || 0x0088ff),
              },
              time: { value: 0 },
            },
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vPosition;
              varying vec2 vUv;
              
              void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 sunPosition;
              uniform vec3 atmosphereColor;
              uniform float time;
              varying vec3 vNormal;
              varying vec3 vPosition;
              varying vec2 vUv;
              
              void main() {
                vec3 sunDir = normalize(sunPosition);
                float cosAngle = dot(vNormal, normalize(sunDir));
                
                // Scattering effect - stronger at grazing angles (Rayleigh scattering)
                float scatteringFactor = pow(1.0 - abs(cosAngle), 5.0) * 0.8 + 0.2;
                
                // Edge glow
                float edgeGlow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                
                // Cloud-like variations
                float clouds = sin(vUv.y * 15.0 + time * 0.1) * sin(vUv.x * 15.0 + time * 0.15) * 0.1;
                
                // Combine effects
                vec3 finalColor = mix(atmosphereColor, vec3(1.0, 1.0, 1.0), scatteringFactor * 0.5);
                
                // Create a subtle blue shadow on the dark side
                if (cosAngle < 0.0) {
                  finalColor = mix(finalColor, vec3(0.1, 0.1, 0.3), -cosAngle * 0.5);
                }
                
                // Add subtle time variation
                float timePulse = sin(time * 0.5) * 0.05 + 0.95;
                
                float alpha = (edgeGlow + clouds) * 0.6 * timePulse;
                
                gl_FragColor = vec4(finalColor, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          });

          const atmosphere = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial
          );
          planetMesh.add(atmosphere);
        } else if (planet.name === "Mars") {
          const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
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
              uniform float time;
              varying vec3 vNormal;
              varying vec2 vUv;
              
              void main() {
                // Martian atmosphere is very thin
                float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                
                // Create subtle dust storm patterns
                float storm = sin(vUv.x * 20.0 + time * 0.3) * sin(vUv.y * 20.0 + time * 0.2) * 0.5 + 0.5;
                float stormPattern = sin(vUv.x * 15.0 - time * 0.1) * sin(vUv.y * 15.0 + time * 0.2) * 0.5 + 0.5;
                
                // Martian orange-pink atmospheric color
                vec3 atmosphereColor = vec3(0.9, 0.6, 0.5);
                vec3 stormColor = vec3(0.8, 0.7, 0.5);
                
                vec3 finalColor = mix(atmosphereColor, stormColor, storm * stormPattern * 0.3);
                
                // Very thin atmosphere - almost transparent
                float alpha = intensity * 0.3 * storm;
                
                gl_FragColor = vec4(finalColor, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          });
          const atmosphere = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial
          );
          planetMesh.add(atmosphere);
        } else if (planet.name === "Venus") {
          const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
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
              uniform float time;
              varying vec3 vNormal;
              varying vec2 vUv;
              
              float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
              }
              
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
              }
              
              float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for (int i = 0; i < 4; i++) {
                  value += amplitude * noise(p * frequency);
                  amplitude *= 0.5;
                  frequency *= 2.0;
                }
                
                return value;
              }
              
              void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 1.7);
                
                vec2 cloudCoord = vUv * 4.0 + vec2(time * 0.02, time * 0.01);
                float cloudPattern = fbm(cloudCoord);
                
                vec2 swirls = vUv * 8.0 - vec2(time * 0.01, 0.0);
                float swirlPattern = fbm(swirls) * 0.5 + 0.5;
                
                float patternMix = cloudPattern * swirlPattern;
                
                vec3 yellowColor = vec3(0.95, 0.85, 0.55);
                vec3 orangeColor = vec3(0.9, 0.7, 0.4);
                
                vec3 atmosphereColor = mix(yellowColor, orangeColor, patternMix);
                
                float pulse = 0.95 + sin(time * 0.5) * 0.05;
                float alpha = intensity * (0.6 + patternMix * 0.2) * pulse;
                
                gl_FragColor = vec4(atmosphereColor, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          });

          const atmosphere = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial
          );
          planetMesh.add(atmosphere);

          const outerAtmosphereGeometry = new THREE.SphereGeometry(
            planet.radius * 1.18,
            planetSegments,
            planetSegments
          );

          const outerAtmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
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
              uniform float time;
              varying vec3 vNormal;
              varying vec2 vUv;
              
              float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
              }
              
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
              }
              
              void main() {
                float intensity = pow(0.4 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
                
                vec2 cloudCoord = vUv * 3.0 + vec2(time * 0.01, 0.0);
                float cloudPattern = noise(cloudCoord) * 0.5 + 0.5;
                
                vec3 yellowColor = vec3(0.92, 0.8, 0.5);
                float alpha = intensity * cloudPattern * 0.35;
                
                gl_FragColor = vec4(yellowColor, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
          });

          const outerAtmosphere = new THREE.Mesh(
            outerAtmosphereGeometry,
            outerAtmosphereMaterial
          );
          planetMesh.add(outerAtmosphere);
        } else if (!isLowPerformance) {
          const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
              atmosphereColor: {
                value: new THREE.Color(planet.atmosphereColor || 0x0088ff),
              },
              glowColor: {
                value: new THREE.Color(
                  planet.atmosphereColor || 0x0088ff
                ).multiplyScalar(1.6),
              },
              time: { value: 0 },
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
            side: THREE.BackSide,
          });
          const atmosphere = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial
          );
          planetMesh.add(atmosphere);
        } else {
          const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: planet.atmosphereColor || 0x0088ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
          });
          const atmosphere = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial
          );
          planetMesh.add(atmosphere);
        }
      }

      planets[planet.name] = {
        mesh: planetMesh,
        container: planetContainer,
        data: planet,
        angle: angle,
      };

      const planetMoons = [];
      if (planet.moons && planet.moons.length > 0) {
        planet.moons.forEach((moon) => {
          const moonGeometry = new THREE.SphereGeometry(
            moon.radius,
            planetSegments / 2,
            planetSegments / 2
          );

          let moonMaterial;

          if (
            planet.name === "Earth" &&
            moon.name === "Moon" &&
            moon.textured
          ) {
            const moonTexture = earthTextures.moonmap;
            moonMaterial = new THREE.MeshStandardMaterial({
              map: moonTexture,
              normalMap: moonTexture,
              normalScale: new THREE.Vector2(0.5, 0.5),
              roughness: 0.85,
              metalness: 0.0,
              bumpMap: moonTexture,
              bumpScale: 0.02,
            });
          } else {
            moonMaterial = new THREE.MeshStandardMaterial({
              color: moon.color,
              roughness: 0.7,
              metalness: 0.2,
              emissive: new THREE.Color(moon.emissive || 0x222222),
              emissiveIntensity: 0.3,
              flatShading: false,
            });
          }

          const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);

          const moonOrbitGeometry = new THREE.RingGeometry(
            moon.distance - 0.1,
            moon.distance + 0.1,
            isLowPerformance ? 32 : 64
          );
          const moonOrbitMaterial = createOrbitMaterial(0x70a0ff);
          const moonOrbit = new THREE.Mesh(
            moonOrbitGeometry,
            moonOrbitMaterial
          );
          moonOrbit.rotation.x = Math.PI / 2;

          planetMesh.add(moonOrbit);
          planetMesh.add(moonMesh);

          planetMoons.push({
            mesh: moonMesh,
            orbit: moonOrbit,
            data: moon,
            angle: Math.random() * Math.PI * 2,
          });
        });
      }

      moons[planet.name] = planetMoons;
    });

    const createAsteroidBelt = () => {
      const asteroids = [];
      const numberOfAsteroids = isMobile ? 800 : 3500;

      const asteroidBelt = new THREE.Object3D();
      scene.add(asteroidBelt);

      const beltInnerRadius = 160;
      const beltOuterRadius = 170;
      const beltThickness = 8;

      const kirkwoodGaps = [
        { position: 161.7, width: 0.8 },
        { position: 163.8, width: 1.0 },
        { position: 165.8, width: 1.2 },
        { position: 167.8, width: 0.9 },
        { position: 169.2, width: 1.1 },
      ];

      const createAsteroidTypes = () => {
        const types = [];

        const createAsteroidTexture = (baseColor, details, bumpiness) => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");

          ctx.fillStyle = baseColor;
          ctx.fillRect(0, 0, 256, 256);

          for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 2 + 0.5;

            const shade = Math.floor(Math.random() * 40 - 20);
            ctx.fillStyle = adjustColor(baseColor, shade);

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }

          for (let i = 0; i < details; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 20 + 5;

            const shade = Math.floor(Math.random() * 30 - 15);
            ctx.fillStyle = adjustColor(baseColor, shade - 20);

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }

          for (let i = 0; i < bumpiness; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 12 + 3;
            const shade = Math.floor(Math.random() * 60 - 30);

            ctx.fillStyle = adjustColor(baseColor, shade - 30);
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = adjustColor(baseColor, 15);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
          }

          const texture = new THREE.CanvasTexture(canvas);

          const normalCanvas = document.createElement("canvas");
          normalCanvas.width = 256;
          normalCanvas.height = 256;
          const normalCtx = normalCanvas.getContext("2d");

          normalCtx.fillStyle = "#8080ff";
          normalCtx.fillRect(0, 0, 256, 256);

          for (let i = 0; i < bumpiness; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 12 + 3;

            const gradient = normalCtx.createRadialGradient(
              x,
              y,
              0,
              x,
              y,
              radius
            );
            gradient.addColorStop(0, "#4040ff");
            gradient.addColorStop(0.7, "#8080ff");
            gradient.addColorStop(0.9, "#c0c0ff");
            gradient.addColorStop(1, "#8080ff");

            normalCtx.fillStyle = gradient;
            normalCtx.beginPath();
            normalCtx.arc(x, y, radius, 0, Math.PI * 2);
            normalCtx.fill();
          }

          const normalMap = new THREE.CanvasTexture(normalCanvas);

          return { map: texture, normalMap: normalMap };
        };

        function adjustColor(hexColor, amount) {
          const r = parseInt(hexColor.slice(1, 3), 16);
          const g = parseInt(hexColor.slice(3, 5), 16);
          const b = parseInt(hexColor.slice(5, 7), 16);

          return `rgb(${Math.min(255, Math.max(0, r + amount))}, 
                      ${Math.min(255, Math.max(0, g + amount))}, 
                      ${Math.min(255, Math.max(0, b + amount))})`;
        }

        const cTypeMaps = createAsteroidTexture("#32302e", 15, 8);
        types.push(
          new THREE.MeshStandardMaterial({
            map: cTypeMaps.map,
            normalMap: cTypeMaps.normalMap,
            roughness: 0.95,
            metalness: 0.05,
            flatShading: true,
          })
        );

        const sTypeMaps = createAsteroidTexture("#6b5c4d", 20, 12);
        types.push(
          new THREE.MeshStandardMaterial({
            map: sTypeMaps.map,
            normalMap: sTypeMaps.normalMap,
            roughness: 0.85,
            metalness: 0.15,
            flatShading: true,
          })
        );

        const mTypeMaps = createAsteroidTexture("#52504e", 10, 5);
        types.push(
          new THREE.MeshStandardMaterial({
            map: mTypeMaps.map,
            normalMap: mTypeMaps.normalMap,
            roughness: 0.6,
            metalness: 0.7,
            flatShading: true,
          })
        );

        const vTypeMaps = createAsteroidTexture("#4a3c37", 12, 10);
        types.push(
          new THREE.MeshStandardMaterial({
            map: vTypeMaps.map,
            normalMap: vTypeMaps.normalMap,
            roughness: 0.75,
            metalness: 0.25,
            flatShading: true,
          })
        );

        return types;
      };

      const asteroidTypes = createAsteroidTypes();

      const geometryPool = [];

      for (let i = 0; i < 4; i++) {
        const baseSize = Math.random() * 0.3 + 0.2;
        let asteroidGeometry;

        const shapeType = Math.floor(Math.random() * 5);

        if (shapeType === 0) {
          asteroidGeometry = new THREE.IcosahedronGeometry(baseSize, 1);
        } else if (shapeType === 1) {
          asteroidGeometry = new THREE.DodecahedronGeometry(baseSize, 0);
        } else if (shapeType === 2) {
          asteroidGeometry = new THREE.TetrahedronGeometry(baseSize, 1);
        } else if (shapeType === 3) {
          asteroidGeometry = new THREE.OctahedronGeometry(baseSize, 1);
        } else {
          const geo1 = new THREE.IcosahedronGeometry(baseSize, 0);
          const geo2 = new THREE.DodecahedronGeometry(baseSize * 0.8, 0);

          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * baseSize * 0.5,
            (Math.random() - 0.5) * baseSize * 0.5,
            (Math.random() - 0.5) * baseSize * 0.5
          );

          const mergedGeometry = mergeBufferGeometries([geo1, geo2], false);
          asteroidGeometry = mergedGeometry;
        }

        const positions = asteroidGeometry.attributes.position;
        for (let j = 0; j < positions.count; j++) {
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(positions, j);

          const distortion = 0.2 + Math.random() * 0.3;
          vertex.x += (Math.random() - 0.5) * distortion * baseSize;
          vertex.y += (Math.random() - 0.5) * distortion * baseSize;
          vertex.z += (Math.random() - 0.5) * distortion * baseSize;

          positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
        }

        positions.needsUpdate = true;
        asteroidGeometry.computeVertexNormals();

        geometryPool.push(asteroidGeometry);
      }

      function mergeBufferGeometries(geometries) {
        const totalVertices = geometries.reduce(
          (acc, geo) => acc + geo.attributes.position.count,
          0
        );
        const positions = new Float32Array(totalVertices * 3);
        const normals = new Float32Array(totalVertices * 3);
        const uvs = new Float32Array(totalVertices * 2);

        let offset = 0;

        for (let i = 0; i < geometries.length; i++) {
          const geo = geometries[i];
          const posAttr = geo.attributes.position;
          const normAttr = geo.attributes.normal;
          const uvAttr = geo.attributes.uv;

          for (let j = 0; j < posAttr.count; j++) {
            positions[(offset + j) * 3] = posAttr.getX(j);
            positions[(offset + j) * 3 + 1] = posAttr.getY(j);
            positions[(offset + j) * 3 + 2] = posAttr.getZ(j);

            normals[(offset + j) * 3] = normAttr.getX(j);
            normals[(offset + j) * 3 + 1] = normAttr.getY(j);
            normals[(offset + j) * 3 + 2] = normAttr.getZ(j);

            if (uvAttr) {
              uvs[(offset + j) * 2] = uvAttr.getX(j);
              uvs[(offset + j) * 2 + 1] = uvAttr.getY(j);
            }
          }

          offset += posAttr.count;
        }

        const mergedGeometry = new THREE.BufferGeometry();
        mergedGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3)
        );
        mergedGeometry.setAttribute(
          "normal",
          new THREE.BufferAttribute(normals, 3)
        );
        mergedGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

        return mergedGeometry;
      }

      for (let i = 0; i < numberOfAsteroids; i++) {
        const geometry =
          geometryPool[Math.floor(Math.random() * geometryPool.length)];

        let materialIndex;
        const typeRandom = Math.random();
        if (typeRandom < 0.75) {
          materialIndex = 0;
        } else if (typeRandom < 0.92) {
          materialIndex = 1;
        } else if (typeRandom < 0.99) {
          materialIndex = 2;
        } else {
          materialIndex = 3;
        }

        let material = asteroidTypes[materialIndex].clone();
        const asteroidMesh = new THREE.Mesh(geometry, material);

        let radius,
          angle,
          height,
          isInGap = true;

        while (isInGap) {
          const radialRandom = Math.random();
          const distributionPower = 0.5;

          const normalizedRadius = Math.pow(
            Math.sin(radialRandom * Math.PI),
            distributionPower
          );
          radius =
            beltInnerRadius +
            normalizedRadius * (beltOuterRadius - beltInnerRadius);

          isInGap = false;
          for (const gap of kirkwoodGaps) {
            if (Math.abs(radius - gap.position) < gap.width) {
              isInGap = true;
              break;
            }
          }

          if (isInGap && Math.random() < 0.2) {
            isInGap = false;
          }

          if (!isInGap) {
            angle = Math.random() * Math.PI * 2;

            const normalizedRadialPos =
              (radius - beltInnerRadius) / (beltOuterRadius - beltInnerRadius);
            const maxHeight =
              beltThickness * (1 - Math.pow(2 * normalizedRadialPos - 1, 2));
            height = (Math.random() - 0.5) * maxHeight;
          }
        }

        if (Math.random() < 0.3) {
          let familyFound = false;

          for (let j = Math.max(0, i - 100); j < i && !familyFound; j++) {
            if (asteroids[j] && Math.random() < 0.4) {
              radius = asteroids[j].radius + (Math.random() - 0.5) * 2;
              angle = asteroids[j].angle + (Math.random() - 0.5) * 0.3;
              height = asteroids[j].height + (Math.random() - 0.5) * 1;

              material = asteroidTypes[materialIndex].clone();

              familyFound = true;
            }
          }
        }

        const x = radius * Math.cos(angle);
        const y = height;
        const z = radius * Math.sin(angle);

        asteroidMesh.position.set(x, y, z);

        const sizeRandom = Math.random();
        let scaleFactor;

        if (sizeRandom > 0.998) {
          scaleFactor = Math.random() * 0.6 + 1.7;
        } else if (sizeRandom > 0.99) {
          scaleFactor = Math.random() * 0.3 + 1.3;
        } else if (sizeRandom > 0.97) {
          scaleFactor = Math.random() * 0.3 + 0.9;
        } else if (sizeRandom > 0.9) {
          scaleFactor = Math.random() * 0.2 + 0.7;
        } else if (sizeRandom > 0.7) {
          scaleFactor = Math.random() * 0.2 + 0.5;
        } else {
          scaleFactor = Math.random() * 0.3 + 0.2;
        }

        asteroidMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

        asteroidMesh.rotation.x = Math.random() * Math.PI * 2;
        asteroidMesh.rotation.y = Math.random() * Math.PI * 2;
        asteroidMesh.rotation.z = Math.random() * Math.PI * 2;

        const orbitSpeed = 0.0006 * Math.pow(radius / beltOuterRadius, -1.5);

        const baseRotationSpeed = 0.002 / scaleFactor;
        const rotationSpeed = {
          x: (Math.random() - 0.5) * baseRotationSpeed,
          y: (Math.random() - 0.5) * baseRotationSpeed,
          z: (Math.random() - 0.5) * baseRotationSpeed,
        };

        asteroidBelt.add(asteroidMesh);

        asteroids.push({
          mesh: asteroidMesh,
          orbitSpeed: orbitSpeed,
          rotationSpeed: rotationSpeed,
          radius: radius,
          height: height,
          angle: angle,
          size: scaleFactor,
          type: materialIndex,
        });
      }

      asteroidBeltRef.current = asteroidBelt;
      asteroidsRef.current = asteroids;
    };

    createAsteroidBelt();

    const createSpacecrafts = () => {
      const spacecrafts = {};

      const createSimpleModel = (type, color) => {
        const group = new THREE.Group();

        switch (type) {
          case "adityaL1":
            const adityaBody = new THREE.Group();

            const adityaMainBus = new THREE.Mesh(
              new THREE.BoxGeometry(0.7, 0.7, 1.0),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.8,
                roughness: 0.2,
                envMapIntensity: 2.0,
                emissive: 0x555555,
                emissiveIntensity: 0.3,
              })
            );
            adityaBody.add(adityaMainBus);

            const adityaGoldFoilMaterial = new THREE.MeshStandardMaterial({
              color: 0xffd700,
              metalness: 1.0,
              roughness: 0.2,
              emissive: 0xff8800,
              emissiveIntensity: 0.5,
            });

            const adityaBodyGoldLayer = new THREE.Mesh(
              new THREE.BoxGeometry(0.72, 0.72, 1.02),
              adityaGoldFoilMaterial
            );
            adityaBodyGoldLayer.position.z = 0;
            adityaBodyGoldLayer.scale.set(0.9, 0.9, 0.3);
            adityaMainBus.add(adityaBodyGoldLayer);

            const adityaPanel1 = new THREE.Mesh(
              new THREE.BoxGeometry(3.0, 0.05, 1.2),
              new THREE.MeshStandardMaterial({
                color: 0x3366ff,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x0033cc,
                emissiveIntensity: 0.6,
              })
            );
            adityaPanel1.position.set(1.8, 0, 0);
            adityaBody.add(adityaPanel1);

            const adityaPanel1Grid = new THREE.Group();
            for (let x = 0; x < 8; x++) {
              for (let z = 0; z < 4; z++) {
                const cell = new THREE.Mesh(
                  new THREE.PlaneGeometry(0.34, 0.25),
                  new THREE.MeshStandardMaterial({
                    color: 0x2244ff,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x0033ff,
                    emissiveIntensity: 0.5,
                    side: THREE.DoubleSide,
                  })
                );
                cell.position.set(-1.4 + x * 0.36, 0.03, -0.55 + z * 0.27);
                cell.rotation.x = Math.PI / 2;
                adityaPanel1Grid.add(cell);
              }
            }
            adityaPanel1.add(adityaPanel1Grid);

            const adityaPanel2 = new THREE.Mesh(
              new THREE.BoxGeometry(3.0, 0.05, 1.2),
              new THREE.MeshStandardMaterial({
                color: 0x3366ff,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x0033cc,
                emissiveIntensity: 0.6,
              })
            );
            adityaPanel2.position.set(-1.8, 0, 0);
            adityaBody.add(adityaPanel2);

            const adityaPanel2Grid = adityaPanel1Grid.clone();
            adityaPanel2.add(adityaPanel2Grid);

            const velc = new THREE.Mesh(
              new THREE.CylinderGeometry(0.2, 0.25, 0.4, 16),
              new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.6,
                roughness: 0.4,
                emissive: 0x222222,
                emissiveIntensity: 0.3,
              })
            );
            velc.rotation.x = Math.PI / 2;
            velc.position.set(0, 0.2, 0.6);
            adityaBody.add(velc);

            const velcAperture = new THREE.Mesh(
              new THREE.CircleGeometry(0.15, 16),
              new THREE.MeshStandardMaterial({
                color: 0x000000,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x000000,
                side: THREE.DoubleSide,
              })
            );
            velcAperture.position.z = 0.21;
            velcAperture.rotation.y = Math.PI / 2;
            velc.add(velcAperture);

            const solexs = new THREE.Mesh(
              new THREE.BoxGeometry(0.25, 0.25, 0.3),
              new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x333333,
                emissiveIntensity: 0.3,
              })
            );
            solexs.position.set(0.3, 0.3, 0.5);
            adityaBody.add(solexs);

            const adityaAntenna = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
              new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x777777,
                emissiveIntensity: 0.3,
              })
            );
            adityaAntenna.rotation.x = Math.PI / 2;
            adityaAntenna.position.set(0, -0.4, 0.3);
            adityaBody.add(adityaAntenna);

            const adityaDishAnt = new THREE.Mesh(
              new THREE.SphereGeometry(
                0.3,
                32,
                16,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2
              ),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0xaaaaaa,
                emissiveIntensity: 0.5,
                side: THREE.DoubleSide,
              })
            );
            adityaDishAnt.rotation.x = Math.PI;
            adityaDishAnt.position.set(0, -0.4, 0.7);
            adityaBody.add(adityaDishAnt);

            const isroBadge = new THREE.Mesh(
              new THREE.CircleGeometry(0.15, 16),
              new THREE.MeshStandardMaterial({
                color: 0xff6600,
                emissive: 0xff3300,
                emissiveIntensity: 0.8,
                side: THREE.DoubleSide,
              })
            );
            isroBadge.position.set(0, 0.36, 0.51);
            isroBadge.rotation.x = Math.PI / 2;
            adityaBody.add(isroBadge);

            const flagGroup = new THREE.Group();
            flagGroup.position.set(-0.35, 0.36, 0.51);

            const flagBase = new THREE.Mesh(
              new THREE.PlaneGeometry(0.15, 0.1),
              new THREE.MeshBasicMaterial({
                side: THREE.DoubleSide,
              })
            );
            flagBase.rotation.x = Math.PI / 2;

            const saffronStripe = new THREE.Mesh(
              new THREE.PlaneGeometry(0.15, 0.033),
              new THREE.MeshBasicMaterial({
                color: 0xff9933,
                side: THREE.DoubleSide,
                emissive: 0xff6600,
                emissiveIntensity: 0.5,
              })
            );
            saffronStripe.position.y = 0.033;
            saffronStripe.rotation.x = Math.PI / 2;

            const whiteStripe = new THREE.Mesh(
              new THREE.PlaneGeometry(0.15, 0.033),
              new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                emissive: 0xaaaaaa,
                emissiveIntensity: 0.3,
              })
            );
            whiteStripe.rotation.x = Math.PI / 2;

            const greenStripe = new THREE.Mesh(
              new THREE.PlaneGeometry(0.15, 0.033),
              new THREE.MeshBasicMaterial({
                color: 0x138808,
                side: THREE.DoubleSide,
                emissive: 0x0a5c04,
                emissiveIntensity: 0.5,
              })
            );
            greenStripe.position.y = -0.033;
            greenStripe.rotation.x = Math.PI / 2;

            flagGroup.add(saffronStripe);
            flagGroup.add(whiteStripe);
            flagGroup.add(greenStripe);
            adityaBody.add(flagGroup);

            const adityaGlow = new THREE.PointLight(0x44aaff, 2.0, 8.0);
            adityaGlow.position.set(0, 0, 0);
            adityaBody.add(adityaGlow);

            const adityaSunGlow = new THREE.PointLight(0xffaa44, 1.5, 5.0);
            adityaSunGlow.position.set(0, 0, 0.7);
            adityaBody.add(adityaSunGlow);

            const adityaBodyGlow = new THREE.Mesh(
              new THREE.SphereGeometry(1.0, 16, 16),
              new THREE.MeshBasicMaterial({
                color: 0x4488ff,
                transparent: true,
                opacity: 0.1,
                side: THREE.BackSide,
              })
            );
            adityaBody.add(adityaBodyGlow);

            group.add(adityaBody);
            break;
          case "voyager":
            const mainBusGeometry = new THREE.BoxGeometry(0.7, 0.3, 1.2);
            const mainBusMaterial = new THREE.MeshStandardMaterial({
              color: 0xffe066,
              metalness: 0.9,
              roughness: 0.2,
              emissive: 0xaa7700,
              emissiveIntensity: 0.4,
              envMapIntensity: 2.5,
            });
            const mainBus = new THREE.Mesh(mainBusGeometry, mainBusMaterial);
            group.add(mainBus);

            const goldFoilMaterial = new THREE.MeshStandardMaterial({
              color: 0xffd700,
              metalness: 1.0,
              roughness: 0.2,
              emissive: 0xdd9900,
              emissiveIntensity: 0.5,
            });

            const busDetail = new THREE.Mesh(
              new THREE.BoxGeometry(0.65, 0.25, 1.1),
              goldFoilMaterial
            );
            busDetail.position.y = 0.01;
            group.add(busDetail);

            const dishGeometry = new THREE.SphereGeometry(
              1.0,
              32,
              32,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2
            );
            const dishMaterial = new THREE.MeshStandardMaterial({
              color: 0xfff6e0,
              metalness: 0.9,
              roughness: 0.1,
              side: THREE.DoubleSide,
              emissive: 0xddbb77,
              emissiveIntensity: 0.5,
            });
            const dish = new THREE.Mesh(dishGeometry, dishMaterial);
            dish.rotation.x = Math.PI / 2;
            dish.position.z = 0.7;
            dish.scale.set(1.2, 1.2, 0.3);
            group.add(dish);

            const dishInterior = new THREE.Mesh(
              new THREE.SphereGeometry(
                0.95,
                32,
                32,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2
              ),
              new THREE.MeshStandardMaterial({
                color: 0xfffbe6,
                metalness: 0.9,
                roughness: 0.1,
                side: THREE.DoubleSide,
                emissive: 0xaa9955,
                emissiveIntensity: 0.3,
              })
            );
            dishInterior.position.z = 0.65;
            dishInterior.rotation.x = Math.PI / 2;
            dishInterior.scale.set(1, 1, 0.25);
            group.add(dishInterior);

            for (let i = 0; i < 4; i++) {
              const angle = (i / 4) * Math.PI * 2;
              const strut = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8),
                new THREE.MeshStandardMaterial({
                  color: 0xccbb88,
                  metalness: 0.9,
                  roughness: 0.2,
                  emissive: 0x997755,
                  emissiveIntensity: 0.3,
                })
              );
              strut.position.set(
                Math.cos(angle) * 0.4,
                Math.sin(angle) * 0.4,
                0.45
              );
              strut.rotation.x = Math.PI / 6;
              group.add(strut);
            }

            const feedHorn = new THREE.Mesh(
              new THREE.CylinderGeometry(0.1, 0.15, 0.2, 16),
              new THREE.MeshStandardMaterial({
                color: 0xe6d5b8,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0xaa9966,
                emissiveIntensity: 0.3,
              })
            );
            feedHorn.rotation.x = Math.PI / 2;
            feedHorn.position.z = 0.55;
            group.add(feedHorn);

            const rtgBoom = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.04, 2.0, 12),
              new THREE.MeshStandardMaterial({
                color: 0xddcc99,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x997755,
                emissiveIntensity: 0.2,
              })
            );
            rtgBoom.rotation.z = Math.PI / 2;
            rtgBoom.position.x = -1.1;
            group.add(rtgBoom);

            const rtgCylinder = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12, 0.12, 0.6, 24),
              new THREE.MeshStandardMaterial({
                color: 0xddb06f,
                metalness: 0.9,
                roughness: 0.2,
                emissive: 0x884400,
                emissiveIntensity: 0.3,
              })
            );
            rtgCylinder.position.set(-1.9, 0, 0);
            rtgCylinder.rotation.z = Math.PI / 2;
            group.add(rtgCylinder);

            for (let i = 0; i < 18; i++) {
              const fin = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.5, 0.015),
                new THREE.MeshStandardMaterial({
                  color: 0xd4af37,
                  metalness: 0.9,
                  roughness: 0.2,
                  emissive: 0x553300,
                  emissiveIntensity: 0.3,
                })
              );
              fin.position.set(-1.9, 0, 0);
              fin.rotation.z = Math.PI / 2;
              fin.rotation.y = (i / 18) * Math.PI * 2;
              rtgCylinder.add(fin);
            }

            const rtgHot = new THREE.Mesh(
              new THREE.SphereGeometry(0.08, 16, 16),
              new THREE.MeshStandardMaterial({
                color: 0xff8800,
                emissive: 0xff5500,
                emissiveIntensity: 2.0,
              })
            );
            rtgHot.position.set(-2.2, 0, 0);
            group.add(rtgHot);

            const scienceBoom = new THREE.Mesh(
              new THREE.CylinderGeometry(0.03, 0.03, 2.2, 12),
              new THREE.MeshStandardMaterial({
                color: 0xddcc99,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x997755,
                emissiveIntensity: 0.2,
              })
            );
            scienceBoom.position.set(1.0, 0, 0);
            scienceBoom.rotation.z = Math.PI / 2;
            group.add(scienceBoom);

            const instruments = new THREE.Group();
            instruments.position.set(2.0, 0, 0);

            const voyagerMagInstrument = new THREE.Mesh(
              new THREE.BoxGeometry(0.3, 0.3, 0.3),
              new THREE.MeshStandardMaterial({
                color: 0xc0b080,
                metalness: 0.7,
                roughness: 0.2,
                emissive: 0x886633,
                emissiveIntensity: 0.2,
              })
            );
            instruments.add(voyagerMagInstrument);

            const plasmaDetector = new THREE.Mesh(
              new THREE.CylinderGeometry(0.1, 0.12, 0.2, 16),
              new THREE.MeshStandardMaterial({
                color: 0xcaa472,
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0x775533,
                emissiveIntensity: 0.2,
              })
            );
            plasmaDetector.rotation.x = Math.PI / 2;
            plasmaDetector.position.set(0.1, 0.2, 0.2);
            instruments.add(plasmaDetector);

            const camera1 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16),
              new THREE.MeshStandardMaterial({
                color: 0xd4b66a,
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0x886622,
                emissiveIntensity: 0.2,
              })
            );
            camera1.rotation.x = Math.PI / 2;
            camera1.position.set(0, 0, 0.25);
            instruments.add(camera1);

            const camera2 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.07, 0.09, 0.13, 16),
              new THREE.MeshStandardMaterial({
                color: 0xd4b66a,
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0x886622,
                emissiveIntensity: 0.2,
              })
            );
            camera2.rotation.x = Math.PI / 2;
            camera2.rotation.z = Math.PI / 6;
            camera2.position.set(0.15, 0.05, 0.2);
            instruments.add(camera2);

            const lens1 = new THREE.Mesh(
              new THREE.CircleGeometry(0.065, 24),
              new THREE.MeshStandardMaterial({
                color: 0x87ceeb,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x6495ed,
                emissiveIntensity: 1.0,
              })
            );
            lens1.position.set(0, 0, 0.33);
            lens1.rotation.x = Math.PI / 2;
            instruments.add(lens1);

            const lens2 = new THREE.Mesh(
              new THREE.CircleGeometry(0.055, 24),
              new THREE.MeshStandardMaterial({
                color: 0x87ceeb,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x6495ed,
                emissiveIntensity: 1.0,
              })
            );
            lens2.position.set(0.15, 0.05, 0.27);
            lens2.rotation.x = Math.PI / 2;
            lens2.rotation.z = Math.PI / 6;
            instruments.add(lens2);

            group.add(instruments);

            const antenna1 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.01, 0.01, 0.8, 8),
              new THREE.MeshStandardMaterial({
                color: 0xe6cc99,
                metalness: 0.8,
                roughness: 0.3,
                emissive: 0x997755,
                emissiveIntensity: 0.2,
              })
            );
            antenna1.position.set(0, 0.3, -0.3);
            antenna1.rotation.x = Math.PI / 4;
            group.add(antenna1);

            const antenna2 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.01, 0.01, 0.8, 8),
              new THREE.MeshStandardMaterial({
                color: 0xe6cc99,
                metalness: 0.8,
                roughness: 0.3,
                emissive: 0x997755,
                emissiveIntensity: 0.2,
              })
            );
            antenna2.position.set(0, -0.3, -0.3);
            antenna2.rotation.x = -Math.PI / 4;
            group.add(antenna2);

            const rtgGlow = new THREE.PointLight(0xff8800, 3.0, 5.0);
            rtgGlow.position.set(-1.9, 0, 0);
            group.add(rtgGlow);

            const spacecraftGlow = new THREE.PointLight(0xffcc66, 1.0, 4.0);
            spacecraftGlow.position.set(0, 0, 0);
            group.add(spacecraftGlow);

            const highlightGlow = new THREE.PointLight(0xffffcc, 0.7, 2.5);
            highlightGlow.position.set(0.3, 0.2, 0.3);
            group.add(highlightGlow);

            break;

          case "newHorizons":
            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(0.55, 0.55, 0.8, 24),
              new THREE.MeshStandardMaterial({
                color: 0xffe680,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x997733,
                emissiveIntensity: 0.4,
                envMapIntensity: 1.5,
              })
            );
            body.position.y = 0.1;
            group.add(body);

            const bodyStripes = new THREE.Mesh(
              new THREE.CylinderGeometry(0.56, 0.56, 0.4, 24),
              new THREE.MeshStandardMaterial({
                color: 0xffd230,
                metalness: 0.5,
                roughness: 0.5,
                emissive: 0xcc7700,
                emissiveIntensity: 0.4,
              })
            );
            bodyStripes.position.y = 0.2;
            group.add(bodyStripes);

            const blanketMaterial = new THREE.MeshStandardMaterial({
              color: 0xffd700,
              metalness: 0.9,
              roughness: 0.3,
              emissive: 0xaa7700,
              emissiveIntensity: 0.5,
            });

            const blanket = new THREE.Mesh(
              new THREE.CylinderGeometry(0.54, 0.54, 0.78, 24),
              blanketMaterial
            );
            blanket.position.y = 0.1;
            group.add(blanket);

            const nhDishGeom = new THREE.SphereGeometry(
              0.9,
              32,
              16,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2
            );
            const nhDishMat = new THREE.MeshStandardMaterial({
              color: 0xffe6a6,
              metalness: 1.0,
              roughness: 0.1,
              side: THREE.DoubleSide,
              emissive: 0xd4af37,
              emissiveIntensity: 0.3,
            });
            const nhDish = new THREE.Mesh(nhDishGeom, nhDishMat);
            nhDish.scale.set(1.2, 1.2, 0.2);
            nhDish.position.y = 0.55;
            nhDish.rotation.x = -Math.PI / 2;
            group.add(nhDish);

            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              const rib = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.01, 0.9),
                new THREE.MeshStandardMaterial({
                  color: 0xe6d58b,
                  metalness: 0.8,
                  roughness: 0.2,
                  emissive: 0xaa9966,
                  emissiveIntensity: 0.2,
                })
              );
              rib.position.y = 0.54;
              rib.rotation.x = -Math.PI / 2;
              rib.rotation.z = angle;
              group.add(rib);
            }

            for (let r = 0.2; r < 0.9; r += 0.2) {
              const circlePanel = new THREE.Mesh(
                new THREE.RingGeometry(r, r + 0.02, 32),
                new THREE.MeshStandardMaterial({
                  color: 0xe6cc99,
                  metalness: 0.8,
                  roughness: 0.2,
                  emissive: 0xd4af37,
                  emissiveIntensity: 0.2,
                  side: THREE.DoubleSide,
                })
              );
              circlePanel.position.y = 0.53;
              circlePanel.rotation.x = -Math.PI / 2;
              group.add(circlePanel);
            }

            const nhFeedHorn = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06, 0.12, 0.18, 16),
              new THREE.MeshStandardMaterial({
                color: 0xd9c077,
                metalness: 0.9,
                roughness: 0.2,
                emissive: 0x997744,
                emissiveIntensity: 0.2,
              })
            );
            nhFeedHorn.position.y = 0.4;
            group.add(nhFeedHorn);

            const nhRtg = new THREE.Mesh(
              new THREE.BoxGeometry(0.4, 0.5, 0.4),
              new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x996600,
                emissiveIntensity: 0.2,
              })
            );
            nhRtg.position.set(-0.7, -0.15, 0);
            group.add(nhRtg);

            for (let i = 0; i < 8; i++) {
              const rtgFin = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.5, 0.03),
                new THREE.MeshStandardMaterial({
                  color: 0xc0aa60,
                  metalness: 0.9,
                  roughness: 0.2,
                  emissive: 0x886622,
                  emissiveIntensity: 0.2,
                })
              );
              rtgFin.position.set(-0.7, -0.15, 0);
              rtgFin.rotation.y = (i / 8) * Math.PI;
              group.add(rtgFin);
            }

            const nhRtgGlow = new THREE.PointLight(0xff9933, 3.0, 5.0);
            nhRtgGlow.position.set(-0.7, -0.15, 0);
            group.add(nhRtgGlow);

            const nhInstruments = new THREE.Group();
            nhInstruments.position.set(0, 0.2, 0.4);

            const lorri = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16),
              new THREE.MeshStandardMaterial({
                color: 0xe6c98a,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x997744,
                emissiveIntensity: 0.2,
              })
            );
            lorri.rotation.x = Math.PI / 2;
            lorri.position.z = 0.15;
            nhInstruments.add(lorri);

            const lorriLens = new THREE.Mesh(
              new THREE.CircleGeometry(0.06, 24),
              new THREE.MeshStandardMaterial({
                color: 0x87ceeb,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x6495ed,
                emissiveIntensity: 0.3,
              })
            );
            lorriLens.position.z = 0.31;
            lorriLens.rotation.x = Math.PI / 2;
            lorri.add(lorriLens);

            const ralph = new THREE.Mesh(
              new THREE.BoxGeometry(0.15, 0.15, 0.2),
              new THREE.MeshStandardMaterial({
                color: 0xe6cc90,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x997744,
                emissiveIntensity: 0.2,
              })
            );
            ralph.position.set(0.2, 0.1, 0);
            nhInstruments.add(ralph);

            const ralphLens = new THREE.Mesh(
              new THREE.CircleGeometry(0.05, 16),
              new THREE.MeshStandardMaterial({
                color: 0x87ceeb,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x6495ed,
                emissiveIntensity: 0.3,
                side: THREE.DoubleSide,
              })
            );
            ralphLens.position.z = 0.11;
            ralphLens.rotation.x = Math.PI / 2;
            ralph.add(ralphLens);

            const alice = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 0.12, 0.15),
              new THREE.MeshStandardMaterial({
                color: 0xd9c077,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x997744,
                emissiveIntensity: 0.2,
              })
            );
            alice.position.set(-0.2, 0.05, 0);
            nhInstruments.add(alice);

            group.add(nhInstruments);

            const starTracker = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.05, 0.1, 12),
              new THREE.MeshStandardMaterial({
                color: 0xc9b16b,
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0x997744,
                emissiveIntensity: 0.2,
              })
            );
            starTracker.position.set(0.4, 0.2, 0);
            starTracker.rotation.z = Math.PI / 2;
            group.add(starTracker);

            const thrusterPositions = [
              { x: 0, y: -0.3, z: 0.4 },
              { x: 0, y: -0.3, z: -0.4 },
              { x: 0.4, y: -0.3, z: 0 },
              { x: -0.4, y: -0.3, z: 0 },
            ];

            thrusterPositions.forEach((pos) => {
              const thruster = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.08, 0.12, 12),
                new THREE.MeshStandardMaterial({
                  color: 0xc0a870,
                  metalness: 0.9,
                  roughness: 0.2,
                  emissive: 0x997744,
                  emissiveIntensity: 0.2,
                })
              );
              thruster.position.set(pos.x, pos.y, pos.z);
              thruster.rotation.x = Math.PI / 2;
              group.add(thruster);
            });

            const nhGlow = new THREE.PointLight(0xffd700, 1.2, 4.0);
            nhGlow.position.set(0, 0, 0);
            group.add(nhGlow);

            const nhHighlightGlow = new THREE.PointLight(0xffffcc, 0.8, 3.0);
            nhHighlightGlow.position.set(0.2, 0.3, 0.2);
            group.add(nhHighlightGlow);

            break;

          case "parker":
            const parkerBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.4, 0.4, 0.5),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
                envMapIntensity: 1.5,
              })
            );
            group.add(parkerBody);

            const parkerHeatShieldGeom = new THREE.CylinderGeometry(
              1.0,
              1.0,
              0.1,
              32
            );
            const parkerHeatShieldMat = new THREE.MeshStandardMaterial({
              color: 0x222222,
              metalness: 0.2,
              roughness: 0.9,
              emissive: 0x330000,
              emissiveIntensity: 0.3,
            });
            const parkerHeatShield = new THREE.Mesh(
              parkerHeatShieldGeom,
              parkerHeatShieldMat
            );
            parkerHeatShield.rotation.x = Math.PI / 2;
            parkerHeatShield.position.z = -0.4;
            group.add(parkerHeatShield);

            const heatShieldDetail = new THREE.Mesh(
              new THREE.RingGeometry(0.4, 0.95, 32),
              new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.3,
                roughness: 0.8,
                side: THREE.DoubleSide,
                emissive: 0x220000,
                emissiveIntensity: 0.2,
              })
            );
            heatShieldDetail.position.z = -0.39;
            heatShieldDetail.rotation.x = Math.PI / 2;
            group.add(heatShieldDetail);

            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const radius = 0.7;

              const pipe = new THREE.Mesh(
                new THREE.TorusGeometry(radius, 0.02, 8, 12, Math.PI / 4),
                new THREE.MeshStandardMaterial({
                  color: 0x555555,
                  metalness: 0.7,
                  roughness: 0.3,
                })
              );

              pipe.position.z = -0.35;
              pipe.rotation.x = Math.PI / 2;
              pipe.rotation.z = angle;
              group.add(pipe);
            }

            const panelFrame1 = new THREE.Mesh(
              new THREE.BoxGeometry(2.0, 0.05, 0.6),
              new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.9,
                roughness: 0.3,
              })
            );
            panelFrame1.position.x = 1.1;
            group.add(panelFrame1);

            const panel1 = new THREE.Mesh(
              new THREE.BoxGeometry(1.9, 0.02, 0.5),
              new THREE.MeshStandardMaterial({
                color: 0x2244aa,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x001133,
                emissiveIntensity: 0.3,
              })
            );
            panel1.position.x = 1.1;
            panel1.position.y = 0.02;
            group.add(panel1);

            const panelGrid1 = new THREE.Group();
            for (let x = 0; x < 10; x++) {
              for (let y = 0; y < 5; y++) {
                const cell = new THREE.Mesh(
                  new THREE.PlaneGeometry(0.17, 0.09),
                  new THREE.MeshStandardMaterial({
                    color: 0x1133aa,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x001133,
                    emissiveIntensity: 0.2,
                    side: THREE.DoubleSide,
                  })
                );
                cell.position.set(-0.85 + x * 0.19, 0, -0.2 + y * 0.1);
                cell.rotation.x = Math.PI / 2;
                panelGrid1.add(cell);
              }
            }
            panel1.add(panelGrid1);

            const panelFrame2 = new THREE.Mesh(
              new THREE.BoxGeometry(2.0, 0.05, 0.6),
              new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.9,
                roughness: 0.3,
              })
            );
            panelFrame2.position.x = -1.1;
            group.add(panelFrame2);

            const panel2 = new THREE.Mesh(
              new THREE.BoxGeometry(1.9, 0.02, 0.5),
              new THREE.MeshStandardMaterial({
                color: 0x2244aa,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x001133,
                emissiveIntensity: 0.3,
              })
            );
            panel2.position.x = -1.1;
            panel2.position.y = 0.02;
            group.add(panel2);

            const panelGrid2 = new THREE.Group();
            for (let x = 0; x < 10; x++) {
              for (let y = 0; y < 5; y++) {
                const cell = new THREE.Mesh(
                  new THREE.PlaneGeometry(0.17, 0.09),
                  new THREE.MeshStandardMaterial({
                    color: 0x1133aa,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x001133,
                    emissiveIntensity: 0.2,
                    side: THREE.DoubleSide,
                  })
                );
                cell.position.set(-0.85 + x * 0.19, 0, -0.2 + y * 0.1);
                cell.rotation.x = Math.PI / 2;
                panelGrid2.add(cell);
              }
            }
            panel2.add(panelGrid2);

            const parkerInstruments = new THREE.Group();
            parkerInstruments.position.set(0, 0.3, 0);

            const comm = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16),
              new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            parkerInstruments.add(comm);

            const commDish = new THREE.Mesh(
              new THREE.SphereGeometry(
                0.15,
                16,
                8,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2
              ),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
                side: THREE.DoubleSide,
              })
            );
            commDish.scale.set(1, 1, 0.2);
            commDish.position.y = 0.15;
            commDish.rotation.x = -Math.PI / 2;
            parkerInstruments.add(commDish);

            const solarSensor = new THREE.Mesh(
              new THREE.BoxGeometry(0.1, 0.1, 0.15),
              new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            solarSensor.position.set(0.2, 0, 0.2);
            parkerInstruments.add(solarSensor);

            const coolingRadiator = new THREE.Mesh(
              new THREE.BoxGeometry(0.3, 0.05, 0.2),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x333333,
                emissiveIntensity: 0.1,
              })
            );
            coolingRadiator.position.set(-0.2, -0.05, 0.15);
            parkerInstruments.add(coolingRadiator);

            for (let i = 0; i < 5; i++) {
              const radiatorFin = new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 0.01, 0.02),
                new THREE.MeshStandardMaterial({
                  color: 0xdddddd,
                  metalness: 0.9,
                  roughness: 0.1,
                })
              );
              radiatorFin.position.set(-0.2, -0.05, 0.15 - 0.04 * i);
              parkerInstruments.add(radiatorFin);
            }

            group.add(parkerInstruments);

            for (let i = 0; i < 4; i++) {
              const angle = (i / 4) * Math.PI * 2;
              const x = Math.cos(angle) * 0.5;
              const y = Math.sin(angle) * 0.5;

              const strut = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
                new THREE.MeshStandardMaterial({
                  color: 0x888888,
                  metalness: 0.7,
                  roughness: 0.3,
                })
              );

              strut.position.set(x, y, -0.15);
              strut.rotation.x = Math.PI / 6;
              group.add(strut);
            }

            const heatShieldGlow = new THREE.PointLight(0xff4400, 0.8, 1.5);
            heatShieldGlow.position.set(0, 0, -0.5);
            group.add(heatShieldGlow);

            break;

          case "jwst":
            const jwstBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 0.5, 0.9),
              new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.8,
                roughness: 0.2,
                envMapIntensity: 1.5,
              })
            );
            group.add(jwstBody);

            const jwstBodyDetail = new THREE.Mesh(
              new THREE.BoxGeometry(0.45, 0.45, 0.85),
              new THREE.MeshStandardMaterial({
                color: 0xe8d170,
                metalness: 1.0,
                roughness: 0.2,
                emissive: 0x554400,
                emissiveIntensity: 0.1,
              })
            );
            jwstBodyDetail.position.y = 0.01;
            group.add(jwstBodyDetail);

            const mirrorGroup = new THREE.Group();
            mirrorGroup.position.set(0, 0, 0.65);

            const hexGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 6);
            const mirrorMat = new THREE.MeshStandardMaterial({
              color: 0xffd700,
              metalness: 1.0,
              roughness: 0.05,
              emissive: 0x665500,
              emissiveIntensity: 0.2,
              envMapIntensity: 2.5,
            });

            const positions = [
              [0, 0],
              [0.17, 0],
              [0.085, 0.147],
              [-0.085, 0.147],
              [-0.17, 0],
              [-0.085, -0.147],
              [0.085, -0.147],
              [0.34, 0],
              [0.255, 0.147],
              [0.17, 0.294],
              [0.085, 0.441],
              [0, 0.294],
              [-0.085, 0.441],
              [-0.17, 0.294],
              [-0.255, 0.147],
              [-0.34, 0],
              [-0.255, -0.147],
              [-0.17, -0.294],
              [-0.085, -0.441],
              [0, -0.294],
              [0.085, -0.441],
              [0.17, -0.294],
              [0.255, -0.147],
            ];

            for (let i = 0; i < positions.length; i++) {
              const segment = new THREE.Mesh(hexGeom, mirrorMat);
              segment.position.set(positions[i][0], positions[i][1], 0);
              segment.rotation.x = -Math.PI / 2;

              const reflection = new THREE.Mesh(
                new THREE.CylinderGeometry(0.075, 0.075, 0.01, 6),
                new THREE.MeshBasicMaterial({
                  color: 0xffffff,
                  transparent: true,
                  opacity: 0.3,
                })
              );
              reflection.position.z = 0.026;
              segment.add(reflection);

              mirrorGroup.add(segment);
            }

            group.add(mirrorGroup);

            const supportBeam = new THREE.Mesh(
              new THREE.BoxGeometry(0.03, 0.03, 1.2),
              new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            supportBeam.position.z = 1.2;
            group.add(supportBeam);

            const secMirrorStrut1 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6),
              new THREE.MeshStandardMaterial({
                color: 0x999999,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            secMirrorStrut1.position.set(0.2, 0.2, 1.0);
            secMirrorStrut1.rotation.x = Math.PI / 6;
            secMirrorStrut1.rotation.z = -Math.PI / 8;
            group.add(secMirrorStrut1);

            const secMirrorStrut2 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6),
              new THREE.MeshStandardMaterial({
                color: 0x999999,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            secMirrorStrut2.position.set(-0.2, 0.2, 1.0);
            secMirrorStrut2.rotation.x = Math.PI / 6;
            secMirrorStrut2.rotation.z = Math.PI / 8;
            group.add(secMirrorStrut2);

            const secMirrorStrut3 = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6),
              new THREE.MeshStandardMaterial({
                color: 0x999999,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            secMirrorStrut3.position.set(0, -0.2, 1.0);
            secMirrorStrut3.rotation.x = -Math.PI / 6;
            group.add(secMirrorStrut3);

            const secondaryMirror = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16),
              new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 1.0,
                roughness: 0.05,
                emissive: 0x665500,
                emissiveIntensity: 0.2,
                side: THREE.DoubleSide,
              })
            );
            secondaryMirror.position.set(0, 0, 1.8);
            secondaryMirror.rotation.x = -Math.PI / 2;
            group.add(secondaryMirror);

            const shieldGroup = new THREE.Group();
            shieldGroup.position.set(0, -1.0, 0);
            shieldGroup.rotation.x = Math.PI / 2;

            const shieldColors = [
              0xddccaa, 0xeeddaa, 0xffeebb, 0xffffcc, 0xffffee,
            ];

            const shieldShape = new THREE.Shape();
            shieldShape.moveTo(-1.0, -1.0);
            shieldShape.lineTo(1.0, -1.0);
            shieldShape.lineTo(1.2, 0);
            shieldShape.lineTo(1.0, 1.0);
            shieldShape.lineTo(-1.0, 1.0);
            shieldShape.lineTo(-1.2, 0);
            shieldShape.lineTo(-1.0, -1.0);

            for (let i = 0; i < 5; i++) {
              const shield = new THREE.Mesh(
                new THREE.ShapeGeometry(shieldShape),
                new THREE.MeshStandardMaterial({
                  color: shieldColors[i],
                  metalness: 0.4,
                  roughness: 0.6,
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 0.95,
                  emissive: shieldColors[i],
                  emissiveIntensity: 0.05,
                })
              );
              shield.position.z = i * 0.025;

              shield.rotation.z = (Math.random() - 0.5) * 0.05;
              shield.position.x = (Math.random() - 0.5) * 0.02;
              shield.position.y = (Math.random() - 0.5) * 0.02;

              shieldGroup.add(shield);
            }

            group.add(shieldGroup);

            for (let i = 0; i < 2; i++) {
              const boomX = i === 0 ? -0.8 : 0.8;

              const boom = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 2.0, 8),
                new THREE.MeshStandardMaterial({
                  color: 0x888888,
                  metalness: 0.7,
                  roughness: 0.3,
                })
              );
              boom.position.set(boomX, -0.5, 0);
              boom.rotation.x = Math.PI / 2;
              group.add(boom);
            }

            const jwstSolarPanel = new THREE.Mesh(
              new THREE.BoxGeometry(0.7, 0.02, 0.7),
              new THREE.MeshStandardMaterial({
                color: 0x2244aa,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x001133,
                emissiveIntensity: 0.3,
              })
            );
            jwstSolarPanel.position.y = -0.6;
            group.add(jwstSolarPanel);

            const solarGrid = new THREE.Group();
            for (let x = 0; x < 5; x++) {
              for (let z = 0; z < 5; z++) {
                const cell = new THREE.Mesh(
                  new THREE.PlaneGeometry(0.12, 0.12),
                  new THREE.MeshStandardMaterial({
                    color: 0x1133aa,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x001133,
                    emissiveIntensity: 0.2,
                    side: THREE.DoubleSide,
                  })
                );
                cell.position.set(-0.3 + x * 0.13, 0.015, -0.3 + z * 0.13);
                cell.rotation.x = -Math.PI / 2;
                solarGrid.add(cell);
              }
            }
            jwstSolarPanel.add(solarGrid);

            const jwstGlow = new THREE.PointLight(0xffffcc, 0.3, 3.0);
            jwstGlow.position.set(0, 0, 0.2);
            group.add(jwstGlow);

            break;

          case "iss":
            const truss = new THREE.Mesh(
              new THREE.BoxGeometry(3.5, 0.15, 0.15),
              new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.9,
                roughness: 0.2,
                envMapIntensity: 1.5,
              })
            );
            group.add(truss);

            const createTrussSegment = (x) => {
              const segment = new THREE.Group();
              segment.position.x = x;

              const vertical1 = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8),
                new THREE.MeshStandardMaterial({
                  color: 0xaaaaaa,
                  metalness: 0.9,
                  roughness: 0.2,
                })
              );
              vertical1.position.set(0, 0, 0.1);
              segment.add(vertical1);

              const vertical2 = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8),
                new THREE.MeshStandardMaterial({
                  color: 0xaaaaaa,
                  metalness: 0.9,
                  roughness: 0.2,
                })
              );
              vertical2.position.set(0, 0, -0.1);
              segment.add(vertical2);

              const cross1 = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8),
                new THREE.MeshStandardMaterial({
                  color: 0x999999,
                  metalness: 0.9,
                  roughness: 0.3,
                })
              );
              cross1.rotation.x = Math.PI / 4;
              segment.add(cross1);

              const cross2 = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8),
                new THREE.MeshStandardMaterial({
                  color: 0x999999,
                  metalness: 0.9,
                  roughness: 0.3,
                })
              );
              cross2.rotation.x = -Math.PI / 4;
              segment.add(cross2);

              return segment;
            };

            for (let x = -1.6; x <= 1.6; x += 0.4) {
              truss.add(createTrussSegment(x));
            }

            const modulePositions = [
              {
                x: -1.2,
                y: 0,
                z: 0,
                type: "cylinder",
                scale: 1.0,
                color: 0xdddddd,
              },
              {
                x: -0.6,
                y: 0,
                z: 0,
                type: "cylinder",
                scale: 0.9,
                color: 0xcccccc,
              },
              { x: 0, y: 0, z: 0, type: "sphere", scale: 1.2, color: 0xeeeeee }, // Node module
              {
                x: 0.6,
                y: 0.1,
                z: 0,
                type: "cylinder",
                scale: 0.95,
                color: 0xbbbbbb,
              },
              {
                x: 1.2,
                y: 0,
                z: 0,
                type: "cylinder",
                scale: 1.0,
                color: 0xdddddd,
              },
            ];

            modulePositions.forEach(({ x, y, z, type, scale, color }, idx) => {
              let moduleGeom;
              if (type === "cylinder") {
                moduleGeom = new THREE.CylinderGeometry(
                  0.2 * scale,
                  0.2 * scale,
                  0.5,
                  24
                );
              } else {
                moduleGeom = new THREE.SphereGeometry(0.25 * scale, 24, 24);
              }

              const moduleMat = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.8,
                roughness: 0.3,
                envMapIntensity: 1.5,
              });

              const module = new THREE.Mesh(moduleGeom, moduleMat);
              if (type === "cylinder") {
                module.rotation.z = Math.PI / 2;
              }
              module.position.set(x, y, z);

              if (idx > 0) {
                const connector = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
                  new THREE.MeshStandardMaterial({
                    color: 0x666666,
                    metalness: 0.7,
                    roughness: 0.4,
                  })
                );
                connector.rotation.z = Math.PI / 2;
                connector.position.x = (x + modulePositions[idx - 1].x) / 2;
                connector.position.y = (y + modulePositions[idx - 1].y) / 2;
                connector.scale.x =
                  Math.abs(x - modulePositions[idx - 1].x) * 1.5;
                group.add(connector);
              }

              const port = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16),
                new THREE.MeshStandardMaterial({
                  color: 0x444444,
                  metalness: 0.6,
                  roughness: 0.4,
                })
              );
              port.rotation.x = Math.PI / 2;
              port.position.z = 0.3;
              module.add(port);

              if (type === "cylinder") {
                for (let j = 0; j < 2; j++) {
                  const windowObj = new THREE.Mesh(
                    new THREE.CircleGeometry(0.04, 16),
                    new THREE.MeshStandardMaterial({
                      color: 0x88ccff,
                      metalness: 0.9,
                      roughness: 0.1,
                      emissive: 0x4477aa,
                      emissiveIntensity: 0.5,
                      side: THREE.DoubleSide,
                    })
                  );
                  windowObj.position.y = 0.1 - j * 0.2;
                  windowObj.rotation.y = Math.PI / 2;
                  windowObj.position.x = 0.2;
                  module.add(windowObj);

                  const windowLight = new THREE.PointLight(0xccddff, 0.2, 0.3);
                  windowLight.position.set(0.2, 0.1 - j * 0.2, 0);
                  module.add(windowLight);
                }
              }

              if (idx % 2 === 0) {
                for (let i = 0; i < 4; i++) {
                  const angle = (i / 4) * Math.PI * 2;
                  const handrail = new THREE.Mesh(
                    new THREE.BoxGeometry(0.15, 0.01, 0.02),
                    new THREE.MeshStandardMaterial({
                      color: 0xffffff,
                      metalness: 0.7,
                      roughness: 0.3,
                    })
                  );
                  handrail.position.set(
                    type === "cylinder" ? 0 : Math.cos(angle) * 0.25 * scale,
                    Math.sin(angle) * 0.2 * scale,
                    type === "cylinder" ? Math.sin(angle) * 0.2 * scale : 0
                  );
                  handrail.rotation.x = type === "cylinder" ? 0 : -angle;
                  handrail.rotation.z = type === "cylinder" ? angle : 0;
                  module.add(handrail);
                }
              }

              group.add(module);
            });

            const panelPositions = [-2.0, -1.6, 1.6, 2.0];
            const sidePositions = [0.6, -0.6];

            panelPositions.forEach((x) => {
              sidePositions.forEach((z) => {
                const gimbal = new THREE.Group();
                gimbal.position.set(x, 0, 0);
                group.add(gimbal);

                const joint = new THREE.Mesh(
                  new THREE.SphereGeometry(0.06, 16, 16),
                  new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    metalness: 0.9,
                    roughness: 0.2,
                  })
                );
                gimbal.add(joint);

                const armBase = new THREE.Mesh(
                  new THREE.BoxGeometry(0.1, 0.1, 0.7),
                  new THREE.MeshStandardMaterial({
                    color: 0x999999,
                    metalness: 0.8,
                    roughness: 0.2,
                  })
                );
                armBase.position.set(0, 0, z / 2);
                gimbal.add(armBase);

                const trackingJoint = new THREE.Mesh(
                  new THREE.SphereGeometry(0.05, 16, 16),
                  new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    metalness: 0.9,
                    roughness: 0.2,
                  })
                );
                trackingJoint.position.set(0, 0, z);
                gimbal.add(trackingJoint);

                const panelMount = new THREE.Mesh(
                  new THREE.BoxGeometry(0.65, 0.05, 0.05),
                  new THREE.MeshStandardMaterial({
                    color: 0x777777,
                    metalness: 0.9,
                    roughness: 0.2,
                  })
                );
                panelMount.position.set(0, 0, z);
                gimbal.add(panelMount);

                const solarPanel = new THREE.Mesh(
                  new THREE.BoxGeometry(0.6, 0.02, 0.4),
                  new THREE.MeshStandardMaterial({
                    color: 0x2244aa,
                    metalness: 0.7,
                    roughness: 0.3,
                    emissive: 0x001133,
                    emissiveIntensity: 0.4,
                    side: THREE.DoubleSide,
                  })
                );
                solarPanel.position.set(0, 0, z);
                solarPanel.rotation.y = Math.PI / 2;

                const panelGrid = new THREE.Group();
                for (let i = 0; i < 12; i++) {
                  for (let j = 0; j < 8; j++) {
                    const cell = new THREE.Mesh(
                      new THREE.PlaneGeometry(0.045, 0.045),
                      new THREE.MeshBasicMaterial({
                        color: 0x0033aa,
                        side: THREE.DoubleSide,
                      })
                    );
                    cell.position.set(
                      -0.27 + i * 0.05,
                      0.011,
                      -0.18 + j * 0.05
                    );
                    cell.rotation.x = Math.PI / 2;
                    panelGrid.add(cell);
                  }
                }
                solarPanel.add(panelGrid);

                const panelReflection = new THREE.Mesh(
                  new THREE.PlaneGeometry(0.58, 0.38),
                  new THREE.MeshBasicMaterial({
                    color: 0x0055ff,
                    transparent: true,
                    opacity: 0.15,
                    side: THREE.DoubleSide,
                  })
                );
                panelReflection.position.set(0, 0.011, 0);
                panelReflection.rotation.x = Math.PI / 2;
                solarPanel.add(panelReflection);

                gimbal.add(solarPanel);
              });
            });

            const radiatorPositions = [-0.9, 0.9];

            radiatorPositions.forEach((x) => {
              const radiator = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.01, 0.4),
                new THREE.MeshStandardMaterial({
                  color: 0xffffff,
                  metalness: 0.5,
                  roughness: 0.4,
                  side: THREE.DoubleSide,
                  emissive: 0x555555,
                  emissiveIntensity: 0.1,
                })
              );
              radiator.position.set(x, -0.2, 0);
              radiator.rotation.x = Math.PI / 2;

              const tubePattern = new THREE.Group();
              for (let i = 0; i < 8; i++) {
                const tube = new THREE.Mesh(
                  new THREE.BoxGeometry(0.5, 0.005, 0.002),
                  new THREE.MeshBasicMaterial({ color: 0xcccccc })
                );
                tube.position.y = 0.006;
                tube.position.z = -0.18 + i * 0.05;
                tubePattern.add(tube);
              }
              radiator.add(tubePattern);

              group.add(radiator);
            });

            const createPulsingLight = (x, z, color) => {
              const light = new THREE.PointLight(color, 0.7, 0.4);
              light.position.set(x, 0, z);

              const lightBulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 8, 8),
                new THREE.MeshBasicMaterial({
                  color: color,
                  emissive: color,
                  emissiveIntensity: 0.8,
                })
              );
              lightBulb.position.set(x, 0, z);
              group.add(lightBulb);

              const pulseFrequency = 0.5 + Math.random() * 1.0;
              const animate = () => {
                const time = Date.now() * 0.001;
                const pulse = 0.5 + 0.5 * Math.sin(time * pulseFrequency);
                light.intensity = 0.3 + pulse * 0.5;
                lightBulb.material.emissiveIntensity = 0.4 + pulse * 0.6;

                requestAnimationFrame(animate);
              };
              animate();

              group.add(light);
            };

            createPulsingLight(-1.7, 0, 0xff0000);
            createPulsingLight(1.7, 0, 0x00ff00);
            createPulsingLight(0, 0.2, 0xffffff);

            const roverArm = new THREE.Group();
            roverArm.position.set(0.4, 0.1, 0.3);

            const shoulderJoint = new THREE.Mesh(
              new THREE.SphereGeometry(0.05, 16, 16),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            roverArm.add(shoulderJoint);

            const upperArm = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            upperArm.position.set(0, 0, 0.25);
            upperArm.rotation.x = Math.PI / 2;
            roverArm.add(upperArm);

            const elbowJoint = new THREE.Mesh(
              new THREE.SphereGeometry(0.04, 16, 16),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            elbowJoint.position.set(0, 0, 0.5);
            roverArm.add(elbowJoint);

            const forearm = new THREE.Mesh(
              new THREE.CylinderGeometry(0.018, 0.018, 0.4, 8),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            forearm.position.set(0, -0.2, 0.5);
            forearm.rotation.x = -Math.PI / 4;
            roverArm.add(forearm);

            const wristJoint = new THREE.Mesh(
              new THREE.SphereGeometry(0.035, 16, 16),
              new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            wristJoint.position.set(0, -0.4, 0.3);
            roverArm.add(wristJoint);

            const gripper = new THREE.Group();
            gripper.position.set(0, -0.4, 0.3);

            const gripperBase = new THREE.Mesh(
              new THREE.CylinderGeometry(0.03, 0.025, 0.08, 8),
              new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            gripperBase.rotation.x = Math.PI / 2;
            gripper.add(gripperBase);

            [-1, 1].forEach((side) => {
              const finger = new THREE.Mesh(
                new THREE.BoxGeometry(0.01, 0.06, 0.02),
                new THREE.MeshStandardMaterial({
                  color: 0x888888,
                  metalness: 0.8,
                  roughness: 0.2,
                })
              );
              finger.position.set(side * 0.02, 0, 0.06);
              gripper.add(finger);
            });

            roverArm.add(gripper);
            group.add(roverArm);

            break;

          case "rover":
            const roverBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.4, 0.15, 0.5),
              new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.7,
                roughness: 0.3,
                envMapIntensity: 1.0,
              })
            );
            roverBody.position.y = 0.2;
            group.add(roverBody);

            const roverBodyDetail = new THREE.Mesh(
              new THREE.BoxGeometry(0.35, 0.08, 0.45),
              new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            roverBodyDetail.position.y = 0.25;
            group.add(roverBodyDetail);

            const roverRTG = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06, 0.06, 0.2, 12),
              new THREE.MeshStandardMaterial({
                color: 0x777777,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            roverRTG.position.set(-0.22, 0.2, -0.2);
            group.add(roverRTG);

            for (let i = 0; i < 8; i++) {
              const fin = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.01, 0.04),
                new THREE.MeshStandardMaterial({
                  color: 0x666666,
                  metalness: 0.7,
                  roughness: 0.3,
                })
              );
              fin.position.y = 0.2;
              fin.rotation.y = (i / 8) * Math.PI * 2;
              roverRTG.add(fin);
            }

            const rtgRoverGlow = new THREE.PointLight(0xff6a00, 0.4, 0.3);
            rtgRoverGlow.position.set(-0.22, 0.2, -0.2);
            group.add(rtgRoverGlow);

            const wheelPositions = [
              [-0.22, 0.12, 0.22],
              [-0.22, 0.12, -0.22],
              [0, 0.12, 0.22],
              [0, 0.12, -0.22],
              [0.22, 0.12, 0.22],
              [0.22, 0.12, -0.22],
            ];

            wheelPositions.forEach((pos) => {
              const wheelGroup = new THREE.Group();
              wheelGroup.position.set(pos[0], pos[1], pos[2]);

              const wheel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16),
                new THREE.MeshStandardMaterial({
                  color: 0x333333,
                  metalness: 0.5,
                  roughness: 0.7,
                  envMapIntensity: 0.8,
                })
              );
              wheel.rotation.z = Math.PI / 2;
              wheelGroup.add(wheel);

              for (let i = 0; i < 12; i++) {
                const tread = new THREE.Mesh(
                  new THREE.BoxGeometry(0.06, 0.11, 0.02),
                  new THREE.MeshStandardMaterial({
                    color: 0x222222,
                    metalness: 0.6,
                    roughness: 0.6,
                  })
                );
                tread.rotation.z = (i / 12) * Math.PI * 2;
                tread.position.x = Math.sin((i / 12) * Math.PI * 2) * 0.1;
                tread.position.y = Math.cos((i / 12) * Math.PI * 2) * 0.1;
                wheel.add(tread);
              }

              const hubCap = new THREE.Mesh(
                new THREE.CircleGeometry(0.06, 12),
                new THREE.MeshStandardMaterial({
                  color: 0x555555,
                  metalness: 0.8,
                  roughness: 0.3,
                  side: THREE.DoubleSide,
                })
              );
              hubCap.rotation.y = Math.PI / 2;
              hubCap.position.x = 0.025;
              wheel.add(hubCap);

              const suspension = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.02, 0.02),
                new THREE.MeshStandardMaterial({
                  color: 0x666666,
                  metalness: 0.7,
                  roughness: 0.4,
                })
              );
              suspension.position.x = -0.05;
              suspension.position.y = 0.05;
              wheelGroup.add(suspension);

              group.add(wheelGroup);
            });

            const mast = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.025, 0.3, 8),
              new THREE.MeshStandardMaterial({
                color: 0x999999,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            mast.position.set(0, 0.35, 0);
            group.add(mast);

            const cameraHead = new THREE.Mesh(
              new THREE.BoxGeometry(0.1, 0.08, 0.08),
              new THREE.MeshStandardMaterial({
                color: 0x333333,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            cameraHead.position.set(0, 0.5, 0);
            group.add(cameraHead);

            const cameraLensLeft = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16),
              new THREE.MeshStandardMaterial({
                color: 0x111111,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x222222,
                emissiveIntensity: 0.2,
              })
            );
            cameraLensLeft.rotation.x = Math.PI / 2;
            cameraLensLeft.position.set(-0.03, 0.5, 0.05);
            group.add(cameraLensLeft);

            const cameraLensRight = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16),
              new THREE.MeshStandardMaterial({
                color: 0x111111,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x222222,
                emissiveIntensity: 0.2,
              })
            );
            cameraLensRight.rotation.x = Math.PI / 2;
            cameraLensRight.position.set(0.03, 0.5, 0.05);
            group.add(cameraLensRight);

            const roverPanel = new THREE.Mesh(
              new THREE.BoxGeometry(0.3, 0.01, 0.3),
              new THREE.MeshStandardMaterial({
                color: 0x2244aa,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x001133,
                emissiveIntensity: 0.2,
                side: THREE.DoubleSide,
              })
            );
            roverPanel.position.set(0, 0.35, 0.15);
            roverPanel.rotation.x = -Math.PI / 6;
            group.add(roverPanel);

            const issArm = new THREE.Group();
            issArm.position.set(0.2, 0.25, 0.1);

            const armBase = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.03, 0.04, 8),
              new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            issArm.add(armBase);

            const armSegment1 = new THREE.Mesh(
              new THREE.BoxGeometry(0.15, 0.02, 0.02),
              new THREE.MeshStandardMaterial({
                color: 0x777777,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            armSegment1.position.x = 0.08;
            armSegment1.position.y = 0.05;
            issArm.add(armSegment1);

            const armJoint = new THREE.Mesh(
              new THREE.SphereGeometry(0.02, 8, 8),
              new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.6,
                roughness: 0.4,
              })
            );
            armJoint.position.x = 0.16;
            armJoint.position.y = 0.05;
            issArm.add(armJoint);

            const armSegment2 = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 0.02, 0.02),
              new THREE.MeshStandardMaterial({
                color: 0x777777,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            armSegment2.position.x = 0.16;
            armSegment2.position.y = 0.12;
            armSegment2.rotation.z = Math.PI / 3;
            issArm.add(armSegment2);

            const armTool = new THREE.Mesh(
              new THREE.BoxGeometry(0.04, 0.04, 0.03),
              new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            armTool.position.x = 0.23;
            armTool.position.y = 0.18;
            issArm.add(armTool);

            group.add(issArm);

            break;

          case "cassini":
            const cassiniBody = new THREE.Mesh(
              new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16),
              new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.7,
                roughness: 0.3,
                envMapIntensity: 1.2,
              })
            );
            group.add(cassiniBody);

            const cassiniDishGeom = new THREE.SphereGeometry(
              0.4,
              32,
              16,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2
            );
            const cassiniDishMat = new THREE.MeshStandardMaterial({
              color: 0xeeeeee,
              metalness: 0.8,
              roughness: 0.2,
              side: THREE.DoubleSide,
            });
            const cassiniDish = new THREE.Mesh(cassiniDishGeom, cassiniDishMat);
            cassiniDish.scale.set(1, 1, 0.2);
            cassiniDish.position.y = 0.35;
            cassiniDish.rotation.x = Math.PI;
            group.add(cassiniDish);

            const cassiniDishInterior = new THREE.Mesh(
              new THREE.CircleGeometry(0.38, 32),
              new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.7,
                roughness: 0.3,
                side: THREE.DoubleSide,
              })
            );
            cassiniDishInterior.position.y = 0.32;
            cassiniDishInterior.rotation.x = Math.PI;
            group.add(cassiniDishInterior);

            const antFeed = new THREE.Mesh(
              new THREE.CylinderGeometry(0.03, 0.02, 0.1, 8),
              new THREE.MeshStandardMaterial({
                color: 0x999999,
                metalness: 0.8,
                roughness: 0.2,
              })
            );
            antFeed.position.y = 0.22;
            group.add(antFeed);

            const rtgPositions = [
              [0.3, -0.1, 0],
              [-0.3, -0.1, 0],
            ];

            rtgPositions.forEach((pos, i) => {
              const rtgBoom = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8),
                new THREE.MeshStandardMaterial({
                  color: 0x999999,
                  metalness: 0.7,
                  roughness: 0.3,
                })
              );
              rtgBoom.rotation.z = Math.PI / 2;
              rtgBoom.position.set(pos[0], pos[1], pos[2]);
              group.add(rtgBoom);

              const rtgUnit = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12),
                new THREE.MeshStandardMaterial({
                  color: 0x666666,
                  metalness: 0.7,
                  roughness: 0.3,
                })
              );
              rtgUnit.position.set(
                pos[0] + (i === 0 ? 0.35 : -0.35),
                pos[1],
                pos[2]
              );
              rtgUnit.rotation.z = Math.PI / 2;
              group.add(rtgUnit);

              for (let j = 0; j < 8; j++) {
                const fin = new THREE.Mesh(
                  new THREE.BoxGeometry(0.15, 0.01, 0.04),
                  new THREE.MeshStandardMaterial({
                    color: 0x555555,
                    metalness: 0.8,
                    roughness: 0.2,
                  })
                );
                fin.position.y = 0;
                fin.rotation.y = (j / 8) * Math.PI * 2;
                rtgUnit.add(fin);
              }

              const cassiniRtgGlow = new THREE.PointLight(0xff6a00, 0.5, 0.4);
              cassiniRtgGlow.position.set(
                pos[0] + (i === 0 ? 0.35 : -0.35),
                pos[1],
                pos[2]
              );
              group.add(cassiniRtgGlow);
            });

            const magBoom = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8),
              new THREE.MeshStandardMaterial({
                color: 0x999999,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            magBoom.position.set(0, 0, -0.5);
            magBoom.rotation.x = Math.PI / 2;
            group.add(magBoom);

            const magInstrument = new THREE.Mesh(
              new THREE.BoxGeometry(0.07, 0.07, 0.07),
              new THREE.MeshStandardMaterial({
                color: 0x333333,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            magInstrument.position.set(0, 0, -0.85);
            group.add(magInstrument);

            const huygens = new THREE.Group();
            huygens.position.set(0, -0.25, 0.2);

            const huygensCone = new THREE.Mesh(
              new THREE.ConeGeometry(0.12, 0.15, 16),
              new THREE.MeshStandardMaterial({
                color: 0xcc9966,
                metalness: 0.5,
                roughness: 0.5,
                envMapIntensity: 1.0,
              })
            );
            huygensCone.rotation.x = Math.PI;
            huygens.add(huygensCone);

            const huygenHeatShield = new THREE.Mesh(
              new THREE.CircleGeometry(0.12, 16),
              new THREE.MeshStandardMaterial({
                color: 0xaa7755,
                metalness: 0.3,
                roughness: 0.8,
                side: THREE.DoubleSide,
              })
            );
            huygenHeatShield.position.y = 0.075;
            huygenHeatShield.rotation.x = Math.PI / 2;
            huygens.add(huygenHeatShield);

            const shieldPattern = new THREE.Mesh(
              new THREE.RingGeometry(0.04, 0.11, 16),
              new THREE.MeshStandardMaterial({
                color: 0x995533,
                metalness: 0.3,
                roughness: 0.8,
                side: THREE.DoubleSide,
              })
            );
            shieldPattern.position.y = 0.076;
            shieldPattern.rotation.x = Math.PI / 2;
            huygens.add(shieldPattern);

            group.add(huygens);

            const instrumentDeck = new THREE.Mesh(
              new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16),
              new THREE.MeshStandardMaterial({
                color: 0xbbbbbb,
                metalness: 0.7,
                roughness: 0.3,
              })
            );
            instrumentDeck.position.y = -0.1;
            group.add(instrumentDeck);

            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const r = 0.13;
              const x = Math.cos(angle) * r;
              const z = Math.sin(angle) * r;

              const instrument = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.04, 0.04),
                new THREE.MeshStandardMaterial({
                  color: 0x444444,
                  metalness: 0.7,
                  roughness: 0.3,
                  envMapIntensity: 1.0,
                })
              );
              instrument.position.set(x, -0.08, z);
              group.add(instrument);
            }

            break;

          default:
            const fallbackBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.3, 0.3, 0.6),
              new THREE.MeshStandardMaterial({
                color: color || 0xdddddd,
                metalness: 0.7,
                roughness: 0.3,
                envMapIntensity: 1.0,
              })
            );
            group.add(fallbackBody);

            const fallbackDish = new THREE.Mesh(
              new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16),
              new THREE.MeshStandardMaterial({
                color: 0xeeeeee,
                metalness: 0.7,
                roughness: 0.3,
                envMapIntensity: 1.2,
              })
            );
            fallbackDish.rotation.x = Math.PI / 2;
            fallbackDish.position.z = 0.3;
            group.add(fallbackDish);
        }

        const glowLight = new THREE.PointLight(0x4477ff, 0.5, 1.5);
        glowLight.position.set(0, 0, 0);
        group.add(glowLight);

        return group;
      };

      spacecraftData.forEach((spacecraft) => {
        if (isMobile) {
          spacecraft.scale *= 0.8;
        }
        const model = createSimpleModel(spacecraft.modelType, 0xdddddd);
        if (isMobile) {
          spacecraft.scale *= 0.8;
        }
        model.scale.set(spacecraft.scale, spacecraft.scale, spacecraft.scale);

        let startPos = new THREE.Vector3();

        if (spacecraft.startPlanet && planets[spacecraft.startPlanet]) {
          const planetPos =
            planets[spacecraft.startPlanet].container.position.clone();

          if (spacecraft.orbitType === "landed") {
            const surfacePos = spacecraft.landLocation
              .clone()
              .multiplyScalar(planets[spacecraft.startPlanet].data.radius);
            startPos.copy(planetPos).add(surfacePos);

            model.up = new THREE.Vector3(0, 1, 0);
            model.lookAt(planetPos);
          } else {
            const orbitRadius =
              spacecraft.distance ||
              planets[spacecraft.startPlanet].data.radius * 2.5;
            const angle = spacecraft.angle || Math.random() * Math.PI * 2;
            const height = spacecraft.height || 0;

            const x = orbitRadius * Math.cos(angle);
            const z = orbitRadius * Math.sin(angle);

            startPos = new THREE.Vector3(
              planetPos.x + x,
              planetPos.y + height,
              planetPos.z + z
            );

            const tangent = new THREE.Vector3(-z, 0, x).normalize();
            const normal = new THREE.Vector3(x, 0, z).normalize();

            model.up = normal;
            model.lookAt(model.position.clone().add(tangent));
          }
        } else if (spacecraft.startPosition) {
          startPos.copy(spacecraft.startPosition);

          if (spacecraft.orbitType === "escape") {
            model.lookAt(model.position.clone().add(spacecraft.escapeVector));
          }
        } else {
          const distance = spacecraft.distance || 100;
          const angle = spacecraft.angle || Math.random() * Math.PI * 2;

          startPos.set(
            distance * Math.cos(angle),
            (Math.random() - 0.5) * 20,
            distance * Math.sin(angle)
          );
        }

        const container = new THREE.Object3D();
        container.position.copy(startPos);
        container.add(model);
        scene.add(container);

        let trail;
        if (spacecraft.orbitType !== "landed") {
          const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.8,
            linewidth: 2,
          });

          const trailGeometry = new THREE.BufferGeometry();
          const trailPositions = new Float32Array(200 * 3);
          trailGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(trailPositions, 3)
          );

          trail = new THREE.Line(trailGeometry, trailMaterial);
          scene.add(trail);

          const trailGlowMaterial = new THREE.LineBasicMaterial({
            color: 0x77ccff,
            transparent: true,
            opacity: 0.4,
            linewidth: 4,
          });

          const trailGlowGeometry = new THREE.BufferGeometry();
          trailGlowGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(trailPositions.slice(), 3)
          );

          const trailGlow = new THREE.Line(
            trailGlowGeometry,
            trailGlowMaterial
          );
          scene.add(trailGlow);

          spacecraft.trailGlow = trailGlow;
        }

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = 256;
        canvas.height = 64;

        context.font = "Bold 24px Arial";
        context.textAlign = "center";
        context.fillStyle = "rgba(255, 255, 255, 1.0)";
        context.fillText(spacecraft.name, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });

        const label = new THREE.Sprite(labelMaterial);
        const labelScale = 3;
        label.scale.set(labelScale, labelScale / 4, 1);
        label.position.set(0, model.scale.y * 2.5, 0);
        label.visible = false;

        model.add(label);

        const highlightSphere = new THREE.Mesh(
          new THREE.SphereGeometry(2, 16, 16),
          new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide,
          })
        );
        highlightSphere.visible = false;
        model.add(highlightSphere);

        spacecraft.highlightSphere = highlightSphere;

        spacecrafts[spacecraft.name] = {
          mesh: model,
          container: container,
          data: spacecraft,
          trail: trail,
          trailPositions: [],
          angle: spacecraft.angle || 0,
          label,
        };
      });

      return spacecrafts;
    };

    if (planets["Saturn"] && planets["Saturn"].data.rings) {
      const saturnMesh = planets["Saturn"].mesh;

      if (planets["Saturn"].data.enhancedRings && !isLowPerformance) {
        const ringsGroup = new THREE.Group();
        saturnMesh.add(ringsGroup);

        const createRing = (innerRadius, outerRadius, segments, shader) => {
          const ringGeometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            segments,
            8
          );

          const pos = ringGeometry.attributes.position;
          const v3 = new THREE.Vector3();
          const uv = [];

          for (let i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i);
            const distance = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
            const normalizedDistance =
              (distance - innerRadius) / (outerRadius - innerRadius);
            uv.push(normalizedDistance, 0);
          }

          ringGeometry.setAttribute(
            "uv",
            new THREE.Float32BufferAttribute(uv, 2)
          );

          const ringMesh = new THREE.Mesh(ringGeometry, shader);
          ringMesh.rotation.x = Math.PI / 2;
          ringsGroup.add(ringMesh);

          return ringMesh;
        };

        const createRingShader = (params) => {
          return new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
              innerColor: {
                value: new THREE.Color(params.innerColor || 0xfae5c0),
              },
              outerColor: {
                value: new THREE.Color(params.outerColor || 0xc2905c),
              },
              opacity: { value: params.opacity || 0.9 },
              detail: { value: params.detail || 1.0 },
              noiseStrength: { value: params.noiseStrength || 0.4 },
              twistStrength: { value: params.twistStrength || 0.5 },
            },
            vertexShader: `
              varying vec2 vUv;
              varying vec3 vPosition;
              varying vec3 vNormal;
              
              void main() {
                vUv = uv;
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float time;
              uniform vec3 innerColor;
              uniform vec3 outerColor;
              uniform float opacity;
              uniform float detail;
              uniform float noiseStrength;
              uniform float twistStrength;
              
              varying vec2 vUv;
              varying vec3 vPosition;
              varying vec3 vNormal;
              
              float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
              }
              
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
              }
              
              float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for (int i = 0; i < 5; i++) {
                  value += amplitude * noise(p * frequency);
                  amplitude *= 0.5;
                  frequency *= 2.0;
                }
                
                return value;
              }
              
              void main() {
                float r = vUv.x;
                
                float gaps = 0.0;
                
                if (r > 0.48 && r < 0.55) {
                  gaps = smoothstep(0.48, 0.5, r) - smoothstep(0.53, 0.55, r);
                  gaps = pow(gaps, 0.5) * 0.9;
                }
                
                if (r > 0.73 && r < 0.75) {
                  gaps += smoothstep(0.73, 0.735, r) - smoothstep(0.745, 0.75, r);
                  gaps = min(1.0, gaps);
                }
                
                if (r > 0.88 && r < 0.89) {
                  gaps += smoothstep(0.88, 0.883, r) - smoothstep(0.887, 0.89, r);
                  gaps = min(1.0, gaps);
                }
                
                if (r > 0.3 && r < 0.32) {
                  gaps += smoothstep(0.3, 0.305, r) - smoothstep(0.315, 0.32, r);
                  gaps = min(1.0, gaps);
                }
                
                float ringletAngularFreq = 500.0 * detail;
                float angularPos = atan(vPosition.z, vPosition.x);
                float ringletPattern = sin(angularPos * ringletAngularFreq + r * 100.0 * twistStrength + time * 0.1);
                
                float densityWaves = sin(r * 120.0 * detail + ringletPattern * 0.1 + time * 0.05);
                densityWaves = densityWaves * 0.5 + 0.5;
                
                float detailNoise = fbm(vec2(angularPos * 20.0, r * 200.0 * detail + time * 0.02));
                float largeNoise = fbm(vec2(angularPos * 5.0 + time * 0.01, r * 30.0));
                
                float combinedNoise = mix(detailNoise, largeNoise, 0.5) * noiseStrength;
                
                float ringDensity = 1.0;
                
                if (r < 0.4) {
                  ringDensity = mix(0.3, 0.7, r / 0.4);
                } 
                else if (r < 0.55) {
                  ringDensity = 0.9;
                } 
                else {
                  ringDensity = mix(0.8, 0.7, (r - 0.55) / 0.45);
                }
                
                ringDensity *= (0.8 + detailNoise * 0.4);
                
                float spokeEffect = 0.0;
                for (int i = 0; i < 5; i++) {
                  float idx = float(i);
                  float spokeLoc = mod(time * 0.02 + idx * 1.2, 6.28);
                  float spokeWidth = 0.2 + idx * 0.05;
                  float spokeDist = abs(angularPos - spokeLoc);
                  spokeDist = min(spokeDist, 6.28 - spokeDist);
                  
                  spokeEffect += (1.0 - smoothstep(0.0, spokeWidth, spokeDist)) * 0.2;
                }
                spokeEffect *= smoothstep(0.4, 0.5, r) - smoothstep(0.7, 0.8, r);
                
                float finalDensity = ringDensity;
                finalDensity = max(0.0, finalDensity - gaps);
                finalDensity *= (0.85 + densityWaves * 0.15);
                
                vec3 ringColor = mix(innerColor, outerColor, r * r);
                
                ringColor = mix(ringColor, vec3(0.9, 0.9, 0.85), spokeEffect);
                
                vec3 finalColor = ringColor;
                finalColor *= (0.8 + combinedNoise * 0.4);
                
                vec3 viewDirection = normalize(cameraPosition - vPosition);
                float specularIntensity = pow(max(0.0, dot(reflect(-vec3(0.0, 0.0, 1.0), vNormal), viewDirection)), 50.0);
                
                finalColor += vec3(0.8, 0.7, 0.6) * specularIntensity * 0.2;
                
                float lightFactor = max(0.2, abs(vNormal.z)) * 1.2;
                finalColor *= lightFactor;
                
                float finalOpacity = finalDensity * opacity;
                finalOpacity = max(0.0, min(1.0, finalOpacity));
                
                gl_FragColor = vec4(finalColor, finalOpacity);
              }
            `,
            side: THREE.DoubleSide,
            transparent: true,
            blending: THREE.CustomBlending,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendEquation: THREE.AddEquation,
            depthWrite: false,
          });
        };

        createRing(
          5,
          7.2,
          128,
          createRingShader({
            innerColor: 0xb19271,
            outerColor: 0xd7c89e,
            opacity: 0.7,
            detail: 0.9,
            noiseStrength: 0.5,
            twistStrength: 0.3,
          })
        );

        createRing(
          7.2,
          8.5,
          128,
          createRingShader({
            innerColor: 0xe5d5b5,
            outerColor: 0xf0e0c0,
            opacity: 0.9,
            detail: 1.3,
            noiseStrength: 0.6,
            twistStrength: 0.5,
          })
        );

        createRing(
          8.5,
          10,
          128,
          createRingShader({
            innerColor: 0xd9c7a0,
            outerColor: 0xc2aa85,
            opacity: 0.8,
            detail: 1.1,
            noiseStrength: 0.4,
            twistStrength: 0.4,
          })
        );

        createRing(
          10.1,
          10.4,
          128,
          createRingShader({
            innerColor: 0xcdb896,
            outerColor: 0xbaa37e,
            opacity: 0.6,
            detail: 1.5,
            noiseStrength: 0.7,
            twistStrength: 0.9,
          })
        );

        const ringHazeGeometry = new THREE.RingGeometry(4.8, 10.5, 128, 2);
        const ringHazeMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
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
              float r = vUv.x;
              float alpha = (1.0 - abs(r * 2.0 - 1.0)) * 0.15;
              
              if (r < 0.4) alpha *= r / 0.4;
              if (r > 0.9) alpha *= (1.0 - (r - 0.9) / 0.1);
              
              vec3 hazeColor = vec3(0.95, 0.9, 0.8);
              gl_FragColor = vec4(hazeColor, alpha);
            }
          `,
          side: THREE.DoubleSide,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const ringHaze = new THREE.Mesh(ringHazeGeometry, ringHazeMaterial);
        ringHaze.rotation.x = Math.PI / 2;
        ringsGroup.add(ringHaze);

        planets["Saturn"].ringMaterials = ringsGroup.children.map(
          (child) => child.material
        );
      } else {
        const ringGeometry = new THREE.RingGeometry(
          5,
          10,
          isLowPerformance ? 64 : 128
        );

        const pos = ringGeometry.attributes.position;
        const v3 = new THREE.Vector3();
        const uv = [];

        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const distance = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
          const normalizedDistance = (distance - 5) / (10 - 5);
          uv.push(normalizedDistance, 0);
        }

        ringGeometry.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(uv, 2)
        );

        const ringMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
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
          blending: THREE.AdditiveBlending,
        });

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = Math.PI / 2;
        saturnMesh.add(ringMesh);

        planets["Saturn"].ringMaterials = [ringMaterial];
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

        starGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(vertices, 3)
        );
        starGeometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3)
        );

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = 512;
        canvas.height = 128;

        const gradientGlow = context.createRadialGradient(
          256,
          64,
          10,
          256,
          64,
          80
        );
        gradientGlow.addColorStop(0, "rgba(100, 180, 255, 0.8)");
        gradientGlow.addColorStop(1, "rgba(100, 180, 255, 0)");

        context.fillStyle = gradientGlow;
        context.fillRect(0, 0, 512, 128);

        context.font = "Bold 40px Arial";
        context.textAlign = "center";
        context.strokeStyle = "rgba(0, 0, 0, 0.8)";
        context.lineWidth = 6;
        context.strokeText(spacecraft.name, 256, 64);

        context.fillStyle = "rgba(255, 255, 255, 1.0)";
        context.fillText(spacecraft.name, 256, 64);

        ctx.beginPath();
        ctx.arc(16, 16, 8, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.5, "rgba(240, 240, 255, 0.8)");
        gradient.addColorStop(1, "rgba(220, 220, 255, 0)");

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
          vertexColors: true,
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

        distantStarGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(distantStarVertices, 3)
        );
        distantStarGeometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(distantStarColors, 3)
        );

        const distantStarMaterial = new THREE.PointsMaterial({
          size: 1.8,
          map: distantStarTexture,
          transparent: true,
          alphaTest: 0.01,
          sizeAttenuation: true,
          vertexColors: true,
        });

        const distantStars = new THREE.Points(
          distantStarGeometry,
          distantStarMaterial
        );
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

        midStarGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(midStarVertices, 3)
        );
        midStarGeometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(midStarColors, 3)
        );

        const midStarMaterial = new THREE.PointsMaterial({
          size: 2.5,
          map: distantStarTexture,
          transparent: true,
          alphaTest: 0.01,
          sizeAttenuation: true,
          vertexColors: true,
        });

        const midStars = new THREE.Points(midStarGeometry, midStarMaterial);
        stars.add(midStars);

        for (let i = 0; i < 250; i++) {
          const radius = Math.random() * 0.4 + 0.1;
          const geometry = new THREE.SphereGeometry(radius, 8, 8);

          let color;
          const starType = Math.random();

          if (starType < 0.1) {
            color = new THREE.Color(
              0.9 + Math.random() * 0.1,
              0.2 + Math.random() * 0.2,
              0.1 + Math.random() * 0.1
            );
          } else if (starType < 0.2) {
            color = new THREE.Color(
              0.9 + Math.random() * 0.1,
              0.5 + Math.random() * 0.2,
              0.1 + Math.random() * 0.1
            );
          } else if (starType < 0.3) {
            color = new THREE.Color(
              0.9 + Math.random() * 0.1,
              0.8 + Math.random() * 0.2,
              0.3 + Math.random() * 0.2
            );
          } else if (starType < 0.45) {
            const base = 0.9 + Math.random() * 0.1;
            color = new THREE.Color(base, base, base);
          } else if (starType < 0.6) {
            color = new THREE.Color(
              0.7 + Math.random() * 0.2,
              0.8 + Math.random() * 0.2,
              0.9 + Math.random() * 0.1
            );
          } else if (starType < 0.7) {
            color = new THREE.Color(
              0.4 + Math.random() * 0.3,
              0.6 + Math.random() * 0.2,
              0.9 + Math.random() * 0.1
            );
          } else {
            color = new THREE.Color(
              0.6 + Math.random() * 0.2,
              0.4 + Math.random() * 0.2,
              0.9 + Math.random() * 0.1
            );
          }

          const material = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
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
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    }

    createStarField();

    const createPlanetLabels = () => {
      Object.entries(planets).forEach(([name, planet]) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = 256;
        canvas.height = 128;

        context.font = "Bold 40px Arial";
        context.textAlign = "center";
        context.fillStyle = "rgba(255, 255, 255, 1.0)";
        context.fillText(name, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        const labelScale = planet.data.radius * 4;
        sprite.scale.set(labelScale, labelScale / 2, 1);
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
    const spacecraft = createSpacecrafts();
    spacecraftRef.current = spacecraft;

    const clock = new THREE.Clock();
    let frameSkip = 0;
    const maxFrameSkip = isMobile ? 2 : 0;

    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      animationIdRef.current = animationId;

      if (isMobile) {
        frameSkip = (frameSkip + 1) % maxFrameSkip;
        if (frameSkip !== 0) {
          return;
        }
      }

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

      if (
        sunGlow &&
        sunGlow.material &&
        sunGlow.material.uniforms &&
        sunGlow.material.uniforms.time
      ) {
        sunGlow.material.uniforms.time.value += delta;
      }

      if (spacecraftRef.current && visibilityRef.current) {
        const visibility = visibilityRef.current;
        Object.values(spacecraftRef.current).forEach((spacecraft) => {
          spacecraft.container.visible = visibility.showSpacecraft;
          if (spacecraft.trail) {
            spacecraft.trail.visible =
              visibility.showSpacecraft && visibility.showOrbits;
          }
        });
      }

      if (starsRef.current) {
        starsRef.current.rotation.y +=
          0.0005 * delta * 60 * animationSpeedRef.current;
        starsRef.current.rotation.x +=
          0.0001 * delta * 60 * animationSpeedRef.current;
        starsRef.current.rotation.z +=
          0.0002 * delta * 60 * animationSpeedRef.current;
      }

      if (
        followingPlanetRef.current &&
        planetsRef.current[followingPlanetRef.current]
      ) {
        const planet = planetsRef.current[followingPlanetRef.current];

        const planetPos = new THREE.Vector3();
        planet.container.getWorldPosition(planetPos);

        let cameraDistance = 100;

        let maxMoonDistance = 0;
        if (
          moonsRef.current[followingPlanetRef.current] &&
          moonsRef.current[followingPlanetRef.current].length > 0
        ) {
          moonsRef.current[followingPlanetRef.current].forEach((moon) => {
            if (moon.data.distance > maxMoonDistance) {
              maxMoonDistance = moon.data.distance;
            }
          });
        }

        cameraDistance = planet.data.radius * 3 + maxMoonDistance * 2.5;

        const cameraOffset = new THREE.Vector3();
        cameraOffset.subVectors(
          cameraRef.current.position,
          controlsRef.current.target
        );
        cameraOffset.normalize().multiplyScalar(cameraDistance);

        controlsRef.current.target.copy(planetPos);

        const newCameraPos = new THREE.Vector3().addVectors(
          planetPos,
          cameraOffset
        );
        cameraRef.current.position.lerp(newCameraPos, 0.05);

        controlsRef.current.update();
      }

      if (planets["Earth"] && planets["Earth"].mesh) {
        const earthMesh = planets["Earth"].mesh;

        if (earthMesh.userData.cloudMesh) {
          earthMesh.userData.cloudMesh.rotation.y +=
            0.0003 * animationSpeedRef.current;
        }

        if (earthMesh.userData.nightMesh) {
          const nightMaterial = earthMesh.userData.nightMesh.material;
          if (nightMaterial.uniforms && nightMaterial.uniforms.sunDirection) {
            const sunDirection = new THREE.Vector3(0, 0, 0)
              .sub(planets["Earth"].container.position)
              .normalize();
            nightMaterial.uniforms.sunDirection.value = sunDirection;
          }
        }

        if (
          earthMesh.material &&
          earthMesh.material.uniforms &&
          earthMesh.material.uniforms.sunDirection
        ) {
          const sunDirection = new THREE.Vector3(0, 0, 0)
            .sub(planets["Earth"].container.position)
            .normalize();
          earthMesh.material.uniforms.sunDirection.value = sunDirection;
        }

        earthMesh.children.forEach((child) => {
          if (
            child.material &&
            child.material.uniforms &&
            child.material.uniforms.sunPosition
          ) {
            const sunPosition = new THREE.Vector3();
            child.material.uniforms.sunPosition.value = sunPosition
              .sub(planets["Earth"].container.position)
              .normalize();
          }
        });
      }

      if (planets["Mars"] && planets["Mars"].mesh) {
        const marsMesh = planets["Mars"].mesh;
        if (
          marsMesh.material &&
          marsMesh.material.uniforms &&
          marsMesh.material.uniforms.time
        ) {
          marsMesh.material.uniforms.time.value += delta;
        }
      }

      if (planets["Venus"] && planets["Venus"].mesh) {
        const venusMesh = planets["Venus"].mesh;
        if (
          venusMesh.material &&
          venusMesh.material.uniforms &&
          venusMesh.material.uniforms.time
        ) {
          venusMesh.material.uniforms.time.value += delta;
        }

        venusMesh.children.forEach((child) => {
          if (
            child.material &&
            child.material.uniforms &&
            child.material.uniforms.time
          ) {
            child.material.uniforms.time.value += delta;
          }
        });
      }

      if (planets["Neptune"] && planets["Neptune"].mesh) {
        const neptuneMesh = planets["Neptune"].mesh;
        if (
          neptuneMesh.material &&
          neptuneMesh.material.uniforms &&
          neptuneMesh.material.uniforms.time
        ) {
          neptuneMesh.material.uniforms.time.value += delta;
        }

        neptuneMesh.children.forEach((child) => {
          if (
            child.material &&
            child.material.uniforms &&
            child.material.uniforms.time
          ) {
            child.material.uniforms.time.value += delta;
          }
        });
      }

      if (planets["Uranus"] && planets["Uranus"].mesh) {
        const uranusMesh = planets["Uranus"].mesh;
        if (
          uranusMesh.material &&
          uranusMesh.material.uniforms &&
          uranusMesh.material.uniforms.time
        ) {
          uranusMesh.material.uniforms.time.value += delta;
        }

        uranusMesh.children.forEach((child) => {
          if (
            child.material &&
            child.material.uniforms &&
            child.material.uniforms.time
          ) {
            child.material.uniforms.time.value += delta;
          }
        });
      }

      Object.values(planetsRef.current).forEach((planet) => {
        if (
          planet.mesh &&
          planet.mesh.material &&
          planet.mesh.material.uniforms &&
          planet.mesh.material.uniforms.time
        ) {
          planet.mesh.material.uniforms.time.value += delta;
        }

        planet.mesh.children.forEach((child) => {
          if (
            child.material &&
            child.material.uniforms &&
            child.material.uniforms.time
          ) {
            child.material.uniforms.time.value += delta;
          }
        });
      });

      if (planets["Saturn"] && planets["Saturn"].mesh) {
        planets["Saturn"].mesh.children.forEach((child) => {
          if (
            child.material &&
            child.material.uniforms &&
            child.material.uniforms.time
          ) {
            child.material.uniforms.time.value += delta;
          }
        });

        if (planets["Saturn"].ringMaterials) {
          planets["Saturn"].ringMaterials.forEach((material) => {
            if (material.uniforms && material.uniforms.time) {
              material.uniforms.time.value += delta;
            }
          });
        }
      }

      if (planets["Jupiter"] && planets["Jupiter"].mesh) {
        const jupiterMesh = planets["Jupiter"].mesh;
        if (
          jupiterMesh.material &&
          jupiterMesh.material.uniforms &&
          jupiterMesh.material.uniforms.time
        ) {
          jupiterMesh.material.uniforms.time.value += delta;
        }
      }

      if (sceneRef.current && sceneRef.current.userData.animateGalaxies) {
        sceneRef.current.userData.animateGalaxies(delta);
      }

      const currentSpeed = animationSpeedRef.current;

      const visibility = visibilityRef.current;

      if (orbitsRef.current) {
        orbitsRef.current.forEach((orbit) => {
          orbit.visible = visibility.showOrbits;
        });
      }

      Object.values(planets).forEach((planet) => {
        planet.container.visible = visibility.showPlanets;

        planet.angle += planet.data.speed * currentSpeed;

        const distance = planet.data.distance;
        const eccentricity = planet.data.eccentricity || 0.05;
        const a = distance;
        const b = distance * Math.sqrt(1 - eccentricity * eccentricity);

        const x = a * Math.cos(planet.angle);
        const z = b * Math.sin(planet.angle);

        planet.container.position.set(x, 0, z);

        planet.mesh.rotation.y += planet.data.speed * 5 * currentSpeed;
      });

      Object.entries(moons).forEach(([planetName, planetMoons]) => {
        if (Array.isArray(planetMoons)) {
          planetMoons.forEach((moon) => {
            if (moon.mesh) {
              moon.mesh.visible = visibility.showMoons;
            }
            if (moon.orbit) {
              moon.orbit.visible =
                visibility.showOrbits && visibility.showMoons;
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

      if (asteroidsRef.current.length > 0) {
        const currentSpeed = animationSpeedRef.current;

        if (asteroidBeltRef.current) {
          asteroidBeltRef.current.rotation.y += 0.0002 * delta * currentSpeed;
        }

        asteroidsRef.current.forEach((asteroid) => {
          asteroid.mesh.rotation.x +=
            asteroid.rotationSpeed.x * delta * currentSpeed;
          asteroid.mesh.rotation.y +=
            asteroid.rotationSpeed.y * delta * currentSpeed;
          asteroid.mesh.rotation.z +=
            asteroid.rotationSpeed.z * delta * currentSpeed;

          asteroid.angle += asteroid.orbitSpeed * delta * currentSpeed;

          const x = asteroid.radius * Math.cos(asteroid.angle);
          const z = asteroid.radius * Math.sin(asteroid.angle);

          asteroid.mesh.position.x = x;
          asteroid.mesh.position.z = z;
        });
      }

      if (spacecraftRef.current) {
        Object.values(spacecraftRef.current).forEach((spacecraft) => {
          if (spacecraft.data.orbitType === "landed") {
            if (
              spacecraft.data.startPlanet &&
              planets[spacecraft.data.startPlanet]
            ) {
              const planetPos =
                planets[spacecraft.data.startPlanet].container.position.clone();
              const surfacePos = spacecraft.data.landLocation
                .clone()
                .multiplyScalar(
                  planets[spacecraft.data.startPlanet].data.radius
                );

              spacecraft.container.position.copy(planetPos).add(surfacePos);
              spacecraft.mesh.lookAt(planetPos);
            }
          } else if (spacecraft.data.orbitType === "planetary") {
            if (
              spacecraft.data.startPlanet &&
              planets[spacecraft.data.startPlanet]
            ) {
              const planetPos =
                planets[spacecraft.data.startPlanet].container.position.clone();

              spacecraft.angle += spacecraft.data.speed * currentSpeed;

              const orbitRadius =
                spacecraft.data.distance ||
                planets[spacecraft.data.startPlanet].data.radius * 2.5;
              const height = spacecraft.data.height || 0;

              const x = orbitRadius * Math.cos(spacecraft.angle);
              const z = orbitRadius * Math.sin(spacecraft.angle);

              spacecraft.container.position.set(
                planetPos.x + x,
                planetPos.y + height,
                planetPos.z + z
              );

              const tangent = new THREE.Vector3(-z, 0, x).normalize();
              const normal = new THREE.Vector3(x, 0, z).normalize();

              spacecraft.mesh.up = normal;
              spacecraft.mesh.lookAt(
                spacecraft.mesh.position.clone().add(tangent)
              );

              if (spacecraft.trail) {
                spacecraft.trailPositions.push(
                  spacecraft.container.position.clone()
                );
                if (spacecraft.trailPositions.length > (isMobile ? 50 : 200)) {
                  spacecraft.trailPositions.shift();
                }

                const positions =
                  spacecraft.trail.geometry.attributes.position.array;

                for (let i = 0; i < spacecraft.trailPositions.length; i++) {
                  const pos = spacecraft.trailPositions[i];
                  positions[i * 3] = pos.x;
                  positions[i * 3 + 1] = pos.y;
                  positions[i * 3 + 2] = pos.z;
                }

                spacecraft.trail.geometry.attributes.position.needsUpdate = true;
                spacecraft.trail.geometry.setDrawRange(
                  0,
                  spacecraft.trailPositions.length
                );

                if (spacecraft.trailGlow) {
                  spacecraft.trailGlow.geometry.attributes.position.array.set(
                    positions
                  );
                  spacecraft.trailGlow.geometry.attributes.position.needsUpdate = true;
                  spacecraft.trailGlow.geometry.setDrawRange(
                    0,
                    spacecraft.trailPositions.length
                  );
                }
              }
            }
          } else if (spacecraft.data.orbitType === "elliptical") {
            const params = spacecraft.data.orbitParams;
            spacecraft.angle +=
              (spacecraft.data.speed * currentSpeed) % (Math.PI * 2);

            const x = params.semiMajor * Math.cos(spacecraft.angle);
            const z = params.semiMinor * Math.sin(spacecraft.angle);

            const pos = new THREE.Vector3(x, 0, z);
            pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), params.incline || 0);
            pos.add(params.center || new THREE.Vector3(0, 0, 0));

            spacecraft.container.position.copy(pos);

            const tangent = new THREE.Vector3(
              -params.semiMajor * Math.sin(spacecraft.angle),
              0,
              params.semiMinor * Math.cos(spacecraft.angle)
            ).normalize();

            tangent.applyAxisAngle(
              new THREE.Vector3(1, 0, 0),
              params.incline || 0
            );

            spacecraft.mesh.lookAt(
              spacecraft.container.position.clone().add(tangent)
            );

            if (spacecraft.trail) {
              spacecraft.trailPositions.push(
                spacecraft.container.position.clone()
              );
              if (spacecraft.trailPositions.length > 100) {
                spacecraft.trailPositions.shift();
              }

              const positions =
                spacecraft.trail.geometry.attributes.position.array;

              for (let i = 0; i < spacecraft.trailPositions.length; i++) {
                const pos = spacecraft.trailPositions[i];
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
              }

              spacecraft.trail.geometry.attributes.position.needsUpdate = true;
              spacecraft.trail.geometry.setDrawRange(
                0,
                spacecraft.trailPositions.length
              );
            }
          } else if (spacecraft.data.orbitType === "escape") {
            const escapeVector =
              spacecraft.data.escapeVector || new THREE.Vector3(1, 0, 0);
            spacecraft.container.position.add(
              escapeVector
                .clone()
                .multiplyScalar(spacecraft.data.speed * currentSpeed)
            );

            if (spacecraft.trail) {
              spacecraft.trailPositions.push(
                spacecraft.container.position.clone()
              );
              if (spacecraft.trailPositions.length > 100) {
                spacecraft.trailPositions.shift();
              }

              const positions =
                spacecraft.trail.geometry.attributes.position.array;

              for (let i = 0; i < spacecraft.trailPositions.length; i++) {
                const pos = spacecraft.trailPositions[i];
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
              }

              spacecraft.trail.geometry.attributes.position.needsUpdate = true;
              spacecraft.trail.geometry.setDrawRange(
                0,
                spacecraft.trailPositions.length
              );
            }
          } else if (spacecraft.data.orbitType === "l2") {
            if (
              spacecraft.data.startPlanet &&
              planets[spacecraft.data.startPlanet]
            ) {
              const planetPos =
                planets[spacecraft.data.startPlanet].container.position.clone();

              const sunToPlanetDir = planetPos.clone().normalize();

              const l2Pos = planetPos
                .clone()
                .add(
                  sunToPlanetDir.multiplyScalar(spacecraft.data.distance || 10)
                );

              spacecraft.container.position.copy(l2Pos);

              spacecraft.mesh.lookAt(l2Pos.clone().add(sunToPlanetDir));
            }
          }

          if (selectedPlanet === spacecraft.data.name) {
            spacecraft.label.visible = true;
          } else {
            spacecraft.label.visible = false;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      if (canvasElement) {
        canvasElement.removeEventListener("pointermove", handlePointerMove);
        canvasElement.removeEventListener("pointerup", handlePointerUp);
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
            object.material.forEach((material) => material.dispose());
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

    if (highlightAnimationRef.current) {
      cancelAnimationFrame(highlightAnimationRef.current);
      highlightAnimationRef.current = null;
    }
  }, [isMobile, handlePointerMove, handlePointerUp]);

  const followingPlanetRef = useRef(null);

  const focusOnPlanet = useCallback((objectName) => {
    if (!cameraRef.current || !controlsRef.current) return;

    if (focusAnimationIdRef.current) {
      cancelAnimationFrame(focusAnimationIdRef.current);
    }

    followingPlanetRef.current = objectName;

    const isSpacecraft =
      spacecraftRef.current && spacecraftRef.current[objectName];
    const isPlanet = planetsRef.current && planetsRef.current[objectName];

    if (isSpacecraft) {
      const animate = () => {
        const spacecraft = spacecraftRef.current[objectName];

        if (!spacecraft || !cameraRef.current || !controlsRef.current) {
          if (focusAnimationIdRef.current) {
            cancelAnimationFrame(focusAnimationIdRef.current);
            focusAnimationIdRef.current = null;
          }
          return;
        }

        const targetPos = new THREE.Vector3();
        spacecraft.container.getWorldPosition(targetPos);

        if (
          spacecraft.data.startPlanet &&
          spacecraft.data.orbitType === "planetary"
        ) {
          const planet = planetsRef.current[spacecraft.data.startPlanet];

          if (planet) {
            const planetPos = new THREE.Vector3();
            planet.container.getWorldPosition(planetPos);

            const midpoint = new THREE.Vector3()
              .addVectors(targetPos, planetPos)
              .multiplyScalar(0.5);
            const distance = targetPos.distanceTo(planetPos) * 1.5;

            const offsetDir = new THREE.Vector3()
              .subVectors(cameraRef.current.position, midpoint)
              .normalize();
            const offset = offsetDir.multiplyScalar(distance);

            controlsRef.current.target.lerp(midpoint, 0.05);
            cameraRef.current.position.lerp(
              new THREE.Vector3().addVectors(midpoint, offset),
              0.05
            );
          } else {
            controlsRef.current.target.lerp(targetPos, 0.05);

            const distance = spacecraft.data.scale * 20;
            const offsetDir = new THREE.Vector3()
              .subVectors(cameraRef.current.position, targetPos)
              .normalize();
            const offset = offsetDir.multiplyScalar(distance);

            cameraRef.current.position.lerp(
              new THREE.Vector3().addVectors(targetPos, offset),
              0.05
            );
          }
        } else {
          controlsRef.current.target.lerp(targetPos, 0.05);

          const distance = spacecraft.data.scale * 20;
          const offsetDir = new THREE.Vector3()
            .subVectors(cameraRef.current.position, targetPos)
            .normalize();
          const offset = offsetDir.multiplyScalar(distance);

          cameraRef.current.position.lerp(
            new THREE.Vector3().addVectors(targetPos, offset),
            0.05
          );
        }

        controlsRef.current.update();

        focusAnimationIdRef.current = requestAnimationFrame(animate);
      };

      animate();
    } else {
      const planet = objectName ? planetsRef.current[objectName] : null;

      const targetPos = new THREE.Vector3();

      if (planet) {
        planet.container.getWorldPosition(targetPos);

        if (planet.mesh) {
          const meshOffset = new THREE.Vector3();
          planet.mesh.getWorldPosition(meshOffset);
          planet.container.getWorldPosition(targetPos);
        }
      } else {
        targetPos.set(0, 0, 0);
      }

      let distance = 100;

      if (planet) {
        let maxMoonDistance = 0;

        if (
          moonsRef.current[objectName] &&
          moonsRef.current[objectName].length > 0
        ) {
          moonsRef.current[objectName].forEach((moon) => {
            if (moon.data.distance > maxMoonDistance) {
              maxMoonDistance = moon.data.distance;
            }
          });
        }

        distance = planet.data.radius * 3 + maxMoonDistance * 2.5;
      }

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

          cameraRef.current.position.lerpVectors(
            startPos,
            endPos,
            easeOutCubic
          );

          const currentTarget = new THREE.Vector3().lerpVectors(
            startTarget,
            targetPos,
            easeOutCubic
          );
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
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isMobile) {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
      } else if (!animationIdRef.current) {
        animationIdRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isMobile]);

  const toggleControlPanel = () => {
    setControlsOpen(!controlsOpen);
  };

  return (
    <>
      <GoogleAnalytics />
      <div className="w-full h-screen bg-black relative overflow-hidden">
        <div ref={mountRef} className="w-full h-full" />

        {hoveredPlanet && (
          <div
            id="planet-tooltip"
            className="absolute bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium z-50 pointer-events-none transform-gpu"
            style={{
              left: mousePositionRef.current.x + 15,
              top: mousePositionRef.current.y - 15,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              boxShadow:
                "0 4px 6px rgba(0, 0, 0, 0.5), 0 0 10px rgba(100, 200, 255, 0.3)",
              opacity: 0.9,
              transition: "opacity 0.2s ease, transform 0.1s ease-out",
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    controlsOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>
        )}

        <div
          className={`absolute ${
            isMobile
              ? "top-4 left-4 right-20 max-w-xs"
              : "top-4 left-4 max-w-xs"
          } 
                   bg-gray-900 bg-opacity-60 ${
                     isMobile ? "p-3" : "p-5"
                   } rounded-2xl text-white shadow-xl backdrop-filter backdrop-blur-lg 
                   border-t border-l border-r border-blue-500/50 border-b transition-all duration-300 transform z-20
                   ${
                     isMobile && !controlsOpen
                       ? "-translate-y-full opacity-0"
                       : "translate-y-0 opacity-100"
                   }`}
          style={{
            boxShadow:
              "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(30, 120, 255, 0.4)",
            background:
              "linear-gradient(135deg, rgba(23, 25, 35, 0.8), rgba(15, 17, 25, 0.9))",
          }}
        >
          <h2
            className={`${isMobile ? "text-xl" : "text-2xl"} font-bold ${
              isMobile ? "mb-3" : "mb-5"
            } text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500`}
          >
            Void Voyager
          </h2>

          <div className={`${isMobile ? "space-y-2" : "space-y-4"}`}>
            <div className="grid grid-cols-4 gap-2">
              <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-300 transition-colors duration-200 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showPlanets}
                    onChange={(e) => setShowPlanets(e.target.checked)}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-2 rounded-md h-5 w-5 flex flex-shrink-0 justify-center items-center
          ${
            showPlanets
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent"
              : "border-blue-400/50 bg-gray-800/50"
          }`}
                  >
                    <svg
                      className={`h-3 w-3 text-white ${
                        showPlanets ? "opacity-100" : "opacity-0"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <Globe className="w-4 h-4 text-blue-300" />
              </label>

              <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-300 transition-colors duration-200 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showOrbits}
                    onChange={(e) => setShowOrbits(e.target.checked)}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-2 rounded-md h-5 w-5 flex flex-shrink-0 justify-center items-center
          ${
            showOrbits
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent"
              : "border-blue-400/50 bg-gray-800/50"
          }`}
                  >
                    <svg
                      className={`h-3 w-3 text-white ${
                        showOrbits ? "opacity-100" : "opacity-0"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <Orbit className="w-4 h-4 text-blue-300" />
              </label>

              <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-300 transition-colors duration-200 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showMoons}
                    onChange={(e) => setShowMoons(e.target.checked)}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-2 rounded-md h-5 w-5 flex flex-shrink-0 justify-center items-center
          ${
            showMoons
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent"
              : "border-blue-400/50 bg-gray-800/50"
          }`}
                  >
                    <svg
                      className={`h-3 w-3 text-white ${
                        showMoons ? "opacity-100" : "opacity-0"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <Moon className="w-4 h-4 text-blue-300" />
              </label>

              <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-300 transition-colors duration-200 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showSpacecraft}
                    onChange={(e) => setShowSpacecraft(e.target.checked)}
                    className="opacity-0 absolute h-5 w-5"
                  />
                  <div
                    className={`border-2 rounded-md h-5 w-5 flex flex-shrink-0 justify-center items-center
          ${
            showSpacecraft
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent"
              : "border-blue-400/50 bg-gray-800/50"
          }`}
                  >
                    <svg
                      className={`h-3 w-3 text-white ${
                        showSpacecraft ? "opacity-100" : "opacity-0"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <Rocket className="w-4 h-4 text-blue-300" />
              </label>
            </div>
          </div>

          <div className={`${isMobile ? "mt-3" : "mt-5"}`}>
            <p className="text-xs font-medium text-blue-300 mb-1 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Orbital Speed
            </p>
            <div className="flex items-center space-x-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-blue-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
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
                  onChange={(e) =>
                    setSpeedMultiplier(parseFloat(e.target.value))
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </div>
          </div>

          <div className={`${isMobile ? "mt-3" : "mt-5"}`}>
            <p className="text-xs font-medium text-blue-300 mb-1 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Focus Planet & Spacecraft
            </p>
            <div className="relative w-full">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-black/60 backdrop-blur-lg text-white font-semibold text-lg py-3.5 px-5 rounded-2xl border-l border-t border-r border-b border-purple-500/30 hover:border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-fuchsia-600/5 to-purple-600/10 opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>

                <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 blur-sm transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1500 ease-out"></div>

                <div className="flex items-center space-x-2.5">
                  <span className="text-purple-300 transform group-hover:scale-110 transition-transform duration-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0110 2c-2.76 0-5 2.24-5 5v1h-.5A1.5 1.5 0 003 9.5v.5c0 .97.23 1.89.65 2.7" />
                      <path d="M14.5 11H14v-.5c0-.83-.67-1.5-1.5-1.5h-1v.5a.5.5 0 01-.5.5H9.5a.5.5 0 01-.5-.5V9H8c-.55 0-1 .45-1 1v1h-.5A1.5 1.5 0 005 12.5V13c0 .97.23 1.89.65 2.7" />
                    </svg>
                  </span>
                  <span className="bg-gradient-to-br from-white via-purple-100 to-purple-200 text-transparent bg-clip-text">
                    {selectedPlanet || "Solar System"}
                  </span>
                </div>

                <div className="relative z-10 rounded-full p-1.5 bg-purple-900/40 group-hover:bg-purple-800/50 transition-colors duration-300">
                  <svg
                    className="w-4 h-4 text-purple-300 transform transition-all duration-300 group-hover:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={isDropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                    />
                  </svg>
                </div>
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute z-50 w-full mt-1 bg-gray-800/95 rounded-lg shadow-lg border border-blue-500/30 overflow-hidden"
                  style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    backdropFilter: "blur(10px)",
                    boxShadow:
                      "0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <div
                    className="px-4 py-2 cursor-pointer hover:bg-blue-500/20 transition-colors border-b border-blue-500/20"
                    onClick={() => {
                      setSelectedPlanet(null);
                      setIsDropdownOpen(false);

                      if (cameraRef.current && controlsRef.current) {
                        const initialPos = new THREE.Vector3(0, 30, 100);
                        const initialTarget = new THREE.Vector3(0, 0, 0);

                        if (focusAnimationIdRef.current) {
                          cancelAnimationFrame(focusAnimationIdRef.current);
                          focusAnimationIdRef.current = null;
                        }

                        followingPlanetRef.current = null;

                        let frame = 0;
                        const totalFrames = 100;
                        const startPos = cameraRef.current.position.clone();
                        const startTarget = controlsRef.current.target.clone();

                        const animateReset = () => {
                          if (frame <= totalFrames) {
                            const progress = frame / totalFrames;
                            const easeOutCubic = 1 - Math.pow(1 - progress, 3);

                            cameraRef.current.position.lerpVectors(
                              startPos,
                              initialPos,
                              easeOutCubic
                            );
                            controlsRef.current.target.lerpVectors(
                              startTarget,
                              initialTarget,
                              easeOutCubic
                            );
                            controlsRef.current.update();

                            frame++;
                            focusAnimationIdRef.current =
                              requestAnimationFrame(animateReset);
                          }
                        };

                        animateReset();
                      }

                      controlsRef.current.enableDamping = true;
                      controlsRef.current.enableRotate = true;
                      controlsRef.current.enableZoom = true;
                      if (isMobile) {
                        setControlsOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-2 text-yellow-400" />
                      <span>Solar System</span>
                    </div>
                  </div>

                  <div className="border-b border-blue-500/20">
                    <div className="px-4 py-1 text-xs text-blue-300 font-medium bg-blue-900/20">
                      Planets
                    </div>
                    {[
                      "Mercury",
                      "Venus",
                      "Earth",
                      "Mars",
                      "Jupiter",
                      "Saturn",
                      "Uranus",
                      "Neptune",
                    ].map((planet) => (
                      <div
                        key={planet}
                        className="px-4 py-2 pl-6 cursor-pointer hover:bg-blue-500/20 transition-colors"
                        onClick={() => {
                          setSelectedPlanet(planet);
                          setIsDropdownOpen(false);
                          focusOnPlanet(planet);
                          if (isMobile) {
                            setControlsOpen(false);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <CircleDashed className="w-3 h-3 mr-2 text-blue-400" />
                          <span>{planet}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="px-4 py-1 text-xs text-blue-300 font-medium bg-blue-900/20">
                      Spacecrafts
                    </div>
                    {[
                      "Voyager 1",
                      "Voyager 2",
                      "New Horizons",
                      "Parker Solar Probe",
                      "James Webb",
                      "ISS",
                      "Perseverance",
                      "Cassini",
                      "Aditya L1",
                      "Mangalyaan",
                    ].map((spacecraft) => (
                      <div
                        key={spacecraft}
                        className="px-4 py-2 pl-6 cursor-pointer hover:bg-blue-500/20 transition-colors"
                        onClick={() => {
                          setSelectedPlanet(spacecraft);
                          setIsDropdownOpen(false);
                          focusOnPlanet(spacecraft);
                          if (isMobile) {
                            setControlsOpen(false);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <Rocket className="w-3 h-3 mr-2 text-blue-400" />
                          <span>{spacecraft}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isMobile && (
            <div className="mt-2 text-xs text-gray-300 border-t border-gray-700 pt-2">
              <p className="flex items-center justify-center">
                <span className="inline-flex items-center mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                  Drag to rotate
                </span>
                <span className="inline-flex items-center mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Scroll to zoom
                </span>
                <span className="inline-flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                  Tap planet to select
                </span>
              </p>
            </div>
          )}

          <div
            className={`${
              isMobile ? "mt-3 text-xs" : "mt-4 text-xs"
            } text-center border-t border-gray-700 ${
              isMobile ? "pt-2" : "pt-3"
            } flex items-center justify-center space-x-2`}
          >
            <span>
              Made with ❤️ by{" "}
              <a
                href="https://pranavpawar.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Pranav
              </a>
            </span>
            <a
              href="https://github.com/Pranav2442"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Github size={14} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default VoidVoyager;
