/**
 * ASCII Logo — vanilla-JS port of 23rd.dev's ascii-logo component.
 * Interactive ASCII wordmark: glyphs shove away from the cursor, then
 * click-cycle through scatter, gravity drop, and reassemble. Zero deps.
 *
 * Usage:
 *   <div id="my-logo" role="img" aria-label="Tyler" tabindex="0">
 *     <canvas></canvas>
 *   </div>
 *   <script src="ascii-logo.js" defer></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function () {
 *       AsciiLogo.init(document.getElementById('my-logo'), { text: 'Tyler' });
 *     });
 *   </script>
 */
(function (global) {
    "use strict";

    var MAX_TEXT_LETTERS = 5;
    var DEFAULT_CHARSET =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";
    var LIGHT = { ink: "#3f3f46", paper: "#fafafa" };
    var DARK = { ink: "#a1a1aa", paper: "#09090b" };
    var TEXT_FONT = '900 1px "Arial Black", Impact, Arial, ui-sans-serif, system-ui, sans-serif';

    function clampText(text, maxLetters) {
        maxLetters = maxLetters || MAX_TEXT_LETTERS;
        return Array.from(text).slice(0, maxLetters).join("");
    }

    function isDarkTheme() {
        var root = document.documentElement;
        if (root.classList.contains("dark")) return true;
        if (root.classList.contains("light")) return false;
        var dataTheme = root.getAttribute("data-theme");
        if (dataTheme === "dark") return true;
        if (dataTheme === "light") return false;
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function resolveDark(theme) {
        if (theme === "dark") return true;
        if (theme === "light") return false;
        return isDarkTheme();
    }

    function pickChar(charset) {
        var pool = charset.length > 0 ? charset : DEFAULT_CHARSET;
        return pool[Math.floor(Math.random() * pool.length)] || "#";
    }

    function easeToward(cell, targetX, targetY, ease) {
        cell.offsetX += (targetX - cell.offsetX) * ease;
        cell.offsetY += (targetY - cell.offsetY) * ease;
    }

    function frameEase(ease, frames) {
        var e = Math.min(1, Math.max(0, ease));
        if (frames <= 0) return e;
        return 1 - Math.pow(1 - e, frames);
    }

    function staggerCells(cells, staggerFrames) {
        var max = Math.max(0, staggerFrames);
        for (var i = 0; i < cells.length; i++) {
            cells[i].wait = Math.random() * max;
        }
    }

    function createAsciiLogo(root, canvas, initial) {
        initial = initial || {};
        var options = Object.assign({
            text: "23rd",
            fit: 0.82,
            cellSize: 11,
            cellGap: 2,
            charset: DEFAULT_CHARSET,
            threshold: 0.2,
            hoverRadius: 7,
            hoverPush: 2.6,
            hoverEase: 0.18,
            scatterRange: 16,
            scatterEase: 0.055,
            gravity: 0.14,
            bounce: 0.28,
            resetEase: 0.08,
            staggerFrames: 18,
            interactive: true,
            theme: "auto"
        }, initial);
        options.text = clampText(options.text);

        var ctx = canvas.getContext("2d");
        if (!ctx) return null;

        var raf = 0;
        var running = true;
        var last = performance.now();
        var gridRows = 0;
        var cells = [];
        var phase = "logo";
        var lastKey = "";
        var lastW = -1;
        var lastH = -1;
        var lastDpr = -1;
        var loadId = 0;
        var reduce = false;
        var cursor = { x: -999, y: -999 };

        var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        function onReduce() { reduce = mqReduce.matches; }
        onReduce();
        mqReduce.addEventListener("change", onReduce);

        function setPhase(next) {
            if (phase === next) return;
            phase = next;
            if (typeof options.onPhaseChange === "function") options.onPhaseChange(next);
        }

        function sizeCanvas() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = root.clientWidth;
            var h = root.clientHeight;
            if (w <= 0 || h <= 0) return { w: 0, h: 0 };
            if (w === lastW && h === lastH && dpr === lastDpr) return { w: w, h: h };
            lastW = w;
            lastH = h;
            lastDpr = dpr;
            canvas.width = Math.max(1, Math.floor(w * dpr));
            canvas.height = Math.max(1, Math.floor(h * dpr));
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { w: w, h: h };
        }

        function sampleSource(sampler, cols, rows, image, p) {
            sampler.fillStyle = "#000";
            sampler.fillRect(0, 0, cols, rows);

            var cover = Math.min(1, Math.max(0.2, p.fit));
            if (image && image.width > 0 && image.height > 0) {
                var maxW = cols * cover;
                var maxH = rows * cover;
                var scale = Math.min(maxW / image.width, maxH / image.height);
                var dw = image.width * scale;
                var dh = image.height * scale;
                sampler.drawImage(image, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
                return;
            }

            var word = p.text.trim();
            if (!word) return;
            sampler.fillStyle = "#fff";
            sampler.textAlign = "center";
            sampler.textBaseline = "middle";
            var fontSize = rows * 0.52;
            sampler.font = TEXT_FONT.replace("1px", fontSize + "px");
            var width = sampler.measureText(word).width;
            var maxW2 = cols * cover;
            if (width > maxW2 && width > 0) {
                fontSize *= maxW2 / width;
                sampler.font = TEXT_FONT.replace("1px", fontSize + "px");
            }
            sampler.fillText(word, cols / 2, rows / 2 + fontSize * 0.04);
        }

        function buildFromImageData(data, cols, rows, p) {
            var shouldInvert = p.invert != null ? p.invert : Boolean(p.src);
            var lit = new Set();
            var pixels = data.data;
            for (var row = 0; row < rows; row++) {
                for (var col = 0; col < cols; col++) {
                    var i = (row * cols + col) * 4;
                    var r = pixels[i] || 0;
                    var g = pixels[i + 1] || 0;
                    var b = pixels[i + 2] || 0;
                    var a = (pixels[i + 3] || 0) / 255;
                    var luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                    var value = (shouldInvert ? 1 - luma : luma) * a;
                    if (value < p.threshold) continue;
                    lit.add(col + "," + row);
                    if (col + 1 < cols) lit.add((col + 1) + "," + row);
                }
            }

            var next = [];
            lit.forEach(function (key) {
                var parts = key.split(",");
                var col = Number(parts[0]);
                var row = Number(parts[1]);
                next.push({
                    col: col,
                    row: row,
                    char: pickChar(p.charset),
                    offsetX: 0,
                    offsetY: 0,
                    scatterX: 0,
                    scatterY: 0,
                    fallSpeed: 0,
                    wait: 0
                });
            });
            return next;
        }

        function gridKey() {
            var p = options;
            var w = root.clientWidth;
            var h = root.clientHeight;
            if (w <= 0 || h <= 0) return "";
            var step = Math.max(4, p.cellSize + p.cellGap);
            var cols = Math.max(1, Math.floor(w / step));
            var rows = Math.max(1, Math.floor(h / step));
            return [
                p.src || "", p.text, p.fit, p.cellSize, p.cellGap, p.charset,
                p.threshold, String(p.invert != null ? p.invert : ""), cols, rows
            ].join("|");
        }

        function loadImage(src) {
            return new Promise(function (resolve, reject) {
                var img = new Image();
                img.decoding = "async";
                if (/^https?:/i.test(src) && src.indexOf(window.location.origin) !== 0) {
                    img.crossOrigin = "anonymous";
                }
                img.onload = function () { resolve(img); };
                img.onerror = function () { reject(new Error("AsciiLogo: failed to load image")); };
                img.src = src;
            });
        }

        function rebuild() {
            var p = options;
            var size = sizeCanvas();
            if (size.w <= 0 || size.h <= 0) return Promise.resolve();
            var key = gridKey();
            if (!key || key === lastKey) return Promise.resolve();
            lastKey = key;
            var id = ++loadId;

            var cols = Math.max(1, Math.floor(size.w / Math.max(4, p.cellSize + p.cellGap)));
            var rows = Math.max(1, Math.floor(size.h / Math.max(4, p.cellSize + p.cellGap)));

            var imagePromise = p.src ? loadImage(p.src).catch(function () { return null; }) : Promise.resolve(null);

            return imagePromise.then(function (image) {
                if (id !== loadId || !running) return;

                var sampler = document.createElement("canvas");
                sampler.width = cols;
                sampler.height = rows;
                var samplerCtx = sampler.getContext("2d", { willReadFrequently: true });
                if (!samplerCtx) return;
                var snapshot = Object.assign({}, options, { src: image ? options.src : undefined });
                sampleSource(samplerCtx, cols, rows, image, snapshot);
                var data = null;
                try {
                    data = samplerCtx.getImageData(0, 0, cols, rows);
                } catch (e) {
                    data = null;
                }
                if (!data && image) {
                    sampleSource(samplerCtx, cols, rows, null, Object.assign({}, snapshot, { src: undefined }));
                    try {
                        data = samplerCtx.getImageData(0, 0, cols, rows);
                    } catch (e2) {
                        lastKey = "";
                        return;
                    }
                }
                if (!data) {
                    lastKey = "";
                    return;
                }
                cells = buildFromImageData(data, cols, rows, snapshot);
                gridRows = rows;
                setPhase("logo");
                cursor.x = -999;
                cursor.y = -999;
            });
        }

        function cyclePhase() {
            var p = options;
            if (!p.interactive || reduce || cells.length === 0) return;
            if (phase === "logo") {
                var range = Math.max(0, p.scatterRange);
                for (var i = 0; i < cells.length; i++) {
                    var cell = cells[i];
                    var floor = Math.max(0, gridRows - 1 - cell.row);
                    cell.scatterX = (Math.random() * 2 - 1) * range;
                    cell.scatterY = Math.min((Math.random() * 2 - 1) * range, floor * 0.72);
                    cell.fallSpeed = 0;
                }
                staggerCells(cells, p.staggerFrames);
                setPhase("scattered");
                return;
            }
            if (phase === "scattered") {
                for (var j = 0; j < cells.length; j++) cells[j].fallSpeed = 0;
                setPhase("fallen");
                return;
            }
            if (phase === "fallen") {
                staggerCells(cells, p.staggerFrames);
                setPhase("returning");
            }
        }

        function update(frames) {
            var p = options;
            var reduced = reduce;
            var everyoneHome = phase === "returning";

            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                if (cell.wait > 0) {
                    cell.wait -= frames;
                    if (phase === "returning") everyoneHome = false;
                    continue;
                }

                if (reduced || !p.interactive) {
                    cell.offsetX = 0;
                    cell.offsetY = 0;
                    continue;
                }

                if (phase === "scattered") {
                    easeToward(cell, cell.scatterX, cell.scatterY, frameEase(p.scatterEase, frames));
                    continue;
                }

                if (phase === "fallen") {
                    var floor = Math.max(0, gridRows - 1 - cell.row);
                    cell.fallSpeed += p.gravity * frames;
                    cell.offsetY += cell.fallSpeed * frames;
                    if (cell.offsetY >= floor) {
                        cell.offsetY = floor;
                        cell.fallSpeed *= -Math.min(0.95, Math.max(0, p.bounce));
                        if (Math.abs(cell.fallSpeed) < 0.12) cell.fallSpeed = 0;
                    }
                    continue;
                }

                if (phase === "returning") {
                    easeToward(cell, 0, 0, frameEase(p.resetEase, frames));
                    if (Math.abs(cell.offsetX) > 0.04 || Math.abs(cell.offsetY) > 0.04) {
                        everyoneHome = false;
                    }
                    continue;
                }

                var dx = cell.col - cursor.x;
                var dy = cell.row - cursor.y;
                var dist = Math.hypot(dx, dy);
                var radius = Math.max(0.01, p.hoverRadius);
                if (dist < radius) {
                    var push = (1 - dist / radius) * p.hoverPush;
                    if (dist < 0.0001) {
                        easeToward(cell, push, 0, frameEase(p.hoverEase, frames));
                    } else {
                        easeToward(cell, (dx / dist) * push, (dy / dist) * push, frameEase(p.hoverEase, frames));
                    }
                    if (Math.random() < 0.06 * frames) {
                        cell.char = pickChar(p.charset);
                    }
                } else {
                    easeToward(cell, 0, 0, frameEase(p.hoverEase, frames));
                }
            }

            if (everyoneHome) setPhase("logo");
        }

        function draw() {
            var p = options;
            var w = root.clientWidth;
            var h = root.clientHeight;
            var dark = resolveDark(p.theme);
            var ink = p.color || (dark ? DARK.ink : LIGHT.ink);
            var paper = p.backgroundColor || (dark ? DARK.paper : LIGHT.paper);
            var step = Math.max(4, p.cellSize + p.cellGap);

            if (paper === "transparent") {
                ctx.clearRect(0, 0, w, h);
            } else {
                ctx.fillStyle = paper;
                ctx.fillRect(0, 0, w, h);
            }

            ctx.font = Math.max(6, p.cellSize) + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = ink;

            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                var x = (cell.col + cell.offsetX) * step + step * 0.5;
                var y = (cell.row + cell.offsetY) * step + step * 0.5;
                ctx.fillText(cell.char, x, y);
            }
        }

        function tick(now) {
            if (!running) return;
            var dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            var frames = dt * 60;
            if (gridKey() !== lastKey) rebuild();
            update(reduce ? 0 : frames);
            draw();
            raf = requestAnimationFrame(tick);
        }

        function onPointerMove(event) {
            if (!options.interactive) return;
            var rect = root.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            var step = Math.max(4, options.cellSize + options.cellGap);
            var x = (event.clientX - rect.left) / step;
            var y = (event.clientY - rect.top) / step;
            var inside = event.clientX >= rect.left && event.clientX <= rect.right &&
                event.clientY >= rect.top && event.clientY <= rect.bottom;
            if (inside) {
                cursor.x = x;
                cursor.y = y;
            } else {
                cursor.x = -999;
                cursor.y = -999;
            }
        }

        function onPointerLeave() {
            cursor.x = -999;
            cursor.y = -999;
        }

        function onPointerDown(event) {
            if (event.button !== 0) return;
            cyclePhase();
        }

        function onKeyDown(event) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            cyclePhase();
        }

        rebuild();
        raf = requestAnimationFrame(tick);

        var ro = new ResizeObserver(function () {
            lastW = -1;
            lastH = -1;
            lastKey = "";
            rebuild();
        });
        ro.observe(root);

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        root.addEventListener("pointerleave", onPointerLeave, { passive: true });
        root.addEventListener("pointerdown", onPointerDown);
        root.addEventListener("keydown", onKeyDown);

        return {
            setOptions: function (next) {
                options = Object.assign({}, options, next);
                if (typeof next.text === "string") {
                    options.text = clampText(next.text);
                }
            },
            destroy: function () {
                running = false;
                loadId += 1;
                cancelAnimationFrame(raf);
                ro.disconnect();
                mqReduce.removeEventListener("change", onReduce);
                window.removeEventListener("pointermove", onPointerMove);
                root.removeEventListener("pointerleave", onPointerLeave);
                root.removeEventListener("pointerdown", onPointerDown);
                root.removeEventListener("keydown", onKeyDown);
            }
        };
    }

    function init(root, options) {
        options = options || {};
        var canvas = root.querySelector("canvas");
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.setAttribute("aria-hidden", "true");
            root.appendChild(canvas);
        }
        canvas.className = "ascii-logo-canvas";

        root.setAttribute("data-slot", "ascii-logo");
        if (!root.hasAttribute("role")) root.setAttribute("role", "img");
        if (!root.hasAttribute("aria-label")) {
            root.setAttribute("aria-label", options.label || options.text || "ASCII logo");
        }
        if (options.interactive !== false && !root.hasAttribute("tabindex")) {
            root.setAttribute("tabindex", "0");
        }
        root.classList.add("ascii-logo-root");

        return createAsciiLogo(root, canvas, options);
    }

    global.AsciiLogo = { init: init, clampText: clampText };
})(window);
