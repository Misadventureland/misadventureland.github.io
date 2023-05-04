import "core-js/stable";
import "regenerator-runtime/runtime";

const API_KEY = '7ae222abae7a3ddc86b2deb7e8542a4a';
let movieDetails = {};
let guessedMovies = [];

async function getMovieDetails(movieName) {
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${movieName}`);
    const data = await response.json();
    if (data.total_results === 0) {
        return null;
    }
    return {
        title: data.results[0].title,
        year: parseInt(data.results[0].release_date.slice(0, 4)),
        director: '',
        studio: '',
    };
}

async function checkGuess(event) {
    event.preventDefault();
    const guessInput = document.getElementById('guessInput');
    const guess = guessInput.value.toLowerCase();
    guessInput.value = '';
    const movieDetailsCopy = Object.assign({}, movieDetails);
    const guessResult = {};
    if (guess === movieDetailsCopy.title.toLowerCase()) {
        guessResult.title = `<span class="correct">${movieDetailsCopy.title}</span>`;
    } else {
        guessResult.title = `<span class="incorrect">${guess}</span>`;
    }
    if (Math.abs(guessInput.year - movieDetailsCopy.year) <= 5) {
        guessResult.year = `<span class="close">${guessInput.year}</span>`;
    } else if (guessInput.year === movieDetailsCopy.year) {
        guessResult.year = `<span class="correct">${guessInput.year}</span>`;
    } else {
        guessResult.year = `<span class="incorrect">${guessInput.year}</span>`;
    }
    if (guessInput.director.toLowerCase() === movieDetailsCopy.director.toLowerCase()) {
        guessResult.director = `<span class="correct">${guessInput.director}</span>`;
    } else {
        guessResult.director = `<span class="incorrect">${guessInput.director}</span>`;
    }
    if (guessInput.studio.toLowerCase() === movieDetailsCopy.studio.toLowerCase()) {
        guessResult.studio = `<span class="correct">${guessInput.studio}</span>`;
    } else {
        guessResult.studio = `<span class="incorrect">${guessInput.studio}</span>`;
    }
    const guessItem = document.createElement('li');
    guessItem.innerHTML = `${guessResult.title} (${guessResult.year}), directed by ${guessResult.director}, released by ${guessResult.studio}`;
    guessedMovies.push(guessItem);
    document.getElementById('guessList').append(guessItem);
    if (guess === movieDetailsCopy.title.toLowerCase() && 
        Math.abs(guessInput.year - movieDetailsCopy.year) <= 5 &&
        guessInput.director.toLowerCase() === movieDetailsCopy.director.toLowerCase() &&
        guessInput.studio.toLowerCase() === movieDetailsCopy.studio.toLowerCase()) {
        alert('Congratulations! You guessed the movie correctly!');
    }
}

async function startGame() {
    const movieName = prompt('Enter the name of a movie:');
    movieDetails = await getMovieDetails(movieName);
    if (movieDetails === null) {
        alert('Sorry, we could not find the movie you were looking for. Please try again.');
        return;
    }
    const year = prompt(`In what year was ${movieDetails.title} released?`);
    movieDetails.year = parseInt(year);
    movieDetails.director = prompt(`Who directed ${movieDetails.title}?`);
    movieDetails.studio = prompt(`Which studio released ${movieDetails.title}?`);
    document.getElementById('guessForm').addEventListener('submit', checkGuess);
    document.getElementById('guessInput