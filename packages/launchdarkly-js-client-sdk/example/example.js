
// Note that this example does not use a module loader; instead it assumes that the page has loaded the
// default web distribution of ldclient.js (or ldclient.min.js), which sets the global variable "LDClient".

$(function() {
  var defaultEnvId = '5cc8a87be4b564081fd2fd70';
  var $flagsContainer = $('#flagsContainer');
  var $logContainer = $('#logPanel');

  var client;
  var clientConfig;
  var flagsShown = false;
  var usingLocalBuild = true;

  // These functions are for redirecting log output from the SDK so we can see it on the page for debugging.

  function writeLogLine(message) {
    if ($logContainer.html() != '') {
      message = "\n" + message;
    }
    $logContainer.append(message);
    var height = $logContainer[0].scrollHeight;
    $logContainer.scrollTop(height);
  }

  function logWriter(level) {
    return function(message) {
      if (level === 'error') {
        message = '<span class="error">' + message + '</span>';
      }
      writeLogLine('[' + level.toUpperCase() + '] ' + message);
    }
  }

  var logger = {
    debug: logWriter('debug'),
    info: logWriter('info'),
    warn: logWriter('warn'),
    error: logWriter('error')
  };

  // Here we build a user object from the form fields.

  function makeUserObject() {
    var user = {};
    var fields = [ 'key', 'email', 'name', 'firstName', 'lastName', 'avatar', 'ip', 'country' ];
    for (var i in fields) {
      var val = $('#' + fields[i] + 'Field').val();
      if (val) {
        user[fields[i]] = val;
      }
    }

    $customNames = $('#customFieldsContainer .customFieldName');
    $customValues = $('#customFieldsContainer .customFieldValue');
    for (var c in $customNames) {
      if (c < $customValues.length) {
        var name = $($customNames[c]).val();
        var value = $($customValues[c]).val();
        if (name) {
          user.custom = user.custom || {};
          user.custom[name] = getJsonValue(value);
        }
      }
    }

    if ($('#userAnonymousCheck').prop('checked')) {
      user.anonymous = true;
    }
    return user;
  }

  function getJsonValue(s) {
    if (s === '' || s === null || s === undefined) {
      return null;
    }
    if (/^\d+$/.test(s)) {
      return parseInt(s, 10);
    }
    if (/^\d+\.\d+$/.test(s)) {
      return parseFloat(s);
    }
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        return JSON.parse(s);
      } catch (e) {}
    }
    return s;
  }

  // Here we initialize the LaunchDarkly client connection.

  function reconnect() {
    if (client) {
      client.close();
    }

    var envId = $('#envIdField').val() || defaultEnvId;
    var streaming = $('#streamingCheck').prop('checked');
    clientConfig = {
      streaming: streaming,
      evaluationReasons: $('#reasonsCheck').prop('checked'),
      useReport: $('#useReportCheck').prop('checked'),
      logger: logger
    };
    var user = makeUserObject();

    showFlagsPlaceholder('<h5>initializing client, please wait</h5>');
    flagsShown = false;

    client = LDClient.initialize(envId, user, clientConfig);
    client.on('change', function(allChanges) {
      showAllFlags(allChanges);
    });
    client.waitForInitialization().then(function() { showAllFlags(); });
  }

  function identifyUser() {
    showFlagsPlaceholder('<h5>updating user, please wait</h5>');
    flagsShown = false;
    client.identify(makeUserObject()).then(function() {
      // When identify() calls our callback, it means the flag values for the new user are now available.
      // In this demo, we're also using a change listener, which may have already been called; if so, it has
      // already redrawn the flag values, with highlighting for the changed ones, so we'll skip drawing again.
      if (!flagsShown) {
        showAllFlags();
      }
    });
  }

  function showFlagsPlaceholder(messageHtml) {
    $flagsContainer.html(messageHtml);
  }

  // This renders our flag values in a nice table. In a real application, you would be more likely to use
  // client.variation() to get individual values by flag key, but here we are iterating through them all.

  function showAllFlags(changes) {
    var userJson = JSON.stringify(client.getUser(), null, ' ');
    var allFlags = client.allFlags();
    var keys = Object.keys(allFlags).sort();

    $content = $('<div></div>');
    $content.append('These are the feature flag values from the current environment for the user:');
    $content.append($('<code></code>').text(' ' + userJson)).append('<br><br>');

    var $table = $('<table></table>').addClass('table').addClass('table-sm');
    var $thead = $('<thead></thead>');
    var $thr = $('<tr></tr>');
    $thr.append('<th>Flag key</th><th>Flag value</th>');
    if (clientConfig.evaluationReasons) {
      $thr.append('<th>Reason</th>');
    }
    $thead.append($thr);
    $table.append($thead);

    var $tbody = $('<tbody></tbody>');
    for (var i in keys) {
      var key = keys[i];
      var $tbr = $('<tr></tr>');
      if (changes && (changes[key] !== undefined)) {
        $tbr.addClass('table-warning');
      }
      $tbr.append($('<td></td>').text(key));
      $tbr.append($('<td></td>').text(allFlags[key]));
      if (clientConfig.evaluationReasons) {
        // allFlags() does not include evaluation reasons, so we'll call variationDetail() to get them.
        var detail = client.variationDetail(key);
        var reasonJson = JSON.stringify(detail.reason, null, ' ');
        $tbr.append($('<td></td>').append($('<code></code>').text(reasonJson)));
      }
      $tbody.append($tbr);
    }
    $table.append($tbody);

    $content.append($table);

    $flagsContainer.empty().append($content);

    flagsShown = true;
  }

  $('#reconnectButton').on('click', function(e) {
    e.preventDefault();
    reconnect();
  });

  $('#identifyButton').on('click', function(e) {
    e.preventDefault();
    identifyUser();
  });

  $('#pushUrlButton').on('click', function(e) {
    e.preventDefault();
    var url = $('#urlField').val();
    if (url) {
      history.pushState(null, null, url);
    }
  });

  $('#pushRandomUrlButton').on('click', function(e) {
    e.preventDefault();
    history.pushState(null, null, new Date().getTime().toString());
  });

  $('#pushRandomHashButton').on('click', function(e) {
    e.preventDefault();
    location.hash = new Date().getTime().toString();
  });

  $('#backButton').on('click', function(e) {
    e.preventDefault();
    window.history.back();
  });

  $('#customEventButton').on('click', function(e) {
    e.preventDefault();
    var eventName = $('#eventNameField').val();
    var eventData = $('#eventDataField').val();
    if (eventName) {
      $('#eventNameField').removeClass('is-invalid');
      client.track(eventName, getJsonValue(eventData));
    } else {
      $('#eventNameField').addClass('is-invalid');
    }
  });

  $('a.special').on('click', function(e) { e.preventDefault(); }); // these have no purpose except for click goals

  $('#addCustomFieldButton').on('click', function(e) {
    e.preventDefault();
    var $row = $('#customFieldTemplate').find('form').clone();
    $('#customFieldsContainer').append($row);
  });

  $('#customFieldsContainer').on('click', '.removeCustomFieldButton', function(e) {
    e.preventDefault();
    $(e.target).closest('form').remove();
  });

  // For this demo, we can use either a local build of the SDK (which is what index.html references), or the current
  // release from app.launchdarkly.com. If we detect that the former is not available, we'll switch to the latter. This
  // is to make the page useful for both users and SDK developers. A real application would just use one or the other.

  function startDemo() {
    $('#sdkVersion').text(LDClient.version);
    reconnect();
  }

  if (window.LDClient) { // we successfully loaded the script from a local copy
    $('#usingWhichScript').addClass('local');
    startDemo();
  } else {
    var hostedScriptUrl = 'https://app.launchdarkly.com/snippet/ldclient.min.js';
    var script = document.createElement('script');
    script.src = hostedScriptUrl;
    script.crossOrigin = true;
    script.onload = function() {
      $('#usingWhichScript').addClass('hosted');
      startDemo();
    };
    document.head.append(script);
  }
});
