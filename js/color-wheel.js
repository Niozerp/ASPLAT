(function () {
  const headerLink = document.querySelector('a[href="color-wheel.html"]');
  if (headerLink) {
    headerLink.classList.add('active');
    headerLink.setAttribute('aria-current', 'page');
  }

  const state = {
    displayHex: '#3498DB',
    hue: 0,
    sat: 0,
    lig: 0,
    adjOffset: 30,
    error: ''
  };

  const elements = {};
  const copyTimers = new Map();

  const hexMap = {
    base: () => state.baseHex,
    complement: () => state.complementHex,
    splitA: () => state.splitHexA,
    splitB: () => state.splitHexB
  };

  document.addEventListener('DOMContentLoaded', () => {
    elements.hexInput = document.getElementById('hex-input');
    elements.hexPicker = document.getElementById('hex-picker');
    elements.hexError = document.getElementById('hex-error');
    elements.hueSlider = document.getElementById('hue-slider');
    elements.satSlider = document.getElementById('sat-slider');
    elements.ligSlider = document.getElementById('lig-slider');
    elements.offsetSlider = document.getElementById('offset-slider');
    elements.hueValue = document.getElementById('hue-value');
    elements.offsetValue = document.getElementById('offset-value');
    elements.copyAll = document.querySelector('[data-copy-all]');
    elements.wheel = document.getElementById('color-wheel');
    elements.markers = {
      base: document.getElementById('marker-base'),
      complement: document.getElementById('marker-opposite'),
      splitA: document.getElementById('marker-split-a'),
      splitB: document.getElementById('marker-split-b')
    };
    elements.legends = {
      base: document.querySelector('[data-legend="base"]'),
      complement: document.querySelector('[data-legend="complement"]'),
      split: document.querySelector('[data-legend="split"]')
    };
    elements.offsetLegends = Array.from(document.querySelectorAll('[data-offset-legend]'));

    elements.swatches = {
      base: getSwatchRefs('base'),
      complement: getSwatchRefs('complement'),
      splitA: getSwatchRefs('splitA'),
      splitB: getSwatchRefs('splitB')
    };

    elements.rows = {
      base: getRowRefs('base'),
      complement: getRowRefs('complement'),
      splitA: getRowRefs('splitA'),
      splitB: getRowRefs('splitB')
    };

    elements.copyButtons = Array.from(document.querySelectorAll('[data-copy-target]'));

    attachListeners();
    initialiseState('#3498DB');
    render();
  });

  function getSwatchRefs(key) {
    return {
      chip: document.querySelector(`[data-swatch-chip="${key}"]`),
      hex: document.querySelector(`[data-swatch-hex="${key}"]`),
      sub: document.querySelector(`[data-swatch-sub="${key}"]`)
    };
  }

  function getRowRefs(key) {
    return {
      chip: document.querySelector(`[data-row-chip="${key}"]`),
      hex: document.querySelector(`[data-row-hex="${key}"]`),
      desc: document.querySelector(`[data-row-desc="${key}"]`)
    };
  }

  function attachListeners() {
    if (!elements.hexInput) return;

    elements.hexInput.addEventListener('input', (event) => {
      const value = event.target.value;
      const normalized = hexNormalize(value);
      if (normalized) {
        applyHex(normalized);
      } else {
        state.displayHex = value;
        state.error = value.trim() ? 'Enter a valid hex (#RGB or #RRGGBB)' : '';
        render();
      }
    });

    elements.hexPicker.addEventListener('input', (event) => {
      const value = event.target.value;
      if (hexNormalize(value)) {
        applyHex(value.toUpperCase());
      }
    });

    elements.hueSlider.addEventListener('input', (event) => {
      state.hue = parseInt(event.target.value, 10);
      syncDerivedColors();
      state.displayHex = state.baseHex;
      state.error = '';
      render();
    });

    elements.satSlider.addEventListener('input', (event) => {
      state.sat = parseInt(event.target.value, 10);
      syncDerivedColors();
      state.displayHex = state.baseHex;
      state.error = '';
      render();
    });

    elements.ligSlider.addEventListener('input', (event) => {
      state.lig = parseInt(event.target.value, 10);
      syncDerivedColors();
      state.displayHex = state.baseHex;
      state.error = '';
      render();
    });

    elements.offsetSlider.addEventListener('input', (event) => {
      state.adjOffset = parseInt(event.target.value, 10);
      syncDerivedColors();
      render();
    });

    elements.copyAll.addEventListener('click', async () => {
      const text = [
        `Base: ${state.baseHex}`,
        `Opposite (Complement): ${state.complementHex}`,
        `Adjacent to Opposite A (-${state.adjOffset}°): ${state.splitHexA}`,
        `Adjacent to Opposite B (+${state.adjOffset}°): ${state.splitHexB}`
      ].join('\n');
      await copyToClipboard(elements.copyAll, text);
    });

    elements.copyButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const getter = hexMap[btn.dataset.copyTarget];
        if (!getter) return;
        await copyToClipboard(btn, getter());
      });
    });

    setupWheel();

    window.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        return;
      }
      event.preventDefault();
      const delta = event.shiftKey ? 10 : 1;
      if (event.key === 'ArrowLeft') {
        state.hue = (state.hue + 360 - delta) % 360;
      } else {
        state.hue = (state.hue + delta) % 360;
      }
      syncDerivedColors();
      state.displayHex = state.baseHex;
      render();
    });
  }

  function setupWheel() {
    if (!elements.wheel) return;
    let dragging = false;
    let pointerId = null;

    const handlePointer = (event) => {
      const rect = elements.wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const newHue = Math.round(pointToHue(event.clientX, event.clientY, cx, cy));
      state.hue = ((newHue % 360) + 360) % 360;
      syncDerivedColors();
      state.displayHex = state.baseHex;
      render();
    };

    elements.wheel.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      dragging = true;
      pointerId = event.pointerId;
      elements.wheel.setPointerCapture(pointerId);
      handlePointer(event);
    });

    elements.wheel.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      handlePointer(event);
    });

    const stopDragging = (event) => {
      if (!dragging) return;
      dragging = false;
      if (pointerId !== null) {
        try {
          elements.wheel.releasePointerCapture(pointerId);
        } catch (err) {
          // ignore if already released
        }
        pointerId = null;
      }
    };

    elements.wheel.addEventListener('pointerup', stopDragging);
    elements.wheel.addEventListener('pointercancel', stopDragging);
  }

  function initialiseState(initialHex) {
    applyHex(initialHex);
  }

  function applyHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      state.error = 'Enter a valid hex (#RGB or #RRGGBB)';
      render();
      return;
    }
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    state.hue = hsl.h;
    state.sat = hsl.s;
    state.lig = hsl.l;
    state.displayHex = hex.toUpperCase();
    state.error = '';
    syncDerivedColors();
    render();
  }

  function syncDerivedColors() {
    state.baseHex = hslToHex(state.hue, state.sat, state.lig);
    const complementHue = (state.hue + 180) % 360;
    const splitHueA = (complementHue - state.adjOffset + 360) % 360;
    const splitHueB = (complementHue + state.adjOffset) % 360;

    state.complementHue = complementHue;
    state.splitHueA = splitHueA;
    state.splitHueB = splitHueB;
    state.complementHex = hslToHex(complementHue, state.sat, state.lig);
    state.splitHexA = hslToHex(splitHueA, state.sat, state.lig);
    state.splitHexB = hslToHex(splitHueB, state.sat, state.lig);
    state.displayHex = state.baseHex;
  }

  function render() {
    if (!elements.hexInput) return;
    elements.hexInput.value = state.displayHex;
    elements.hexPicker.value = state.baseHex || '#000000';

    if (state.error) {
      elements.hexError.classList.remove('d-none');
      elements.hexError.textContent = state.error;
    } else {
      elements.hexError.classList.add('d-none');
    }

    elements.hueSlider.value = state.hue;
    elements.satSlider.value = state.sat;
    elements.ligSlider.value = state.lig;
    elements.offsetSlider.value = state.adjOffset;

    elements.hueValue.textContent = `${state.hue}°`;
    elements.offsetValue.textContent = `${state.adjOffset}°`;
    elements.offsetLegends.forEach((el) => {
      el.textContent = state.adjOffset;
    });

    updateSwatch('base', state.baseHex, `HSL ${state.hue}°, ${state.sat}%, ${state.lig}%`);
    updateSwatch('complement', state.complementHex, `Hue ${state.complementHue}°`);
    updateSwatch('splitA', state.splitHexA, `Hue ${state.splitHueA}°`);
    updateSwatch('splitB', state.splitHexB, `Hue ${state.splitHueB}°`);

    updateRow('base', state.baseHex, `HSL ${state.hue}°, ${state.sat}%, ${state.lig}%`);
    updateRow('complement', state.complementHex, `Hue ${state.complementHue}°`);
    updateRow('splitA', state.splitHexA, `Hue ${state.splitHueA}°`);
    updateRow('splitB', state.splitHexB, `Hue ${state.splitHueB}°`);

    updateLegends();
    updateWheel();
    updateCopyButtons();
  }

  function updateSwatch(key, hex, subtitle) {
    const swatch = elements.swatches[key];
    if (!swatch || !hex) return;
    const textColor = textColorOn(hex);
    swatch.hex.textContent = hex;
    swatch.sub.textContent = subtitle;
    swatch.chip.style.backgroundColor = hex;
    swatch.chip.style.color = textColor;
  }

  function updateRow(key, hex, desc) {
    const row = elements.rows[key];
    if (!row || !hex) return;
    row.hex.textContent = hex;
    row.desc.textContent = desc;
    row.chip.style.backgroundColor = hex;
  }

  function updateLegends() {
    if (elements.legends.base) {
      elements.legends.base.style.backgroundColor = state.baseHex;
      elements.legends.base.style.borderColor = state.baseHex;
    }
    if (elements.legends.complement) {
      elements.legends.complement.style.backgroundColor = state.complementHex;
      elements.legends.complement.style.borderColor = state.complementHex;
    }
    if (elements.legends.split) {
      elements.legends.split.style.borderColor = state.baseHex;
    }
  }

  function updateWheel() {
    if (!elements.wheel) return;
    elements.wheel.setAttribute('aria-valuenow', String(state.hue));
    const size = elements.wheel.offsetWidth || 0;
    const center = size / 2;
    const innerRadius = size * 0.29;
    const outerRadius = Math.max(center - 6, innerRadius + 10);
    const markerRadius = (outerRadius + innerRadius) / 2;

    setMarker(elements.markers.base, hueToPoint(state.hue, center, center, markerRadius), state.baseHex, false);
    setMarker(elements.markers.complement, hueToPoint(state.complementHue, center, center, markerRadius), state.complementHex, false);
    setMarker(elements.markers.splitA, hueToPoint(state.splitHueA, center, center, markerRadius), state.splitHexA, true);
    setMarker(elements.markers.splitB, hueToPoint(state.splitHueB, center, center, markerRadius), state.splitHexB, true);
  }

  function setMarker(marker, point, color, hollow) {
    if (!marker || !point) return;
    marker.style.left = `${point.x}px`;
    marker.style.top = `${point.y}px`;
    marker.style.borderColor = color;
    if (hollow) {
      marker.style.backgroundColor = 'transparent';
      marker.style.boxShadow = 'none';
    } else {
      marker.style.backgroundColor = color;
      marker.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.35)';
    }
  }

  function updateCopyButtons() {
    elements.copyButtons.forEach((btn) => {
      const getter = hexMap[btn.dataset.copyTarget];
      if (!getter) return;
      btn.dataset.hexValue = getter();
    });
  }

  async function copyToClipboard(button, text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(button);
    } catch (err) {
      console.error('Clipboard write failed', err);
    }
  }

  function flashCopied(button) {
    if (!button) return;
    const original = button.dataset.originalText || button.textContent;
    button.dataset.originalText = original;
    button.textContent = 'Copied!';
    button.disabled = true;
    const timeout = setTimeout(() => {
      button.textContent = button.dataset.originalText;
      button.disabled = false;
    }, 1200);
    if (copyTimers.has(button)) {
      clearTimeout(copyTimers.get(button));
    }
    copyTimers.set(button, timeout);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function pad2(n) {
    const s = n.toString(16);
    return s.length === 1 ? `0${s}` : s;
  }

  function hexNormalize(hex) {
    if (!hex) return null;
    const cleaned = hex.trim().replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length === 3) {
      return `#${cleaned.split('').map((c) => c + c).join('')}`.toUpperCase();
    }
    if (cleaned.length === 6) {
      return `#${cleaned}`.toUpperCase();
    }
    return null;
  }

  function hexToRgb(hex) {
    const normalized = hexNormalize(hex);
    if (!normalized) return null;
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    return { r, g, b };
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h;
    let s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max - min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;

    let r;
    let g;
    let b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hk = h / 360;
      r = hue2rgb(p, q, hk + 1 / 3);
      g = hue2rgb(p, q, hk);
      b = hue2rgb(p, q, hk - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return `#${pad2(r)}${pad2(g)}${pad2(b)}`.toUpperCase();
  }

  function textColorOn(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    const srgb = [rgb.r, rgb.g, rgb.b].map((value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    return L > 0.53 ? '#111111' : '#FFFFFF';
  }

  function hueToPoint(h, cx, cy, r) {
    const rad = ((h - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function pointToHue(x, y, cx, cy) {
    const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
    return (angle + 90 + 360) % 360;
  }
})();
