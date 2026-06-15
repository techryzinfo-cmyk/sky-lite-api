require('dotenv').config({path: '.env.local'});
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: '6a2e9a347a08f1a50092ea98', role: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const projectId = '6a2e99d37a08f1a50092ea19';

fetch(`http://localhost:3000/api/projects/${projectId}/messages/read`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json().then(data => ({status: res.status, data})))
.then(console.log)
.catch(console.error);
