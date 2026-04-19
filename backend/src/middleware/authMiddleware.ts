import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        companyId: string | null;
        branchId: string | null;
    };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.sendStatus(401);
        return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            res.sendStatus(403);
            return;
        }
        (req as AuthRequest).user = user;
        next();
    });
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthRequest;
        if (!authReq.user || !roles.includes(authReq.user.role)) {
            res.status(403).json({ error: "Insufficient privileges" });
            return;
        }
        next();
    };
};
