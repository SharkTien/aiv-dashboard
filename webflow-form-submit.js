// Webflow Form Submit Script
// Thay thế Supabase bằng API của chúng ta

// Constants
let code = getRandomNumbers();
const form = document.forms['wf-form--2'];

// Function to get random numbers (giữ nguyên từ code cũ)
function getRandomNumbers() {
  return Math.floor(Math.random() * 900000) + 100000;
}

// Submit to our API
async function submitToOurAPI(formData) {
  try {
    // Convert FormData to object
    const formFields = {};
    formData.forEach((value, key) => {
      // Skip form-code field as we'll use it to identify the form
      if (key !== 'form-code') {
        formFields[key] = value;
      }
    });

    // Get form code from hidden field
    const formCode = formData.get('form-code');
    
    if (!formCode) {
      throw new Error('Form code not found');
    }

    console.log('Submitting data to form:', formCode);
    console.log('Form data:', formFields);

    // Submit to our API
    const response = await fetch(`https://your-domain.com/api/forms/${formCode}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formFields)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Submission failed');
    }

    const result = await response.json();
    console.log('Form submission successful:', result);
    return true;
  } catch (error) {
    console.error('Submission error:', error);
    return false;
  }
}

// Handle form submission
async function handleSubmission(formData) {
  // Update UI - Loading state
  const submitButton = document.getElementById('form-submit-ogv');
  submitButton.value = "Đơn đăng ký của bạn đang được gửi đi";
  submitButton.disabled = true;

  try {
    const success = await submitToOurAPI(formData);
    
    if (success) {
      // Hide form
      form.style.display = "none";
      // Show success message
      const successElement = document.getElementById('customSuccess');
      successElement.style.display = "block";
      document.getElementById('ogv--form--header').scrollIntoView();
    } else {
      // Show error message
      form.style.display = "none";
      const errorElement = document.getElementById("customError");
      errorElement.style.display = "block";
    }
  } catch (error) {
    console.error('Error:', error);
    // Show error message
    form.style.display = "none";
    const errorElement = document.getElementById("customError");
    errorElement.style.display = "block";
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.value = "Gửi đơn đăng ký";
  }
}

// Form submit event listener
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Set form code (this should match the form code in your database)
  document.getElementById('form-code').value = code;
  
  const formData = new FormData(form);
  await handleSubmission(formData);
});

// Optional: Add form validation
function validateForm() {
  const requiredFields = form.querySelectorAll('[required]');
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('error');
      isValid = false;
    } else {
      field.classList.remove('error');
    }
  });
  
  return isValid;
}

// Enhanced form submission with validation
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    alert('Vui lòng điền đầy đủ thông tin bắt buộc');
    return;
  }
  
  document.getElementById('form-code').value = code;
  const formData = new FormData(form);
  await handleSubmission(formData);
});
