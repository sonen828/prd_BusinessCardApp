import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

export const generateToken = (): string => {
    return uuidv4();
};

export const generateId = (): string => {
    return uuidv4();
};
