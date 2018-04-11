export default function EventSummarizer() {
  const es = {};

  let startDate = 0,
    endDate = 0,
    counters = {};

  es.summarizeEvent = function(event) {
    if (event.kind === 'feature') {
      const counterKey = event.key + ':' + (event.variation || '') + (event.version || '');
      const counterVal = counters[counterKey];
      if (counterVal) {
        counterVal.count = counterVal.count + 1;
      } else {
        counters[counterKey] = {
          count: 1,
          key: event.key,
          version: event.version,
          value: event.value,
          default: event.default,
        };
      }
      if (startDate === 0 || event.creationDate < startDate) {
        startDate = event.creationDate;
      }
      if (event.creationDate > endDate) {
        endDate = event.creationDate;
      }
    }
  };

  es.getSummary = function() {
    const flagsOut = {};
    let empty = true;
    for (let i in counters) {
      const c = counters[i];
      let flag = flagsOut[c.key];
      if (!flag) {
        flag = {
          default: c.default,
          counters: [],
        };
        flagsOut[c.key] = flag;
      }
      const counterOut = {
        value: c.value,
        count: c.count,
      };
      if (c.version) {
        counterOut.version = c.version;
      } else {
        counterOut.unknown = true;
      }
      flag.counters.push(counterOut);
      empty = false;
    }
    return empty ? null : {
      startDate: startDate,
      endDate: endDate,
      features: flagsOut,
    };
  };

  es.clearSummary = function() {
    startDate = 0;
    endDate = 0;
    counters = {};
  };

  return es;
}
