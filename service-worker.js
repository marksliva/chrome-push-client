'use strict';

self.addEventListener('push', function(evt) {
    console.log('Received a push message', evt);
    var a;
    self.registration.pushManager.getSubscription().then(function(subscription) {
        a = subscription;
        // debugger
        //fetch('http://trustapi.uat.vibesapps.com/PushRegistration/content/show/' + a.subscriptionId + '?keep=true',
        fetch('push-content-show.json',
              {
                  method: 'GET',
                  //mode: 'cors'
              })
            .then(function(response) {
                  return response.json();
              })
            .catch(function(error) {
                console.log(error.toString());
            })
            .then(function(json_body) {
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
    if (clients.openWindow)
      return clients.openWindow('/');
  }));

});
