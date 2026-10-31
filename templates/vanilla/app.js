let clicks = 0;
const button = document.querySelector('#counter');
button.addEventListener('click', () => {
  clicks += 1;
  button.textContent = `Clicks: ${clicks}`;
});
