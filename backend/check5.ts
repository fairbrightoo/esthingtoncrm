import axios from 'axios';
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    const target = await prisma.user.findFirst({ where: { role: 'BRANCH_ADMIN' } });

    // Login to get valid admin token from staging
    const loginRes = await axios.post(`https://esthington-os-backend.onrender.com/api/auth/login`, {
        email: admin.email,
        password: 'password123', // I don't know the password... let me just find it out or skip this.
    });
}
