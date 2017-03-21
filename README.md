# Driveback Experiments

Driveback Experiments API helps to run A/B/n tests on your website with simple API. You can use either directly on your website or through you tag management system.

## How to use

### 1. Add dbex.min.js in the head of your page

Note: dbex.min.js file can be found [here](https://github.com/driveback/dbex-sdk/tree/master/dist).

```html
<script src="http://YOURWEBSITE.COM/js/dbex.min.js"></script>
```

### 2. Initialize Driveback Experiments

```js
dbex('init', '<DRIVEBACK_EXPERIENTS_UUID>');
```
Driveback Experiments UUID can be obtained from Driveback admin panel:

![alt tag](http://i.imgur.com/YpIPxrc.png)

### 3. Create new experiment in admin panel

![alt tag](http://i.imgur.com/Shvaj88.png)

Note: Once experiment is created you can obtain EXPERIMENT_ID from admin panel

### 4. Dynamically split you traffic and update website page based on variation

Example:

```js
dbex(function() {
  var variation = this.chooseVariation('<EXPERIMENT_ID>');
  if (variation === 1) { // blue button
    jQuery('#but-now-button').addClass('blue');
  }
});
```

### 4. Track experiment session

Example:

```js
dbex('trackSession', '<EXPERIMENT_ID>');
```

Note: should be called any time user sees (experiences) experiment

### 5. Track conversions for your Experiment

Example:

```js
dbex('trackConversion', '<EXPERIMENT_ID>');
```

Example for tracking sales:

```js
dbex('trackConversion', '<EXPERIMENT_ID>', 800);
```

### 6. Results are updated in admin panel every 60 minutes

![alt tag](http://i.imgur.com/btlfjyw.png)


## Client side A/B/n testing flow

```js
dbex('init', '<DRIVEBACK_EXPERIENTS_UUID>'); // initialize
dbex(function() {
  var variation = this.chooseVariation('<EXPERIMENT_ID>');

  // make changes in UI based on varaition
  // ...
});
dbex('trackConversion', '<EXPERIMENT_ID>'); // track experiment session
```

## Server side A/B/n testing flow

```js
dbex('init', '<DRIVEBACK_EXPERIENTS_UUID>'); // initialize
dbex('setVariation', '<EXPERIMENT_ID>', '<VARIATION_RETURNED_FROM_SERVER>'); //0, 1, etc

// make changes in UI based on varaition
// ...

dbex('trackConversion', '<EXPERIMENT_ID>'); // track experiment session
```
