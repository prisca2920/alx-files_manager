import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AppController {
  static async getStatus(req, res) {
    const isRedisAlive = redisClient.isAlive();
    const isDbAlive = dbClient.isAlive();

    res.status(200).json({ redis: isRedisAlive, db: isDbAlive });
  }

  static async getStats(req, res) {
    try {
      const userCount = await dbClient.nbUsers();
      const fileCount = await dbClient.nbFiles();

      res.status(200).json({ users: userCount, files: fileCount });
    } catch (error) {
      res.status(500).json({ error: 'Unable to fetch statistics' });
    }
  }
}

export default AppController;
