
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const clockRef = useRef(new THREE.Clock());

  const EARTH_RADIUS = 20;
  const PLAYER_HEIGHT = 0.02; // Height of camera above Earth's surface
  const MOVE_SPEED = 0.3; // Units per second relative to Earth radius

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.001,
      2000
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Earth
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/land_ocean_ice_cloud_2048.jpg',
      undefined,
      undefined,
      (err) => {
        console.error('An error occurred loading the Earth texture:', err);
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.8 });
        earthMesh.material = fallbackMaterial;
      }
    );
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.9,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.005,
      transparent: true,
      opacity: 0.8
    });
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      const distSq = x*x + y*y + z*z;
      if (distSq > 100*100 && distSq < 1000*1000) {
         starVertices.push(x, y, z);
      }
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // PointerLockControls
    // Note: In this version of PointerLockControls, controls.getObject() returns the camera itself.
    const controls = new PointerLockControls(camera, renderer.domElement);
    controlsRef.current = controls;
    const playerObject = controls.getObject(); // playerObject is the camera
    scene.add(playerObject); // Add camera to the scene

    // Initial player position and orientation
    playerObject.position.set(0, EARTH_RADIUS + PLAYER_HEIGHT, 0); // Start at "North Pole"
    const initialSurfaceNormal = playerObject.position.clone().normalize();
    playerObject.up.copy(initialSurfaceNormal); // Set initial 'up' vector
    // Look towards a point on the "equator" along the -Z world axis for a defined start
    const initialLookAtTarget = new THREE.Vector3(0, playerObject.position.y, playerObject.position.z - 10); 
    playerObject.lookAt(initialLookAtTarget);
    // PointerLockControls will now use this initial quaternion.

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    
    let clickLockControlsHandler: (() => void) | null = null;
    let plcLockEventHandler: (() => void) | null = null;
    let plcUnlockEventHandler: (() => void) | null = null;

    if (blocker && instructions && controlsRef.current) {
      const plc = controlsRef.current;
      
      clickLockControlsHandler = () => plc.lock();
      blocker.addEventListener('click', clickLockControlsHandler);
      
      plcLockEventHandler = () => {
        if (instructions) instructions.style.display = 'none';
        if (blocker) blocker.style.display = 'none';
      };
      plc.addEventListener('lock', plcLockEventHandler);
      
      plcUnlockEventHandler = () => {
        if (blocker) blocker.style.display = 'flex';
        if (instructions) instructions.style.display = '';
      };
      plc.addEventListener('unlock', plcUnlockEventHandler);
    }
    
    const onKeyDown = (event: KeyboardEvent) => { keysPressedRef.current[event.key.toLowerCase()] = true; };
    const onKeyUp = (event: KeyboardEvent) => { keysPressedRef.current[event.key.toLowerCase()] = false; };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    let animationFrameId: number;
    // Pre-allocate vectors for use in animation loop
    const _worldForward = new THREE.Vector3(); // For movement
    const _worldRight = new THREE.Vector3();  // For movement
    const _displacement = new THREE.Vector3();
    const _moveInput = new THREE.Vector3();
    const _cameraDirection = new THREE.Vector3(); // For orientation correction
    const _lookAtPosition = new THREE.Vector3();  // For orientation correction
    const _newSurfaceNormal = new THREE.Vector3(); // For current surface normal

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (controls.isLocked === true && playerObject) {
        // --- Movement Logic ---
        _moveInput.set(0,0,0);
        if (keysPressedRef.current['w']) _moveInput.z = -1;
        if (keysPressedRef.current['s']) _moveInput.z = 1;
        if (keysPressedRef.current['a']) _moveInput.x = -1;
        if (keysPressedRef.current['d']) _moveInput.x = 1;

        if (_moveInput.lengthSq() > 0) {
            const actualMoveSpeed = MOVE_SPEED * delta;
            _displacement.set(0,0,0);

            // playerObject.up is the surface normal from the previous frame's lookAt correction.
            // This is used to determine the 'right' vector for strafing.
            playerObject.getWorldDirection(_worldForward); // Forward based on camera's current quaternion
            _worldRight.crossVectors(playerObject.up, _worldForward).normalize(); 

            if (_moveInput.z !== 0) { // W/S: move along camera's forward/backward
                _displacement.addScaledVector(_worldForward, _moveInput.z * actualMoveSpeed);
            }
            if (_moveInput.x !== 0) { // A/D: strafe left/right
                _displacement.addScaledVector(_worldRight, _moveInput.x * actualMoveSpeed);
            }
            playerObject.position.add(_displacement);
        }
        
        // Keep player on the surface of the Earth
        playerObject.position.normalize().multiplyScalar(EARTH_RADIUS + PLAYER_HEIGHT);
        
        // --- Orientation Logic ---
        // PointerLockControls updates playerObject.quaternion based on mouse input.
        // We ensure playerObject's local Y-axis (up) aligns with the current surface normal,
        // while preserving the looking direction (yaw/pitch) from PointerLockControls.

        _newSurfaceNormal.copy(playerObject.position).normalize();

        // Get the forward vector implied by the current quaternion (set by PLC)
        _cameraDirection.set(0, 0, -1).applyQuaternion(playerObject.quaternion);
        
        // Set the player's 'up' vector to the current surface normal
        playerObject.up.copy(_newSurfaceNormal);
        
        // Make the player look in the direction of _cameraDirection, using _newSurfaceNormal as 'up'
        _lookAtPosition.copy(playerObject.position).add(_cameraDirection);
        playerObject.lookAt(_lookAtPosition);
        // Now, playerObject.quaternion is consistent with playerObject.up being _newSurfaceNormal.
        // PointerLockControls will use this corrected quaternion as its basis for the next mouse input.
      }
      
      stars.rotation.y += 0.00005; // Slow rotation of starfield
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (currentMount) {
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      
      if (blocker && clickLockControlsHandler) {
        blocker.removeEventListener('click', clickLockControlsHandler);
      }
      if (controlsRef.current) {
        if (plcLockEventHandler) controlsRef.current.removeEventListener('lock', plcLockEventHandler);
        if (plcUnlockEventHandler) controlsRef.current.removeEventListener('unlock', plcUnlockEventHandler);
        controlsRef.current.dispose?.(); 
      }
      
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && currentMount && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      
      earthGeometry.dispose();
      earthMaterial.dispose();
      if (earthTexture) earthTexture.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) {
            material.forEach(mat => mat?.dispose());
          } else if (material) {
            material.dispose();
          }
        }
      });
      while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return <div ref={mountRef} className="w-full h-full cursor-pointer" />;
};

export default ThreeScene;
