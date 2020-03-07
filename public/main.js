/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

/*var tunes = document.getElementById('playlist').querySelectorAll('li');
var i;
for (i = 0; i < tunes.length; i++) {
  tunes[i].addEventListener("click", function(){
    this.classList.toggle('active');
  });
}*/

//var spotifyApi = new SpotifyWebApi();
//spotifyApi.setAccessToken('b65d6c4d1f5f451288cbedee9cbf93e6');

function searchSpotify(ean){
  console.log('search');
  var fd = new FormData();
  var randomOffset = Math.floor(Math.random() * 100);
  //fd.append('ean', ean);
  //fd.append('offset', randomOffset);

  $.ajax({
        url: '/handlecode',
        type: 'post',
        data: {
                  ean: ean,
                  offset: randomOffset
                  
                },
        dataType: 'JSON',
        success: function(response){
            console.log(response.spotify);
            //console.log(response.tracks.items[0].id);
          
            var embedcode = '<iframe src="https://open.spotify.com/embed/track/'+response.spotify+'" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>'
            $('#embedder').html(embedcode);
            //if( response.trtacks.items[0].id )
            /*if(response.status == '1'){
                jQuery( '.campaign-form' ).hide();
                jQuery( '.thanks' ).show();
            }else{
                grecaptcha.reset();
                jQuery( ".button-submit-form" ).prop( "disabled", false );
                jQuery('.error-indicator').append('<p>Ett fel uppstod.</p><ul>' + errorstring + '</ul>');


                console.log(response);
            }*/
        },
    });
}


function decode(src) {
  console.log("lolo" + src);
  Quagga.decodeSingle(
    {
      inputStream: {
        size: 800,
        singleChannel: false
      },
      locator: {
        patchSize: "large",
        halfSample: false
      },
      decoder: {
        readers: [
          {
            format: "ean_reader",
            config: {}
          }
        ]
      },
      locate: true, 
      src: src 
    },
    function(result) {
      if (result.codeResult) {
        $("#coderes").text(result.codeResult.code);
        searchSpotify(result.codeResult.code);
      } else {
        console.log("not detected");
        $("#coderes").text("nope");
      }
    }
  );
}

$(function() {

  $(".button-wrapper input[type=file]").on("change", function(e) {
    if (e.target.files && e.target.files.length) {
        decode( URL.createObjectURL(e.target.files[0] ) );
    }
  });
});