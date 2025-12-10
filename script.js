// ====== إعداد المشهد (Scene Setup) ======
const FOV = 90; 
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 

const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-canvas').appendChild(renderer.domElement);

// ====== إعداد المعالجة اللاحقة (Post-processing) ======
const composer = new THREE.EffectComposer(renderer);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

// إضافة تأثير Vignette
const vignettePass = new THREE.ShaderPass(THREE.VignetteShader);
vignettePass.uniforms['offset'].value = 0.95; 
vignettePass.uniforms['darkness'].value = 1.6; 
composer.addPass(vignettePass);

// ====== إضافة النجوم والإضاءة والطريق (بدون تغيير) ======
function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, sizeAttenuation: true });
    const vertices = [];
    for (let i = 0; i < 500; i++) {
        const x = THREE.MathUtils.randFloatSpread(200); 
        const y = THREE.MathUtils.randFloatSpread(100) + 50; 
        const z = THREE.MathUtils.randFloatSpread(200) - 100; 
        vertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}
createStars();


// تحديد موضع الكاميرا (منظور الشخص الأول - FPP)
const initialCameraY = 0.7;
camera.position.set(0, initialCameraY, 0); 
camera.rotation.x = 0; 

// إضافة إضاءة
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); 
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);


// إنشاء الطريق
const roadGeometry = new THREE.PlaneGeometry(10, 500); 
const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 }); 
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2; 
road.position.y = 0; 
scene.add(road);

// إضافة خطوط الطريق (كالسابق)
const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
for (let i = 0; i < 50; i++) {
    const lineGeometry = new THREE.PlaneGeometry(0.2, 5);
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.01, -25 + i * 10); 
    scene.add(line);
}

// ====== وظيفة توليد الحواجز (Obstacle/Ramp) ======
function createObstacle() {
    const rampGeometry = new THREE.BoxGeometry(2, 0.5, 1);
    const rampMaterial = new THREE.MeshLambertMaterial({ color: 0xffc107 }); 
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    const lanePositions = [-2, 0, 2];
    const randomLane = lanePositions[Math.floor(Math.random() * lanePositions.length)];
    ramp.position.set(randomLane, 0.25, -200); 
    ramp.rotation.z = -0.1; 
    ramp.userData.isObstacle = true; 
    scene.add(ramp);
}

// ====== منطق اللعبة والحركة (المُعدَّل) ======
let initialSpeed = 0.05;
let playerSpeed = initialSpeed; 
let playerX = 0; 
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.05;
const jumpPower = 0.5;
const laneWidth = 2; 
const playerLateralMovement = 2; 

// متغيرات الصحة والنقاط والصوت
let score = 0;
let lives = 3; 
let scoreDisplay = document.getElementById('score');
let livesDisplay = document.getElementById('lives');
let music = document.getElementById('background-music');
let collisionSound = document.getElementById('collision-sound'); 
let runningSound = document.getElementById('running-sound'); 
// 📌 التعديل 2: جلب عنصر صوت القفز
let jumpSound = document.getElementById('jump-sound'); 
let canTakeDamage = true; 

// متغيرات اهتزاز القرش
const shakeIntensity = 0.15; 
let shakeTime = 0;

// تعديل مستويات الصوت
if (music) music.volume = 0.5;      
if (runningSound) runningSound.volume = 0.2; 
if (collisionSound) collisionSound.volume = 1.0; 
if (jumpSound) jumpSound.volume = 0.8; // مستوى صوت مناسب للقفز

// ====== وظيفة تحديث الفرص (القُلوب) ======
function updateLivesDisplay() {
    let hearts = '';
    for(let i = 0; i < 3; i++) {
        hearts += (i < lives) ? '❤️' : '🤍';
    }
    livesDisplay.innerHTML = `الفرص: ${hearts}`;
}
updateLivesDisplay();

// ====== وظيفة التصادم (عند لمس الحاجز) ======
function handleCollision() {
    if (!canTakeDamage) return; 

    if (collisionSound) {
        collisionSound.currentTime = 0; 
        collisionSound.play().catch(e => console.log("Collision sound blocked:", e));
    }
    
    lives--; 
    updateLivesDisplay();
    
    if (lives <= 0) {
        endGame();
    } else {
        canTakeDamage = false;
        shakeTime = 5; 
        setTimeout(() => {
            canTakeDamage = true;
        }, 1000); 
    }
}

// ====== وظيفة نهاية اللعبة ======
function endGame() {
    alert(`انتهت اللعبة! نقاطك النهائية: ${score}`);
    score = 0;
    lives = 3;
    playerSpeed = initialSpeed; 
    updateLivesDisplay();
    scoreDisplay.textContent = `النقاط: 0`;
    scene.children.filter(c => c.userData.isObstacle).forEach(c => scene.remove(c));
    canTakeDamage = true; 
    camera.position.set(0, initialCameraY, 0); 
    
    if (runningSound) runningSound.pause();
}

// وظيفة الحركة الجانبية بالأسهم
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        playerX = Math.max(-laneWidth, playerX - playerLateralMovement);
    } else if (e.key === 'ArrowRight') {
        playerX = Math.min(laneWidth, playerX + playerLateralMovement);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (!isJumping) {
            isJumping = true;
            verticalVelocity = jumpPower;
            // 📌 التعديل 3: تشغيل صوت القفز
            if (jumpSound) {
                jumpSound.currentTime = 0; 
                jumpSound.play().catch(e => console.log("Jump sound blocked:", e));
            }
        }
    }
});

// وظيفة تحديث الإطار (Animation Loop)
function animate() {
    requestAnimationFrame(animate);

    // 0. زيادة السرعة التدريجية والنقاط
    if (playerSpeed < 0.25) { 
        playerSpeed += 0.00005; 
    }
    score += 1;
    scoreDisplay.textContent = `النقاط: ${score}`;

    // 1. تحديث موضع الكاميرا الجانبي والقفر
    camera.position.x += (playerX - camera.position.x) * 0.5; 

    if (isJumping) {
        camera.position.y += verticalVelocity;
        verticalVelocity += gravity;

        if (camera.position.y <= initialCameraY) { 
            camera.position.y = initialCameraY;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // تطبيق تأثير اهتزاز القرش
    if (shakeTime > 0) {
        shakeTime -= 0.1;
    }
    const currentShake = shakeIntensity * (playerSpeed / 0.25) * 0.2 + (shakeTime > 0 ? shakeIntensity * shakeTime : 0);
    
    camera.position.x += (Math.random() * 2 - 1) * currentShake * 0.01;
    camera.position.y += (Math.random() * 2 - 1) * currentShake * 0.01;

    // 2. تحريك وتوليد الحواجز والكشف عن التصادم
    scene.children.forEach(child => {
        if (child.userData.isObstacle) {
            child.position.z += playerSpeed * 20; 
            if (child.position.z > -0.5 && child.position.z < 0.5) { 
                const horizontalDistance = Math.abs(child.position.x - camera.position.x);
                if (horizontalDistance < 1.5) { 
                    if (camera.position.y <= child.position.y + 0.55 && !isJumping) {
                        handleCollision();
                        if (lives > 0) scene.remove(child);
                    }
                }
            }
            if (child.position.z > 5) {
                scene.remove(child);
            }
        }
        
        // تحريك خطوط الطريق
        if (child.geometry && child.geometry.type === 'PlaneGeometry' && child !== road && child.geometry.parameters.width < 1) { 
            child.position.z += playerSpeed * 20;
            if (child.position.z > 25) child.position.z = -50;
        }
    });
    
    // توليد حواجز جديدة عشوائياً
    if (Math.random() < 0.008 * (playerSpeed / initialSpeed)) { 
         createObstacle();
    }

    // استخدام Composer للعرض
    composer.render(); 
}

// معالجة تغيير حجم النافذة
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});


// وظيفة startAllSounds (لتشغيل جميع الأصوات بعد تفاعل المستخدم)
function startAllSounds() {
    let played = false;
    
    if (music && music.paused) {
        music.play().catch(e => console.log("Music play blocked:", e));
        played = true;
    }
    
    if (runningSound && runningSound.paused) {
        runningSound.play().catch(e => console.log("Running sound blocked:", e));
        played = true;
    }
    
    if (played) {
        document.removeEventListener('click', startAllSounds);
        document.removeEventListener('keydown', startAllSounds);
    }
}
document.addEventListener('click', startAllSounds);
document.addEventListener('keydown', startAllSounds);


// تشغيل حلقة الرسوم المتحركة
animate();