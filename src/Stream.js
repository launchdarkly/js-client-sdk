export default function Stream(url, environment) {
  var stream = {};
  var eventSourceUrl = url + '/ping/' + environment;
  var es = null;

  stream.connect = function(onPing) {
    if (typeof EventSource !== 'undefined') {
      es = new window.EventSource(eventSourceUrl);
      es.addEventListener('ping', onPing);
    }
  };

  stream.disconnect = function() {
    if (es) es.close();
  };

  stream.isConnected = function() {
    return es && (es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING);
  };

  return stream;
}
