import express from 'express';
import Reader from '../models/Reader.js';

const router = express.Router();

// GET /api/reader - Fetch all reader documents from MongoDB
router.get('/', async (req, res) => {
  try {
    const docs = await Reader.find().sort({ updatedAt: -1 });
    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reader/:id - Fetch single reader document by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await Reader.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reader - Create or upsert a reader record in MongoDB
router.post('/', async (req, res) => {
  try {
    const { title, fileName, fileSize, fileUrl, contentHash, totalPages, metadata } = req.body;
    
    if (!title || !fileName) {
      return res.status(400).json({ success: false, error: 'Title and fileName are required' });
    }

    let doc;
    if (contentHash) {
      doc = await Reader.findOne({ contentHash });
    }

    if (doc) {
      doc.openedAt = new Date();
      if (totalPages) doc.totalPages = totalPages;
      if (metadata) doc.metadata = metadata;
      await doc.save();
    } else {
      doc = new Reader({
        title,
        fileName,
        fileSize: fileSize || 0,
        fileUrl: fileUrl || '',
        contentHash: contentHash || `${fileName}:${fileSize}:${Date.now()}`,
        totalPages: totalPages || 0,
        metadata: metadata || {}
      });
      await doc.save();
    }

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/reader/:id/progress - Update reading progress
router.put('/:id/progress', async (req, res) => {
  try {
    const { currentPage, totalPages } = req.body;
    const updateData = { updatedAt: new Date() };
    
    if (typeof currentPage === 'number') updateData.currentPage = currentPage;
    if (typeof totalPages === 'number') updateData.totalPages = totalPages;

    const doc = await Reader.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/reader/:id/annotations - Save or sync annotations and bookmarks
router.put('/:id/annotations', async (req, res) => {
  try {
    const { annotations, bookmarks } = req.body;
    const updateData = { updatedAt: new Date() };

    if (Array.isArray(annotations)) updateData.annotations = annotations;
    if (Array.isArray(bookmarks)) updateData.bookmarks = bookmarks;

    const doc = await Reader.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/reader/:id - Delete a document
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Reader.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, message: 'Document deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
