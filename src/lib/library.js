const DATABASE_NAME = 'pageverse-library';
const DATABASE_VERSION = 1;
const STORE_NAME = 'books';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function listBooks() {
  const records = await withStore('readonly', (store) => store.getAll());
  return records
    .map(({ blob, ...book }) => book)
    .sort((a, b) => b.addedAt - a.addedAt);
}

export async function addBook(file) {
  const book = {
    id: `${file.name}:${file.size}:${file.lastModified}`,
    title: file.name.replace(/\.pdf$/i, ''),
    fileName: file.name,
    size: file.size,
    addedAt: Date.now(),
    openedAt: 0,
    page: 0,
    blob: file,
  };
  await withStore('readwrite', (store) => store.put(book));
}

export async function readBook(id) {
  const record = await withStore('readonly', (store) => store.get(id));
  if (!record) return null;
  await withStore('readwrite', (store) => store.put({ ...record, openedAt: Date.now() }));
  return new File([record.blob], record.fileName, {
    type: 'application/pdf',
    lastModified: record.addedAt,
  });
}

export async function deleteBook(id) {
  await withStore('readwrite', (store) => store.delete(id));
}