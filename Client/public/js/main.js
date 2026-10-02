// import api from './api.js';

// document.addEventListener('DOMContentLoaded', () => {
//     console.log('Document is ready');

//     const stateSelect = document.getElementById('state');
//     if (stateSelect) {
//         loadStates();
//     }

//     const form = document.getElementById('registrationForm');
//     if (form) {
//         form.addEventListener('submit', handleFormSubmit);
//     }
// });

// async function loadStates() {
//     try {
//         const states = await api.getStates();
//         const stateSelect = document.getElementById('state');
//         states.forEach(state => {
//             stateSelect.innerHTML += `<option value="${state.id}">${state.name}</option>`;
//         });
//     } catch (error) {
//         console.error('Error loading states:', error);
//     }
// }

// async function handleFormSubmit(event) {
//     event.preventDefault();
//     const form = event.target;
//     const formData = new FormData(form);

//     try {
//         const response = await api.submitStudentData(formData);
//         alert('Registration successful!');
//         window.location.href = '../views/details.html';
//     } catch (error) {
//         console.error('Error submitting form:', error);
//         alert('An error occurred during registration. Please try again.');
//     }
// }