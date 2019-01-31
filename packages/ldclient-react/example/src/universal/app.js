import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { withLDProvider } from 'ldclient-react';
import Home from './home';

const App = () => (
  <div>
    <main>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route path="/home">
          <Redirect to="/" />
        </Route>
      </Switch>
    </main>
  </div>
);

// Set clientSideID to your own Client-side ID. You can find this in
// your ld portal under Account settings / Projects
export default withLDProvider({ clientSideID: '59b2b2596d1a250b1c78baa4' })(App);
