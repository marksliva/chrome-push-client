'use strict';

var API_KEY = window.GoogleSamples.Config.gcmAPIKey;
var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';
var pushButton = $('.js-push-button');
var isPushEnabled = false;
var cookie;

// This method handles the removal of subscriptionId
// in Chrome 44 by concatenating the subscription Id
// to the subscription endpoint
function endpointWorkaround(pushSubscription) {
  // Make sure we only mess with GCM
  if (pushSubscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') !== 0) {
    return pushSubscription.endpoint;
  }

  var mergedEndpoint = pushSubscription.endpoint;
  // Chrome 42 + 43 will not have the subscriptionId attached
  // to the endpoint.
  if (pushSubscription.subscriptionId &&
    pushSubscription.endpoint.indexOf(pushSubscription.subscriptionId) === -1) {
    // Handle version 42 where you have separate subId and Endpoint
    mergedEndpoint = pushSubscription.endpoint + '/' +
      pushSubscription.subscriptionId;
  }
  return mergedEndpoint;
}

function sendSubscriptionToServer(subscription) {
  // TODO: Send the subscription.endpoint
  // to your server and save it to send a
  // push message at a later date
  //
  // For compatibly of Chrome 43, get the endpoint via
  // endpointWorkaround(subscription)


  if(cookie) {
    retrievePersonInfo(subscription);
  } else {
    var customFields = getFormValues();
    $.ajax({
      url: "https://public-api-uat.vibescm.com/mobile_apps/3b7a9d41-32a9-4277-af2f-94435136afcf/register",
      data: JSON.stringify({
        device: {
          id: subscription.subscriptionId,
          registration_id: subscription.subscriptionId,
          os: 'chrome'
        },
        person: {
          custom_fields: customFields
        }
      }),
      method: 'POST',
      contentType: 'application/json',
      crossDomain: true,
      success: setCookie,
      complete: function() {
        showCurlCommand(endpointWorkaround(subscription));
      }
    });
  }
}

function updateCustomFields(event) {
  var customFields = getFormValues();

  $.ajax({
      url: "https://public-api-uat.vibescm.com"+ cookie.person.uri,
      method: 'PUT',
      data: JSON.stringify({
        person_key: cookie.person.id,
        custom_fields: customFields
      }),
      contentType: 'application/json',
      crossDomain: true,
      headers: {
        "Authorization": "MobileAppToken " + cookie.auth_token
      },
      success: function(response) {
        $('#update-status').html("Success! Your information has been saved");
        $('#update').hide();
      },
      error: function() {
        $('#update-status').html("Error! Your information was not saved");
      }
    });
}

function retrievePersonInfo(subscription) {
  $.ajax({
      url: "https://public-api-uat.vibescm.com"+ cookie.person.uri,
      method: 'GET',
      contentType: 'application/json',
      crossDomain: true,
      headers: {
        "Authorization": "MobileAppToken " + cookie.auth_token
      },
      success: setFormValues,
      complete: function() {
        showCurlCommand(endpointWorkaround(subscription));
      }
    });
}

function showUpdateButton() {
  if (isPushEnabled && cookie) {
    $('#update').show();
    $('#update-status').html("&nbsp;");
  }
}

function setFormValues(response) {
  var firstName = response.custom_fields.push_test_first_name;
  var timezone = response.custom_fields.vibes_timezone[0];
  $('#first-name').val(firstName);
  if(timezone) {
    $('option[value='+ timezone.option_key +']').attr('selected', true);
  }
}

function getFormValues() {
  var fields = {};
  var firstName = $('input#first-name').val();
  var timezone = $('#timezone option:selected').val();

  // Don't bother setting custom fields if they are not set
  // if (firstName) {
    fields.push_test_first_name = firstName;
  // }

  if (timezone === "null") {
    fields.vibes_timezone = [];
  } else {
    fields.vibes_timezone = [{option_key: timezone}];
  }
  return fields;
}

// NOTE: This code is only suitable for GCM endpoints,
// When another browser has a working version, alter
// this to send a PUSH request directly to the endpoint
function showCurlCommand(mergedEndpoint) {
  // The curl command to trigger a push message straight from GCM
  if (mergedEndpoint.indexOf(GCM_ENDPOINT) !== 0) {
    window.Demo.debug.log('This browser isn\'t currently ' +
      'supported for this demo');
    return;
  }

  var endpointSections = mergedEndpoint.split('/');
  var subscriptionId = endpointSections[endpointSections.length - 1];

  var curlCommand = 'curl --header "Authorization: key=' + API_KEY +
    '" --header Content-Type:"application/json" ' + GCM_ENDPOINT +
    ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';

  $('#info').html("<p>Google Subscription Id:</p><p title=\"Google Subscription Id\">" + subscriptionId + "</p><p title=\"Vibes Person Id\">Vibes Person Id: " + cookie.person.id + "</p><p title=\"Mobile Auth Token\">Mobile Auth Token: " + cookie.auth_token + "</p>")
  $('#curl-command').html(curlCommand);
}

function unsubscribe() {

  $(pushButton).attr('disabled',true);

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // To unsubscribe from push messaging, you need get the
    // subcription object, which you can call unsubscribe() on.
    serviceWorkerRegistration.pushManager.getSubscription().then(
      function(pushSubscription) {
        // Check we have a subscription to unsubscribe
        if (!pushSubscription) {
          // No subscription object, so set the state
          // to allow the user to subscribe to push
          isPushEnabled = false;
          $(pushButton).attr('disabled',false);
          $(pushButton).html('Enable Push Messages');
          return;
        }

        // TODO: Make a request to your server to remove
        // the users data from your data store so you
        // don't attempt to send them push messages anymore

        // We have a subcription, so call unsubscribe on it
        pushSubscription.unsubscribe().then(function(successful) {
          $(pushButton).attr('disabled',false);
          $(pushButton).html('Enable Push Messages');
          isPushEnabled = false;
          clearData();
        }).catch(function(e) {
          // We failed to unsubscribe, this can lead to
          // an unusual state, so may be best to remove
          // the subscription id from your data store and
          // inform the user that you disabled push

          window.Demo.debug.log('Unsubscription error: ', e);
          $(pushButton).attr('disabled',false);
        });
      }).catch(function(e) {
        window.Demo.debug.log('Error thrown while unsubscribing from ' +
          'push messaging.', e);
      });
  });
}

function subscribe() {
  // Disable the button so it can't be changed while
  // we process the permission request

  $(pushButton).attr('disabled',true);

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
      .then(function(subscription) {
        // The subscription was successful
        isPushEnabled = true;
        $(pushButton).html('Disable Push Messages');
        $(pushButton).attr('disabled',false);

        // TODO: Send the subscription subscription.endpoint
        // to your server and save it to send a push message
        // at a later date
        return sendSubscriptionToServer(subscription);
      })
      .catch(function(e) {
        if (Notification.permission === 'denied') {
          // The user denied the notification permission which
          // means we failed to subscribe and the user will need
          // to manually change the notification permission to
          // subscribe to push messages
          window.Demo.debug.log('Permission for Notifications was denied');
          $(pushButton).attr('disabled',true);
        } else {
          // A problem occurred with the subscription, this can
          // often be down to an issue or lack of the gcm_sender_id
          // and / or gcm_user_visible_only
          window.Demo.debug.log('Unable to subscribe to push.', e);
          $(pushButton).attr('disabled',false);
          $(pushButton).html('Enable Push Messages');
        }
      });
  });
}

// Once the service worker is registered set the initial state
function initialiseState() {
  // Are Notifications supported in the service worker?
  if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
    window.Demo.debug.log('Notifications aren\'t supported.');
    return;
  }

  // Check the current Notification permission.
  // If its denied, it's a permanent block until the
  // user changes the permission
  if (Notification.permission === 'denied') {
    window.Demo.debug.log('The user has blocked notifications.');
    return;
  }

  // Check if push messaging is supported
  if (!('PushManager' in window)) {
    window.Demo.debug.log('Push messaging isn\'t supported.');
    return;
  }

  // We need the service worker registration to check for a subscription
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // Do we already have a push message subscription?
    serviceWorkerRegistration.pushManager.getSubscription()
      .then(function(subscription) {
        // Enable any UI which subscribes / unsubscribes from
        // push messages.
        $(pushButton).attr('disabled',false);

        if (!subscription) {
          // We aren’t subscribed to push, so set UI
          // to allow the user to enable push
          return;
        }

        // Keep your server in sync with the latest subscription
        sendSubscriptionToServer(subscription);

        // Set your UI to show they have subscribed for
        // push messages
        $(pushButton).html('Disable Push Messages');
        isPushEnabled = true;
      })
      .catch(function(err) {
        window.Demo.debug.log('Error during getSubscription()', err);
      });
  });
}

function setCookie(personData) {
  if (personData) {
    document.cookie = "person=" + JSON.stringify(personData) +";";
  }
  cookie = JSON.parse(readCookie());
}

function readCookie() {
  var personData = /person=([^;]+)/.exec(document.cookie);
  return (personData != null) ? personData[1] : null;
}

function clearData () {
  document.cookie = "person=null;"
  cookie = undefined;
  $('option[value=null]').attr('selected', true);
  $('input').val("");
  $('#info').html("");
  $('#curl-command').html("");
}

$(window).on('load', function() {
  if(document.cookie) {
    setCookie();
  }
  $('#update').hide();
  $('#curl-command').hide();


  $('#update').on('click', updateCustomFields);

  $(pushButton).on('click', function() {
    if (isPushEnabled) {
      unsubscribe();
    } else {
      subscribe();
    }
  });

  $('select').on('change', showUpdateButton);
  $('input').on('keyup', showUpdateButton);

  // Check that service workers are supported, if so, progressively
  // enhance and add push messaging support, otherwise continue without it.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
    .then(initialiseState);
  } else {
    window.Demo.debug.log('Service workers aren\'t supported in this browser.');
  }
});
