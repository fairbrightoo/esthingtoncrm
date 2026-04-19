import { GlobalAnalyticsController } from './src/controllers/GlobalAnalyticsController';

async function test() {
    const req = {
        query: {}
    };

    const res = {
        json: (data: any) => console.log("SUCCESS JSON RECEIVED:", JSON.stringify(data).substring(0, 100)),
        status: (code: number) => {
            console.error("STATUS RETURNED:", code);
            return { json: (d: any) => console.log("JSON ERROR Pld:", d) };
        }
    };

    await GlobalAnalyticsController.getGlobalStats(req as any, res as any);
}

test();
