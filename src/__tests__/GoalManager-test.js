import GoalManager from '../GoalManager';
import browserPlatform from '../browserPlatform';

describe('GoalManager', () => {
  function makeClientVars(goals, enqueueEvent) {
    return {
      getEnvironmentId: () => 'env-id',
      ident: { getContext: () => ({ key: 'user' }) },
      enqueueEvent,
      requestor: { fetchJSON: () => Promise.resolve(goals) },
    };
  }

  function makeGoals() {
    return [
      {
        key: 'pageview-goal',
        kind: 'pageview',
        urls: [{ kind: 'substring', substring: 'mydomain' }],
      },
      {
        key: 'click-goal',
        kind: 'click',
        selector: '.does-not-match-anything',
        urls: [{ kind: 'substring', substring: 'mydomain' }],
      },
    ];
  }

  it('applies eventUrlTransformer to synthesized pageview and click_pageview events', async () => {
    const suffix = '/transformed';
    const platform = browserPlatform({ eventUrlTransformer: (url) => url + suffix });
    const enqueued = [];
    const clientVars = makeClientVars(makeGoals(), (e) => enqueued.push(e));

    await new Promise((resolve) => {
      GoalManager(clientVars, platform, resolve);
    });

    const pageview = enqueued.find((e) => e.kind === 'pageview');
    const clickPageview = enqueued.find((e) => e.kind === 'click_pageview');

    expect(pageview).toBeDefined();
    expect(pageview.url).toEqual(window.location.href + suffix);
    expect(clickPageview).toBeDefined();
    expect(clickPageview.url).toEqual(window.location.href + suffix);
  });

  it('leaves the URL untransformed when no eventUrlTransformer is configured', async () => {
    const platform = browserPlatform({});
    const enqueued = [];
    const clientVars = makeClientVars(makeGoals(), (e) => enqueued.push(e));

    await new Promise((resolve) => {
      GoalManager(clientVars, platform, resolve);
    });

    const pageview = enqueued.find((e) => e.kind === 'pageview');
    expect(pageview).toBeDefined();
    expect(pageview.url).toEqual(window.location.href);
  });
});
