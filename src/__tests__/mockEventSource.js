
var mockEventSource = function() {
  var mes = {
    connectedUrl: null,
    listeners: {}
  };
  mes.new = function(url) {
    mes.connectedUrl = url;
    var es = {};
    es.addEventListener = function(key, handler) {
      mes.listeners[key] = handler;
    };
    es.close = function() {
      es.readyState = EventSource.CLOSED;
    }
    es.readyState = EventSource.OPEN;
    return es;
  };
  return mes;
}();

module.exports = mockEventSource;
