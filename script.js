const poster = document.querySelector('#poster');
const guessForm = document.querySelector('form');
const guessInput = document.querySelector('#guess');
const resultDiv = document.querySelector('#result');

// Fetch a random movie poster when the page loads
fetchRandomPoster();

// Event listener for guess form submission
guessForm.addEventListener('submit', e => {
  e.preventDefault();
  const guess = guessInput.value;
  const movieTitle = poster.dataset.title;

  if (guess.toLowerCase() === movieTitle.toLowerCase()) {
    // Correct guess
    resultDiv.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/864/864833.png" alt="Green check mark">';
  } else {
    // Incorrect guess
    resultDiv.innerHTML = 'Sorry, try again!';
  }
});

function fetchRandomPoster() {
  const apiKey = '7ae222abae7a3ddc86b2deb7e8542a4a';
  const apiUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=en-US&page=1`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const randomIndex = Math.floor(Math.random() * data.results.length);
      const posterPath = data.results[randomIndex].poster_path;
      const posterUrl = `https://image.tmdb.org/t/p/w500/${posterPath}`;
      const movieTitle = data.results[randomIndex].title;
      poster.src = posterUrl;
      poster.dataset.title = movieTitle;
    })
    .catch(error => console.error(error));
}
