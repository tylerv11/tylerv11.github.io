/**
 * Stretchy Footer — vanilla-JS port of 23rd.dev's StretchyFooter.
 * Dia-style rubber overscroll: pull past the bottom of the page and a
 * rainbow aurora stretches up from the floor, then springs back when
 * released. GPU transforms only (no height animation).
 *
 * Usage:
 *   <script src="stretchy-footer.js" defer></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function () {
 *       StretchyFooter.init({ colors: [...], maxStretch: 220 });
 *     });
 *   </script>
 *
 * The page content that should lift with the stretch must sit inside an
 * element matching `contentSelector` (default `[data-stretchy-page]`).
 * Fixed-position chrome (navbar, cursor canvas, etc.) should live outside
 * that element so it isn't affected.
 */
(function (global) {
    "use strict";

    var DEFAULT_COLORS = [
        "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
        "#32ADE6", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55"
    ];
    var DEFAULT_COLUMNS = 48;
    var DEFAULT_BLUR = 14;
    var DEFAULT_GLOW = 0.22;
    var WHEEL_IDLE_MS = 90;
    var PULL_GAIN = 0.7;
    var POP_BOOST = 1.45;

    function hexToRgba(hex, alpha) {
        var raw = hex.replace("#", "");
        var full = raw.length === 3
            ? raw.split("").map(function (c) { return c + c; }).join("")
            : raw.slice(0, 6);
        var r = parseInt(full.slice(0, 2), 16);
        var g = parseInt(full.slice(2, 4), 16);
        var b = parseInt(full.slice(4, 6), 16);
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    }

    function columnScale(index, count) {
        if (count <= 1) return 1;
        var t = (index / (count - 1)) * 2 - 1;
        return Math.exp(-t * t * 2.2);
    }

    function applyResistance(current, delta, max) {
        if (max <= 0) return 0;
        var t = Math.min(1, Math.max(0, current / max));
        var falloff = (1 - t) * (1 - t * 0.35);
        var pop = current < 40 ? POP_BOOST : 1;
        return Math.min(max, Math.max(0, current + delta * PULL_GAIN * falloff * pop));
    }

    function windowAtBottom(slack) {
        slack = slack || 1;
        var doc = document.documentElement;
        return window.scrollY + window.innerHeight >= doc.scrollHeight - slack;
    }

    function init(options) {
        options = options || {};

        var reduceMotion = !!(global.matchMedia &&
            global.matchMedia("(prefers-reduced-motion: reduce)").matches);
        if (reduceMotion) return null;

        var maxStretch = options.maxStretch != null ? options.maxStretch : 280;
        var colors = options.colors || DEFAULT_COLORS;
        var stiffness = options.stiffness != null ? options.stiffness : 380;
        var damping = options.damping != null ? options.damping : 32;
        var mass = 0.35;
        var columns = Math.max(8, Math.min(96, Math.floor(options.columns || DEFAULT_COLUMNS)));
        var blur = options.blur != null ? options.blur : DEFAULT_BLUR;
        var glow = options.glow != null ? Math.min(1, Math.max(0, options.glow)) : DEFAULT_GLOW;
        var contentSelector = options.contentSelector || "[data-stretchy-page]";
        var label = options.label || "Stretchy overflow";

        var root = document.createElement("div");
        root.className = "stretchy-footer-root";
        root.setAttribute("data-slot", "stretchy-footer");
        root.setAttribute("aria-hidden", "true");
        root.setAttribute("aria-label", label);
        root.style.height = maxStretch + "px";

        var field = document.createElement("div");
        field.className = "stretchy-footer-field";
        field.style.transform = "scaleY(0)";
        field.style.opacity = "0";

        var barsWrap = document.createElement("div");
        barsWrap.className = "stretchy-footer-bars";
        barsWrap.style.filter = "blur(" + Math.max(0, blur) + "px)";

        for (var i = 0; i < columns; i++) {
            var color = colors[i % colors.length];
            var heightPct = Math.max(28, columnScale(i, columns) * 100).toFixed(2);
            var bar = document.createElement("div");
            bar.className = "stretchy-footer-bar";
            bar.style.height = heightPct + "%";
            bar.style.backgroundImage =
                "linear-gradient(to top, " + hexToRgba(color, 1) + " 0%, " +
                hexToRgba(color, 0.6) + " 45%, rgba(0, 0, 0, 0) 100%)";
            barsWrap.appendChild(bar);
        }

        var bloom = document.createElement("div");
        bloom.className = "stretchy-footer-bloom";
        bloom.style.backgroundImage =
            "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,255,255," + glow + "), rgba(0, 0, 0, 0) 70%)";

        field.appendChild(barsWrap);
        field.appendChild(bloom);
        root.appendChild(field);
        document.body.appendChild(root);

        var contentEl = document.querySelector(contentSelector);

        var pull = 0;
        var stretch = 0;
        var stretchVel = 0;
        var rafId = null;
        var wheelTimer = null;
        var lastTime = null;

        function setContentTransform(v) {
            if (!contentEl) return;
            if (v < 0.2) {
                contentEl.style.transform = "";
                contentEl.style.willChange = "";
                contentEl.style.transformOrigin = "";
                return;
            }
            contentEl.style.transformOrigin = "50% 100%";
            contentEl.style.willChange = "transform";
            contentEl.style.transform = "translate3d(0, " + (-v) + "px, 0)";
        }

        function render() {
            var progress = maxStretch <= 0 ? 0 : Math.min(1, Math.max(0, stretch / maxStretch));
            var opacity = progress <= 0 ? 0 : (progress < 0.2 ? progress / 0.2 : 1);
            field.style.transform = "scaleY(" + progress + ")";
            field.style.opacity = String(opacity);
            setContentTransform(stretch);
        }

        function stepSpring(dt) {
            var force = -stiffness * (stretch - pull);
            var dampingForce = -damping * stretchVel;
            var accel = (force + dampingForce) / mass;
            stretchVel += accel * dt;
            stretch += stretchVel * dt;
        }

        function tick(now) {
            if (lastTime == null) lastTime = now;
            var dt = Math.min(1 / 30, (now - lastTime) / 1000);
            lastTime = now;
            stepSpring(dt);

            var settled = Math.abs(stretch - pull) < 0.2 && Math.abs(stretchVel) < 0.2;
            if (settled) {
                stretch = pull;
                stretchVel = 0;
                render();
                rafId = null;
                lastTime = null;
                return;
            }
            render();
            rafId = requestAnimationFrame(tick);
        }

        function ensureLoop() {
            if (rafId == null) {
                lastTime = null;
                rafId = requestAnimationFrame(tick);
            }
        }

        function clearWheelTimer() {
            if (wheelTimer) {
                clearTimeout(wheelTimer);
                wheelTimer = null;
            }
        }

        function snapBack() {
            clearWheelTimer();
            pull = 0;
            ensureLoop();
        }

        function onWheel(e) {
            var current = pull;
            var scrollingDown = e.deltaY > 0;
            var scrollingUp = e.deltaY < 0;

            if (current > 0.5 || stretch > 0.5) {
                e.preventDefault();
                if (scrollingUp) {
                    var next = Math.max(0, current + e.deltaY * PULL_GAIN);
                    if (next <= 0.5) {
                        snapBack();
                        return;
                    }
                    pull = next;
                } else if (scrollingDown) {
                    pull = applyResistance(current, e.deltaY, maxStretch);
                }
                ensureLoop();
                clearWheelTimer();
                wheelTimer = setTimeout(snapBack, WHEEL_IDLE_MS);
                return;
            }

            if (scrollingDown && windowAtBottom()) {
                e.preventDefault();
                pull = applyResistance(0, e.deltaY, maxStretch);
                ensureLoop();
                clearWheelTimer();
                wheelTimer = setTimeout(snapBack, WHEEL_IDLE_MS);
            }
        }

        var touchStartY = 0;
        var touchStretch0 = 0;

        function onTouchStart(e) {
            var t = e.touches[0];
            if (!t) return;
            touchStartY = t.clientY;
            touchStretch0 = pull;
        }

        function onTouchMove(e) {
            var t = e.touches[0];
            if (!t) return;
            var dy = touchStartY - t.clientY;
            var current = pull;

            if (current > 0.5 || stretch > 0.5 || (dy > 0 && windowAtBottom())) {
                if (e.cancelable) e.preventDefault();
                var boost = current < 40 ? POP_BOOST : 1;
                var fromRest = touchStretch0 + dy * PULL_GAIN * boost;
                pull = Math.min(maxStretch, Math.max(0, fromRest));
                ensureLoop();
            }
        }

        function onTouchEnd() {
            if (pull > 0.5 || stretch > 0.5) snapBack();
        }

        var prevOverscroll = document.documentElement.style.overscrollBehaviorY;
        document.documentElement.style.overscrollBehaviorY = "none";

        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onTouchEnd);
        window.addEventListener("touchcancel", onTouchEnd);

        return {
            destroy: function () {
                clearWheelTimer();
                if (rafId != null) cancelAnimationFrame(rafId);
                document.documentElement.style.overscrollBehaviorY = prevOverscroll;
                window.removeEventListener("wheel", onWheel);
                window.removeEventListener("touchstart", onTouchStart);
                window.removeEventListener("touchmove", onTouchMove);
                window.removeEventListener("touchend", onTouchEnd);
                window.removeEventListener("touchcancel", onTouchEnd);
                if (contentEl) {
                    contentEl.style.transform = "";
                    contentEl.style.willChange = "";
                    contentEl.style.transformOrigin = "";
                }
                if (root.parentNode) root.parentNode.removeChild(root);
            }
        };
    }

    global.StretchyFooter = { init: init };
})(window);
