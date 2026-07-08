const themeToggle = document.querySelector(".theme-toggle");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const promptButton = document.querySelector(".prompt-btn");
const generateButton = document.querySelector(".generate-btn");

const modelSelect = document.getElementById("model-select");
const ratioSelect = document.getElementById("ratio-select");

const gridGallery = document.querySelector(".gallery-grid");

// Pollinations.ai key (publishable key)
const POLLINATIONS_KEY = "sk_qqGeqBoYh693mAIs1NfSAwcF9QWmaD92";
const POLLINATIONS_BASE = "https://gen.pollinations.ai/image/";

const examplePrompts = [
  "A magic forest with glowing plants and fairy homes among giant mushrooms",
  "An old steampunk airship floating through golden clouds at sunset",
  "A future Mars colony with glass domes and gardens against red mountains",
  "A dragon sleeping on gold coins in a crystal cave",
  "An underwater kingdom with merpeople and glowing coral buildings",
  "A floating island with waterfalls pouring into clouds below",
  "A witch's cottage in fall with magic herbs in the garden",
  "A robot painting in a sunny studio with art supplies around it",
  "A magical library with floating glowing books and spiral staircases",
  "A Japanese shrine during cherry blossom season with lanterns and misty mountains",
  "A cosmic beach with glowing sand and an aurora in the night sky",
  "A medieval marketplace with colorful tents and street performers",
  "A cyberpunk city with neon signs and flying cars at night",
  "A peaceful bamboo forest with a hidden ancient temple",
  "A giant turtle carrying a village on its back in the ocean",
  "A crystal palace inside a glacier with frozen waterfalls",
  "A Victorian greenhouse filled with bioluminescent flowers and butterflies",
  "An abandoned amusement park reclaimed by nature with vines on Ferris wheels",
  "A lunar city built inside a massive crater with Earth visible in the sky",
  "A train station where passengers are boarding a clockwork mechanical dragon",
  "A bakery run by anthropomorphic cats wearing tiny aprons and chef hats",
  "A treehouse village connected by rope bridges high in redwood trees",
  "A sunken pirate ship with treasure chests and ghostly translucent sailors",
  "A snow-covered observatory with telescopes pointed at a purple nebula",
  "A desert oasis with a mosaic-tiled pool surrounded by palm trees and camels",
];

// set theme based on saved preference or system default
(() => {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const isDarkTheme =
    savedTheme === "dark" || (!savedTheme && systemPrefersDark);
  document.body.classList.toggle("dark-theme", isDarkTheme);
  themeToggle.querySelector("i").className = isDarkTheme
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";
})();

// switch between light and dark themes
const toggleTheme = () => {
  const isDarkTheme = document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
  themeToggle.querySelector("i").className = isDarkTheme
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";
};

// Calculate width/height in pixels from a "16/9" style aspect ratio value
const getImageDimensions = (aspectRatio, baseSize = 1024) => {
  const [width, height] = aspectRatio.split("/").map(Number);
  const scaleFactor = baseSize / Math.sqrt(width * height);

  let calculatedWidth = Math.round(width * scaleFactor);
  let calculatedHeight = Math.round(height * scaleFactor);

  calculatedWidth = Math.floor(calculatedWidth / 16) * 16;
  calculatedHeight = Math.floor(calculatedHeight / 16) * 16;

  return { width: calculatedWidth, height: calculatedHeight };
};

// replace loading spinner with the actual image
const updateImageCard = (imgUrl) => {
  const imgCard = document.getElementById("img-card-0");
  if (!imgCard) return;
  imgCard.classList.remove("loading");
  imgCard.innerHTML = `<img src="${imgUrl}" class="result-img" alt="Generated image" />
              <div class="img-overlay">
                <a href="${imgUrl}" class="img-download-btn" download="${Date.now()}.jpg" target="_blank" rel="noopener">
                  <i class="fa-solid fa-download"> </i>
                </a>
              </div>`;
};

const showImageCardError = (message) => {
  const imgCard = document.getElementById("img-card-0");
  if (!imgCard) return;
  imgCard.classList.replace("loading", "error");
  const statusText = imgCard.querySelector(".status-text");
  if (statusText) {
    statusText.textContent = message || "Failed to generate image. Please try again.";
  }
  generateButton.removeAttribute("disabled");
};

// Load image using img tag (bypasses CORS)
const loadImageWithImgTag = (imageUrl, retryCount = 0) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId;
    
    const cleanup = () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(imageUrl);
    };

    img.onerror = () => {
      cleanup();
      if (retryCount < 2) {
        // Retry with a small delay
        setTimeout(() => {
          loadImageWithImgTag(imageUrl, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, 1000 * (retryCount + 1));
      } else {
        reject(new Error("Failed to load image after multiple attempts"));
      }
    };

    // Set a timeout for the image load
    timeoutId = setTimeout(() => {
      cleanup();
      if (retryCount < 2) {
        loadImageWithImgTag(imageUrl, retryCount + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error("Image load timed out"));
      }
    }, 15000);

    img.src = imageUrl;
  });
};

// Build the Pollinations image URL
const generateImage = async (selectedModel, aspectRatio, promptText) => {
  generateButton.setAttribute("disabled", "true");

  const { width, height } = getImageDimensions(aspectRatio);
  const seed = Math.floor(Math.random() * 2147483647);
  const imageUrl =
    `${POLLINATIONS_BASE}${encodeURIComponent(promptText)}` +
    `?model=${encodeURIComponent(selectedModel)}&width=${width}&height=${height}&seed=${seed}`;

  console.log("Pollinations request URL:", imageUrl);

  try {
    // Try fetch first (might work with proper CORS headers)
    const response = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${POLLINATIONS_KEY}` },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Pollinations returned ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    updateImageCard(blobUrl);
    generateButton.removeAttribute("disabled");
  } catch (fetchError) {
    console.warn("Direct fetch failed, falling back to <img> tag load:", fetchError);
    
    try {
      // Fallback: load using img tag with the key as a query parameter
      const fallbackUrl = `${imageUrl}&key=${encodeURIComponent(POLLINATIONS_KEY)}`;
      await loadImageWithImgTag(fallbackUrl);
      updateImageCard(fallbackUrl);
      generateButton.removeAttribute("disabled");
    } catch (imgError) {
      console.error("All loading methods failed:", imgError);
      showImageCardError("Failed to generate image. Please check your internet connection and try again.");
    }
  }
};

// create a single placeholder card with a loading spinner
const createImageCard = (selectedModel, aspectRatio, promptText) => {
  gridGallery.innerHTML = `
            <div class="img-card loading" id="img-card-0" style="aspect-ratio: ${aspectRatio}">
              <div class="status-container">
                <div class="spinner"></div>
                <p class="status-text">Generating...</p>
              </div>
            </div>
            `;
  generateImage(selectedModel, aspectRatio, promptText);
};

// handle form submission
const handleFormSubmit = (e) => {
  e.preventDefault();

  const selectedModel = modelSelect.value;
  const aspectRatio = ratioSelect.value || "1/1";
  const promptText = promptInput.value.trim();

  if (!promptText) {
    promptInput.focus();
    promptInput.style.borderColor = "#dc2626";
    setTimeout(() => {
      promptInput.style.borderColor = "";
    }, 2000);
    return;
  }

  createImageCard(selectedModel, aspectRatio, promptText);
};

// fill prompt input with random example
promptButton.addEventListener("click", () => {
  const prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
  promptInput.value = prompt;
  promptInput.focus();
});

promptForm.addEventListener("submit", handleFormSubmit);
themeToggle.addEventListener("click", toggleTheme);

// Add Enter key support (Shift+Enter for new line)
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    promptForm.dispatchEvent(new Event("submit"));
  }
});