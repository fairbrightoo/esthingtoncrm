import axios from 'axios';

async function testFetch() {
    try {
        console.log("Sending GET request to local API...");
        const res = await axios.get('http://localhost:3000/api/analytics/global');
        console.log("SUCCESS:", res.data);
    } catch (e: any) {
        if (e.response) {
            console.error("API RETURNED ERROR:", e.response.status, e.response.data);
        } else {
            console.error("NETWORK ERROR:", e.message);
        }
    }
}

testFetch();
