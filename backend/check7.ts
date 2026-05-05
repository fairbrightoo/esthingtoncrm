import axios from 'axios';

async function main() {
    const url = 'https://esthington-os-backend.onrender.com/api/companies/3c981e0a-a3b6-4b87-9672-1ecba78d9274/branches/bd221ace-72fc-4133-8f52-aa03d4bd8c15/users';
    try {
        const res = await axios.get(url);
        console.log('Branch Users Count:', res.data.length);
    } catch(e) {
        console.error('Error:', e.response?.status, e.response?.data);
    }
}
main();
