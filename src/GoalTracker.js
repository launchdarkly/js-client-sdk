import escapeStringRegexp from 'escape-string-regexp';

function doesUrlMatch(matcher, href, search, hash) {
  var canonicalUrl = href.replace(search, '').replace(hash, '');
  var regex;
  var testUrl;

  switch (matcher.kind) {
    case 'exact':
      testUrl = href;
      regex = new RegExp('^' + escapeStringRegexp(matcher.url) + '/?$');
      break;
    case 'canonical':
      testUrl = canonicalUrl;
      regex = new RegExp('^' + escapeStringRegexp(matcher.url) + '/?$');
      break;
    case 'substring':
      testUrl = canonicalUrl;
      regex = new RegExp('.*' + escapeStringRegexp(matcher.substring) + '.*$');
      break;
    case 'regex':
      testUrl = canonicalUrl;
      regex = new RegExp(matcher.pattern);
      break;
    default:
      return false;
  }
  return regex.test(testUrl);
}

function findGoalsForClick(event, clickGoals) {
  var matches = [];

  for (var i = 0; i < clickGoals.length; i++) {
    var target = event.target;
    var goal = clickGoals[i];
    var selector = goal.selector;
    var elements = document.querySelectorAll(selector);
    while (target && elements.length > 0) {
      for (var j = 0; j < elements.length; j++) {
        if (target === elements[j]) matches.push(goal);
      }
      target = target.parentNode;
    }
  }

  return matches;
}

export default function GoalTracker(goals, onEvent) {
  var tracker = {};
  var listenerFn = null;

  var clickGoals = [];

  for (var i = 0; i < goals.length; i++) {
    var goal = goals[i];
    var urls = goal.urls || [];

    for (var j = 0; j < urls.length; j++) {
      if (doesUrlMatch(urls[j], location.href, location.search, location.hash)) {
        if (goal.kind === 'pageview') {
          onEvent('pageview', goal);
        } else {
          clickGoals.push(goal);
          onEvent('click_pageview', goal);
        }
        break;
      }
    }
  }

  if (clickGoals.length > 0) {
    listenerFn = function(event) {
      var goals = findGoalsForClick(event, clickGoals);
      for (var i = 0; i < goals.length; i++) {
        onEvent('click', goals[i]);
      }
    };

    document.addEventListener('click', listenerFn);
  }

  tracker.dispose = function() {
    document.removeEventListener('click', listenerFn);
  };

  return tracker;
}
