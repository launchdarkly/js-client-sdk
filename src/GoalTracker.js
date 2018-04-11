import escapeStringRegexp from 'escape-string-regexp';

function doesUrlMatch(matcher, href, search, hash) {
  const canonicalUrl = href.replace(search, '').replace(hash, '');
  let regex;
  let testUrl;

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
  const matches = [];

  for (let i = 0; i < clickGoals.length; i++) {
    let target = event.target;
    const goal = clickGoals[i];
    const selector = goal.selector;
    const elements = document.querySelectorAll(selector);
    while (target && elements.length > 0) {
      for (let j = 0; j < elements.length; j++) {
        if (target === elements[j]) {
          matches.push(goal);
        }
      }
      target = target.parentNode;
    }
  }

  return matches;
}

export default function GoalTracker(goals, onEvent) {
  const tracker = {};
  let listenerFn = null;

  const clickGoals = [];

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];
    const urls = goal.urls || [];

    for (let j = 0; j < urls.length; j++) {
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
      const goals = findGoalsForClick(event, clickGoals);
      for (let i = 0; i < goals.length; i++) {
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
