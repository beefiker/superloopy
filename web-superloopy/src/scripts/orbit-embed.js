// Hero orbit mount — lazy-embeds the vendored orbit runtime iframe and
// forwards pointer position. Split from app.js to keep files reviewable.


const orbitHost = document.querySelector("[data-orbit]");
if (orbitHost) {
  const mount = () => {
    if (orbitHost.querySelector("iframe")) return;
    const iframe = document.createElement("iframe");
    iframe.src = orbitHost.dataset.orbitSrc;
    iframe.title = "Superloopy orbit";
    iframe.loading = "eager";
    iframe.setAttribute("aria-hidden", "true");
    orbitHost.appendChild(iframe);

    // Same-origin readiness contract: window.__superloopyOrbitStatus.frames
    const poll = setInterval(() => {
      try {
        const status = iframe.contentWindow?.__superloopyOrbitStatus;
        if (status && status.frames >= 24) {
          orbitHost.classList.add("is-ready");
          clearInterval(poll);
        }
      } catch {
        orbitHost.classList.add("is-ready");
        clearInterval(poll);
      }
    }, 250);
    setTimeout(() => {
      orbitHost.classList.add("is-ready");
      clearInterval(poll);
    }, 8000);

    // Forward pointer position into the scene. The runtime's
    // applyScenePointer expects NDC-style [-1, 1] coordinates
    // (x = (pointer.x + 1) * 0.5 * width), measured against the scene
    // viewport — so normalize against the iframe rect, not the window.
    window.addEventListener("pointermove", (e) => {
      const rect = iframe.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      iframe.contentWindow?.postMessage(
        {
          type: "superloopy-orbit-pointer",
          pointer: {
            x: clamp(((e.clientX - rect.left) / rect.width) * 2 - 1),
            y: clamp(((e.clientY - rect.top) / rect.height) * 2 - 1),
          },
        },
        window.location.origin
      );
    });
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          mount();
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(orbitHost);
  } else {
    mount();
  }
}
