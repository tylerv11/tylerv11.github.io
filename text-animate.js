/**
 * TextAnimate — vanilla-JS port of MagicUI's TextAnimate (fadeIn, by="line").
 * Marks each direct child "line" of a container with a staggered fade +
 * rise transition, then reveals them together the first time the
 * container scrolls into view.
 *
 * Usage:
 *   <div data-text-animate data-stagger="0.12">
 *     <p>Line one.</p>
 *     <p>Line two.</p>
 *   </div>
 *   <script src="text-animate.js" defer></script>
 *
 * `data-text-animate-item` (default "p") picks which direct children count
 * as a "line" — everything else (e.g. a nested widget) is left untouched.
 *
 * `data-trigger="load"` reveals the lines as soon as the page loads instead
 * of waiting for the container to scroll into view (the default).
 */
(function (global) {
    "use strict";

    function setupGroup(group) {
        if (group.__textAnimateInit) return;
        group.__textAnimateInit = true;

        var selector = group.getAttribute("data-text-animate-item") || "p";
        var lines = Array.prototype.filter.call(group.children, function (child) {
            return child.matches(selector);
        });
        if (!lines.length) return;

        var stagger = parseFloat(group.getAttribute("data-stagger"));
        if (isNaN(stagger)) stagger = 0.15;

        lines.forEach(function (line, index) {
            line.classList.add("text-animate-line");
            line.style.transitionDelay = (index * stagger) + "s";
        });

        var reduceMotion = window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        function reveal() {
            lines.forEach(function (line) { line.classList.add("text-animate-in"); });
        }

        if (reduceMotion) {
            reveal();
            return;
        }

        var onLoad = group.getAttribute("data-trigger") === "load";
        if (onLoad || !("IntersectionObserver" in window)) {
            requestAnimationFrame(function () { requestAnimationFrame(reveal); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                reveal();
                io.disconnect();
            });
        }, { threshold: 0 });
        io.observe(group);
    }

    function init(root) {
        var groups = (root || document).querySelectorAll("[data-text-animate]");
        Array.prototype.forEach.call(groups, setupGroup);
    }

    document.addEventListener("DOMContentLoaded", function () { init(); });

    global.TextAnimate = { init: init };
})(window);
