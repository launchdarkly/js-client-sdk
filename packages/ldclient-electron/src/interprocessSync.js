// The electron module is imported with require() rather than an ES6 import, because
// otherwise Rollup tries to inspect its exports and gets confused (since the code in
// node_modules/electron/index.js is not what is actually used at runtime).
const electron = require('electron');
const EventEmitter = require('events');

const stateTrackers = {};

export function createMainProcessClientStateTracker(env, user) {
  const state = {
    environment: env,
    user: user,
  };

  const t = {
    state: state,
  };

  function broadcastEventToRenderers(eventName, data) {
    ((electron.webContents && electron.webContents.getAllWebContents()) || []).forEach(wc => {
      wc.send(eventName, data);
    });
  }

  t.initialized = flags => {
    state.flags = flags;
    broadcastEventToRenderers('ld-init', state);
    broadcastEventToRenderers('ld-init:' + env, state);
  };

  t.updatedFlags = flags => {
    state.flags = flags;
    broadcastEventToRenderers('ld-update:' + env, { flags: state.flags });
  };

  t.changedUser = user => {
    state.user = user;
    broadcastEventToRenderers('ld-update:' + env, { user: state.user });
  };

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
  const currentEnv = (initialState && initialState.environment) || initialEnv;

  sp.getInitialState = () => initialState;

  const fireInit = state => sp.emit('init', state);
  const fireUpdate = state => sp.emit('update', state);

  function listenForUpdates(env) {
    electron.ipcRenderer.on('ld-update:' + env, (event, state) => fireUpdate(state));
  }

  if (currentEnv) {
    electron.ipcRenderer.once('ld-init:' + currentEnv, (event, state) => fireInit(state));
    listenForUpdates(currentEnv);
  } else {
    electron.ipcRenderer.once('ld-init', (event, state) => {
      initialState = state;
      listenForUpdates(state.environment);
      fireInit(state);
    });
  }

  return sp;
}
