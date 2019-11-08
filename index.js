
import * as THREE from 'three';

import './lib/GLTFLoader';
import './lib/OrbitControls';

let scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry(1, 1, 1);
var material =  new THREE.MeshPhongMaterial( {color: 0x00ff00} );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
scene.add( light );

camera.position.z = 5;

var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.update();

var animate = function () {
  requestAnimationFrame( animate );

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  controls.update();
  renderer.render( scene, camera );
};

animate();