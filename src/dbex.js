(function dbexInit(w) {
  var dbex;

  var USER_COOKIE_NAME = '_dbexu';
  var LOCALSTORAGE_KEY = 'dbex::data';
  var EXPERIMENT_DATA_RECIEVED_COOKIE_NAME = '_dbexdr';
  var SESSION_COOKIE_EXPIRATION = 3600; // seconds
  var USER_COOKIE_EXPIRATION = 48211200; // seconds
  var API_URL = '//dbex-tracker.driveback.ru';

  var _isInitialized = false; // eslint-disable-line
  var _experiments = []; // eslint-disable-line
  var _experimentsIndex = {}; // eslint-disable-line
  var _callbackQ = []; // eslint-disable-line
  var _isSupported; // eslint-disable-line

  /**
  * [
  *  [experimentId, variation, isSessionTracked],
  *  [experimentId, variation, isSessionTracked],
  *  ...
  * ]
  * ...
  */
  var _variationsInfo = []; // eslint-disable-line
  var _variationsInfoIndex = {}; // eslint-disable-line

  function setCookie(name, value, seconds) {
    var expires;
    var date = new Date();
    if (seconds) {
      date.setTime((date).getTime() + (seconds * 1000));
      expires = '; expires=' + date.toGMTString();
    } else {
      expires = '';
    }
    document.cookie = name + '=' + value + expires + '; path=/';
  }

  function getCookie(name) {
    var nameEQ = name + '=';
    var i;
    var ca = document.cookie.split(';');
    var c;
    for (i = 0; i < ca.length; i += 1) {
      c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function actualizeCookies() {
    var i;
    var cookieParts = [];
    var cookieValue;

    for (i = 0; i < _variationsInfo.length; i += 1) {
      cookieParts.push(_variationsInfo[i].join(':'));
    }

    if (cookieParts.length > 0) {
      cookieValue = cookieParts.join('|');
      setCookie(USER_COOKIE_NAME, cookieValue, USER_COOKIE_EXPIRATION);
    }
  }

  function isSupported() {
    if (_isSupported !== undefined) {
      return _isSupported;
    }

    _isSupported = true;
    if (!JSON.stringify || !JSON.parse) {
      _isSupported = false;
    } else if (/(MSIE [0-8]\.\d+)/.test(navigator.userAgent)) {
      _isSupported = false;
    } else {
      // check if in Safari private mode
      try {
        localStorage.test = 1;
      } catch (e) {
        _isSupported = false;
      }
    }

    return _isSupported;
  }

  function chooseVariation(variations) {
    var i;
    var cumulativeWeights = 0;
    var randomSpin = Math.random();

    for (i = 0; i < variations.length; i += 1) {
      cumulativeWeights += variations[i];
      if (randomSpin < cumulativeWeights) {
        return i;
      }
    }

    return -1;
  }

  function execCmd(cmd) {
    var method;
    var args;
    if (typeof cmd === 'function') {
      cmd.apply(dbex);
    } else {
      method = cmd[0];
      args = Array.prototype.slice.call(cmd, 1);
      if (dbex[method]) {
        dbex[method].apply(dbex, args);
      }
    }
  }

  function getExperiment(experimentId) {
    return _experimentsIndex[experimentId];
  }

  function getChosenVariation(experimentId) {
    var index = _variationsInfoIndex[experimentId];

    if (index !== undefined) {
      return _variationsInfo[index][1];
    }

    return -1;
  }

  function saveChosenVariation(experimentId, variation) {
    var index = _variationsInfoIndex[experimentId];
    if (index === undefined) {
      _variationsInfoIndex[experimentId] = _variationsInfo.length;
      _variationsInfo.push([experimentId, variation, 0]); // expId, variation, sessionTracked
      actualizeCookies();
    } else if (_variationsInfo[index][1] !== variation) {
      _variationsInfo[index][1] = variation;
      _variationsInfo[index][2] = 0; // reset sessionTracked status if variation was changed
      actualizeCookies();
    }
  }

  function saveSessionTracked(experimentId) {
    var index = _variationsInfoIndex[experimentId];
    if (index !== undefined) {
      _variationsInfo[index][2] = 1; // set sessionTracked status to '1'
      actualizeCookies();
    }
  }

  function isSessionTracked(experimentId) {
    var index = _variationsInfoIndex[experimentId];
    if (index !== undefined) {
      if (_variationsInfo[index][2] === 1) {
        return true;
      }
    }

    return false;
  }

  function loadVariationsInfoFromCookies() {
    var j;
    var cookieValue;
    var experimentParts;
    var parts;
    var experimentId;

    cookieValue = getCookie(USER_COOKIE_NAME);
    if (cookieValue) {
      experimentParts = cookieValue.split('|');
      for (j = 0; j < experimentParts.length; j += 1) {
        parts = experimentParts[j].split(':');
        experimentId = parts[0];
        if (_experimentsIndex[experimentId]) {
          _variationsInfoIndex[experimentId] = _variationsInfo.length;
          _variationsInfo.push([parts[0], Number(parts[1]), Number(parts[2])]);
        }
      }
    }
  }

  function addPixel(pixelUrl) {
    (w.Image ? (new Image()) : w.document.createElement('img')).src = w.location.protocol + pixelUrl;
  }

  function trackSession(experimentId, variation) {
    var pixelUrl = API_URL + '/track?t=s&exp=' + experimentId + '&var=' + variation;
    addPixel(pixelUrl);
    saveSessionTracked(experimentId);
  }

  function trackConversion(experimentId, variation, value) {
    var valueStr = (value) ? '&val=' + value : '';
    var pixelUrl = API_URL + '/track?t=c&exp=' + experimentId + '&var=' + variation + valueStr;
    addPixel(pixelUrl);
  }

  function hasExperimentData() {
    var cookieVal = getCookie(EXPERIMENT_DATA_RECIEVED_COOKIE_NAME);
    if (cookieVal && localStorage.getItem(LOCALSTORAGE_KEY)) {
      return true;
    }
    return false;
  }

  function init(experiments) {
    var i;

    if (_isInitialized) return;

    _experiments = experiments;
    for (i = 0; i < experiments.length; i += 1) {
      _experimentsIndex[experiments[i][0]] = experiments[i];
    }

    loadVariationsInfoFromCookies();
    actualizeCookies();

    _isInitialized = true;

    for (i = 0; i < _callbackQ.length; i += 1) {
      execCmd(_callbackQ[i]);
    }
  }

  function loadExperimentDataAndInit(uuid) {
    var a = document.createElement('script');
    var s = document.getElementsByTagName('script')[0];
    a.type = 'text/javascript';
    a.async = true;
    a.src = API_URL + '/' + uuid + '/experiments.js';
    s.parentNode.insertBefore(a, s);
  }

  function onExperimentDataLoaded(experiments) {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(experiments));
    setCookie(EXPERIMENT_DATA_RECIEVED_COOKIE_NAME, 'x', SESSION_COOKIE_EXPIRATION);
    init(experiments);
  }

  function initFromLocalStorage() {
    var experiments = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || []);
    init(experiments);
  }

  dbex = function dbexConstructor() {
    var cmd = arguments;
    if (cmd.length === 0) return;

    if (cmd[0] === 'init') {
      if (!hasExperimentData()) {
        loadExperimentDataAndInit(cmd[1]);
      } else {
        initFromLocalStorage();
      }
      return;
    }

    if (cmd.length === 1 && typeof cmd[0] === 'function') {
      cmd = cmd[0];
    }

    if (!_isInitialized) {
      _callbackQ.push(cmd);
    } else {
      execCmd(cmd);
    }
  };

  dbex.onLoaded = onExperimentDataLoaded;

  dbex.chooseVariation = function dbexChooseVariation(experimentId) {
    var experiment = getExperiment(experimentId);
    var variation;

    if (!experiment) return -1;

    variation = getChosenVariation(experimentId);
    if (variation < 0) {
      variation = chooseVariation(experiment[1]);
      if (variation >= 0) {
        saveChosenVariation(experimentId, variation);
      }
    }

    return variation;
  };

  dbex.setVariation = function dbexSetVariation(experimentId, variation) {
    var experiment = getExperiment(experimentId);

    if (!experiment) return;

    if (variation >= 0) {
      saveChosenVariation(experimentId, variation);
    }
  };

  dbex.trackSession = function dbexTrackSession(experimentId) {
    var experiment = getExperiment(experimentId);
    var variation;
    var sessionTracked;

    if (!experiment) return;

    variation = getChosenVariation(experimentId);
    sessionTracked = isSessionTracked(experimentId);

    if (variation < 0) {
      variation = dbex.chooseVariation(experimentId);
    }

    if (!sessionTracked && variation >= 0) {
      trackSession(experimentId, variation);
    }
  };

  dbex.trackConversion = function dbexTrackConversion(experimentId, value) {
    var experiment = getExperiment(experimentId);
    var variation;
    var sessionTracked;

    if (!experiment) return;

    variation = getChosenVariation(experimentId);
    sessionTracked = isSessionTracked(experimentId);

    if (sessionTracked && variation >= 0) {
      trackConversion(experimentId, variation, value);
    }
  };

  if (isSupported()) {
    w.dbex = dbex;
  } else {
    w.dbex = function dbexFake() {};
  }
}(window));
