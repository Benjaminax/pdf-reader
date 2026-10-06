import mongoose from 'mongoose';

const annotationSchema = new mongoose.Schema({
  id: { type: String, required: true },
  pageNumber: { type: Number, required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  type: { type: String, enum: ['note', 'bookmark', 'highlight'], default: 'note' },
  text: { type: String, default: '' },
  color: { type: String, default: '#fef08a' },
  createdAt: { type: Date, default: Date.now }
});

const readerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    fileUrl: { type: String, default: '' },
    contentHash: { type: String, index: true },
    currentPage: { type: Number, default: 0 },
    totalPages: { type: Number, default: 0 },
    openedAt: { type: Date, default: Date.now },
    bookmarks: [{ type: Number }],
    annotations: [annotationSchema],
    metadata: {
      author: String,
      creator: String,
      producer: String,
      subject: String,
      keywords: String,
    }
  },
  {
    // Explicitly using the requested database collection name "reader"
    collection: 'reader',
    timestamps: true
  }
);

const Reader = mongoose.models.Reader || mongoose.model('Reader', readerSchema);

export default Reader;
