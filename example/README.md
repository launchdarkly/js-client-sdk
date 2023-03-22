# SDK Browser Demo Page

This is a simple front-end-only JavaScript application that exercises much of the functionality of the LaunchDarkly SDK for browser JavaScript. It is not meant to be an example of how to write a LaunchDarkly application, since most of its logic is devoted to implementing a testing UI that a real application would not have. Instead, it is meant to show the SDK in action and to verify that feature flags work as expected in a given environment.

For a more realistic example of a LaunchDarkly-enabled application with both a front end and a back end, see [`hello-bootstrap`](https://github.com/launchdarkly/hello-bootstrap).

## Running the demo

Most of the demo can be used without a real HTTP server; just start your browser and tell it to open the `index.html` file in this directory. The only thing that will not work in that mode is the "Set URL" feature under Navigation/Events.

To access the demo via a basic HTTP server, there are several ways but the simplest-- if you have Python-- is to run `python3 -m http.server 8000` or `python2 -m SimpleHTTPServer 8000` from a command line at the SDK root directory, and then browse to this location.

Note that by default, the demo uses the latest release of the JS SDK script that is hosted on `app.launchdarkly.com`. However, if it detects that you have built the SDK locally, it will use the local SDK code instead. Therefore, it can be used for testing changes to the SDK. To build from the SDK root directory, run `npm run build`.

## Selecting an environment

By default, the demo uses a simple environment that LaunchDarkly has created for this purpose, containing a few feature flags as follows-- two that do not change, and two that change in response to a user property:

* `client-side-flag-1-always-true`: Always returns the boolean value `true`.
* `client-side-flag-2-always-green`: Always returns the string value `"green"`.
* `client-side-flag-3-does-name-start-with-b`: Returns `true` if the user's `name` property starts with the letter B, otherwise `false`.
* `client-side-flag-4-has-valid-email`: Returns `true` if the user's `email` property matches a simple regex for validating emails, otherwise `false`.

You can instead use your own environment, by copying the environment ID from [your dashboard](https://app.launchdarkly.com/settings/projects) into the Environment ID field and clicking "Update Configuration, Reconnect". You should now see all feature flags from your environment that have the "Make this flag available to client-side SDKs" option checked. If you also clicked the "Live updates (streaming)" box, you should also see any changes you make to your flags reflected on the page in real time.
