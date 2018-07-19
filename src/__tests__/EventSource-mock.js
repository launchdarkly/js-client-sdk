import EventEmitter from 'events';

export let sources = {};

export default function EventSource(url) {
  sources[url] = this;
  this.__emitter = new EventEmitter();

  this.onerror = undefined;
  this.onopen = undefined;
  this.onmessage = undefined;
  this.readyState = EventSource.CONNECTING;

  this.addEventListener = addEventListener;
  this.removeEventListener = removeEventListener;
  this.close = close;

  this.mockError = mockError;
  this.mockOpen = mockOpen;
  this.mockMessage = mockMessage;

  function addEventListener(eventName, callback) {
    this.__emitter.on(eventName, callback);
  }

  function removeEventListener(eventName, callback) {
    this.__emitter.off(eventName, callback);
  }

  function close() {
    this.readyState = EventSource.CLOSED;
  }

  function mockError(error) {
    this.onerror && this.onerror(error);
  }

  function mockOpen() {
    this.readyState = EventSource.OPEN;
    this.onopen && this.onopen(error);
  }

  function mockMessage(message) {
    this.onmessage && this.onmessage(message);
  }
}

EventSource.CONNECTING = 0;
EventSource.OPEN = 1;
EventSource.CLOSED = 2;
