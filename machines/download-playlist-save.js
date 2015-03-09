module.exports = {


  friendlyName: 'Download songs by playlist id avoiding temporal Grooveshark blacklist',


  description: 'Download all the song, and save it into a folder, by playlist ID',


  extendedDescription: 'This method is MUCH slower that .downloadPlaylist() method' +
                       ' because it waits just downloaded song duration to go for the next one.' +
                       ' Why? Just to dont be banned from Grooveshark for some few hours!',


  inputs: {

    id: {
      example: '104314395',
      description: 'E.g: http://grooveshark.com/#!/playlist/Powerexplosive/104314395 the last number, 104314395, is the ID',
      required: true
    },

    path: {
      example: '/www/music/userId/coolFolder',
      description: ' ABSOLUTE Path to the folder where the songs will be saved, if the folder doesn\'t exist it will be created',
      required: true
    },

    overwrite: {
      example: false,
      description: 'Defaults false, if this is true if a song name is repeated it will overwrite the old song',
      required: false
    }

  },


  defaultExit: 'success',


  exits: {

    error: {
      description: 'Unexpected error occurred.',
    },

    notFound: {
      description: 'Playlist not found please check if the id is correct'
    },

    downloadLimitExceded: {
      description: 'It looks like we are banned by Grooveshark, please try again in a few hours'
    },

    success: {
      description: 'All the songs downloaded.',
    }

  },


  fn: function (inputs, exits) {

    var GS = require('grooveshark-downloader');

    if(!inputs.overwrite) inputs.overwrite = false;

    GS.Grooveshark.getPlaylistSongsList(inputs.id, function(err, res, body){
      if(err) return exits.error(err);

      var parsedBody = {};
      try{
        parsedBody = JSON.parse(body);
      }catch(e){
        return exits.error('Error parsing body: ', e);
      }

      if(parsedBody.result.PlaylistID === 0) return exits.notFound();

      var async = require('async');
      var fs = require('fs');

      if(!fs.existsSync(inputs.path)){
        var mkdirp = require('mkdirp');
        mkdirp.sync(inputs.path);
      }

      async.mapSeries(parsedBody.result.Songs,
        function downloadSong(song, next) {

          var request = require('request');

          var fileUrl = inputs.path + '/' + song.Name + '.mp3';

          if(fs.existsSync(fileUrl) && !inputs.overwrite) return next();

          GS.Grooveshark.getStreamingUrl(song.SongID, function(err, streamUrl) {
            if(err){
              if(err === 'banned') return exits.downloadLimitExceded();
              return next(err);
            }

            request
              .get(streamUrl)
              .on('error', function errorDownloading(err) {
                next(err);
              }).pipe(fs.createWriteStream(fileUrl));

              // Wait to simulate that you are listening the song :) AVOID BANNED!
              var wait = 3 * 60 * 1000;
              var estimateDuration = parseInt(song.EstimateDuration) * 1000;
              if(!isNaN(estimateDuration)) wait = estimateDuration;
              setTimeout(next, wait);

           });

        }, function playlistDownloaded (err) {
          if(err) return exits.error(err);
          return exits.success();
        }
      );

    });

  }

};
