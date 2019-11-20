
import * as THREE from 'three';

import './lib/GLTFLoader';
import './lib/OrbitControls';
import './lib/BufferGeometryUtils';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x333333, 1);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxBufferGeometry(10, 10, 10, 30, 30, 30);
// const geometry = new THREE.SphereBufferGeometry(3, 64, 64);
// geometry.addAttribute('aTangent', new THREE.BufferAttribute(new Float32Array(4 * geometry.attributes.position.count), 4, false));
// geometry.addAttribute('aBitangent', new THREE.BufferAttribute(new Float32Array(4 * geometry.attributes.position.count), 4, false));

const bufferGeoUtil = THREE.BufferGeometryUtils.computeTangents(geometry);

console.log(geometry);

const material = new THREE.ShaderMaterial({
  uniforms: {
    tex: { value: null },
    tex_normal: { value: null },
    tex_height: { value: null },
    lightPos: { value: new THREE.Vector3(20.0, 20.0, 20.0) },
  },
  vertexShader: `
    attribute vec4 tangent;
    attribute vec4 bitangent;

    uniform vec3 lightPos;
    uniform sampler2D tex_height;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec3 vTangent;

    // varying vec3 vLightPos;
    varying mat3 TBN;
    varying mat3 TBN_inv;

    varying vec3 tLightPos;
    varying vec3 tViewPos;
    varying vec3 tFragPos;

    void main() {
      vec4 vHeightColor = texture2D(tex_height, vUv);
      vUv = uv;

      vec3 T = normalize(vec3(modelMatrix * vec4(tangent.xyz, 0.0)).xyz);
      // vec3 B = normalize(vec3(modelMatrix * vec4(bitangent.xyz, 0.0)).xyz);
      vec3 N = normalize(vec3(modelMatrix * vec4(normal.xyz, 0.0)).xyz);
      // T = normalize(T - dot(T, N) * N);
      vec3 B = cross(N, T);
      // vec3 B = cross(T, N);
      // vec3 B = cross(T, N);
      // TBN = mat3(T, B, N);
      TBN = mat3(T, B, N);
      TBN_inv = mat3(
        vec3(T.x, B.x, N.x),
        vec3(T.y, B.y, N.y),
        vec3(T.z, B.z, N.z)
      );

      vNormal = (modelMatrix * vec4(normal, 0.)).xyz;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vTangent = normalize(modelMatrix * tangent).xyz;

      tLightPos = TBN_inv * lightPos;
      tViewPos = TBN_inv * cameraPosition;
      tFragPos = TBN_inv * vWorldPos;

      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      // gl_Position = projectionMatrix * viewMatrix * vec4( vWorldPos, 1.0 );
      // gl_Position = projectionMatrix * viewMatrix * vec4( vWorldPos, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D tex;
    uniform sampler2D tex_normal;
    uniform sampler2D tex_height;

    uniform vec3 lightPos;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vWorldPos;

    varying mat3 TBN;

    varying vec3 tLightPos;
    varying vec3 tViewPos;
    varying vec3 tFragPos;

    mat3 calTBN(vec3 normalMapSample, vec3 unitNormalW, vec3 tangentW) {

      vec3 vN = unitNormalW;
      vec3 vT = normalize(tangentW - dot(tangentW, vN) * vN);
      vec3 vB = cross(vN, vT);

      mat3 TBN = mat3(vT, vB, vN);

      return TBN;
    }

    // vec3 normalSampleToWorldSpace(vec3 normalMapSample, vec3 unitNormalW, vec3 tangentW) {
    //   vec3 normalT = 2.0 * normalMapSample - 1.0;
    //   mat3 TBN = calTBN(normalMapSample, unitNormalW, tangentW);

    //   return normalT * TBN;
    // }

    // vec2 parallaxMapping(vec2 texCoords, vec3 viewDir)
    // {
    //     float height =  texture2D(tex_height, texCoords).r;
    //     vec2 p = viewDir.xy / viewDir.z * (height * 0.1);
    //     return texCoords - p;
    //     // return texCoords;
    // }

    vec2 parallaxMapping (vec2 texCoord, vec3 viewDir)
    {
        // return texCoord;
        float numLayers = 32.0 - 31.0 * abs(dot(vec3(0.0, 0.0, 1.0), viewDir));
        float layerDepth = 1.0 / numLayers;

        vec2 P = viewDir.xy * 0.1;
        vec2 deltaTexCoords = P / numLayers;
        vec2 currentTexCoords = texCoord;

        float currentLayerDepth = 0.0;
        float currentDepthMapValue = texture2D(tex_height, currentTexCoords).r;
        for (int i = 0; i < 32; ++ i)
        {
            if (currentLayerDepth >= currentDepthMapValue)
                break;
            currentTexCoords -= deltaTexCoords;
            currentDepthMapValue = texture2D(tex_height, currentTexCoords).r;
            currentLayerDepth += layerDepth;
        }

        vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
        float afterDepth = currentDepthMapValue - currentLayerDepth;
        float beforeDepth = texture2D(tex_height, prevTexCoords).r - currentLayerDepth + layerDepth;

        float weight = afterDepth / (afterDepth - beforeDepth);
        return prevTexCoords * weight + currentTexCoords * (1.0 - weight);
    }

    void main() {

      vec3 viewDir = normalize(tViewPos - tFragPos);
      vec2 uv = parallaxMapping(vUv,  viewDir);
      if (uv.x > 1.0 || uv.y > 1.0 || uv.x < 0.0 || uv.y < 0.0)
        discard;

      vec3 normal = texture2D(tex_normal, uv).rgb;
      normal = normalize(normal * 2.0 - 1.0);
      normal = normalize(TBN * normal);

      vec4 diffuse = vec4(vec4(1., 1., 1., 1.).xyz * max(dot(normal, normalize(lightPos.xyz - vWorldPos.xyz)), 0.), 1.0);
      vec4 ambient = 0.2 * vec4(1., 1., 1., 1.) * texture2D(tex, uv);

      // gl_FragColor = texture2D(tex, uv) * diffuse * vec4(1., 1., 1., 1.) + ambient;
      gl_FragColor = texture2D(tex, uv) * diffuse * vec4(1., 1., 1., 1.) + ambient;
      // gl_FragColor = texture2D(tex, vUv) * diffuse * vec4(1., 1., 1., 1.) + ambient;
    }
  `,
});

// material.uniforms.tex.value = new THREE.TextureLoader().load('./Terracotta_Tiles_002_Base_Color.jpg');
// material.uniforms.tex_normal.value = new THREE.TextureLoader().load('./Terracotta_Tiles_002_Normal.jpg');
// material.uniforms.tex_height.value = new THREE.TextureLoader().load('./Terracotta_Tiles_002_Height.jpg');

material.uniforms.tex.value = new THREE.TextureLoader().load('./bricks2.jpg');
material.uniforms.tex_normal.value = new THREE.TextureLoader().load('./bricks2_normal.jpg');
material.uniforms.tex_height.value = new THREE.TextureLoader().load('./bricks2_disp.jpg');

// material.uniforms.tex.value = new THREE.TextureLoader().load("https://raw.githubusercontent.com/Rabbid76/graphics-snippets/master/resource/texture/woodtiles.jpg");
// material.uniforms.tex_normal.value = new THREE.TextureLoader().load("https://raw.githubusercontent.com/Rabbid76/graphics-snippets/master/resource/texture/toy_box_normal.png");
// material.uniforms.tex_height.value = new THREE.TextureLoader().load("https://raw.githubusercontent.com/Rabbid76/graphics-snippets/master/resource/texture/toy_box_disp.png");

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
// scene.add(light);

camera.position.z = 0;
camera.position.y = 0;
camera.position.x = 20;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.update();

const animate = () => {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
};

animate();
