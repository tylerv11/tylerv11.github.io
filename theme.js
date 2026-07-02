/* Light/dark theme toggle.
   Priority: explicit user choice (localStorage) > geolocation-based sunset estimate > device-local-time heuristic.
   The blocking inline snippet in <head> already applies a first guess before paint;
   this file only refines that guess (via geolocation) and wires up the toggle switch. */
(function () {
    var STORAGE_KEY = 'theme-override';
    var GEO_CACHE_KEY = 'theme-geo-cache'; // {lat, lon, ts}
    var GEO_CACHE_MS = 6 * 60 * 60 * 1000; // 6h

    function mod24(x) { return ((x % 24) + 24) % 24; }

    // Approximate sunrise/sunset (UTC decimal hours) for a given lat/lon and date.
    // Not NOAA-precise, but well within the "couple hours" tolerance needed here.
    function sunTimesUTC(lat, lon, date) {
        var start = Date.UTC(date.getUTCFullYear(), 0, 0);
        var dayOfYear = Math.floor((date.getTime() - start) / 86400000);
        var decl = 23.44 * Math.PI / 180 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
        var latRad = lat * Math.PI / 180;
        var cosH = Math.min(1, Math.max(-1, -Math.tan(latRad) * Math.tan(decl)));
        var hourAngleDeg = Math.acos(cosH) * 180 / Math.PI;
        var solarNoonUTC = 12 - lon / 15;
        return {
            sunrise: solarNoonUTC - hourAngleDeg / 15,
            sunset: solarNoonUTC + hourAngleDeg / 15
        };
    }

    function isDarkByLocation(lat, lon) {
        var now = new Date();
        var sun = sunTimesUTC(lat, lon, now);
        var nowHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
        // Dark mode kicks in ~2.5h before actual sunset (dusk) and lasts until sunrise.
        var darkStart = mod24(sun.sunset - 2.5);
        var darkEnd = mod24(sun.sunrise);
        var t = mod24(nowHours);
        return darkStart > darkEnd ? (t >= darkStart || t < darkEnd) : (t >= darkStart && t < darkEnd);
    }

    function applyTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        updateSwitchUI(isDark);
    }

    function updateSwitchUI(isDark) {
        var el = document.getElementById('theme-toggle');
        if (!el) return;
        el.setAttribute('aria-checked', isDark ? 'false' : 'true');
        el.classList.toggle('is-light', !isDark);
    }

    function getExplicitChoice() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            return v === 'dark' || v === 'light' ? v : null;
        } catch (e) { return null; }
    }

    function setExplicitChoice(theme) {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }

    function getGeoCache() {
        try {
            var raw = localStorage.getItem(GEO_CACHE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (Date.now() - parsed.ts > GEO_CACHE_MS) return null;
            return parsed;
        } catch (e) { return null; }
    }

    function setGeoCache(lat, lon) {
        try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat: lat, lon: lon, ts: Date.now() })); } catch (e) {}
    }

    function refineWithGeolocation() {
        if (getExplicitChoice()) return; // user already chose manually, don't override
        if (!('geolocation' in navigator)) return;

        var cached = getGeoCache();
        if (cached) {
            applyTheme(isDarkByLocation(cached.lat, cached.lon));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                var lat = pos.coords.latitude, lon = pos.coords.longitude;
                setGeoCache(lat, lon);
                if (!getExplicitChoice()) applyTheme(isDarkByLocation(lat, lon));
            },
            function () { /* denied/unavailable: keep the device-time heuristic already applied */ },
            { timeout: 5000, maximumAge: GEO_CACHE_MS }
        );
    }

    function wireToggle() {
        var el = document.getElementById('theme-toggle');
        if (!el) return;
        updateSwitchUI(document.documentElement.getAttribute('data-theme') !== 'light');
        el.addEventListener('click', function () {
            var isLight = document.documentElement.getAttribute('data-theme') === 'light';
            var next = isLight ? 'dark' : 'light';
            setExplicitChoice(next);
            applyTheme(next === 'dark');
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        wireToggle();
        refineWithGeolocation();
    });
})();
