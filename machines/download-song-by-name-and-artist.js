module.exports = {


  friendlyName: 'Download song by name and artist',


  description: 'Download a song, and save it into a folder, by name and artist',


  extendedDescription: '',


  inputs: {

    name: {
      example: 'Bohemian Rhapsody',
      description: 'Song name, not case sensitive',
      required: true
    },

    artist: {
      example: 'Queen',
      description: 'Artist name, not case sensitive',
      required: true
    },

    path: {
      example: '/www/music/userId/coolFolder',
      description: 'ABSOLUTE Path to the folder where the song will be saved, if the folder doesn\'t exist it will be created',
      required: true
    }

  },


  defaultExit: 'success',


  exits: {

    error: {
      description: 'Unexpected error occurred.',
    },

    notFound: {
      description: 'Song not found, try with another name/artist'
    },

    downloadLimitExceded: {
      description: 'It looks like we are banned by Grooveshark, please try again in a few hours'
    },

    success: {
      description: 'Downloaded, the file url',
      example: '/www/music/userId/coolFolder/Bohemian Rhapsody.mp3'
    }

  },


  fn: function (inputs, exits) {

    var GS = require('grooveshark-downloader');
    var async = require('async');
    var fs = require('fs');
    var request = require('request');

    GS.Tinysong.getSongInfo(inputs.name, inputs.artist, function(err, info) {
      if(err) return exits.error(err);

      if(!info) return exits.notFound();

      GS.Grooveshark.getStreamingUrl(info.SongID, function(err, streamUrl) {
        if(err){
          if(err === 'banned') return exits.downloadLimitExceded();
          return exits.error(err);
        }

        if(!fs.existsSync(inputs.path)){
          var mkdirp = require('mkdirp');
          mkdirp.sync(inputs.path);
        }

        var songPath = inputs.path + '/' + info.SongName + '.mp3';

        request
          .get(streamUrl)
           .on('error', function(err){
             return exits.error(err);
           })
           .on('end', function(){
             return exits.success(songPath);
           })
           .pipe(fs.createWriteStream(songPath));
      });
    });

  },



};
