function Stream(url, environment) {
  var stream = {};
  var url = url + '/ping/' + environment;
  var es = null;
  
  stream.connect = function(onPing) {
    es = new EventSource(url);
    es.addEventListener('ping', onPing);
  }

  stream.disconnect = function() {
    es.close();
  }
  
  stream.isConnected = function() {
    return es && (es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING);
  }
  
  return stream;
}

module.exports = Stream;
