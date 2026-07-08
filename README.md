# AI Image Generator

> A vanilla JavaScript AI Image Generator powered by Pollinations.ai — aspect ratio to pixel dimension math, dual-strategy loading with automatic CORS fallback, retry logic, Blob URL generation, and light/dark theme with system preference detection.

## Demo

---

## Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Page structure and form |
| CSS3 | Design system with CSS variables, dark/light theme |
| JavaScript (ES6+) | API integration, dimension math, retry logic, Blob URLs |
| Pollinations.ai API | Free AI image generation (Flux model) |
| CSS `:has()` | Single-image centering without JavaScript |

---

## Features

- Generate AI images from a text prompt using the Flux model
- Three aspect ratios — Square (1:1), Landscape (16:9), Portrait (9:16)
- Pixel dimensions calculated to maintain ~1024px area and align to 16-pixel boundaries
- Random seed on every generation — different result each time from the same prompt
- Random prompt generator — 25 creative example prompts on the dice button
- Dual loading strategy — fetch with auth header first, img tag fallback if CORS blocks
- Automatic retry — up to 3 attempts with increasing delay (1s, 2s) on failure
- Blob URL creation from the fetch response
- Download button appears on hover
- Light and dark theme toggle with localStorage persistence and system preference detection
- Single generated image centered in the grid via CSS `:has()` — no JavaScript

---

## Project Structure

```
ai-image-generator/
├── index.html     # Form, model/ratio selects, gallery grid
├── style.css      # CSS variables, dark/light theme, gallery, loading states
└── script.js      # API integration, dimension math, retry, Blob URLs, theme
```

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/anasqadri-dev/ai-image-generator.git
cd ai-image-generator
```

### 2. API Key (Optional)

Pollinations.ai works without authentication. The API key in this project provides rate limit benefits but is not required. You can remove it or replace it with your own.

### 3. Open

No build step. Open `index.html` directly in any browser.

---

## How It Works

**Aspect Ratio to Pixel Dimensions**

```javascript
const getImageDimensions = (aspectRatio, baseSize = 1024) => {
    const [width, height] = aspectRatio.split("/").map(Number);
    const scaleFactor = baseSize / Math.sqrt(width * height);

    let calculatedWidth  = Math.floor((Math.round(width  * scaleFactor)) / 16) * 16;
    let calculatedHeight = Math.floor((Math.round(height * scaleFactor)) / 16) * 16;

    return { width: calculatedWidth, height: calculatedHeight };
};
```

`Math.sqrt(width * height)` gives the geometric mean of the dimensions — the side length that would produce the same total pixel area as a square. Dividing `baseSize` by this gives a scale factor that keeps the total pixel count near 1024×1024 regardless of ratio. The final `Math.floor(... / 16) * 16` snaps to the nearest 16-pixel boundary, which GPU texture pipelines prefer.

**Dual Loading Strategy**

```javascript
// 1. Try fetch with auth header
const response = await fetch(imageUrl, {
    headers: { Authorization: `Bearer ${key}` }
});
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
updateImageCard(blobUrl);

// 2. If fetch fails (CORS, network error), fall back to img tag
const img = new Image();
img.src = fallbackUrl; // key passed as query param instead
```

Fetch with a custom Authorization header triggers a CORS preflight. If the API does not return the right preflight headers, the browser blocks it. An `<img>` tag makes a simple GET request with no preflight — CORS does not apply.

**Retry Logic**

```javascript
if (retryCount < 2) {
    setTimeout(() => {
        loadImageWithImgTag(imageUrl, retryCount + 1)
    }, 1000 * (retryCount + 1)); // 1s, then 2s
}
```

**Theme — System Preference + localStorage**

```javascript
const savedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDarkTheme = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
```

localStorage wins if set. Otherwise, the OS preference is used as the default.

---

## What I Learned

- AI image models prefer pixel dimensions that are multiples of 16 — GPU texture operations work in blocks, and non-aligned dimensions cause padding or cropping internally. `Math.floor(value / 16) * 16` is the standard snapping formula
- Fetching with a custom header triggers a CORS preflight request — the browser first sends an `OPTIONS` request to check if the server allows the origin and headers. If the server does not respond correctly, the actual fetch is blocked. An `<img>` tag bypasses this entirely because it only makes simple GET requests
- `URL.createObjectURL(blob)` creates a temporary URL in the browser's memory — the fetched image bytes live in memory and the URL is a pointer to them. The image is never written to disk and the URL is valid only for the current page session
- CSS `:has()` can select parent elements based on their children — `.gallery-grid:has(.img-card:only-child)` detects when the grid contains exactly one image and applies different layout rules, without a single line of JavaScript
- `window.matchMedia("(prefers-color-scheme: dark)").matches` reads the OS-level dark mode setting — if the user has dark mode enabled system-wide, the app defaults to dark on first visit even without a stored preference

---

## License

MIT