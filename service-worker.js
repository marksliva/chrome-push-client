// 'use strict';

// var jsonBody;

self.addEventListener('push', function(evt) {
    console.log('Received a push message', evt);
    self.registration.pushManager.getSubscription().then(function(subscription) {
        fetch('https://public-api-uat.vibescm.com/PushRegistration/content/show/' + subscription.subscriptionId + '?keep=true',
        // fetch('push-content-show.json',
              {
                  method: 'GET',
                  mode: 'cors'
              })
            .then(function(response) {
                  return response.json();
              })
            .catch(function(error) {
                console.log(error.toString());
            })
            .then(function(json_body) {
                  // jsonBody = json_body;
                  var title = json_body.content[0].title;
                  var body = json_body.content[0].body;
                  var icon = 'https://marksliva.github.io/chrome-push-client/images/icon-192x192.png';
                  var tag = 'simple-push-demo-notification-tag';

                  evt.waitUntil(
                      self.registration.showNotification(title, {
                          body: body,
                          icon: icon,
                          tag: tag
                      })
                  );
            });
    });
});


self.addEventListener('notificationclick', function(evt) {
  console.log('On notification click: ', evt.notification.tag);
  // Android doesn’t close the notification when you click on it
  // See: http://crbug.com/463146
  evt.notification.close();

  // This looks to see if the current is already open and
  // focuses if it is
  evt.waitUntil(clients.matchAll({
    type: "window"
  }).then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      if (client.url == '/' && 'focus' in client)
        return client.focus();
    }
    if (clients.openWindow){
      // var url = jsonBody.content[0].url
      //return clients.openWindow("/");
      return clients.openWindow("https://marksliva.github.io/chrome-push-client/");
    }
  }));

});
