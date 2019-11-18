
import * as THREE from 'three';

import './lib/GLTFLoader';
import './lib/OrbitControls';
import './lib/BufferGeometryUtils';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxBufferGeometry(4, 4, 4);
// const geometry = new THREE.SphereBufferGeometry(3, 64, 64);

const bufferGeoUtil = THREE.BufferGeometryUtils.computeTangents(geometry);

console.log(geometry);

const material = new THREE.ShaderMaterial({
  uniforms: {
    tex: { value: null },
    tex_normal: { value: null },
    vLightPos: { value: new THREE.Vector3(20.0, 20.0, 20.0) },
  },
  vertexShader: `
    attribute vec4 tangent;

    uniform vec3 vLightPos;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec3 vTangent;

    void main() {
      vUv = uv;

      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vNormal = normalize(modelMatrix * vec4(normal, 0.)).xyz;
      vTangent = normalize(modelMatrix * tangent).xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D tex;
    uniform sampler2D tex_normal;

    uniform vec3 vLightPos;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vWorldPos;

    vec3 normalSampleToWorldSpace(vec3 normalMapSample, vec3 unitNormalW, vec3 tangentW) {
      vec3 normalT = 2.0 * normalMapSample - 1.0;

      vec3 vN = unitNormalW;
      vec3 vT = normalize(tangentW - dot(tangentW, vN) * vN);
      // vec3 vT = tangentW;
      vec3 vB = cross(vN, vT);

      mat3 tbn = mat3(vT, vB, vN);

      return normalT * tbn;
    }

    void main() {
      vec4 vNormalColor = texture2D(tex_normal, vUv);

      vec3 normal = normalSampleToWorldSpace(vNormalColor.xyz, vNormal, vTangent);

      vec4 diffuse = vec4(texture2D(tex, vUv).xyz * dot(normalize(vWorldPos.xyz - vLightPos.xyz), normal), 1.0);
      gl_FragColor = diffuse;

      // gl_FragColor = texture2D(tex, vUv);
    }
  `,
  side: THREE.DoubleSide,
});

material.uniforms.tex.value = new THREE.TextureLoader().load('./Terracotta_Tiles_002_Base_Color.jpg');
material.uniforms.tex_normal.value = new THREE.TextureLoader().load('./Terracotta_Tiles_002_Normal.jpg');

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(light);

camera.position.z = 5;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.update();

const animate = () => {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
};

animate();
