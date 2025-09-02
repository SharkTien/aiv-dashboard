<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
<script src="//cdn.jsdelivr.net/jquery.scrollto/2.1.2/jquery.scrollTo.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>window.WEBFLOW_API_HOST='https://aiv-dashboard-ten.vercel.app';</script>

<script>

// CHANGE THE FORM CODE OF YOUR PHASE FORM HERE
const TARGET_FORM_CODE = 'ogv-w25-submissions-1756494351183';

// Public form submit → Next.js API (no Supabase)

// Grab form (adjust selector to your Webflow form name/id)
const form = document.forms['wf-form--2'];
if (!form) {
  console.error('Form not found: wf-form--2');
}

// Resolve API host locally (no globals). Supports data-api-host or hidden input name="api-host", fallback to origin
function resolveApiHost() {
  try {
    const fromAttr = form && (form.getAttribute('data-api-host') || (form.dataset ? form.dataset.apiHost : ''));
    const inputEl = form && form.querySelector('input[name="api-host"]');
    const fromInput = inputEl && inputEl.value ? inputEl.value : '';
    const origin = (typeof window !== 'undefined' ? window.location.origin : '');
    return fromAttr || fromInput || origin;
  } catch {
    return (typeof window !== 'undefined' ? window.location.origin : '');
  }
}

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
    const API_HOST = resolveApiHost();
    const base = `${API_HOST}/api/forms/by-code/${TARGET_FORM_CODE}`;
    const url = `${base}/submit`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      let parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch {}
      const message = parsed?.error || raw || `Submit failed (${res.status})`;
      throw new Error(message);
    }

    return true;
  } catch (e) {
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
</script>