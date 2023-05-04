const form = document.querySelector('form');
const input = document.querySelector('input');
const img = document.querySelector('img');

form.addEventListener('submit', e => {
  e.preventDefault();
  const movieTitle = input.value;
  const apiKey = '7ae222abae7a3ddc86b2deb7e8542a4a';
  const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${movieTitle}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const posterPath = data.results[0].poster_path;
      const posterUrl = `https://image.tmdb.org/t/p/w500/${posterPath}`;
      img.src = posterUrl;
    })
    .catch(error => console.error(error));
});
