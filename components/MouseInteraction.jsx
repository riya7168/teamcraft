"use client";

import { useEffect } from "react";

const INTERACTIVE_SELECTOR = "a, button, input, textarea, select, summary, .panel, .feature-card, .stat-card, .candidate-card, .task-card, .profile-section";
const DEPTH_SELECTOR = ".feature-card, .home-cta, .hero-art, .art-person, .auth-quote, .invite-card, .panel, .stat-card, .candidate-card, .task-card, .member-dashboard, .profile-section, .first-project-card";

export default function MouseInteraction() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cursor = document.createElement("div");
    cursor.className = "mouse-interaction-cursor";
    cursor.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursor);
    document.body.classList.add("has-interactive-mouse");
    let depthTarget = null;

    const resetDepth = () => {
      if (!depthTarget) return;
      depthTarget.classList.remove("is-3d-active");
      depthTarget.style.removeProperty("--tilt-x");
      depthTarget.style.removeProperty("--tilt-y");
      depthTarget = null;
    };

    const onPointerMove = (event) => {
      const position = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      cursor.style.transform = position;
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest(INTERACTIVE_SELECTOR);
      const depthElement = target?.closest(DEPTH_SELECTOR);
      if (depthTarget !== depthElement) resetDepth();
      if (depthElement) {
        const rect = depthElement.getBoundingClientRect();
        const tiltX = ((rect.top + rect.height / 2 - event.clientY) / Math.max(rect.height / 2, 1)) * 2.6;
        const tiltY = ((event.clientX - rect.left - rect.width / 2) / Math.max(rect.width / 2, 1)) * 3.2;
        depthElement.style.setProperty("--tilt-x", `${tiltX}deg`);
        depthElement.style.setProperty("--tilt-y", `${tiltY}deg`);
        depthElement.classList.add("is-3d-active");
        depthTarget = depthElement;
      }
      cursor.classList.toggle("is-visible", Boolean(interactive));
      cursor.classList.toggle("is-action", Boolean(interactive?.matches("a, button, summary")));
      cursor.classList.toggle("is-text", Boolean(interactive?.matches("input, textarea, select")));
    };
    const onPointerDown = () => {
      cursor.classList.add("is-pressed");
    };
    const onPointerUp = () => {
      cursor.classList.remove("is-pressed");
    };
    const onPointerLeave = () => {
      cursor.classList.remove("is-visible", "is-action", "is-text", "is-pressed");
      resetDepth();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.body.classList.remove("has-interactive-mouse");
      cursor.remove();
    };
  }, []);

  return null;
}
