(function(w) {
  var dbex;

  var SESSION_COOKIE_NAME = '_dbexs';
  var USER_COOKIE_NAME = '_dbexu';
  var EXPERIMENT_DATA_RECIEVED_COOKIE_NAME = '_dbexdr';
  var SESSION_COOKIE_EXPIRATION = 3600; // seconds
  var USER_COOKIE_EXPIRATION = 48211200; // seconds
  var API_URL = '//dockerhost:3000';

  var _isInitialized = false;
  var _experiments = [];
  var _experimentsIndex = {};
  var _callbackQ = [];

  function setCookie(name, value, seconds) {
    var expires;
    if (seconds) {
      var date = new Date();
      date.setTime((date).getTime() + (seconds * 1000));
      expires = '; expires=' + date.toGMTString();
    } else {
      expires = '';
    }
    document.cookie = name + '=' + value + expires + '; path=/';
  }

  function getCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function removeCookie(name) {
    setCookie(name, '', -1);
  }

  function isSupported() {
    if (!JSON.stringify || !JSON.parse) {
      return false;
    }

    if (/(MSIE\ [0-8]\.\d+)/.test(navigator.userAgent)) {
        return false;
    }

    // check if in Safari private mode
    try {
        localStorage.test = 1;
    } catch (e) {
        return false;
    }

    return true;
  }

  function chooseVariation(variations) {
    var i;
    var cumulativeWeights = 0;
    var randomSpin = Math.random();

    for (i = 0; i < variations.length; i++) {
      cumulativeWeights += variations[i].weight;
      if (randomSpin < cumulativeWeights) {
        return i;
      }
    }

    return -1;
  }

  function getCookieName(scope) {
    if (scope !== 'session') {
      return USER_COOKIE_NAME;
    }
    return SESSION_COOKIE_NAME;
  }

  function getCookieExpiration(scope) {
    if (scope !== 'session') {
      return USER_COOKIE_EXPIRATION;
    }
    return SESSION_COOKIE_EXPIRATION;
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
        dbex[method].apply();
      }
    }
  }

  function getExperiment(experimentId) {
    return _experimentsIndex[experimentId];
  }

  function getChosenVariation(experimentId, scope) {
    var i;
    var cookieName = getCookieName(scope);
    var cookieValue;
    var experimentParts;
    var parts;

    cookieValue = getCookie(cookieName); // cookie: expId:variation|expiId:variation
    if (cookieValue) {
      experimentParts = cookieValue.split('|');
      for (i = 0; i < experimentParts.length; i++) {
        parts = experimentParts[i].split(':');
        if (parts[0] === experimentId) {
          return parseInt(parts[1]);
        }
      }
    }
    return -1;
  }

  function saveChosenVariation(experimentId, variation, scope) {
    var cookieName = getCookieName(scope);
    var cookieExpiration = getCookieExpiration(scope);
    var cookieValue = getCookie(cookieName); // cookie: expId:variation|expiId:variation
    var newPart = [experimentId, variation].join(':');
    if (cookieValue) {
      [cookieValue, newPart].join('|');
    } else {
      cookieValue = newPart;
    }
    setCookie(cookieName, cookieValue, cookieExpiration);
  }

  function actualizeCookies() {
    var i;
    var j;
    var scopes = ['user', 'session'];
    var scope;
    var cookieName;
    var cookieValue;
    var cookieExpiration;
    var experimentParts;
    var actualizedExperimentParts = [];
    var parts;
    var experimentId;

    for (i = 0; i < scopes.length; i++) {
      scope = scopes[i];
      cookieName = getCookieName(scope);
      cookieExpiration = getCookieExpiration(scope);
      cookieValue = getCookie(cookieName);
      if (cookieValue) {
        experimentParts = cookieValue.split('|');
        for (i = 0; i < experimentParts.length; i++) {
          parts = experimentParts[i].split(':');
          experimentId = parts[0];
          if (_experimentsIndex[experimentId]) {
            actualizedExperimentParts.push(experimentParts[i]);
          }
        }
        cookieVal = actualizedExperimentParts.join('|');
        setCookie(cookieName, cookieValue, cookieExpiration);
      }
    }
    setCookie(EXPERIMENT_DATA_RECIEVED_COOKIE_NAME, 'x', SESSION_COOKIE_EXPIRATION);
  }

  function addPixel(pixelUrl) {
    (window.Image ? (new Image()) : window.document.createElement('img')).src = window.location.protocol + pixelUrl;
  }

  function trackSession(experimentId, variation) {
    var pixelUrl = API_URL + '/track?' + 't=s&exp=' + experimentId + '&var=' + variation;
    addPixel(pixelUrl);
  }

  function trackConversion(experimentId, variation, value) {
    var valueStr = (value) ? '&val=' + value : '';
    var pixelUrl = API_URL + '/track?' + 't=c&exp=' + experimentId + '&var=' + variation + valueStr;
    addPixel(pixelUrl);
  }

  function hasExperimentData() {
    var cookieVal = getCookie(EXPERIMENT_DATA_RECIEVED_COOKIE_NAME);
    if (cookieVal) {
      return true;
    }
    return false;
  }

  function init(experiments) {
    var i;

    if (_isInitialized) return;
    _isInitialized = true;

    _experiments = experiments;
    for (i = 0; i < experiments.length; i++) {
      _experimentsIndex[experiments[i].id] = experiments[i];
    }

    actualizeCookies();

    for (i = 0; i < _callbackQ.length; i++) {
      execCmd(_callbackQ[i]);
    }
  }

  function loadExperimentDataAndInit(userToken) {
    var a = document.createElement('script');
    a.type = 'text/javascript';
    a.async = true;
    a.src = API_URL + '/' + userToken + '/experiments.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(a, s);
  }

  function onExperimentDataLoaded(experiments) {
    localStorage.setItem('dbex::data', JSON.stringify(experiments));
    setCookie(EXPERIMENT_DATA_RECIEVED_COOKIE_NAME, 'x', SESSION_COOKIE_EXPIRATION);
    init(experiments)
  }

  function initFromLocalStorage() {
    var experiments = JSON.parse(localStorage.getItem('dbex::data') || []);
    init(experiments)
  }

  dbex = function() {
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

  dbex.onExperimentDataLoaded = onExperimentDataLoaded;

  dbex.chooseVariation = function(experimentId) {
    var experiment = getExperiment(experimentId);
    var variation;
    var scope;

    if (!experiment) return -1;
    scope = experiment.scope;

    variation = getChosenVariation(experimentId, scope);
    if (variation < 0) {
      variation = chooseVariation(experiment.variations);
      if (variation >= 0) {
        saveChosenVariation(experimentId, variation, scope);
        trackSession(experimentId, variation);
      }
    }

    return variation;
  };

  dbex.trackConversion = function(experimentId, value) {
    var experiment = getExperiment(experimentId);
    var variation;
    var scope;

    if (!experiment) return;
    scope = experiment.scope;

    variation = getChosenVariation(experimentId, scope);
    if (variation >= 0) {
      trackConversion(experimentId, variation, value);
    }
  };

  if (!isSupported()) {
    return;
  }

  w.dbex = dbex;
})(window);
