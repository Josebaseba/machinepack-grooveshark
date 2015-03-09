module.exports = {


  friendlyName: 'Download songs by playlist id',


  description: 'Download all the song, and save it into a folder, by playlist ID',


  extendedDescription: 'DANGER: This method goes really fast downloading song,' +
                       ' but you can be banned by Grooveshark for few hours,' +
                       ' for a safer, but slower method, please use downloadPlaylistSafe.',


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
              .on('end', function downloadCompleted() {
                next();
              })
              .on('error', function errorDownloading(err) {
                next(err);
              }).pipe(fs.createWriteStream(fileUrl));

           });

        }, function playlistDownloaded (err) {
          if(err) return exits.error(err);
          return exits.success();
        }
      );

    });

  }

};
