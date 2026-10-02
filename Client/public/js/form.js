import api from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  loadStatesAndLGAs();
  addDOBValidation();
  setupFormSubmission();
  setupAdditionalValidation();
});

async function loadStatesAndLGAs() {
  try {
    let statesData = null;
    try {
      statesData = await api.getStates();
    } catch {
      // Fallback for direct static file load
      const response = await fetch("./states-localgovts.json").catch(() => fetch("../public/states-localgovts.json"));
      if (response && response.ok) {
        statesData = await response.json();
      }
    }

    if (!statesData || !Array.isArray(statesData)) {
      console.warn("Unable to load states data");
      return;
    }

    const stateSelect = document.getElementById("state");
    const lgaSelect = document.getElementById("localGovernment");

    if (!stateSelect || !lgaSelect) return;

    stateSelect.innerHTML = '<option value="">Select State</option>';
    lgaSelect.innerHTML = '<option value="">Select Local Government</option>';

    statesData.forEach((stateObj) => {
      const option = document.createElement("option");
      option.value = stateObj.state;
      option.textContent = stateObj.state;
      stateSelect.appendChild(option);
    });

    stateSelect.addEventListener("change", () => {
      const selectedState = stateSelect.value;
      const stateData = statesData.find((s) => s.state === selectedState);

      lgaSelect.innerHTML = '<option value="">Select Local Government</option>';

      if (stateData && Array.isArray(stateData.local)) {
        stateData.local.forEach((lga) => {
          const option = document.createElement("option");
          option.value = lga;
          option.textContent = lga;
          lgaSelect.appendChild(option);
        });
      }
    });
  } catch (error) {
    console.error("Error loading states:", error);
  }
}

function addDOBValidation() {
  const dobInput = document.getElementById("dob");
  if (!dobInput) return;

  dobInput.addEventListener("input", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dobValue = new Date(dobInput.value);

    if (dobValue >= today) {
      dobInput.setCustomValidity("Date of birth cannot be in the future.");
    } else {
      dobInput.setCustomValidity("");
    }
    dobInput.reportValidity();
  });
}

function setupFormSubmission() {
  const form = document.getElementById("registrationForm");
  if (!form) return;

  const submitButton = form.querySelector("button[type='submit']");

  // Create UI feedback containers if not already present
  let errorContainer = form.querySelector(".alert-danger");
  if (!errorContainer) {
    errorContainer = document.createElement("div");
    errorContainer.className = "alert alert-danger mt-3 d-none";
    errorContainer.role = "alert";
    form.appendChild(errorContainer);
  }

  let successContainer = form.querySelector(".alert-success");
  if (!successContainer) {
    successContainer = document.createElement("div");
    successContainer.className = "alert alert-success mt-3 d-none";
    successContainer.role = "alert";
    form.appendChild(successContainer);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Show loading spinner
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    submitButton.disabled = true;

    errorContainer.classList.add("d-none");
    successContainer.classList.add("d-none");

    const formData = new FormData(form);

    try {
      const response = await api.submitStudentData(formData);

      if (response && response.success) {
        successContainer.innerHTML = `
          <strong> Application Submitted Successfully!</strong><br>
          Your portal login credentials have been dispatched to your email.<br>
          <small class="text-muted">Temporary Password: <strong>${response.generatedPassword || 'First Name + Year of Birth'}</strong></small><br>
          <em>Redirecting you to the Login page to access your portal...</em>
        `;
        successContainer.classList.remove("d-none");

        setTimeout(() => {
          window.location.href = './login.html';
        }, 2200);
      } else {
        const errorMsg = response?.message || "Registration failed. Please check your details.";
        errorContainer.textContent = errorMsg;
        errorContainer.classList.remove("d-none");

        submitButton.innerHTML = "Submit";
        submitButton.disabled = false;
      }
    } catch (error) {
      errorContainer.textContent = error.message || "An error occurred while submitting the form. Please try again later.";
      errorContainer.classList.remove("d-none");

      submitButton.innerHTML = "Submit";
      submitButton.disabled = false;
    }
  });
}

function setupAdditionalValidation() {
  const form = document.getElementById("registrationForm");
  if (!form) return;

  // Phone number validation
  const phoneInput = form.querySelector('input[name="phone"]');
  if (phoneInput) {
    phoneInput.addEventListener("blur", () => {
      const phoneValue = phoneInput.value.trim();
      if (phoneValue && (!/^\d+$/.test(phoneValue) || phoneValue.length < 10 || phoneValue.length > 15)) {
        phoneInput.setCustomValidity("Please enter a valid phone number (10-15 digits)");
      } else {
        phoneInput.setCustomValidity("");
      }
      phoneInput.reportValidity();
    });
  }

  // JAMB score validation
  const jambInput = form.querySelector('input[name="jambScore"]');
  if (jambInput) {
    jambInput.addEventListener("blur", () => {
      const score = parseInt(jambInput.value, 10);
      if (isNaN(score) || score < 0 || score > 400) {
        jambInput.setCustomValidity("JAMB score must be between 0 and 400");
      } else {
        jambInput.setCustomValidity("");
      }
      jambInput.reportValidity();
    });
  }

  // Image file validation
  const imageInput = form.querySelector('input[name="image"]');
  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];
      if (file) {
        const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        if (!validTypes.includes(file.type)) {
          imageInput.setCustomValidity("Please select a valid image file (JPEG, PNG, WebP)");
          imageInput.reportValidity();
          return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB matching server config
        if (file.size > maxSize) {
          imageInput.setCustomValidity("Image size should not exceed 5MB");
          imageInput.reportValidity();
          return;
        }

        imageInput.setCustomValidity("");
      } else {
        imageInput.setCustomValidity("");
      }
    });
  }
}

export default { loadStatesAndLGAs, addDOBValidation, setupFormSubmission, setupAdditionalValidation };