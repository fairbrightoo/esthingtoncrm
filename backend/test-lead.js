import axios from 'axios';

async function run() {
  try {
    const res = await axios.post('http://localhost:3000/api/leads', {
        fullName: 'Mr. Abubakar Mukhtar',
        phone: '0705 565 5553',
        email: '',
        gender: 'Male',
        source: 'Walk-in',
        whatsappOptIn: true
    }, {
        // Need to provide a valid token for this to work though!
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
