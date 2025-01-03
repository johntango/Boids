const canvas = document.getElementById("boidsCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const NUM_BOIDS = 1000;
const BOID_RADIUS = 5;
const PERCEPTION_RADIUS = 50;
const MAX_SPEED = 2;
let ALIGNMENT_FACTOR = 1.5;
let COHESION_FACTOR = 1;
let SEPARATION_FACTOR = 2.5;
let TIME_STEP = 0.1; // Time step for simulation

// Add event listeners to update simulation parameters based on UI sliders
const timeStepControl = document.getElementById("timeStepControl");
const cohesionControl = document.getElementById("cohesionControl");
const separationControl = document.getElementById("separationControl");

timeStepControl.addEventListener("input", (event) => {
    TIME_STEP = parseFloat(event.target.value);
});

cohesionControl.addEventListener("input", (event) => {
    COHESION_FACTOR = parseFloat(event.target.value);
});

separationControl.addEventListener("input", (event) => {
    SEPARATION_FACTOR = parseFloat(event.target.value);
});

class Boid {
    constructor(x, y) {
        this.position = { x, y };
        this.velocity = {
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
        };
        this.acceleration = { x: 0, y: 0 };
    }

    update() {
        this.velocity.x += this.acceleration.x * TIME_STEP;
        this.velocity.y += this.acceleration.y * TIME_STEP;

        const speed = Math.sqrt(
            this.velocity.x ** 2 + this.velocity.y ** 2
        );
        if (speed > MAX_SPEED) {
            this.velocity.x = (this.velocity.x / speed) * MAX_SPEED;
            this.velocity.y = (this.velocity.y / speed) * MAX_SPEED;
        }

        this.position.x += this.velocity.x * TIME_STEP;
        this.position.y += this.velocity.y * TIME_STEP;

        this.acceleration.x = 0;
        this.acceleration.y = 0;

        this.boundaryCheck();
    }

    boundaryCheck() {
        if (this.position.x > canvas.width) this.position.x = 0;
        if (this.position.x < 0) this.position.x = canvas.width;
        if (this.position.y > canvas.height) this.position.y = 0;
        if (this.position.y < 0) this.position.y = canvas.height;
    }

    applyForce(force) {
        this.acceleration.x += force.x;
        this.acceleration.y += force.y;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, BOID_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.strokeStyle = "green"; // Green outline for boids
        ctx.stroke();
        ctx.closePath();
    }
}

const boids = Array.from({ length: NUM_BOIDS }, () => {
    return new Boid(
        Math.random() * canvas.width,
        Math.random() * canvas.height
    );
});

function calculateAlignment(boid) {
    let steering = { x: 0, y: 0 };
    let total = 0;
    for (const other of boids) {
        const distance = Math.hypot(
            boid.position.x - other.position.x,
            boid.position.y - other.position.y
        );
        if (other !== boid && distance < PERCEPTION_RADIUS) {
            steering.x += other.velocity.x;
            steering.y += other.velocity.y;
            total++;
        }
    }
    if (total > 0) {
        steering.x /= total;
        steering.y /= total;

        const magnitude = Math.sqrt(steering.x ** 2 + steering.y ** 2);
        if (magnitude > 0) {
            steering.x = (steering.x / magnitude) * MAX_SPEED - boid.velocity.x;
            steering.y = (steering.y / magnitude) * MAX_SPEED - boid.velocity.y;
        }
    }
    return steering;
}

function calculateCohesion(boid) {
    let steering = { x: 0, y: 0 };
    let total = 0;
    for (const other of boids) {
        const distance = Math.hypot(
            boid.position.x - other.position.x,
            boid.position.y - other.position.y
        );
        if (other !== boid && distance < PERCEPTION_RADIUS) {
            steering.x += other.position.x;
            steering.y += other.position.y;
            total++;
        }
    }
    if (total > 0) {
        steering.x /= total;
        steering.y /= total;
        steering.x -= boid.position.x;
        steering.y -= boid.position.y;

        const magnitude = Math.sqrt(steering.x ** 2 + steering.y ** 2);
        if (magnitude > 0) {
            steering.x = (steering.x / magnitude) * MAX_SPEED - boid.velocity.x;
            steering.y = (steering.y / magnitude) * MAX_SPEED - boid.velocity.y;
        }
    }
    return steering;
}

function calculateSeparation(boid) {
    let steering = { x: 0, y: 0 };
    let total = 0;
    for (const other of boids) {
        const distance = Math.hypot(
            boid.position.x - other.position.x,
            boid.position.y - other.position.y
        );
        if (other !== boid && distance < PERCEPTION_RADIUS / 2) {
            const diff = {
                x: boid.position.x - other.position.x,
                y: boid.position.y - other.position.y,
            };
            diff.x /= distance;
            diff.y /= distance;
            steering.x += diff.x;
            steering.y += diff.y;
            total++;
        }
    }
    if (total > 0) {
        steering.x /= total;
        steering.y /= total;
    }
    return steering;
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const boid of boids) {
        const alignment = calculateAlignment(boid);
        const cohesion = calculateCohesion(boid);
        const separation = calculateSeparation(boid);

        alignment.x *= ALIGNMENT_FACTOR;
        alignment.y *= ALIGNMENT_FACTOR;
        cohesion.x *= COHESION_FACTOR;
        cohesion.y *= COHESION_FACTOR;
        separation.x *= SEPARATION_FACTOR;
        separation.y *= SEPARATION_FACTOR;

        boid.applyForce(alignment);
        boid.applyForce(cohesion);
        boid.applyForce(separation);

        boid.update();
        boid.draw();
    }

    requestAnimationFrame(animate);
}

animate();
