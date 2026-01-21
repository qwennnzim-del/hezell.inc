
import React, { useEffect, useRef } from 'react';

interface NeuralBackgroundProps {
  isThinking: boolean;
  isTurbo: boolean;
}

const NeuralBackground: React.FC<NeuralBackgroundProps> = ({ isThinking, isTurbo }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Configuration based on state
    const getParticleCount = () => window.innerWidth < 768 ? 40 : 80;
    const getSpeedMultiplier = () => {
        if (isTurbo) return 3.5; // Fast speed for Turbo
        if (isThinking) return 0.5; // Slow, deliberate speed for Thinking
        return 1; // Normal speed
    };
    const getColor = () => {
        if (isTurbo) return '234, 179, 8'; // Yellow/Gold
        if (isThinking) return '168, 85, 247'; // Purple
        return '6, 182, 212'; // Cyan/Blue
    };

    let particles: Particle[] = [];
    
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        const speed = getSpeedMultiplier();
        this.x += this.vx * speed;
        this.y += this.vy * speed;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${getColor()}, 0.6)`;
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      const count = getParticleCount();
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      
      const rgb = getColor();

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Draw connections
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 150;

          if (distance < maxDist) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${rgb}, ${1 - distance / maxDist})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };

    init();
    const animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isThinking, isTurbo]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-20 transition-colors duration-1000 ease-in-out"
    />
  );
};

export default NeuralBackground;
