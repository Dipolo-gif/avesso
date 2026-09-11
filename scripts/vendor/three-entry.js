// Só o que o estúdio 3D usa; esbuild remove o resto (npm run vendor).
export {Scene, PerspectiveCamera, WebGLRenderer, Shape, ExtrudeGeometry, PlaneGeometry, TubeGeometry, CatmullRomCurve3, Vector3, Mesh, Group, MeshStandardMaterial, CanvasTexture, SRGBColorSpace, DirectionalLight, PMREMGenerator, ACESFilmicToneMapping, DoubleSide, Color} from 'three';
export {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
