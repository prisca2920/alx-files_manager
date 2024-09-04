import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis.js';
import UtilController from './UtilController.js';
import dbClient from '../utils/db.js';

export default class AuthController {
  static async getConnect(req, res) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const encodedCredentials = authHeader.split(' ')[1];
      const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString().split(':');
      const [email, password] = decodedCredentials;
      const hashedPassword = UtilController.SHA1(password);

      const user = await dbClient.filterUser({ email });

      if (!user || user.password !== hashedPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      await redisClient.set(`auth_${token}`, user._id.toString(), 86400);

      return res.status(200).json({ token });
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async getDisconnect(req, res) {
    const token = req.token;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).end();
  }
}
