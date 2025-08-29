

// Public form submit → Next.js API (no Supabase)

// Grab form (adjust selector to your Webflow form name/id)
const form = document.forms['wf-form--2'];
if (!form) {
  console.error('Form not found: wf-form--2');
}

// Optional: override API host on Webflow (e.g., set window.WEBFLOW_API_HOST = 'https://your-domain.com')
// Also supports: data-api-host on <form> or a hidden input named "api-host"
(function ensureApiHost() {
  try {
    const fromAttr = form && (form.getAttribute('data-api-host') || (form.dataset ? form.dataset.apiHost : ''));
    const inputEl = form && form.querySelector('input[name="api-host"]');
    const fromInput = inputEl && inputEl.value ? inputEl.value : '';
    const winHost = (typeof window !== 'undefined' && window.WEBFLOW_API_HOST) || '';
    const origin = (typeof window !== 'undefined' ? window.location.origin : '');
    // Choose priority: window var > data attribute > hidden input > origin
    var API_HOST = winHost || fromAttr || fromInput || origin;
    // Expose for debugging
    if (typeof window !== 'undefined') window.__FORM_API_HOST__ = API_HOST;
    console.log('[FormSubmit] Resolved API_HOST =', API_HOST, ' page origin =', origin);
    if (/webflow\.(io|com)/i.test(API_HOST) || /\.webflow\.io$/i.test(API_HOST)) {
      console.warn('[FormSubmit] API_HOST looks like a Webflow domain:', API_HOST, '\nThis will 405 because that origin does not serve your Next.js API. Set window.WEBFLOW_API_HOST or data-api-host on <form> to your backend, e.g., https://your-backend.example.com');
    }
    // Replace global reference if previously defined
    if (typeof window !== 'undefined') window.API_HOST = API_HOST;
  } catch (e) {
    console.warn('[FormSubmit] Could not resolve API host:', e);
  }
})();

let code = getRandomNumbers();

function toObject(formData) {
  const out = {};
  formData.forEach((value, key) => {
    // If multiple values share the same key (e.g., checkbox group), accumulate into array
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      const existing = out[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        out[key] = [existing, value];
      }
    } else {
      out[key] = value;
    }
  });
  return out;
}

async function submitToBackend(formData) {
  // Convert form fields to plain object
  const payload = toObject(formData);

  // Normalize datetime-local inputs to ISO if present
  for (const [key, val] of Object.entries(payload)) {
    if (val && typeof val === 'string') {
      // Basic detection for datetime-local (YYYY-MM-DDTHH:MM)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
        const dt = new Date(val);
        if (!isNaN(dt.getTime())) payload[key] = dt.toISOString();
      }
    }
  }

  try {
    // form-code is already present in payload via the hidden input
    const code = String(payload['form-code'] || '');
    if (!code) throw new Error('Missing form-code');

    const API_HOST = (typeof window !== 'undefined' && (window.WEBFLOW_API_HOST || window.__FORM_API_HOST__ || window.API_HOST)) || (typeof window !== 'undefined' ? window.location.origin : '');
    const base = `${API_HOST}/api/forms/by-code/${encodeURIComponent(code)}`;
    const url = `${base}/submit`;

    console.log('[FormSubmit] POST URL:', url);
    console.log('[FormSubmit] form-code:', code);
    console.log('[FormSubmit] payload:', payload);

    // Manual preflight debug
    try {
      const pre = await fetch(url, { method: 'OPTIONS' });
      console.log('[FormSubmit] Manual OPTIONS →', pre.status, pre.statusText, 'Headers:', Array.from(pre.headers.entries()));
    } catch (optErr) {
      console.warn('[FormSubmit] Manual OPTIONS failed:', optErr);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('[FormSubmit] response status:', res.status, res.statusText);

    if (!res.ok) {
      console.log('[FormSubmit] Response headers:', Array.from(res.headers.entries()));
      const raw = await res.text().catch(() => '');
      console.warn('[FormSubmit] response body (error):', raw);
      let parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch {}
      const message = parsed?.error || raw || `Submit failed (${res.status})`;
      // Extra hint if likely wrong host
      if (/webflow\.(io|com)/i.test(String(API_HOST))) {
        console.warn('[FormSubmit] Hint: API_HOST is a Webflow domain. Set window.WEBFLOW_API_HOST to your backend domain.');
      }
      throw new Error(message);
    }

    const okBody = await res.text().catch(() => '');
    console.log('[FormSubmit] response body (success):', okBody);

    return true;
  } catch (e) {
    console.error('Submit error:', e);
    return false;
  }
}

async function handleSubmission(formData) {
  const submitButton = document.getElementById('form-submit-ogv');
  if (submitButton) {
    submitButton.value = 'Đơn đăng ký của bạn đang được gửi đi';
    submitButton.disabled = true;
  }

  try {
    const ok = await submitToBackend(formData);
    // Success UI
    if (ok) {
      if (form) form.style.display = 'none';
      const successEl = document.getElementById('customSuccess');
      if (successEl) successEl.style.display = 'block';
      const header = document.getElementById('ogv--form--header');
      if (header) header.scrollIntoView();
    } else {
      if (form) form.style.display = 'none';
      const errEl = document.getElementById('customError');
      if (errEl) errEl.style.display = 'block';
    }
  } catch (err) {
    console.error('Unexpected submit error:', err);
    if (form) form.style.display = 'none';
    const errEl = document.getElementById('customError');
    if (errEl) errEl.style.display = 'block';
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.value = 'Gửi đơn đăng ký';
    }
  }
}

// Force a specific form code right before submit
const TARGET_FORM_CODE = 'ogv-w24-submissions-1756364313312';

if (form) {
  // Neutralize native form submit path and any other submit handlers
  try { form.setAttribute('action', 'about:blank'); } catch {}
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    // Ensure hidden input exists and contains the target code
    let codeEl = document.getElementById('form-code');
    if (!codeEl) {
      codeEl = document.createElement('input');
      codeEl.type = 'hidden';
      codeEl.name = 'form-code';
      codeEl.id = 'form-code';
      form.appendChild(codeEl);
    }
    codeEl.value = code;
    // Also set data attribute for debugging/consistency
    form.setAttribute('data-form-code', TARGET_FORM_CODE);

    const formData = new FormData(form);
    await handleSubmission(formData);
  }, true); // capture to run before other listeners
}