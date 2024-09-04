/* eslint-disable next-line */
import { contentType } from 'mime-types';
import dbClient from '../utils/db.js';
import UtilController from './UtilController.js';

export default class FilesController {
  static async postUpload(req, res) {
    const userId = req.user.id;
    const { name, type, parentId, isPublic = false, data } = req.body;

    if (!name || !type || (!['folder', 'file', 'image'].includes(type)) || (!data && type !== 'folder')) {
      const error = !name
        ? 'Missing name'
        : !type || !['folder', 'file', 'image'].includes(type)
        ? 'Missing or invalid type'
        : 'Missing data';
      return res.status(400).json({ error });
    }

    try {
      if (parentId) {
        const parentFolder = await dbClient.filterFiles({ _id: parentId });
        if (!parentFolder) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFolder.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const newFile = await dbClient.newFile(userId, name, type, isPublic, parentId, data);
      const fileDoc = { ...newFile.ops[0], id: newFile.ops[0]._id };
      delete fileDoc._id;
      delete fileDoc.localPath;

      return res.status(201).json(fileDoc);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to upload file' });
    }
  }

  static async getShow(req, res) {
    const userId = req.user._id;
    const { id } = req.params;

    try {
      const file = await dbClient.filterFiles({ _id: id });
      if (!file || String(file.userId) !== String(userId)) {
        return res.status(404).json({ error: 'File not found' });
      }
      return res.status(200).json({ ...file, id: file._id });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve file' });
    }
  }

  static async getIndex(req, res) {
    const userId = req.user._id;
    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;

    try {
      const cursor = await dbClient.findFiles({ parentId, userId }, { limit: 20, skip: 20 * page });
      const files = await cursor.toArray();
      const sanitizedFiles = files.map(file => {
        return { ...file, id: file._id };
      });

      return res.status(200).json(sanitizedFiles);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve files' });
    }
  }

  static async putPublish(req, res) {
    const userId = req.user._id;
    const { id } = req.params;

    try {
      const file = await dbClient.filterFiles({ _id: id });
      if (!file || String(file.userId) !== String(userId)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const updatedFile = await dbClient.updatefiles({ _id: file._id }, { isPublic: true });
      return res.status(200).json({ ...updatedFile, id: updatedFile._id });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to publish file' });
    }
  }

  static async putUnpublish(req, res) {
    const userId = req.user._id;
    const { id } = req.params;

    try {
      const file = await dbClient.filterFiles({ _id: id });
      if (!file || String(file.userId) !== String(userId)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const updatedFile = await dbClient.updatefiles({ _id: file._id }, { isPublic: false });
      return res.status(200).json({ ...updatedFile, id: updatedFile._id });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to unpublish file' });
    }
  }

  static async getFile(req, res) {
    const userId = req.user._id;
    const { id } = req.params;

    try {
      const file = await dbClient.filterFiles({ _id: id });
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      if (String(file.userId) !== String(userId) && !file.isPublic) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const fileContent = await UtilController.readFile(file.localPath);
      const headers = { 'Content-Type': contentType(file.name) };

      return res.set(headers).status(200).send(fileContent);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve file content' });
    }
  }
}
