$(document).ready(function() {
  // Event listener for the input form
  $("#input-form").submit(function(event) {
    event.preventDefault();
    var userInput = $("#input-field").val();
    $("#output").html("Loading...");
    var url = "https://api.themoviedb.org/3/search/movie?api_key=7ae222abae7a3ddc86b2deb7e8542a4a&language=en-US&query=" + userInput;
    $.getJSON(url, function(data) {
      var results = data.results;
      if (results.length > 0) {
        var firstResult = results[0];
        var title = firstResult.title;
        var releaseDate = firstResult.release_date;
        var posterPath = firstResult.poster_path;
        var directorUrl = "https://api.themoviedb.org/3/movie/" + firstResult.id + "/credits?api_key=7ae222abae7a3ddc86b2deb7e8542a4a";
        var director = "";
        $.getJSON(directorUrl, function(data) {
          var crew = data.crew;
          for (var i = 0; i < crew.length; i++) {
            if (crew[i].job === "Director") {
              director = crew[i].name;
              break;
            }
          }
          $("#output").html("<img class='poster' src='https://image.tmdb.org/t/p/w500" + posterPath + "'><br>" + title + " (" + releaseDate.substring(0, 4) + ")<br>Directed by " + director);
          $(".poster").css({
            "border": "3px solid black",
            "max-height": "400px"
          });
        });
      } else {
        $("#output").html("No results found. Please try again.");
      }
    }).fail(function() {
      $("#output").html("Error loading data. Please try again.");
    });
  });
});
