import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * SquircleFireAvatar Component
 * Animated squircle (superellipse N=4) profile frame with particle fire flames.
 * Supports Tiers 0 to 5 with single-canvas flame color morphing, ignition flare,
 * extinguish smoke, level-up pulse flash, and prefers-reduced-motion support.
 */

export const SQUIRCLE_TIERS = [
  {
    tier: 0,
    name: 'No Flame / Neutral',
    styleName: 'Neutral Grey',
    mainGlow: '#8a8a8a',
    ring: ['#8a8a8a', '#4a4a4a'],
    info: 'No active streak flame.',
    getParticleColor: () => [0, 0, 50]
  },
  {
    tier: 1,
    name: 'Bronze / Starter',
    styleName: 'Glowing Crimson',
    mainGlow: '#e01b2f',
    ring: ['#ff4d4d', '#a3001b'],
    info: 'Bronze / Starter: deep, volcanic embers. The spark of a new streak (~3,000K, Betelgeuse).',
    getParticleColor: () => [
      350 + Math.random() * 10, // h350-360
      100,                      // s100
      38 + Math.random() * 12   // l38-50
    ]
  },
  {
    tier: 2,
    name: 'Silver / Intermediate',
    styleName: 'Glowing Amber',
    mainGlow: '#ff9a1f',
    ring: ['#ffc247', '#ff7a00'],
    info: 'Silver / Intermediate: bright, fiery furnace glow. Gaining momentum (~4,500K, Arcturus).',
    getParticleColor: () => [
      24 + Math.random() * 16,  // h24-40
      100,                      // s100
      48 + Math.random() * 10   // l48-58
    ]
  },
  {
    tier: 3,
    name: 'Gold / Advanced',
    styleName: 'Glowing Sun-Yellow',
    mainGlow: '#ffd60a',
    ring: ['#fff27a', '#ffb400'],
    info: 'Gold / Advanced: brilliant solar radiation flare. Solid, established streak (~6,000K, Sun).',
    getParticleColor: () => [
      46 + Math.random() * 12,  // h46-58
      100,                      // s100
      52 + Math.random() * 10   // l52-62
    ]
  },
  {
    tier: 4,
    name: 'Platinum / Elite',
    styleName: 'Glowing Diamond White',
    mainGlow: '#eaf6ff',
    ring: ['#ffffff', '#bfe4ff'],
    info: 'Platinum / Elite: intense, piercing electric white. Scorching, elite streak (~10,000K, Vega).',
    getParticleColor: () => [
      180 + Math.random() * 35, // h180-215
      Math.random() * 30,       // s0-30
      85 + Math.random() * 13   // l85-98
    ]
  },
  {
    tier: 5,
    name: 'Mythic / Ultimate',
    styleName: 'Glowing Hyper-Blue',
    mainGlow: '#2f7bff',
    ring: ['#7fd4ff', '#1f4dff'],
    info: 'Mythic / Ultimate: neon, high-energy cosmic arc. Absolute peak tier (30,000K+, Rigel).',
    getParticleColor: () => {
      if (Math.random() < 0.2) return [195, 100, 80];
      return [
        210 + Math.random() * 20, // h210-230
        100,                      // s100
        52 + Math.random() * 10   // l52-62
      ];
    }
  }
];

export const getTierIndexFromStreak = (streak) => {
  if (streak >= 50) return 5; // Tier 5
  if (streak >= 30) return 4; // Tier 4
  if (streak >= 14) return 3; // Tier 3
  if (streak >= 7) return 2;  // Tier 2
  if (streak >= 3) return 1;  // Tier 1
  return 0; // Tier 0 (No flame)
};

// Easing Utilities
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;

// Color Interpolation Helpers
const hexToRgb = (hex) => {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const rgbToHex = ([r, g, b]) => {
  const toHex = (n) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const lerpRgb = (rgb1, rgb2, t) => [
  rgb1[0] + (rgb2[0] - rgb1[0]) * t,
  rgb1[1] + (rgb2[1] - rgb1[1]) * t,
  rgb1[2] + (rgb2[2] - rgb1[2]) * t
];

const lerpHex = (hex1, hex2, t) => {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  return rgbToHex(lerpRgb(rgb1, rgb2, Math.max(0, Math.min(1, t))));
};

const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));

const SquircleFireAvatar = forwardRef(({
  tier = 1,
  pulseStreak = 0,
  src = null,
  fallbackText = 'U',
  size = 120,
  shape = 'squircle',
  isCircle = false,
  style = {},
  className = '',
  onClick = null
}, ref) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  const useCircleShape = isCircle || shape === 'circle';

  // Compute initial tier index (0 to 5)
  const initialTierIdx = pulseStreak > 0
    ? getTierIndexFromStreak(pulseStreak)
    : (tier >= 0 && tier <= 5 ? tier : 1);

  // Transition Ref keeps track of morphing state without triggering React re-renders
  const transitionRef = useRef({
    fromTier: initialTierIdx,
    toTier: initialTierIdx,
    start: 0,
    duration: 0,
    p: 1,
    burstFired: false
  });

  // Imperative Handle for controlling transition programmatically via ref
  useImperativeHandle(ref, () => ({
    setTier: (targetTier, options = {}) => {
      const { duration = 1400 } = options;
      startTransition(targetTier, duration);
    },
    getCurrentTier: () => transitionRef.current.toTier
  }));

  const startTransition = (targetTier, duration = 1400) => {
    const clampedTarget = Math.max(0, Math.min(5, targetTier));
    const trans = transitionRef.current;
    const now = Date.now();

    // If already at target tier with no active transition, do nothing unless duration is 0
    if (clampedTarget === trans.toTier && trans.p >= 1 && duration > 0) {
      return;
    }

    let currentBlendedFrom = trans.toTier;

    // Mid-transition recalculation: compute current progress and smooth transition from current state
    if (trans.p < 1 && trans.duration > 0) {
      const elapsed = now - trans.start;
      const currentP = Math.min(1, Math.max(0, elapsed / trans.duration));
      currentBlendedFrom = currentP >= 0.5 ? trans.toTier : trans.fromTier;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finalDuration = prefersReducedMotion ? 400 : duration;

    transitionRef.current = {
      fromTier: currentBlendedFrom,
      toTier: clampedTarget,
      start: now,
      duration: finalDuration,
      p: finalDuration === 0 ? 1 : 0,
      burstFired: false
    };

    if (finalDuration > 0 && !prefersReducedMotion) {
      triggerTransitionBurst(currentBlendedFrom, clampedTarget);
      transitionRef.current.burstFired = true;
    }
  };

  // React prop change listener
  useEffect(() => {
    const target = pulseStreak > 0
      ? getTierIndexFromStreak(pulseStreak)
      : (tier >= 0 && tier <= 5 ? tier : 0);
    if (target !== transitionRef.current.toTier) {
      startTransition(target, 1400);
    }
  }, [tier, pulseStreak]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 420;
    const height = 520;
    const CX = 210;
    const CY = 310;
    const R = 95;
    const N = 4;

    const getPointOnShape = (a, r) => {
      if (useCircleShape) {
        return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
      }
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = CX + r * Math.sign(c) * Math.pow(Math.abs(c), 2 / N);
      const y = CY + r * Math.sign(s) * Math.pow(Math.abs(s), 2 / N);
      return [x, y];
    };

    const drawShapePath = (r) => {
      ctx.beginPath();
      if (useCircleShape) {
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
      } else {
        for (let i = 0; i <= 120; i++) {
          const [x, y] = getPointOnShape((i / 120) * Math.PI * 2, r);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
    };

    // Preload Avatar Image
    let imgObj = null;
    if (src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { imgObj = img; };
      img.src = src;
    }

    // Flame Particle Spawner
    const spawnParticleForTier = (tierIdx, sizeScale = 1, lifeScale = 1) => {
      if (tierIdx <= 0) return; // Tier 0 produces no flame particles
      let a = Math.random() * Math.PI * 2;
      if (Math.sin(a) > 0.4 && Math.random() < 0.7) {
        a = -a;
      }
      const [x, y] = getPointOnShape(a, R + rnd(0, 8));
      const dx = x - CX;
      const dy = y - CY;
      const d = Math.hypot(dx, dy) || 1;

      const tierConfig = SQUIRCLE_TIERS[tierIdx] || SQUIRCLE_TIERS[1];
      const [h, s, l] = tierConfig.getParticleColor();

      particlesRef.current.push({
        x,
        y,
        vx: (dx / d) * 0.5 + rnd(-0.4, 0.4),
        vy: -rnd(1.2, 3.8) - (dy < 0 ? 1 : 0),
        life: 0,
        maxLife: rnd(50, 100) * lifeScale,
        size: rnd(7, 20) * sizeScale,
        h,
        s,
        l,
        wobblePhase: rnd(0, Math.PI * 2),
        isSmoke: false
      });
    };

    // Smoke Particle Spawner (for Extinguish)
    const spawnSmokeParticle = () => {
      let a = Math.random() * Math.PI * 2;
      const [x, y] = getPointOnShape(a, R + rnd(0, 5));
      particlesRef.current.push({
        x,
        y,
        vx: rnd(-0.3, 0.3),
        vy: -rnd(0.5, 1.2),
        life: 0,
        maxLife: rnd(60, 100),
        size: rnd(12, 25),
        h: 0,
        s: 0,
        l: 60,
        wobblePhase: rnd(0, Math.PI * 2),
        isSmoke: true
      });
    };

    // Perimeter Flame Burst
    const spawnPerimeterBurst = (tierIdx, count, minVy = -3, maxVy = -6) => {
      const tierConfig = SQUIRCLE_TIERS[tierIdx] || SQUIRCLE_TIERS[1];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rnd(-0.05, 0.05);
        const [x, y] = getPointOnShape(a, R + rnd(-2, 10));
        const dx = x - CX;
        const dy = y - CY;
        const d = Math.hypot(dx, dy) || 1;
        const [h, s, l] = tierConfig.getParticleColor();

        particlesRef.current.push({
          x,
          y,
          vx: (dx / d) * rnd(0.5, 1.5) + rnd(-0.5, 0.5),
          vy: rnd(minVy, maxVy),
          life: 0,
          maxLife: rnd(40, 90),
          size: rnd(9, 22),
          h,
          s,
          l,
          wobblePhase: rnd(0, Math.PI * 2),
          isSmoke: false
        });
      }
    };

    // Helper for burst trigger
    window.__triggerPerimeterBurst = (tierIdx, count, minVy, maxVy) => {
      spawnPerimeterBurst(tierIdx, count, minVy, maxVy);
    };

    const drawAvatar = () => {
      ctx.save();
      drawShapePath(R - 3);
      ctx.clip();

      if (imgObj) {
        const minDim = Math.min(imgObj.width, imgObj.height);
        ctx.drawImage(
          imgObj,
          (imgObj.width - minDim) / 2,
          (imgObj.height - minDim) / 2,
          minDim,
          minDim,
          CX - R,
          CY - R,
          R * 2,
          R * 2
        );
      } else {
        const bgGrad = ctx.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
        bgGrad.addColorStop(0, '#1e293b');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(fallbackText).toUpperCase().slice(0, 2), CX, CY);
      }

      ctx.restore();
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Main Animation Loop
    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      const trans = transitionRef.current;
      const now = Date.now();
      let p = 1;
      if (trans.duration > 0) {
        p = Math.min(1, Math.max(0, (now - trans.start) / trans.duration));
      }
      trans.p = p;

      const fromTier = trans.fromTier;
      const toTier = trans.toTier;
      const fromConfig = SQUIRCLE_TIERS[fromTier] || SQUIRCLE_TIERS[0];
      const toConfig = SQUIRCLE_TIERS[toTier] || SQUIRCLE_TIERS[0];

      const isIgnition = fromTier === 0 && toTier > 0;
      const isExtinguish = fromTier > 0 && toTier === 0;
      const isColorChange = fromTier > 0 && toTier > 0 && fromTier !== toTier;

      let e = p;
      if (isIgnition) {
        e = easeOutCubic(p);
      } else if (isExtinguish) {
        e = easeInCubic(p);
      } else if (isColorChange) {
        e = easeInOutCubic(p);
      }

      // Spawning new particles based on transition phase
      if (!prefersReducedMotion) {
        if (isIgnition) {
          const spawnCount = Math.floor(8 * e);
          const sizeScale = 0.5 + 0.5 * e;
          const lifeScale = 0.5 + 0.5 * e;
          for (let i = 0; i < spawnCount; i++) {
            spawnParticleForTier(toTier, sizeScale, lifeScale);
          }
        } else if (isExtinguish) {
          const spawnCount = Math.floor(8 * (1 - e));
          for (let i = 0; i < spawnCount; i++) {
            spawnParticleForTier(fromTier, 1, 1);
          }
          // Smoke particles during last 30% of extinguish transition
          if (p >= 0.7) {
            if (Math.random() < 0.6) spawnSmokeParticle();
          }
        } else if (isColorChange) {
          for (let i = 0; i < 8; i++) {
            const activeTier = Math.random() < e ? toTier : fromTier;
            spawnParticleForTier(activeTier, 1, 1);
          }
        } else {
          // Steady State (p = 1)
          if (toTier > 0) {
            for (let i = 0; i < 8; i++) {
              spawnParticleForTier(toTier, 1, 1);
            }
          }
        }
      }

      // ── COLOR LERPING & EFFECTS ──
      let glowColor = lerpHex(fromConfig.mainGlow, toConfig.mainGlow, e);
      let ringColor0 = lerpHex(fromConfig.ring[0], toConfig.ring[0], e);
      let ringColor1 = lerpHex(fromConfig.ring[1], toConfig.ring[1], e);

      let shadowBlurMultiplier = 1.0;
      let ringLineWidth = 5;

      // 1. Ignition White Flash for ~150ms
      const elapsedMs = now - trans.start;
      if (isIgnition && elapsedMs < 150 && !prefersReducedMotion) {
        const flashRatio = 1 - (elapsedMs / 150);
        ringColor0 = lerpHex(ringColor0, '#ffffff', flashRatio);
        ringColor1 = lerpHex(ringColor1, '#ffffff', flashRatio);
        glowColor = lerpHex(glowColor, '#ffffff', flashRatio * 0.7);
      }

      // 2. Color Change Level-Up Flash at p = 0.5
      if (isColorChange && !prefersReducedMotion && trans.duration > 0) {
        const flashFactor = Math.sin(Math.PI * p);
        shadowBlurMultiplier = 1.0 + 1.5 * flashFactor; // Glow blur up to 2.5x
        ringLineWidth = 5 + 3 * flashFactor;            // Ring width 5 -> ~8
      }

      const timeSec = Date.now() / 1000;

      // ── DRAW FLAME & SMOKE PARTICLES ──
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pObj = particles[i];
        pObj.life++;
        if (pObj.life > pObj.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        pObj.x += pObj.vx + Math.sin(timeSec * 5 + pObj.wobblePhase) * 0.6;
        pObj.y += pObj.vy;
        pObj.vy *= 0.995;

        const k = pObj.life / pObj.maxLife;
        const currentSize = pObj.size * (1 - k * 0.8);
        const alpha = (1 - k) * 0.9;

        if (pObj.isSmoke) {
          // Smoke rendering (source-over, grey radial gradient)
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          const smokeGrad = ctx.createRadialGradient(pObj.x, pObj.y, 0, pObj.x, pObj.y, currentSize);
          smokeGrad.addColorStop(0, `hsla(0, 0%, 60%, ${alpha * 0.35})`);
          smokeGrad.addColorStop(1, `hsla(0, 0%, 60%, 0)`);
          ctx.fillStyle = smokeGrad;
          ctx.beginPath();
          ctx.arc(pObj.x, pObj.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Flame rendering (lighter additive blending)
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const grad = ctx.createRadialGradient(pObj.x, pObj.y, 0, pObj.x, pObj.y, currentSize);
          grad.addColorStop(0, `hsla(${pObj.h}, ${pObj.s}%, ${Math.min(96, pObj.l + 22)}%, ${alpha})`);
          grad.addColorStop(0.5, `hsla(${pObj.h}, ${pObj.s}%, ${pObj.l}%, ${alpha * 0.6})`);
          grad.addColorStop(1, `hsla(${pObj.h}, ${pObj.s}%, ${pObj.l}%, 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(pObj.x, pObj.y, currentSize * 0.75, currentSize * 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ── DRAW SOFT OUTER GLOW ──
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = (35 + Math.sin(timeSec * 6) * 8) * shadowBlurMultiplier;
      ctx.lineWidth = 8;
      ctx.strokeStyle = glowColor;
      ctx.globalAlpha = toTier === 0 && p === 1 ? 0.2 : 0.55;
      drawShapePath(R + 4);
      ctx.stroke();
      ctx.restore();

      // ── DRAW AVATAR ──
      ctx.globalCompositeOperation = 'source-over';
      drawAvatar();

      // ── DRAW GLOWING BORDER RING ──
      const ringGrad = ctx.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
      ringGrad.addColorStop(0, ringColor0);
      ringGrad.addColorStop(0.5, ringColor1);
      ringGrad.addColorStop(1, ringColor0);

      ctx.lineWidth = ringLineWidth;
      ctx.strokeStyle = ringGrad;
      drawShapePath(R);
      ctx.stroke();

      // Cap max particles at 1200
      if (particles.length > 1200) {
        particles.splice(0, particles.length - 1200);
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      delete window.__triggerPerimeterBurst;
    };
  }, [src, fallbackText, useCircleShape]);

  // Helper trigger function for transition burst
  const triggerTransitionBurst = (fromTier, toTier) => {
    if (window.__triggerPerimeterBurst) {
      if (fromTier === 0 && toTier > 0) {
        window.__triggerPerimeterBurst(toTier, rndInt(100, 150), -2.5, -5.5);
      } else if (fromTier > 0 && toTier > 0 && fromTier !== toTier) {
        window.__triggerPerimeterBurst(toTier, rndInt(60, 100), -3, -6);
      }
    }
  };

  const currentTierConfig = SQUIRCLE_TIERS[initialTierIdx] || SQUIRCLE_TIERS[0];

  return (
    <div
      className={`squircle-fire-avatar-container ${className}`}
      data-tier={initialTierIdx}
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size * (520 / 420)}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        width={420}
        height={520}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
});

export default SquircleFireAvatar;
