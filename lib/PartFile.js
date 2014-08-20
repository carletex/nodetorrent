var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Bencoding = require("./Bencoding.js");
var Bitfield = require('bitfield');
var peerface = require('peerface');
var RSVP = require('rsvp')

var PartFile = module.exports = function PartFile(torrent, blockSize) {

  this._pieceLength = torrent.info['piece length'];
  this._length = torrent.info.length;
  
  this._torrent = torrent;

  this._numPieces = Math.ceil(this._length / this._pieceLength);
  this._numBlocks = Math.ceil(this._pieceLength / blockSize);

  this._blockSize = blockSize;

  this._pieces = [];
  
  var checksums = [];

  for(var cursor = 0; cursor < torrent.info.pieces.length; cursor += 20){
    var tempBuffer = new Buffer(20);
    tempBuffer.fill(0);
    var hash = torrent.info.pieces.slice(cursor, cursor+20);
    hash.copy(tempBuffer);
    checksums.push(hash);
  }
  console.log('pieces', checksums.length, this._numPieces);
  console.log('hashes', checksums);
  
  for (var i = 0; i < checksums.length; i++) {
    this._pieces.push({
      data: (function() {
        var temp = new Buffer(this._pieceLength);
        temp.fill(0);
        return temp;
      }.bind(this))(),
      bitfield: new Bitfield(this._numBlocks),
      sha1sum: checksums[i],
      isComplete: false
    });
  };
    console.log('pieces', this._pieces.length);
  var requestedOverflow = (this._numPieces * this._pieceLength) - this._length;
  var diff = this._pieceLength - requestedOverflow;
  var last = this._pieces[this._pieces.length-1];
  for (var blockNum = Math.floor((this._blockSize * diff)/this._pieceLength); blockNum < this._blockSize; blockNum++){
    last.bitfield.set(blockNum, true);
    // adjust the size of the last buffer
    last.data = new Buffer(diff);
    // fill it with 0
    last.data.fill(0);
  }
  console.log(last.bitfield.buffer, Math.floor(diff/this._pieceLength));
};

function printBitfield(bitfield) {
  var ret = [];
  for(var i = 0; i < bitfield.buffer.length * 8;i++){
    ret.push(bitfield.get(i) ? 1 : 0);
  }
  return ret.join('')
}

PartFile.prototype.writeData = function (pieceIndex, offset, data) {
  var container = this._pieces[pieceIndex];
  data.copy(container.data, offset);

  var blockNumber = offset / this._blockSize;
  container.bitfield.set(blockNumber);

  container.isComplete = this.isPieceComplete(pieceIndex);
  this.writeFile(__dirname);
}

PartFile.prototype.writeFile = function (dir) {
  if (!this.isFileComplete())
    return;
  var data = [];
  for (var i = 0; i < this._pieces.length; i++) {
    data.push(this._pieces[i].data);
  };
  console.log('Writing file in', path.join(dir, this._torrent.info.name.toString()));
  fs.writeFileSync(path.join(dir, this._torrent.info.name.toString()), Buffer.concat(data), {encoding: null});
  console.log('File written');
}

PartFile.prototype.isPieceComplete = function (pieceIndex) {

  var container = this._pieces[pieceIndex];
  for (var i = 0; i < this._numBlocks; i++) {
    if (!container.bitfield.get(i))
      return false;
  };
  var shasum = crypto.createHash('sha1');
  var checksum = shasum.update(container.data).digest('hex');
  var isSame = checksum == container.sha1sum.toString('hex');
  console.log(pieceIndex, 'piece checksum', checksum, container.sha1sum.toString('hex'), isSame)
  return isSame;
};

PartFile.prototype.isFileComplete = function () {
  for (var i = 0; i < this._pieces.length; i++) {
    if (!this._pieces[i].isComplete)
      return false;
  };
  return true;
}

var decoder = new Bencoding();
var filename = process.argv[2];
console.log(filename);

try {
  var fileContent = fs.readFileSync(filename);
}
catch(err) {
  console.log('Something went wrong: ' + err);
  return;
}

var torrentData = decoder.decode(fileContent);

var partFile = new PartFile(torrentData, 512);
peerface.connect('96.126.104.219', 59961).then(function(peer){
  var shasum = crypto.createHash('sha1');
  peer.handshake('0123456789', shasum.update(torrentData.info._encodedict).digest('base64'));
  peer.interested();
  
  peer.on('close', function(hadError){
    console.log('peer closed', hadError ? "had error" : "normal");
  });

  var callbacks = [];
  var has = [];
  peer.on('have', function(msg) {
    console.log('have', JSON.stringify(msg));
    has.push(msg.pieceIndex);
  });
  
  peer.on('piece', function (msg){
    partFile.writeData(msg.index, msg.begin, msg.block);
  });
  peer.on('unchoke', function () {
    var lengthRequested = 0;
    for (var index = 0; index < partFile._numPieces; index++) {
      callbacks.push([]);
      for (var begin = 0; begin < partFile._pieceLength; begin += partFile._blockSize) {
        if (lengthRequested + partFile._blockSize > partFile._length){
          callbacks[index].push((function(index, begin, length){
            return function() {
              console.log('sending last', begin)
              peer.request(index, begin, length);
            };
          })(index,begin, partFile._length - lengthRequested));
          break;
        } else{
          callbacks[index].push((function(index, begin, length){
            return function() {
              // console.log('sending', index, begin)
              peer.request(index, begin, length);
            };
          })(index, begin, partFile._blockSize));
        }
        lengthRequested += partFile._blockSize;
      };
    };
    
    console.log(callbacks.length)
    
    // use set interval to send msg ever 1/2 a sec
    setInterval(function() {
      //peer.keepAlive();
      if (has.length === 0) {
        var q = callbacks.pop();
        while(q && q.length > 0) {
          var c = q.shift();
          c.call();
        }
        return;
      }
      var queue = callbacks[has.pop()];
      while (queue && queue.length > 0) {
        var callback = queue.shift();
        callback.call();
      }
    }, 500);
  });
});
  


