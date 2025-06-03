
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Torus parameters
  const R_TORUS = 30; // Main radius of the torus
  const r_TORUS = 1; // Tube radius of the torus
  const CAMERA_OFFSET = 0.05; // Height of camera above actual surface
  const EFFECTIVE_TUBE_RADIUS = r_TORUS + CAMERA_OFFSET;

  // Earth parameters
  const EARTH_RADIUS = 20; 
  const EARTH_TEXTURE_URL = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_ocean_ice_cloud_2048.jpg';

  // Movement parameters
  const TOROIDAL_MOVE_SPEED = 0.025; 
  const POLOIDAL_MOVE_SPEED = 0.035; 
  const LOOK_AHEAD_DISTANCE = 1.5; 

  // Mouse control parameters
  const MOUSE_SENSITIVITY_X = 0.002;
  const MOUSE_SENSITIVITY_Y = 0.002;
  const MIN_PITCH = -Math.PI / 2 * 0.95; 
  const MAX_PITCH = Math.PI / 2 * 0.95;

  // Refs for camera position and movement state
  const cameraThetaRef = useRef<number>(0); 
  const cameraPhiRef = useRef<number>(Math.PI / 2); 
  
  const cameraViewYawRef = useRef<number>(0); 
  const cameraViewPitchRef = useRef<number>(0);

  const movementStateRef = useRef({
    forward: false,
    backward: false,
    left: false,    
    right: false,   
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null); 
  const earthTextureRef = useRef<THREE.Texture | null>(null);


  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    let dTheta = 0;
    let dPhi = 0;

    if (movementStateRef.current.forward) dTheta += TOROIDAL_MOVE_SPEED;
    if (movementStateRef.current.backward) dTheta -= TOROIDAL_MOVE_SPEED;
    if (movementStateRef.current.left) dPhi -= POLOIDAL_MOVE_SPEED;
    if (movementStateRef.current.right) dPhi += POLOIDAL_MOVE_SPEED;

    cameraThetaRef.current += dTheta;
    cameraPhiRef.current += dPhi;

    const theta = cameraThetaRef.current;
    const phi = cameraPhiRef.current;

    const posX = (R_TORUS + EFFECTIVE_TUBE_RADIUS * Math.cos(phi)) * Math.cos(theta);
    const posY = (R_TORUS + EFFECTIVE_TUBE_RADIUS * Math.cos(phi)) * Math.sin(theta);
    const posZ = EFFECTIVE_TUBE_RADIUS * Math.sin(phi);
    camera.position.set(posX, posY, posZ);

    const upX = Math.cos(phi) * Math.cos(theta);
    const upY = Math.cos(phi) * Math.sin(theta);
    const upZ = Math.sin(phi);
    camera.up.set(upX, upY, upZ).normalize();

    let neutralForward = new THREE.Vector3(
        -(R_TORUS + r_TORUS * Math.cos(phi)) * Math.sin(theta),
        (R_TORUS + r_TORUS * Math.cos(phi)) * Math.cos(theta),
        0
    ).normalize();
    
    if (neutralForward.lengthSq() < 0.0001) { 
        neutralForward.set(-Math.sin(theta), Math.cos(theta),0).normalize();
        if (neutralForward.lengthSq() < 0.0001) neutralForward.set(1,0,0);
    }

    let lookDirection = neutralForward.clone();
    lookDirection.applyAxisAngle(camera.up, cameraViewYawRef.current);

    const pitchAxis = new THREE.Vector3().crossVectors(lookDirection, camera.up).normalize();
    
    if (pitchAxis.lengthSq() > 0.0001) { 
        lookDirection.applyAxisAngle(pitchAxis, cameraViewPitchRef.current);
    }
    
    const lookAtPoint = new THREE.Vector3().addVectors(camera.position, lookDirection.multiplyScalar(LOOK_AHEAD_DISTANCE));
    camera.lookAt(lookAtPoint);

  }, [R_TORUS, r_TORUS, EFFECTIVE_TUBE_RADIUS, TOROIDAL_MOVE_SPEED, POLOIDAL_MOVE_SPEED, LOOK_AHEAD_DISTANCE]);


  const handlePointerLockMouseMove = useCallback((event: globalThis.MouseEvent) => {
    const deltaX = event.movementX || 0;
    const deltaY = event.movementY || 0;

    cameraViewYawRef.current -= deltaX * MOUSE_SENSITIVITY_X;
    cameraViewPitchRef.current -= deltaY * MOUSE_SENSITIVITY_Y;

    cameraViewPitchRef.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, cameraViewPitchRef.current));
  }, [MOUSE_SENSITIVITY_X, MOUSE_SENSITIVITY_Y, MIN_PITCH, MAX_PITCH]);


  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;

    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0x111827);

    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.01, 
      1000
    );
    
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    rendererRef.current.shadowMap.enabled = true;
    rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap; 

    currentMount.appendChild(rendererRef.current.domElement);
    
    const torusGeometry = new THREE.TorusGeometry(R_TORUS, r_TORUS, 100, 3000);//トーラスの三角形の数,ポリゴン
    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0x007bff, 
      metalness: 0.6, 
      roughness: 0.3, 
      emissive: 0x000511,
      flatShading: false,
      wireframe: true //ワイヤーフレーム
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.castShadow = true;    
    torus.receiveShadow = true; 
    sceneRef.current.add(torus);

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    earthTextureRef.current = textureLoader.load(EARTH_TEXTURE_URL, () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
    });
    const earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTextureRef.current,
        roughness: 0.8,
        metalness: 0.2,
    });
    earthMeshRef.current = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMeshRef.current.position.set(0, 0, 0); 
    earthMeshRef.current.castShadow = true;
    earthMeshRef.current.receiveShadow = true;
    sceneRef.current.add(earthMeshRef.current);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfffde0, 150); 
    const sunPosition = new THREE.Vector3(3, 3, 0); // 太陽の位置
    directionalLight.position.copy(sunPosition.clone().multiplyScalar(10)); // Move light further out
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50; 
    directionalLight.shadow.camera.left = -15; 
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.mapSize.width = 2048; 
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0005; 
    sceneRef.current.add(directionalLight);

    const sunGeometry = new THREE.SphereGeometry(5, 32, 32); //最初の数は半径
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfffde0 });
    sunMeshRef.current = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMeshRef.current.position.copy(directionalLight.position); // Match directional light's actual position
    sunMeshRef.current.castShadow = false;
    sunMeshRef.current.receiveShadow = false;
    sceneRef.current.add(sunMeshRef.current);

    const pointLight = new THREE.PointLight(0xffffff, 0.8, 100); 
    pointLight.position.set(3, 4, 3);
    pointLight.castShadow = true; 
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    sceneRef.current.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xaaaaff, 0.5, 100); 
    pointLight2.position.set(-4, -3, -2);
    sceneRef.current.add(pointLight2);
    
    updateCamera(); 

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      updateCamera(); 
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (currentMount && rendererRef.current && cameraRef.current) {
        const width = currentMount.clientWidth;
        const height = currentMount.clientHeight;
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'd': movementStateRef.current.forward = true; break;
        case 'a': movementStateRef.current.backward = true; break;
        case 's': movementStateRef.current.left = true; break;
        case 'w': movementStateRef.current.right = true; break;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'd': movementStateRef.current.forward = false; break;
        case 'a': movementStateRef.current.backward = false; break;
        case 's': movementStateRef.current.left = false; break;
        case 'w': movementStateRef.current.right = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const handleCanvasClick = () => {
        if (document.pointerLockElement !== currentMount) {
            currentMount.requestPointerLock();
        }
    };

    const handlePointerLockChange = () => {
        if (document.pointerLockElement === currentMount) {
            document.addEventListener('mousemove', handlePointerLockMouseMove, false);
        } else {
            document.removeEventListener('mousemove', handlePointerLockMouseMove, false);
        }
    };

    const handlePointerLockError = () => {
        console.error('Pointer Lock Error');
    };

    currentMount.addEventListener('click', handleCanvasClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange, false);
    document.addEventListener('pointerlockerror', handlePointerLockError, false);
    currentMount.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      currentMount.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange, false);
      document.removeEventListener('pointerlockerror', handlePointerLockError, false);
      document.removeEventListener('mousemove', handlePointerLockMouseMove, false); // Ensure removal
      if (document.pointerLockElement === currentMount) {
          document.exitPointerLock();
      }
      
      currentMount.removeEventListener('contextmenu', (e) => e.preventDefault());

      if (currentMount && rendererRef.current?.domElement) {
         if (currentMount.contains(rendererRef.current.domElement)) {
            currentMount.removeChild(rendererRef.current.domElement);
        }
      }
      torusGeometry.dispose();
      torusMaterial.dispose();
      
      if (sunMeshRef.current) {
        sunMeshRef.current.geometry.dispose();
        (sunMeshRef.current.material as THREE.Material).dispose();
      }
      if (earthMeshRef.current) {
        earthMeshRef.current.geometry.dispose();
        (earthMeshRef.current.material as THREE.Material).dispose();
      }
      if (earthTextureRef.current) {
        earthTextureRef.current.dispose();
      }

      directionalLight.dispose();
      ambientLight.dispose();
      pointLight.dispose();
      pointLight2.dispose();
      rendererRef.current?.dispose();
    };
  }, [updateCamera, handlePointerLockMouseMove]); 

  return <div ref={mountRef} className="w-full h-full" tabIndex={0} aria-label="Interactive 3D Torus Scene"/>;
};

export default ThreeScene;
