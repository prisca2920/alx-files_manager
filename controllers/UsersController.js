import UtilController from './UtilController.js';
import dbClient from '../utils/db.js';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: `Missing ${!email ? 'email' : 'password'}` });
    }

    const userExists = await dbClient.userExists(email);
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    try {
      const hashedPassword = UtilController.SHA1(password);
      const newUser = await dbClient.newUser(email, hashedPassword);
      const userId = newUser.ops[0]._id;
      const userEmail = newUser.ops[0].email;

      return res.status(201).json({ id: userId, email: userEmail });
    } catch (err) {
      return res.status(500).json({ error: 'Unable to create user' });
    }
  }

  static async getMe(req, res) {
    const user = { ...req.usr };
    user.id = user._id;
    delete user._id;
    delete user.password;

    return res.status(200).json(user);
  }
}
