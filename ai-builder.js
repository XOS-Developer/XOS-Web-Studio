(() => {
  'use strict';

  const SURPRISE_IDEAS = [
    "Modern gaming website",
    "Personal portfolio",
    "Weather dashboard",
    "Restaurant landing page",
    "Online store",
    "Music player",
    "Calculator app",
    "Notes application",
    "Blog website",
    "Photo gallery",
    "Login page",
    "Admin dashboard"
  ];

  let modalEl, textareaEl, generateBtn, surpriseBtn, closeBtn, errorEl, loadingOverlay;

  function initAIBuilder() {
    modalEl = document.getElementById('ai-builder-modal');
    if (!modalEl) return;

    textareaEl = document.getElementById('ai-prompt-input');
    generateBtn = document.getElementById('ai-generate-btn');
    surpriseBtn = document.getElementById('ai-surprise-btn');
    closeBtn = document.getElementById('ai-close-btn');
    errorEl = document.getElementById('ai-error-msg');
    loadingOverlay = document.getElementById('ai-loading-overlay');

    // Attach button to toolbar directly
    injectToolbarButton();

    // Event Listeners
    closeBtn?.addEventListener('click', closeModal);
    generateBtn?.addEventListener('click', () => handleGenerate());
    surpriseBtn?.addEventListener('click', handleSurpriseMe);

    // Close on overlay click
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });

    // Keyboard shortcuts: ESC to close, Ctrl/Cmd + Enter to submit
    document.addEventListener('keydown', (e) => {
      if (!modalEl || modalEl.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleGenerate();
      }
    });
  }

  function injectToolbarButton() {
    if (document.getElementById('tb-ai-builder')) return;

    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;

    const aiBtn = document.createElement('button');
    aiBtn.className = 'toolbar-btn ai-builder-btn';
    aiBtn.id = 'tb-ai-builder';
    aiBtn.title = 'AI Builder';
    aiBtn.type = 'button';
    aiBtn.innerHTML = `🤖 <span>AI Builder</span>`;

    aiBtn.addEventListener('click', openModal);

    // Place before search button or at end of toolbar
    const searchBtn = document.getElementById('tb-search');
    if (searchBtn) {
      toolbar.insertBefore(aiBtn, searchBtn);
    } else {
      toolbar.appendChild(aiBtn);
    }
  }

  function openModal() {
    clearError();
    modalEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      modalEl.classList.add('active');
      textareaEl.focus();
    });
  }

  function closeModal() {
    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) return;
    modalEl.classList.remove('active');
    setTimeout(() => {
      modalEl.classList.add('hidden');
      clearError();
    }, 200);
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  function setLoading(isLoading) {
    if (isLoading) {
      loadingOverlay.classList.remove('hidden');
      generateBtn.disabled = true;
      surpriseBtn.disabled = true;
      textareaEl.disabled = true;
    } else {
      loadingOverlay.classList.add('hidden');
      generateBtn.disabled = false;
      surpriseBtn.disabled = false;
      textareaEl.disabled = false;
    }
  }

  async function handleGenerate(overridePrompt = null) {
    clearError();
    const promptValue = overridePrompt || textareaEl.value.trim();

    if (!promptValue) {
      showError('Please enter a description for what you want to create.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptValue, mode: 'generate' })
      });

      if (!response.ok) {
        throw new Error(`Server status ${response.status}`);
      }

      const data = await response.json();
      if (!data || typeof data.html !== 'string') {
        throw new Error('Invalid response received from AI service.');
      }

      insertCodeToEditor(data.html);
      closeModal();
      textareaEl.value = '';
    } catch (err) {
      console.error('AI Builder Request Failed:', err);
      showError(err.message || 'Failed to connect to AI service. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSurpriseMe() {
    const idea = SURPRISE_IDEAS[Math.floor(Math.random() * SURPRISE_IDEAS.length)];
    const fullPrompt = `Create a ${idea.toLowerCase()} page with modern design and styling`;
    textareaEl.value = fullPrompt;
    handleGenerate(fullPrompt);
  }

  function insertCodeToEditor(htmlContent) {
    const codeInput = document.getElementById('code-input');
    if (codeInput) {
      codeInput.textContent = htmlContent;
      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (typeof updatePreview === 'function') {
      updatePreview();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIBuilder);
  } else {
    initAIBuilder();
  }
})();