/* ===========================================================================
   globe.js — Globo 3D (Three.js) da tela Live View.

   • Esfera de pontos + grade (graticule) + brilho de atmosfera.
   • Arraste para rotacionar · scroll para zoom (sem OrbitControls).
   • Arcos animados representando transações ("Arcos Ativos").

   Three.js é carregado via CDN no index.html. Se estiver offline (THREE
   indefinido), a esfera estilizada em CSS continua aparecendo (fallback).
   =========================================================================== */
window.RoneGlobe = (function () {
  'use strict';

  var inited = false;
  var box, renderer, scene, camera, globe, glow, raf;
  var arcs = [], spawnAcc = 0;
  var drag = { on: false, x: 0, y: 0 };
  var autoSpin = 0.0016;
  var R = 1;

  // Distribui N pontos uniformemente numa esfera (espiral de Fibonacci)
  function fibSphere(n, radius) {
    var pts = [], off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = i * off - 1 + off / 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var phi = i * inc;
      pts.push(new THREE.Vector3(Math.cos(phi) * r * radius, y * radius, Math.sin(phi) * r * radius));
    }
    return pts;
  }

  // Ponto aleatório na superfície da esfera
  function surfacePoint(radius) {
    var u = Math.random(), v = Math.random();
    var th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    return new THREE.Vector3(
      radius * Math.sin(ph) * Math.cos(th),
      radius * Math.cos(ph),
      radius * Math.sin(ph) * Math.sin(th)
    );
  }

  function updateArcCount() {
    var el = document.getElementById('arcosCount');
    if (el) el.textContent = arcs.length;
  }

  function addArc() {
    if (!globe || arcs.length >= 7) return;
    var a = surfacePoint(R), b = surfacePoint(R);
    if (a.distanceTo(b) < 0.6) return;
    var mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.45);
    var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    var pts = curve.getPoints(60);
    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x10d9a0, transparent: true, opacity: 0 })
    );
    var dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x9bf6d6 })
    );
    globe.add(line); globe.add(dot);
    arcs.push({ line: line, dot: dot, curve: curve, t: 0 });
    updateArcCount();
  }

  function stepArcs(dt) {
    for (var i = arcs.length - 1; i >= 0; i--) {
      var s = arcs[i];
      s.t += dt * 0.45;
      var t = Math.min(s.t, 1);
      s.dot.position.copy(s.curve.getPoint(t));
      // brilho: sobe e desce ao longo da vida
      s.line.material.opacity = Math.sin(Math.min(s.t, 1) * Math.PI) * 0.7;
      if (s.t >= 1.15) {
        globe.remove(s.line); globe.remove(s.dot);
        s.line.geometry.dispose(); s.dot.geometry.dispose();
        arcs.splice(i, 1);
        updateArcCount();
      }
    }
  }

  function bind() {
    var el = renderer.domElement;
    el.addEventListener('pointerdown', function (e) { drag.on = true; drag.x = e.clientX; drag.y = e.clientY; el.style.cursor = 'grabbing'; });
    window.addEventListener('pointerup', function () { drag.on = false; if (el) el.style.cursor = 'grab'; });
    window.addEventListener('pointermove', function (e) {
      if (!drag.on) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x + dy * 0.005));
    });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      camera.position.z = Math.max(1.6, Math.min(5, camera.position.z + e.deltaY * 0.0015));
    }, { passive: false });
  }

  function animate() {
    raf = requestAnimationFrame(animate);
    if (!drag.on) globe.rotation.y += autoSpin;
    spawnAcc += 1;
    if (spawnAcc > 70) { spawnAcc = 0; addArc(); }   // ~ a cada 1.2s
    stepArcs(1 / 60);
    renderer.render(scene, camera);
  }

  function resize() {
    if (!inited || !box) return;
    var W = box.clientWidth || 440, H = box.clientHeight || 440;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  function ensure(sel) {
    if (inited) { resize(); return; }
    if (typeof THREE === 'undefined') return;        // offline → mantém fallback CSS
    box = document.querySelector(sel); if (!box) return;
    var hint = box.querySelector('.globe-hint');
    box.classList.add('three-on');

    var W = box.clientWidth || 440, H = box.clientHeight || 440;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 3;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;cursor:grab;touch-action:none;';
    box.insertBefore(renderer.domElement, hint || null);

    globe = new THREE.Group();
    globe.rotation.x = 0.32;
    scene.add(globe);

    // Núcleo escuro: oculta os pontos da face de trás (dá volume de globo)
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.96, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x02070e })
    ));
    // Grade (latitude/longitude)
    globe.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 0.995, 36, 24)),
      new THREE.LineBasicMaterial({ color: 0x123f78, transparent: true, opacity: 0.22 })
    ));
    // Pontos na superfície
    globe.add(new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(fibSphere(1700, R)),
      new THREE.PointsMaterial({ color: 0x3f8fe0, size: 0.02, transparent: true, opacity: 0.95 })
    ));
    // Atmosfera (brilho na borda)
    glow = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x1f6fd0, transparent: true, opacity: 0.06, side: THREE.BackSide })
    );
    scene.add(glow);

    bind();
    inited = true;
    animate();
  }

  // Pausa/retoma o loop (economia quando a aba some)
  document.addEventListener('visibilitychange', function () {
    if (!inited) return;
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { animate(); }
  });
  window.addEventListener('resize', resize);

  return { ensure: ensure, resize: resize };
})();
