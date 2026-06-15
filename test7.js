const pushToken = 'ExponentPushToken[xKlH64CwsQcRHTViWJL6lx]';

fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: pushToken,
    sound: 'default',
    title: 'Test Notification',
    body: 'This is a test notification from the backend script.',
    data: { someData: 'goes here' },
  }),
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
