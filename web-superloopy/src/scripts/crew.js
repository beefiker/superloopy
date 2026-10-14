// Crew cards: pointer tilt, sway, sheen, click-to-flip, and a one-time arrival.
// Same behavior as the backend/frontend explainers; the markup comes from CrewBoard.astro.
// Each card runs four damped springs (tilt x/y, glow, sway) only while something moves.
(() => {
  const section = document.querySelector("[data-crew]");
  if (!section) return;

  const MAX_TILT_DEG = 9;
  const GLOW_STRENGTH = 0.78;
  const SWAY_PER_TILT = 1.15;     // resting sway (deg) at the card edge
  const MAX_SWAY_SPEED = 3.8;     // deg per frame
  const DRAG_TO_SWAY = 0.048;     // sway speed per px of horizontal pointer travel
  const ENTER_KICK = 1.5;
  const FLIP_KICK = 1.1;
  const TILT_SPRING = { stiffness: 0.17, damping: 0.74 };
  const SWAY_SPRING = { stiffness: 0.092, damping: 0.835 };
  const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const still = () => Boolean(motionQuery?.matches);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  class Spring {
    constructor({ stiffness, damping }) {
      this.stiffness = stiffness;
      this.damping = damping;
      this.value = 0;
      this.velocity = 0;
      this.goal = 0;
    }

    // `frames` is elapsed time in 60fps frames, so the feel survives dropped frames.
    advance(frames) {
      this.velocity = (this.velocity + (this.goal - this.value) * this.stiffness * frames) * this.damping ** frames;
      this.value += this.velocity * frames;
      const resting = Math.abs(this.goal - this.value) < 0.002 && Math.abs(this.velocity) < 0.002;
      if (resting) {
        this.value = this.goal;
        this.velocity = 0;
      }
      return !resting;
    }
  }

  section.querySelectorAll(".crew-card").forEach(setUpCard);
  arriveOnce();

  function setUpCard(card) {
    const swing = card.querySelector(".crew-card__swing");
    const body = card.querySelector(".crew-card__body");
    const front = card.querySelector(".crew-card__face--front");
    const back = card.querySelector(".crew-card__face--back");
    const close = card.querySelector(".crew-card__close");
    const tiltX = new Spring(TILT_SPRING);
    const tiltY = new Spring(TILT_SPRING);
    const glow = new Spring(TILT_SPRING);
    const sway = new Spring(SWAY_SPRING);
    const springs = [tiltX, tiltY, glow, sway];
    let frame = 0;
    let previous = 0;
    let lastPointerX = null;

    function paint() {
      body.style.setProperty("--tilt-x", `${-tiltY.value * MAX_TILT_DEG}deg`);
      body.style.setProperty("--tilt-y", `${tiltX.value * MAX_TILT_DEG}deg`);
      body.style.setProperty("--gx", `${(tiltX.value + 1) * 50}%`);
      body.style.setProperty("--gy", `${(tiltY.value + 1) * 50}%`);
      body.style.setProperty("--glow", String(glow.value * GLOW_STRENGTH));
      swing.style.setProperty("--sway", `${sway.value}deg`);
    }

    function run() {
      if (frame || still()) return;
      previous = 0;
      const tick = (now) => {
        const frames = previous ? Math.min(2.5, (now - previous) / 16.67) : 1;
        previous = now;
        const moving = springs.map((spring) => spring.advance(frames)).some(Boolean);
        paint();
        frame = moving ? requestAnimationFrame(tick) : 0;
      };
      frame = requestAnimationFrame(tick);
    }

    function follow(event) {
      if (still() || event.pointerType === "touch") return;
      const card = body.getBoundingClientRect();
      if (!card.width || !card.height) return;
      const x = clamp(((event.clientX - card.left) / card.width) * 2 - 1, -1, 1);
      const y = clamp(((event.clientY - card.top) / card.height) * 2 - 1, -1, 1);
      if (lastPointerX !== null) {
        const travel = clamp(event.clientX - lastPointerX, -35, 35);
        sway.velocity = clamp(sway.velocity + travel * DRAG_TO_SWAY, -MAX_SWAY_SPEED, MAX_SWAY_SPEED);
      }
      lastPointerX = event.clientX;
      tiltX.goal = x;
      tiltY.goal = y;
      glow.goal = 1;
      sway.goal = x * SWAY_PER_TILT;
      run();
    }

    function settle() {
      lastPointerX = null;
      springs.forEach((spring) => { spring.goal = 0; });
      if (still()) {
        springs.forEach((spring) => { spring.value = 0; spring.velocity = 0; });
        paint();
      } else {
        run();
      }
    }

    function showBack(open) {
      const wasOpen = card.classList.contains("is-flipped");
      if (open === wasOpen) return;
      card.classList.toggle("is-flipped", open);
      front.setAttribute("aria-expanded", String(open));
      back.setAttribute("aria-hidden", String(!open));
      front.tabIndex = open ? -1 : 0;
      close.tabIndex = open ? 0 : -1;
      (open ? close : front).focus({ preventScroll: true });
      if (!still()) {
        sway.velocity += (open ? FLIP_KICK : -FLIP_KICK);
        run();
      }
    }

    card.addEventListener("pointerenter", (event) => {
      if (!still() && event.pointerType === "mouse") {
        const box = card.getBoundingClientRect();
        sway.velocity += event.clientX < box.left + box.width / 2 ? -ENTER_KICK : ENTER_KICK;
      }
      follow(event);
    });
    card.addEventListener("pointermove", follow);
    card.addEventListener("pointerleave", settle);
    card.addEventListener("pointercancel", settle);
    front.addEventListener("click", () => showBack(true));
    back.addEventListener("click", (event) => {
      if (!event.target.closest("button, a")) showBack(false);
    });
    close.addEventListener("click", () => showBack(false));
    back.addEventListener("keydown", (event) => {
      if (event.key === "Escape") showBack(false);
    });
  }

  function arriveOnce() {
    if (still()) return;
    if (!("IntersectionObserver" in window)) {
      section.classList.add("is-arriving");
      return;
    }
    const watcher = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      section.classList.add("is-arriving");
      watcher.disconnect();
    }, { threshold: 0.12 });
    watcher.observe(section.querySelector(".crew__board"));
  }
})();
