// The electron module is imported with require() rather than an ES6 import, because
// otherwise Rollup tries to inspect its exports and gets confused (since the code in
// node_modules/electron/index.js is not what is actually used at runtime).
const electron = require('electron');
const EventEmitter = require('events');

const stateTrackers = {};

const ipcEventInitClient = 'ld-init';
const ipcEventUpdateFlagsOrUser = 'ld-update';
const ipcEventAnalyticsEvent = 'ld-event';

function eventName(name, env) {
  return name + ':' + (env || '*');
}

export function createMainProcessClientStateTracker(env, user) {
  const state = {
    environment: env,
    user: user,
  };

  const t = new EventEmitter();
  t.state = state;

  function broadcastEventToRenderers(name, data) {
    ((electron.webContents && electron.webContents.getAllWebContents()) || []).forEach(wc => {
      wc.send(name, data);
    });
  }

  function listenForEventFromRenderers(name, listener) {
    electron.ipcMain && electron.ipcMain.on(name, listener);
  }

  t.initialized = flags => {
    state.flags = flags;
    broadcastEventToRenderers(eventName(ipcEventInitClient), state);
    broadcastEventToRenderers(eventName(ipcEventInitClient, env), state);
  };

  t.updatedFlags = flags => {
    state.flags = flags;
    broadcastEventToRenderers(eventName(ipcEventUpdateFlagsOrUser, env), { flags: state.flags });
  };

  t.changedUser = user => {
    state.user = user;
    broadcastEventToRenderers(eventName(ipcEventUpdateFlagsOrUser, env), { user: state.user });
  };

  listenForEventFromRenderers(eventName(ipcEventAnalyticsEvent, env), (event, eventData) => {
    t.emit('event', eventData);
  });

  stateTrackers[env] = t;
  return t;
}

export function getMainProcessClientStateTracker(env) {
  if (env) {
    return stateTrackers[env];
  }
  // If environment wasn't specified, and there's only one, return that
  if (Object.keys(stateTrackers).length === 1) {
    return stateTrackers[Object.keys(stateTrackers)[0]];
  }
  return null;
}

export function createStateProviderForRendererClient(initialEnv) {
  const sp = new EventEmitter();

  let initialState = electron.remote.require('ldclient-electron').getInternalClientState(initialEnv);
  let currentEnv = (initialState && initialState.environment) || initialEnv;

  sp.getInitialState = () => initialState;

  sp.enqueueEvent = eventData => {
    electron.ipcRenderer.send(eventName(ipcEventAnalyticsEvent, currentEnv), eventData);
    return true;
  };

  const fireInit = state => sp.emit('init', state);
  const fireUpdate = state => sp.emit('update', state);

  function listenForUpdates() {
    electron.ipcRenderer.on(eventName(ipcEventUpdateFlagsOrUser, currentEnv), (event, state) => fireUpdate(state));
  }

  if (currentEnv) {
    electron.ipcRenderer.once(eventName(ipcEventInitClient, currentEnv), (event, state) => fireInit(state));
    listenForUpdates();
  } else {
    electron.ipcRenderer.once(eventName(ipcEventInitClient), (event, state) => {
      initialState = state;
      currentEnv = state.environment;
      listenForUpdates();
      fireInit(state);
    });
  }

  return sp;
}
