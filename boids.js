// Boids flocking simulation

// Global speed control - adjust these values to change boid behavior
const GLOBAL_MAX_SPEED = 0.3; // Reduce this to make boids slower
const GLOBAL_MAX_FORCE = 0.03; // Reduce this for smoother movement
const GLOBAL_MIN_SPEED = 0.05; // Minimum speed to prevent stopping

class Boid {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Reduce initial velocity to be within maxSpeed bounds
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.maxSpeed = GLOBAL_MAX_SPEED;
    this.maxForce = GLOBAL_MAX_FORCE; // Reduced max force for smoother movement
  }

  update(boids) {
    // Apply flocking rules
    const separation = this.separate(boids);
    const alignment = this.align(boids);
    const cohesion = this.cohesion(boids);

    // Weight the forces - reduced separation weight to prevent excessive speed
    separation.x *= 1.0;
    separation.y *= 1.0;
    alignment.x *= 0.8;
    alignment.y *= 0.8;
    cohesion.x *= 0.6;
    cohesion.y *= 0.6;

    // Apply forces
    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Wrap around edges - constrain to fishtank
    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }

  separate(boids) {
    const desiredSeparation = 25;
    const steer = { x: 0, y: 0 };
    let count = 0;

    for (let other of boids) {
      const d = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
      if (d > 0 && d < desiredSeparation) {
        const diff = {
          x: this.x - other.x,
          y: this.y - other.y,
        };
        diff.x /= d;
        diff.y /= d;
        steer.x += diff.x;
        steer.y += diff.y;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;
      this.normalize(steer);
      steer.x *= this.maxSpeed;
      steer.y *= this.maxSpeed;
      steer.x -= this.vx;
      steer.y -= this.vy;
      this.limit(steer, this.maxForce);
    }

    return steer;
  }

  align(boids) {
    const neighborDist = 50;
    const sum = { x: 0, y: 0 };
    let count = 0;

    for (let other of boids) {
      const d = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
      if (d > 0 && d < neighborDist) {
        sum.x += other.vx;
        sum.y += other.vy;
        count++;
      }
    }

    if (count > 0) {
      sum.x /= count;
      sum.y /= count;
      this.normalize(sum);
      sum.x *= this.maxSpeed;
      sum.y *= this.maxSpeed;
      const steer = {
        x: sum.x - this.vx,
        y: sum.y - this.vy,
      };
      this.limit(steer, this.maxForce);
      return steer;
    }

    return { x: 0, y: 0 };
  }

  cohesion(boids) {
    const neighborDist = 50;
    const sum = { x: 0, y: 0 };
    let count = 0;

    for (let other of boids) {
      const d = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
      if (d > 0 && d < neighborDist) {
        sum.x += other.x;
        sum.y += other.y;
        count++;
      }
    }

    if (count > 0) {
      sum.x /= count;
      sum.y /= count;
      return this.seek(sum);
    }

    return { x: 0, y: 0 };
  }

  seek(target) {
    const desired = {
      x: target.x - this.x,
      y: target.y - this.y,
    };
    this.normalize(desired);
    desired.x *= this.maxSpeed;
    desired.y *= this.maxSpeed;
    const steer = {
      x: desired.x - this.vx,
      y: desired.y - this.vy,
    };
    this.limit(steer, this.maxForce);
    return steer;
  }

  applyForce(force) {
    this.vx += force.x;
    this.vy += force.y;
    
    // Ensure velocity doesn't exceed maxSpeed
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > this.maxSpeed) {
      this.vx = (this.vx / currentSpeed) * this.maxSpeed;
      this.vy = (this.vy / currentSpeed) * this.maxSpeed;
    }
    
    // Ensure minimum speed to prevent boids from stopping completely
    if (currentSpeed < GLOBAL_MIN_SPEED && currentSpeed > 0) {
      this.vx = (this.vx / currentSpeed) * GLOBAL_MIN_SPEED;
      this.vy = (this.vy / currentSpeed) * GLOBAL_MIN_SPEED;
    }
  }

  normalize(vector) {
    const mag = Math.sqrt(vector.x ** 2 + vector.y ** 2);
    if (mag > 0) {
      vector.x /= mag;
      vector.y /= mag;
    }
  }

  limit(vector, max) {
    const mag = Math.sqrt(vector.x ** 2 + vector.y ** 2);
    if (mag > max) {
      vector.x = (vector.x / mag) * max;
      vector.y = (vector.y / mag) * max;
    }
  }

  draw(ctx) {
    const angle = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // Draw boid as a triangle
    // Use darker blue in light mode, teal in dark mode
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDarkMode ? "#00CED1" : "#0000FF"; // Teal for dark mode, blue for light mode
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -3);
    ctx.lineTo(-4, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// Initialize canvas and boids
const canvas = document.getElementById("boids-canvas");
const ctx = canvas.getContext("2d");
const fishtank = document.getElementById("boids-fishtank");

// Set canvas size to fishtank dimensions
function resizeCanvas() {
  canvas.width = fishtank ? fishtank.offsetWidth : 200;
  canvas.height = fishtank ? fishtank.offsetHeight : window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Function to create boids
function createBoids(count) {
  const boids = [];
  for (let i = 0; i < count; i++) {
    boids.push(
      new Boid(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
      ),
    );
  }
  return boids;
}

// Create boids (you can change the number here)
const boids = createBoids(100);

// Mouse interaction variables
let isMouseDown = false;
let lastSpawnTime = 0;
const spawnRateLimit = 16;

// Mouse event listeners
canvas.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  spawnBoidAtMouse(e);
});

canvas.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    spawnBoidAtMouse(e);
  }
});

canvas.addEventListener("mouseup", () => {
  isMouseDown = false;
});

canvas.addEventListener("mouseleave", () => {
  isMouseDown = false;
});

// Function to spawn a boid at mouse position with rate limiting
function spawnBoidAtMouse(e) {
  const currentTime = Date.now();
  if (currentTime - lastSpawnTime >= spawnRateLimit) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = Math.min(e.clientY - rect.top, canvas.height); // Clamp to fishtank height

    boids.push(new Boid(x, y));
    lastSpawnTime = currentTime;
  }
}

// Animation loop
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and draw boids
  for (let boid of boids) {
    boid.update(boids);
    boid.draw(ctx);
  }

  requestAnimationFrame(animate);
}

// Start animation
animate();
