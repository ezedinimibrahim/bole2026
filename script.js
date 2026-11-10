/**
 * ============================================================================
 * BOLE 2026 PERSONALIZED DISPLAY PICTURE (DP) GENERATOR
 * Gateway International Church - Billionaires Assembly (Glory Arena)
 * Theme: 10th Anniversary • PRAY UNTIL SHIFT HAPPENS (PUSH)
 * ============================================================================
 */

'use strict';

// ============================================================================
// 1. CONFIGURABLE CONSTANTS (Reference: 810 × 810 Template Coordinates)
// ============================================================================
const CONFIG = {
  // Path to the original Photoshop template image
  TEMPLATE_SRC: 'assets/template.png',
  
  // Reference dimensions of original template
  TEMPLATE_WIDTH: 810,
  TEMPLATE_HEIGHT: 810,

  // Profile Picture Area (White placeholder coordinates)
  // Verified: X: 67, Y: 254, Width: 316, Height: 316
  PHOTO_X: 67,
  PHOTO_Y: 254,
  PHOTO_WIDTH: 316,
  PHOTO_HEIGHT: 316,

  // Name Area (Empty orange-outlined rounded rectangle coordinates)
  // Verified: X: 424, Y: 541, Width: 338, Height: 43
  NAME_X: 424,
  NAME_Y: 541,
  NAME_WIDTH: 338,
  NAME_HEIGHT: 43,

  // Center coordinates for Name Placement
  get NAME_CENTER_X() { return this.NAME_X + this.NAME_WIDTH / 2; },   // 593px
  get NAME_CENTER_Y() { return this.NAME_Y + this.NAME_HEIGHT / 2; },  // 562.5px

  // Name Typography Settings
  NAME_FONT_FAMILY: "'Montserrat', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  NAME_FONT_WEIGHT: 'bold',
  NAME_MAX_FONT_SIZE: 23, // px in 810 reference space
  NAME_MIN_FONT_SIZE: 11, // px in 810 reference space
  NAME_COLOR: '#ffffff',
  NAME_PADDING_X: 20,     // Horizontal padding inside the rounded pill
  NAME_PADDING_Y: 6,      // Vertical padding inside the pill

  // Zoom Settings
  ZOOM_MIN: 1.0,
  ZOOM_MAX: 3.0,
  ZOOM_STEP: 0.05,

  // Nudge step (pixels in reference coordinate system)
  NUDGE_STEP: 8,

  // Export Filename Configuration
  EXPORT_FILENAME_PREFIX: 'BOLE-2026',
  EXPORT_FILENAME_SUFFIX: 'DP',

  // Sample Avatar Path (for instant testing)
  SAMPLE_AVATAR_SRC: 'assets/sample-avatar.png',
  SAMPLE_NAME: 'ANONYMOUS ATTENDEE'
};

// ============================================================================
// 2. APPLICATION STATE
// ============================================================================
const state = {
  templateLoaded: false,
  templateImage: null,

  // User uploaded photo
  userImage: null,          // HTMLImageElement
  userImageSrc: null,       // Object URL or Data URL
  fileName: '',
  fileSize: '',

  // Pan & Zoom (in reference 810 coordinate units)
  zoom: 1.0,
  panX: 0,
  panY: 0,

  // User Name
  userName: '',
  isUppercase: true,

  // Pointer drag tracking
  isDragging: false,
  activePointers: new Map(),
  dragStartPanX: 0,
  dragStartPanY: 0,
  dragStartPointerX: 0,
  dragStartPointerY: 0,
  initialPinchDistance: null,
  initialPinchZoom: 1.0
};

// ============================================================================
// 3. DOM ELEMENTS CACHE
// ============================================================================
const DOM = {
  // Stage & Preview
  dpStage: document.getElementById('dpStage'),
  dpPreviewContainer: document.getElementById('dpPreviewContainer'),
  templateImg: document.getElementById('templateImg'),
  dpPhotoSlot: document.getElementById('dpPhotoSlot'),
  slotEmptyState: document.getElementById('slotEmptyState'),
  dpUserPhoto: document.getElementById('dpUserPhoto'),
  dragCue: document.getElementById('dragCue'),
  dpNameSlot: document.getElementById('dpNameSlot'),
  dpUserName: document.getElementById('dpUserName'),

  // Upload Controls
  dropzone: document.getElementById('dropzone'),
  photoInput: document.getElementById('photoInput'),
  uploadedStatus: document.getElementById('uploadedStatus'),
  statusThumb: document.getElementById('statusThumb'),
  fileNameDisplay: document.getElementById('fileNameDisplay'),
  fileSizeDisplay: document.getElementById('fileSizeDisplay'),
  replacePhotoBtn: document.getElementById('replacePhotoBtn'),
  removePhotoBtn: document.getElementById('removePhotoBtn'),
  useSampleBtn: document.getElementById('useSampleBtn'),

  // Adjust / Zoom Controls
  zoomSlider: document.getElementById('zoomSlider'),
  zoomValue: document.getElementById('zoomValue'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  resetPositionBtn: document.getElementById('resetPositionBtn'),

  // Nudge Buttons
  nudgeUpBtn: document.getElementById('nudgeUpBtn'),
  nudgeDownBtn: document.getElementById('nudgeDownBtn'),
  nudgeLeftBtn: document.getElementById('nudgeLeftBtn'),
  nudgeRightBtn: document.getElementById('nudgeRightBtn'),

  // Name Controls
  nameInput: document.getElementById('nameInput'),
  clearNameBtn: document.getElementById('clearNameBtn'),
  uppercaseToggle: document.getElementById('uppercaseToggle'),
  charCounter: document.getElementById('charCounter'),

  // Actions
  downloadBtn: document.getElementById('downloadBtn'),
  mobileDownloadBtn: document.getElementById('mobileDownloadBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),

  // Feedback & Export
  toastContainer: document.getElementById('toastContainer'),
  exportCanvas: document.getElementById('exportCanvas')
};

// ============================================================================
// 4. INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTemplate();
  initEventListeners();
  updateLivePreview();
});

/**
 * Preloads the official Photoshop template image.
 */
function initTemplate() {
  const img = new Image();
  img.src = CONFIG.TEMPLATE_SRC;
  img.onload = () => {
    state.templateLoaded = true;
    state.templateImage = img;
    // Ensure template image in DOM has correct source
    DOM.templateImg.src = CONFIG.TEMPLATE_SRC;
  };
  img.onerror = () => {
    showToast('Failed to load official template image. Please check assets path.', 'danger');
  };
}

// ============================================================================
// 5. EVENT LISTENERS SETUP
// ============================================================================
function initEventListeners() {
  // --- Upload Handlers ---
  DOM.dropzone.addEventListener('click', () => DOM.photoInput.click());
  DOM.dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      DOM.photoInput.click();
    }
  });

  // Photo slot empty state click opens picker
  DOM.slotEmptyState.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.photoInput.click();
  });

  DOM.photoInput.addEventListener('change', handleFileSelect);
  DOM.replacePhotoBtn.addEventListener('click', () => DOM.photoInput.click());
  DOM.removePhotoBtn.addEventListener('click', removeUserPhoto);
  DOM.useSampleBtn.addEventListener('click', loadSampleData);

  // Drag and drop onto Dropzone
  setupDragAndDrop(DOM.dropzone);
  // Also allow dragging photo directly onto the preview container!
  setupDragAndDrop(DOM.dpStage);

  // Optional Slider & Buttons (if present in DOM)
  DOM.zoomSlider?.addEventListener('input', (e) => {
    setZoom(parseFloat(e.target.value));
  });

  DOM.zoomInBtn?.addEventListener('click', () => {
    setZoom(state.zoom + CONFIG.ZOOM_STEP * 2);
  });

  DOM.zoomOutBtn?.addEventListener('click', () => {
    setZoom(state.zoom - CONFIG.ZOOM_STEP * 2);
  });

  DOM.resetPositionBtn?.addEventListener('click', resetPosition);

  // Mouse Wheel Zoom over Photo Slot (Live Preview)
  DOM.dpPhotoSlot.addEventListener('wheel', handleSlotWheel, { passive: false });

  // Direct Drag Repositioning on Photo Slot (Mouse & Touch via PointerEvents)
  DOM.dpPhotoSlot.addEventListener('pointerdown', handlePointerDown);
  DOM.dpPhotoSlot.addEventListener('pointermove', handlePointerMove);
  DOM.dpPhotoSlot.addEventListener('pointerup', handlePointerUp);
  DOM.dpPhotoSlot.addEventListener('pointercancel', handlePointerUp);

  // Optional Nudge Directional Buttons
  DOM.nudgeUpBtn?.addEventListener('click', () => nudgePhoto(0, -CONFIG.NUDGE_STEP));
  DOM.nudgeDownBtn?.addEventListener('click', () => nudgePhoto(0, CONFIG.NUDGE_STEP));
  DOM.nudgeLeftBtn?.addEventListener('click', () => nudgePhoto(-CONFIG.NUDGE_STEP, 0));
  DOM.nudgeRightBtn?.addEventListener('click', () => nudgePhoto(CONFIG.NUDGE_STEP, 0));

  // --- Name Input Handlers ---
  DOM.nameInput.addEventListener('input', handleNameInput);
  DOM.clearNameBtn.addEventListener('click', () => {
    DOM.nameInput.value = '';
    handleNameInput();
    DOM.nameInput.focus();
  });

  DOM.uppercaseToggle.addEventListener('change', (e) => {
    state.isUppercase = e.target.checked;
    updateLivePreview();
  });

  // --- Actions ---
  DOM.downloadBtn.addEventListener('click', handleDownload);
  DOM.mobileDownloadBtn.addEventListener('click', handleDownload);
  DOM.resetAllBtn.addEventListener('click', resetAll);

  // Window resize handler to maintain responsive font sizing
  window.addEventListener('resize', debounce(updateLivePreview, 100));
}

// ============================================================================
// 6. IMAGE UPLOAD & HANDLING
// ============================================================================

/**
 * Sets up drag-and-drop visuals and file drop handlers.
 */
function setupDragAndDrop(element) {
  ['dragenter', 'dragover'].forEach(eventName => {
    element.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    element.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('dragover');
    });
  });

  element.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  });
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    processImageFile(files[0]);
  }
}

/**
 * Validates and loads an image file into memory.
 */
function processImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    showToast('Please select a valid JPG, PNG, or WEBP image.', 'danger');
    return;
  }

  // Maximum file size check (15MB)
  if (file.size > 15 * 1024 * 1024) {
    showToast('Image is larger than 15MB. Please choose a smaller file.', 'danger');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    loadUserImageFromSrc(event.target.result, file.name, formatBytes(file.size));
  };
  reader.onerror = () => {
    showToast('Error reading uploaded image.', 'danger');
  };
  reader.readAsDataURL(file);
}

/**
 * Loads an image from a data URL or path into the userImage state.
 */
function loadUserImageFromSrc(src, fileName = 'custom-photo.jpg', fileSize = 'High Res') {
  const img = new Image();
  img.onload = () => {
    state.userImage = img;
    state.userImageSrc = src;
    state.fileName = fileName;
    state.fileSize = fileSize;

    // Reset pan & zoom to default fit
    state.zoom = 1.0;
    state.panX = 0;
    state.panY = 0;
    if (DOM.zoomSlider) DOM.zoomSlider.value = '1.0';
    if (DOM.zoomValue) DOM.zoomValue.textContent = '100%';

    // Update UI elements
    DOM.statusThumb.src = src;
    DOM.fileNameDisplay.textContent = fileName;
    DOM.fileSizeDisplay.textContent = fileSize;
    DOM.uploadedStatus.hidden = false;
    DOM.dropzone.style.display = 'none';

    // Show photo in live preview slot
    DOM.dpUserPhoto.src = src;
    DOM.dpUserPhoto.hidden = false;
    DOM.slotEmptyState.style.display = 'none';

    updateLivePreview();
    showToast('Photo uploaded successfully! Drag to adjust position.', 'success');
  };
  img.onerror = () => {
    showToast('Could not decode the image.', 'danger');
  };
  img.src = src;
}

/**
 * Removes the currently loaded photo and restores empty state.
 */
function removeUserPhoto() {
  state.userImage = null;
  state.userImageSrc = null;
  state.fileName = '';
  state.fileSize = '';
  state.zoom = 1.0;
  state.panX = 0;
  state.panY = 0;

  DOM.photoInput.value = '';
  DOM.uploadedStatus.hidden = true;
  DOM.dropzone.style.display = 'block';

  DOM.dpUserPhoto.src = '';
  DOM.dpUserPhoto.hidden = true;
  DOM.slotEmptyState.style.display = 'flex';
  if (DOM.zoomSlider) DOM.zoomSlider.value = '1.0';
  if (DOM.zoomValue) DOM.zoomValue.textContent = '100%';

  updateLivePreview();
  showToast('Photo removed.', 'info');
}

/**
 * Loads the bundled sample avatar and name for rapid demo.
 */
function loadSampleData() {
  loadUserImageFromSrc(CONFIG.SAMPLE_AVATAR_SRC, 'sample-avatar.png', 'Official Demo');
  DOM.nameInput.value = CONFIG.SAMPLE_NAME;
  handleNameInput();
}

// ============================================================================
// 7. POSITIONING & ZOOM LOGIC
// ============================================================================

function setZoom(newZoom) {
  state.zoom = Math.min(CONFIG.ZOOM_MAX, Math.max(CONFIG.ZOOM_MIN, newZoom));
  if (DOM.zoomSlider) DOM.zoomSlider.value = state.zoom.toFixed(2);
  if (DOM.zoomValue) DOM.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  updateLivePreview();
}

function resetPosition() {
  state.zoom = 1.0;
  state.panX = 0;
  state.panY = 0;
  if (DOM.zoomSlider) DOM.zoomSlider.value = '1.0';
  if (DOM.zoomValue) DOM.zoomValue.textContent = '100%';
  updateLivePreview();
  showToast('Position reset to default.', 'info');
}

function nudgePhoto(dx, dy) {
  if (!state.userImage) return;
  state.panX += dx;
  state.panY += dy;
  updateLivePreview();
}

/**
 * Mouse Wheel Zoom inside the photo slot.
 */
function handleSlotWheel(e) {
  if (!state.userImage) return;
  e.preventDefault();
  const delta = e.deltaY < 0 ? CONFIG.ZOOM_STEP : -CONFIG.ZOOM_STEP;
  setZoom(state.zoom + delta);
}

/**
 * PointerDown: Begins drag repositioning or pinch gesture.
 */
function handlePointerDown(e) {
  if (!state.userImage) return;

  DOM.dpPhotoSlot.setPointerCapture(e.pointerId);
  state.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (state.activePointers.size === 1) {
    state.isDragging = true;
    state.dragStartPointerX = e.clientX;
    state.dragStartPointerY = e.clientY;
    state.dragStartPanX = state.panX;
    state.dragStartPanY = state.panY;
  } else if (state.activePointers.size === 2) {
    // Multi-touch pinch start
    const points = Array.from(state.activePointers.values());
    state.initialPinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    state.initialPinchZoom = state.zoom;
  }
}

/**
 * PointerMove: Handles panning and multi-touch pinching.
 */
function handlePointerMove(e) {
  if (!state.userImage) return;
  if (!state.activePointers.has(e.pointerId)) return;

  state.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (state.activePointers.size === 2 && state.initialPinchDistance) {
    // Multi-touch pinch zoom
    const points = Array.from(state.activePointers.values());
    const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    const zoomRatio = currentDist / state.initialPinchDistance;
    setZoom(state.initialPinchZoom * zoomRatio);
    return;
  }

  if (state.isDragging && state.activePointers.size === 1) {
    const rect = DOM.dpPhotoSlot.getBoundingClientRect();
    if (rect.width <= 0) return;

    // Convert screen pixel delta to 810 reference coordinate delta
    const scaleRatio = CONFIG.PHOTO_WIDTH / rect.width;
    const deltaX = (e.clientX - state.dragStartPointerX) * scaleRatio;
    const deltaY = (e.clientY - state.dragStartPointerY) * scaleRatio;

    state.panX = state.dragStartPanX + deltaX;
    state.panY = state.dragStartPanY + deltaY;

    updateLivePreview();
  }
}

/**
 * PointerUp: Ends drag or pinch gesture.
 */
function handlePointerUp(e) {
  if (state.activePointers.has(e.pointerId)) {
    state.activePointers.delete(e.pointerId);
    try {
      DOM.dpPhotoSlot.releasePointerCapture(e.pointerId);
    } catch (_) {
      // Ignore if pointer capture already released
    }
  }

  if (state.activePointers.size === 0) {
    state.isDragging = false;
    state.initialPinchDistance = null;
  } else if (state.activePointers.size === 1) {
    // Transitioning from 2 fingers back to 1 finger
    const remaining = state.activePointers.values().next().value;
    state.dragStartPointerX = remaining.x;
    state.dragStartPointerY = remaining.y;
    state.dragStartPanX = state.panX;
    state.dragStartPanY = state.panY;
    state.initialPinchDistance = null;
  }
}

// ============================================================================
// 8. NAME INPUT & AUTO-FIT
// ============================================================================

function handleNameInput() {
  const val = DOM.nameInput.value;
  state.userName = val;
  DOM.charCounter.textContent = `${val.length} / 40`;
  DOM.clearNameBtn.hidden = val.length === 0;
  updateLivePreview();
}

/**
 * Formats the name according to casing preference.
 */
function getFormattedName() {
  const raw = state.userName.trim();
  if (!raw) return '';
  return state.isUppercase ? raw.toUpperCase() : raw;
}

// ============================================================================
// 9. LIVE PREVIEW UPDATE (DOM + Percentage Calculations)
// ============================================================================

/**
 * Computes exact photo placement within the 316x316 reference slot.
 */
function getPhotoMetrics() {
  if (!state.userImage) return null;

  const nw = state.userImage.naturalWidth || 1;
  const nh = state.userImage.naturalHeight || 1;

  // Base cover fit to 316 × 316
  const baseScale = Math.max(CONFIG.PHOTO_WIDTH / nw, CONFIG.PHOTO_HEIGHT / nh);
  const baseWidth = nw * baseScale;
  const baseHeight = nh * baseScale;

  // Current scaled dimensions
  const curWidth = baseWidth * state.zoom;
  const curHeight = baseHeight * state.zoom;

  // Top-left coordinates relative to photo slot (0..316)
  const slotX = (CONFIG.PHOTO_WIDTH - curWidth) / 2 + state.panX;
  const slotY = (CONFIG.PHOTO_HEIGHT - curHeight) / 2 + state.panY;

  return {
    curWidth,
    curHeight,
    slotX,
    slotY,
    // Percentages relative to the 316 × 316 slot
    pctLeft: (slotX / CONFIG.PHOTO_WIDTH) * 100,
    pctTop: (slotY / CONFIG.PHOTO_HEIGHT) * 100,
    pctWidth: (curWidth / CONFIG.PHOTO_WIDTH) * 100,
    pctHeight: (curHeight / CONFIG.PHOTO_HEIGHT) * 100
  };
}

/**
 * Synchronizes the DOM preview elements with current application state.
 */
function updateLivePreview() {
  // 1. Update Photo Position & Scale
  if (state.userImage) {
    const metrics = getPhotoMetrics();
    if (metrics) {
      DOM.dpUserPhoto.style.left = `${metrics.pctLeft}%`;
      DOM.dpUserPhoto.style.top = `${metrics.pctTop}%`;
      DOM.dpUserPhoto.style.width = `${metrics.pctWidth}%`;
      DOM.dpUserPhoto.style.height = `${metrics.pctHeight}%`;
    }
  }

  // 2. Update Name Text and Auto-Fit Font Size
  const displayName = getFormattedName();
  DOM.dpUserName.textContent = displayName;

  if (displayName) {
    adjustPreviewFontSize(displayName);
  } else {
    DOM.dpUserName.style.fontSize = '';
  }
}

/**
 * Calculates and applies the optimal font size for the live preview name.
 */
function adjustPreviewFontSize(text) {
  const container = DOM.dpPreviewContainer;
  const containerWidth = container.clientWidth || 400;
  const scale = containerWidth / CONFIG.TEMPLATE_WIDTH;

  // Usable reference width and height
  const maxRefWidth = CONFIG.NAME_WIDTH - (CONFIG.NAME_PADDING_X * 2);  // ~298px
  const maxRefHeight = CONFIG.NAME_HEIGHT - (CONFIG.NAME_PADDING_Y * 2); // ~31px

  // Use an offscreen canvas context to measure accurately
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let optimalFontSize = CONFIG.NAME_MAX_FONT_SIZE;
  while (optimalFontSize > CONFIG.NAME_MIN_FONT_SIZE) {
    ctx.font = `${CONFIG.NAME_FONT_WEIGHT} ${optimalFontSize}px ${CONFIG.NAME_FONT_FAMILY}`;
    const textWidth = ctx.measureText(text).width;
    if (textWidth <= maxRefWidth && optimalFontSize <= maxRefHeight) {
      break;
    }
    optimalFontSize -= 0.5;
  }

  // Scale font size proportionally to preview dimensions
  const finalScreenFontSize = Math.max(8, optimalFontSize * scale);
  DOM.dpUserName.style.fontSize = `${finalScreenFontSize.toFixed(1)}px`;
}

// ============================================================================
// 10. HIGH-RESOLUTION CANVAS EXPORT & DOWNLOAD
// ============================================================================

/**
 * Generates the full 810 × 810 PNG export using HTML5 Canvas API.
 */
async function handleDownload() {
  if (!state.userImage) {
    showToast('Please upload your photograph first!', 'danger');
    DOM.dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    DOM.dropzone.focus();
    return;
  }

  const downloadBtns = [DOM.downloadBtn, DOM.mobileDownloadBtn];
  downloadBtns.forEach(btn => btn.disabled = true);
  showToast('Generating your high-resolution DP...', 'info');

  try {
    // Ensure all custom web fonts (Montserrat / Poppins) are loaded
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = DOM.exportCanvas;
    canvas.width = CONFIG.TEMPLATE_WIDTH;
    canvas.height = CONFIG.TEMPLATE_HEIGHT;
    const ctx = canvas.getContext('2d', { alpha: false });

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // -------------------------------------------------------------
    // Step 1: Draw the Original Photoshop Template
    // -------------------------------------------------------------
    if (state.templateImage && state.templateLoaded) {
      ctx.drawImage(state.templateImage, 0, 0, CONFIG.TEMPLATE_WIDTH, CONFIG.TEMPLATE_HEIGHT);
    } else {
      // Fallback: load template dynamically if not yet ready
      await new Promise((resolve, reject) => {
        const temp = new Image();
        temp.src = CONFIG.TEMPLATE_SRC;
        temp.onload = () => {
          ctx.drawImage(temp, 0, 0, CONFIG.TEMPLATE_WIDTH, CONFIG.TEMPLATE_HEIGHT);
          resolve();
        };
        temp.onerror = reject;
      });
    }

    // -------------------------------------------------------------
    // Step 2: Draw the User Photograph (Clipped to Photo Area)
    // -------------------------------------------------------------
    ctx.save();
    // Clip strictly to PHOTO_X, PHOTO_Y, PHOTO_WIDTH, PHOTO_HEIGHT
    ctx.beginPath();
    ctx.rect(CONFIG.PHOTO_X, CONFIG.PHOTO_Y, CONFIG.PHOTO_WIDTH, CONFIG.PHOTO_HEIGHT);
    ctx.clip();

    // Compute exact pan & zoom placement (identical to live preview)
    const metrics = getPhotoMetrics();
    if (metrics) {
      const drawX = CONFIG.PHOTO_X + metrics.slotX;
      const drawY = CONFIG.PHOTO_Y + metrics.slotY;
      ctx.drawImage(state.userImage, drawX, drawY, metrics.curWidth, metrics.curHeight);
    }
    ctx.restore();

    // -------------------------------------------------------------
    // Step 3: Draw User Name (Centered with Auto-Fit Font)
    // -------------------------------------------------------------
    const displayName = getFormattedName();
    if (displayName) {
      const maxRefWidth = CONFIG.NAME_WIDTH - (CONFIG.NAME_PADDING_X * 2);
      const maxRefHeight = CONFIG.NAME_HEIGHT - (CONFIG.NAME_PADDING_Y * 2);

      let fontSize = CONFIG.NAME_MAX_FONT_SIZE;
      while (fontSize > CONFIG.NAME_MIN_FONT_SIZE) {
        ctx.font = `${CONFIG.NAME_FONT_WEIGHT} ${fontSize}px ${CONFIG.NAME_FONT_FAMILY}`;
        const metrics = ctx.measureText(displayName);
        if (metrics.width <= maxRefWidth && fontSize <= maxRefHeight) {
          break;
        }
        fontSize -= 0.5;
      }

      ctx.font = `${CONFIG.NAME_FONT_WEIGHT} ${fontSize}px ${CONFIG.NAME_FONT_FAMILY}`;
      ctx.fillStyle = CONFIG.NAME_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Subtle shadow matching Photoshop typography
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      // Draw text centered at (593, 562.5)
      ctx.fillText(displayName, CONFIG.NAME_CENTER_X, CONFIG.NAME_CENTER_Y);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
    }

    // -------------------------------------------------------------
    // Step 4: Export to PNG Blob and Trigger Download
    // -------------------------------------------------------------
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('Error generating PNG export.', 'danger');
        return;
      }

      const filename = generateDownloadFilename(displayName);
      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = filename;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      showToast(`Downloaded: ${filename}`, 'success');
    }, 'image/png');

  } catch (err) {
    console.error('Download error:', err);
    showToast('Failed to export DP. Please try again.', 'danger');
  } finally {
    downloadBtns.forEach(btn => btn.disabled = false);
  }
}

/**
 * Creates a clean, sensible filename:
 * e.g. BOLE-2026-IBRAHIM-DP.png
 */
function generateDownloadFilename(name) {
  let cleanName = (name || '').trim();
  if (cleanName) {
    cleanName = cleanName
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toUpperCase();
  }
  const namePart = cleanName ? cleanName : 'CONFIRMED';
  return `${CONFIG.EXPORT_FILENAME_PREFIX}-${namePart}-${CONFIG.EXPORT_FILENAME_SUFFIX}.png`;
}

// ============================================================================
// 11. RESET EVERYTHING
// ============================================================================

function resetAll() {
  removeUserPhoto();
  DOM.nameInput.value = '';
  handleNameInput();
  showToast('Reset all settings to default.', 'info');
}

// ============================================================================
// 12. UTILITY FUNCTIONS
// ============================================================================

/**
 * Displays a non-intrusive floating toast notification.
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'danger') {
    iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else {
    iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f47807" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
