import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promises as fs } from 'fs';
import { ObjectID } from 'mongodb';
import dbClient from './utils/db.js';

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

async function generateThumbnail(width, localPath) {
  try {
    return await imageThumbnail(localPath, { width });
  } catch (error) {
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}

fileQueue.process(async (job, done) => {
  console.log('Processing file queue...');
  const { fileId, userId } = job.data;

  if (!fileId || !userId) {
    return done(new Error(`Missing ${!fileId ? 'fileId' : 'userId'}`));
  }

  try {
    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: new ObjectID(fileId) });

    if (!file) {
      return done(new Error('File not found'));
    }

    const thumbnails = await Promise.all([
      generateThumbnail(500, file.localPath),
      generateThumbnail(250, file.localPath),
      generateThumbnail(100, file.localPath),
    ]);

    console.log('Writing thumbnails to file system...');
    await Promise.all([
      fs.writeFile(`${file.localPath}_500`, thumbnails[0]),
      fs.writeFile(`${file.localPath}_250`, thumbnails[1]),
      fs.writeFile(`${file.localPath}_100`, thumbnails[2]),
    ]);

    done();
  } catch (error) {
    done(new Error(`Error processing file: ${error.message}`));
  }
});

userQueue.process(async (job, done) => {
  console.log('Processing user queue...');
  const { userId } = job.data;

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  try {
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectID(userId) });

    if (user) {
      console.log(`Welcome ${user.email}!`);
    } else {
      done(new Error('User not found'));
    }
  } catch (error) {
    done(new Error(`Error processing user: ${error.message}`));
  }
});
